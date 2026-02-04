"use client";

import { useState } from "react";
import styles from "./designSystem.module.css";
import Button from "../_components/Button";
import Input from "../_components/Input";
import Chip from "../_components/Chip";
import DataTable from "../_components/DataTable";
import DensityToggle from "../_components/DensityToggle.client";
import FiltersPanel from "../_components/FiltersPanel.client";
import OrderStatusStack from "../orders/OrderStatusStack.client";
import NextAction from "../orders/NextAction.client";
import { OrderStatus } from "@prisma/client";

export default function DesignSystemPage() {
  const [tableDensity, setTableDensity] = useState<"comfortable" | "compact">("comfortable");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersActiveCount, setFiltersActiveCount] = useState(0);

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  // Dados de exemplo para DataTable
  const exampleData = [
    { id: "1", name: "Pedido 2026-000001", customer: "João Silva", status: "CONFIRMADO" as OrderStatus, total: 150.00 },
    { id: "2", name: "Pedido 2026-000002", customer: "Maria Santos", status: "EM_PRODUCAO" as OrderStatus, total: 230.50 },
    { id: "3", name: "Pedido 2026-000003", customer: "Pedro Costa", status: "PRONTO" as OrderStatus, total: 89.90 },
  ];

  const exampleColumns = [
    { key: "name", header: "Pedido", accessor: (row: typeof exampleData[0]) => row.name },
    { key: "customer", header: "Cliente", accessor: (row: typeof exampleData[0]) => row.customer },
    { key: "status", header: "Status", accessor: (row: typeof exampleData[0]) => row.status },
    { key: "total", header: "Total", accessor: (row: typeof exampleData[0]) => `R$ ${row.total.toFixed(2).replace(".", ",")}`, align: "right" as const },
  ];

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <div className={styles.heroKicker}>Design System v2</div>
          <h1 className={styles.heroTitle}>Playground de Design System</h1>
          <p className={styles.heroSub}>
            QA visual contínua para validar tokens, componentes e padrões do Design System v2.
            Este playground é atualizado a cada PR para garantir consistência.
          </p>
        </div>
      </section>

      {/* Seção de Tokens */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Tokens</h2>
          <p className={styles.sectionSubtitle}>
            Todos os tokens CSS definidos conforme DESIGN_SYSTEM.md seção 2
          </p>
        </div>

        <div className={styles.tokensGrid}>
          {/* Cores - Base */}
          <div className={styles.tokenGroup}>
            <h3 className={styles.tokenGroupTitle}>Cores - Base</h3>
            <div className={styles.swatchGrid}>
              <div className={styles.swatchCard}>
                <div className={styles.swatchColor} style={{ background: "var(--bg-app)" }} />
                <div className={styles.swatchMeta}>
                  <span>--bg-app</span>
                  <span>#FBFAF8</span>
                </div>
              </div>
              <div className={styles.swatchCard}>
                <div className={styles.swatchColor} style={{ background: "var(--bg-surface)" }} />
                <div className={styles.swatchMeta}>
                  <span>--bg-surface</span>
                  <span>#FFFFFF</span>
                </div>
              </div>
              <div className={styles.swatchCard}>
                <div className={styles.swatchColor} style={{ background: "var(--bg-subtle)" }} />
                <div className={styles.swatchMeta}>
                  <span>--bg-subtle</span>
                  <span>#F5F5F4</span>
                </div>
              </div>
              <div className={styles.swatchCard}>
                <div className={styles.swatchColor} style={{ background: "var(--bg-muted)" }} />
                <div className={styles.swatchMeta}>
                  <span>--bg-muted</span>
                  <span>#EDEAE6</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cores - Texto */}
          <div className={styles.tokenGroup}>
            <h3 className={styles.tokenGroupTitle}>Cores - Texto</h3>
            <div className={styles.swatchGrid}>
              <div className={styles.swatchCard}>
                <div className={styles.swatchColor} style={{ background: "var(--text-primary)" }} />
                <div className={styles.swatchMeta}>
                  <span>--text-primary</span>
                  <span>#1C1917</span>
                </div>
              </div>
              <div className={styles.swatchCard}>
                <div className={styles.swatchColor} style={{ background: "var(--text-secondary)" }} />
                <div className={styles.swatchMeta}>
                  <span>--text-secondary</span>
                  <span>#4A4A4A</span>
                </div>
              </div>
              <div className={styles.swatchCard}>
                <div className={styles.swatchColor} style={{ background: "var(--text-muted)" }} />
                <div className={styles.swatchMeta}>
                  <span>--text-muted</span>
                  <span>#78716C</span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA - Action Primary */}
          <div className={styles.tokenGroup}>
            <h3 className={styles.tokenGroupTitle}>CTA - Action Primary</h3>
            <div className={styles.swatchGrid}>
              <div className={styles.swatchCard}>
                <div className={styles.swatchColor} style={{ background: "var(--action-primary)" }} />
                <div className={styles.swatchMeta}>
                  <span>--action-primary</span>
                  <span>#B45309</span>
                </div>
              </div>
              <div className={styles.swatchCard}>
                <div className={styles.swatchColor} style={{ background: "var(--action-primary-hover)" }} />
                <div className={styles.swatchMeta}>
                  <span>--action-primary-hover</span>
                  <span>#92400E</span>
                </div>
              </div>
              <div className={styles.swatchCard}>
                <div className={styles.swatchColor} style={{ background: "var(--action-primary-active)" }} />
                <div className={styles.swatchMeta}>
                  <span>--action-primary-active</span>
                  <span>#78350F</span>
                </div>
              </div>
            </div>
          </div>

          {/* Brand Amber */}
          <div className={styles.tokenGroup}>
            <h3 className={styles.tokenGroupTitle}>Brand Amber</h3>
            <div className={styles.swatchGrid}>
              <div className={styles.swatchCard}>
                <div className={styles.swatchColor} style={{ background: "var(--brand-amber)" }} />
                <div className={styles.swatchMeta}>
                  <span>--brand-amber</span>
                  <span>#D97706</span>
                </div>
              </div>
              <div className={styles.swatchCard}>
                <div className={styles.swatchColor} style={{ background: "var(--brand-amber-light)" }} />
                <div className={styles.swatchMeta}>
                  <span>--brand-amber-light</span>
                  <span>#F59E0B</span>
                </div>
              </div>
            </div>
          </div>

          {/* Estados */}
          <div className={styles.tokenGroup}>
            <h3 className={styles.tokenGroupTitle}>Estados</h3>
            <div className={styles.swatchGrid}>
              <div className={styles.swatchCard}>
                <div className={styles.swatchColor} style={{ background: "var(--state-success)" }} />
                <div className={styles.swatchMeta}>
                  <span>--state-success</span>
                  <span>#059669</span>
                </div>
              </div>
              <div className={styles.swatchCard}>
                <div className={styles.swatchColor} style={{ background: "var(--state-warning)" }} />
                <div className={styles.swatchMeta}>
                  <span>--state-warning</span>
                  <span>#CA8A04</span>
                </div>
              </div>
              <div className={styles.swatchCard}>
                <div className={styles.swatchColor} style={{ background: "var(--state-error)" }} />
                <div className={styles.swatchMeta}>
                  <span>--state-error</span>
                  <span>#DC2626</span>
                </div>
              </div>
              <div className={styles.swatchCard}>
                <div className={styles.swatchColor} style={{ background: "var(--state-info)" }} />
                <div className={styles.swatchMeta}>
                  <span>--state-info</span>
                  <span>#0EA5E9</span>
                </div>
              </div>
            </div>
          </div>

          {/* Status de Pedido */}
          <div className={styles.tokenGroup}>
            <h3 className={styles.tokenGroupTitle}>Status de Pedido</h3>
            <div className={styles.swatchGrid}>
              <div className={styles.swatchCard}>
                <div className={styles.swatchColor} style={{ background: "var(--status-rascunho-bg)" }} />
                <div className={styles.swatchMeta}>
                  <span>--status-rascunho</span>
                  <span>#F1F5F9 / #64748B</span>
                </div>
              </div>
              <div className={styles.swatchCard}>
                <div className={styles.swatchColor} style={{ background: "var(--status-confirmado-bg)" }} />
                <div className={styles.swatchMeta}>
                  <span>--status-confirmado</span>
                  <span>#FFF7ED / #B45309</span>
                </div>
              </div>
              <div className={styles.swatchCard}>
                <div className={styles.swatchColor} style={{ background: "var(--status-em_producao-bg)" }} />
                <div className={styles.swatchMeta}>
                  <span>--status-em_producao</span>
                  <span>#FEF3C7 / #B45309</span>
                </div>
              </div>
              <div className={styles.swatchCard}>
                <div className={styles.swatchColor} style={{ background: "var(--status-pronto-bg)" }} />
                <div className={styles.swatchMeta}>
                  <span>--status-pronto</span>
                  <span>#D1FAE5 / #047857</span>
                </div>
              </div>
              <div className={styles.swatchCard}>
                <div className={styles.swatchColor} style={{ background: "var(--status-entregue-bg)" }} />
                <div className={styles.swatchMeta}>
                  <span>--status-entregue</span>
                  <span>#DCFCE7 / #15803D</span>
                </div>
              </div>
              <div className={styles.swatchCard}>
                <div className={styles.swatchColor} style={{ background: "var(--status-cancelado-bg)" }} />
                <div className={styles.swatchMeta}>
                  <span>--status-cancelado</span>
                  <span>#FEE2E2 / #B91C1C</span>
                </div>
              </div>
            </div>
          </div>

          {/* Radius */}
          <div className={styles.tokenGroup}>
            <h3 className={styles.tokenGroupTitle}>Radius (4 níveis)</h3>
            <div className={styles.radiusGrid}>
              <div className={styles.radiusCard}>
                <div className={styles.radiusDemo} style={{ borderRadius: "var(--radius-sm)" }} />
                <div className={styles.radiusMeta}>
                  <span>--radius-sm</span>
                  <span>6px</span>
                </div>
              </div>
              <div className={styles.radiusCard}>
                <div className={styles.radiusDemo} style={{ borderRadius: "var(--radius-md)" }} />
                <div className={styles.radiusMeta}>
                  <span>--radius-md</span>
                  <span>10px</span>
                </div>
              </div>
              <div className={styles.radiusCard}>
                <div className={styles.radiusDemo} style={{ borderRadius: "var(--radius-lg)" }} />
                <div className={styles.radiusMeta}>
                  <span>--radius-lg</span>
                  <span>18px</span>
                </div>
              </div>
              <div className={styles.radiusCard}>
                <div className={styles.radiusDemo} style={{ borderRadius: "var(--radius-full)" }} />
                <div className={styles.radiusMeta}>
                  <span>--radius-full</span>
                  <span>9999px</span>
                </div>
              </div>
            </div>
          </div>

          {/* Shadows */}
          <div className={styles.tokenGroup}>
            <h3 className={styles.tokenGroupTitle}>Shadows (4 níveis)</h3>
            <div className={styles.shadowGrid}>
              <div className={styles.shadowCard}>
                <div className={styles.shadowDemo} style={{ boxShadow: "var(--shadow-xs)" }} />
                <div className={styles.shadowMeta}>
                  <span>--shadow-xs</span>
                </div>
              </div>
              <div className={styles.shadowCard}>
                <div className={styles.shadowDemo} style={{ boxShadow: "var(--shadow-sm)" }} />
                <div className={styles.shadowMeta}>
                  <span>--shadow-sm</span>
                </div>
              </div>
              <div className={styles.shadowCard}>
                <div className={styles.shadowDemo} style={{ boxShadow: "var(--shadow-md)" }} />
                <div className={styles.shadowMeta}>
                  <span>--shadow-md</span>
                </div>
              </div>
              <div className={styles.shadowCard}>
                <div className={styles.shadowDemo} style={{ boxShadow: "var(--shadow-focus)" }} />
                <div className={styles.shadowMeta}>
                  <span>--shadow-focus</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seção de Tipografia */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Tipografia</h2>
          <p className={styles.sectionSubtitle}>
            Fontes: Plus Jakarta Sans (display) e Inter (sans)
          </p>
        </div>

        <div className={styles.typographyGrid}>
          <div className={styles.typeGroup}>
            <h3 className={styles.typeGroupTitle}>Font Display (Plus Jakarta Sans)</h3>
            <div className={styles.typeScale}>
              <div className={styles.typeSample}>
                <h1 style={{ fontFamily: "var(--font-display)" }}>Heading 1 - Título Principal</h1>
                <span className={styles.typeLabel}>--text-2xl (24px) / --fw-bold</span>
              </div>
              <div className={styles.typeSample}>
                <h2 style={{ fontFamily: "var(--font-display)" }}>Heading 2 - Seção</h2>
                <span className={styles.typeLabel}>--text-xl (20px) / --fw-bold</span>
              </div>
              <div className={styles.typeSample}>
                <h3 style={{ fontFamily: "var(--font-display)" }}>Heading 3 - Subseção</h3>
                <span className={styles.typeLabel}>--text-lg (18px) / --fw-semibold</span>
              </div>
            </div>
          </div>

          <div className={styles.typeGroup}>
            <h3 className={styles.typeGroupTitle}>Font Sans (Inter)</h3>
            <div className={styles.typeScale}>
              <div className={styles.typeSample}>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-base)" }}>
                  Texto padrão para leitura. 1234567890, 15/02/2026.
                </p>
                <span className={styles.typeLabel}>--text-base (16px) / --fw-regular</span>
              </div>
              <div className={styles.typeSample}>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)" }}>
                  Texto pequeno para labels e badges.
                </p>
                <span className={styles.typeLabel}>--text-sm (14px) / --fw-regular</span>
              </div>
              <div className={styles.typeSample}>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)" }}>
                  Texto extra pequeno para chips.
                </p>
                <span className={styles.typeLabel}>--text-xs (12px) / --fw-medium</span>
              </div>
            </div>
          </div>

          <div className={styles.typeGroup}>
            <h3 className={styles.typeGroupTitle}>Escala Tipográfica</h3>
            <div className={styles.scaleGrid}>
              <div className={styles.scaleItem}>
                <span style={{ fontSize: "var(--text-xs)" }}>--text-xs</span>
                <span>12px</span>
              </div>
              <div className={styles.scaleItem}>
                <span style={{ fontSize: "var(--text-sm)" }}>--text-sm</span>
                <span>14px</span>
              </div>
              <div className={styles.scaleItem}>
                <span style={{ fontSize: "var(--text-base)" }}>--text-base</span>
                <span>16px</span>
              </div>
              <div className={styles.scaleItem}>
                <span style={{ fontSize: "var(--text-lg)" }}>--text-lg</span>
                <span>18px</span>
              </div>
              <div className={styles.scaleItem}>
                <span style={{ fontSize: "var(--text-xl)" }}>--text-xl</span>
                <span>20px</span>
              </div>
              <div className={styles.scaleItem}>
                <span style={{ fontSize: "var(--text-2xl)" }}>--text-2xl</span>
                <span>24px</span>
              </div>
              <div className={styles.scaleItem}>
                <span style={{ fontSize: "var(--text-3xl)" }}>--text-3xl</span>
                <span>30px</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Componentes Primitivos */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Button</h2>
          <p className={styles.sectionSubtitle}>
            Componente primitivo com variantes, tamanhos e densidades
          </p>
        </div>

        <div className={styles.componentDemo}>
          <div className={styles.demoGroup}>
            <h3 className={styles.demoGroupTitle}>Variantes</h3>
            <div className={styles.demoRow}>
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
          </div>

          <div className={styles.demoGroup}>
            <h3 className={styles.demoGroupTitle}>Tamanhos</h3>
            <div className={styles.demoRow}>
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
          </div>

          <div className={styles.demoGroup}>
            <h3 className={styles.demoGroupTitle}>Densidade</h3>
            <div className={styles.demoRow}>
              <Button density="comfortable">Comfortable</Button>
              <Button density="compact">Compact</Button>
            </div>
          </div>

          <div className={styles.demoGroup}>
            <h3 className={styles.demoGroupTitle}>Estados</h3>
            <div className={styles.demoRow}>
              <Button>Normal</Button>
              <Button disabled>Disabled</Button>
              <Button loading>Loading</Button>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Input</h2>
          <p className={styles.sectionSubtitle}>
            Componente primitivo com variantes e densidades
          </p>
        </div>

        <div className={styles.componentDemo}>
          <div className={styles.demoGroup}>
            <h3 className={styles.demoGroupTitle}>Variantes</h3>
            <div className={styles.demoForm}>
              <Input placeholder="Default input" />
              <Input variant="error" placeholder="Error input" />
              <Input variant="success" placeholder="Success input" />
            </div>
          </div>

          <div className={styles.demoGroup}>
            <h3 className={styles.demoGroupTitle}>Densidade</h3>
            <div className={styles.demoForm}>
              <Input density="comfortable" placeholder="Comfortable (44px)" />
              <Input density="compact" placeholder="Compact (36px)" />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Chip</h2>
          <p className={styles.sectionSubtitle}>
            Componente primitivo para status, pendências e alertas
          </p>
        </div>

        <div className={styles.componentDemo}>
          <div className={styles.demoGroup}>
            <h3 className={styles.demoGroupTitle}>Status de Pedido</h3>
            <div className={styles.demoRow}>
              <Chip variant="status" status="RASCUNHO" label="Rascunho" />
              <Chip variant="status" status="CONFIRMADO" label="Confirmado" />
              <Chip variant="status" status="EM_PRODUCAO" label="Em Produção" />
              <Chip variant="status" status="PRONTO" label="Pronto" />
              <Chip variant="status" status="ENTREGUE" label="Entregue" />
              <Chip variant="status" status="CANCELADO" label="Cancelado" />
            </div>
          </div>

          <div className={styles.demoGroup}>
            <h3 className={styles.demoGroupTitle}>Pendências e Alertas</h3>
            <div className={styles.demoRow}>
              <Chip variant="attention-strong" label="Pendência Forte" />
              <Chip variant="attention-weak" label="Alerta Fraco" />
            </div>
          </div>

          <div className={styles.demoGroup}>
            <h3 className={styles.demoGroupTitle}>Densidade</h3>
            <div className={styles.demoRow}>
              <Chip variant="status" status="CONFIRMADO" label="Comfortable" density="comfortable" />
              <Chip variant="status" status="CONFIRMADO" label="Compact" density="compact" />
            </div>
          </div>
        </div>
      </section>

      {/* DataTable */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>DataTable</h2>
          <p className={styles.sectionSubtitle}>
            Componente de tabela padronizado com row click, expand, kebab, sorting e sticky header
          </p>
        </div>

        <div className={styles.componentDemo}>
          <div className={styles.demoGroup}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
              <h3 className={styles.demoGroupTitle}>Tabela de Exemplo</h3>
              <DensityToggle
                currentDensity={tableDensity}
                onChange={setTableDensity}
                tableId="design-system-demo"
              />
            </div>
            <DataTable
              columns={exampleColumns}
              data={exampleData}
              rowHref={(row) => `/admin/orders/${row.id}`}
              expandRenderer={(row) => (
                <div style={{ padding: "var(--space-4)" }}>
                  <p>Preview expandido para {row.name}</p>
                  <p>Cliente: {row.customer}</p>
                </div>
              )}
              actionsRenderer={(row) => (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    alert(`Ações para ${row.name}`);
                  }}
                  style={{
                    width: "32px",
                    height: "32px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  ⋮
                </button>
              )}
              density={tableDensity}
              stickyHeader={true}
              sortable={true}
              onSort={(column, dir) => {
                console.log(`Sort by ${column} ${dir}`);
              }}
              tableId="design-system-demo"
            />
          </div>
        </div>
      </section>

      {/* FiltersPanel */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>FiltersPanel</h2>
          <p className={styles.sectionSubtitle}>
            Componente único para filtros (popover desktop, drawer mobile)
          </p>
        </div>

        <div className={styles.componentDemo}>
          <div className={styles.demoGroup}>
            <h3 className={styles.demoGroupTitle}>Filtros</h3>
            <FiltersPanel
              activeCount={filtersActiveCount}
              onApply={() => {
                setFiltersActiveCount(3);
                setFiltersOpen(false);
              }}
              onClear={() => {
                setFiltersActiveCount(0);
                setFiltersOpen(false);
              }}
              isOpen={filtersOpen}
              onClose={() => setFiltersOpen(false)}
              onToggle={() => setFiltersOpen(!filtersOpen)}
            >
              <div style={{ display: "grid", gap: "var(--space-3)" }}>
                <label>
                  <span style={{ display: "block", marginBottom: "var(--space-1)", fontSize: "var(--text-xs)", fontWeight: "var(--fw-medium)" }}>
                    Período
                  </span>
                  <Input placeholder="Selecionar período" />
                </label>
                <label>
                  <span style={{ display: "block", marginBottom: "var(--space-1)", fontSize: "var(--text-xs)", fontWeight: "var(--fw-medium)" }}>
                    Status
                  </span>
                  <Input placeholder="Selecionar status" />
                </label>
              </div>
            </FiltersPanel>
          </div>
        </div>
      </section>

      {/* OrderStatusStack */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>OrderStatusStack</h2>
          <p className={styles.sectionSubtitle}>
            Componente para status + pendências + alertas com limite e overflow
          </p>
        </div>

        <div className={styles.componentDemo}>
          <div className={styles.demoGroup}>
            <h3 className={styles.demoGroupTitle}>Exemplos</h3>
            <div style={{ display: "grid", gap: "var(--space-4)" }}>
              <div>
                <p style={{ marginBottom: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                  Status + 1 pendência forte
                </p>
                <OrderStatusStack
                  status="CONFIRMADO"
                  strongReasons={[{ type: "INCOMPLETE", severity: "strong", label: "Incompleto" }]}
                  weakReasons={[]}
                  maxChips={2}
                />
              </div>
              <div>
                <p style={{ marginBottom: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                  Status + 2 alertas fracos
                </p>
                <OrderStatusStack
                  status="EM_PRODUCAO"
                  strongReasons={[]}
                  weakReasons={[
                    { type: "UNAVAILABLE_ITEMS", severity: "weak", label: "Precisa produzir" },
                    { type: "MISSING_TIME", severity: "weak", label: "Horário a confirmar" },
                  ]}
                  maxChips={2}
                />
              </div>
              <div>
                <p style={{ marginBottom: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                  Status + overflow (+N)
                </p>
                <OrderStatusStack
                  status="RASCUNHO"
                  strongReasons={[
                    { type: "INCOMPLETE", severity: "strong", label: "Incompleto" },
                    { type: "ALTERADO_APOS_CONFIRMACAO", severity: "strong", label: "Alterado" },
                  ]}
                  weakReasons={[
                    { type: "UNAVAILABLE_ITEMS", severity: "weak", label: "Precisa produzir" },
                    { type: "MISSING_ADDRESS", severity: "weak", label: "Endereço necessário" },
                    { type: "MISSING_TIME", severity: "weak", label: "Horário a confirmar" },
                  ]}
                  maxChips={2}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NextAction */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>NextAction</h2>
          <p className={styles.sectionSubtitle}>
            Componente de próxima ação com checklist e resumo
          </p>
        </div>

        <div className={styles.componentDemo}>
          <div className={styles.demoGroup}>
            <h3 className={styles.demoGroupTitle}>Exemplo</h3>
            <NextAction
              checklist={[
                { label: "Itens adicionados", status: "complete" },
                { label: "Data definida", status: "pending" },
                { label: "Endereço necessário", status: "warning" },
                { label: "Pagamento confirmado", status: "complete" },
              ]}
              primaryAction={{
                label: "Definir data de entrega",
                onClick: () => alert("Definir data"),
                disabled: false,
              }}
              whenToShow="always"
              summary={{
                subtotal: 150.00,
                tax: 5.00,
                total: 155.00,
              }}
              status="CONFIRMADO"
              attention={{
                reasons: [],
                strongReasons: [{ type: "INCOMPLETE", severity: "strong", label: "Incompleto" }],
                weakReasons: [{ type: "MISSING_TIME", severity: "weak", label: "Horário a confirmar" }],
                hasAttention: true,
                missingFields: [],
                flags: {
                  items: { state: "OK", label: "Itens adicionados" },
                  date: { state: "PENDING", label: "Data definida" },
                  time: { state: "OPTIONAL", label: "Horário" },
                  address: { state: "OPTIONAL", label: "Endereço" },
                  payment: { state: "OK", label: "Pagamento" },
                },
              }}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
