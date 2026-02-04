import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrderAttentionSummary } from "@/lib/domain/attention";
import { DEFAULT_DELIVERY_TIME, getOrderPendingSummary } from "@/lib/domain/order";
import { computeOrderPendingFlags, computeOrderStockStatus } from "@/lib/domain/production";
import { OrderStatus } from "@prisma/client";
import {
  convertToEncomendaAction,
  markPaidAction,
  reconfirmOrderAction,
  updateStatusAction,
} from "./actions";
import CancelOrderForm from "./CancelOrderForm.client";
import OrderDetailFocus from "./OrderDetailFocus.client";
import OrderDetailNextAction from "./OrderDetailNextAction.client";
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

function formatDate(value?: Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(value);
}


function formatDateTime(value?: Date | null, time?: string | null) {
  if (!value) return "-";
  const dateLabel = formatDate(value);
  const trimmedTime = time?.trim();
  if (!trimmedTime || trimmedTime === DEFAULT_DELIVERY_TIME) {
    return dateLabel;
  }
  return `${dateLabel} ${trimmedTime}`;
}

function formatMoney(value: unknown) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return "R$ 0,00";
  return `R$ ${number.toFixed(2)}`;
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
  const itemsReady = pendingSummary.hasItems;
  const scheduleReady =
    order.orderType === "PRONTA_ENTREGA"
      ? true
      : Boolean(order.deliveryDatetime);
  const timeReady =
    order.orderType === "PRONTA_ENTREGA"
      ? true
      : Boolean(order.deliveryTime && order.deliveryTime !== DEFAULT_DELIVERY_TIME);
  const addressReady =
    order.deliveryMethod !== "ENTREGA"
      ? true
      : Boolean(order.addressText?.trim()) && Boolean(order.addressCity?.trim());

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

  const isFinal = order.status === "ENTREGUE" || order.status === "CANCELADO";
  const hasPayment = Boolean(order.paidAt);

  const blockedReasons: string[] = [];
  const primaryAction = (() => {
    if (isFinal) {
      return { label: "Pedido finalizado", type: "none" as const };
    }
    if (order.needsReconfirmation) {
      return { label: "Reconfirmar pedido", type: "reconfirm" as const };
    }
    if (order.status === "RASCUNHO") {
      if (!pendingSummary.hasItems) {
        blockedReasons.push("Adicione itens ao pedido.");
      }
      if (!pendingSummary.hasDeliveryDate) {
        blockedReasons.push("Defina a data de entrega.");
      }
      return { label: "Confirmar pedido", type: "confirm" as const };
    }
    if (order.status === "CONFIRMADO") {
      if (!pendingSummary.hasItems) {
        blockedReasons.push("Adicione itens ao pedido.");
      }
      if (!pendingSummary.hasDeliveryDate) {
        blockedReasons.push("Defina a data de entrega.");
      }
      return {
        label: "Iniciar producao",
        type: "status" as const,
        status: "EM_PRODUCAO" as OrderStatus,
      };
    }
    if (order.status === "EM_PRODUCAO") {
      if (attention.strongReasons.length > 0) {
        if (!pendingSummary.hasItems) blockedReasons.push("Itens pendentes.");
        if (!pendingSummary.hasDeliveryDate)
          blockedReasons.push("Data pendente.");
        if (order.needsReconfirmation) {
          blockedReasons.push("Reconfirmacao pendente.");
        }
      }
      return {
        label: "Marcar pronto",
        type: "status" as const,
        status: "PRONTO" as OrderStatus,
      };
    }
    if (order.status === "PRONTO") {
      if (attention.strongReasons.length > 0) {
        if (!pendingSummary.hasItems) blockedReasons.push("Itens pendentes.");
        if (!pendingSummary.hasDeliveryDate)
          blockedReasons.push("Data pendente.");
        if (order.needsReconfirmation) {
          blockedReasons.push("Reconfirmacao pendente.");
        }
      }
      return {
        label: "Marcar entregue",
        type: "status" as const,
        status: "ENTREGUE" as OrderStatus,
      };
    }
    return { label: "Atualizar status", type: "none" as const };
  })();

  const whyList: string[] = [];
  if (order.orderType === "ENCOMENDA") {
    whyList.push("Pedido de encomenda: producao planejada.");
  } else {
    whyList.push("Pronta entrega: alerta de saldo insuficiente quando aplicavel.");
  }
  if (attention.strongReasons.length > 0) {
    whyList.push(`Pendencias bloqueando: ${attention.strongReasons.length}.`);
  }
  if (attention.weakReasons.length > 0) {
    whyList.push(`Alertas ativos: ${attention.weakReasons.length}.`);
  }
  if (hasPayment) {
    whyList.push("Pagamento registrado.");
  }

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

      <OrderDetailNextAction
        orderId={order.id}
        status={order.status}
        attention={attention}
        pendingSummary={pendingSummary}
        itemsReady={itemsReady}
        scheduleReady={scheduleReady}
        timeReady={timeReady}
        addressReady={addressReady}
        orderType={order.orderType}
        deliveryMethod={order.deliveryMethod}
        deliveryDatetime={order.deliveryDatetime}
        deliveryTime={order.deliveryTime}
        customerName={order.customer.name}
        itemsCount={order.items.length}
        subtotal={Number(order.subtotal)}
        deliveryFee={order.deliveryFee ? Number(order.deliveryFee) : null}
        total={Number(order.total)}
        isFinal={isFinal}
        needsReconfirmation={order.needsReconfirmation}
        hasPayment={hasPayment}
        primaryActionStatus={primaryAction.type === "status" ? primaryAction.status : undefined}
      />

      <div className={detailStyles.twoColumn}>
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
                      <Link href={`${editLink}${target}`} className={detailStyles.actionLink}>
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

      {(gapItems.length > 0 ||
        (order.orderType === "ENCOMENDA" && order.items.length > 0)) && (
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
            {gapItems.length === 0 ? (
              <div className={styles.textMuted}>
                Saldo suficiente para os itens deste pedido.
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        </section>
      )}

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

      <div className={detailStyles.infoGrid}>
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
              <span className={detailStyles.infoValue}>
                {formatDateTime(order.deliveryDatetime, order.deliveryTime)}
              </span>
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
                    {log.field ? `Campo ${log.field}` : "Alteracao"}: {" "}
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

      <div className={detailStyles.infoGrid}>
        <section className={detailStyles.infoCard}>
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
              <span className={detailStyles.infoLabel}>Confirmado</span>
              <span className={detailStyles.infoValue}>{formatDateTime(order.confirmedAt)}</span>
            </div>
            <div className={detailStyles.infoRow}>
              <span className={detailStyles.infoLabel}>Subtotal</span>
              <span className={detailStyles.infoValue}>{formatMoney(order.subtotal)}</span>
            </div>
            <div className={detailStyles.infoRow}>
              <span className={detailStyles.infoLabel}>Total</span>
              <span className={detailStyles.infoValueLarge}>{formatMoney(order.total)}</span>
            </div>
            {(attention.strongReasons.length > 0 || attention.weakReasons.some(r => r.type === "UNAVAILABLE_ITEMS")) && (
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
      </div>

      <section className={styles.panel}>
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
      </section>

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
    </main>
  );
}
