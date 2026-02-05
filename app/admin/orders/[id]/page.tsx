import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrderAttentionSummary } from "@/lib/domain/attention";
import { getOrderPendingSummary } from "@/lib/domain/order";
import { computeOrderPendingFlags, computeOrderStockStatus } from "@/lib/domain/production";
import { OrderStatus } from "@prisma/client";
import {
  confirmOrderAction,
  convertToEncomendaAction,
  markPaidAction,
  reconfirmOrderAction,
  updateStatusAction,
} from "./actions";
import CancelOrderForm from "./CancelOrderForm.client";
import OrderDetailFocus from "./OrderDetailFocus.client";
import OrderDetailPrimaryAction from "./OrderDetailPrimaryAction.client";
import OrderDetailSidebar from "./OrderDetailSidebar.client";
import OrderItemsTable, { type OrderItemRow } from "./OrderItemsTable.client";
import { getOrderDetailViewModel } from "./orderDetailViewModel";
import Card from "../../_components/Card";
import Button from "../../_components/Button";
import Chip from "../../_components/Chip";
import EmptyStateCompact from "../../_components/EmptyStateCompact";
import styles from "../../_styles/adminPrimitives.module.css";
import detailStyles from "../orderDetail.module.css";
import { InlineNotice } from "../../design-system/InlineNotice.client";

const statusLabel: Record<OrderStatus, string> = {
  RASCUNHO: "Rascunho",
  CONFIRMADO: "Confirmado",
  EM_PRODUCAO: "Em producao",
  PRONTO: "Pronto",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};

const orderTypeLabel = {
  PRONTA_ENTREGA: "Pronta entrega",
  ENCOMENDA: "Encomenda",
};

const deliveryMethodLabel = {
  ENTREGA: "Entrega",
  RETIRADA: "Retirada",
};

const paymentMethodLabel: Record<string, string> = {
  PIX: "Pix",
  DINHEIRO: "Dinheiro",
  CARTAO: "Cartao",
  TRANSFERENCIA: "Transferencia",
  A_COMBINAR: "A combinar",
};

const statusFlow: OrderStatus[] = [
  "RASCUNHO",
  "CONFIRMADO",
  "EM_PRODUCAO",
  "PRONTO",
  "ENTREGUE",
];

function formatMoney(value: unknown) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(number);
}

function formatQuantity(value: unknown) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return "0";
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
  }).format(number);
}

