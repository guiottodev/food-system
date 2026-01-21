import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  buildCustomerListEntries,
  buildCustomerSearchFilter,
} from "@/lib/domain/customer";
import styles from "../_styles/adminPrimitives.module.css";
import layoutStyles from "./clientes.module.css";

type CustomersSearchParams = {
  q?: string;
};

function formatDate(value?: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(value);
}

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

  return (
    <main className={styles.page}>
      <h1 className={styles.pageTitle}>Clientes</h1>
      <section className={styles.panel}>
        <div className={layoutStyles.toolbarBlock}>
          <div className={layoutStyles.toolbar}>
            <form method="get" className={layoutStyles.toolbarMain}>
              <div className={layoutStyles.searchWrap}>
                <input
                  type="text"
                  name="q"
                  placeholder="Buscar por nome ou telefone"
                  defaultValue={query}
                  className={`${styles.control} ${layoutStyles.searchInput}`}
                />
              </div>
              <button type="submit" className={styles.button}>
                Buscar
              </button>
            </form>
            <Link
              href="/admin/clientes/novo"
              className={`${styles.button} ${styles.buttonPrimary}`}
            >
              Novo cliente
            </Link>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className={styles.emptyState}>Nenhum cliente encontrado.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Telefone</th>
                  <th>Ultimo pedido</th>
                  <th className={styles.tableNumeric}>#Pedidos</th>
                  <th className={styles.tableActions}>Acao</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.name}</td>
                    <td>{customer.phone}</td>
                    <td>{formatDate(customer.lastOrderDate)}</td>
                    <td className={styles.tableNumeric}>
                      {customer.orderCount}
                    </td>
                    <td className={styles.tableActions}>
                      <Link
                        href={`/admin/clientes/${customer.id}`}
                        className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSm}`}
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
