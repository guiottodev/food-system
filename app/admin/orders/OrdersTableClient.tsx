"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import styles from "../_styles/adminPrimitives.module.css";
import layoutStyles from "./orders.module.css";

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
  operationalTag?: string;
  operationalTagTone?: "warning" | "danger";
  deliveryDatetime: string;
  totalLabel: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  attention?: string[];
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
      <table className={`${styles.table} ${layoutStyles.ordersTable}`}>
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
                      className={`${layoutStyles.expandButton} ${
                        expanded ? layoutStyles.expandButtonActive : ""
                      }`}
                    >
                      <ChevronRight
                        size={16}
                        className={`${layoutStyles.expandIcon} ${
                          expanded ? layoutStyles.expandIconExpanded : ""
                        }`}
                      />
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
                    <div className={styles.clusterSm}>
                      <span
                        className={`${styles.badge} ${statusBadgeClass(
                          order.status
                        )}`}
                      >
                        {order.statusLabel}
                      </span>
                      {order.operationalTag ? (
                        <span
                          className={`${styles.badge} ${
                            order.operationalTagTone === "danger"
                              ? styles.badgeDanger
                              : styles.badgeWarning
                          }`}
                          title="Tag operacional do pedido"
                        >
                          {order.operationalTag}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td>{order.deliveryDatetime}</td>
                  <td className={styles.tableNumeric}>{order.totalLabel}</td>
                </tr>
                {expanded ? (
                  <tr className={styles.tableRowExpanded}>
                    <td colSpan={columns}>
                      <div className={styles.expandedContent}>
                        <div className={styles.expandedSection}>
                          <div className={styles.expandedSectionTitle}>Itens</div>
                          {order.items.length === 0 ? (
                            <p className={styles.textMuted}>Sem itens.</p>
                          ) : (
                            <div className={styles.expandedItemsList}>
                              {order.items.map((item) => (
                                <div key={item.id} className={styles.expandedItem}>
                                  <div className={styles.expandedItemName}>{item.name}</div>
                                  <div className={styles.expandedItemDetails}>
                                    <span>{item.quantity} {formatUnit(item)}</span>
                                    <span>×</span>
                                    <span>
                                      {item.priceAtTime !== null
                                        ? currencyFormatter.format(item.priceAtTime)
                                        : "-"}
                                    </span>
                                    <span>=</span>
                                    <strong>
                                      {item.lineTotal !== null
                                        ? currencyFormatter.format(item.lineTotal)
                                        : "-"}
                                    </strong>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className={styles.expandedSummary}>
                          <div className={styles.expandedSummaryRow}>
                            <span>Subtotal</span>
                            <span>{currencyFormatter.format(order.subtotal)}</span>
                          </div>
                          {order.deliveryFee > 0 ? (
                            <div className={styles.expandedSummaryRow}>
                              <span>Taxa de entrega</span>
                              <span>{currencyFormatter.format(order.deliveryFee)}</span>
                            </div>
                          ) : null}
                          <div className={styles.expandedSummaryTotal}>
                            <span>Total</span>
                            <strong>{currencyFormatter.format(order.total)}</strong>
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
