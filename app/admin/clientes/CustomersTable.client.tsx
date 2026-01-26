"use client";

import DataTable from "../_components/DataTable";
import type { CustomerListEntry } from "@/lib/domain/customer";
import layoutStyles from "./clientes.module.css";

function formatDate(value?: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(value);
}

export default function CustomersTable({ entries }: { entries: CustomerListEntry[] }) {
  const columns = [
    {
      key: "name",
      header: "Nome",
      accessor: (row: CustomerListEntry) => (
        <span className={layoutStyles.customerName}>{row.name}</span>
      ),
      sortable: false,
      visible: true,
      mobilePriority: "high" as const,
      truncation: "ellipsis" as const,
    },
    {
      key: "phone",
      header: "Telefone",
      accessor: (row: CustomerListEntry) => (
        <span className={layoutStyles.customerPhone}>{row.phone}</span>
      ),
      sortable: false,
      visible: true,
      mobilePriority: "high" as const,
      numeric: true,
    },
    {
      key: "lastOrder",
      header: "Último pedido",
      accessor: (row: CustomerListEntry) => (
        <span className={layoutStyles.dateValue}>{formatDate(row.lastOrderDate)}</span>
      ),
      sortable: false,
      visible: true,
      mobilePriority: "high" as const,
    },
    {
      key: "orderCount",
      header: "Pedidos",
      accessor: (row: CustomerListEntry) => (
        <span className={layoutStyles.orderCount}>{row.orderCount}</span>
      ),
      align: "right" as const,
      sortable: false,
      visible: true,
      mobilePriority: "low" as const,
      numeric: true,
    },
  ];

  return (
    <div className={layoutStyles.tableContainer}>
      <DataTable
        columns={columns}
        data={entries}
        rowHref={(row) => `/admin/clientes/${row.id}`}
        density="comfortable"
        stickyHeader={true}
        sortable={false}
        tableId="customers-table"
      />
    </div>
  );
}
