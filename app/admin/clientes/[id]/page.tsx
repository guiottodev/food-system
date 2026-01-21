import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCustomerOrders } from "@/lib/domain/customer";
import CustomerTabs from "../CustomerTabs";
import { updateCustomerAction } from "./actions";
import styles from "../../_styles/adminPrimitives.module.css";
import detailStyles from "../customerDetail.module.css";

type CustomerSearchParams = {
  tab?: string;
  error?: string;
  saved?: string;
  created?: string;
  existingId?: string;
};

const statusLabel: Record<string, string> = {
  RASCUNHO: "Rascunho",
  CONFIRMADO: "Confirmado",
  EM_PRODUCAO: "Em producao",
  PRONTO: "Pronto",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};

function formatDate(value?: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }> | { id: string };
  searchParams?: Promise<CustomerSearchParams> | CustomerSearchParams;
}) {
  const p = await Promise.resolve(params);
  const sp = await Promise.resolve(searchParams);
  const customerId = p?.id;
  const tab = sp?.tab;
  const error = sp?.error;
  const existingId = sp?.existingId;

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    return (
      <main className={`${styles.page} ${styles.stackSm}`}>
        <p>Cliente nao encontrado.</p>
        <Link href="/admin/clientes">Voltar</Link>
      </main>
    );
  }

  const activeTab = tab === "pedidos" ? "pedidos" : "dados";
  const orders =
    activeTab === "pedidos"
      ? await getCustomerOrders(prisma, customer.id, 20)
      : [];

  let errorMessage = "";
  if (error === "name_required") {
    errorMessage = "Informe o nome do cliente.";
  }
  if (error === "phone_required") {
    errorMessage = "Informe o telefone do cliente.";
  }
  if (error === "phone_invalid") {
    errorMessage = "Informe um telefone valido.";
  }
  if (error === "duplicado") {
    errorMessage = "Telefone ja cadastrado.";
  }

  const showDuplicate = error === "duplicado" && existingId;

  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Cliente: {customer.name}</h1>
        <Link href="/admin/clientes">Voltar</Link>
      </div>

      {sp?.created ? (
        <div className={styles.notice}>Cliente criado.</div>
      ) : null}
      {sp?.saved ? <div className={styles.notice}>Dados salvos.</div> : null}
      {errorMessage ? <p className={styles.textError}>{errorMessage}</p> : null}
      {showDuplicate ? (
        <div className={styles.notice}>
          Telefone ja cadastrado.{" "}
          <Link href={`/admin/clientes/${existingId}`}>
            Abrir cliente existente
          </Link>
        </div>
      ) : null}

      <CustomerTabs activeTab={activeTab} customerId={customer.id} />

      {activeTab === "dados" ? (
        <section className={`${styles.panel} ${detailStyles.tabPanel}`}>
          <div className={styles.panelHeader}>
            <h2>Dados</h2>
          </div>
          <div className={styles.panelBody}>
            <form action={updateCustomerAction} className={styles.stackMd}>
              <input type="hidden" name="id" value={customer.id} />
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Nome</span>
                  <input
                    type="text"
                    name="name"
                    defaultValue={customer.name}
                    required
                    className={styles.control}
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Telefone</span>
                  <input
                    type="text"
                    name="phone"
                    defaultValue={customer.phone}
                    required
                    className={styles.control}
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Documento</span>
                  <input
                    type="text"
                    name="document"
                    defaultValue={customer.document ?? ""}
                    className={styles.control}
                  />
                </label>
              </div>

              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h3>Endereco (opcional)</h3>
                </div>
                <div className={styles.panelBody}>
                  <div className={styles.formGrid}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>CEP</span>
                      <input
                        type="text"
                        name="addressCep"
                        defaultValue={customer.addressCep ?? ""}
                        className={styles.control}
                      />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Rua</span>
                      <input
                        type="text"
                        name="addressStreet"
                        defaultValue={customer.addressStreet ?? ""}
                        className={styles.control}
                      />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Numero</span>
                      <input
                        type="text"
                        name="addressNumber"
                        defaultValue={customer.addressNumber ?? ""}
                        className={styles.control}
                      />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Complemento</span>
                      <input
                        type="text"
                        name="addressComplement"
                        defaultValue={customer.addressComplement ?? ""}
                        className={styles.control}
                      />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Bairro</span>
                      <input
                        type="text"
                        name="addressNeighborhood"
                        defaultValue={customer.addressNeighborhood ?? ""}
                        className={styles.control}
                      />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Cidade</span>
                      <input
                        type="text"
                        name="addressCity"
                        defaultValue={customer.addressCity ?? ""}
                        className={styles.control}
                      />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Estado</span>
                      <input
                        type="text"
                        name="addressState"
                        defaultValue={customer.addressState ?? ""}
                        className={styles.control}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <button type="submit" className={`${styles.button} ${styles.buttonPrimary}`}>
                Salvar
              </button>
            </form>
          </div>
        </section>
      ) : null}

      {activeTab === "pedidos" ? (
        <section className={`${styles.panel} ${detailStyles.tabPanel}`}>
          <div className={styles.panelHeader}>
            <h2>Pedidos</h2>
          </div>
          <div className={styles.panelBody}>
            {orders.length === 0 ? (
              <div className={styles.emptyState}>Cliente sem pedidos.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Entrega</th>
                      <th>Status</th>
                      <th className={styles.tableNumeric}>Total</th>
                      <th className={styles.tableActions}>Pedido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td>{formatDate(order.deliveryDatetime)}</td>
                        <td>{statusLabel[order.status] ?? order.status}</td>
                        <td className={styles.tableNumeric}>
                          {formatCurrency(Number(order.total))}
                        </td>
                        <td className={styles.tableActions}>
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSm}`}
                          >
                            Ver pedido
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      ) : null}
    </main>
  );
}
