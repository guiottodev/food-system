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
import { getOrderDetailViewModel } from "./orderDetailViewModel";
import Chip from "../../_components/Chip";
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

function formatLogValue(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "-";
}

type AuditLogEntry = {
  id: string;
  action: string;
  field: string | null;
  beforeValue: string | null;
  afterValue: string | null;
  reason: string | null;
  changes: string | null;
  createdAt: Date;
  actor: { username: string } | null;
};

function formatItemsCount(value?: string | null) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  const matchItems = trimmed.match(/^(\d+)\s+itens?$/i);
  if (matchItems) return Number(matchItems[1]);
  const matchNumber = trimmed.match(/^(\d+)$/);
  if (matchNumber) return Number(matchNumber[1]);
  const parts = trimmed.split(";").map((part) => part.trim()).filter(Boolean);
  return parts.length > 0 ? parts.length : null;
}

function formatItemsChange(label: string, before?: string | null, after?: string | null) {
  const beforeCount = formatItemsCount(before);
  const afterCount = formatItemsCount(after);
  if (beforeCount !== null && afterCount !== null) {
    return `${label} (${beforeCount}→${afterCount})`;
  }
  return label;
}

function formatAuditEvent(log: AuditLogEntry) {
  if (log.action === "create_order") return "Pedido criado";
  if (log.action === "create_items") {
    return formatItemsChange("Itens adicionados", log.beforeValue, log.afterValue);
  }
  if (log.action === "confirm") return "Pedido confirmado";
  if (log.action === "reconfirm") return "Pedido reconfirmado";
  if (log.action === "cancel") return "Pedido cancelado";
  if (log.action === "convert_order_type") return "Tipo do pedido atualizado";
  if (log.action === "mark_paid") return "Pagamento marcado como pago";
  if (log.action === "flag_reconfirm") return "Pedido marcado para reconfirmacao";
  if (log.action === "status_change" || log.field === "status") {
    const beforeStatus = log.beforeValue
      ? statusLabel[log.beforeValue as OrderStatus] ?? log.beforeValue
      : "-";
    const afterStatus = log.afterValue
      ? statusLabel[log.afterValue as OrderStatus] ?? log.afterValue
      : "-";
    return `Status: ${beforeStatus} → ${afterStatus}`;
  }
  if (log.action === "order_update") {
    if (log.field === "items") {
      return formatItemsChange("Itens atualizados", log.beforeValue, log.afterValue);
    }
    if (log.field === "deliveryDatetime" || log.field === "deliveryTime") {
      return "Data/hora atualizada";
    }
    if (log.field === "deliveryMethod") {
      return "Metodo de entrega atualizado";
    }
    if (log.field === "orderType") {
      return "Tipo do pedido atualizado";
    }
    if (
      log.field === "addressText" ||
      log.field === "addressBairro" ||
      log.field === "addressReferencia" ||
      log.field === "addressCity" ||
      log.field === "addressCep"
    ) {
      return "Endereco atualizado";
    }
    if (log.field === "deliveryFee" || log.field === "subtotal" || log.field === "total") {
      return "Valores do pedido atualizados";
    }
    if (log.field === "notes") {
      return "Observacoes atualizadas";
    }
    return "Pedido atualizado";
  }
  return "Atualizacao no pedido";
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDayLabel(date: Date, now: Date) {
  const today = startOfDay(now).getTime();
  const candidate = startOfDay(date).getTime();
  if (candidate === today) return "Hoje";
  const yesterday = startOfDay(new Date(now.getTime() - 86400000)).getTime();
  if (candidate === yesterday) return "Ontem";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(date);
}

function groupAuditLogs(logs: AuditLogEntry[]) {
  const now = new Date();
  const groups: Array<{
    key: string;
    label: string;
    items: AuditLogEntry[];
  }> = [];
  let currentKey = "";

  for (const log of logs) {
    const key = getDateKey(log.createdAt);
    if (key !== currentKey) {
      currentKey = key;
      groups.push({
        key,
        label: formatDayLabel(log.createdAt, now),
        items: [],
      });
    }
    groups[groups.length - 1].items.push(log);
  }

  return groups;
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
  const auditGroups = groupAuditLogs(auditLogs as AuditLogEntry[]);
  const timeFormatter = new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" });

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
          <Link href={editLink} className={styles.button}>
            Editar pedido
          </Link>
          <Link href="/admin/orders">Voltar</Link>
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
              <Link href="/admin/producao" className={styles.button}>
                Registrar producao
              </Link>
              <Link href="/admin/consumo" className={styles.button}>
                Ajustar saldo (admin)
              </Link>
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
            <section id="order-production" className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>
                  {order.orderType === "PRONTA_ENTREGA"
                    ? "Sem saldo (pronta entrega)"
                    : "Producao (precisa produzir)"}
                </h2>
                {order.orderType === "PRONTA_ENTREGA" && gapItems.length > 0 ? (
                  <form action={convertToEncomendaAction}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <button
                      type="submit"
                      className={`${styles.button} ${styles.buttonSecondary}`}
                    >
                      Converter para encomenda
                    </button>
                  </form>
                ) : null}
              </div>
              <div className={styles.panelBody}>
                <div className={styles.textMuted}>
                  Falta produzir: {gapItems.length} itens, total {gapTotal}.
                </div>
                <div className={detailStyles.productionTable}>
                  {gapItems.map((gapItem) => {
                    const item = order.items.find(
                      (entry) => entry.skuId === gapItem.skuId
                    );
                    return (
                      <div key={gapItem.skuId} className={detailStyles.productionRow}>
                        <div>
                          <strong>
                            {item?.snapshotProductName
                              ? `${item.snapshotProductName} - ${item.snapshotSkuName}`
                              : item?.snapshotSkuName}
                          </strong>
                          <div className={detailStyles.itemMeta}>
                            {item?.snapshotUnitLabel}
                          </div>
                        </div>
                        <div className={detailStyles.productionValue}>
                          Pedido: {gapItem.requiredQty}
                        </div>
                        <div className={detailStyles.productionValue}>
                          Disponivel: {gapItem.availableNow}
                        </div>
                        <div className={detailStyles.productionValue}>
                          Falta: {gapItem.gapQty}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
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
                {(attention.strongReasons.length > 0 ||
                  attention.weakReasons.some((r) => r.type === "UNAVAILABLE_ITEMS")) && (
                  <div className={styles.clusterSm} style={{ marginTop: "var(--space-2)" }}>
                    {attention.strongReasons.some((r) => r.type === "INCOMPLETE") && (
                      <span className={`${styles.badge} ${styles.badgeDanger}`}>Incompleto</span>
                    )}
                    {attention.strongReasons.some((r) => r.type === "ALTERADO_APOS_CONFIRMACAO") && (
                      <span className={`${styles.badge} ${styles.badgeDanger}`}>Requer reconfirmacao</span>
                    )}
                    {attention.weakReasons.some((r) => r.type === "UNAVAILABLE_ITEMS") && (
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
                    <button
                      type="submit"
                      className={`${styles.button} ${styles.buttonPrimary}`}
                      style={{ width: "100%" }}
                    >
                      Marcar como pago
                    </button>
                  </form>
                )}
              </div>
            </section>
          </div>

          <section id="order-items" className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Itens</h2>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.stackSm}>
                {order.items.map((item) => {
                  const availabilityInfo = item.skuId
                    ? availabilityBySku.get(item.skuId)
                    : null;
                  const gapQty = availabilityInfo?.gapQty ?? 0;
                  return (
                    <div key={item.id} className={detailStyles.itemRow}>
                      <div>
                        <strong>
                          {item.snapshotProductName
                            ? `${item.snapshotProductName} - ${item.snapshotSkuName}`
                            : item.snapshotSkuName}
                        </strong>
                        <div className={detailStyles.itemMeta}>
                          {item.snapshotUnitLabel}
                        </div>
                      </div>
                      <div>
                        {Number(item.quantity)} {item.snapshotUnitLabel} x{" "}
                        {formatMoney(item.snapshotUnitPrice)} ={" "}
                        {formatMoney(item.lineTotal)}
                      </div>
                      {gapQty > 0 ? (
                        <div className={styles.textError}>
                          Falta produzir: {gapQty}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {order.needsReconfirmation ? (
            <section id="order-changes" className={styles.panel}>
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
                  <button
                    type="submit"
                    className={`${styles.button} ${styles.buttonPrimary}`}
                  >
                    Reconfirmar pedido
                  </button>
                </form>
              </div>
            </section>
          ) : null}

          <div id="order-pending" className={detailStyles.twoColumn}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Pendencias (bloqueiam)</h2>
              </div>
              <div className={styles.panelBody}>
                {attention.strongReasons.length === 0 ? (
                  <div className={styles.emptyState}>Sem pendencias bloqueantes.</div>
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
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Alertas (nao bloqueiam)</h2>
              </div>
              <div className={styles.panelBody}>
                {attention.weakReasons.length === 0 ? (
                  <div className={styles.emptyState}>Sem alertas.</div>
                ) : (
                  <ul className={detailStyles.summaryList}>
                    {attention.weakReasons.map((reason, index) => {
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
            </section>
          </div>

          <section id="order-actions" className={styles.panel}>
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
                    <button
                      type="submit"
                      disabled={
                        order.status === "ENTREGUE" || order.status === "CANCELADO"
                      }
                      className={`${styles.button} ${styles.buttonSecondary}`}
                    >
                      Atualizar
                    </button>
                  </form>
                  <CancelOrderForm orderId={order.id} />
                </div>
              </details>
            </div>
          </section>

          <section id="order-audit" className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Auditoria</h2>
            </div>
            <div className={styles.panelBody}>
              {auditGroups.length === 0 ? (
                <div className={styles.emptyState}>Sem registros recentes.</div>
              ) : (
                <div className={detailStyles.auditTimeline}>
                  {auditGroups.map((group) => (
                    <div key={group.key} className={detailStyles.auditGroup}>
                      <div className={detailStyles.auditGroupTitle}>{group.label}</div>
                      <div className={detailStyles.auditGroupList}>
                        {group.items.map((log) => {
                          const eventText = formatAuditEvent(log);
                          const timeText = timeFormatter.format(log.createdAt);
                          return (
                            <div key={log.id} className={detailStyles.auditItem}>
                              <div className={detailStyles.auditDot} />
                              <div className={detailStyles.auditContent}>
                                <div className={detailStyles.auditHeader}>
                                  <span className={detailStyles.auditTitle}>{eventText}</span>
                                  <span className={detailStyles.auditTime}>{timeText}</span>
                                </div>
                                <div className={detailStyles.auditMeta}>
                                  por {log.actor?.username || "sistema"}
                                </div>
                                <details className={detailStyles.auditDetails}>
                                  <summary className={detailStyles.auditDetailsSummary}>
                                    Ver detalhes
                                  </summary>
                                  <div className={detailStyles.auditDetailsBody}>
                                    <div>
                                      <span className={detailStyles.auditDetailsLabel}>Acao:</span>{" "}
                                      {log.action}
                                    </div>
                                    {log.field ? (
                                      <div>
                                        <span className={detailStyles.auditDetailsLabel}>
                                          Campo:
                                        </span>{" "}
                                        {log.field}
                                      </div>
                                    ) : null}
                                    {log.beforeValue || log.afterValue ? (
                                      <div>
                                        <span className={detailStyles.auditDetailsLabel}>De:</span>{" "}
                                        {formatLogValue(log.beforeValue)}{" "}
                                        <span className={detailStyles.auditDetailsLabel}>Para:</span>{" "}
                                        {formatLogValue(log.afterValue)}
                                      </div>
                                    ) : null}
                                    {log.changes ? (
                                      <div>
                                        <span className={detailStyles.auditDetailsLabel}>
                                          Detalhes:
                                        </span>{" "}
                                        {log.changes}
                                      </div>
                                    ) : null}
                                    {log.reason ? (
                                      <div>
                                        <span className={detailStyles.auditDetailsLabel}>
                                          Motivo:
                                        </span>{" "}
                                        {log.reason}
                                      </div>
                                    ) : null}
                                  </div>
                                </details>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
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

