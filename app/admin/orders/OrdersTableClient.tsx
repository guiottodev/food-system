"use client";

import { Fragment, useState } from "react";
import Link from "next/link";

type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  unitLabel: string;
  unitType: string;
  priceAtTime: number | null;
  lineTotal: number | null;
};

type OrderRow = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string | null;
  deliveryMethodLabel: string;
  statusLabel: string;
  deliveryDatetime: string;
  totalLabel: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatUnit(item: OrderItem) {
  if (item.unitLabel) return item.unitLabel;
  if (item.unitType === "KG") return "kg";
  if (item.unitType === "CENTO") return "cento";
  if (item.unitType === "UNIDADE") return "un";
  return "legacy";
}

export default function OrdersTableClient({
  columns,
  orders,
}: {
  columns: number;
  orders: OrderRow[];
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggle(orderId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  }

  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        border: "1px solid #ddd",
      }}
    >
      <thead>
        <tr style={{ background: "#f7f7f7" }}>
          <th style={{ padding: 8, width: 40 }}></th>
          <th style={{ padding: 8, textAlign: "left" }}>Nº do pedido</th>
          <th style={{ padding: 8, textAlign: "left" }}>Cliente</th>
          <th style={{ padding: 8, textAlign: "left" }}>Método</th>
          <th style={{ padding: 8, textAlign: "left" }}>Status</th>
          <th style={{ padding: 8, textAlign: "left" }}>Entrega</th>
          <th style={{ padding: 8, textAlign: "right" }}>Total</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => {
          const expanded = expandedIds.has(order.id);
          return (
            <Fragment key={order.id}>
              <tr
                style={{
                  borderTop: "1px solid #eee",
                  background: expanded ? "#fbfbfb" : "transparent",
                }}
              >
                <td style={{ padding: 8 }}>
                  <button
                    type="button"
                    onClick={() => toggle(order.id)}
                    aria-expanded={expanded}
                    aria-label="Ver itens"
                  >
                    {expanded ? "▼" : "▶"}
                  </button>
                </td>
                <td style={{ padding: 8 }}>
                  <Link href={`/admin/orders/${order.id}`}>
                    {order.orderNumber}
                  </Link>
                </td>
                <td style={{ padding: 8 }}>
                  {order.customerName}
                  {order.customerPhone ? ` (${order.customerPhone})` : ""}
                </td>
                <td style={{ padding: 8 }}>{order.deliveryMethodLabel}</td>
                <td style={{ padding: 8 }}>{order.statusLabel}</td>
                <td style={{ padding: 8 }}>{order.deliveryDatetime}</td>
                <td style={{ padding: 8, textAlign: "right" }}>
                  {order.totalLabel}
                </td>
              </tr>
              {expanded ? (
                <tr>
                  <td colSpan={columns} style={{ padding: 12 }}>
                    <strong>Itens</strong>
                    {order.items.length === 0 ? (
                      <p>Sem itens.</p>
                    ) : (
                      <ul style={{ margin: "8px 0 0 16px" }}>
                        {order.items.map((item) => (
                          <li key={item.id}>
                            {item.name} — {item.quantity} {formatUnit(item)} —{" "}
                            {item.priceAtTime !== null
                              ? `${currencyFormatter.format(
                                  item.priceAtTime
                                )}/${formatUnit(item)}`
                              : "—"}{" "}
                            —{" "}
                            {item.lineTotal !== null
                              ? currencyFormatter.format(item.lineTotal)
                              : "—"}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div style={{ marginTop: 12 }}>
                      <div>
                        Subtotal: {currencyFormatter.format(order.subtotal)}
                      </div>
                      {order.deliveryFee > 0 ? (
                        <div>
                          Taxa de entrega:{" "}
                          {currencyFormatter.format(order.deliveryFee)}
                        </div>
                      ) : null}
                      <div>
                        Total: {currencyFormatter.format(order.total)}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : null}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
