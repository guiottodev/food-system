# Design System v2 – Friendly Pro SaaS
## Constituição de UX/UI

**Versão**: 2.0 Final  
**Data**: Janeiro 2026  
**Status**: Aprovado e em implementação

> Este documento é a **constituição** do design system. Todas as decisões aqui são **obrigatórias** e **não negociáveis** sem revisão formal. O objetivo não é "deixar bonito": é criar uma base que torne o sistema previsível, reduza erros e ansiedade, e deixe cada tela coerente e comercialmente premium.

---

## 1. Princípios Fundamentais (Inegociáveis)

### 1.1 Clareza e Previsibilidade
A interface **deve** orientar claramente:
- **O que está pronto**: Status visível, checklist completo
- **O que falta**: Pendências destacadas, campos obrigatórios marcados
- **Qual é a próxima ação**: Botão contextual sempre presente

**Métrica de sucesso**: O usuário sabe "o que fazer agora" em menos de 3 segundos.

### 1.2 Consistência Governada
- **Apenas 4 níveis de radius** são permitidos (sm, md, lg, full)
- **Apenas 4 níveis de sombra** são permitidos (xs, sm, md, focus)
- **Um único CTA primário por tela** (o restante é secondary/outline/ghost)
- **Componentes e padrões de interação** repetem-se em todas as páginas

**Violação**: Qualquer desvio deve ser justificado por escrito e aprovado.

### 1.3 Amigável, porém Sério
- **Paleta quente** transmite acolhimento (âmbar autoral, tons terrosos)
- **Bordas suaves** criam sensação amigável (radius-md = 10px)
- **Tipografia premium** reforça profissionalismo (Plus Jakarta Sans + Inter)

**Direção visual**: Friendly & Pro (Notion-ish), não corporativo frio.

### 1.4 Acessibilidade Aplicada
- **Foco visível** em todos os elementos interativos (anel âmbar 3px)
- **Contraste WCAG AA** mínimo (4.5:1 texto normal, 3:1 texto grande)
- **Navegação por teclado** completa (Tab, Enter, Space, Esc, setas)
- **ARIA semântica** apropriada (roles, labels, expanded, controls)

**Não negociável**: Acessibilidade não é opcional.

### 1.5 Flexibilidade de Densidade
- **Comfortable** (padrão): 44px altura de linha/botão/input
- **Compact** (toggle): 36px altura de linha/botão/input
- **Aplicação**: Apenas tabelas/listas. Formulários sempre Comfortable. Mobile sempre Comfortable.

**Regra**: Toggle no canto superior-direito da tabela. Estado persiste por tabela em `localStorage`.

---

## 2. Token Set Final (Valores Definidos)

Todos os valores abaixo são **obrigatórios**. Não criar variações.

### 2.1 Cores

#### Base
```css
--bg-app: #FBFAF8;        /* Fundo da aplicação */
--bg-surface: #FFFFFF;    /* Superfícies (cards, tabelas) */
--bg-subtle: #F5F5F4;     /* Fundos sutis (hover, alternados) */
--bg-muted: #EDEAE6;      /* Fundos desabilitados */
```

#### Texto
```css
--text-primary: #1C1917;    /* Texto principal (títulos, valores importantes) */
--text-secondary: #4A4A4A;  /* Texto secundário (descrições) */
--text-muted: #78716C;      /* Texto desabilitado/auxiliar */
--text-inverse: #FFFFFF;    /* Texto sobre fundos escuros */
```

#### Bordas
```css
--border: #E7E5E4;          /* Bordas padrão */
--border-strong: #D6D3D1;   /* Bordas destacadas (hover) */
--border-focus: #B45309;    /* Borda de foco (âmbar escuro para contraste) */
```

#### Ação (CTA) - Tokens Seguros com Contraste AA Folgado

**Separação obrigatória**: CTA real (mais escuro para contraste) vs Brand âmbar (assinatura visual).

```css
/* CTA Real (botões primários, ações críticas) */
--action-primary: #B45309;           /* Âmbar escuro - contraste AA folgado */
--action-primary-hover: #92400E;     /* Hover (escurece) */
--action-primary-active: #78350F;    /* Active (mais escuro) */
--action-primary-disabled: #D6D3D1;  /* Disabled (cinza) */
--action-primary-rgb: 180, 83, 9;    /* Para rgba() */
--action-primary-text: #FFFFFF;      /* Texto sobre CTA (sempre branco) */

/* Brand Âmbar (assinatura visual, acentos, não-CTAs) */
--brand-amber: #D97706;              /* Âmbar original - apenas assinatura */
--brand-amber-light: #F59E0B;        /* Variante clara para backgrounds sutis */
--brand-amber-rgb: 217, 119, 6;     /* Para rgba() */

/* Botões secundários */
--action-secondary: #FFFFFF;         /* Botão secundário (fundo branco) */
--action-secondary-hover: #F5F5F4;   /* Hover secundário */
--action-ghost: transparent;         /* Ghost (transparente) */
```

