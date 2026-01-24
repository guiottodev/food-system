import Link from "next/link";
import { createCustomerAction } from "./actions";
import styles from "../../_styles/adminPrimitives.module.css";
import { InlineNotice } from "../../design-system/InlineNotice.client";

type CustomersNewSearchParams = {
  error?: string;
  existingId?: string;
};

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams?: Promise<CustomersNewSearchParams> | CustomersNewSearchParams;
}) {
  const sp = await Promise.resolve(searchParams);
  const error = sp?.error;
  const existingId = sp?.existingId;

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

  const showDuplicate = error === "duplicado" && existingId;

  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Novo cliente</h1>
        <Link href="/admin/clientes">Voltar</Link>
      </div>

      {errorMessage ? <p className={styles.textError}>{errorMessage}</p> : null}

      {showDuplicate ? (
        <InlineNotice
          tone="warning"
          dismissAfterMs={0}
          clearQueryKeys={["error", "existingId"]}
        >
          Telefone ja cadastrado.{" "}
          <Link href={`/admin/clientes/${existingId}`}>
            Abrir cliente existente
          </Link>
        </InlineNotice>
      ) : null}

      <form action={createCustomerAction} className={styles.stackMd}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Dados</h2>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Nome</span>
                <input
                  type="text"
                  name="name"
                  required
                  className={styles.control}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Telefone</span>
                <input
                  type="text"
                  name="phone"
                  required
                  className={styles.control}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Documento</span>
                <input
                  type="text"
                  name="document"
                  className={styles.control}
                />
              </label>
            </div>
          </div>
        </section>

        <section className={`${styles.panel} ${styles.panelSecondary}`}>
          <div className={styles.panelHeader}>
            <h2>Endereco (opcional)</h2>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>CEP</span>
                <input type="text" name="addressCep" className={styles.control} />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Rua</span>
                <input type="text" name="addressStreet" className={styles.control} />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Numero</span>
                <input type="text" name="addressNumber" className={styles.control} />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Complemento</span>
                <input
                  type="text"
                  name="addressComplement"
                  className={styles.control}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Bairro</span>
                <input
                  type="text"
                  name="addressNeighborhood"
                  className={styles.control}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Cidade</span>
                <input type="text" name="addressCity" className={styles.control} />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Estado</span>
                <input type="text" name="addressState" className={styles.control} />
              </label>
            </div>
          </div>
        </section>

        <button type="submit" className={`${styles.button} ${styles.buttonPrimary}`}>
          Salvar cliente
        </button>
      </form>
    </main>
  );
}
