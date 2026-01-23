"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { ChevronDown, Truck, Package, ExternalLink } from "lucide-react";
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

  // Separar data e hora
  function parseDeliveryDateTime(datetime: string) {
    const parts = datetime.split(" ");
    if (parts.length >= 2) {
      return { date: parts[0], time: parts.slice(1).join(" ") };
    }
    return { date: datetime, time: "" };
  }

  return (
    <div className={layoutStyles.tableContainer}>
      <table className={layoutStyles.ordersTable}>
        <thead>
          <tr>
            <th className={layoutStyles.colExpand}></th>
            <th className={layoutStyles.colOrder}>Pedido</th>
            <th className={layoutStyles.colCustomer}>Cliente</th>
            <th className={layoutStyles.colMethod}>Método</th>
            <th className={layoutStyles.colStatus}>Status</th>
            <th className={layoutStyles.colDate}>Entrega</th>
            <th className={layoutStyles.colTotal}>Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, index) => {
            const expanded = expandedIds.has(order.id);
            const { date, time } = parseDeliveryDateTime(order.deliveryDatetime);
            const isEntrega = order.deliveryMethodLabel === "Entrega";
            
            return (
              <Fragment key={order.id}>
                <tr 
                  className={`${layoutStyles.orderRow} ${
                    expanded ? layoutStyles.orderRowExpanded : ""
                  } ${index % 2 === 1 ? layoutStyles.orderRowAlt : ""}`}
                >
                  <td className={layoutStyles.cellExpand}>
                    <button
                      type="button"
                      onClick={() => toggle(order.id)}
                      aria-expanded={expanded}
                      aria-label="Ver itens"
                      className={layoutStyles.expandButton}
                    >
                      <ChevronDown
                        size={18}
                        className={`${layoutStyles.expandIcon} ${
                          expanded ? layoutStyles.expandIconExpanded : ""
                        }`}
                      />
                    </button>
                  </td>
                  <td className={layoutStyles.cellOrder}>
                    <Link 
                      href={`/admin/orders/${order.id}`}
                      className={layoutStyles.orderNumber}
                    >
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className={layoutStyles.cellCustomer}>
                    <div className={layoutStyles.customerInfo}>
                      <span className={layoutStyles.customerName}>{order.customerName}</span>
                      {order.customerPhone && (
                        <span className={layoutStyles.customerPhone}>{order.customerPhone}</span>
                      )}
                    </div>
                  </td>
                  <td className={layoutStyles.cellMethod}>
                    <div className={layoutStyles.methodBadge} title={order.deliveryMethodLabel}>
                      {isEntrega ? <Truck size={16} /> : <Package size={16} />}
                      <span className={layoutStyles.methodLabel}>{isEntrega ? "Entrega" : "Retirada"}</span>
                    </div>
                  </td>
                  <td className={layoutStyles.cellStatus}>
                    <div className={layoutStyles.statusGroup}>
                      <span className={`${layoutStyles.statusBadge} ${layoutStyles[`status${order.status}`]}`}>
                        {order.statusLabel}
                      </span>
                      {order.operationalTag && (
                        <span
                          className={`${layoutStyles.operationalBadge} ${
                            order.operationalTagTone === "danger"
                              ? layoutStyles.operationalDanger
                              : layoutStyles.operationalWarning
                          }`}
                        >
                          {order.operationalTag}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={layoutStyles.cellDate}>
                    <div className={layoutStyles.dateInfo}>
                      <span className={layoutStyles.dateMain}>{date}</span>
                      {time && <span className={layoutStyles.dateTime}>{time}</span>}
                    </div>
                  </td>
                  <td className={layoutStyles.cellTotal}>
                    <span className={layoutStyles.totalValue}>{order.totalLabel}</span>
                  </td>
                </tr>
                {expanded && (
                  <tr className={layoutStyles.expandedRow}>
                    <td colSpan={columns}>
                      <div className={layoutStyles.expandedWrapper}>
                        <div className={layoutStyles.expandedCard}>
                          <div className={layoutStyles.expandedMain}>
                            <div className={layoutStyles.expandedHeader}>
                              <h4 className={layoutStyles.expandedTitle}>Itens do Pedido</h4>
                              <span className={layoutStyles.itemCount}>{order.items.length} {order.items.length === 1 ? "item" : "itens"}</span>
                            </div>
                            {order.items.length === 0 ? (
                              <p className={layoutStyles.noItems}>Nenhum item adicionado.</p>
                            ) : (
                              <div className={layoutStyles.itemsList}>
                                {order.items.map((item) => (
                                  <div key={item.id} className={layoutStyles.itemRow}>
                                    <div className={layoutStyles.itemInfo}>
                                      <span className={layoutStyles.itemName}>{item.name}</span>
                                      <span className={layoutStyles.itemQty}>
                                        {item.quantity} {formatUnit(item)}
                                      </span>
                                    </div>
                                    <div className={layoutStyles.itemPrice}>
                                      <span className={layoutStyles.itemUnitPrice}>
                                        {item.priceAtTime !== null
                                          ? currencyFormatter.format(item.priceAtTime)
                                          : "-"}
                                      </span>
                                      <span className={layoutStyles.itemTotal}>
                                        {item.lineTotal !== null
                                          ? currencyFormatter.format(item.lineTotal)
                                          : "-"}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className={layoutStyles.expandedSidebar}>
                            <div className={layoutStyles.summaryCard}>
                              <div className={layoutStyles.summaryRow}>
                                <span>Subtotal</span>
                                <span>{currencyFormatter.format(order.subtotal)}</span>
                              </div>
                              {order.deliveryFee > 0 && (
                                <div className={layoutStyles.summaryRow}>
                                  <span>Taxa de entrega</span>
                                  <span>{currencyFormatter.format(order.deliveryFee)}</span>
                                </div>
                              )}
                              <div className={layoutStyles.summaryTotal}>
                                <span>Total</span>
                                <strong>{currencyFormatter.format(order.total)}</strong>
                              </div>
                            </div>
                            <Link 
                              href={`/admin/orders/${order.id}`}
                              className={layoutStyles.detailsLink}
                            >
                              <span>Ver detalhes</span>
                              <ExternalLink size={14} />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
