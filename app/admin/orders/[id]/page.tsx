import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrderAttentionSummary } from "@/lib/domain/attention";
import { DEFAULT_DELIVERY_TIME } from "@/lib/domain/order";
import { OrderStatus } from "@prisma/client";
import {
  cancelOrderAction,
  confirmOrderAction,
  reconfirmOrderAction,
  updateStatusAction,
} from "./actions";
import styles from "../../_styles/adminPrimitives.module.css";

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

const statusOptions = [
  OrderStatus.RASCUNHO,
  OrderStatus.CONFIRMADO,
  OrderStatus.EM_PRODUCAO,
  OrderStatus.PRONTO,
  OrderStatus.ENTREGUE,
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

function flagBadgeClass(state: string) {
  if (state === "OK") return styles.badgeSuccess;
  if (state === "PENDING") return styles.badgeWarning;
  return styles.badgeNeutral;
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
        error?: string;
      }>
    | {
        converted?: string;
        created?: string;
        confirmed?: string;
        reconfirmed?: string;
        error?: string;
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

  const attention = getOrderAttentionSummary({
    status: order.status,
    deliveryDatetime: order.deliveryDatetime,
    deliveryTime: order.deliveryTime,
    deliveryMethod: order.deliveryMethod,
    addressText: order.addressText,
    addressCity: order.addressCity,
    items: order.items,
    needsReconfirmation: order.needsReconfirmation,
    paidAt: order.paidAt,
  });

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      entityType: "orders",
      entityId: order.id,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { actor: true },
  });

  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Pedido {order.orderNumber}</h1>
        <Link href="/admin/orders">Voltar</Link>
      </div>

      {created ? (
        <div className={styles.notice}>Pedido salvo.</div>
      ) : null}

      {resolvedSearch?.converted ? (
        <div className={`${styles.notice} ${styles.noticeWarning}`}>
          Estoque insuficiente para pronta entrega. Pedido convertido para
          encomenda.
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
            </div>
            <div>Tipo: {orderTypeLabel[order.orderType]}</div>
            <div>Entrega/Retirada: {deliveryMethodLabel[order.deliveryMethod]}</div>
            <div>
              Data/hora: {formatDateTime(order.deliveryDatetime, order.deliveryTime)}
            </div>
            {order.deliveryMethod === "ENTREGA" ? (
              <>
                <div>Endereco: {order.addressText || "-"}</div>
                <div>Bairro: {order.addressBairro || "-"}</div>
                <div>Referencia: {order.addressReferencia || "-"}</div>
                <div>Cidade: {order.addressCity || "-"}</div>
              </>
            ) : null}
            <div>Taxa de entrega: R$ {Number(order.deliveryFee || 0).toFixed(2)}</div>
            <div>Subtotal: R$ {Number(order.subtotal).toFixed(2)}</div>
            <div>Total: R$ {Number(order.total).toFixed(2)}</div>
            <div>Confirmado em: {formatDateTime(order.confirmedAt)}</div>
            <div>Pagamento: {order.paidAt ? "Pago" : "Pendente"}</div>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Pendencias</h2>
        </div>
        <div className={styles.panelBody}>
          {attention.reasons.length === 0 ? (
            <div className={styles.emptyState}>Sem pendencias.</div>
          ) : (
            <ul>
              {[...attention.strongReasons, ...attention.weakReasons].map(
                (reason, index) => (
                  <li key={`${reason.type}-${index}`}>{reason.label}</li>
                )
              )}
            </ul>
          )}
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Flags por campo</h2>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.clusterSm}>
            <span
              className={`${styles.badge} ${flagBadgeClass(
                attention.flags.items.state
              )}`}
            >
              Itens: {attention.flags.items.label}
            </span>
            <span
              className={`${styles.badge} ${flagBadgeClass(
                attention.flags.date.state
              )}`}
            >
              Data: {attention.flags.date.label}
            </span>
            <span
              className={`${styles.badge} ${flagBadgeClass(
                attention.flags.time.state
              )}`}
            >
              Horario: {attention.flags.time.label}
            </span>
            <span
              className={`${styles.badge} ${flagBadgeClass(
                attention.flags.address.state
              )}`}
            >
              Endereco: {attention.flags.address.label}
            </span>
            <span
              className={`${styles.badge} ${flagBadgeClass(
                attention.flags.payment.state
              )}`}
            >
              Pagamento: {attention.flags.payment.label}
            </span>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Itens</h2>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.stackSm}>
            {order.items.map((item) => (
              <div key={item.id} className={styles.panelSub}>
                <div>
                  <strong>
                    {item.snapshotProductName
                      ? `${item.snapshotProductName} - ${item.snapshotSkuName}`
                      : item.snapshotSkuName}
                  </strong>
                </div>
                <div>
                  {Number(item.quantity)} {item.snapshotUnitLabel} x R${" "}
                  {Number(item.snapshotUnitPrice).toFixed(2)} = R${" "}
                  {Number(item.lineTotal).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Atualizar status</h2>
        </div>
        <div className={styles.panelBody}>
          <form action={updateStatusAction} className={styles.clusterSm}>
            <input type="hidden" name="orderId" value={order.id} />
            <select
              name="status"
              defaultValue={order.status}
              disabled={order.status === "ENTREGUE" || order.status === "CANCELADO"}
              className={styles.control}
            >
              {statusOptions.map((status) => (
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
              disabled={order.status === "ENTREGUE" || order.status === "CANCELADO"}
              className={`${styles.button} ${styles.buttonSecondary}`}
            >
              Atualizar
            </button>
          </form>
        </div>
      </section>

      {order.status === "RASCUNHO" ? (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Confirmar pedido</h2>
          </div>
          <div className={styles.panelBody}>
            <form action={confirmOrderAction} className={styles.formSection}>
              <input type="hidden" name="orderId" value={order.id} />
              <input
                name="confirmReason"
                placeholder="Motivo (opcional)"
                className={styles.control}
              />
              <button
                type="submit"
                className={`${styles.button} ${styles.buttonPrimary}`}
              >
                Confirmar pedido
              </button>
            </form>
          </div>
        </section>
      ) : null}

      {order.needsReconfirmation ? (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Reconfirmar pedido</h2>
          </div>
          <div className={styles.panelBody}>
            <form action={reconfirmOrderAction} className={styles.formSection}>
              <input type="hidden" name="orderId" value={order.id} />
              <input
                name="reconfirmReason"
                placeholder="Motivo (opcional)"
                className={styles.control}
              />
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
          <h2>Cancelar pedido</h2>
        </div>
        <div className={styles.panelBody}>
          <form action={cancelOrderAction} className={styles.formSection}>
            <input type="hidden" name="orderId" value={order.id} />
            <input
              name="cancellationReason"
              placeholder="Motivo do cancelamento"
              className={styles.control}
            />
            <button
              type="submit"
              className={`${styles.button} ${styles.buttonDanger}`}
            >
              Cancelar pedido
            </button>
          </form>
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
            <ul>
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
    </main>
  );
}
