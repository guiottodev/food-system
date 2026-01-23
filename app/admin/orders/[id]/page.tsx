import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrderAttentionSummary } from "@/lib/domain/attention";
import { DEFAULT_DELIVERY_TIME, getOrderPendingSummary } from "@/lib/domain/order";
import { computeOrderPendingFlags } from "@/lib/domain/production";
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
import styles from "../../_styles/adminPrimitives.module.css";
import detailStyles from "../orderDetail.module.css";

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
  });

  const pendingSummary = getOrderPendingSummary({
    deliveryDatetime: order.deliveryDatetime,
    items: order.items,
    needsReconfirmation: order.needsReconfirmation,
  });

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

  const statusIndex = statusFlow.indexOf(order.status);
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
      if (!hasPayment) {
        blockedReasons.push("Pagamento pendente.");
      }
      return {
        label: "Marcar entregue",
        type: "status" as const,
        status: "ENTREGUE" as OrderStatus,
      };
    }
    return { label: "Atualizar status", type: "none" as const };
  })();

  const primaryDisabled = blockedReasons.length > 0 || isFinal;
  const whyList: string[] = [];
  if (order.orderType === "ENCOMENDA") {
    whyList.push("Pedido de encomenda: producao planejada.");
  } else {
    whyList.push("Pronta entrega: exige saldo disponivel.");
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

      {created ? <div className={styles.notice}>Pedido salvo.</div> : null}

      {resolvedSearch?.updated ? (
        <div className={styles.notice}>Pedido atualizado.</div>
      ) : null}

      {resolvedSearch?.converted ? (
        <div className={`${styles.notice} ${styles.noticeWarning}`}>
          Estoque insuficiente para pronta entrega. Pedido convertido para encomenda.
        </div>
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

      {resolvedSearch?.error === "pagamento" ? (
        <p className={styles.textError}>
          Pagamento pendente. Marque o pagamento para entregar.
        </p>
      ) : null}

      {resolvedSearch?.error === "confirmacao" ? (
        <p className={styles.textError}>Confirmacao invalida para este status.</p>
      ) : null}

      {resolvedSearch?.error === "reconfirmacao" ? (
        <p className={styles.textError}>Nao ha pendencia para reconfirmar.</p>
      ) : null}

      {resolvedSearch?.confirmed ? (
        <div className={styles.notice}>Pedido confirmado.</div>
      ) : null}

      {resolvedSearch?.reconfirmed ? (
        <div className={styles.notice}>Pedido reconfirmado.</div>
      ) : null}

      <section className={`${styles.panel} ${styles.panelPrimary}`}>
        <div className={detailStyles.summaryGrid}>
          <div className={detailStyles.summaryHeader}>
            <div className={styles.clusterSm}>
              <strong className={detailStyles.sectionTitle}>Resumo operacional</strong>
              <span className={`${styles.badge} ${styles.badgeNeutral}`}>
                {statusLabel[order.status]}
              </span>
              {order.status === "CANCELADO" ? (
                <span className={`${styles.badge} ${styles.badgeDanger}`}>
                  Cancelado
                </span>
              ) : null}
            </div>
            <div className={detailStyles.timeline}>
              {statusFlow.map((status, index) => {
                const isActive = index === statusIndex;
                const isComplete = index < statusIndex;
                return (
                  <span
                    key={status}
                    className={`${detailStyles.timelineStep} ${
                      isActive ? detailStyles.timelineActive : ""
                    } ${isComplete ? detailStyles.timelineComplete : ""}`}
                  >
                    {statusLabel[status]}
                  </span>
                );
              })}
            </div>
          </div>

          <div className={detailStyles.actionBlock}>
            <div className={detailStyles.sectionTitle}>Proxima acao recomendada</div>
            <div className={detailStyles.summaryActions}>
              {primaryAction.type === "confirm" ? (
                <form action={confirmOrderAction} className={styles.clusterSm}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <button
                    type="submit"
                    className={`${styles.button} ${styles.buttonPrimary}`}
                    disabled={primaryDisabled}
                  >
                    {primaryAction.label}
                  </button>
                </form>
              ) : null}
              {primaryAction.type === "reconfirm" ? (
                <form action={reconfirmOrderAction} className={styles.clusterSm}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <button
                    type="submit"
                    className={`${styles.button} ${styles.buttonPrimary}`}
                    disabled={primaryDisabled}
                  >
                    {primaryAction.label}
                  </button>
                </form>
              ) : null}
              {primaryAction.type === "status" ? (
                <form action={updateStatusAction} className={styles.clusterSm}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="status" value={primaryAction.status} />
                  {primaryAction.status === "ENTREGUE" && !hasPayment ? (
                    <label className={styles.choiceRow}>
                      <input type="checkbox" name="markPaid" value="1" />
                      <span className={styles.choiceLabel}>
                        Marcar pagamento ao entregar
                      </span>
                    </label>
                  ) : null}
                  <button
                    type="submit"
                    className={`${styles.button} ${styles.buttonPrimary}`}
                    disabled={primaryDisabled}
                  >
                    {primaryAction.label}
                  </button>
                </form>
              ) : null}
            </div>
            {primaryDisabled && blockedReasons.length > 0 ? (
              <div>
                <div className={detailStyles.sectionTitle}>Bloqueado porque</div>
                <ul className={detailStyles.summaryList}>
                  {blockedReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div>
            <div className={detailStyles.sectionTitle}>Por que</div>
            <ul className={detailStyles.summaryList}>
              {whyList.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

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

      <section id="order-delivery" className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Combinado</h2>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.stackSm}>
            <div>
              <strong>
                {deliveryMethodLabel[order.deliveryMethod]} —{" "}
                {order.deliveryMethod === "ENTREGA"
                  ? order.addressText || "Endereco pendente"
                  : "Retirada no local"}{" "}
                — {formatDateTime(order.deliveryDatetime, order.deliveryTime)}
              </strong>
            </div>
            <div className={detailStyles.twoColumn}>
              <div>
                <div>Bairro: {order.addressBairro || "-"}</div>
                <div>Referencia: {order.addressReferencia || "-"}</div>
              </div>
              <div>
                <div>Cidade: {order.addressCity || "-"}</div>
                <div>Taxa de entrega: {formatMoney(order.deliveryFee || 0)}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="order-payment" className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Pagamento combinado</h2>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.stackSm}>
            <div>
              Forma combinada:{" "}
              {order.paymentMethod
                ? paymentMethodLabel[order.paymentMethod] ?? order.paymentMethod
                : "Nao informado"}
            </div>
            <div>
              Sinal: {order.hasDeposit ? "Sim" : "Nao"}{" "}
              {order.hasDeposit && order.depositAmount
                ? `(${formatMoney(order.depositAmount)})`
                : ""}
            </div>
            <div>
              Restante:{" "}
              {formatMoney(
                Number(order.total) - Number(order.depositAmount ?? 0)
              )}
            </div>
            <div>Status: {order.paidAt ? "Pago" : "Pendente"}</div>
            {!order.paidAt ? (
              <form action={markPaidAction} className={styles.clusterSm}>
                <input type="hidden" name="orderId" value={order.id} />
                <button type="submit" className={styles.button}>
                  Marcar como pago
                </button>
              </form>
            ) : null}
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

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Dados do pedido</h2>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.stackSm}>
            <div>
              Cliente:{" "}
              <Link href={`/admin/clientes/${order.customer.id}`}>
                {order.customer.name}
              </Link>
            </div>
            <div>Telefone: {order.customer.phone || "-"}</div>
            <div className={styles.clusterSm}>
              <span>Status: {statusLabel[order.status]}</span>
              {attention.strongReasons.some(
                (reason) => reason.type === "INCOMPLETE"
              ) ? (
                <span className={`${styles.badge} ${styles.badgeWarning}`}>
                  Incompleto
                </span>
              ) : null}
              {attention.strongReasons.some(
                (reason) => reason.type === "ALTERADO_APOS_CONFIRMACAO"
              ) ? (
                <span className={`${styles.badge} ${styles.badgeDanger}`}>
                  Alterado - requer reconfirmacao
                </span>
              ) : null}
              {attention.weakReasons.some(
                (reason) => reason.type === "UNAVAILABLE_ITEMS"
              ) ? (
                <span
                  className={`${styles.badge} ${styles.badgeWarning}`}
                  title={
                    order.orderType === "PRONTA_ENTREGA"
                      ? "Sem saldo para pronta entrega."
                      : "Precisa produzir para atender este pedido."
                  }
                >
                  {order.orderType === "PRONTA_ENTREGA"
                    ? "Sem saldo"
                    : "Precisa produzir"}
                </span>
              ) : null}
            </div>
            <div>Tipo: {orderTypeLabel[order.orderType]}</div>
            <div>Entrega/Retirada: {deliveryMethodLabel[order.deliveryMethod]}</div>
            <div>
              Data/hora: {formatDateTime(order.deliveryDatetime, order.deliveryTime)}
            </div>
            <div>Subtotal: {formatMoney(order.subtotal)}</div>
            <div>Total: {formatMoney(order.total)}</div>
            <div>Confirmado em: {formatDateTime(order.confirmedAt)}</div>
            <div>Pagamento: {order.paidAt ? "Pago" : "Pendente"}</div>
          </div>
        </div>
      </section>

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
