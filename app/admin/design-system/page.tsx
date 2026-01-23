import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  LayoutDashboard,
  ListOrdered,
  Plus,
  Search,
} from "lucide-react";
import styles from "../_styles/adminPrimitives.module.css";
import ds from "./designSystem.module.css";

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className={`${styles.page} ${ds.page}`}>
      <section className={ds.hero}>
        <div>
          <div className={ds.heroKicker}>Design System v1</div>
          <h1 className={ds.heroTitle}>Sistema UI Kit</h1>
          <p className={ds.heroSub}>
            Guia visual para padronizar tipografia, cores, componentes e
            comportamentos. O foco e operacao sem ansiedade, leitura clara e
            hierarquia consistente.
          </p>
          <div className={ds.inlineRow}>
            <button className={`${styles.button} ${styles.buttonPrimary}`}>
              <Plus size={18} />
              Novo pedido
            </button>
            <button className={`${styles.button} ${styles.buttonGhost}`}>
              Ver docs
            </button>
          </div>
        </div>
        <div className={ds.heroCard}>
          <div className={ds.heroCardRow}>
            <div>
              <div className={styles.textMuted}>Pedidos hoje</div>
              <div className={ds.heroStat}>12</div>
            </div>
            <span className={`${styles.badge} ${styles.badgeSuccess}`}>
              Operacao ok
            </span>
          </div>
          <div className={ds.heroCardRow}>
            <div>
              <div className={styles.textMuted}>Pendencias</div>
              <div className={ds.heroStat}>3</div>
            </div>
            <span className={`${styles.badge} ${styles.badgeWarning}`}>
              Atencao
            </span>
          </div>
          <div className={ds.heroCardRow}>
            <div>
              <div className={styles.textMuted}>Producao</div>
              <div className={ds.heroStat}>5 itens</div>
            </div>
            <span className={`${styles.badge} ${styles.badgeNeutral}`}>
              Planejamento
            </span>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Foundations</h2>
        </div>
        <div className={styles.panelBody}>
          <div className={ds.foundationsGrid}>
            <div className={ds.subSection}>
              <h3 className={ds.sectionTitle}>Cores principais</h3>
              <div className={ds.swatchGrid}>
                <div className={ds.swatchCard}>
                  <div
                    className={ds.swatchColor}
                    style={{ background: "var(--focus-ring)" }}
                  />
                  <div className={ds.swatchMeta}>
                    <span>Brand 600</span>
                    <span>#2563EB</span>
                  </div>
                </div>
                <div className={ds.swatchCard}>
                  <div
                    className={ds.swatchColor}
                    style={{ background: "#14B8A6" }}
                  />
                  <div className={ds.swatchMeta}>
                    <span>Support</span>
                    <span>#14B8A6</span>
                  </div>
                </div>
                <div className={ds.swatchCard}>
                  <div
                    className={ds.swatchColor}
                    style={{ background: "var(--state-warning)" }}
                  />
                  <div className={ds.swatchMeta}>
                    <span>Warning</span>
                    <span>#F59E0B</span>
                  </div>
                </div>
                <div className={ds.swatchCard}>
                  <div
                    className={ds.swatchColor}
                    style={{ background: "var(--state-error)" }}
                  />
                  <div className={ds.swatchMeta}>
                    <span>Error</span>
                    <span>#EF4444</span>
                  </div>
                </div>
              </div>
            </div>
            <div className={ds.subSection}>
              <h3 className={ds.sectionTitle}>Neutros</h3>
              <div className={ds.swatchGrid}>
                <div className={ds.swatchCard}>
                  <div
                    className={ds.swatchColor}
                    style={{ background: "var(--bg-app)" }}
                  />
                  <div className={ds.swatchMeta}>
                    <span>App BG</span>
                    <span>#F6F7FB</span>
                  </div>
                </div>
                <div className={ds.swatchCard}>
                  <div
                    className={ds.swatchColor}
                    style={{ background: "var(--bg-surface)" }}
                  />
                  <div className={ds.swatchMeta}>
                    <span>Surface</span>
                    <span>#FFFFFF</span>
                  </div>
                </div>
                <div className={ds.swatchCard}>
                  <div
                    className={ds.swatchColor}
                    style={{ background: "var(--border)" }}
                  />
                  <div className={ds.swatchMeta}>
                    <span>Border</span>
                    <span>#E3E7EF</span>
                  </div>
                </div>
                <div className={ds.swatchCard}>
                  <div
                    className={ds.swatchColor}
                    style={{ background: "var(--text-primary)" }}
                  />
                  <div className={ds.swatchMeta}>
                    <span>Text</span>
                    <span>#0F172A</span>
                  </div>
                </div>
              </div>
            </div>
            <div className={ds.subSection}>
              <h3 className={ds.sectionTitle}>Espacamento e raio</h3>
              <div className={ds.spaced}>
                <div className={styles.textMuted}>Espacamento base</div>
                <div className={ds.spacingRow}>
                  <div className={ds.spacingBlock} style={{ height: 6 }} />
                  <div className={ds.spacingBlock} style={{ height: 10 }} />
                  <div className={ds.spacingBlock} style={{ height: 14 }} />
                  <div className={ds.spacingBlock} style={{ height: 18 }} />
                  <div className={ds.spacingBlock} style={{ height: 24 }} />
                </div>
                <div className={styles.textMuted}>Radius</div>
                <div className={ds.inlineRow}>
                  <span className={styles.badge}>12px</span>
                  <span className={styles.badge}>16px</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Typography</h2>
        </div>
        <div className={styles.panelBody}>
          <div className={ds.typeScale}>
            <div className={ds.typeSample}>
              <h1>Heading 1 - Titulo principal</h1>
              <span className={ds.typeLabel}>28 / Semibold</span>
            </div>
            <div className={ds.typeSample}>
              <h2>Heading 2 - Secao</h2>
              <span className={ds.typeLabel}>24 / Semibold</span>
            </div>
            <div className={ds.typeSample}>
              <h3>Heading 3 - Subsecao</h3>
              <span className={ds.typeLabel}>20 / Medium</span>
            </div>
            <div className={ds.typeSample}>
              <p>Texto padrao para leitura. 1234567890, 15/02/2026.</p>
              <span className={ds.typeLabel}>16 / Regular</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Buttons & badges</h2>
        </div>
        <div className={styles.panelBody}>
          <div className={ds.inlineRow}>
            <button className={`${styles.button} ${styles.buttonPrimary}`}>
              <Plus size={18} />
              Acao primaria
            </button>
            <button className={`${styles.button} ${styles.buttonSecondary}`}>
              Acao secundaria
            </button>
            <button className={`${styles.button} ${styles.buttonGhost}`}>
              Acao ghost
            </button>
            <button className={`${styles.button} ${styles.buttonDanger}`}>
              Remover
            </button>
          </div>
          <div className={ds.statusRow}>
            <span className={`${styles.badge} ${styles.badgeNeutral}`}>
              Rascunho
            </span>
            <span className={`${styles.badge} ${styles.badgeSuccess}`}>
              Entregue
            </span>
            <span className={`${styles.badge} ${styles.badgeWarning}`}>
              Precisa produzir
            </span>
            <span className={`${styles.badge} ${styles.badgeDanger}`}>
              Bloqueado
            </span>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Forms</h2>
        </div>
        <div className={styles.panelBody}>
          <div className={ds.formGrid}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Busca</span>
              <div className={styles.fieldControl}>
                <div className={ds.inputIconRow}>
                  <Search size={18} className={styles.textMuted} />
                  <input className={styles.control} placeholder="Buscar cliente" />
                </div>
              </div>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Status</span>
              <select className={styles.control} defaultValue="open">
                <option value="open">Aberto</option>
                <option value="done">Finalizado</option>
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Observacoes</span>
              <textarea
                className={`${styles.control} ${styles.controlTextarea}`}
                rows={3}
                placeholder="Notas importantes"
              />
            </label>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Checkbox</span>
              <label className={styles.choiceRow}>
                <input type="checkbox" />
                <span className={styles.choiceLabel}>
                  Avisar sobre producao
                </span>
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Cards & metrics</h2>
        </div>
        <div className={styles.panelBody}>
          <div className={ds.metricsGrid}>
            <div className={ds.metricCard}>
              <div className={styles.textMuted}>Pedidos no dia</div>
              <div className={ds.metricValue}>26</div>
              <div className={styles.textMuted}>+12% vs ontem</div>
            </div>
            <div className={ds.metricCard}>
              <div className={styles.textMuted}>Pendencias fortes</div>
              <div className={ds.metricValue}>4</div>
              <div className={styles.textMuted}>Precisa acao</div>
            </div>
            <div className={ds.metricCard}>
              <div className={styles.textMuted}>Receita estimada</div>
              <div className={ds.metricValue}>R$ 1.280</div>
              <div className={styles.textMuted}>Entregues no periodo</div>
            </div>
          </div>
          <div className={ds.cardPreview}>
            <div className={ds.inlineRow}>
              <LayoutDashboard size={18} className={styles.textMuted} />
              <strong>Resumo operacional</strong>
            </div>
            <div className={styles.textMuted}>
              Texto curto para reforcar hierarquia e contexto do card.
            </div>
            <div className={ds.inlineRow}>
              <button className={`${styles.button} ${styles.buttonPrimary}`}>
                Acao principal
              </button>
              <button className={`${styles.button} ${styles.buttonGhost}`}>
                Secundaria
              </button>
            </div>
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
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Status</th>
                  <th className={styles.tableNumeric}>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>2026-000012</td>
                  <td>Robson</td>
                  <td>
                    <span className={`${styles.badge} ${styles.badgeWarning}`}>
                      Precisa produzir
                    </span>
                  </td>
                  <td className={styles.tableNumeric}>R$ 98,00</td>
                </tr>
                <tr>
                  <td>2026-000013</td>
                  <td>Carla</td>
                  <td>
                    <span className={`${styles.badge} ${styles.badgeNeutral}`}>
                      Rascunho
                    </span>
                  </td>
                  <td className={styles.tableNumeric}>R$ 210,00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Feedback</h2>
        </div>
        <div className={styles.panelBody}>
          <div className={ds.inlineRow}>
            <div className={`${styles.notice} ${ds.noticeRow}`}>
              <Info size={18} />
              <strong>Info:</strong> Dados atualizados automaticamente.
            </div>
            <div className={`${styles.notice} ${styles.noticeWarning} ${ds.noticeRow}`}>
              <AlertTriangle size={18} />
              <strong>Atencao:</strong> Pendencia forte bloqueia entrega.
            </div>
            <div className={`${styles.notice} ${styles.noticeError} ${ds.noticeRow}`}>
              <AlertTriangle size={18} />
              <strong>Erro:</strong> Preencha os campos obrigatorios.
            </div>
          </div>
          <div className={`${styles.emptyState} ${ds.emptyRow}`}>
            <CheckCircle2 size={18} />
            Nenhum item pendente no momento.
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Navigation sample</h2>
        </div>
        <div className={styles.panelBody}>
          <div className={ds.inlineRow}>
            <span className={`${styles.badge} ${styles.badgeNeutral}`}>
              <ListOrdered size={14} /> Pedidos
            </span>
            <span className={`${styles.badge} ${styles.badgeNeutral}`}>
              <LayoutDashboard size={14} /> Visao geral
            </span>
          </div>
          <div className={ds.inlineRow}>
            <Link href="/admin">Ver painel</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