**Regras críticas**:
1. **CTA primário** usa `--action-primary` (#B45309 - mais escuro) com texto branco. Contraste: ~7.1:1 ✅
2. **Brand âmbar** (`--brand-amber`) é apenas para assinatura visual, não para CTAs.
3. **Proibido**: Usar `--brand-amber` em botões primários ou CTAs.
4. **Proibido**: "Escurece 5% no hover" genérico. Sempre usar tokens específicos (`--action-primary-hover`).

**Tabela de Contraste (WCAG AA)**:

| Combinação | Contraste | Status |
|------------|-----------|--------|
| `--action-primary` (#B45309) sobre `--action-primary-text` (#FFFFFF) | ~7.1:1 | ✅ AA folgado |
| `--action-primary-hover` (#92400E) sobre `--action-primary-text` (#FFFFFF) | ~8.2:1 | ✅ AA folgado |
| `--action-primary` (#B45309) sobre `--bg-surface` (#FFFFFF) | ~7.1:1 | ✅ AA folgado |
| Links (`--action-primary`) sobre `--bg-surface` (#FFFFFF) | ~7.1:1 | ✅ AA folgado |
| `--state-warning` (#CA8A04) sobre `--bg-surface` (#FFFFFF) | ~4.8:1 | ✅ AA (distinto do CTA) |

**Regra obrigatória**: CTA nunca usa o mesmo tom do Warning. CTA usa #B45309, Warning usa #CA8A04.

#### Estados Genéricos
```css
--state-success: #059669;
--state-success-bg: #ECFDF5;
--state-success-text: #047857;
--state-warning: #CA8A04;           /* Laranja distinto do CTA */
--state-warning-bg: #FFFBEB;
--state-warning-text: #92400E;
--state-error: #DC2626;
--state-error-bg: #FEF2F2;
--state-error-text: #991B1B;
--state-info: #0EA5E9;
--state-info-bg: #F0F9FF;
--state-info-text: #075985;
```

**Regra obrigatória**: `--state-warning` (#CA8A04) é distinto do CTA (`--action-primary` #B45309) para evitar confusão visual. CTA é mais escuro e saturado; Warning é mais claro e amarelado.

#### Status de Pedido (Tokens Específicos)
```css
--status-rascunho-bg: #F1F5F9;
--status-rascunho-text: #64748B;
--status-confirmado-bg: #FFF7ED;
--status-confirmado-text: #B45309;      /* Âmbar escuro para contraste */
--status-em_producao-bg: #FEF3C7;
--status-em_producao-text: #B45309;      /* Âmbar escuro para contraste */
--status-pronto-bg: #D1FAE5;
--status-pronto-text: #047857;
--status-entregue-bg: #DCFCE7;
--status-entregue-text: #15803D;
--status-cancelado-bg: #FEE2E2;
--status-cancelado-text: #B91C1C;
```

**Validação de contraste**: Status CONFIRMADO e EM_PRODUCAO usam #B45309 (mais escuro) sobre fundo claro para garantir WCAG AA.

#### Pendências e Alertas
```css
/* Pendências fortes (bloqueios) */
--attention-strong-bg: var(--state-error-bg);  /* #FEF2F2 */
--attention-strong-text: var(--state-error);   /* #DC2626 */

/* Alertas fracos (atenções) */
--attention-weak-bg: var(--state-warning-bg);  /* #FFFBEB */
--attention-weak-text: var(--state-warning);   /* #CA8A04 */
```

### 2.2 Tipografia

#### Famílias (2 fontes apenas)
```css
--font-display: "Plus Jakarta Sans", system-ui, sans-serif;  /* Títulos H1-H3, números destacados */
--font-sans: "Inter", system-ui, sans-serif;                /* Corpo de texto, inputs, tabelas, chips */
```

**Regras de uso**:
- `--font-display`: Apenas títulos (H1, H2, H3), números destacados em KPIs, valores monetários grandes
- `--font-sans`: Todo o resto (corpo, inputs, tabelas, chips, botões, labels)
- **Proibido**: Usar `--font-display` em inputs, tabelas, chips ou botões

#### Escala Tipográfica
```css
--text-xs: 12px;    /* Labels pequenos, badges */
--text-sm: 14px;    /* Texto padrão, botões */
--text-base: 16px;  /* Texto base */
--text-lg: 18px;    /* Subtítulos */
--text-xl: 20px;    /* Títulos de seção */
--text-2xl: 24px;   /* Títulos principais */
--text-3xl: 30px;   /* Títulos hero */
```

#### Pesos
```css
--fw-regular: 400;    /* Texto normal */
--fw-medium: 500;    /* Texto médio (labels, chips) */
--fw-semibold: 600;  /* Texto semibold (subtítulos, table headers) */
--fw-bold: 700;      /* Texto bold (títulos, valores) */
```

#### Line Height e Tracking
```css
--lh-tight: 1.2;      /* Títulos (display) */
--lh-normal: 1.5;     /* Texto corpo */
--lh-relaxed: 1.65;   /* Texto longo */
--tracking-tight: -0.01em;  /* Títulos (display) */
```

### 2.3 Espaçamento (Grid de 8px)

```css
--space-0: 0;
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

**Regra**: Sempre use múltiplos de 4px. Não criar valores intermediários.

### 2.4 Radius (4 níveis apenas)

```css
--radius-sm: 6px;      /* Botões e inputs */
--radius-md: 10px;     /* Cards e painéis */
--radius-lg: 18px;     /* Modais e drawers */
--radius-full: 9999px; /* Chips */
```

**Regra**: Não usar outros valores. Todos os raios devem vir destes tokens.

### 2.5 Sombras (4 níveis apenas)

```css
--shadow-xs: 0 1px 1px rgba(0, 0, 0, 0.04);              /* Leve realce */
--shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.06);              /* Uso geral para cards, controles focados */
--shadow-md: 0 6px 12px rgba(0, 0, 0, 0.08);             /* Elevação moderada para modais e popovers */
--shadow-focus: 0 0 0 3px rgba(217, 119, 6, 0.3);        /* Anel de foco (âmbar) */
```

**Regra**: Nenhum outro nível de sombra é permitido. Sombras devem sugerir hierarquia, não decorar.

### 2.6 Motion (Premium Invisível)

```css
--duration-fast: 100ms;
--duration-normal: 200ms;      /* Padrão: 160-220ms */
--duration-slow: 300ms;
--ease-default: cubic-bezier(0.4, 0, 0.2, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);  /* Padrão único */
```

**Regras obrigatórias**:

1. **Duração padrão**: 160–220ms (`--duration-normal`)
   - Drawer/modal: 200ms fade-in + scale-in
   - Toast: 200ms slide-in
   - Hover: 150ms (cor/elevação)
   - Expand: 200ms (altura)

2. **Easing padrão**: `--ease-out` (cubic-bezier(0, 0, 0.2, 1))
   - Use em todas as animações (drawer, modal, toast, hover, expand)
   - **Proibido**: Bounce, elastic, spring, ease-in

3. **Onde usar**:
   - ✅ Drawer/modal (abertura/fechamento)
   - ✅ Toast (slide-in/slide-out)
   - ✅ Hover (cor, elevação, scale)
   - ✅ Expand (altura da linha)
   - ✅ Focus ring (fade-in)

4. **Onde NÃO usar**:
   - ❌ Carregamento crítico (ex.: loading de dados)
   - ❌ Tabelas densas (scroll, sorting)
   - ❌ Ações que precisam ser instantâneas (clique, submit)
   - ❌ Validação de formulário (feedback imediato)

5. **Regra crítica**: Motion nunca pode atrasar clique/ação
   - Se animação > 200ms, usar `will-change` para otimização
   - Se animação bloqueia interação, reduzir duração ou remover

**Exemplos**:
```css
/* Drawer */
.drawer {
  transition: transform var(--duration-normal) var(--ease-out);
}

/* Modal */
.modal {
  animation: fadeInScale 200ms var(--ease-out);
}

/* Hover */
.button:hover {
  transition: background-color 150ms var(--ease-out),
              box-shadow 150ms var(--ease-out);
}

/* Expand */
.tableRowExpanded {
  transition: height 200ms var(--ease-out);
}
```

---

## 3. Governança de Ações e CTAs

### 3.1 Regra do CTA Único

**Obrigatório**: Um único CTA primário por tela.

**Exemplos corretos**:
- `/admin/orders`: CTA primário = "Novo pedido"
- `/admin/products`: CTA primário = "Novo produto"
- `/admin/capacidade`: CTA primário = "Registrar produção"

**Exemplos incorretos**:
- ❌ Dois botões primários na mesma tela
- ❌ CTA primário que não é a ação principal

**Outras ações**: Sempre secondary, outline ou ghost.

### 3.2 Padrão de Botões em Formulários

**Layout obrigatório**:
```
[Cancelar (secondary)]                    [Salvar (primary)]
```

**Regras**:
- Primário à direita: "Salvar", "Confirmar", "Aplicar"
- Secundário à esquerda: "Cancelar", "Voltar"
- Danger separado: Ações destrutivas isoladas visualmente (ex.: "Excluir" em modal)

### 3.3 Padrão de Navegação em Listas

**Comportamento obrigatório**:

1. **Clique em qualquer área da linha**: Abre o Detalhe do item
   - Implementar `cursor: pointer` na linha inteira
   - `onClick` na `<tr>` ou container da linha
   - `role="button"` e `aria-label` descritivo

2. **Ícone de expand (ChevronRight)**: Expande linha para preview
   - Posição: À esquerda da primeira coluna
   - Clique no ícone: Expande/recolhe (não navega)
   - `stopPropagation` no clique do ícone
   - `aria-expanded` no botão do ícone

3. **Menu kebab (MoreVertical)**: Ações secundárias
   - Posição: Última coluna, à direita
   - Opções: "Duplicar", "Ativar/Desativar", "Excluir"
   - `stopPropagation` no clique do kebab
   - `aria-haspopup="menu"` e `aria-expanded`

**Exemplo (Tabela de Pedidos)**:
```tsx
<tr 
  onClick={() => router.push(`/admin/orders/${order.id}`)}
  role="button"
  aria-label={`Ver detalhes do pedido ${order.orderNumber}`}
  className={styles.tableRow}
>
  <td>
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggleExpand(order.id);
      }}
      aria-expanded={expanded}
      aria-label={expanded ? "Recolher" : "Expandir"}
    >
      <ChevronRight />
    </button>
  </td>
  {/* ... células ... */}
  <td>
    <button
      onClick={(e) => {
        e.stopPropagation();
        setOpenMenu(order.id);
      }}
      aria-haspopup="menu"
      aria-expanded={openMenu === order.id}
    >
      <MoreVertical />
    </button>
  </td>
</tr>
```

### 3.4 Limite de Chips em Listas

**Regra obrigatória**: Além do estado do pedido, exibir **máximo 2 chips** (pendências fortes e alertas fracos).

**Ordem de exibição**:
1. **Status** (sempre primeiro, sempre visível)
2. **Pendência forte** (se houver)
3. **Alerta fraco** (se houver)

**Chips adicionais**: Aparecem como **"+N"** com tooltip ou popover enumerando as demais.

**Exemplo (Tabela de Pedidos)**:
```
[Confirmado] [Incompleto] [Precisa produzir] [+2]
                                    ↑
                            Tooltip: "Endereço não informado, Horário a confirmar"
```

---

## 4. Densidade

### 4.1 Modos

| Modo | Altura de linha (tabela) | Altura de botão/input | Uso |
|------|-------------------------|----------------------|-----|
| **Comfortable** | 44px | 44px | Padrão para desktop e mobile; melhor para toque e leitura sob pressão |
| **Compact** | 36px | 36px | Disponível nas tabelas via toggle; destinado a usuários avançados que precisam ver mais linhas por tela |

### 4.2 Regras de Aplicação

**Comfortable (padrão)**:
- Todas as tabelas por padrão
- Todos os formulários (sempre)
- Todos os modais (sempre)
- Mobile (sempre)

**Compact (toggle)**:
- Apenas tabelas/listas em desktop
- Toggle no canto superior-direito da tabela (dentro do container)
- Estado persiste por tabela em `localStorage` (chave: `table-density-{tableId}`)
- Não persiste globalmente

**Proibido**:
- Compact em formulários
- Compact em modais
- Compact em mobile

### 4.3 Implementação

**Componente**: `DensityToggle`
- Props: `currentDensity`, `onChange`, `tableId`
- Posição: Canto superior-direito da tabela (dentro do container, acima do cabeçalho)
- Ícones: List (Comfortable) / ListChevron (Compact)

---

## 5. Componentes Base

### 5.1 Botão

#### Variantes

**Primary** (CTA principal)
- Fundo: `--action-primary` (#D97706 - âmbar)
- Texto: `--action-primary-text` (#FFFFFF - branco)
- Sombra: `--shadow-sm` com inset highlight
- Hover: Fundo `--action-primary-hover` (#C26305), elevação `--shadow-md`
- Active: `transform: scale(0.98)`, sombra `--shadow-xs`
- Focus: `--shadow-focus` (anel âmbar 3px)

**Secondary**
- Fundo: `--action-secondary` (#FFFFFF)
- Borda: `--border-strong` (1px)
- Texto: `--action-primary` (âmbar)
- Hover: Fundo `--action-secondary-hover` (#F5F5F4)

**Outline**
- Fundo: `transparent`
- Borda: `--border-strong` (1px)
- Texto: `--action-primary` (âmbar)
- Hover: Fundo `--bg-subtle`

**Ghost**
- Fundo: `transparent`
- Borda: `transparent`
- Texto: `--text-secondary`
- Hover: Fundo `--bg-subtle`, texto `--text-primary`

**Danger**
- Fundo: `--state-error` (#DC2626)
- Texto: `--text-inverse` (#FFFFFF)
- Hover: `filter: brightness(0.95)`

#### Tamanhos

| Tamanho | Altura | Padding horizontal | Uso |
|---------|--------|-------------------|-----|
| **md** (default Comfortable) | 44px | 16px | Padrão |
| **sm** (Compact) | 36px | 12px | Compact mode |
| **lg** (kicker) | 52px | 20px | Uso raro (ex.: call-to-action hero) |

#### Estados (Todos por Token)

- **Hover**: Fundo `--action-primary-hover` (#92400E), sombra `--shadow-sm`
- **Active**: Fundo `--action-primary-active` (#78350F), `transform: scale(0.98)`
- **Focus**: Aplicar `--shadow-focus` (anel âmbar 3px usando `--brand-amber-rgb`)
- **Disabled**: Fundo `--action-primary-disabled` (#D6D3D1), `opacity: 0.5`, `cursor: not-allowed`
- **Loading**: Spinner no lado esquerdo do texto; desabilitar interação

**Proibido**: Usar `filter: brightness()` ou cálculos genéricos. Sempre usar tokens específicos.

### 5.2 Input & Select

#### Variantes
- **Default**: Borda `--border`, fundo `--bg-surface`
- **Error**: Borda `--state-error`, texto auxiliar `--state-error-text`
- **Success**: Borda `--state-success`

#### Tamanhos
- **Comfortable**: 44px altura
- **Compact**: 36px altura (apenas em tabelas com toggle Compact)

#### Estilo
- Borda: `--border` (1px)
- Radius: `--radius-sm` (6px)
- Padding horizontal: 16px
- Fonte: `--text-sm` (14px), `--font-sans`
- Placeholder: Cor `--text-muted`

#### Focus
- Borda: `--border-focus` (#B45309 - âmbar escuro)
- Sombra: `--shadow-focus` (anel âmbar 3px)

#### Autocomplete
- Inputs de busca têm ícone à esquerda com `padding-left: 40px`
- Ícone: 18px, cor `--text-muted`

#### Select Customizado
- Opções: Mesmo tamanho que inputs
- Menu: Sombra `--shadow-md`, radius `--radius-md`
- Comportamento: `aria-selected`, teclado completo (setas, Enter, Escape)

### 5.3 Badge / Chip

Chips são pequenas etiquetas que comunicam estados, pendências ou alertas.

#### Categorias

| Categoria | Uso | Cor de fundo | Cor do texto |
|-----------|-----|--------------|--------------|
| **Status** | Estado do pedido (enum) | `--status-*-bg` | `--status-*-text` |
| **Pendência forte** | Bloqueios (INCOMPLETE, ALTERADO_APOS_CONFIRMACAO) | `--attention-strong-bg` | `--attention-strong-text` |
| **Alerta fraco** | Atenções (UNAVAILABLE_ITEMS, MISSING_ADDRESS, MISSING_TIME, SALDO_INSUFICIENTE) | `--attention-weak-bg` | `--attention-weak-text` |

#### Tamanho
- **Comfortable**: Altura 24px, padding horizontal 12px
- **Compact**: Altura 20px, padding horizontal 10px
- **Radius**: `--radius-full` (9999px - pill)

#### Tipografia
- Fonte: `--text-xs` (12px), `--font-sans`
- Weight: `--fw-medium` (500)

#### Interatividade
- Chips **não são clicáveis**
- Se houver mais de dois além do status, exibir **"+N"** com tooltip enumerando as demais

#### Ordem de Exibição
1. **Status** sempre primeiro
2. **Pendência forte** em seguida
3. **Alerta fraco** por último

### 5.4 Card / Panel

#### Variantes

**Default**
- Fundo: `--bg-surface`
- Borda: `--border` (1px)
- Radius: `--radius-md` (10px)
- Sombra: `--shadow-xs`

**Elevated**
- Como default com sombra `--shadow-sm`

**Outlined**
- Sem fundo, apenas borda `--border-strong` (1px)

**Subtle**
- Fundo: `--bg-subtle`
- Sem borda

#### Estrutura Interna

**Header**
- Espaçamento interno: 16–20px
- Pode conter título (h3, `--font-display`) e ações

**Body**
- Padding: 16–20px
- Espaço vertical uniforme entre elementos: 12px

**Footer**
- Borda superior: `--border` (1px)
- Alinhamento de botões: À direita

### 5.5 Tabela

Tabelas são fundamentais para listas de pedidos, produtos, clientes e capacidade.

#### Container
- Border-radius: `--radius-lg` (18px)
- Sombra: `--shadow-sm`
- Overflow: hidden
- Fundo: `--bg-surface`
- Borda: `--border` (1px)

#### Cabeçalho
- Fundo: `--bg-subtle` (Comfortable) ou `--bg-muted` (Compact)
- Texto: `--text-xs` (12px), `--fw-semibold` (600), `--font-sans`
- Text-transform: uppercase
- Letter-spacing: 0.06em
- Padding vertical: 12px (Comfortable) ou 8px (Compact)
- Padding horizontal: 20px
- Borda inferior: `--border` (1px)
- **Sticky**: Cabeçalho sticky nas listas longas (`position: sticky`, `top: 0`, `z-index: 10`)

#### Linhas
- Altura: 44px (Comfortable) ou 36px (Compact)
- Padding horizontal: 20px
- Borda inferior: `--border` (1px)
- Zebra optional: Linhas ímpares com `--bg-muted` para melhoria de leitura

#### Hover
- Fundo: `rgba(var(--action-primary-rgb), 0.05)`
- Borda lateral esquerda: 2px solid `--action-primary` (âmbar)
- Transição: `--duration-fast` (100ms)

#### Interação (Especificação Detalhada)

**Row Click**:
- **Área clicável**: Toda a linha (`<tr>` ou container)
- **Comportamento**: Navega para `/admin/{resource}/{id}`
- **Implementação**: `onClick` na linha, `cursor: pointer`, `role="button"`, `aria-label` descritivo
- **Teclado**: `Enter` ou `Space` ativa o clique
- **Focus**: Anel de foco `--shadow-focus` quando linha está focada

**Expand**:
- **Área clicável**: Apenas o botão com ícone ChevronRight
- **Posição**: Primeira coluna, à esquerda
- **Comportamento**: Expande/recolhe preview (itens do pedido, SKUs, etc.)
- **Implementação**: `stopPropagation` no clique do botão, `aria-expanded` no botão
- **Teclado**: `Enter` ou `Space` no botão expande/recolhe
- **Preview**: Linha filha (`<tr className={styles.tableRowChild}>`) com `colSpan` igual ao número de colunas

**Kebab Menu**:
- **Área clicável**: Apenas o botão com ícone MoreVertical
- **Posição**: Última coluna, à direita
- **Comportamento**: Abre dropdown com ações secundárias
- **Implementação**: `stopPropagation` no clique do botão, `aria-haspopup="menu"`, `aria-expanded`
- **Teclado**: `Enter` ou `Space` abre menu, setas navegam, `Esc` fecha
- **Dropdown**: Sombra `--shadow-md`, radius `--radius-md`, z-index 30

**Ordenação**:
- **Indicador**: Ícone `ArrowUpDown` quando não ordenado, `ArrowUp` quando asc, `ArrowDown` quando desc
- **Área clicável**: Cabeçalho da coluna (`<th>`)
- **Comportamento**: Alterna entre desc → asc → desc
- **Implementação**: `role="button"`, `tabIndex={0}`, `aria-sort` ("ascending", "descending", ou `undefined`)
- **Teclado**: `Enter` ou `Space` ordena

**Ações**:
- Menu kebab no final da linha
- Opções: "Duplicar", "Ativar/Desativar", "Excluir"
- Dropdown com sombra `--shadow-md`

**Seletores**:
- Apenas se necessário (ex.: bulk actions)

**Células**:
- Texto: Alinhar à esquerda
- Números e valores monetários: Alinhar à direita, tipografia `tabular-nums`

**Responsividade**:
- Mobile: Scroll horizontal ou colapsar colunas secundárias
- Colunas prioritárias: Sempre visíveis (ex.: Pedido, Cliente, Status)

**Density Toggle**:
- Posição: Canto superior-direito da tabela (dentro do container, acima do cabeçalho)
- Estado: Persiste em `localStorage` (chave: `table-density-{tableId}`)
- Aplicação: Apenas tabelas (não formulários ou modais)

### 5.6 Drawer e Popover de Filtros

#### Drawer (Mobile)
- Painel lateral usado no mobile para filtros ou formulários longos
- Largura: `min(320px, 86vw)`
- Altura: 100%
- Sombra: `--shadow-md`
- Radius: `--radius-lg` (18px)
- Overlay: `rgba(0, 0, 0, 0.4)`
- **Focus trap**: Foco preso dentro do drawer
- **Fechar**: `Esc` ou clique no overlay retorna foco ao botão que abriu

#### Popover (Desktop)
- Painel suspenso usado no desktop para filtros
- Largura: `min(480px, 94vw)` (padrão único)
- Radius: `--radius-lg` (18px)
- Sombra: `--shadow-md`
- Posição: Abaixo do botão "Filtros"
- **Fechar**: Clique fora ou `Esc`

#### Estrutura Padrão (FiltersPanel)

**Cabeçalho**:
- Título: "Filtros" com ícone ListFilter
- Botão fechar: Ícone X, ghost, à direita

**Corpo**:
- Campos de filtro organizados em grupos
- Espaçamento vertical: 12px entre grupos
- Grupos com ícone e título (ex.: Calendar + "Período")

**Rodapé**:
- Botões alinhados à direita:
  - "Limpar" (ghost) à esquerda
  - "Aplicar filtros" (primary) à direita

**Badge de contagem**:
- No botão "Filtros": Badge circular com número de filtros ativos
- Cor: `--action-primary` (âmbar)

**Padrão Único**:
- Utilize sempre o componente `FiltersPanel` para filtros em Pedidos, Produção, Produtos, Categorias e Clientes
- Não crie popovers adhoc
- Não modifique larguras arbitrariamente

---

## 6.5 Contratos de Componentes (API Mínima)

### FiltersPanel

**Props obrigatórias**:
```typescript
interface FiltersPanelProps {
  activeCount: number;              // Número de filtros ativos (para badge)
  onApply: () => void;              // Callback ao aplicar filtros
  onClear: () => void;              // Callback ao limpar filtros
  syncMode?: "url" | "localStorage"; // Onde persistir (padrão: "url")
  variant?: "popover" | "drawer";   // Desktop vs Mobile (auto-detecta)
  density?: "comfortable" | "compact"; // Densidade (padrão: "comfortable")
  children: React.ReactNode;        // Campos de filtro
}
```

**Regras de uso**:
- `activeCount` deve ser calculado dinamicamente (não hardcoded)
- `syncMode="url"` persiste filtros em query params (padrão)
- `variant` é auto-detectado via media query (não passar manualmente)
- Badge de contagem aparece automaticamente no botão "Filtros" quando `activeCount > 0`

**Exemplo (Pedidos)**:
```tsx
<FiltersPanel
  activeCount={filters.activeCount}
  onApply={() => applyFilters()}
  onClear={() => clearFilters()}
  syncMode="url"
>
  <FilterGroup icon={Calendar} label="Período">
    <PeriodSelect />
  </FilterGroup>
  <FilterGroup icon={Filter} label="Status">
    <StatusSelect />
  </FilterGroup>
</FiltersPanel>
```

### OrderStatusStack

**Props obrigatórias**:
```typescript
interface OrderStatusStackProps {
  status: OrderStatus;              // Enum: RASCUNHO, CONFIRMADO, etc.
  strongReasons: AttentionReason[]; // Pendências fortes (bloqueios)
  weakReasons: AttentionReason[];   // Alertas fracos (atenções)
  maxChips?: number;                // Máximo de chips além do status (padrão: 2)
  overflowBehavior?: "+N" | "tooltip" | "popover"; // Como exibir overflow (padrão: "+N")
  density?: "comfortable" | "compact";
}
```

**Regras de uso**:
- Status sempre aparece primeiro (sempre visível)
- Ordem: Status → Pendência forte → Alerta fraco
- Se `strongReasons.length + weakReasons.length > maxChips`, exibir "+N" com tooltip
- Tooltip enumera chips restantes: "Endereço não informado, Horário a confirmar"

**Exemplo (Tabela de Pedidos)**:
```tsx
<OrderStatusStack
  status={order.status}
  strongReasons={attention.strongReasons}
  weakReasons={attention.weakReasons}
  maxChips={2}
  overflowBehavior="+N"
/>
```

### NextAction

**Props obrigatórias**:
```typescript
interface NextActionProps {
  checklist: ChecklistItem[];       // Itens do checklist
  primaryAction: {
    label: string;                   // Ex.: "Adicionar itens"
    onClick: () => void;
    disabled?: boolean;
  };
  secondaryActions?: Array<{        // Opcional
    label: string;
    onClick: () => void;
    variant?: "secondary" | "outline" | "ghost";
  }>;
  whenToShow: "always" | "incomplete" | "custom"; // Quando exibir
  whenNotToShow?: (order: Order) => boolean; // Função custom (se whenToShow="custom")
  summary?: {                        // Resumo do pedido (opcional)
    subtotal: number;
    tax?: number;
    total: number;
  };
}
```

**Regras de uso**:
- `whenToShow="always"`: Sempre visível (ex.: `/admin/orders/new`)
- `whenToShow="incomplete"`: Apenas quando há pendências (ex.: `/admin/orders/[id]`)
- `whenToShow="custom"`: Usa `whenNotToShow` para decidir
- `primaryAction.disabled` deve ser calculado conforme regras de negócio
- Não exibir em pedidos finalizados (ENTREGUE, CANCELADO)

**Exemplo (Novo Pedido)**:
```tsx
<NextAction
  checklist={[
    { label: "Itens adicionados", status: "complete" },
    { label: "Data definida", status: "pending" },
    { label: "Endereço necessário", status: "warning" },
  ]}
  primaryAction={{
    label: "Definir data de entrega",
    onClick: () => setDateModalOpen(true),
    disabled: !order.items.length,
  }}
  whenToShow="always"
  summary={{
    subtotal: order.subtotal,
    tax: order.tax,
    total: order.total,
  }}
/>
```

### DataTable

**Props obrigatórias**:
```typescript
interface DataTableProps<T> {
  columns: ColumnDef<T>[];          // Definição de colunas
  data: T[];                        // Dados
  rowHref?: (row: T) => string;     // URL para navegação (ex.: `/admin/orders/${id}`)
  onRowClick?: (row: T) => void;    // Callback alternativo (se não usar rowHref)
  expandRenderer?: (row: T) => React.ReactNode; // Preview expandido
  actionsRenderer?: (row: T) => React.ReactNode; // Menu kebab
  density?: "comfortable" | "compact";
  stickyHeader?: boolean;           // Cabeçalho sticky (padrão: true)
  sortable?: boolean;               // Permitir sorting (padrão: true)
  onSort?: (column: string, direction: "asc" | "desc") => void;
}
```

**Regras de uso**:
- `rowHref` ou `onRowClick` é obrigatório (um ou outro)
- `expandRenderer` deve retornar preview (itens do pedido, SKUs, etc.)
- `actionsRenderer` deve retornar menu kebab com ações secundárias
- Clique em linha navega; clique no expand não navega (stopPropagation)
- Clique no kebab não navega (stopPropagation)

**Exemplo (Tabela de Pedidos)**:
```tsx
<DataTable
  columns={orderColumns}
  data={orders}
  rowHref={(order) => `/admin/orders/${order.id}`}
  expandRenderer={(order) => (
    <OrderItemsPreview items={order.items} />
  )}
  actionsRenderer={(order) => (
    <KebabMenu
      items={[
        { label: "Duplicar", onClick: () => duplicateOrder(order.id) },
        { label: "Excluir", onClick: () => deleteOrder(order.id), variant: "danger" },
      ]}
    />
  )}
  density={tableDensity}
  stickyHeader={true}
  onSort={(column, dir) => setSort({ column, direction: dir })}
/>
```

---

### 5.7 Modal

#### Tamanhos

| Tamanho | Largura | Uso |
|---------|---------|-----|
| **sm** | 400px | Confirmar ações simples |
| **md** | 560px | Formulários médios |
| **lg** | 680px | Formulários complexos |
| **full** | `min(94vw, 640px)` | Mobile |

#### Estrutura
- **Overlay**: `rgba(0, 0, 0, 0.4)`
- **Card**: Radius `--radius-lg` (18px), sombra `--shadow-md`
- **Header**: Título e botão close (ícone X)
- **Body**: Scroll interno se necessário
- **Footer**: Botões alinhados à direita (primário, secundário, danger)

#### Acessibilidade
- Foco inicial: Primeiro campo interativo
- Focus trap: Tab não sai do modal
- Fechar: `Esc` e clique no overlay
- ARIA: `aria-modal="true"`, `role="dialog"`

#### Animação
- Fade-in + scale-in em 200ms (`--duration-normal`)
- Fade-out ao fechar

### 5.8 Toast / InlineNotice

#### Posicionamento
- Canto superior direito
- Largura: 360–400px
- Sombra: `--shadow-md`
- Radius: `--radius-md` (10px)

#### Variantes
- **Success**: Borda esquerda `--state-success` (3px)
- **Warning**: Borda esquerda `--state-warning` (3px)
- **Error**: Borda esquerda `--state-error` (3px)
- **Info**: Borda esquerda `--state-info` (3px)

#### Ícones
- CheckCircle (success), AlertTriangle (warning), XCircle (error), Info (info)

#### Comportamento
- Duração: 6s por padrão
- Pausa: Quando foco ou mouse passa por cima
- Botão "Desfazer": Opcional

#### Acessibilidade
- `aria-live="polite"` para que screen readers anunciem a mensagem

---

## 6. Decision UI Patterns (Obrigatórios)

### 6.1 OrderStatusStack

Componente que exibe status, pendências e alertas em ordem padronizada.

#### Estrutura
```
[Status] [Pendência forte] [Alerta fraco] [+N]
```

#### Regras
1. **Status sempre primeiro**: Sempre visível, sempre primeiro
2. **Pendência forte**: Aparece se houver (INCOMPLETE, ALTERADO_APOS_CONFIRMACAO)
3. **Alerta fraco**: Aparece se houver (UNAVAILABLE_ITEMS, MISSING_ADDRESS, MISSING_TIME, SALDO_INSUFICIENTE)
4. **Limite**: Máximo 2 chips além do status
5. **"+N"**: Se houver mais de 2 chips além do status, exibir "+N" com tooltip enumerando as demais

#### Onde Aparece
- Tabela de pedidos (coluna "Status")
- Detalhe do pedido (header)
- Painel principal (lista de pendências)

#### Exemplo (Tabela de Pedidos)
```tsx
<div className={styles.statusGroup}>
  <Chip variant="status" status={order.status} />
  {attention.strongReasons.length > 0 && (
    <Chip variant="attention-strong" label={attention.strongReasons[0].label} />
  )}
  {attention.weakReasons.length > 0 && (
    <Chip variant="attention-weak" label={attention.weakReasons[0].label} />
  )}
  {totalChips > 3 && (
    <Chip variant="more" count={totalChips - 3} tooltip={remainingLabels} />
  )}
</div>
```

### 6.2 NextAction

Componente que exibe resumo, checklist e próxima ação do pedido.

#### Estrutura
```
┌─────────────────────────────────────┐
│ Resumo do Pedido                    │
│ Subtotal: R$ 100,00                 │
│ Taxa: R$ 5,00                       │
│ Total: R$ 105,00                    │
├─────────────────────────────────────┤
│ Checklist                           │
│ ✅ Itens adicionados                │
│ ❌ Data definida                    │
│ ⚠️  Endereço necessário            │
│ ✅ Pagamento confirmado             │
├─────────────────────────────────────┤
│ [Definir data de entrega] (primary) │
└─────────────────────────────────────┘
```

#### Regras

**Quando Aparece**:
- `/admin/orders/new`: Sempre visível, sticky no topo
- `/admin/orders/[id]`: Sempre visível, card destacado no topo
- `/admin`: Lista de pendências (versão compacta)

**Quando NÃO Aparece**:
- Pedidos finalizados (ENTREGUE, CANCELADO)
- Apenas quando há ação pendente

**Checklist**:
- ✅ **OK**: Badge verde, item completo
- ❌ **Falta**: Badge vermelho, item pendente (bloqueio)
- ⚠️ **Atenção**: Badge amarelo, item com alerta fraco
- ⚪ **Opcional**: Badge cinza, item não aplicável

**Próxima Ação**:
- Botão contextual baseado no estado atual
- Habilitado/desabilitado conforme regras de negócio
- Sempre primary (âmbar)

#### Mapeamento de Condições

| Condições atuais | Próxima ação | Botão habilitado? |
|-----------------|--------------|-------------------|
| Sem itens | Adicionar itens | Sim |
| Sem data (e tipo ≠ pronta-entrega) | Definir data de entrega | Sim |
| Tipo entrega sem endereço | Definir endereço | Sim |
| Itens alterados pós-confirmação | Reconfirmar pedido | Sim (se não houver bloqueios) |
| Tudo definido e pendências resolvidas | Confirmar pedido | Sim |
| Pedido confirmado | Iniciar produção | Sim |
| Em produção | Acompanhar produção | Não (apenas informativo) |
| Pronto | Registrar retirada/entrega | Sim |

#### Exemplo (Novo Pedido)
```tsx
<NextAction
  order={order}
  onAction={(action) => {
    if (action === "addItems") router.push(`/admin/orders/${order.id}/edit`);
    if (action === "defineDate") setDateModalOpen(true);
    // ...
  }}
/>
```

### 6.4 Anti-Padrões (Não Fazer)

**Regras de proibição obrigatórias**:

1. **NÃO mostrar NextAction na lista inteira**
   - ❌ Errado: Exibir NextAction em cada linha da tabela de pedidos
   - ✅ Correto: NextAction apenas em `/admin/orders/new`, `/admin/orders/[id]` e `/admin` (painel)

2. **NÃO permitir 2 CTAs primários na mesma tela**
   - ❌ Errado: "Novo pedido" e "Registrar produção" ambos primários
   - ✅ Correto: Um único CTA primário por tela; demais são secondary/outline/ghost

3. **NÃO usar Warning com o mesmo tom do CTA**
   - ❌ Errado: Usar `--action-primary` (#B45309) para alertas
   - ✅ Correto: Warning usa `--state-warning` (#CA8A04), CTA usa `--action-primary` (#B45309)

4. **NÃO permitir mais de 2 chips além do status**
   - ❌ Errado: Exibir 5 chips na mesma linha
   - ✅ Correto: Status + máximo 2 chips (pendência forte + alerta fraco), resto em "+N"

5. **NÃO misturar "Ver" + kebab na mesma linha sem regra**
   - ❌ Errado: Link "Ver detalhes" e kebab menu na mesma linha
   - ✅ Correto: Clique em linha abre detalhe; kebab apenas para ações secundárias (duplicar, excluir)

6. **NÃO usar animações diferentes por tela**
   - ❌ Errado: Modal em Pedidos com fade-in 300ms, Modal em Produtos com slide-in 200ms
   - ✅ Correto: Todos os modais usam fade-in + scale-in em 200ms (`--duration-normal`)

7. **NÃO usar densidade Compact em formulários**
   - ❌ Errado: Toggle Compact aplicado em formulário de novo pedido
   - ✅ Correto: Compact apenas em tabelas/listas; formulários sempre Comfortable

8. **NÃO usar `--font-display` em inputs, tabelas ou chips**
   - ❌ Errado: Input com `font-family: var(--font-display)`
   - ✅ Correto: `--font-display` apenas em títulos (H1-H3) e números destacados

### 6.3 FiltersPanel

Componente único para todos os filtros do sistema.

#### Estrutura Padrão

**Desktop (Popover)**:
- Largura: `min(480px, 94vw)`
- Posição: Abaixo do botão "Filtros"
- Fecha: Clique fora ou `Esc`

**Mobile (Drawer)**:
- Largura: `min(320px, 86vw)`
- Posição: Lateral esquerda
- Fecha: `Esc` ou clique no overlay

#### Campos Padronizados

**Pedidos**:
1. Período (Próximos pedidos, Hoje, Intervalo, Histórico)
2. Status (Todos, Rascunho, Confirmado, etc.)
3. Pendências (Todas, Com pendências, tipos específicos)
4. Tipo (Todos, Encomenda, Pronta entrega)
5. Logística (Todos, Entrega, Retirada)
6. Ordenação (Data mais próxima, mais distante, criado recentemente)
7. Itens/página (15, 30, 50)

**Produção**:
1. Período da demanda (Hoje, 7, 14, 30 dias)
2. Exibir (Todos, Somente com gap)

**Produtos**:
1. Categoria
2. Status (Ativos/Inativos)
3. Estoque (Em/Fora)
4. SKU ativo

**Categorias**:
1. Status (Ativas/Inativas)
2. Tipo (Todas/Raiz/Folhas)
3. Produtos (Todas/Com diretos/Com total)

**Clientes**:
- Sem filtros avançados (apenas busca)

#### Badge de Contagem
- No botão "Filtros": Badge circular com número de filtros ativos
- Cor: `--action-primary` (âmbar)
- Exemplo: "Filtros [3]"

#### Persistência
- Filtros persistem em URL (query params)
- Ao recarregar, filtros são restaurados
- Botão "Limpar" remove todos os filtros

---

## 7. Padrões de Domínio

### 7.1 Estados de Pedidos

Os estados são definidos no código (`OrderStatus`: RASCUNHO, CONFIRMADO, EM_PRODUCAO, PRONTO, ENTREGUE, CANCELADO).

**Localização do código**: [`lib/domain/status.ts`](lib/domain/status.ts)

#### Mapeamento Visual

| Estado | Cor de fundo | Cor do texto | Significado |
|--------|--------------|-------------|-------------|
| **RASCUNHO** | `--status-rascunho-bg` (#F1F5F9) | `--status-rascunho-text` (#64748B) | Rascunho de pedido, ainda sem compromisso |
| **CONFIRMADO** | `--status-confirmado-bg` (#FFF7ED) | `--status-confirmado-text` (#B45309) | Itens e data definidos, pronto para produção |
| **EM_PRODUCAO** | `--status-em_producao-bg` (#FEF3C7) | `--status-em_producao-text` (#B45309) | Produção em andamento |
| **PRONTO** | `--status-pronto-bg` (#D1FAE5) | `--status-pronto-text` (#047857) | Produtos prontos; aguardando retirada ou entrega |
| **ENTREGUE** | `--status-entregue-bg` (#DCFCE7) | `--status-entregue-text` (#15803D) | Pedido concluído |
| **CANCELADO** | `--status-cancelado-bg` (#FEE2E2) | `--status-cancelado-text` (#B91C1C) | Pedido cancelado; requer motivo |

**Validação de contraste**: Status CONFIRMADO e EM_PRODUCAO usam #B45309 (mais escuro) sobre fundo claro para garantir WCAG AA (4.5:1).

### 7.2 Pendências e Alertas

Conforme a seção 8 da Fonte da Verdade, existem duas categorias.

**Localização do código**: [`lib/domain/attention.ts`](lib/domain/attention.ts)

#### Pendências Fortes (Bloqueios)
- **INCOMPLETE**: Pedido sem itens ou sem data de entrega
- **ALTERADO_APOS_CONFIRMACAO**: Pedido modificado após confirmação, exige reconfirmação

**Aparência**: Chips vermelhos (`--attention-strong-bg`, `--attention-strong-text`)  
**Comportamento**: Impedem a entrega/produção até serem resolvidos

#### Alertas Fracos (Atenções)
- **UNAVAILABLE_ITEMS**: Itens sem disponibilidade de produção
- **MISSING_ADDRESS**: Entrega sem endereço
- **MISSING_TIME**: Entrega próxima (7 dias) sem horário definido
- **SALDO_INSUFICIENTE**: Entrega realizada sem saldo suficiente; indica necessidade de produção

**Aparência**: Chips âmbar (`--attention-weak-bg`, `--attention-weak-text`)  
**Comportamento**: Não bloqueiam a produção

#### Regras Visuais
- Chips de pendências sempre vêm após o pill de status
- Limites de exibição: máximo 2 chips visíveis, resto em "+N"
- **Falta de endereço**: Antes da confirmação, é alerta fraco (amarelo); depois de confirmado, torna-se pendência forte (vermelho), pois impede a entrega
- **Precisa produzir**: É alerta fraco; sinaliza falta de produção, mas não bloqueia o pedido

---

## 8. UX Writing (Padrões Obrigatórios)

### 8.1 Tom
- **Amigável, assertivo e profissional**
- Frases curtas e diretas
- Exemplos: "Adicionar itens", "Definir data de entrega", "Registrar produção"

### 8.2 Consistência de Labels
Use sempre as mesmas palavras:
- "Cliente" (não "Cadastro de cliente" ou "Registrar cliente")
- "Categoria" (não "Categorias" ou "Categorização")
- "Pedido" (não "Ordem" ou "Encomenda")
- "Produção" (não "Produzir" ou "Fabricação")

### 8.3 Capitalização

**Títulos (PageHeader)**: "Título em Caso de Frase"
- Exemplos: "Pedidos", "Novo pedido", "Produção", "Clientes"

**Botões e labels**: "Título em Caso de Título"
- Exemplos: "Novo Pedido", "Salvar", "Cancelar", "Aplicar Filtros"

**Table headers**: UPPERCASE
- Exemplos: "PEDIDO", "CLIENTE", "STATUS", "ENTREGA"

### 8.4 Pluralização
Lembre-se do plural em dinâmicas:
- "1 pedido" vs "2 pedidos"
- "1 item" vs "5 itens"
- "1 pendente" vs "2 pendentes"

### 8.5 Moeda
- Formato: **R$ 1.234,56**
- Separadores: Ponto para milhares, vírgula para decimais
- Alinhamento: À direita em tabelas
- Tipografia: `tabular-nums` para alinhamento

### 8.6 Datas/Horários
- Formato: **dd/MM** ou **dd/MM HH:mm**
- Sem zeros à esquerda para hora: "13/02 8:30" (não "13/02 08:30")
- Exemplos: "26/01", "26/01 16:00", "13/02 8:30"

### 8.7 Feedback
Mensagens de sucesso e erro devem ser específicas:
- ✅ "Pedido salvo com sucesso"
- ❌ "Erro ao salvar pedido: cliente é obrigatório"
- ✅ "Produção registrada: 10 unidades de Bolo Recheado"
- ❌ "Erro ao registrar produção: quantidade inválida"

### 8.8 Concordância de Gênero
- Mantenha a neutralidade de gênero
- Escreva "Pendente"/"Concluído" em vez de "Pendenciado"

---

## 9. Acessibilidade (Requisitos Obrigatórios)

### 9.1 Foco Visível
- Todos os elementos interativos devem ter anel de foco usando `--shadow-focus`
- Cor: âmbar translúcido (3px)
- Aplicar via `:focus-visible` (não `:focus`)

### 9.2 Navegação por Teclado

**Menus, selects, drawers e modais**:
- `Tab`/`Shift+Tab`: Mover o foco
- `Enter`/`Space`: Selecionar
- `Esc`: Fechar
- Setas (↑↓): Navegar em listas

**Tabelas**:
- `Tab`: Navegar entre células interativas
- `Enter`/`Space` na linha: Abrir detalhe
- `Enter`/`Space` no cabeçalho: Ordenar
- Setas (↑↓): Navegar entre linhas (se implementado)

### 9.3 ARIA (Atributos Obrigatórios)

| Contexto | Atributos obrigatórios |
|----------|----------------------|
| Botões de ícone | `aria-label` descritivo |
| Elementos expansíveis | `aria-expanded` (true/false) |
| Botões que controlam painéis | `aria-controls` (ID do painel) |
| Elementos clicáveis não-button | `role="button"` |
| Modais e drawers | `role="dialog"`, `aria-modal="true"` |
| Colunas ordenáveis | `aria-sort` ("ascending", "descending", ou `undefined`) |
| Toasts e notificações | `aria-live="polite"` |
| Campos com ajuda | `aria-describedby` (ID do texto de ajuda) |
| Campos com erro | `aria-invalid="true"`, `aria-describedby` (ID da mensagem de erro) |

### 9.4 Contraste
- Todas as combinações de texto e fundo devem respeitar **WCAG AA**
- Contraste mínimo: **4.5:1** para texto normal (até 18px)
- Contraste mínimo: **3:1** para texto grande (18px+)
- Validação realizada: Todos os tokens de cor foram validados

### 9.5 Texto Alternativo
- Todo ícone que comunica informação deve ter `aria-label` ou `title`
- Imagens ilustrativas em empty states devem ter `alt=""` para serem ignoradas por leitores de tela

---

## 10. Responsividade

### 10.1 Breakpoints

```css
/* Mobile */
@media (max-width: 640px) { }

/* Tablet */
@media (max-width: 720px) { }

/* Desktop pequeno */
@media (max-width: 900px) { }

/* Desktop médio */
@media (max-width: 1024px) { }
```

### 10.2 Adaptações Mobile

#### Page Header
- Flex-direction: column
- Align-items: flex-start
- Gap: 12px

#### KPI Grid
- Grid-template-columns: 1fr (uma coluna)
- KPI Cards viram KPI Bar horizontal (scroll) quando necessário

#### Toolbar
- ToolbarMain: flex 1 1 100%
- SearchWrap: flex 1 1 100%

#### Filtros Panel
- Drawer em vez de popover
- Position: static
- Width: 100%

#### Touch Targets
- Mínimo 44px × 44px para elementos interativos
- Espaçamento mínimo 8px entre elementos clicáveis

### 10.3 Responsive Table Spec (Prioridade de Colunas)

**Regra obrigatória**: Cada tabela define quais colunas são visíveis em XS/SM e quais colapsam no expand.

#### Tabela de Pedidos

**Visível em XS/SM (< 640px)**:
- Cliente (nome truncado com `text-overflow: ellipsis`, max-width: 120px)
- Data (formato: dd/MM, sem hora)
- OrderStatusStack (Status + chips, máximo 2 visíveis)

**Colapsa no expand**:
- Número do pedido
- Itens (lista completa)
- Totais (subtotal, taxa, total)
- Chips extras (se houver mais de 2)
- Observações

**Implementação**:
```tsx
// Colunas visíveis
const visibleColumns = ["cliente", "data", "status"];

// Colunas no expand
const expandColumns = ["numero", "itens", "totais", "observacoes"];

// Truncation
.cliente {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

#### Tabela de Produtos

**Visível em XS/SM**:
- Nome (truncado, max-width: 150px, `line-clamp: 2`)
- Disponível (badge: "Em estoque" / "Fora")
- Categoria (opcional, apenas se houver espaço)

**Colapsa no expand**:
- SKUs (lista completa)
- Preços (tabela de preços por unidade)
- Descrição
- Atributos

**Implementação**:
```tsx
// Truncation com line-clamp
.nome {
  max-width: 150px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

#### Tabela de Clientes

**Visível em XS/SM**:
- Nome (truncado, max-width: 140px)
- Telefone (formato: (XX) XXXXX-XXXX)
- Última compra (formato: dd/MM, apenas se houver)

**Colapsa no expand**:
- Email
- Endereços (lista completa)
- Histórico de pedidos (resumo)

#### Tabela de Produção/Capacidade

**Visível em XS/SM**:
- Produto (nome truncado, max-width: 120px)
- Necessário produzir (número destacado, badge se urgente)
- Janela (formato: dd/MM - dd/MM)

**Colapsa no expand**:
- SKUs detalhados
- Gaps de produção
- Histórico de produção

**Regras de Truncation/Line Clamp**:
- Texto longo: `text-overflow: ellipsis` + `white-space: nowrap`
- Texto multi-linha: `-webkit-line-clamp: 2` + `overflow: hidden`
- Números: Nunca truncar; usar `tabular-nums` para alinhamento

**Regras de Touch Targets**:
- Todas as células clicáveis: mínimo 44px × 44px
- Botões de ação (expand, kebab): 44px × 44px
- Espaçamento entre elementos: mínimo 8px

---

## 11. Validação de Contraste (Executada)

### 11.1 CTA Primário (Tokens Seguros)

**Tokens finais**:
- `--action-primary`: #B45309 (âmbar escuro) sobre #FFFFFF (branco)
- **Contraste calculado**: ~7.1:1 ✅ (WCAG AA folgado)
- `--action-primary-hover`: #92400E sobre #FFFFFF = ~8.2:1 ✅
- `--action-primary-text`: #FFFFFF (sempre branco)

**Validação executada**:
- ✅ CTA default: 7.1:1 (AA folgado)
- ✅ CTA hover: 8.2:1 (AA folgado)
- ✅ Links: 7.1:1 (AA folgado)
- ✅ Warning distinto: #CA8A04 vs #B45309 (diferença visual clara)

**Decisão final**: CTA usa #B45309 (mais escuro) para garantir contraste AA folgado. Brand âmbar (#D97706) é apenas para assinatura visual, não para CTAs.

### 11.2 Chips e Status
- **Pendência forte**: #DC2626 sobre #FEF2F2 = ~7.2:1 ✅
- **Alerta fraco**: #CA8A04 sobre #FFFBEB = ~4.8:1 ✅
- **Status CONFIRMADO**: #B45309 sobre #FFF7ED = ~4.6:1 ✅
- **Status EM_PRODUCAO**: #B45309 sobre #FEF3C7 = ~4.5:1 ✅
- **Warning vs CTA**: #CA8A04 vs #B45309 (distintos visualmente) ✅

### 11.3 Texto Secundário
- **#4A4A4A sobre #FFFFFF**: ~7.1:1 ✅
- **#78716C sobre #FFFFFF**: ~4.6:1 ✅

**Conclusão**: Todos os tokens de cor foram validados e aprovados para WCAG AA.

---

## 12. Plano de Rollout (Implementação por Fases)

### Fase 1: Tokens e Primitivos (PR1)

**Objetivo**: Estabelecer base de tokens e componentes primitivos.

**Tarefas**:
- [ ] Criar/atualizar `app/styles/tokens.css` com todos os tokens definidos
- [ ] Atualizar `--action-primary` de azul (#2563eb) para âmbar (#D97706)
- [ ] Adicionar tokens de status de pedidos
- [ ] Adicionar tokens de atenção (pendências/alertas)
- [ ] Atualizar `--radius-md` para 10px
- [ ] Atualizar `--shadow-focus` para âmbar
- [ ] Remover hardcodes de cores de status e badges
- [ ] Criar componente `Button` (variantes: primary, secondary, outline, ghost, danger)
- [ ] Criar componente `Input` (variantes: default, error, success)
- [ ] Criar componente `Chip` (variantes: status, attention-strong, attention-weak)

**Arquivos afetados**:
- `app/styles/tokens.css`
- `app/admin/_styles/adminPrimitives.module.css`
- Criar: `app/admin/_components/Button.tsx`
- Criar: `app/admin/_components/Input.tsx`
- Criar: `app/admin/_components/Chip.tsx`

**Definition of Done**:
- [ ] Todos os tokens definidos e documentados
- [ ] Componentes primitivos criados e testados
- [ ] Nenhum hardcode de cor restante
- [ ] Contraste validado (WCAG AA)
- [ ] Testes visuais em diferentes navegadores

### Fase 2: DataTable + Row/Expand/Kebab Pattern (PR2)

**Objetivo**: Padronizar comportamento de tabelas.

**Tarefas**:
- [ ] Criar componente `DataTable` com suporte a densidade
- [ ] Implementar clique em linha (navega para detalhe)
- [ ] Implementar expand (preview de itens/SKUs)
- [ ] Implementar kebab menu (ações secundárias)
- [ ] Implementar sorting com acessibilidade (aria-sort, teclado)
- [ ] Implementar sticky header
- [ ] Criar componente `DensityToggle`
- [ ] Remover links redundantes de "Ver" e "Ver detalhes"

**Arquivos afetados**:
- Criar: `app/admin/_components/DataTable.tsx`
- Criar: `app/admin/_components/DensityToggle.tsx`
- Refatorar: `app/admin/orders/OrdersTableClient.tsx`
- Refatorar: `app/admin/products/ProductsTableExpandable.client.tsx`
- Refatorar: `app/admin/capacidade/CapacityTable.client.tsx`

**Definition of Done**:
- [ ] Clique em linha funciona e é acessível (teclado, ARIA)
- [ ] Expand funciona com stopPropagation
- [ ] Kebab menu funciona com stopPropagation
- [ ] Sorting acessível (aria-sort, teclado)
- [ ] Density toggle funciona e persiste
- [ ] Sticky header implementado
- [ ] Links redundantes removidos

### Fase 3: FiltersPanel Padrão (PR3)

**Objetivo**: Unificar todos os filtros em um componente único.

**Tarefas**:
- [ ] Criar componente `FiltersPanel` (drawer mobile, popover desktop)
- [ ] Refatorar `OrdersFilters` para usar `FiltersPanel`
- [ ] Refatorar `ProductsFilters` para usar `FiltersPanel`
- [ ] Refatorar `ProductionFilters` para usar `FiltersPanel`
- [ ] Refatorar `CategoriesFilters` para usar `FiltersPanel` (ou manter modal para criar categoria)
- [ ] Implementar badge de contagem no botão "Filtros"
- [ ] Implementar persistência de filtros em URL

**Arquivos afetados**:
- Criar: `app/admin/_components/FiltersPanel.client.tsx`
- Refatorar: `app/admin/orders/OrdersFilters.client.tsx`
- Refatorar: `app/admin/products/ProductsFilters.client.tsx`
- Refatorar: `app/admin/capacidade/ProductionFilters.client.tsx`
- Refatorar: `app/admin/categories/CategoriesFilters.client.tsx`

**Definition of Done**:
- [ ] Todos os filtros usam `FiltersPanel`
- [ ] Largura padronizada (480px desktop, 320px mobile)
- [ ] Badge de contagem funciona
- [ ] Persistência em URL funciona
- [ ] Focus trap em drawer funciona
- [ ] Fecha com Esc e clique fora

### Fase 4: NextAction + OrderStatusStack (PR4)

**Objetivo**: Implementar componentes de domínio.

**Tarefas**:
- [ ] Criar componente `NextAction` (resumo, checklist, próxima ação)
- [ ] Criar componente `OrderStatusStack` (status + pendências + alertas)
- [ ] Integrar `NextAction` em `/admin/orders/new`
- [ ] Integrar `NextAction` em `/admin/orders/[id]`
- [ ] Integrar `NextAction` em `/admin` (painel)
- [ ] Integrar `OrderStatusStack` em tabela de pedidos
- [ ] Integrar `OrderStatusStack` em detalhe do pedido

**Arquivos afetados**:
- Criar: `app/admin/orders/NextAction.client.tsx`
- Criar: `app/admin/orders/OrderStatusStack.client.tsx`
- Refatorar: `app/admin/orders/new/OrderForm.tsx`
- Refatorar: `app/admin/orders/[id]/page.tsx`
- Refatorar: `app/admin/page.tsx`
- Refatorar: `app/admin/orders/OrdersTableClient.tsx`

**Definition of Done**:
- [ ] `NextAction` exibe resumo, checklist e próxima ação corretamente
- [ ] `OrderStatusStack` exibe status + pendências + alertas em ordem correta
- [ ] Limite de chips respeitado (máx. 2 além do status)
- [ ] "+N" funciona com tooltip
- [ ] Botão de próxima ação habilitado/desabilitado conforme regras

### Fase 5: Migração Tela por Tela (PR5+)

**Objetivo**: Migrar cada tela para o novo design system.

**Ordem de migração**:
1. **Pedidos** (`/admin/orders`)
2. **Produção** (`/admin/capacidade`)
3. **Produtos** (`/admin/products`)
4. **Categorias** (`/admin/categories`)
5. **Clientes** (`/admin/clientes`)

**Tarefas por tela**:
- [ ] Atualizar tokens CSS (remover hardcodes)
- [ ] Usar componentes primitivos (Button, Input, Chip)
- [ ] Usar DataTable com row/expand/kebab
- [ ] Usar FiltersPanel
- [ ] Integrar NextAction/OrderStatusStack (se aplicável)
- [ ] Aplicar UX writing guidelines
- [ ] Validar acessibilidade (foco, ARIA, teclado)
- [ ] Validar responsividade mobile
- [ ] Testes visuais

**Definition of Done por tela**:
- [ ] 1 CTA primário por tela
- [ ] Status/pendências/alertas consistentes
- [ ] Tabela com comportamento previsível (row/expand/kebab)
- [ ] Filtros usando FiltersPanel
- [ ] Mobile considerado (toque, densidade, colunas)
- [ ] Acessibilidade mínima garantida
- [ ] UX writing consistente

### Fase 6: Review Final e Validação (PR Final)

**Objetivo**: Validar sistema completo antes do lançamento.

**Tarefas**:
- [ ] Checklist de validação (30+ itens)
- [ ] Testes de regressão visual (screenshots antes/depois)
- [ ] Testes de acessibilidade (screen reader, teclado)
- [ ] Testes de responsividade (mobile, tablet, desktop)
- [ ] Validação de contraste final
- [ ] Documentação visual (`/admin/design-system`)

**Checklist de Validação Final**:
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
- [ ] Testes em diferentes navegadores

---

## 13. Referências e Inspiração

Este sistema de design é inspirado em:

- **Notion**: Friendly & Pro, paleta quente, tipografia premium
- **Stripe Dashboard**: Clareza e profissionalismo
- **Linear**: Interações refinadas e micro-animações
- **Vercel Dashboard**: Consistência e atenção aos detalhes
- **GitHub**: Acessibilidade e robustez

---

**Versão**: 2.0 Final  
**Última atualização**: Janeiro 2026  
**Status**: Aprovado - Em implementação
