"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import styles from "../_styles/adminPrimitives.module.css";

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
  status: string;
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
  if (item.unitType === "KIT") return "kit";
  return "legacy";
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "ENTREGUE":
    case "PRONTO":
      return styles.badgeSuccess;
    case "EM_PRODUCAO":
      return styles.badgeWarning;
    case "CANCELADO":
      return styles.badgeDanger;
    default:
      return styles.badgeNeutral;
  }
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
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.tableIcon}></th>
            <th>N do pedido</th>
            <th>Cliente</th>
            <th>Metodo</th>
            <th>Status</th>
            <th>Entrega</th>
            <th className={styles.tableNumeric}>Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const expanded = expandedIds.has(order.id);
            return (
              <Fragment key={order.id}>
                <tr className={expanded ? styles.tableRowExpanded : undefined}>
                  <td className={styles.tableIcon}>
                    <button
                      type="button"
                      onClick={() => toggle(order.id)}
                      aria-expanded={expanded}
                      aria-label="Ver itens"
                      className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSm}`}
                    >
                      {expanded ? "▾" : "▸"}
                    </button>
                  </td>
                  <td>
                    <Link href={`/admin/orders/${order.id}`}>
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td>
                    {order.customerName}
                    {order.customerPhone ? ` (${order.customerPhone})` : ""}
                  </td>
                  <td>{order.deliveryMethodLabel}</td>
                  <td>
                    <span
                      className={`${styles.badge} ${statusBadgeClass(
                        order.status
                      )}`}
                    >
                      {order.statusLabel}
                    </span>
                  </td>
                  <td>{order.deliveryDatetime}</td>
                  <td className={styles.tableNumeric}>{order.totalLabel}</td>
                </tr>
                {expanded ? (
                  <tr className={styles.tableRowExpanded}>
                    <td colSpan={columns}>
                      <div className={styles.stackSm}>
                        <strong>Itens</strong>
                        {order.items.length === 0 ? (
                          <p className={styles.textMuted}>Sem itens.</p>
                        ) : (
                          <ul>
                            {order.items.map((item) => (
                              <li key={item.id}>
                                {item.name} - {item.quantity} {formatUnit(item)} -{" "}
                                {item.priceAtTime !== null
                                  ? `${currencyFormatter.format(
                                      item.priceAtTime
                                    )}/${formatUnit(item)}`
                                  : "-"} -{" "}
                                {item.lineTotal !== null
                                  ? currencyFormatter.format(item.lineTotal)
                                  : "-"}
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className={styles.stackSm}>
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
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
