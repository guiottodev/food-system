import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Filter,
  Plus,
  Printer,
  Search,
  Sparkles,
} from "lucide-react";
import base from "../../_styles/adminPrimitives.module.css";
import styles from "./designSystemV2.module.css";

export default function DesignSystemV2Page() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className={`${base.page} ${styles.page}`}>
      <header className={styles.topNav}>
        <div className={styles.brand}>
          <div className={styles.brandTitle}>Design System v2</div>
          <div className={styles.brandSub}>Opcao A - Atelier Warm</div>
        </div>
        <nav className={styles.versionNav}>
          <Link href="/admin/design-system">v1</Link>
          <Link href="/admin/design-system/v2" aria-current="page">
            v2
          </Link>
          <Link href="/admin/design-system/v3">v3</Link>
          <Link href="/admin/design-system/v4">v4</Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.eyebrow}>
            <Sparkles size={16} />
            Identidade calorosa e operacional
          </div>
          <h1 className={styles.display}>Calma visual para dias cheios</h1>
          <p className={styles.lede}>
            Uma linguagem editorial com texturas suaves, tons terrosos e
            hierarquia clara para leitura rapida. Pensada para telas extensas de
            pedidos e impressao consistente.
          </p>
          <div className={styles.actionRow}>
            <button className={styles.primaryButton}>
              <Plus size={18} />
              Novo pedido
            </button>
            <button className={styles.secondaryButton}>Ver guia</button>
            <button className={styles.ghostButton}>
              Explorar UI <ArrowRight size={16} />
            </button>
          </div>
          <div className={styles.metaStrip}>
            <div>
              <div className={styles.metaLabel}>Tom</div>
              <div className={styles.metaValue}>Humano, artesanal</div>
            </div>
            <div>
              <div className={styles.metaLabel}>Uso</div>
              <div className={styles.metaValue}>Operacao diaria</div>
            </div>
            <div>
              <div className={styles.metaLabel}>Ritmo</div>
              <div className={styles.metaValue}>Calmo, previsivel</div>
            </div>
          </div>
        </div>
        <div className={styles.heroPanel}>
          <div className={styles.panelBadge}>Resumo do dia</div>
          <div className={styles.panelMetric}>12 pedidos</div>
          <div className={styles.panelRow}>
            <span>Pendencias fortes</span>
            <strong>3</strong>
          </div>
          <div className={styles.panelRow}>
            <span>Producao aberta</span>
            <strong>5 itens</strong>
          </div>
          <div className={styles.panelFoot}>
            <CheckCircle2 size={16} />
            Operacao fluindo
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Fundacoes</h2>
          <span className={styles.sectionHint}>Tons quentes + textura de papel</span>
        </div>
        <div className={styles.foundationGrid}>
          <div className={styles.paletteCard}>
            <div className={styles.paletteTitle}>Cores principais</div>
            <div className={styles.paletteGrid}>
              <div className={styles.swatch} data-tone="brand" />
              <div className={styles.swatch} data-tone="ink" />
              <div className={styles.swatch} data-tone="olive" />
              <div className={styles.swatch} data-tone="sun" />
            </div>
            <div className={styles.paletteMeta}>
              Brand terracota, neutros de papel e acentos oliva.
            </div>
          </div>
          <div className={styles.typeCard}>
            <div className={styles.paletteTitle}>Tipografia</div>
            <div className={styles.typeSample}>
              <span className={styles.displaySmall}>Titulo editorial</span>
              <span className={styles.typeMeta}>Fraunces 28 / Semibold</span>
            </div>
            <div className={styles.typeSample}>
              <span className={styles.bodySample}>
                Texto curto para operacao rapida. 1234567890
              </span>
              <span className={styles.typeMeta}>Sora 16 / Regular</span>
            </div>
          </div>
          <div className={styles.spacingCard}>
            <div className={styles.paletteTitle}>Espacamento</div>
            <div className={styles.spacingRow}>
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className={styles.radiusRow}>
              <span>12px</span>
              <span>18px</span>
              <span>24px</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Orders canvas</h2>
          <button className={styles.ghostButton}>
            <Printer size={16} />
            Layout de impressao
          </button>
        </div>
        <div className={styles.ordersToolbar}>
          <div className={styles.searchField}>
            <Search size={16} />
            <input placeholder="Buscar por cliente ou telefone" />
          </div>
          <button className={styles.secondaryButton}>
            <Filter size={16} />
            Filtros
          </button>
          <button className={styles.primaryButton}>
            <Plus size={16} />
            Novo pedido
          </button>
        </div>
        <div className={styles.ordersTable}>
          <div className={`${styles.orderRow} ${styles.orderHeader}`}>
            <span>Pedido</span>
            <span>Cliente</span>
            <span>Status</span>
            <span>Entrega</span>
            <span>Total</span>
          </div>
          <div className={styles.orderRow}>
            <span>2026-000011</span>
            <span>Robson (4499)</span>
            <span className={styles.pill}>Rascunho</span>
            <span>24/01 20:00</span>
            <span>R$ 94,80</span>
          </div>
          <div className={styles.orderExpand}>
            <div>
              <div className={styles.expandTitle}>Itens</div>
              <div className={styles.expandLine}>
                Bolo recheado simples - 2 kg - R$ 89,80
              </div>
              <div className={styles.expandLine}>
                Taxa de entrega: R$ 5,00
              </div>
            </div>
            <div>
              <div className={styles.expandTitle}>Resumo</div>
              <div className={styles.expandLine}>Subtotal: R$ 89,80</div>
              <div className={styles.expandLine}>Total: R$ 94,80</div>
            </div>
          </div>
          <div className={styles.orderRow}>
            <span>2026-000010</span>
            <span>Guilherme (1234)</span>
            <span className={`${styles.pill} ${styles.pillWarn}`}>
              Precisa produzir
            </span>
            <span>26/01 16:00</span>
            <span>R$ 244,55</span>
          </div>
          <div className={styles.orderRow}>
            <span>2026-000013</span>
            <span>Ana Maria (1234)</span>
            <span className={`${styles.pill} ${styles.pillSoft}`}>
              Confirmado
            </span>
            <span>30/01 13:30</span>
            <span>R$ 93,90</span>
          </div>
        </div>
      </section>

      <section className={styles.sectionSplit}>
        <div className={styles.surfaceCard}>
          <div className={styles.sectionHeader}>
            <h2>Componentes</h2>
            <span className={styles.sectionHint}>Botao, badge, card</span>
          </div>
          <div className={styles.componentRow}>
            <button className={styles.primaryButton}>Acao principal</button>
            <button className={styles.secondaryButton}>Secundaria</button>
            <button className={styles.ghostButton}>Ghost</button>
          </div>
          <div className={styles.componentRow}>
            <span className={styles.pill}>Rascunho</span>
            <span className={`${styles.pill} ${styles.pillSoft}`}>Entregue</span>
            <span className={`${styles.pill} ${styles.pillWarn}`}>
              Atencao
            </span>
          </div>
          <div className={styles.cardStack}>
            <div className={styles.miniCard}>
              <span>Pedidos no dia</span>
              <strong>26</strong>
            </div>
            <div className={styles.miniCard}>
              <span>Pendencias fortes</span>
              <strong>4</strong>
            </div>
            <div className={styles.miniCard}>
              <span>Receita estimada</span>
              <strong>R$ 1.280</strong>
            </div>
          </div>
        </div>
        <div className={styles.ticketCard}>
          <div className={styles.ticketHeader}>Print preview</div>
          <div className={styles.ticketBody}>
            <div className={styles.ticketTitle}>Pedido 2026-000011</div>
            <div className={styles.ticketLine}>Cliente: Robson</div>
            <div className={styles.ticketLine}>Entrega: 24/01 20:00</div>
            <div className={styles.ticketDivider} />
            <div className={styles.ticketLine}>Bolo recheado simples 2kg</div>
            <div className={styles.ticketLine}>Total: R$ 94,80</div>
          </div>
        </div>
      </section>
    </main>
  );
}
