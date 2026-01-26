"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Truck, Package } from "lucide-react";
import DataTable from "../_components/DataTable";
import Chip from "../_components/Chip";
import type { OrderStatus } from "@prisma/client";
import type { AttentionReason } from "@/lib/domain/attention";
import layoutStyles from "./orders.module.css";

const STATUS_LABELS: Record<OrderStatus, string> = {
  RASCUNHO: "Rascunho",
  CONFIRMADO: "Confirmado",
  EM_PRODUCAO: "Em Produção",
  PRONTO: "Pronto",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};

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
  status: OrderStatus;
  statusLabel: string;
  deliveryDatetime: string;
  totalLabel: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  attention: {
    strongReasons: AttentionReason[];
    weakReasons: AttentionReason[];
  };
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatUnit(item: OrderItem) {
  if (item.unitLabel) return item.unitLabel;
  if (item.unitType === "KG") return "kg";
  if (item.unitType === "UNIDADE") return "un";
  return "legacy";
}

function parseDeliveryDateTime(datetime: string) {
  const parts = datetime.split(" ");
  if (parts.length >= 2) {
    return { date: parts[0], time: parts.slice(1).join(" ") };
  }
  return { date: datetime, time: "" };
}

export default function OrdersTableClient({
  orders,
  sort,
  dir,
}: {
  orders: OrderRow[];
  sort?: string;
  dir?: "asc" | "desc";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSort = (column: string, direction: "asc" | "desc") => {
    const params = new URLSearchParams(searchParams.toString());
    if (column === "delivery") {
      params.set("sort", direction === "desc" ? "delivery_desc" : "delivery_asc");
    } else if (column === "orderNumber") {
      params.set("sort", "created_desc");
    } else {
      params.delete("sort");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const columns = [
    {
      key: "orderNumber",
      header: "Pedido",
      accessor: (row: OrderRow) => {
        const alerts = [...row.attention.strongReasons, ...row.attention.weakReasons];
        return (
          <div className={layoutStyles.orderCell}>
            <span className={layoutStyles.orderNumberCell}>{row.orderNumber}</span>
            {alerts.length > 0 && (
              <div className={layoutStyles.orderAlertLabels}>
                {row.attention.strongReasons.map((r, idx) => (
                  <Chip key={`s-${idx}`} variant="attention-strong" label={r.label} density="compact" />
                ))}
                {row.attention.weakReasons.map((r, idx) => (
                  <Chip key={`w-${idx}`} variant="attention-weak" label={r.label} density="compact" />
                ))}
              </div>
            )}
          </div>
        );
      },
      sortable: true,
      visible: true,
    },
    {
      key: "customer",
      header: "Cliente",
      accessor: (row: OrderRow) => (
        <div className={layoutStyles.customerInfo}>
          <span className={layoutStyles.customerName}>{row.customerName}</span>
          {row.customerPhone && (
            <span className={layoutStyles.customerPhone}>{row.customerPhone}</span>
          )}
        </div>
      ),
      sortable: false,
      visible: true,
      mobilePriority: "high" as const,
      truncation: "ellipsis" as const,
    },
    {
      key: "method",
      header: "Método",
      accessor: (row: OrderRow) => {
        const isEntrega = row.deliveryMethodLabel === "Entrega";
        return (
          <div className={layoutStyles.methodBadge} title={row.deliveryMethodLabel}>
            {isEntrega ? <Truck size={16} /> : <Package size={16} />}
            <span className={layoutStyles.methodLabel}>
              {isEntrega ? "Entrega" : "Retirada"}
            </span>
          </div>
        );
      },
      sortable: false,
      visible: true,
      mobilePriority: "low" as const,
    },
    {
      key: "status",
      header: "Status",
      accessor: (row: OrderRow) => (
        <Chip variant="status" status={row.status} label={STATUS_LABELS[row.status]} density="comfortable" />
      ),
      sortable: true,
      visible: true,
      mobilePriority: "high" as const,
    },
    {
      key: "delivery",
      header: "Entrega",
      accessor: (row: OrderRow) => {
        const { date, time } = parseDeliveryDateTime(row.deliveryDatetime);
        return (
          <div className={layoutStyles.dateInfo}>
            <span className={layoutStyles.dateMain}>{date}</span>
            {time && <span className={layoutStyles.dateTime}>{time}</span>}
          </div>
        );
      },
      sortable: true,
      visible: true,
      mobilePriority: "high" as const,
    },
    {
      key: "total",
      header: "Total",
      accessor: (row: OrderRow) => (
        <span className={layoutStyles.totalValue}>{row.totalLabel}</span>
      ),
      align: "right" as const,
      sortable: false,
      visible: true,
      mobilePriority: "low" as const,
      numeric: true,
    },
  ];

  return (
    <div className={layoutStyles.tableWrapper}>
      <DataTable
        columns={columns}
        data={orders}
        rowHref={(row) => `/admin/orders/${row.id}`}
        expandRenderer={(row) => (
          <div className={layoutStyles.expandedContent}>
            <div className={layoutStyles.expandedMain}>
              <div className={layoutStyles.expandedHeader}>
                <h4 className={layoutStyles.expandedTitle}>Itens do Pedido</h4>
                <span className={layoutStyles.itemCount}>
                  {row.items.length} {row.items.length === 1 ? "item" : "itens"}
                </span>
              </div>
              {row.items.length === 0 ? (
                <p className={layoutStyles.noItems}>Nenhum item adicionado.</p>
              ) : (
                <div className={layoutStyles.itemsList}>
                  {row.items.map((item) => (
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
                  <span>{currencyFormatter.format(row.subtotal)}</span>
                </div>
                {row.deliveryFee > 0 && (
                  <div className={layoutStyles.summaryRow}>
                    <span>Taxa de entrega</span>
                    <span>{currencyFormatter.format(row.deliveryFee)}</span>
                  </div>
                )}
                <div className={layoutStyles.summaryTotal}>
                  <span>Total</span>
                  <strong>{currencyFormatter.format(row.total)}</strong>
                </div>
              </div>
            </div>
          </div>
        )}
        density="comfortable"
        stickyHeader={true}
        sortable={true}
        onSort={handleSort}
        sortColumn={sort === "delivery_asc" || sort === "delivery_desc" ? "delivery" : sort === "created_desc" ? "orderNumber" : undefined}
        sortDirection={sort === "delivery_desc" || sort === "created_desc" ? "desc" : "asc"}
        tableId="orders-table"
      />
    </div>
  );
}
