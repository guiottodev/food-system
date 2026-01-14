import { notFound } from "next/navigation";
import styles from "../_styles/adminPrimitives.module.css";

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className={styles.page}>
      <div className={styles.stackSm}>
        <h1 className={styles.pageTitle}>Design System Playground</h1>
        <p>
          Texto longo para leitura e escala: este paragrafo inclui numeros 123456
          7890 e datas 2026-01-13 para testar alinhamento e ritmo de texto.
        </p>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Typography</h2>
        </div>
        <div className={styles.panelBody}>
          <h1>Heading 1 - Titulo Principal</h1>
          <h2>Heading 2 - Secao</h2>
          <h3>Heading 3 - Subsecao</h3>
          <p>
            Paragrafo padrao com texto longo: Lorem ipsum dolor sit amet,
            consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut
            labore et dolore magna aliqua.
          </p>
          <p>
            Outro paragrafo com numeros: 10, 20, 30, 40, 50 e percentuais 12%,
            45%, 99%.
          </p>
          <a href="/admin">Link de exemplo para o painel</a>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Form</h2>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.formSection}>
            <label className={styles.field} htmlFor="input-normal">
              Input normal
              <input id="input-normal" type="text" placeholder="Digite algo" />
            </label>
            <label className={styles.field} htmlFor="input-disabled">
              Input desabilitado
              <input
                id="input-disabled"
                type="text"
                disabled
                value="Desabilitado"
              />
            </label>
            <label className={styles.field} htmlFor="input-readonly">
              Input readonly
              <input
                id="input-readonly"
                type="text"
                readOnly
                value="Somente leitura"
              />
            </label>
            <label className={styles.field} htmlFor="input-required">
              Input requerido
              <input
                id="input-required"
                type="text"
                required
                placeholder="Obrigatorio"
              />
            </label>
            <label className={styles.field} htmlFor="input-invalid">
              Email invalido (type=email)
              <input
                id="input-invalid"
                type="email"
                value="email-invalido"
                aria-invalid="true"
                readOnly
              />
            </label>
            <label className={styles.field} htmlFor="select-basic">
              Select basico
              <select id="select-basic" defaultValue="b">
                <option value="a">Opcao A</option>
                <option value="b">Opcao B</option>
                <option value="c">Opcao C</option>
              </select>
            </label>
            <label className={styles.field} htmlFor="textarea-basic">
              Textarea
              <textarea id="textarea-basic" rows={3} placeholder="Descricao" />
            </label>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Buttons</h2>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.clusterSm}>
            <button type="button">Botao primario</button>
            <button type="button" disabled>
              Botao desabilitado
            </button>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Table</h2>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Status</th>
                  <th className={styles.tableNumeric}>Valor</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>001</td>
                  <td>Pedido A</td>
                  <td>Ativo</td>
                  <td className={styles.tableNumeric}>R$ 120,00</td>
                </tr>
                <tr>
                  <td>002</td>
                  <td>Pedido B</td>
                  <td>Cancelado</td>
                  <td className={styles.tableNumeric}>R$ 0,00</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className={styles.stackSm}>
            <h3>Tabela com muitas colunas</h3>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Col 1</th>
                    <th>Col 2</th>
                    <th>Col 3</th>
                    <th>Col 4</th>
                    <th>Col 5</th>
                    <th>Col 6</th>
                    <th>Col 7</th>
                    <th>Col 8</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>A</td>
                    <td>B</td>
                    <td>C</td>
                    <td>D</td>
                    <td>E</td>
                    <td>F</td>
                    <td>G</td>
                    <td>H</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>States</h2>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.notice}>
            <strong>Empty state:</strong> Nenhum dado encontrado.
          </div>
          <div className={`${styles.notice} ${styles.noticeWarning}`}>
            <strong>Error state:</strong> Algo deu errado. Tente novamente.
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Focus test</h2>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.stackSm}>
            <a href="/admin/orders">Link para pedidos</a>
            <input type="text" placeholder="Campo para tab" />
            <button type="button">Botao final</button>
          </div>
        </div>
      </section>
    </main>
  );
}
