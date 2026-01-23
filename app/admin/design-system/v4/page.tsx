import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Filter, Plus, Printer, Search } from "lucide-react";
import base from "../../_styles/adminPrimitives.module.css";
import styles from "./designSystemV4.module.css";

export default function DesignSystemV4Page() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className={`${base.page} ${styles.page}`}>
      <header className={styles.topBar}>
        <div>
          <div className={styles.title}>Design System v4</div>
          <div className={styles.subtitle}>Opcao C - Bold Studio</div>
        </div>
        <nav className={styles.nav}>
          <Link href="/admin/design-system">v1</Link>
          <Link href="/admin/design-system/v2">v2</Link>
          <Link href="/admin/design-system/v3">v3</Link>
          <Link href="/admin/design-system/v4" aria-current="page">
            v4
          </Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroBlock}>
          <div className={styles.heroBadge}>Operacao viva</div>
          <h1>Clareza agressiva, energia de producao</h1>
          <p>
            Um visual direto, com bordas grossas, cores vibrantes e muito
            contraste. Excelente para telas longas, blocos expansivos e
            impressao com personalidade.
          </p>
          <div className={styles.heroActions}>
            <button className={styles.primaryBtn}>
              <Plus size={18} />
              Novo pedido
            </button>
            <button className={styles.outlineBtn}>Ver playbook</button>
          </div>
        </div>
        <div className={styles.heroStack}>
          <div className={styles.kpiCard}>
            <span>Pedidos hoje</span>
            <strong>28</strong>
          </div>
          <div className={styles.kpiCard}>
            <span>Pendencias</span>
            <strong>4</strong>
          </div>
          <div className={styles.kpiCard}>
            <span>Producao</span>
            <strong>11 itens</strong>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Fundacoes & ritmo</div>
        <div className={styles.foundationRow}>
          <div className={styles.colorTile} data-tone="brand" />
          <div className={styles.colorTile} data-tone="lime" />
          <div className={styles.colorTile} data-tone="ink" />
          <div className={styles.colorTile} data-tone="paper" />
        </div>
        <div className={styles.foundationGrid}>
          <div className={styles.infoCard}>
            <div className={styles.infoTitle}>Headline 32</div>
            <div className={styles.infoMeta}>Archivo Black / Bold</div>
          </div>
          <div className={styles.infoCard}>
            <div className={styles.infoTitle}>Body 16</div>
            <div className={styles.infoMeta}>Space Grotesk / Regular</div>
          </div>
          <div className={styles.infoCard}>
            <div className={styles.infoTitle}>Radius 14</div>
            <div className={styles.infoMeta}>Bordas com impacto</div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Orders playground</h2>
            <p>Layout modular com linhas fortes e detalhes expandidos.</p>
          </div>
          <button className={styles.outlineBtn}>
            <Printer size={16} />
            Print
          </button>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.searchField}>
            <Search size={16} />
            <input placeholder="Buscar por cliente" />
          </div>
          <button className={styles.outlineBtn}>
            <Filter size={16} />
            Filtros
          </button>
          <button className={styles.primaryBtn}>
            <Plus size={16} />
            Novo pedido
          </button>
        </div>
        <div className={styles.orderGrid}>
          <div className={styles.orderRow}>
            <div>
              <div className={styles.orderId}>2026-000011</div>
              <div className={styles.orderMeta}>Robson - Retirada</div>
            </div>
            <div>
              <span className={styles.tag}>Rascunho</span>
            </div>
            <div className={styles.orderTotal}>R$ 94,80</div>
          </div>
          <div className={styles.orderExpand}>
            <div>
              <div className={styles.expandTitle}>Itens</div>
              <div>Bolo recheado simples 2 kg</div>
              <div className={styles.expandMeta}>Subtotal R$ 89,80</div>
            </div>
            <div>
              <div className={styles.expandTitle}>Entrega</div>
              <div>24/01 20:00</div>
              <div className={styles.expandMeta}>Taxa R$ 5,00</div>
            </div>
          </div>
          <div className={styles.orderRow}>
            <div>
              <div className={styles.orderId}>2026-000010</div>
              <div className={styles.orderMeta}>Guilherme - Entrega</div>
            </div>
            <div>
              <span className={`${styles.tag} ${styles.tagWarn}`}>
                Precisa produzir
              </span>
            </div>
            <div className={styles.orderTotal}>R$ 244,55</div>
          </div>
        </div>
      </section>

      <section className={styles.sectionSplit}>
        <div className={styles.cardStack}>
          <div className={styles.actionCard}>
            <div className={styles.cardTitle}>Acoes</div>
            <button className={styles.primaryBtn}>Confirmar pedido</button>
            <button className={styles.outlineBtn}>Editar detalhes</button>
          </div>
          <div className={styles.actionCard}>
            <div className={styles.cardTitle}>Alertas</div>
            <span className={styles.tag}>Sem pendencias</span>
            <div className={styles.inlineOk}>
              <CheckCircle2 size={16} />
              Operacao ok
            </div>
          </div>
        </div>
        <div className={styles.printCard}>
          <div className={styles.printHeader}>Print ticket</div>
          <div className={styles.printBody}>
            <div className={styles.printLine}>Pedido 2026-000011</div>
            <div className={styles.printLine}>Robson - Retirada</div>
            <div className={styles.printDivider} />
            <div className={styles.printLine}>Bolo recheado 2 kg</div>
            <div className={styles.printLine}>Total R$ 94,80</div>
          </div>
        </div>
      </section>
    </main>
  );
}
