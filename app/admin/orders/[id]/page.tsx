import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import { cancelOrderAction, updateStatusAction } from "./actions";
import styles from "../../_styles/adminPrimitives.module.css";

const statusLabel: Record<OrderStatus, string> = {
  NOVO: "Novo",
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
  OrderStatus.NOVO,
  OrderStatus.EM_PRODUCAO,
  OrderStatus.PRONTO,
  OrderStatus.ENTREGUE,
];

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }> | { id: string };
  searchParams?:
    | Promise<{ converted?: string; created?: string; error?: string }>
    | { converted?: string; created?: string; error?: string };
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

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Dados do pedido</h2>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.stackSm}>
            <div>Cliente: {order.customer.name}</div>
            <div>Telefone: {order.customer.phone || "-"}</div>
            <div>Status: {statusLabel[order.status]}</div>
            <div>Tipo: {orderTypeLabel[order.orderType]}</div>
            <div>Entrega/Retirada: {deliveryMethodLabel[order.deliveryMethod]}</div>
            <div>Data/hora: {formatDateTime(order.deliveryDatetime)}</div>
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
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
