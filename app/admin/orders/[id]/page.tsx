import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrderAttentionSummary } from "@/lib/domain/attention";
import { getOrderPendingSummary } from "@/lib/domain/order";
import { computeOrderPendingFlags, computeOrderStockStatus } from "@/lib/domain/production";
import { OrderStatus } from "@prisma/client";
import { AlertTriangle, Bell, History } from "lucide-react";
import {
  confirmOrderAction,
  convertToEncomendaAction,
  markPaidAction,
  reconfirmOrderAction,
  updateStatusAction,
} from "./actions";
import CancelOrderForm from "./CancelOrderForm.client";
import OrderDetailFocus from "./OrderDetailFocus.client";
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

const stepperSteps: Array<{ key: OrderStatus; label: string }> = [
  { key: "CONFIRMADO", label: "Confirmado" },
  { key: "EM_PRODUCAO", label: "Em producao" },
  { key: "PRONTO", label: "Pronto" },
  { key: "ENTREGUE", label: "Entregue" },
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

function formatStatusValue(value?: string | null) {
  if (!value) return "-";
  const maybeStatus = value as OrderStatus;
  return statusLabel[maybeStatus] ?? value;
}

function formatAuditTitle(log: {
  action: string;
  field?: string | null;
  beforeValue?: string | null;
  afterValue?: string | null;
}) {
  switch (log.action) {
    case "create_order":
      return "Pedido criado";
    case "create_items":
      return `Itens adicionados (${log.beforeValue ?? "0"}\u2192${log.afterValue ?? "-"})`;
    case "confirm":
      return "Pedido confirmado";
    case "reconfirm":
      return "Pedido reconfirmado";
    case "cancel":
      return "Pedido cancelado";
    case "mark_paid":
      return "Pagamento marcado como pago";
    case "convert_order_type":
      return "Tipo do pedido alterado";
    case "status_change":
      if (log.field === "status") {
        return `Status alterado: ${formatStatusValue(log.beforeValue)} \u2192 ${formatStatusValue(log.afterValue)}`;
      }
      return "Status alterado";
    case "order_update": {
      if (log.field === "items") return "Itens atualizados";
      if (log.field === "deliveryDatetime" || log.field === "deliveryTime") {
        return "Data/hora alterada";
      }
      if (log.field === "deliveryMethod") return "Metodo de entrega alterado";
      if (log.field === "orderType") return "Tipo do pedido alterado";
      if (
        log.field === "addressText" ||
        log.field === "addressBairro" ||
        log.field === "addressReferencia" ||
        log.field === "addressCity" ||
        log.field === "addressCep"
      ) {
        return "Endereco alterado";
      }
      if (log.field === "subtotal" || log.field === "total" || log.field === "deliveryFee") {
        return "Valores do pedido alterados";
      }
      if (log.field === "notes") return "Observacoes alteradas";
      return "Pedido atualizado";
    }
    default:
      return "Atualizacao registrada";
  }
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
  const weakReasonsForDisplay = showProduction
    ? attention.weakReasons.filter((reason) => reason.type !== "UNAVAILABLE_ITEMS")
    : attention.weakReasons;
  const itemsCountLabel =
    order.items.length === 1 ? "1 item" : `${order.items.length} itens`;
  const heroContext = `${orderTypeLabel[order.orderType]} \u2022 ${itemsCountLabel} \u2022 Cliente: ${order.customer.name}`;
  const pendingHasItems = attention.strongReasons.length > 0;
  const alertsHasItems = weakReasonsForDisplay.length > 0;
  const stepperIndex = stepperSteps.findIndex((step) => step.key === order.status);
  const isStepperCancelled = order.status === "CANCELADO";
  const isStepperDelivered = order.status === "ENTREGUE";
  const isStepperCompact = isStepperCancelled || isStepperDelivered;
  const isStepperFinal = isStepperCancelled || isStepperDelivered;
  const stepperSummaryLabel = isStepperCancelled ? "Fluxo encerrado" : "Fluxo concluido";
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
  const auditDateFormatter = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
  });
  const auditTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
    timeStyle: "short",
  });
  const auditGroups: Array<{
    key: string;
    label: string;
    items: typeof auditLogs;
  }> = [];
  for (const log of auditLogs) {
    const dayKey = log.createdAt.toISOString().slice(0, 10);
    const existing = auditGroups[auditGroups.length - 1];
    const label = auditDateFormatter.format(log.createdAt);
    if (!existing || existing.key !== dayKey) {
      auditGroups.push({ key: dayKey, label, items: [log] });
    } else {
      existing.items.push(log);
    }
  }

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
              <div className={detailStyles.orderHeaderContent}>
                <div className={detailStyles.orderHeaderTop}>
                  <div className={detailStyles.orderHeaderStatus}>
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
                </div>
                <div className={detailStyles.orderHeaderTitle}>
                  {deliveryMethodLabel[order.deliveryMethod]} — {viewModel.schedule.header}
                </div>
                <div className={detailStyles.orderHeaderContext}>{heroContext}</div>
                <div className={detailStyles.orderHeaderStepper}>
                  {isStepperFinal ? (
                    <details className={detailStyles.orderStepperDetails}>
                      <summary className={detailStyles.orderStepperSummary}>
                        <span className={detailStyles.orderStepperSummaryText}>
                          {stepperSummaryLabel} ✓
                        </span>
                        <span className={detailStyles.orderStepperSummaryToggle}>
                          Ver etapas
                        </span>
                      </summary>
                      <div className={detailStyles.orderStepperDetailsBody}>
                        <div
                          className={`${detailStyles.orderStepper} ${
                            isStepperCancelled ? detailStyles.orderStepperCancelled : ""
                          } ${isStepperCompact ? detailStyles.orderStepperCompact : ""}`
                            .trim()}
                        >
                          {stepperSteps.map((step, index) => {
                            const isComplete =
                              !isStepperCancelled &&
                              (isStepperDelivered ? true : stepperIndex > index);
                            const isActive =
                              !isStepperCancelled && !isStepperDelivered && stepperIndex === index;
                            return (
                              <div
                                key={step.key}
                                className={`${detailStyles.orderStepperStep} ${
                                  isComplete ? detailStyles.orderStepperStepComplete : ""
                                } ${isActive ? detailStyles.orderStepperStepActive : ""}`.trim()}
                              >
                                <span className={detailStyles.orderStepperDot} aria-hidden />
                                <span className={detailStyles.orderStepperLabel}>{step.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </details>
                  ) : (
                    <div
                      className={`${detailStyles.orderStepper} ${
                        isStepperCancelled ? detailStyles.orderStepperCancelled : ""
                      } ${isStepperCompact ? detailStyles.orderStepperCompact : ""}`
                        .trim()}
                    >
                      {stepperSteps.map((step, index) => {
                        const isComplete =
                          !isStepperCancelled &&
                          (isStepperDelivered ? true : stepperIndex > index);
                        const isActive =
                          !isStepperCancelled && !isStepperDelivered && stepperIndex === index;
                        return (
                          <div
                            key={step.key}
                            className={`${detailStyles.orderStepperStep} ${
                              isComplete ? detailStyles.orderStepperStepComplete : ""
                            } ${isActive ? detailStyles.orderStepperStepActive : ""}`.trim()}
                          >
                            <span className={detailStyles.orderStepperDot} aria-hidden />
                            <span className={detailStyles.orderStepperLabel}>{step.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className={detailStyles.orderHeaderTotal}>
                <span className={detailStyles.orderHeaderTotalLabel}>Total</span>
                <span className={detailStyles.orderHeaderTotalValue}>
                  {formatMoney(order.total)}
                </span>
              </div>
            </div>
          </section>

          {showProduction ? (
            <Card
              as="section"
              id="order-production"
              className={`${detailStyles.rail} ${detailStyles.railWarning}`}
            >
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
              </div>
              <div className={detailStyles.infoCardBody}>
                <div className={detailStyles.infoRow}>
                  <span className={detailStyles.infoLabel}>Subtotal</span>
                  <span className={detailStyles.infoValue}>{formatMoney(order.subtotal)}</span>
                </div>
                <div className={detailStyles.infoRow}>
                  <span className={detailStyles.infoLabel}>Total</span>
                  <span className={detailStyles.infoValueLarge}>{formatMoney(order.total)}</span>
                </div>
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
                    <Button type="submit" variant="outline" size="md" className={detailStyles.paymentAction}>
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
            <Card
              as="section"
              id="order-changes"
              className={`${detailStyles.rail} ${detailStyles.railWarning}`}
            >
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
            <Card
              as="section"
              className={`${detailStyles.rail} ${
                pendingHasItems ? detailStyles.railDanger : detailStyles.railNeutral
              }`}
            >
              <div className={styles.panelHeader}>
                <h2 className={detailStyles.sectionTitleWithIcon}>
                  <AlertTriangle size={16} className={detailStyles.sectionTitleIcon} aria-hidden />
                  Pendencias (bloqueiam)
                </h2>
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

            <Card
              as="section"
              className={`${detailStyles.rail} ${
                alertsHasItems ? detailStyles.railWarning : detailStyles.railNeutral
              }`}
            >
              <div className={styles.panelHeader}>
                <h2 className={detailStyles.sectionTitleWithIcon}>
                  <Bell size={16} className={detailStyles.sectionTitleIcon} aria-hidden />
                  Alertas (nao bloqueiam)
                </h2>
              </div>
              <div className={styles.panelBody}>
                {weakReasonsForDisplay.length === 0 ? (
                  <EmptyStateCompact>
                    {showProduction ? "Sem alertas adicionais." : "Sem alertas."}
                  </EmptyStateCompact>
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
              <h2 className={detailStyles.sectionTitleWithIcon}>
                <History size={16} className={detailStyles.sectionTitleIcon} aria-hidden />
                Auditoria
              </h2>
            </div>
            <div className={styles.panelBody}>
              {auditLogs.length === 0 ? (
                <div className={styles.emptyState}>Sem registros recentes.</div>
              ) : (
                <div className={detailStyles.auditTimeline}>
                  {auditGroups.map((group) => (
                    <div key={group.key}>
                      <div className={detailStyles.auditGroupHeader}>{group.label}</div>
                      <ul className={detailStyles.auditList}>
                        {group.items.map((log) => {
                          const detailLines: string[] = [`Acao: ${log.action}`];
                          if (log.field) detailLines.push(`Campo: ${log.field}`);
                          if (log.beforeValue || log.afterValue) {
                            detailLines.push(`De: ${formatLogValue(log.beforeValue)}`);
                            detailLines.push(`Para: ${formatLogValue(log.afterValue)}`);
                          }
                          if (log.changes) detailLines.push(`Mudancas: ${log.changes}`);
                          if (log.reason) detailLines.push(`Motivo: ${log.reason}`);
                          const detailsText = detailLines.join("\n");
                          return (
                            <li key={log.id} className={detailStyles.auditItem}>
                              <span className={detailStyles.auditDot} aria-hidden />
                              <div className={detailStyles.auditContent}>
                                <div className={detailStyles.auditHeader}>
                                  <span className={detailStyles.auditTitle}>
                                    {formatAuditTitle(log)}
                                  </span>
                                  <span className={detailStyles.auditTime}>
                                    {auditTimeFormatter.format(log.createdAt)}
                                  </span>
                                </div>
                                <div className={detailStyles.auditMeta}>
                                  {log.actor?.username || "sistema"}
                                </div>
                                {detailsText ? (
                                  <details className={detailStyles.auditDetails}>
                                    <summary className={detailStyles.auditDetailsToggle}>
                                      Ver detalhes
                                    </summary>
                                    <div className={detailStyles.auditDetailsBody}>
                                      <pre className={detailStyles.auditPayload}>
                                        {detailsText}
                                      </pre>
                                    </div>
                                  </details>
                                ) : null}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        <aside className={styles.pageAside}>
          <div className={styles.stickyPanel}>
            <OrderDetailSidebar
              viewModel={viewModel}
              editLink={editLink}
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

