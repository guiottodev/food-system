import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import { cancelOrderAction, updateStatusAction } from "./actions";

const statusLabel: Record<OrderStatus, string> = {
  NOVO: "Novo",
  CONFIRMADO: "Confirmado",
  EM_PRODUCAO: "Em produção",
  PRONTO: "Pronto",
  EM_ROTA: "Em rota",
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
  OrderStatus.CONFIRMADO,
  OrderStatus.EM_PRODUCAO,
  OrderStatus.PRONTO,
  OrderStatus.EM_ROTA,
  OrderStatus.ENTREGUE,
  OrderStatus.CANCELADO,
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
  searchParams?: { converted?: string; error?: string };
}) {
  const p = await Promise.resolve(params);
  const id = p?.id;
  if (!id) {
    redirect("/admin/orders?error=missing_id");
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        select: {
          id: true,
          quantity: true,
          priceAtTime: true,
          lineTotal: true,
          snapshotDisplayName: true,
          snapshotUnitLabel: true,
          snapshotUnitType: true,
        },
      },
    },
  });

  if (!order) {
    return (
      <main>
        <p>Pedido não encontrado.</p>
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
    <main style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Pedido {order.orderNumber}</h1>
        <Link href="/admin/orders">Voltar</Link>
      </div>

      {searchParams?.converted ? (
        <div
          style={{
            padding: 12,
            background: "#fff3cd",
            border: "1px solid #ffecb5",
            borderRadius: 6,
          }}
        >
          Estoque insuficiente para pronta entrega. Pedido convertido para
          encomenda.
        </div>
      ) : null}

      {searchParams?.error === "motivo" ? (
        <p style={{ color: "crimson" }}>Informe o motivo do cancelamento.</p>
      ) : null}

      {searchParams?.error === "transicao" ? (
        <p style={{ color: "crimson" }}>Transição de status inválida.</p>
      ) : null}

      <section style={{ border: "1px solid #ddd", padding: 12 }}>
        <h2>Dados do pedido</h2>
        <p>Cliente: {order.customer.name}</p>
        <p>Telefone: {order.customer.phone || "-"}</p>
        <p>Status: {statusLabel[order.status]}</p>
        <p>Tipo: {orderTypeLabel[order.orderType]}</p>
        <p>Entrega/Retirada: {deliveryMethodLabel[order.deliveryMethod]}</p>
        <p>Data/hora: {formatDateTime(order.deliveryDatetime)}</p>
        {order.deliveryMethod === "ENTREGA" ? (
          <>
            <p>Endereço: {order.addressText || "-"}</p>
            <p>Bairro: {order.addressBairro || "-"}</p>
            <p>Referência: {order.addressReferencia || "-"}</p>
            <p>Cidade: {order.addressCity || "-"}</p>
          </>
        ) : null}
        <p>Taxa de entrega: R$ {Number(order.deliveryFee || 0).toFixed(2)}</p>
        <p>Subtotal: R$ {Number(order.subtotal).toFixed(2)}</p>
        <p>Total: R$ {Number(order.total).toFixed(2)}</p>
      </section>

      <section style={{ border: "1px solid #ddd", padding: 12 }}>
        <h2>Itens</h2>
        <div style={{ display: "grid", gap: 8 }}>
          {order.items.map((item) => (
            <div key={item.id} style={{ borderBottom: "1px solid #eee" }}>
              <strong>{item.snapshotDisplayName}</strong>
              <div>
                {Number(item.quantity)} {item.snapshotUnitLabel} x R${" "}
                {Number(item.priceAtTime).toFixed(2)} = R${" "}
                {Number(item.lineTotal).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ border: "1px solid #ddd", padding: 12 }}>
        <h2>Atualizar status</h2>
        <form action={updateStatusAction} style={{ display: "flex", gap: 8 }}>
          <input type="hidden" name="orderId" value={order.id} />
          <select name="status" defaultValue={order.status}>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {statusLabel[status]}
              </option>
            ))}
          </select>
          <button type="submit">Atualizar</button>
        </form>
      </section>

      <section style={{ border: "1px solid #ddd", padding: 12 }}>
        <h2>Cancelar pedido</h2>
        <form action={cancelOrderAction} style={{ display: "grid", gap: 8 }}>
          <input type="hidden" name="orderId" value={order.id} />
          <input
            name="cancellationReason"
            placeholder="Motivo do cancelamento"
          />
          <button type="submit">Cancelar pedido</button>
        </form>
      </section>

      <section style={{ border: "1px solid #ddd", padding: 12 }}>
        <h2>Auditoria</h2>
        {auditLogs.length === 0 ? (
          <p>Sem registros recentes.</p>
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
      </section>
    </main>
  );
}
