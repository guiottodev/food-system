import { notFound } from "next/navigation";

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <h1>Design System Playground</h1>
      <p>
        Texto longo para leitura e escala: este paragrafo inclui numeros 123456
        7890 e datas 2026-01-13 para testar alinhamento e ritmo de texto.
      </p>

      <section style={{ marginTop: 32 }}>
        <h2>Typography</h2>
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
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Form</h2>
        <label htmlFor="input-normal">Input normal</label>
        <input id="input-normal" type="text" placeholder="Digite algo" />

        <label htmlFor="input-disabled" style={{ display: "block", marginTop: 12 }}>
          Input desabilitado
        </label>
        <input id="input-disabled" type="text" disabled value="Desabilitado" />

        <label htmlFor="input-readonly" style={{ display: "block", marginTop: 12 }}>
          Input readonly
        </label>
        <input id="input-readonly" type="text" readOnly value="Somente leitura" />

        <label htmlFor="input-required" style={{ display: "block", marginTop: 12 }}>
          Input requerido
        </label>
        <input id="input-required" type="text" required placeholder="Obrigatorio" />

        <label htmlFor="input-invalid" style={{ display: "block", marginTop: 12 }}>
          Email invalido (type=email)
        </label>
        <input
          id="input-invalid"
          type="email"
          value="email-invalido"
          aria-invalid="true"
          readOnly
        />

        <label htmlFor="select-basic" style={{ display: "block", marginTop: 12 }}>
          Select basico
        </label>
        <select id="select-basic" defaultValue="b">
          <option value="a">Opcao A</option>
          <option value="b">Opcao B</option>
          <option value="c">Opcao C</option>
        </select>

        <label htmlFor="textarea-basic" style={{ display: "block", marginTop: 12 }}>
          Textarea
        </label>
        <textarea id="textarea-basic" rows={3} placeholder="Descricao" />
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Buttons</h2>
        <button type="button">Botao primario</button>
        <button type="button" disabled style={{ marginLeft: 8 }}>
          Botao desabilitado
        </button>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Table</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th>Status</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>001</td>
              <td>Pedido A</td>
              <td>Ativo</td>
              <td>R$ 120,00</td>
            </tr>
            <tr>
              <td>002</td>
              <td>Pedido B</td>
              <td>Cancelado</td>
              <td>R$ 0,00</td>
            </tr>
          </tbody>
        </table>

        <h3 style={{ marginTop: 16 }}>Tabela com muitas colunas</h3>
        <table>
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
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>States</h2>
        <div style={{ border: "1px solid #ccc", padding: 12 }}>
          <strong>Empty state:</strong> Nenhum dado encontrado.
        </div>
        <div style={{ border: "1px solid #f5a623", padding: 12, marginTop: 12 }}>
          <strong>Error state:</strong> Algo deu errado. Tente novamente.
        </div>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Focus test</h2>
        <a href="/admin/orders">Link para pedidos</a>
        <input
          type="text"
          placeholder="Campo para tab"
          style={{ display: "block", marginTop: 8 }}
        />
        <button type="button" style={{ marginTop: 8 }}>
          Botao final
        </button>
      </section>
    </div>
  );
}
