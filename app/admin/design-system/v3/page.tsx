import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  ChevronRight,
  Clock,
  Filter,
  Plus,
  Printer,
  Search,
} from "lucide-react";
import base from "../../_styles/adminPrimitives.module.css";
import styles from "./designSystemV3.module.css";

export default function DesignSystemV3Page() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className={`${base.page} ${styles.page}`}>
      <header className={styles.topBar}>
        <div className={styles.brand}>Design System v3</div>
        <div className={styles.brandMeta}>Opcao B - Precision Grid</div>
        <nav className={styles.nav}>
          <Link href="/admin/design-system">v1</Link>
          <Link href="/admin/design-system/v2">v2</Link>
          <Link href="/admin/design-system/v3" aria-current="page">
            v3
          </Link>
          <Link href="/admin/design-system/v4">v4</Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <div>
          <h1 className={styles.heroTitle}>Operacao precisa, sem ruido</h1>
          <p className={styles.heroCopy}>
            Sistema com grade tecnica, tipografia enxuta e dados em primeiro
            plano. Ideal para dashboards extensos, listas longas e impressao
            organizada.
          </p>
        </div>
        <div className={styles.heroStats}>
          <div className={styles.statCard}>
            <span>Pedidos ativos</span>
            <strong>42</strong>
            <em>Hoje</em>
          </div>
          <div className={styles.statCard}>
            <span>Pendencias</span>
            <strong>6</strong>
            <em>Criticas</em>
          </div>
          <div className={styles.statCard}>
            <span>Producao</span>
            <strong>18</strong>
            <em>Itens</em>
          </div>
        </div>
      </section>

      <section className={styles.systemGrid}>
        <div className={styles.systemPanel}>
          <div className={styles.panelHeader}>Foundations</div>
          <div className={styles.paletteRow}>
            <div className={styles.swatch} data-tone="brand" />
            <div className={styles.swatch} data-tone="surface" />
            <div className={styles.swatch} data-tone="line" />
            <div className={styles.swatch} data-tone="alert" />
          </div>
          <div className={styles.typeList}>
            <div>
              <div className={styles.typeTitle}>Headline 24</div>
              <div className={styles.typeMeta}>Space Grotesk 600</div>
            </div>
            <div>
              <div className={styles.bodyText}>Texto principal 15/Regular</div>
              <div className={styles.typeMeta}>IBM Plex Sans 400</div>
            </div>
            <div className={styles.monoBlock}>
              2026-000013 | 24/01 20:00 | R$ 94,80
            </div>
          </div>
        </div>
        <div className={styles.systemPanel}>
          <div className={styles.panelHeader}>Componentes</div>
          <div className={styles.buttonRow}>
            <button className={styles.primaryBtn}>
              <Plus size={16} />
              Nova acao
            </button>
            <button className={styles.secondaryBtn}>Secundaria</button>
            <button className={styles.ghostBtn}>Ghost</button>
          </div>
          <div className={styles.badgeRow}>
            <span className={styles.badge}>Rascunho</span>
            <span className={`${styles.badge} ${styles.badgeWarn}`}>
              Atencao
            </span>
            <span className={`${styles.badge} ${styles.badgeOk}`}>OK</span>
          </div>
          <div className={styles.controlGrid}>
            <label>
              Buscar
              <div className={styles.controlField}>
                <Search size={16} />
                <input placeholder="Buscar cliente" />
              </div>
            </label>
            <label>
              Status
              <select className={styles.selectField} defaultValue="all">
                <option value="all">Todos</option>
                <option value="open">Abertos</option>
              </select>
            </label>
            <label className={styles.fullRow}>
              Observacoes
              <textarea className={styles.textareaField} rows={3} />
            </label>
          </div>
        </div>
      </section>

      <section className={styles.ordersSection}>
        <div className={styles.sectionTop}>
          <div>
            <h2>Orders board</h2>
            <p className={styles.sectionSub}>
              Grade modular para tabelas extensas, com foco em leitura.
            </p>
          </div>
          <button className={styles.ghostBtn}>
            <Printer size={16} />
            Print
          </button>
        </div>
        <div className={styles.ordersToolbar}>
          <div className={styles.controlField}>
            <Search size={16} />
            <input placeholder="Buscar por cliente ou telefone" />
          </div>
          <button className={styles.secondaryBtn}>
            <Filter size={16} />
            Filtros
          </button>
          <button className={styles.primaryBtn}>
            <Plus size={16} />
            Novo pedido
          </button>
        </div>
        <div className={styles.tableGrid}>
          <div className={`${styles.tableRow} ${styles.tableHeader}`}>
            <span>Pedido</span>
            <span>Cliente</span>
            <span>Status</span>
            <span>Entrega</span>
            <span>Total</span>
            <span>Detalhe</span>
          </div>
          <div className={styles.tableRow}>
            <span>2026-000011</span>
            <span>Robson</span>
            <span className={styles.badge}>Rascunho</span>
            <span>24/01 20:00</span>
            <span>R$ 94,80</span>
            <span className={styles.link}>Expandir</span>
          </div>
          <div className={styles.expandRow}>
            <div>
              <div className={styles.expandTitle}>Itens</div>
              <div>Bolo recheado simples 2 kg</div>
              <div className={styles.expandMeta}>Subtotal R$ 89,80</div>
            </div>
            <div>
              <div className={styles.expandTitle}>Entrega</div>
              <div>Retirada no local</div>
              <div className={styles.expandMeta}>Taxa R$ 5,00</div>
            </div>
            <div>
              <div className={styles.expandTitle}>Acoes</div>
              <div className={styles.inlineLink}>
                Ver detalhe <ChevronRight size={14} />
              </div>
            </div>
          </div>
          <div className={styles.tableRow}>
            <span>2026-000013</span>
            <span>Ana Maria</span>
            <span className={`${styles.badge} ${styles.badgeWarn}`}>
              Precisa produzir
            </span>
            <span>30/01 13:30</span>
            <span>R$ 93,90</span>
            <span className={styles.link}>Expandir</span>
          </div>
        </div>
        <div className={styles.footerMeta}>
          <div>
            <Calendar size={14} />
            Jan 23 - Jan 30
          </div>
          <div>
            <Clock size={14} />
            Atualizado ha 2 min
          </div>
        </div>
      </section>
    </main>
  );
}