function formatLogValue(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "-";
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }> | { id: string };
  searchParams?:
    | Promise<{
        converted?: string;
        created?: string;
        confirmed?: string;
        reconfirmed?: string;
        updated?: string;
        error?: string;
        focus?: string;
      }>
    | {
        converted?: string;
        created?: string;
        confirmed?: string;
        reconfirmed?: string;
        updated?: string;
        error?: string;
        focus?: string;
      };
}) {
  const p = await Promise.resolve(params);
  const id = p?.id;
  if (!id) {
    redirect("/admin/orders?error=missing_id");
  }
  const resolvedSearch = await Promise.resolve(searchParams);
  const createdRaw = resolvedSearch?.created;
  const created =
    createdRaw !== undefined &&
    createdRaw !== null &&
    String(createdRaw).trim() !== "";

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        select: {
          id: true,
          skuId: true,
          quantity: true,
          snapshotUnitPrice: true,
          lineTotal: true,
          snapshotSkuName: true,
          snapshotProductName: true,
          snapshotUnitLabel: true,
          snapshotUnitType: true,
          snapshotSizeText: true,
          snapshotFlavorText: true,
          snapshotIsFrozen: true,
        },
      },
    },
  });

  if (!order) {
    return (
      <main className={`${styles.page} ${styles.stackSm}`}>
        <p>Pedido nao encontrado.</p>
        <Link href="/admin/orders">Voltar</Link>
      </main>
    );
  }

  const availability = await computeOrderPendingFlags(prisma, {
    id: order.id,
    status: order.status,
    items: order.items,
  });
  const stockStatusMap = await computeOrderStockStatus(prisma, [
    { id: order.id, status: order.status, items: order.items },
  ]);
  const stockStatus = stockStatusMap.get(order.id) ?? {
    needsProduction: false,
    deliveredShortage: false,
  };

  const availabilityBySku = new Map(
    availability.itemAvailability.map((item) => [item.skuId, item])
  );
  const gapItems = availability.itemAvailability.filter((item) => item.gapQty > 0);
  const gapTotal = gapItems.reduce((sum, item) => sum + item.gapQty, 0);
  const itemsForTable: OrderItemRow[] = order.items.map((item) => {
    const availabilityInfo = item.skuId
      ? availabilityBySku.get(item.skuId)
      : null;
    const gapQty = Number(availabilityInfo?.gapQty ?? 0);
    return {
      id: item.id,
      productName: item.snapshotProductName,
      skuName: item.snapshotSkuName,
      unitLabel: item.snapshotUnitLabel,
      quantity: Number(item.quantity),
      unitPrice: Number(item.snapshotUnitPrice),
      lineTotal: Number(item.lineTotal),
      sizeText: item.snapshotSizeText,
      flavorText: item.snapshotFlavorText,
      isFrozen: item.snapshotIsFrozen,
      status: gapQty > 0 ? "A produzir" : "OK",
    };
  });

  const attention = getOrderAttentionSummary({
    status: order.status,
    orderType: order.orderType,
    deliveryDatetime: order.deliveryDatetime,
    deliveryTime: order.deliveryTime,
    deliveryMethod: order.deliveryMethod,
    addressText: order.addressText,
    addressCity: order.addressCity,
    items: order.items,
    needsReconfirmation: order.needsReconfirmation,
    paidAt: order.paidAt,
    hasUnavailableItems: availability.hasUnavailableItems,
    hasStockShortage: stockStatus.deliveredShortage,
  });

  const pendingSummary = getOrderPendingSummary({
    deliveryDatetime: order.deliveryDatetime,
    items: order.items,
    needsReconfirmation: order.needsReconfirmation,
  });
  const addressReady =
    order.deliveryMethod !== "ENTREGA"
      ? true
      : Boolean(order.addressText?.trim()) && Boolean(order.addressCity?.trim());
  const viewModel = getOrderDetailViewModel({
    status: order.status,
    orderType: order.orderType,
    deliveryMethod: order.deliveryMethod,
    deliveryDatetime: order.deliveryDatetime,
    deliveryTime: order.deliveryTime,
    needsReconfirmation: order.needsReconfirmation,
    attention,
    pendingSummary,
    itemsCount: order.items.length,
    customerName: order.customer.name,
    addressReady,
    needsProduction: availability.hasUnavailableItems,
  });
  const showProduction = gapItems.length > 0;
  const showProductionBadge =
    !showProduction &&
    attention.weakReasons.some((reason) => reason.type === "UNAVAILABLE_ITEMS");
  const weakReasonsForDisplay = showProduction
    ? attention.weakReasons.filter((reason) => reason.type !== "UNAVAILABLE_ITEMS")
    : attention.weakReasons;
  const confirmFormId = "order-confirm-form";
  const advanceFormId = "order-advance-form";

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      entityType: "orders",
      entityId: order.id,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { actor: true },
  });

  const criticalFields = new Set([
    "items",
    "deliveryDatetime",
    "deliveryTime",
    "addressText",
    "addressBairro",
    "addressReferencia",
    "addressCity",
    "addressCep",
    "deliveryFee",
    "subtotal",
    "total",
    "orderType",
    "deliveryMethod",
  ]);
  const recentChanges =
    order.confirmedAt && order.needsReconfirmation
      ? auditLogs.filter(
          (log) =>
            log.createdAt > (order.confirmedAt as Date) &&
            (!log.field || criticalFields.has(log.field))
        )
      : [];

  const focusTarget =
    resolvedSearch?.focus === "items"
      ? "order-items"
      : resolvedSearch?.focus === "delivery"
      ? "order-delivery"
      : resolvedSearch?.focus === "payment"
      ? "order-payment"
      : undefined;

  const editLink = `/admin/orders/${order.id}/edit`;

  return (
    <main className={styles.page}>
      <OrderDetailFocus targetId={focusTarget} />
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Pedido {order.orderNumber}</h1>
        <div className={styles.clusterSm}>
          <Button href={editLink} variant="outline" size="sm">
            Editar pedido
          </Button>
          <Button href="/admin/orders" variant="outline" size="sm">
            Voltar
          </Button>
        </div>
      </div>

      {created ? (
        <InlineNotice tone="success" clearQueryKeys={["created"]}>
          Pedido salvo.
        </InlineNotice>
      ) : null}

      {resolvedSearch?.updated ? (
        <InlineNotice tone="success" clearQueryKeys={["updated"]}>
          Pedido atualizado.
        </InlineNotice>
      ) : null}

      {resolvedSearch?.converted ? (
        <InlineNotice tone="warning" clearQueryKeys={["converted"]}>
          Estoque insuficiente para pronta entrega. Pedido convertido para encomenda.
        </InlineNotice>
      ) : null}

      {resolvedSearch?.error === "motivo" ? (
        <p className={styles.textError}>Informe o motivo do cancelamento.</p>
      ) : null}

      {resolvedSearch?.error === "transicao" ? (
        <p className={styles.textError}>Transicao de status invalida.</p>
      ) : null}

      {resolvedSearch?.error === "ready" ? (
        <p className={styles.textError}>Pedido incompleto para producao.</p>
      ) : null}

      {resolvedSearch?.error === "ready_items" ? (
        <p className={styles.textError}>
          Para confirmar, adicione itens ao pedido.
          <Link href="#order-items" className={detailStyles.actionLink}>
            {" "}Ir para itens
          </Link>
          .
        </p>
      ) : null}

      {resolvedSearch?.error === "ready_date" ? (
        <p className={styles.textError}>
          Para confirmar, defina a data de entrega.
          <Link href="#order-delivery" className={detailStyles.actionLink}>
            {" "}Ir para entrega
          </Link>
          .
        </p>
      ) : null}

      {resolvedSearch?.error === "pendencia" ? (
        <p className={styles.textError}>
          Pendencia forte impede avancar para Pronto/Entregue.
        </p>
      ) : null}

      {order.status === "ENTREGUE" && stockStatus.deliveredShortage ? (
        <div className={`${styles.notice} ${styles.noticeWarning}`}>
          <div className={styles.stackSm}>
            <div>
              Ajustar saldo: este pedido foi entregue sem saldo suficiente.
            </div>
            <div className={styles.clusterSm}>
              <Button href="/admin/producao" variant="outline" size="sm">
                Registrar producao
              </Button>
              <Button href="/admin/consumo" variant="outline" size="sm">
                Ajustar saldo (admin)
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {resolvedSearch?.error === "confirmacao" ? (
        <p className={styles.textError}>Confirmacao invalida para este status.</p>
      ) : null}

      {resolvedSearch?.error === "reconfirmacao" ? (
        <p className={styles.textError}>Nao ha pendencia para reconfirmar.</p>
      ) : null}

      {resolvedSearch?.confirmed ? (
        <InlineNotice tone="success" clearQueryKeys={["confirmed"]}>
          Pedido confirmado.
        </InlineNotice>
      ) : null}

      {resolvedSearch?.reconfirmed ? (
        <InlineNotice tone="success" clearQueryKeys={["reconfirmed"]}>
          Pedido reconfirmado.
        </InlineNotice>
      ) : null}
      {viewModel.primaryCta.actionId === "confirm" ? (
        <form id={confirmFormId} action={confirmOrderAction} style={{ display: "none" }}>
          <input type="hidden" name="orderId" value={order.id} />
        </form>
      ) : null}

      {viewModel.primaryCta.actionId === "advance_status" &&
      viewModel.primaryCta.statusTarget ? (
        <form id={advanceFormId} action={updateStatusAction} style={{ display: "none" }}>
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="status" value={viewModel.primaryCta.statusTarget} />
          {viewModel.primaryCta.statusTarget === "ENTREGUE" && !order.paidAt ? (
            <input type="checkbox" name="markPaid" value="1" defaultChecked={false} />
          ) : null}
        </form>
      ) : null}

      <div className={styles.pageGrid}>
        <div className={`${styles.pageMain} ${detailStyles.orderPageMain}`}>
          <section className={detailStyles.orderHeader}>
            <div className={detailStyles.orderHeaderMain}>
              <div className={detailStyles.orderHeaderTop}>
                <Chip
                  variant="status"
                  status={order.status}
                  label={statusLabel[order.status]}
                />
                <div className={detailStyles.orderHeaderChips}>
                  {viewModel.chips.map((chip, index) => (
                    <Chip
                      key={`${chip.label}-${index}`}
                      variant={chip.severity === "strong" ? "attention-strong" : "attention-weak"}
                      label={chip.label}
                      density="compact"
                    />
                  ))}
                  {viewModel.chipsOverflow > 0 ? (
                    <span className={detailStyles.chipOverflow}>
                      +{viewModel.chipsOverflow}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className={detailStyles.orderHeaderTitle}>
                {deliveryMethodLabel[order.deliveryMethod]} - {viewModel.schedule.header}
              </div>
              <div className={detailStyles.orderHeaderMeta}>
                <span className={detailStyles.orderHeaderType}>
                  <span
                    className={`${detailStyles.orderHeaderTypeIcon} ${
                      order.orderType === "PRONTA_ENTREGA"
                        ? detailStyles.orderHeaderTypeIconReady
                        : ""
                    }`}
                  />
                  {orderTypeLabel[order.orderType]}
                </span>
              </div>
            </div>
            <div className={detailStyles.orderHeaderCta}>
              <OrderDetailPrimaryAction
                primaryCta={viewModel.primaryCta}
                editLink={editLink}
                confirmFormId={confirmFormId}
                advanceFormId={advanceFormId}
                size="md"
              />
            </div>
          </section>

          {showProduction ? (
            <Card as="section" id="order-production">
              <div className={styles.panelHeader}>
                <h2>
                  {order.orderType === "PRONTA_ENTREGA"
                    ? "Sem saldo (pronta entrega)"
                    : "Producao (precisa produzir)"}
                </h2>
                {order.orderType === "PRONTA_ENTREGA" && gapItems.length > 0 ? (
                  <form action={convertToEncomendaAction}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <Button type="submit" variant="secondary" size="sm">
                      Converter para encomenda
                    </Button>
                  </form>
                ) : null}
              </div>
              <div className={styles.panelBody}>
                <div className={detailStyles.productionSummary}>
                  <span className={styles.tabularNums}>{formatQuantity(gapTotal)}</span>
                  <span>un pendentes</span>
                  <span className={detailStyles.summaryDivider}>•</span>
                  <span>{gapItems.length} itens</span>
                </div>
                <div className={detailStyles.productionTable}>
                  <div className={detailStyles.productionHeaderRow}>
                    <span>Produto</span>
                    <span className={detailStyles.productionNumeric}>Pedido</span>
                    <span className={detailStyles.productionNumeric}>Disponivel</span>
                    <span className={detailStyles.productionNumeric}>Falta</span>
                  </div>
                  <div className={detailStyles.productionBody}>
                    {gapItems.map((gapItem, index) => {
                      const item = order.items.find(
                        (entry) => entry.skuId === gapItem.skuId
                      );
                      return (
                        <div
                          key={gapItem.skuId}
                          className={`${detailStyles.productionRow} ${
                            index % 2 === 1 ? detailStyles.productionRowEven : ""
                          }`}
                        >
                          <div className={detailStyles.productionProduct}>
                            <span className={detailStyles.productionProductTitle}>
                              {item?.snapshotProductName
                                ? `${item.snapshotProductName} - ${item.snapshotSkuName}`
                                : item?.snapshotSkuName}
                            </span>
                            <span className={detailStyles.productionProductMeta}>
                              {item?.snapshotUnitLabel}
                            </span>
                          </div>
                          <span className={detailStyles.productionNumeric}>
                            {formatQuantity(gapItem.requiredQty)}
                          </span>
                          <span className={detailStyles.productionNumeric}>
                            {formatQuantity(gapItem.availableNow)}
                          </span>
                          <span
                            className={`${detailStyles.productionNumeric} ${detailStyles.productionGap}`}
                          >
                            {formatQuantity(gapItem.gapQty)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          ) : null}

          <div className={detailStyles.infoGrid}>
            <section className={detailStyles.infoCard}>
              <div className={detailStyles.infoCardHeader}>
                <div className={detailStyles.infoCardIcon}>📋</div>
                <span className={detailStyles.infoCardTitle}>Pedido</span>
                <span
                  className={`${styles.badge} ${
                    order.status === "ENTREGUE"
                      ? styles.badgeSuccess
                      : order.status === "CANCELADO"
                      ? styles.badgeDanger
                      : styles.badgeNeutral
                  }`}
                  style={{ marginLeft: "auto" }}
                >
                  {statusLabel[order.status]}
                </span>
              </div>
              <div className={detailStyles.infoCardBody}>
                <div className={detailStyles.infoRow}>
                  <span className={detailStyles.infoLabel}>Tipo</span>
                  <span className={detailStyles.infoValue}>{orderTypeLabel[order.orderType]}</span>
                </div>
                <div className={detailStyles.infoRow}>
                  <span className={detailStyles.infoLabel}>Metodo</span>
                  <span className={detailStyles.infoValue}>{deliveryMethodLabel[order.deliveryMethod]}</span>
                </div>
                <div className={detailStyles.infoRow}>
                  <span className={detailStyles.infoLabel}>Subtotal</span>
                  <span className={detailStyles.infoValue}>{formatMoney(order.subtotal)}</span>
                </div>
                <div className={detailStyles.infoRow}>
                  <span className={detailStyles.infoLabel}>Total</span>
                  <span className={detailStyles.infoValueLarge}>{formatMoney(order.total)}</span>
                </div>
                {(attention.strongReasons.length > 0 || showProductionBadge) && (
                  <div className={styles.clusterSm} style={{ marginTop: "var(--space-2)" }}>
                    {attention.strongReasons.some((r) => r.type === "INCOMPLETE") && (
                      <span className={`${styles.badge} ${styles.badgeDanger}`}>Incompleto</span>
                    )}
                    {attention.strongReasons.some((r) => r.type === "ALTERADO_APOS_CONFIRMACAO") && (
                      <span className={`${styles.badge} ${styles.badgeDanger}`}>Requer reconfirmacao</span>
                    )}
                    {showProductionBadge && (
                      <span className={`${styles.badge} ${styles.badgeWarning}`}>
                        {order.orderType === "PRONTA_ENTREGA" ? "Sem saldo" : "Precisa produzir"}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </section>

            <section id="order-customer" className={detailStyles.infoCard}>
              <div className={detailStyles.infoCardHeader}>
                <div className={detailStyles.infoCardIcon}>👤</div>
                <span className={detailStyles.infoCardTitle}>Cliente</span>
              </div>
              <div className={detailStyles.infoCardBody}>
                <div className={detailStyles.infoRow}>
                  <span className={detailStyles.infoLabel}>Nome</span>
                  <Link
                    href={`/admin/clientes/${order.customer.id}`}
                    className={detailStyles.actionLink}
                  >
                    {order.customer.name}
                  </Link>
                </div>
                <div className={detailStyles.infoRow}>
                  <span className={detailStyles.infoLabel}>Telefone</span>
                  <span className={detailStyles.infoValue}>{order.customer.phone || "-"}</span>
                </div>
              </div>
            </section>

            <section id="order-delivery" className={detailStyles.infoCard}>
              <div className={detailStyles.infoCardHeader}>
                <div className={detailStyles.infoCardIcon}>📍</div>
                <span className={detailStyles.infoCardTitle}>
                  {deliveryMethodLabel[order.deliveryMethod]}
                </span>
              </div>
              <div className={detailStyles.infoCardBody}>
                <div className={detailStyles.infoRow}>
                  <span className={detailStyles.infoLabel}>Endereco</span>
                  <span className={detailStyles.infoValue}>
                    {order.deliveryMethod === "ENTREGA"
                      ? order.addressText || "Pendente"
                      : "Retirada no local"}
                  </span>
                </div>
                {order.deliveryMethod === "ENTREGA" && (
                  <>
                    <div className={detailStyles.infoRow}>
                      <span className={detailStyles.infoLabel}>Bairro</span>
                      <span className={detailStyles.infoValue}>{order.addressBairro || "-"}</span>
                    </div>
                    <div className={detailStyles.infoRow}>
                      <span className={detailStyles.infoLabel}>Cidade</span>
                      <span className={detailStyles.infoValue}>{order.addressCity || "-"}</span>
                    </div>
                    <div className={detailStyles.infoRow}>
                      <span className={detailStyles.infoLabel}>Referencia</span>
                      <span className={detailStyles.infoValue}>{order.addressReferencia || "-"}</span>
                    </div>
                  </>
                )}
                <div className={detailStyles.infoRow}>
                  <span className={detailStyles.infoLabel}>Data/Hora</span>
                  <span className={detailStyles.infoValue}>{viewModel.schedule.card}</span>
                </div>
                {order.deliveryMethod === "ENTREGA" && (
                  <div className={detailStyles.infoRow}>
                    <span className={detailStyles.infoLabel}>Taxa</span>
                    <span className={detailStyles.infoValue}>{formatMoney(order.deliveryFee || 0)}</span>
                  </div>
                )}
              </div>
            </section>

            <section id="order-payment" className={detailStyles.infoCard}>
              <div className={detailStyles.infoCardHeader}>
                <div className={detailStyles.infoCardIcon}>💳</div>
                <span className={detailStyles.infoCardTitle}>Pagamento</span>
                <span
                  className={`${styles.badge} ${
                    order.paidAt ? styles.badgeSuccess : styles.badgeWarning
                  }`}
                  style={{ marginLeft: "auto" }}
                >
                  {order.paidAt ? "Pago" : "Pendente"}
                </span>
              </div>
              <div className={detailStyles.infoCardBody}>
                <div className={detailStyles.infoRow}>
                  <span className={detailStyles.infoLabel}>Forma</span>
                  <span className={detailStyles.infoValue}>
                    {order.paymentMethod
                      ? paymentMethodLabel[order.paymentMethod] ?? order.paymentMethod
                      : "Nao informado"}
                  </span>
                </div>
                <div className={detailStyles.infoRow}>
                  <span className={detailStyles.infoLabel}>Sinal</span>
                  <span className={detailStyles.infoValue}>
                    {order.hasDeposit
                      ? `Sim (${formatMoney(order.depositAmount)})`
                      : "Nao"}
                  </span>
                </div>
                <div className={detailStyles.infoRow}>
                  <span className={detailStyles.infoLabel}>Restante</span>
                  <span className={detailStyles.infoValueLarge}>
                    {formatMoney(Number(order.total) - Number(order.depositAmount ?? 0))}
                  </span>
                </div>
                {!order.paidAt && (
                  <form action={markPaidAction} style={{ marginTop: "var(--space-3)" }}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <Button type="submit" variant="primary" className={detailStyles.fullWidth}>
                      Marcar como pago
                    </Button>
                  </form>
                )}
              </div>
            </section>
          </div>

          <Card as="section" id="order-items">
            <div className={styles.panelHeader}>
              <h2>Itens</h2>
            </div>
            <div className={styles.panelBody}>
              <OrderItemsTable items={itemsForTable} />
            </div>
          </Card>

          {order.needsReconfirmation ? (
            <Card as="section" id="order-changes">
              <div className={styles.panelHeader}>
                <h2>Mudancas desde a confirmacao</h2>
              </div>
              <div className={styles.panelBody}>
                {recentChanges.length === 0 ? (
                  <div className={styles.textMuted}>
                    Nenhuma mudanca registrada.
                  </div>
                ) : (
                  <ul className={detailStyles.summaryList}>
                    {recentChanges.map((log) => (
                      <li key={log.id}>
                        {log.field ? `Campo ${log.field}` : "Alteracao"}: 
                        {formatLogValue(log.beforeValue)} →{" "}
                        {formatLogValue(log.afterValue)}
                      </li>
                    ))}
                  </ul>
                )}
                <form action={reconfirmOrderAction} className={styles.formSection}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <Button type="submit" variant="primary">
                    Reconfirmar pedido
                  </Button>
                </form>
              </div>
            </Card>
          ) : null}

          <div id="order-pending" className={detailStyles.twoColumn}>
            <Card as="section">
              <div className={styles.panelHeader}>
                <h2>Pendencias (bloqueiam)</h2>
              </div>
              <div className={styles.panelBody}>
                {attention.strongReasons.length === 0 ? (
                  <EmptyStateCompact>Sem pendencias bloqueantes.</EmptyStateCompact>
                ) : (
                  <ul className={detailStyles.summaryList}>
                    {attention.strongReasons.map((reason, index) => {
                      let target = "#order-items";
                      if (reason.type === "ALTERADO_APOS_CONFIRMACAO") {
                        target = "#order-changes";
                      } else if (reason.type === "INCOMPLETE") {
                        if (attention.missingFields.includes("items")) {
                          target = "#order-items";
                        } else if (attention.missingFields.includes("date")) {
                          target = "#order-delivery";
                        }
                      }
                      return (
                        <li key={`${reason.type}-${index}`}>
                          {reason.label}{" "}
                          <Link
                            href={`${editLink}${target}`}
                            className={detailStyles.actionLink}
                          >
                            Resolver
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </Card>

            <Card as="section">
              <div className={styles.panelHeader}>
                <h2>Alertas (nao bloqueiam)</h2>
              </div>
              <div className={styles.panelBody}>
                {weakReasonsForDisplay.length === 0 ? (
                  <EmptyStateCompact>Sem alertas.</EmptyStateCompact>
                ) : (
                  <ul className={detailStyles.summaryList}>
                    {weakReasonsForDisplay.map((reason, index) => {
                      let target = "#order-production";
                      if (
                        reason.type === "MISSING_ADDRESS" ||
                        reason.type === "MISSING_TIME"
                      ) {
                        target = `${editLink}#order-delivery`;
                      }
                      return (
                        <li key={`${reason.type}-${index}`}>
                          {reason.label}{" "}
                          <Link href={target} className={detailStyles.actionLink}>
                            Ver
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </Card>
          </div>

          <Card as="section" id="order-actions">
            <div className={styles.panelHeader}>
              <h2>Acoes avancadas</h2>
            </div>
            <div className={styles.panelBody}>
              <details>
                <summary>Atualizar status e cancelar</summary>
                <div className={styles.stackSm}>
                  <form action={updateStatusAction} className={styles.clusterSm}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <select
                      name="status"
                      defaultValue={order.status}
                      disabled={order.status === "ENTREGUE" || order.status === "CANCELADO"}
                      className={styles.control}
                    >
                      {statusFlow.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel[status]}
                        </option>
                      ))}
                    </select>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Pagamento</span>
                      <div className={styles.clusterSm}>
                        <input type="checkbox" name="markPaid" value="1" />
                        <span>Marcar pagamento ao entregar</span>
                      </div>
                    </label>
                    <Button
                      type="submit"
                      variant="secondary"
                      disabled={
                        order.status === "ENTREGUE" || order.status === "CANCELADO"
                      }
                    >
                      Atualizar
                    </Button>
                  </form>
                  <CancelOrderForm orderId={order.id} />
                </div>
              </details>
            </div>
          </Card>

          <Card as="section" id="order-audit">
            <div className={styles.panelHeader}>
              <h2>Auditoria</h2>
            </div>
            <div className={styles.panelBody}>
              {auditLogs.length === 0 ? (
                <div className={styles.emptyState}>Sem registros recentes.</div>
              ) : (
                <ul className={detailStyles.summaryList}>
                  {auditLogs.map((log) => (
                    <li key={log.id}>
                      {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(log.createdAt)}{" "}
                      - {log.action} ({log.actor?.username || "sistema"})
                      {log.field ? ` | Campo: ${log.field}` : ""}
                      {log.beforeValue || log.afterValue ? (
                        <>
                          {" "}
                          | De: {formatLogValue(log.beforeValue)} | Para:{" "}
                          {formatLogValue(log.afterValue)}
                        </>
                      ) : null}
                      {!log.field && !log.beforeValue && !log.afterValue && log.changes
                        ? ` | ${log.changes}`
                        : ""}
                      {log.reason ? ` | Motivo: ${log.reason}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>

        <aside className={styles.pageAside}>
          <div className={styles.stickyPanel}>
            <OrderDetailSidebar
              viewModel={viewModel}
              editLink={editLink}
              summary={{
                subtotal: Number(order.subtotal),
                deliveryFee: order.deliveryFee ? Number(order.deliveryFee) : null,
                total: Number(order.total),
              }}
              status={order.status}
              statusLabel={statusLabel[order.status]}
              showProduction={showProduction}
              confirmFormId={confirmFormId}
              advanceFormId={advanceFormId}
            />
          </div>
        </aside>
      </div>


    </main>
  );
}

