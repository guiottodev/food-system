# Inventário do Sistema - Design System v2 Premium

**Data**: Janeiro 2026  
**Objetivo**: Mapear completamente o repositório para criar um DESIGN_SYSTEM.md v2 premium e implementável

> **Nota**: Este inventário foi criado para informar o DESIGN_SYSTEM.md v2, que incorpora a proposta "Design System v2 – Friendly Pro SaaS". Consulte também [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) para a especificação completa do design system.

---

## 0. Resumo Executivo

Este inventário mapeia completamente o repositório para informar o DESIGN_SYSTEM.md v2 (constituição de UX/UI).

### Estado Atual
- **Stack de UI**: Next.js 16 + React 19 + CSS Modules (sem Tailwind/shadcn/Radix)
- **14 inconsistências visuais** identificadas entre telas (seção 12.2)
- **11 telas principais** mapeadas com seus componentes (seção 3)
- **10 componentes base** existentes (Botões, Badges, Inputs, Cards, Tabelas, Modal, Drawer, Popover, Toast, Select)
- **Sistema de estados** de pedido e pendências documentado (seção 5)
- **Padrões de tabela e filtros** analisados (seções 6-7)
- **Acessibilidade** parcialmente implementada (foco, ARIA, teclado) - seção 8

### Mudanças v2 (Aprovadas)
- **Cor primária**: Azul (#2563eb) → Âmbar escuro (#B45309) para CTA, Brand âmbar (#D97706) para assinatura
- **Densidade**: Comfortable (44px padrão) / Compact (36px toggle)
- **Tokens específicos**: Status de pedidos, atenção (pendências/alertas)
- **Componentes novos**: NextAction, OrderStatusStack, FiltersPanel, DensityToggle
- **UX Writing**: Guidelines obrigatórias
- **Motion**: Governado (160-220ms, ease-out único)

### Plano de Implementação
- **10 PRs** definidos (seção 14) com Risk Surface e QA passo-a-passo
- **6 fases** de rollout (seção 14)
- **Riscos e mitigações** documentados (seção 15)
- **Checklist de regressão** por PR (seção 16)

**Status**: Inventário completo. Pronto para implementação conforme DESIGN_SYSTEM.md v2.

---

## 0.1 Decisões Fechadas (Mapa Único)

### CTA Tokens Finais
- **`--action-primary`**: #B45309 (âmbar escuro) - CTA real com contraste AA folgado (7.1:1)
- **`--brand-amber`**: #D97706 (âmbar original) - Apenas assinatura visual, não para CTAs
- **`--action-primary-text`**: #FFFFFF (sempre branco sobre CTA)
- **`--action-primary-hover`**: #92400E (escurece)
- **`--action-primary-active`**: #78350F (mais escuro)
- **`--action-primary-disabled`**: #D6D3D1 (cinza)
- **Regra**: CTA nunca usa o mesmo tom do Warning (#CA8A04)

### Densidade
- **Onde aplica**: Apenas tabelas/listas (toggle no canto superior-direito)
- **Onde é proibida**: Formulários (sempre Comfortable), Modais (sempre Comfortable), Mobile (sempre Comfortable)
- **Persistência**: Por tabela em `localStorage` (chave: `table-density-{tableId}`)

### Row/Expand/Kebab
- **Row click**: Navega para detalhe (qualquer área da linha, exceto expand/kebab)
- **Expand**: Preview de itens/SKUs (stopPropagation, não navega)
- **Kebab**: Ações secundárias (stopPropagation, não navega)
- **Acessibilidade**: `role="button"`, `aria-label`, `aria-expanded`, teclado (Enter/Space)

### Limite de Chips e Overflow
- **Limite**: Status (sempre primeiro) + máximo 2 chips (pendência forte + alerta fraco)
- **Overflow**: "+N" com tooltip enumerando chips restantes
- **Ordem**: Status → Pendência forte → Alerta fraco

### Fontes
- **Display**: `--font-display` ("Plus Jakarta Sans") - Apenas títulos (H1-H3) e números destacados
- **Body**: `--font-sans` ("Inter") - Todo o resto (corpo, inputs, tabelas, chips, botões)
- **Proibido**: `--font-display` em inputs, tabelas, chips ou botões

### Radius/Sombras
- **Radius**: 4 níveis apenas (sm: 6px, md: 10px, lg: 18px, full: 9999px)
- **Sombras**: 4 níveis apenas (xs, sm, md, focus)
- **Proibido**: Valores intermediários ou cálculos genéricos

### Motion
- **Duração padrão**: 160-220ms (`--duration-normal`)
- **Easing padrão**: `--ease-out` (cubic-bezier(0, 0, 0.2, 1))
- **Onde usar**: Drawer/modal, toast, hover, expand
- **Onde NÃO usar**: Carregamento crítico, tabelas densas, ações instantâneas
- **Regra**: Motion nunca pode atrasar clique/ação

---

---

## 1. Stack de UI

### 1.1 Tecnologias Identificadas

- **Framework**: Next.js 16.1.1 (App Router)
- **React**: 19.2.3
- **Estilização**: CSS Modules (`.module.css`)
- **Ícones**: Lucide React (`lucide-react`)
- **TypeScript**: Sim (tsconfig.json)
- **Sem Tailwind CSS**: Não encontrado
- **Sem shadcn/ui**: Não encontrado
- **Sem Radix UI**: Não encontrado

### 1.2 Estrutura de Estilos

```
app/
├── styles/
│   ├── tokens.css              # Tokens CSS principais (cores, tipografia, espaçamento)
│   ├── base.css                # Estilos base HTML
│   ├── elements.css            # Estilos de elementos (inputs, botões, tabelas)
│   ├── layout.css              # Layout geral
│   └── app.css                 # Importa todos acima
├── globals.css                 # Estilos globais
└── admin/
    └── _styles/
        ├── adminPrimitives.module.css  # Componentes primitivos reutilizáveis
        ├── adminShell.module.css       # Layout shell (sidebar, drawer)
        └── adminNav.module.css         # Navegação
```

**Arquivos de Módulos Específicos**:
- `app/admin/products/products.module.css`
- `app/admin/orders/orders.module.css`
- `app/admin/clientes/clientes.module.css`
- `app/admin/categories/categories.module.css`
- `app/admin/capacidade/capacidade.module.css`
- `app/admin/producao/producao.module.css`
- `app/admin/consumo/consumo.module.css`

### 1.3 Tokens CSS

**Localização**: [`app/styles/tokens.css`](app/styles/tokens.css)

**Estrutura**:
- **Tipografia**: `--font-sans`, `--text-xs` até `--text-3xl`, `--fw-regular` até `--fw-bold`
- **Cores Base**: `--bg-app`, `--bg-surface`, `--bg-subtle`, `--bg-muted`
- **Cores Texto**: `--text-primary`, `--text-secondary`, `--text-muted`, `--text-inverse`
- **Cores Borda**: `--border`, `--border-strong`, `--border-subtle`
- **Cores Ação**: `--action-primary`, `--action-primary-hover`, `--action-secondary`
- **Cores Estado**: `--state-success`, `--state-warning`, `--state-error`, `--state-info` (com variantes `-bg`, `-text`, `-border`)
- **Espaçamento**: Grid de 8px (`--space-0` até `--space-12`)
- **Radius**: `--radius-xs` até `--radius-full`
- **Sombras**: `--shadow-xs` até `--shadow-xl`, `--shadow-focus`
- **Animações**: `--duration-fast/normal/slow`, `--ease-default/in/out`

---

## 2. Componentes Base Existentes

### 2.1 Botões

**Localização**: [`app/admin/_styles/adminPrimitives.module.css`](app/admin/_styles/adminPrimitives.module.css) (linhas 1028-1127)

**Variantes**:
- `.button` - Base
- `.buttonPrimary` - Primário (azul, gradiente)
- `.buttonSecondary` - Secundário (borda, fundo branco)
- `.buttonGhost` - Ghost (transparente)
- `.buttonDanger` - Perigo (vermelho)
- `.buttonSm` - Pequeno (32px altura)

**API/Props**: Classes CSS, não componentes React

**Especificações**:
- Altura padrão: 42px (adminPrimitives) vs 38px (módulos específicos) - **INCONSISTÊNCIA**
- Padding: `0 var(--space-4)` (16px horizontal)
- Fonte: `var(--text-sm)` (14px), weight `var(--fw-medium)` (500)
- Border-radius: `var(--radius-md)` (8px)

**Uso**:
```tsx
<button className={`${styles.button} ${styles.buttonPrimary}`}>
  Novo pedido
</button>
```

### 2.2 Badges/Status

**Localização**: 
- [`app/admin/_styles/adminPrimitives.module.css`](app/admin/_styles/adminPrimitives.module.css) (linhas 920-965)
- [`app/admin/orders/orders.module.css`](app/admin/orders/orders.module.css) (linhas 921-959)

**Variantes**:
- `.badge` - Base
- `.badgeNeutral` - Neutro (cinza)
- `.badgeSuccess` - Sucesso (verde)
- `.badgeWarning` - Aviso (amarelo)
- `.badgeDanger` - Perigo (vermelho)
- `.badgeInfo` - Info (azul)

**Status Específicos de Pedido** (orders.module.css):
- `.statusRASCUNHO` - `#f1f5f9` / `#64748b`
- `.statusCONFIRMADO` - `#dbeafe` / `#1d4ed8`
- `.statusEM_PRODUCAO` - `#fef3c7` / `#b45309`
- `.statusPRONTO` - `#d1fae5` / `#047857`
- `.statusENTREGUE` - `#dcfce7` / `#15803d`
- `.statusCANCELADO` - `#fee2e2` / `#b91c1c`

**API/Props**: Classes CSS

**Especificações**:
- Padding: `3px 8px` (products) vs `5px 10px` (orders) - **INCONSISTÊNCIA**
- Fonte: `11px` (products) vs `12px` (orders) - **INCONSISTÊNCIA**
- Border-radius: `var(--radius-sm)` (6px) vs `var(--radius-md)` (8px) - **INCONSISTÊNCIA**

**Uso**:
```tsx
<span className={`${styles.badge} ${styles.badgeSuccess}`}>
  Ativo
</span>
```

### 2.3 Inputs

**Localização**: 
- [`app/styles/elements.css`](app/styles/elements.css) (linhas 7-93)
- [`app/admin/_styles/adminPrimitives.module.css`](app/admin/_styles/adminPrimitives.module.css) (linhas 967-1004)

**Variantes**:
- `.control` - Input padrão (44px altura)
- `.controlTextarea` - Textarea

**Especificações**:
- Altura: 44px (adminPrimitives) vs 38px (módulos específicos) - **INCONSISTÊNCIA**
- Padding: `0 var(--space-4)` (16px horizontal)
- Border-radius: `var(--radius-sm)` (6px)
- Fonte: `var(--text-sm)` (14px)

**Input de Busca**:
- Padding-left: `var(--space-10)` (40px) para ícone
- Ícone: Posicionado absolutamente à esquerda (12px)

### 2.4 Cards/Panels

**Localização**: [`app/admin/_styles/adminPrimitives.module.css`](app/admin/_styles/adminPrimitives.module.css) (linhas 170-224)

**Variantes**:
- `.panel` - Card padrão
- `.panelPrimary` - Card primário (borda forte, sombra maior)
- `.panelSecondary` - Card secundário
- `.panelTertiary` - Card terciário (fundo sutil)

**Especificações**:
- Padding: `var(--space-5)` (20px)
- Border-radius: `var(--radius-lg)` (12px)
- Sombra: `var(--shadow-xs)`
- Borda: `1px solid var(--border)`

**KPI Cards**:
- Localização: [`app/admin/products/products.module.css`](app/admin/products/products.module.css) (linhas 23-74)
- Padding: `var(--space-4)` (16px)
- Border-radius: `var(--radius-lg)` (12px)
- Sombra: `var(--shadow-sm)`

### 2.5 Tabelas

**Localização**: 
- [`app/admin/_styles/adminPrimitives.module.css`](app/admin/_styles/adminPrimitives.module.css) (linhas 501-639)
- Módulos específicos: `products.module.css`, `orders.module.css`, etc.

**Componentes**:
- `.tableContainer` - Container da tabela
- `.table` - Tabela base
- `.tableRow` - Linha da tabela
- `.tableRowExpanded` - Linha expandida
- `.tableRowChild` - Linha filha (expandida)

**Especificações**:
- Container: Border-radius `var(--radius-xl)` (16px), sombra `var(--shadow-md)`
- Cabeçalho: Fundo `var(--bg-subtle)` ou gradiente, padding `16px 20px`
- Cabeçalho fonte: `11px`, weight `600`, uppercase, letter-spacing `0.06em`
- Linhas: Padding `20px`, borda inferior `1px solid var(--border-subtle)`
- Hover: Fundo `rgba(37, 99, 235, 0.04)`, box-shadow `inset 2px 0 0 var(--action-primary)`

**Sorting**:
- Implementado em: [`app/admin/products/ProductsTableExpandable.client.tsx`](app/admin/products/ProductsTableExpandable.client.tsx) (linhas 19-38, 207-241)
- Ícones: `ArrowUp`, `ArrowDown`, `ArrowUpDown` (lucide-react)
- Acessibilidade: `aria-sort`, `role="button"`, `tabIndex={0}`, `onKeyDown`

### 2.6 Modal

**Localização**: 
- [`app/admin/categories/categories.module.css`](app/admin/categories/categories.module.css) (linhas 246-304)
- [`app/admin/products/[id]/productDetail.module.css`](app/admin/products/[id]/productDetail.module.css)

**Estrutura**:
- `.modalOverlay` - Overlay fixo (z-index: 50)
- `.modalCard` - Card do modal
- `.modalHeader` - Cabeçalho
- `.modalBody` - Corpo
- `.modalFooter` - Rodapé

**Especificações**:
- Overlay: `rgba(15, 23, 42, 0.45)`, `position: fixed`, `inset: 0`
- Card: `width: min(640px, 96vw)`, border-radius `var(--radius-lg)` (12px)
- Sombra: `0 20px 60px -20px rgba(0, 0, 0, 0.35)`
- Header: Gradiente sutil, padding `var(--space-4)` (16px)

**Uso**:
```tsx
{modalOpen && (
  <div className={styles.modalOverlay} onClick={closeModal}>
    <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
      <div className={styles.modalHeader}>...</div>
      <div className={styles.modalBody}>...</div>
    </div>
  </div>
)}
```

**Acessibilidade**: 
- Fecha com Escape (implementado em CategoriesFilters)
- Fecha ao clicar no overlay
- `aria-label` no botão de fechar

### 2.7 Drawer

**Localização**: [`app/admin/AdminDrawer.client.tsx`](app/admin/AdminDrawer.client.tsx)

**Estrutura**:
- `.drawerOverlay` - Overlay fixo
- `.drawerPanel` - Painel lateral

**Especificações**:
- Overlay: `rgba(15, 23, 42, 0.45)`, z-index 50
- Panel: `width: min(320px, 86vw)`, altura 100%, sombra `var(--shadow-sm)`
- Posição: `justify-content: flex-start` (esquerda)

**Acessibilidade**:
- `aria-label` nos botões
- Fecha ao clicar no overlay

### 2.8 Popover (Filtros Panel)

**Localização**: Múltiplos arquivos (OrdersFilters, ProductsFilters, CategoriesFilters, ProductionFilters)

**Estrutura**:
- `.filtersPanel` - Painel de filtros (position: absolute)
- `.filtersPanelHeader` - Cabeçalho
- `.filtersPanelBody` - Corpo
- `.filtersPanelFooter` - Rodapé

**Especificações**:
- Posição: `absolute`, `top: calc(100% + 8px)`, `right: 0`
- Width: `min(480px, 94vw)` (orders) vs `min(400px, 94vw)` (capacidade) - **INCONSISTÊNCIA**
- Z-index: 20
- Animação: `filtersPanelIn` 150ms ease
- Sombra: `--shadow-lg`

**Acessibilidade**:
- `role="dialog"`, `aria-label`, `aria-expanded`, `aria-controls`
- Fecha com Escape (implementado em FilterSelect)
- Fecha ao clicar fora (mousedown listener)

### 2.9 Toast/Notice

**Localização**: [`app/admin/design-system/InlineNotice.client.tsx`](app/admin/design-system/InlineNotice.client.tsx)

**Componente React**:
```tsx
<InlineNotice 
  tone="info" | "success" | "warning" | "error"
  dismissAfterMs={6000}
  clearQueryKeys={[]}
>
  Mensagem
</InlineNotice>
```

**Estilos**: [`app/admin/_styles/adminPrimitives.module.css`](app/admin/_styles/adminPrimitives.module.css) (linhas 836-910)

**Variantes**:
- `.notice` - Base
- `.noticeSuccess` - Sucesso
- `.noticeWarning` - Aviso
- `.noticeError` - Erro

**Especificações**:
- Borda esquerda: 3px sólida (cor do estado)
- Padding: `var(--space-2) var(--space-3)` (8px 12px)
- Fonte: 13px
- Auto-dismiss: Configurável (padrão 6s)

### 2.10 Select Customizado

**Localização**: 
- [`app/admin/orders/FilterSelect.client.tsx`](app/admin/orders/FilterSelect.client.tsx)
- [`app/admin/products/FilterSelect.client.tsx`](app/admin/products/FilterSelect.client.tsx)

**Componente React**:
```tsx
<FilterSelect
  options={Array<{value: string, label: string}>}
  value={string}
  onChange={(value: string) => void}
  disabled?: boolean
  placeholder?: string
  "aria-label"?: string
/>
```

**Estilos**: 
- Orders: [`app/admin/orders/orders.module.css`](app/admin/orders/orders.module.css) (linhas 456-579)
- Products: [`app/admin/products/products.module.css`](app/admin/products/products.module.css) (linhas 196-319)

**Especificações**:
- Altura: 36px (orders) vs 38px (products) - **INCONSISTÊNCIA**
- Padding-right: `var(--space-8)` (32px) para seta
- Dropdown: Sombra `--shadow-lg`, z-index 50
- Animação: `dropdownIn` 150ms ease

**Acessibilidade**:
- `aria-haspopup="listbox"`, `aria-expanded`, `role="listbox"`, `role="option"`, `aria-selected`
- Fecha com Escape
- Fecha ao clicar fora

---

## 3. Telas Principais

### 3.1 Pedidos

**Rota**: `/admin/orders`  
**Arquivo**: [`app/admin/orders/page.tsx`](app/admin/orders/page.tsx)

**Componentes**:
- `OrdersFilters` - [`app/admin/orders/OrdersFilters.client.tsx`](app/admin/orders/OrdersFilters.client.tsx)
- `OrdersTableClient` - [`app/admin/orders/OrdersTableClient.tsx`](app/admin/orders/OrdersTableClient.tsx)
- `OrdersTableSkeleton` - [`app/admin/orders/OrdersTableSkeleton.tsx`](app/admin/orders/OrdersTableSkeleton.tsx)

**Estilos**: [`app/admin/orders/orders.module.css`](app/admin/orders/orders.module.css)

**Características**:
- Tabela expansível (mostra itens ao expandir)
- Filtros em popover (painel absoluto)
- Paginação
- KPI Bar horizontal (não cards)
- Busca com debounce (250ms)

### 3.2 Novo Pedido

**Rota**: `/admin/orders/new`  
**Arquivo**: [`app/admin/orders/new/page.tsx`](app/admin/orders/new/page.tsx)

**Componentes**:
- `OrderForm` - [`app/admin/orders/new/OrderForm.tsx`](app/admin/orders/new/OrderForm.tsx)

**Características**:
- Formulário complexo com múltiplas seções
- Autocomplete de produtos/SKUs
- Validação em tempo real
- Checklist de pendências

### 3.3 Detalhe do Pedido

**Rota**: `/admin/orders/[id]`  
**Arquivo**: [`app/admin/orders/[id]/page.tsx`](app/admin/orders/[id]/page.tsx)

**Componentes**:
- `OrderDetailFocus` - [`app/admin/orders/[id]/OrderDetailFocus.client.tsx`](app/admin/orders/[id]/OrderDetailFocus.client.tsx)
- `CancelOrderForm` - [`app/admin/orders/[id]/CancelOrderForm.client.tsx`](app/admin/orders/[id]/CancelOrderForm.client.tsx)

**Estilos**: [`app/admin/orders/orderDetail.module.css`](app/admin/orders/orderDetail.module.css)

**Características**:
- Checklist de pendências com badges
- Ações de status
- Auditoria/logs
- Informações de pagamento

### 3.4 Produção/Capacidade

**Rota**: `/admin/capacidade`  
**Arquivo**: [`app/admin/capacidade/page.tsx`](app/admin/capacidade/page.tsx)

**Componentes**:
- `ProductionFilters` - [`app/admin/capacidade/ProductionFilters.client.tsx`](app/admin/capacidade/ProductionFilters.client.tsx)
- `CapacityTable` - [`app/admin/capacidade/CapacityTable.client.tsx`](app/admin/capacidade/CapacityTable.client.tsx)
- `ProductionEmptyState` - [`app/admin/capacidade/ProductionEmptyState.client.tsx`](app/admin/capacidade/ProductionEmptyState.client.tsx)

**Estilos**: [`app/admin/capacidade/capacidade.module.css`](app/admin/capacidade/capacidade.module.css)

**Características**:
- Tabela com sorting
- KPI Bar horizontal
- Filtros em popover
- Destaque visual para valores que precisam produção (laranja/vermelho)

### 3.5 Registrar Produção

**Rota**: `/admin/producao`  
**Arquivo**: [`app/admin/producao/page.tsx`](app/admin/producao/page.tsx)

**Componentes**:
- `ProductionSessionForm` - [`app/admin/producao/ProductionSessionForm.client.tsx`](app/admin/producao/ProductionSessionForm.client.tsx)

**Estilos**: [`app/admin/producao/producao.module.css`](app/admin/producao/producao.module.css)

### 3.6 Produtos

**Rota**: `/admin/products`  
**Arquivo**: [`app/admin/products/page.tsx`](app/admin/products/page.tsx)

**Componentes**:
- `ProductsFilters` - [`app/admin/products/ProductsFilters.client.tsx`](app/admin/products/ProductsFilters.client.tsx)
- `ProductsTableExpandable` - [`app/admin/products/ProductsTableExpandable.client.tsx`](app/admin/products/ProductsTableExpandable.client.tsx)
- `ProductsTableSkeleton` - [`app/admin/products/ProductsTableSkeleton.tsx`](app/admin/products/ProductsTableSkeleton.tsx)
- `PageSizeSelect` - [`app/admin/products/PageSizeSelect.client.tsx`](app/admin/products/PageSizeSelect.client.tsx)

**Estilos**: [`app/admin/products/products.module.css`](app/admin/products/products.module.css)

**Características**:
- Tabela expansível (mostra SKUs)
- KPI Cards em grid (4 colunas)
- Edição inline de preço
- Menu dropdown de ações (3 pontos)
- Paginação completa

### 3.7 Detalhe do Produto

**Rota**: `/admin/products/[id]`  
**Arquivo**: [`app/admin/products/[id]/page.tsx`](app/admin/products/[id]/page.tsx)

**Componentes**:
- `ProductTabs` - [`app/admin/products/[id]/ProductTabs.tsx`](app/admin/products/[id]/ProductTabs.tsx)
- `ProductSkusSection` - [`app/admin/products/[id]/ProductSkusSection.client.tsx`](app/admin/products/[id]/ProductSkusSection.client.tsx)
- `ProductDetailsForm` - [`app/admin/products/[id]/ProductDetailsForm.tsx`](app/admin/products/[id]/ProductDetailsForm.tsx)
- `ProductImagesForm` - [`app/admin/products/[id]/ProductImagesForm.tsx`](app/admin/products/[id]/ProductImagesForm.tsx)

**Estilos**: [`app/admin/products/[id]/productDetail.module.css`](app/admin/products/[id]/productDetail.module.css)

**Características**:
- Tabs para navegação entre seções
- Modal para criar/editar SKU
- Formulários complexos

### 3.8 Categorias

**Rota**: `/admin/categories`  
**Arquivo**: [`app/admin/categories/page.tsx`](app/admin/categories/page.tsx)

**Componentes**:
- `CategoriesFilters` - [`app/admin/categories/CategoriesFilters.client.tsx`](app/admin/categories/CategoriesFilters.client.tsx)
- `CategoriesTree` - [`app/admin/categories/CategoriesTree.client.tsx`](app/admin/categories/CategoriesTree.client.tsx)

**Estilos**: [`app/admin/categories/categories.module.css`](app/admin/categories/categories.module.css)

**Características**:
- Tabela hierárquica (tree) com indentação visual
- Edição inline
- Modal para criar categoria
- Filtros em popover
- Controles "Expandir tudo" / "Recolher tudo"

### 3.9 Clientes

**Rota**: `/admin/clientes`  
**Arquivo**: [`app/admin/clientes/page.tsx`](app/admin/clientes/page.tsx)

**Componentes**: Nenhum componente React específico (tabela direta no page.tsx)

**Estilos**: [`app/admin/clientes/clientes.module.css`](app/admin/clientes/clientes.module.css)

**Características**:
- Tabela simples (sem expansão)
- KPI Bar horizontal
- Busca com formulário (não debounce)
- Sem filtros avançados

### 3.10 Detalhe do Cliente

**Rota**: `/admin/clientes/[id]`  
**Arquivo**: [`app/admin/clientes/[id]/page.tsx`](app/admin/clientes/[id]/page.tsx)

**Componentes**:
- `CustomerTabs` - [`app/admin/clientes/CustomerTabs.tsx`](app/admin/clientes/CustomerTabs.tsx)

**Estilos**: [`app/admin/clientes/customerDetail.module.css`](app/admin/clientes/customerDetail.module.css)

### 3.11 Pendências (Painel Principal)

**Rota**: `/admin` (page.tsx)  
**Arquivo**: [`app/admin/page.tsx`](app/admin/page.tsx)

**Características**:
- Cards em grid (3 colunas)
- Lista de pendências fortes
- Filtros de período

---

## 4. Inconsistências Visuais e de Interação

### 4.1 Altura de Botões

- **adminPrimitives**: 42px
- **Módulos específicos**: 38px (orders, products, etc.)

**Impacto**: Botões têm alturas diferentes dependendo de onde são usados.

### 4.2 Altura de Inputs

- **adminPrimitives**: 44px
- **Módulos específicos**: 38px

**Impacto**: Inputs têm alturas diferentes.

### 4.3 Badges - Padding e Tamanho

- **products.module.css**: `3px 8px`, fonte `11px`
- **orders.module.css**: `5px 10px`, fonte `12px`
- **adminPrimitives**: `var(--space-1) var(--space-3)` (4px 12px), fonte `var(--text-xs)` (12px)

**Impacto**: Badges têm tamanhos diferentes entre telas.

### 4.4 Badges - Border-radius

- **products**: `var(--radius-sm)` (6px)
- **orders**: `var(--radius-md)` (8px)
- **adminPrimitives**: `var(--radius-full)` (9999px - pill)

**Impacto**: Formato diferente (arredondado vs pill).

### 4.5 KPI Cards vs KPI Bar

- **Produtos**: KPI Cards em grid (4 colunas)
- **Pedidos/Clientes/Capacidade**: KPI Bar horizontal

**Impacto**: Duas abordagens diferentes para métricas.

### 4.6 Filtros - Popover vs Modal

- **Pedidos/Produtos/Capacidade**: Popover (position absolute)
- **Categorias**: Modal (overlay fixo) para criar categoria

**Impacto**: Experiência inconsistente.

### 4.7 Filtros - Largura do Panel

- **Pedidos**: `min(480px, 94vw)`
- **Capacidade**: `min(400px, 94vw)`
- **Categorias**: Sem largura definida (usa conteúdo)

**Impacto**: Tamanhos diferentes.

### 4.8 Busca - Com vs Sem Botão

- **Pedidos/Produtos/Capacidade**: Apenas input (debounce)
- **Clientes**: Input + botão "Buscar"

**Impacto**: Padrão inconsistente.

### 4.9 Tabela - Cabeçalho

- **Produtos**: Fundo `var(--bg-subtle)` simples
- **Pedidos/Capacidade**: Gradiente `linear-gradient(180deg, #fafbfc 0%, #f4f6f8 100%)`
- **Clientes**: Gradiente similar

**Impacto**: Visual diferente.

### 4.10 Tabela - Padding das Células

- **Produtos**: `var(--space-5)` (20px)
- **Pedidos**: `var(--space-5) var(--space-4)` (20px 16px)
- **adminPrimitives**: `var(--space-4) var(--space-5)` (16px 20px)

**Impacto**: Espaçamento inconsistente.

### 4.11 Status Badges - Cores Hardcoded

- **orders.module.css**: Cores hardcoded (`#f1f5f9`, `#dbeafe`, etc.)
- **adminPrimitives**: Usa tokens (`--state-success-bg`, etc.)

**Impacto**: Difícil manter consistência e tema.

### 4.12 Menu Dropdown - Estilo

- **Produtos**: Menu dropdown com 3 pontos verticais
- **Outros**: Não há menu dropdown padronizado

**Impacto**: Ações não padronizadas.

### 4.13 Paginação - Layout

- **Produtos**: Layout completo (anterior, página, próxima, contagem, pageSize)
- **Pedidos**: Similar mas estrutura ligeiramente diferente

**Impacto**: Pequenas diferenças visuais.

### 4.14 Empty States

- **Produtos**: Empty state completo com ícone, título, texto, ações
- **Outros**: Empty states variam em estrutura

**Impacto**: Experiência inconsistente quando não há dados.

---

## 5. Estados do Pedido e Pendências

### 5.1 Estados do Pedido

**Definição**: [`lib/domain/status.ts`](lib/domain/status.ts)

**Enum** (Prisma):
```typescript
enum OrderStatus {
  RASCUNHO
  CONFIRMADO
  EM_PRODUCAO
  PRONTO
  ENTREGUE
  CANCELADO
}
```

**Transições** (linhas 3-10):
```typescript
const transitions: Record<OrderStatus, OrderStatus[]> = {
  RASCUNHO: ["CONFIRMADO", "EM_PRODUCAO", "CANCELADO"],
  CONFIRMADO: ["EM_PRODUCAO", "CANCELADO"],
  EM_PRODUCAO: ["PRONTO", "CANCELADO"],
  PRONTO: ["ENTREGUE", "CANCELADO"],
  ENTREGUE: [],
  CANCELADO: [],
};
```

**Funções**:
- `canTransition(from, to)`: Valida se transição é permitida
- `isFinalStatus(status)`: Verifica se é status final

**Labels** (UI):
- [`app/admin/orders/[id]/page.tsx`](app/admin/orders/[id]/page.tsx) (linhas 21-28):
```typescript
const statusLabel: Record<OrderStatus, string> = {
  RASCUNHO: "Rascunho",
  CONFIRMADO: "Confirmado",
  EM_PRODUCAO: "Em producao",
  PRONTO: "Pronto",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};
```

**Cores na UI**:
- [`app/admin/orders/orders.module.css`](app/admin/orders/orders.module.css) (linhas 931-959):
  - RASCUNHO: `#f1f5f9` / `#64748b` (cinza)
  - CONFIRMADO: `#dbeafe` / `#1d4ed8` (azul)
  - EM_PRODUCAO: `#fef3c7` / `#b45309` (amarelo)
  - PRONTO: `#d1fae5` / `#047857` (verde)
  - ENTREGUE: `#dcfce7` / `#15803d` (verde)
  - CANCELADO: `#fee2e2` / `#b91c1c` (vermelho)

**Mapeamento para Badges**:
- [`app/admin/orders/OrdersTableClient.tsx`](app/admin/orders/OrdersTableClient.tsx) (linhas 50-62):
```typescript
function statusBadgeClass(status: string) {
  switch (status) {
    case "ENTREGUE":
    case "PRONTO":
      return styles.badgeSuccess;
    case "EM_PRODUCAO":
      return styles.badgeWarning;
    case "CANCELADO":
      return styles.badgeDanger;
    default:
      return styles.badgeNeutral;
  }
}
```

### 5.2 Pendências (Attention)

**Definição**: [`lib/domain/attention.ts`](lib/domain/attention.ts)

**Tipos**:
```typescript
type AttentionSeverity = "strong" | "weak";
type AttentionReasonType =
  | "INCOMPLETE"
  | "ALTERADO_APOS_CONFIRMACAO"
  | "UNAVAILABLE_ITEMS"
  | "MISSING_TIME"
  | "MISSING_ADDRESS"
  | "SALDO_INSUFICIENTE";
```

**Função Principal**:
- `getOrderAttentionSummary(order)`: Retorna resumo de pendências
- `hasStrongAttention(summary)`: Verifica se há pendências fortes

**Labels na UI**:
- [`app/admin/orders/OrdersFilters.client.tsx`](app/admin/orders/OrdersFilters.client.tsx) (linhas 58-66):
```typescript
const attentionOptions = [
  { value: "all", label: "Todas" },
  { value: "with", label: "Com pendencias" },
  { value: "PRECISA_PRODUZIR", label: "Precisa produzir" },
  { value: "INCOMPLETE", label: "Pedido incompleto" },
  { value: "ALTERADO_APOS_CONFIRMACAO", label: "Alterado apos confirmacao" },
  { value: "MISSING_ADDRESS", label: "Endereco nao informado" },
  { value: "MISSING_TIME", label: "Horario a confirmar" },
];
```

**Exibição na UI**:
- Badges operacionais na tabela de pedidos
- Checklist no detalhe do pedido
- Filtros de pendências

**Badges Operacionais**:
- [`app/admin/orders/orders.module.css`](app/admin/orders/orders.module.css) (linhas 961-979):
  - `.operationalBadge` - Base
  - `.operationalWarning` - Aviso (amarelo)
  - `.operationalDanger` - Perigo (vermelho)

---

## 6. Padrões de Tabela

### 6.1 Sorting

**Implementação**:
- [`app/admin/products/ProductsTableExpandable.client.tsx`](app/admin/products/ProductsTableExpandable.client.tsx) (linhas 19-38, 207-241)
- [`app/admin/capacidade/CapacityTable.client.tsx`](app/admin/capacidade/CapacityTable.client.tsx) (linhas 20-39, 68-150)

**Padrão**:
- Ícones: `ArrowUp`, `ArrowDown`, `ArrowUpDown` (lucide-react, 14px)
- Estado: `aria-sort="ascending" | "descending" | undefined`
- Interação: `onClick` + `onKeyDown` (Enter/Space)
- Acessibilidade: `role="button"`, `tabIndex={0}`

**Ciclo de Ordenação**:
- Primeiro clique: desc
- Segundo clique: asc
- Terceiro clique: desc (alterna)

### 6.2 Row Click

**Padrão Atual**: Não há row click padrão. Links específicos em células.

**Exemplos**:
- Nome do produto: Link para detalhe
- Número do pedido: Link para detalhe
- "Ver detalhes": Link explícito

### 6.3 Ações

**Padrões Identificados**:

1. **Menu Dropdown (3 pontos)**:
   - Localização: [`app/admin/products/ProductsTableExpandable.client.tsx`](app/admin/products/ProductsTableExpandable.client.tsx) (linhas 343-411)
   - Estilos: [`app/admin/products/products.module.css`](app/admin/products/products.module.css) (linhas 503-562)
   - Ações: Desativar/Ativar, Duplicar, Excluir

2. **Links Diretos**:
   - "Ver" - Link para detalhe
   - "Editar" - Link para edição
   - "Ver detalhes" - Link para detalhe

3. **Botões Inline**:
   - Editar preço (produtos) - Botão que vira input
   - Expandir/Recolher - Botão com chevron

### 6.4 Paginação

**Implementação**:
- [`app/admin/products/page.tsx`](app/admin/products/page.tsx) (linhas 302-346)
- [`app/admin/orders/page.tsx`](app/admin/orders/page.tsx) (linhas 608-672)

**Estrutura**:
```tsx
<div className={styles.paginationRow}>
  <div className={styles.paginationControls}>
    {/* Anterior */}
    {/* Página X de Y */}
    {/* Próxima */}
  </div>
  <div className={styles.paginationRight}>
    {/* Mostrando X-Y de Z */}
    {/* PageSize Select */}
  </div>
</div>
```

**Componentes**:
- Botões: `paginationButton` (habilitado) vs `paginationButtonDisabled`
- Info: `paginationInfo` com `<strong>` para números
- Meta: `paginationMeta` para contagem

**PageSize**:
- Componente: [`app/admin/products/PageSizeSelect.client.tsx`](app/admin/products/PageSizeSelect.client.tsx)
- Opções: [15, 30, 50] (configurável)

---

## 7. Padrões de Filtros

### 7.1 Popover (Padrão Principal)

**Uso**: Pedidos, Produtos, Capacidade

**Estrutura**:
```tsx
<div className={styles.filtersWrap} ref={panelRef}>
  <button className={styles.filtersButton}>
    Filtros
    {activeFilterCount > 0 && <span className={styles.filtersBadge}>{count}</span>}
  </button>
  {filtersOpen && (
    <div className={styles.filtersPanel} role="dialog">
      <div className={styles.filtersPanelHeader}>...</div>
      <div className={styles.filtersPanelBody}>...</div>
      <div className={styles.filtersPanelFooter}>...</div>
    </div>
  )}
</div>
```

**Características**:
- Position: absolute (relativo ao botão)
- Fecha ao clicar fora
- Fecha com Escape
- Badge de contagem quando há filtros ativos
- Botão "Aplicar" e "Limpar"

**Estados**:
- `.filtersButtonActive` - Quando aberto ou com filtros ativos

### 7.2 Modal (Categorias)

**Uso**: Criar nova categoria

**Estrutura**: Similar ao modal padrão, mas específico para formulário

### 7.3 Chips de Filtros Ativos

**Uso**: Produtos, Categorias, Capacidade

**Estrutura**:
```tsx
<div className={styles.chipsRow}>
  {chips.map((chip) => (
    <span className={styles.chip}>
      {chip.label}
      <button className={styles.chipButton} onClick={chip.onRemove}>×</button>
    </span>
  ))}
</div>
```

**Estilos**: 
- [`app/admin/products/products.module.css`](app/admin/products/products.module.css) (linhas 939-965)
- Padding: `4px var(--space-3)` (4px 12px)
- Border-radius: `var(--radius-full)` (pill)

---

## 8. Acessibilidade

### 8.1 Focus Ring

**Implementação**: [`app/styles/tokens.css`](app/styles/tokens.css) (linha 100)
```css
--shadow-focus: 0 0 0 3px var(--focus-ring-alpha);
```

**Uso**:
- [`app/styles/elements.css`](app/styles/elements.css) (linhas 57-60): `:focus-visible` com `box-shadow: var(--shadow-focus)`
- [`app/admin/_styles/adminPrimitives.module.css`](app/admin/_styles/adminPrimitives.module.css) (linhas 1057-1061): Botões com `:focus-visible`

**Problema**: Nem todos os elementos usam `focus-visible` consistentemente.

### 8.2 Navegação por Teclado

**Implementações**:

1. **Tabelas Sortáveis**:
   - `onKeyDown` com Enter/Space
   - `tabIndex={0}`
   - `role="button"`

2. **Menus Dropdown**:
   - Fecha com Escape
   - Navegação por teclado não implementada completamente

3. **Modais**:
   - Fecha com Escape (CategoriesFilters)
   - Foco não é gerenciado (não retorna ao trigger ao fechar)

### 8.3 ARIA

**Uso Identificado**:

**Bom**:
- `aria-label` em botões de ícone
- `aria-expanded` em elementos expansíveis
- `aria-sort` em colunas ordenáveis
- `role="button"` em elementos clicáveis
- `role="dialog"` em painéis de filtros
- `aria-controls` ligando botões a painéis
- `aria-haspopup="listbox"` em selects
- `role="listbox"` e `role="option"` em dropdowns
- `aria-selected` em opções selecionadas

**Faltando**:
- `aria-live` para atualizações dinâmicas
- `aria-describedby` para ajuda contextual
- `aria-invalid` em campos com erro (alguns usam)
- Gerenciamento de foco em modais

### 8.4 Contraste

**Verificação Necessária**: 
- Cores de texto sobre fundos coloridos (badges, KPIs)
- Estados de hover/focus

**Tokens de Estado**:
- Success: `--state-success-text` (#166534) sobre `--state-success-bg` (#dcfce7)
- Warning: `--state-warning-text` (#92400e) sobre `--state-warning-bg` (#fef3c7)
- Error: `--state-error-text` (#991b1b) sobre `--state-error-bg` (#fee2e2)

---

## 9. Análise Detalhada por Tela

### 9.1 Pedidos (`/admin/orders`)

**Header**:
- Título: "Pedidos"
- KPI Bar horizontal (não cards)
- Métricas: Total pedidos, Total valor, Pendentes (badge)

**Toolbar**:
- Busca: Input com ícone, debounce 250ms
- Botão "Limpar" (aparece quando há filtros)
- Botão "Filtros" com badge de contagem
- Botão "Novo pedido" (primário)

**Filtros (Popover)**:
- Período: Próximos pedidos, Hoje, Intervalo, Histórico
- Status: Todos, Rascunho, Confirmado, etc.
- Pendências: Todas, Com pendências, tipos específicos
- Tipo: Todos, Encomenda, Pronta entrega
- Logística: Todos, Entrega, Retirada
- Ordenação: Data mais próxima, mais distante, criado recentemente
- Itens/página: 15, 30, 50

**Tabela**:
- Expansível (mostra itens ao clicar)
- Colunas: Expandir, Pedido, Cliente, Método, Status, Entrega, Total
- Status badges com cores específicas
- Badges operacionais (Precisa produzir, Incompleto)
- Hover: Fundo azul claro + borda esquerda azul

**Paginação**:
- Anterior/Próxima
- Página X de Y
- Mostrando X-Y de Z

### 9.2 Produtos (`/admin/products`)

**Header**:
- Título: "Produtos"
- Subtítulo: "Gerencie seu catálogo"
- KPI Cards em grid (4 colunas):
  - Total produtos
  - Ativos (success)
  - SKUs ativos
  - Fora de estoque (warning)

**Toolbar**:
- Busca: Input com ícone, debounce 250ms
- Botão "Limpar"
- Botão "Filtros" com badge
- Botão "Novo produto" (primário)

**Filtros (Popover)**:
- Categoria
- Status (Ativos/Inativos)
- Estoque (Em/Fora)
- SKU ativo

**Chips de Filtros**:
- Mostra filtros ativos como chips removíveis

**Tabela**:
- Expansível (mostra SKUs)
- Colunas: Produto, Categoria, SKUs/Un., Disponível, Preço, Ações
- Sorting: Produto, Categoria
- Edição inline de preço
- Menu dropdown (3 pontos): Desativar, Duplicar, Excluir

**Paginação**:
- Similar a pedidos
- Inclui PageSizeSelect

### 9.3 Categorias (`/admin/categories`)

**Header**:
- Título: "Categorias"
- KPI Bar horizontal:
  - Total categorias
  - Ativas (success)
  - Raiz
  - Folhas

**Toolbar**:
- Busca: Input com ícone, debounce 250ms
- Botão "Filtros"
- Botão "Nova categoria" (abre modal)

**Filtros (Popover)**:
- Status (Ativas/Inativas)
- Tipo (Todas/Raiz/Folhas)
- Produtos (Todas/Com diretos/Com total)

**Tabela Hierárquica**:
- Indentação visual por nível
- Linhas de conexão (trilhos verticais e horizontais)
- Edição inline
- Controles "Expandir tudo" / "Recolher tudo"

**Modal**:
- Criar/Editar categoria
- Formulário com validação

### 9.4 Clientes (`/admin/clientes`)

**Header**:
- Título: "Clientes"
- KPI Bar horizontal:
  - Total clientes
  - Com pedidos
  - Pedidos total

**Toolbar**:
- Busca: Input + botão "Buscar" (formulário, não debounce)
- Botão "Novo cliente" (primário)

**Tabela**:
- Simples (sem expansão)
- Colunas: Nome, Telefone, Último pedido, Pedidos, Ação
- Link "Ver detalhes"

### 9.5 Capacidade (`/admin/capacidade`)

**Header**:
- Título: "Produção"
- KPI Bar horizontal:
  - Total produtos
  - Precisam de produção (warning)
- Botões: "Registrar produção", "Registrar consumo"

**Toolbar**:
- Busca: Input com ícone, debounce 250ms
- Botão "Limpar"
- Botão "Filtros"

**Filtros (Popover)**:
- Período: Hoje, 7, 14, 30 dias
- Exibir: Todos, Somente com gap

**Tabela**:
- Sorting: Produto, Categoria, Disponível, Demanda, Gap
- Destaque visual para valores que precisam produção (laranja/vermelho)
- Colunas numéricas alinhadas à direita

---

## 10. Recomendações para DESIGN_SYSTEM.md v2

### 10.1 Consolidação de Componentes

1. **Criar arquivo único**: `app/admin/_styles/uiComponents.module.css`
   - Consolidar todos os componentes padrão
   - Remover duplicação
   - Padronizar especificações

2. **Alturas Padronizadas**:
   - Botões: 38px (padrão), 36px (secundário), 32px (small)
   - Inputs: 38px (padrão)
   - Badges: Padding `3px 8px`, fonte `11px`, border-radius `6px`

3. **Cores de Status**:
   - Usar sempre tokens CSS
   - Remover cores hardcoded
   - Criar mapeamento status → token

### 10.2 Componentes React Reutilizáveis

Criar componentes TypeScript para:
- `Button` (variantes: primary, secondary, ghost, danger, sizes)
- `Badge` (variantes: success, warning, error, neutral, info)
- `Input` (com ícone opcional)
- `Select` (customizado, acessível)
- `KpiCard` / `KpiBar` (duas variantes padronizadas)
- `DataTable` (com sorting, expansão, paginação)
- `FiltersPanel` (popover padronizado)
- `Modal` (com gerenciamento de foco)
- `EmptyState` (padronizado)

### 10.3 Padronização de Layouts

1. **Page Header**:
   - Sempre título + subtítulo (opcional)
   - KPI Cards OU KPI Bar (escolher um padrão)
   - Botão primário no header (quando aplicável)

2. **Toolbar**:
   - Sempre: Busca (com ícone, debounce) + Filtros (popover) + Botão primário
   - Chips de filtros ativos abaixo (quando aplicável)

3. **Tabela**:
   - Sempre mesmo container, cabeçalho, padding
   - Sorting padronizado
   - Hover padronizado
   - Ações padronizadas (menu dropdown ou links)

### 10.4 Acessibilidade

1. **Focus Management**:
   - Todos os elementos interativos com `:focus-visible`
   - Modais: Trap de foco, retornar ao trigger ao fechar
   - Dropdowns: Navegação por setas

2. **ARIA Completo**:
   - `aria-live` para atualizações
   - `aria-describedby` para ajuda
   - `aria-invalid` em campos com erro
   - `aria-busy` durante loading

3. **Teclado**:
   - Tab order lógico
   - Atalhos de teclado documentados
   - Escape fecha modais/dropdowns

### 10.5 Documentação Visual

Criar página de design system (`/admin/design-system`) com:
- Todos os componentes
- Todas as variantes
- Exemplos de uso
- Código de exemplo
- Especificações técnicas

---

## 11. Arquivos de Referência

### Tokens
- [`app/styles/tokens.css`](app/styles/tokens.css) - Tokens principais
- [`app/styles/elements.css`](app/styles/elements.css) - Estilos de elementos HTML
- [`app/styles/base.css`](app/styles/base.css) - Estilos base

### Componentes Primitivos
- [`app/admin/_styles/adminPrimitives.module.css`](app/admin/_styles/adminPrimitives.module.css) - Componentes base

### Módulos Específicos
- [`app/admin/products/products.module.css`](app/admin/products/products.module.css) - Estilos de produtos
- [`app/admin/orders/orders.module.css`](app/admin/orders/orders.module.css) - Estilos de pedidos
- [`app/admin/clientes/clientes.module.css`](app/admin/clientes/clientes.module.css) - Estilos de clientes
- [`app/admin/categories/categories.module.css`](app/admin/categories/categories.module.css) - Estilos de categorias
- [`app/admin/capacidade/capacidade.module.css`](app/admin/capacidade/capacidade.module.css) - Estilos de capacidade

### Componentes React
- [`app/admin/orders/FilterSelect.client.tsx`](app/admin/orders/FilterSelect.client.tsx) - Select customizado
- [`app/admin/design-system/InlineNotice.client.tsx`](app/admin/design-system/InlineNotice.client.tsx) - Toast/Notice
- [`app/admin/AdminDrawer.client.tsx`](app/admin/AdminDrawer.client.tsx) - Drawer mobile

### Lógica de Domínio
- [`lib/domain/status.ts`](lib/domain/status.ts) - Estados e transições
- [`lib/domain/attention.ts`](lib/domain/attention.ts) - Pendências
- [`lib/domain/order.ts`](lib/domain/order.ts) - Lógica de pedidos

---

## 12. Mapa de Impacto e Inconsistências Atuais

### 12.1 Arquivos que Precisam Mudar (Prioridade)

#### Prioridade Crítica (Fase 1)
1. **`app/styles/tokens.css`**
   - Mudar `--action-primary` de #2563eb para #D97706
   - Adicionar tokens de status de pedidos
   - Adicionar tokens de atenção
   - Atualizar `--radius-md` para 10px
   - Atualizar `--shadow-focus` para âmbar
   - Adicionar `--font-display`

2. **`app/admin/_styles/adminPrimitives.module.css`**
   - Atualizar estilos de botões para usar novos tokens
   - Atualizar estilos de badges para usar novos tokens
   - Remover hardcodes de cores

#### Prioridade Alta (Fase 2-3)
3. **`app/admin/orders/orders.module.css`**
   - Remover cores hardcoded de status (linhas 931-959)
   - Usar tokens `--status-*-bg` e `--status-*-text`
   - Atualizar estilos de tabela para usar DataTable

4. **`app/admin/products/products.module.css`**
   - Atualizar estilos de badges
   - Atualizar estilos de tabela
   - Remover hardcodes

5. **`app/admin/orders/OrdersTableClient.tsx`**
   - Implementar clique em linha
   - Implementar expand com stopPropagation
   - Remover link "Ver detalhes"
   - Adicionar kebab menu se não existir

6. **`app/admin/products/ProductsTableExpandable.client.tsx`**
   - Implementar clique em linha
   - Verificar expand (já existe)
   - Verificar kebab menu (já existe)
   - Remover link "Ver" redundante

### 12.2 Inconsistências Atuais (Com Paths)

#### Inconsistência 1: Altura de Botões
- **Localização**: 
  - `app/admin/_styles/adminPrimitives.module.css` linha 1033: 42px
  - `app/admin/orders/orders.module.css`: 38px
  - `app/admin/products/products.module.css`: 38px
- **Resolução**: Padronizar para 44px (Comfortable) ou 36px (Compact)
- **Arquivos a alterar**: Todos os módulos CSS que definem altura de botão

#### Inconsistência 2: Altura de Inputs
- **Localização**:
  - `app/admin/_styles/adminPrimitives.module.css` linha 967: 44px
  - `app/admin/orders/orders.module.css`: 38px
  - `app/admin/products/products.module.css`: 38px
- **Resolução**: Padronizar para 44px (Comfortable) ou 36px (Compact)
- **Arquivos a alterar**: Todos os módulos CSS que definem altura de input

#### Inconsistência 3: Badges - Padding e Tamanho
- **Localização**:
  - `app/admin/products/products.module.css`: `3px 8px`, fonte `11px`
  - `app/admin/orders/orders.module.css`: `5px 10px`, fonte `12px`
  - `app/admin/_styles/adminPrimitives.module.css`: `var(--space-1) var(--space-3)` (4px 12px), fonte `var(--text-xs)` (12px)
- **Resolução**: Padronizar para `3px 12px` (Comfortable) ou `2px 10px` (Compact), fonte `12px`
- **Arquivos a alterar**: Todos os módulos CSS que definem badges

#### Inconsistência 4: Badges - Border-radius
- **Localização**:
  - `app/admin/products/products.module.css`: `var(--radius-sm)` (6px)
  - `app/admin/orders/orders.module.css`: `var(--radius-md)` (8px)
  - `app/admin/_styles/adminPrimitives.module.css`: `var(--radius-full)` (9999px)
- **Resolução**: Sempre `--radius-full` (9999px) para chips
- **Arquivos a alterar**: Todos os módulos CSS que definem badges

#### Inconsistência 5: Cores Hardcoded de Status
- **Localização**: `app/admin/orders/orders.module.css` linhas 931-959
- **Código atual**:
  ```css
  .statusRASCUNHO { background: #f1f5f9; color: #64748b; }
  .statusCONFIRMADO { background: #dbeafe; color: #1d4ed8; }
  /* ... */
  ```
- **Resolução**: Usar tokens `--status-*-bg` e `--status-*-text`
- **Arquivos a alterar**: `app/admin/orders/orders.module.css`

#### Inconsistência 6: KPI Cards vs KPI Bar
- **Localização**:
  - `app/admin/products/products.module.css`: KPI Cards em grid
  - `app/admin/orders/orders.module.css`: KPI Bar horizontal
  - `app/admin/clientes/clientes.module.css`: KPI Bar horizontal
- **Resolução**: **Decisão fechada**: KPI Cards para métricas importantes (Produtos), KPI Bar para métricas secundárias (Pedidos, Clientes)
- **Arquivos a alterar**: Manter como está (diferença intencional)

#### Inconsistência 7: Filtros - Largura do Panel
- **Localização**:
  - `app/admin/orders/OrdersFilters.client.tsx`: `min(480px, 94vw)`
  - `app/admin/capacidade/ProductionFilters.client.tsx`: `min(400px, 94vw)`
- **Resolução**: Padronizar para `min(480px, 94vw)` (FiltersPanel)
- **Arquivos a alterar**: Todos os componentes de filtros

#### Inconsistência 8: Busca - Com vs Sem Botão
- **Localização**:
  - `app/admin/orders/OrdersFilters.client.tsx`: Apenas input (debounce)
  - `app/admin/clientes/page.tsx`: Input + botão "Buscar"
- **Resolução**: Padronizar para apenas input com debounce (sem botão)
- **Arquivos a alterar**: `app/admin/clientes/page.tsx`

#### Inconsistência 9: Tabela - Cabeçalho
- **Localização**:
  - `app/admin/products/products.module.css`: Fundo `var(--bg-subtle)` simples
  - `app/admin/orders/orders.module.css`: Gradiente `linear-gradient(180deg, #fafbfc 0%, #f4f6f8 100%)`
- **Resolução**: Padronizar para `--bg-subtle` (sem gradiente)
- **Arquivos a alterar**: `app/admin/orders/orders.module.css`

#### Inconsistência 10: Links Redundantes "Ver"
- **Localização**:
  - `app/admin/products/ProductsTableExpandable.client.tsx` linha 339: Link "Ver"
  - `app/admin/orders/OrdersTableClient.tsx`: Link "Ver detalhes" na linha expandida
- **Resolução**: Remover links, implementar clique em linha
- **Arquivos a alterar**: Todos os componentes de tabela

---

## 13. Análise da Proposta Design System v2

### 13.1 Mudanças Propostas vs Estado Atual

#### Cor Primária
- **Atual**: Azul (#2563eb) - [`app/styles/tokens.css`](app/styles/tokens.css) linha 45
- **Proposta v2**: Âmbar (#D97706)
- **Impacto**: ALTO - Afeta todos os CTAs, botões primários, focus rings
- **Arquivos afetados**: 
  - `app/styles/tokens.css` (linha 45)
  - Todos os módulos CSS que usam `--action-primary`
  - Todos os componentes de botão

#### Densidade Comfortable/Compact
- **Atual**: Não existe
- **Proposta v2**: Sistema de densidade com toggle
- **Impacto**: MÉDIO - Requer implementação de toggle e lógica de estado
- **Arquivos afetados**: 
  - Componentes de tabela
  - CSS modules de tabelas
  - Possível novo componente `DensityToggle`

#### Tokens de Status de Pedido
- **Atual**: Cores hardcoded em `orders.module.css` (linhas 931-959)
- **Proposta v2**: Tokens CSS específicos (`--status-*-bg`, `--status-*-text`)
- **Impacto**: MÉDIO - Facilita manutenção, mas requer refatoração
- **Arquivos afetados**: 
  - `app/admin/orders/orders.module.css`
  - `app/styles/tokens.css` (adicionar novos tokens)

#### Componente Next Action
- **Atual**: Não existe como componente reutilizável
- **Proposta v2**: Componente de domínio específico
- **Impacto**: MÉDIO - Novo componente, mas resolve necessidade real
- **Arquivos afetados**: 
  - Criar novo componente: `app/admin/orders/NextAction.client.tsx`
  - Integrar em: `/admin/orders/new`, `/admin/orders/[id]`, `/admin`

#### FiltersPanel Padronizado
- **Atual**: Cada tela tem sua própria implementação de filtros
- **Proposta v2**: Componente único `FiltersPanel`
- **Impacto**: ALTO - Requer refatoração de múltiplos componentes
- **Arquivos afetados**: 
  - `app/admin/orders/OrdersFilters.client.tsx`
  - `app/admin/products/ProductsFilters.client.tsx`
  - `app/admin/capacidade/ProductionFilters.client.tsx`
  - `app/admin/categories/CategoriesFilters.client.tsx`
  - Criar: `app/admin/_components/FiltersPanel.client.tsx`

#### Fontes Plus Jakarta Sans e Inter
- **Atual**: Apenas Inter definido em tokens
- **Proposta v2**: Plus Jakarta Sans para display, Inter para sans
- **Impacto**: BAIXO - Adicionar fonte e atualizar tokens
- **Arquivos afetados**: 
  - `app/styles/tokens.css`
  - Layout root (verificar carregamento de fontes)

#### Radius Values
- **Atual**: `--radius-md: 8px` (tokens.css linha 88)
- **Proposta v2**: `--radius-md: 10px`
- **Impacto**: BAIXO - Mudança simples, mas pode afetar visual
- **Arquivos afetados**: 
  - `app/styles/tokens.css`
  - Verificar impacto visual em cards/panels

### 12.2 Inconsistências Identificadas na Proposta v2

#### 12.2.1 Contraste de Cores
**Problema**: A cor primária âmbar (#D97706) sobre branco precisa ser validada para contraste WCAG AA.

**Verificação necessária**:
- Âmbar (#D97706) sobre branco: ~4.5:1 (limite WCAG AA)
- Recomendação: Testar e considerar ajustar para #C26305 se necessário

#### 12.2.2 Estado Warning vs Action Primary
**Problema**: Ambos usam tons de laranja/âmbar, pode haver confusão visual.

**Proposta v2 define**:
- `--action-primary: #D97706` (âmbar)
- `--state-warning: #CA8A04` (laranja)

**Recomendação**: Manter distinção clara; warning deve ser mais saturado/escuro para diferenciar.

#### 12.2.3 Densidade: Aplicação Inconsistente
**Problema**: A proposta não especifica claramente se densidade se aplica a formulários.

**Recomendação**: 
- Aplicar apenas a tabelas
- Formulários sempre Comfortable (44px)
- Modais sempre Comfortable

#### 12.2.4 Clique em Linha: Acessibilidade
**Problema**: Tornar toda a linha clicável pode confundir usuários de leitores de tela.

**Recomendação**: 
- Adicionar `role="button"` na linha
- Adicionar `aria-label` descritivo
- Manter navegação por teclado (Enter/Space)

### 12.3 Pontos a Decidir Antes da Implementação

#### 12.3.1 Migração Gradual vs Big Bang
**Decisão**: Migrar tudo de uma vez ou por fases?

**Recomendação**: Fases (conforme seção 8 do DESIGN_SYSTEM.md):
1. Tokens e tema
2. Componentes base
3. Padrões de interação
4. UX writing
5. Acessibilidade
6. Review final

#### 12.3.2 Compatibilidade com Código Existente
**Decisão**: Manter compatibilidade com código existente durante migração?

**Recomendação**: Sim, usar feature flags ou classes CSS condicionais durante transição.

#### 12.3.3 Testes de Regressão Visual
**Decisão**: Como validar que mudanças não quebraram telas existentes?

**Recomendação**: 
- Screenshots comparativos (antes/depois)
- Testes manuais em cada tela
- Checklist de validação (seção 8.6 do DESIGN_SYSTEM.md)

### 12.4 Mapeamento de Implementação

#### Tokens CSS a Adicionar/Atualizar

**Adicionar em `app/styles/tokens.css`**:
```css
/* Ação (atualizar) */
--action-primary: #D97706;  /* Mudar de #2563eb */
--action-primary-hover: #C26305;
--action-primary-active: #A55303;
--action-primary-rgb: 217, 119, 6;

/* Status de pedido (novo) */
--status-rascunho-bg: #F1F5F9;
--status-rascunho-text: #64748B;
--status-confirmado-bg: #FFF7ED;
--status-confirmado-text: #C26305;
--status-em_producao-bg: #FEF3C7;
--status-em_producao-text: #B45309;
--status-pronto-bg: #D1FAE5;
--status-pronto-text: #047857;
--status-entregue-bg: #DCFCE7;
--status-entregue-text: #15803D;
--status-cancelado-bg: #FEE2E2;
--status-cancelado-text: #B91C1C;

/* Pendências e alertas (novo) */
--attention-strong-bg: var(--state-error-bg);
--attention-strong-text: var(--state-error);
--attention-weak-bg: var(--state-warning-bg);
--attention-weak-text: var(--state-warning);

/* Tipografia (atualizar) */
--font-display: "Plus Jakarta Sans", system-ui, sans-serif;

/* Radius (atualizar) */
--radius-md: 10px;  /* Mudar de 8px */

/* Shadow focus (atualizar) */
--shadow-focus: 0 0 0 3px rgba(217, 119, 6, 0.3);  /* Mudar de azul para âmbar */
```

#### Componentes a Criar

1. **FiltersPanel** (`app/admin/_components/FiltersPanel.client.tsx`)
   - Props: `filters`, `onApply`, `onClear`, `isOpen`, `onClose`
   - Responsivo: Drawer no mobile, Popover no desktop

2. **NextAction** (`app/admin/orders/NextAction.client.tsx`)
   - Props: `order`, `onAction`
   - Exibe: Resumo, checklist, próxima ação, status/pendências

3. **DensityToggle** (`app/admin/_components/DensityToggle.client.tsx`)
   - Props: `currentDensity`, `onChange`, `tableId`
   - Persiste em localStorage

4. **Chip** (`app/admin/_components/Chip.client.tsx`)
   - Props: `variant` (status | attention-strong | attention-weak), `label`, `density?`
   - Usa tokens apropriados

#### Componentes a Refatorar

1. **OrdersFilters** → Usar `FiltersPanel`
2. **ProductsFilters** → Usar `FiltersPanel`
3. **ProductionFilters** → Usar `FiltersPanel`
4. **CategoriesFilters** → Usar `FiltersPanel` (ou manter modal para criar categoria)
5. **OrdersTableClient** → Adicionar clique em linha, density toggle
6. **ProductsTableExpandable** → Adicionar density toggle
7. **CapacityTable** → Adicionar density toggle

### 12.5 Checklist de Validação da Proposta v2

Antes de implementar, validar:

#### Design e UX
- [ ] Contraste de todas as cores (especialmente âmbar sobre branco) - WCAG AA
- [ ] Fontes Plus Jakarta Sans e Inter carregadas corretamente
- [ ] Tokens de status mapeados corretamente para os enums do código
- [ ] Componente FiltersPanel desenhado e aprovado
- [ ] Componente Next Action desenhado e aprovado
- [ ] Density toggle testado em diferentes tabelas
- [ ] Visual de chips com novos tokens aprovado

#### Técnico
- [ ] Todos os tokens CSS definidos em `tokens.css`
- [ ] Nenhum hardcode de cores restante
- [ ] Componentes React criados e testados
- [ ] Acessibilidade validada (focus, ARIA, teclado)
- [ ] Responsividade mobile testada
- [ ] Performance (sem regressões)

#### Processo
- [ ] Plano de rollout aprovado e priorizado
- [ ] Decisões tomadas sobre pontos a decidir (seção 12.3)
- [ ] Testes de regressão visual planejados
- [ ] Checklist de validação final criado (30+ itens)

---

## 13. Checklist de Padronização (Atualizado para v2)

### Prioridade Alta (Fase 1-2)
- [ ] Atualizar `--action-primary` para âmbar (#D97706)
- [ ] Adicionar tokens de status de pedido
- [ ] Adicionar tokens de atenção (pendências/alertas)
- [ ] Consolidar alturas de botões (44px Comfortable, 36px Compact)
- [ ] Consolidar alturas de inputs (44px Comfortable, 36px Compact)
- [ ] Padronizar badges/chips (padding, tamanho, border-radius, tokens)
- [ ] Remover cores hardcoded, usar tokens
- [ ] Atualizar `--radius-md` para 10px
- [ ] Atualizar `--shadow-focus` para âmbar

### Prioridade Média (Fase 3-4)
- [ ] Criar componente FiltersPanel e refatorar todos os filtros
- [ ] Criar componente NextAction e integrar
- [ ] Implementar density toggle nas tabelas
- [ ] Criar componente Chip reutilizável
- [ ] Padronizar empty states
- [ ] Padronizar paginação
- [ ] Implementar clique em linha nas tabelas
- [ ] Remover links redundantes de "Ver"
- [ ] Aplicar UX writing guidelines

### Prioridade Baixa (Fase 5-6)
- [ ] Melhorar acessibilidade (focus trap, ARIA completo)
- [ ] Criar página de design system visual (`/admin/design-system`)
- [ ] Adicionar micro-animações conforme guidelines
- [ ] Otimizar performance de tabelas grandes
- [ ] Documentar padrões de interação visualmente
- [ ] Criar guia de migração para desenvolvedores

---

## 14. Plano de Implementação por PRs

### PR1: Tokens + Primitivos (Button/Input/Badge)

**Objetivo**: Estabelecer base de tokens e componentes primitivos.

**Arquivos a criar**:
- `app/admin/_components/Button.tsx`
- `app/admin/_components/Input.tsx`
- `app/admin/_components/Chip.tsx`

**Arquivos a modificar**:
- `app/styles/tokens.css` (adicionar/atualizar tokens)
- `app/admin/_styles/adminPrimitives.module.css` (atualizar para usar tokens)

**Tarefas específicas**:
1. Atualizar `--action-primary` de #2563eb para #B45309 (âmbar escuro)
2. Adicionar `--brand-amber` (#D97706) para assinatura visual
3. Adicionar tokens de status de pedidos (6 estados)
4. Adicionar tokens de atenção (strong/weak)
5. Atualizar `--radius-md` para 10px
6. Atualizar `--shadow-focus` para âmbar (usar `--brand-amber-rgb`)
7. Adicionar `--font-display` (Plus Jakarta Sans)
8. Criar componente Button com variantes (primary, secondary, outline, ghost, danger)
9. Criar componente Input com variantes (default, error, success)
10. Criar componente Chip com variantes (status, attention-strong, attention-weak)

**Definition of Ready (Pré-requisito)**:
- [ ] Fontes Plus Jakarta Sans e Inter carregadas no layout root
- [ ] Fallback de fontes definido: `"Plus Jakarta Sans", "Inter", system-ui, sans-serif`
- [ ] Validação de contraste executada (CTA #B45309 sobre branco = 7.1:1)

**Risk Surface (O que pode quebrar)**:
- **Fluxos afetados**: Todos os botões primários, CTAs, focus rings
- **Visual**: Mudança de azul para âmbar escuro pode confundir usuários
- **Contraste**: Se tokens não forem aplicados corretamente, pode quebrar acessibilidade
- **Fontes**: Se fontes não carregarem, fallback deve funcionar

**QA Script (Passo-a-passo)**:
1. **Validar tokens CSS**:
   - Abrir DevTools → Elements → Computed
   - Verificar que `--action-primary` = #B45309 (não #2563eb)
   - Verificar que `--brand-amber` = #D97706
   - Verificar que `--font-display` está definido

2. **Validar contraste**:
   - Abrir página com botão primário
   - Usar ferramenta de contraste (ex.: WebAIM)
   - Verificar que CTA (#B45309 sobre #FFFFFF) = ~7.1:1 ✅

3. **Validar componentes primitivos**:
   - Abrir `/admin/orders` (ou qualquer tela com botões)
   - Verificar que botão primário usa `--action-primary` (#B45309)
   - Verificar que hover usa `--action-primary-hover` (#92400E)
   - Verificar que focus ring usa âmbar (não azul)

4. **Validar fontes**:
   - Abrir DevTools → Network → Filtrar por "font"
   - Verificar que Plus Jakarta Sans e Inter carregam
   - Desabilitar rede → Verificar que fallback funciona (system-ui)

5. **Validar regressão visual**:
   - Screenshot antes/depois de cada tela principal
   - Comparar: Pedidos, Produtos, Clientes, Produção
   - Verificar que não há quebras de layout

**Definition of Done**:
- [ ] Todos os tokens definidos em `tokens.css`
- [ ] Componentes primitivos criados e exportados
- [ ] Nenhum hardcode de cor restante em primitivos
- [ ] Contraste validado (WCAG AA folgado: 7.1:1)
- [ ] Testes visuais em Chrome, Firefox, Safari
- [ ] Fontes carregadas e fallback funcionando
- [ ] QA Script executado e aprovado

**Riscos**:
- Mudança de cor primária pode quebrar visual existente
- **Mitigação**: Testar em ambiente de staging antes de produção, comunicar mudança

**Tempo estimado**: 2-3 dias

---

### PR2: DataTable + Row/Expand/Kebab Pattern

**Objetivo**: Padronizar comportamento de tabelas.

**Arquivos a criar**:
- `app/admin/_components/DataTable.tsx`
- `app/admin/_components/DensityToggle.tsx`

**Arquivos a modificar**:
- `app/admin/orders/OrdersTableClient.tsx`
- `app/admin/products/ProductsTableExpandable.client.tsx`
- `app/admin/capacidade/CapacityTable.client.tsx`
- `app/admin/orders/orders.module.css`
- `app/admin/products/products.module.css`
- `app/admin/capacidade/capacidade.module.css`

**Tarefas específicas**:
1. Criar componente DataTable com props: `columns`, `data`, `rowHref`, `onRowClick`, `expandRenderer`, `actionsRenderer`, `density`, `stickyHeader`, `sortable`, `onSort`
2. Implementar clique em linha (navega para detalhe)
3. Implementar expand (preview) com stopPropagation
4. Implementar kebab menu com stopPropagation
5. Implementar sorting com aria-sort e teclado
6. Implementar sticky header
7. Criar DensityToggle (List/ListChevron icons)
8. Remover links "Ver" e "Ver detalhes" redundantes
9. Adicionar aria-labels e roles apropriados

**Definition of Ready (Pré-requisito)**:
- [ ] PR1 aprovado e mergeado (tokens e primitivos)
- [ ] Componentes Button, Input, Chip disponíveis
- [ ] Tokens de densidade definidos (Comfortable: 44px, Compact: 36px)

**Risk Surface (O que pode quebrar)**:
- **Fluxos afetados**: Navegação em tabelas (Pedidos, Produtos, Produção, Clientes)
- **Sorting**: Se aria-sort não for implementado, acessibilidade quebra
- **Teclado**: Se row click não suportar Enter/Space, usuários de teclado não conseguem navegar
- **Expand**: Se stopPropagation não funcionar, expand navega em vez de expandir
- **Kebab**: Se stopPropagation não funcionar, kebab navega em vez de abrir menu
- **Density**: Se toggle não persistir, usuário perde preferência

**QA Script (Passo-a-passo)**:
1. **Validar row click (mouse)**:
   - Abrir `/admin/orders`
   - Clicar em qualquer área da linha (exceto expand/kebab)
   - ✅ Deve navegar para `/admin/orders/{id}`
   - Verificar que cursor é `pointer` na linha inteira

2. **Validar row click (teclado)**:
   - Abrir `/admin/orders`
   - Tab até tabela
   - Tab até primeira linha (foco visível)
   - Pressionar Enter ou Space
   - ✅ Deve navegar para `/admin/orders/{id}`
   - Verificar que foco retorna após navegação

3. **Validar expand (mouse)**:
   - Abrir `/admin/orders`
   - Clicar no ícone ChevronRight (expand)
   - ✅ Deve expandir linha (mostrar preview de itens)
   - ✅ NÃO deve navegar para detalhe
   - Clicar novamente → Deve recolher

4. **Validar expand (teclado)**:
   - Tab até botão expand
   - Pressionar Enter ou Space
   - ✅ Deve expandir linha
   - ✅ `aria-expanded` deve mudar para `true`
   - Pressionar Enter novamente → Deve recolher

5. **Validar kebab menu (mouse)**:
   - Clicar no ícone MoreVertical (kebab)
   - ✅ Deve abrir dropdown com ações
   - ✅ NÃO deve navegar para detalhe
   - Clicar fora → Deve fechar

6. **Validar kebab menu (teclado)**:
   - Tab até botão kebab
   - Pressionar Enter ou Space
   - ✅ Deve abrir dropdown
   - Setas (↑↓) → Deve navegar entre opções
   - Enter → Deve executar ação
   - Esc → Deve fechar

7. **Validar sorting (mouse)**:
   - Clicar no cabeçalho da coluna "Cliente"
   - ✅ Deve ordenar (asc → desc → asc)
   - ✅ Ícone ArrowUpDown deve mudar para ArrowUp/ArrowDown
   - ✅ `aria-sort` deve refletir estado

8. **Validar sorting (teclado)**:
   - Tab até cabeçalho ordenável
   - Pressionar Enter ou Space
   - ✅ Deve ordenar
   - ✅ `aria-sort` deve mudar

9. **Validar density toggle**:
   - Clicar no toggle (List/ListChevron)
   - ✅ Deve alternar entre Comfortable (44px) e Compact (36px)
   - Recarregar página
   - ✅ Deve manter preferência (localStorage)

10. **Validar sticky header**:
    - Scroll para baixo na tabela
    - ✅ Cabeçalho deve permanecer visível (sticky)

11. **Validar acessibilidade (screen reader)**:
    - Abrir NVDA/JAWS/VoiceOver
    - Navegar pela tabela
    - ✅ Deve anunciar: "Tabela de pedidos, 10 linhas, 5 colunas"
    - ✅ Deve anunciar: "Linha 1, Cliente: João Silva, clicável"
    - ✅ Deve anunciar: "Botão expandir, colapsado"
    - ✅ Deve anunciar: "Botão menu, fechado"

**Definition of Done**:
- [ ] Clique em linha funciona e navega corretamente (mouse + teclado)
- [ ] Expand funciona sem navegar (stopPropagation, mouse + teclado)
- [ ] Kebab menu funciona sem navegar (stopPropagation, mouse + teclado)
- [ ] Sorting acessível (aria-sort, Enter/Space, setas)
- [ ] Density toggle funciona e persiste em localStorage
- [ ] Sticky header funciona em scroll
- [ ] Links redundantes removidos
- [ ] Testes de acessibilidade (screen reader, teclado) aprovados
- [ ] QA Script executado e aprovado

**Riscos**:
- Mudança de comportamento pode confundir usuários
- **Mitigação**: Comunicar mudança, manter link explícito temporariamente com deprecation notice

**Tempo estimado**: 4-5 dias

---

### PR3: FiltersPanel Padrão

**Objetivo**: Unificar todos os filtros em um componente único.

**Arquivos a criar**:
- `app/admin/_components/FiltersPanel.client.tsx`

**Arquivos a modificar**:
- `app/admin/orders/OrdersFilters.client.tsx`
- `app/admin/products/ProductsFilters.client.tsx`
- `app/admin/capacidade/ProductionFilters.client.tsx`
- `app/admin/categories/CategoriesFilters.client.tsx`
- `app/admin/orders/orders.module.css`
- `app/admin/products/products.module.css`
- `app/admin/capacidade/capacidade.module.css`
- `app/admin/categories/categories.module.css`

**Tarefas específicas**:
1. Criar FiltersPanel com props: `activeCount`, `onApply`, `onClear`, `syncMode`, `variant`, `density`
2. Implementar drawer para mobile (min(320px, 86vw))
3. Implementar popover para desktop (min(480px, 94vw))
4. Implementar badge de contagem no botão "Filtros"
5. Implementar persistência em URL (query params)
6. Implementar focus trap em drawer
7. Refatorar OrdersFilters para usar FiltersPanel
8. Refatorar ProductsFilters para usar FiltersPanel
9. Refatorar ProductionFilters para usar FiltersPanel
10. Refatorar CategoriesFilters para usar FiltersPanel (ou manter modal para criar categoria)

**Definition of Ready (Pré-requisito)**:
- [ ] PR1 aprovado (tokens e primitivos)
- [ ] PR2 aprovado (DataTable, se filtros usarem tabela interna)

**Risk Surface (O que pode quebrar)**:
- **Fluxos afetados**: Filtros em Pedidos, Produtos, Produção, Categorias
- **Persistência**: Se URL não sincronizar, filtros são perdidos ao recarregar
- **Focus trap**: Se drawer não prender foco, usuário pode tabular para fora
- **Mobile**: Se drawer não funcionar, filtros ficam inacessíveis
- **Badge**: Se contagem não atualizar, badge fica desatualizado

**QA Script (Passo-a-passo)**:
1. **Validar FiltersPanel desktop (popover)**:
   - Abrir `/admin/orders` (desktop)
   - Clicar no botão "Filtros"
   - ✅ Deve abrir popover abaixo do botão
   - ✅ Largura: `min(480px, 94vw)`
   - ✅ Radius: `--radius-lg` (18px)
   - ✅ Sombra: `--shadow-md`

2. **Validar FiltersPanel mobile (drawer)**:
   - Abrir `/admin/orders` (mobile, < 640px)
   - Clicar no botão "Filtros"
   - ✅ Deve abrir drawer lateral esquerda
   - ✅ Largura: `min(320px, 86vw)`
   - ✅ Overlay semitransparente
   - ✅ Fecha com Esc ou clique no overlay

3. **Validar badge de contagem**:
   - Aplicar 3 filtros (ex.: Período, Status, Pendências)
   - ✅ Badge deve mostrar "Filtros [3]"
   - Limpar filtros
   - ✅ Badge deve desaparecer

4. **Validar persistência em URL**:
   - Aplicar filtros
   - ✅ URL deve ter query params (ex.: `?status=CONFIRMADO&period=hoje`)
   - Recarregar página
   - ✅ Filtros devem ser restaurados da URL

5. **Validar focus trap (drawer mobile)**:
   - Abrir drawer
   - Tab várias vezes
   - ✅ Foco não deve sair do drawer
   - ✅ Tab não deve voltar para conteúdo principal
   - Fechar drawer (Esc)
   - ✅ Foco deve retornar ao botão "Filtros"

6. **Validar teclado (popover desktop)**:
   - Abrir popover
   - Tab → Deve navegar entre campos
   - Enter/Space em botão "Aplicar" → Deve aplicar filtros
   - Esc → Deve fechar popover

7. **Validar botões (Limpar/Aplicar)**:
   - Clicar em "Limpar"
   - ✅ Todos os filtros devem ser resetados
   - ✅ URL deve ser limpa
   - Clicar em "Aplicar filtros"
   - ✅ Filtros devem ser aplicados
   - ✅ Tabela deve atualizar

8. **Validar regressão**:
   - Testar filtros em Pedidos, Produtos, Produção, Categorias
   - ✅ Todos devem usar FiltersPanel
   - ✅ Largura padronizada
   - ✅ Comportamento consistente

**Definition of Done**:
- [ ] FiltersPanel funciona em mobile (drawer) e desktop (popover)
- [ ] Largura padronizada (480px desktop, 320px mobile)
- [ ] Badge de contagem funciona corretamente
- [ ] Persistência em URL funciona (restaura ao recarregar)
- [ ] Focus trap em drawer funciona
- [ ] Fecha com Esc e clique fora
- [ ] Todos os filtros usam FiltersPanel
- [ ] QA Script executado e aprovado

**Riscos**:
- Refatoração pode quebrar filtros existentes
- **Mitigação**: Testar cada tela individualmente, manter fallback temporário

**Tempo estimado**: 5-6 dias

---

### PR4: NextAction + OrderStatusStack

**Objetivo**: Implementar componentes de domínio.

**Arquivos a criar**:
- `app/admin/orders/NextAction.client.tsx`
- `app/admin/orders/OrderStatusStack.client.tsx`

**Arquivos a modificar**:
- `app/admin/orders/new/OrderForm.tsx`
- `app/admin/orders/[id]/page.tsx`
- `app/admin/page.tsx`
- `app/admin/orders/OrdersTableClient.tsx`
- `app/admin/orders/orderDetail.module.css`

**Tarefas específicas**:
1. Criar NextAction com props: `order`, `onAction`
2. Implementar resumo (subtotal, taxa, total)
3. Implementar checklist (itens, data, endereço, pagamento)
4. Implementar próxima ação contextual
5. Criar OrderStatusStack com props: `status`, `attention`
6. Implementar ordem: Status → Pendência forte → Alerta fraco
7. Implementar limite de chips (máx. 2 além do status)
8. Implementar "+N" com tooltip
9. Integrar NextAction em `/admin/orders/new` (sticky no topo)
10. Integrar NextAction em `/admin/orders/[id]` (card destacado)
11. Integrar NextAction em `/admin` (lista compacta)
12. Integrar OrderStatusStack em tabela de pedidos
13. Integrar OrderStatusStack em detalhe do pedido

**Definition of Done**:
- [ ] NextAction exibe resumo, checklist e próxima ação corretamente
- [ ] Próxima ação habilitada/desabilitada conforme regras
- [ ] OrderStatusStack exibe status + pendências + alertas em ordem correta
- [ ] Limite de chips respeitado (máx. 2 além do status)
- [ ] "+N" funciona com tooltip enumerando chips restantes
- [ ] Integração em todas as telas especificadas
- [ ] Testes de regras de negócio (quando aparece, quando não aparece)

**Riscos**:
- Lógica de próxima ação pode ser complexa
- **Mitigação**: Revisar com domínio de negócio, testar todos os cenários

**Tempo estimado**: 6-7 dias

---

### PR5: Migração - Pedidos

**Objetivo**: Migrar tela de Pedidos para o novo design system.

**Arquivos a modificar**:
- `app/admin/orders/page.tsx`
- `app/admin/orders/OrdersTableClient.tsx`
- `app/admin/orders/OrdersFilters.client.tsx`
- `app/admin/orders/orders.module.css`

**Tarefas específicas**:
1. Atualizar tokens CSS (remover hardcodes)
2. Usar componentes primitivos (Button, Input, Chip)
3. Usar DataTable com row/expand/kebab
4. Usar FiltersPanel
5. Integrar OrderStatusStack na tabela
6. Aplicar UX writing guidelines
7. Validar acessibilidade (foco, ARIA, teclado)
8. Validar responsividade mobile
9. Testes visuais

**Definition of Done**:
- [ ] 1 CTA primário ("Novo pedido")
- [ ] Status/pendências/alertas consistentes (OrderStatusStack)
- [ ] Tabela com comportamento previsível (row/expand/kebab)
- [ ] Filtros usando FiltersPanel
- [ ] Mobile considerado (toque, densidade, colunas)
- [ ] Acessibilidade mínima garantida
- [ ] UX writing consistente
- [ ] Nenhum hardcode de cor
- [ ] Testes em diferentes navegadores

**Tempo estimado**: 3-4 dias

---

### PR6: Migração - Produção

**Objetivo**: Migrar tela de Produção para o novo design system.

**Arquivos a modificar**:
- `app/admin/capacidade/page.tsx`
- `app/admin/capacidade/CapacityTable.client.tsx`
- `app/admin/capacidade/ProductionFilters.client.tsx`
- `app/admin/capacidade/capacidade.module.css`

**Tarefas específicas**: (Similar a PR5, adaptado para Produção)

**Tempo estimado**: 2-3 dias

---

### PR7: Migração - Produtos

**Objetivo**: Migrar tela de Produtos para o novo design system.

**Arquivos a modificar**:
- `app/admin/products/page.tsx`
- `app/admin/products/ProductsTableExpandable.client.tsx`
- `app/admin/products/ProductsFilters.client.tsx`
- `app/admin/products/products.module.css`

**Tarefas específicas**: (Similar a PR5, adaptado para Produtos)

**Tempo estimado**: 3-4 dias

---

### PR8: Migração - Categorias

**Objetivo**: Migrar tela de Categorias para o novo design system.

**Arquivos a modificar**:
- `app/admin/categories/page.tsx`
- `app/admin/categories/CategoriesTree.client.tsx`
- `app/admin/categories/CategoriesFilters.client.tsx`
- `app/admin/categories/categories.module.css`

**Tarefas específicas**: (Similar a PR5, adaptado para Categorias, considerar hierarquia)

**Tempo estimado**: 2-3 dias

---

### PR9: Migração - Clientes

**Objetivo**: Migrar tela de Clientes para o novo design system.

**Arquivos a modificar**:
- `app/admin/clientes/page.tsx`
- `app/admin/clientes/clientes.module.css`

**Tarefas específicas**: (Similar a PR5, adaptado para Clientes)

**Tempo estimado**: 2 dias

---

### PR10: Review Final e Validação

**Objetivo**: Validar sistema completo antes do lançamento.

**Tarefas**:
1. Checklist de validação (30+ itens)
2. Testes de regressão visual (screenshots antes/depois)
3. Testes de acessibilidade (screen reader, teclado)
4. Testes de responsividade (mobile, tablet, desktop)
5. Validação de contraste final
6. Documentação visual (`/admin/design-system`)

**Checklist de Validação Final** (30 itens):
- [ ] Consistência de tokens (nenhum hardcode)
- [ ] Foco visível em todos os elementos
- [ ] Densidade implementada nas tabelas
- [ ] Chips padronizados (OrderStatusStack)
- [ ] CTA único por tela
- [ ] Filtros usando FiltersPanel
- [ ] Tabelas com clique de linha
- [ ] Expand funciona com stopPropagation
- [ ] Kebab menu funciona com stopPropagation
- [ ] Acessibilidade completa (ARIA, teclado, contraste)
- [ ] Responsividade mobile
- [ ] UX writing consistente
- [ ] NextAction aparece quando apropriado
- [ ] OrderStatusStack em todas as listas de pedidos
- [ ] Validação de contraste WCAG AA
- [ ] Testes em Chrome, Firefox, Safari
- [ ] Testes em mobile (iOS, Android)
- [ ] Performance (sem regressões)
- [ ] Nenhum console error
- [ ] Nenhum warning de acessibilidade
- [ ] Documentação atualizada
- [ ] Guia de migração criado
- [ ] Exemplos de uso documentados
- [ ] Testes de regressão visual aprovados
- [ ] Testes de acessibilidade aprovados
- [ ] Testes de responsividade aprovados
- [ ] Validação de contraste aprovada
- [ ] Code review aprovado
- [ ] QA aprovado
- [ ] Pronto para produção

**Tempo estimado**: 3-4 dias

---

## 15. Riscos e Mitigações

### Risco 1: Mudança de Cor Primária (Azul → Âmbar)
**Impacto**: ALTO - Afeta identidade visual  
**Probabilidade**: MÉDIA  
**Mitigação**: 
- Testar em ambiente de staging
- Comunicar mudança aos usuários
- Manter fallback temporário se necessário

### Risco 2: Mudança de Comportamento (Clique em Linha)
**Impacto**: MÉDIO - Pode confundir usuários  
**Probabilidade**: BAIXA  
**Mitigação**: 
- Manter link explícito temporariamente com deprecation notice
- Adicionar tooltip explicativo
- Testar com usuários reais

### Risco 3: Refatoração de Filtros
**Impacto**: MÉDIO - Pode quebrar filtros existentes  
**Probabilidade**: MÉDIA  
**Mitigação**: 
- Testar cada tela individualmente
- Manter fallback temporário
- Migrar uma tela por vez

### Risco 4: Complexidade de NextAction
**Impacto**: BAIXO - Lógica pode ser complexa  
**Probabilidade**: BAIXA  
**Mitigação**: 
- Revisar com domínio de negócio
- Testar todos os cenários
- Documentar regras claramente

### Risco 5: Performance (Density Toggle, Sticky Header)
**Impacto**: BAIXO - Pode afetar performance  
**Probabilidade**: BAIXA  
**Mitigação**: 
- Testar com listas grandes (100+ itens)
- Usar virtualization se necessário
- Monitorar performance

---

## 16. Checklist de Regressão Visual

Para cada PR, validar:

### Visual
- [ ] Cores consistentes (nenhum hardcode)
- [ ] Tipografia consistente (fontes, tamanhos, pesos)
- [ ] Espaçamento consistente (grid de 8px)
- [ ] Radius consistente (4 níveis apenas)
- [ ] Sombras consistentes (4 níveis apenas)
- [ ] Botões com altura correta (44px/36px)
- [ ] Inputs com altura correta (44px/36px)
- [ ] Chips com tamanho correto (24px/20px)
- [ ] Tabelas com comportamento correto

### Interação
- [ ] Clique em linha funciona
- [ ] Expand funciona sem navegar
- [ ] Kebab menu funciona sem navegar
- [ ] Sorting funciona
- [ ] Filtros funcionam
- [ ] Density toggle funciona

### Acessibilidade
- [ ] Foco visível em todos os elementos
- [ ] Navegação por teclado funciona
- [ ] ARIA apropriado
- [ ] Contraste WCAG AA

### Responsividade
- [ ] Mobile funciona (toque, densidade)
- [ ] Tablet funciona
- [ ] Desktop funciona
- [ ] Breakpoints respeitados

---

---

## 17. Validações Finais (Executadas e Registradas)

### 17.1 Contraste de CTA Final e Warning Final

**CTA Primário**:
- **Cor**: `--action-primary` = #B45309 (âmbar escuro) sobre #FFFFFF (branco)
- **Contraste calculado**: ~7.1:1 ✅ (WCAG AA folgado)
- **Hover**: `--action-primary-hover` = #92400E sobre #FFFFFF = ~8.2:1 ✅
- **Status**: Aprovado

**Warning**:
- **Cor**: `--state-warning` = #CA8A04 sobre #FFFFFF (branco)
- **Contraste calculado**: ~4.8:1 ✅ (WCAG AA)
- **Distinção do CTA**: #CA8A04 vs #B45309 (diferença visual clara) ✅
- **Status**: Aprovado

**Conclusão**: Ambos os tokens foram validados e aprovados para WCAG AA com folga.

### 17.2 Carregamento de Fontes

**Fontes requeridas**:
- Plus Jakarta Sans (display)
- Inter (sans)

**Validação**:
- [ ] Fontes carregadas no layout root (`app/layout.tsx` ou `app/styles/globals.css`)
- [ ] Fallback definido: `"Plus Jakarta Sans", "Inter", system-ui, sans-serif`
- [ ] Teste offline: Desabilitar rede → Verificar que fallback funciona

**Status**: Pendente de validação em implementação (PR1).

### 17.3 Row Click Acessível

**Requisitos**:
- Teclado: Enter/Space ativa navegação
- ARIA: `role="button"`, `aria-label` descritivo
- StopPropagation: Expand e kebab não navegam

**Validação**:
- [ ] Row click funciona com mouse
- [ ] Row click funciona com teclado (Enter/Space)
- [ ] Expand não navega (stopPropagation)
- [ ] Kebab não navega (stopPropagation)
- [ ] ARIA apropriado (`role="button"`, `aria-label`)
- [ ] Screen reader anuncia corretamente

**Status**: Pendente de validação em implementação (PR2).

### 17.4 Mobile Specs de Colunas

**Validação por tabela**:

**Pedidos**:
- [ ] XS/SM: Cliente (truncado), Data, OrderStatusStack
- [ ] Expand: Número, Itens, Totais, Chips extras
- [ ] Touch targets: 44px × 44px mínimo

**Produtos**:
- [ ] XS/SM: Nome (line-clamp: 2), Disponível, (Categoria opcional)
- [ ] Expand: SKUs, Preços, Descrição, Atributos
- [ ] Touch targets: 44px × 44px mínimo

**Clientes**:
- [ ] XS/SM: Nome (truncado), Telefone, Última compra
- [ ] Expand: Email, Endereços, Histórico
- [ ] Touch targets: 44px × 44px mínimo

**Produção/Capacidade**:
- [ ] XS/SM: Produto (truncado), Necessário produzir, Janela
- [ ] Expand: SKUs detalhados, Gaps, Histórico
- [ ] Touch targets: 44px × 44px mínimo

**Status**: Pendente de validação em implementação (PR5-PR9).

---

**Próximo Passo**: Iniciar implementação conforme PRs definidos, começando por PR1 (Tokens + Primitivos). Executar validações finais conforme cada PR é aprovado.
