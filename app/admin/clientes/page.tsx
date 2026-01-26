import Link from "next/link";
import { Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  buildCustomerListEntries,
  buildCustomerSearchFilter,
} from "@/lib/domain/customer";
import CustomersTable from "./CustomersTable.client";
import styles from "../_styles/adminPrimitives.module.css";
import layoutStyles from "./clientes.module.css";

type CustomersSearchParams = {
  q?: string;
};

export default async function CustomersPage({
  searchParams,
}: {
  searchParams?: Promise<CustomersSearchParams> | CustomersSearchParams;
}) {
  const sp = await Promise.resolve(searchParams);
  const query = (sp?.q ?? "").trim();

  const where = buildCustomerSearchFilter(query);

  const customers = await prisma.customer.findMany({
    where,
    include: {
      orders: {
        select: {
          deliveryDatetime: true,
        },
        orderBy: {
          deliveryDatetime: "desc",
        },
        take: 1,
      },
      _count: {
        select: { orders: true },
      },
    },
  });

  const entries = buildCustomerListEntries(customers);
  
  // KPIs
  const totalOrders = entries.reduce((sum, c) => sum + c.orderCount, 0);
  const activeCustomers = entries.filter((c) => c.orderCount > 0).length;

  return (
    <main className={styles.page}>
      <div className={layoutStyles.pageHeader}>
        <h1 className={styles.pageTitle}>Clientes</h1>
        <div className={layoutStyles.kpiBar}>
          <div className={layoutStyles.kpiItem}>
            <span className={layoutStyles.kpiValue}>{entries.length}</span>
            <span className={layoutStyles.kpiLabel}>clientes</span>
          </div>
          <div className={layoutStyles.kpiDivider} />
          <div className={layoutStyles.kpiItem}>
            <span className={layoutStyles.kpiValue}>{activeCustomers}</span>
            <span className={layoutStyles.kpiLabel}>com pedidos</span>
          </div>
          <div className={layoutStyles.kpiDivider} />
          <div className={layoutStyles.kpiItem}>
            <span className={layoutStyles.kpiValue}>{totalOrders}</span>
            <span className={layoutStyles.kpiLabel}>pedidos total</span>
          </div>
        </div>
      </div>

      <section className={styles.panel}>
        <div className={layoutStyles.toolbarBlock}>
          <div className={layoutStyles.toolbar}>
            <form method="get" className={layoutStyles.toolbarMain}>
              <div className={layoutStyles.searchWrap}>
                <Search size={18} className={layoutStyles.searchIcon} />
                <input
                  type="text"
                  name="q"
                  placeholder="Buscar por nome ou telefone"
                  defaultValue={query}
                  className={layoutStyles.searchInput}
                />
              </div>
              <button type="submit" className={layoutStyles.searchButton}>
                Buscar
              </button>
            </form>
            <Link
              href="/admin/clientes/novo"
              className={layoutStyles.primaryButton}
            >
              Novo cliente
            </Link>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className={layoutStyles.emptyState}>
            <div className={layoutStyles.emptyStateIcon}>👥</div>
            <div className={layoutStyles.emptyStateTitle}>Nenhum cliente encontrado</div>
            <div className={layoutStyles.emptyStateText}>
              Tente ajustar a busca ou cadastre um novo cliente.
            </div>
            <Link href="/admin/clientes/novo" className={layoutStyles.primaryButton}>
              Cadastrar cliente
            </Link>
          </div>
        ) : (
          <CustomersTable entries={entries} />
        )}
      </section>
    </main>
  );
}
