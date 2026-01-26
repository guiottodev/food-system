# Checklist de QA - Design System v2

Este documento contém o checklist básico de QA/regressão para validar a implementação do Design System v2.

## Status Geral

- ✅ **PR1-PR9**: 100% completo
- ✅ **PR10**: 100% completo (incluindo Responsive Table Spec)
- ✅ **Migrações**: Todas as tabelas e filtros migrados
- ✅ **Tokens**: Todos os hardcodes removidos

---

## Checklist de Validação

### 1. Tokens e Base (PR1)

- [ ] Verificar que `--action-primary` = #B45309 (não azul)
- [ ] Verificar que `--brand-amber` = #D97706 existe
- [ ] Verificar que `--font-display` e `--font-sans` estão definidos
- [ ] Verificar que `--radius-md` = 10px
- [ ] Verificar que `--shadow-focus` usa brand-amber-rgb
- [ ] Testar fallback de fontes (desabilitar rede)
- [ ] Validar contraste CTA #B45309 sobre branco = 7.1:1

### 2. Componentes Primitivos (PR3)

- [ ] Button: Todas as variantes funcionam (primary, secondary, outline, ghost, danger)
- [ ] Button: Todos os tamanhos funcionam (sm, md, lg)
- [ ] Button: Density toggle funciona
- [ ] Input: Todas as variantes funcionam (default, error, success)
- [ ] Chip: Todas as variantes funcionam (status, attention-strong, attention-weak)
- [ ] Focus ring visível (âmbar) em todos os componentes
- [ ] Contraste validado (WCAG AA) em todos

### 3. DataTable (PR5)

- [ ] Row click funciona (mouse + teclado)
- [ ] Expand funciona sem navegar (stopPropagation)
- [ ] Kebab funciona sem navegar (stopPropagation)
- [ ] Sorting acessível (aria-sort, Enter/Space)
- [ ] Sticky header funciona
- [ ] Density toggle funciona
- [ ] Screen reader anuncia corretamente

### 4. FiltersPanel (PR7)

- [ ] Popover funciona no desktop
- [ ] Drawer funciona no mobile
- [ ] Badge de contagem funciona
- [ ] Persistência em URL funciona
- [ ] Focus trap funciona (drawer)
- [ ] Fecha com Esc e clique fora

### 5. OrderStatusStack (PR8)

- [ ] Ordem correta (Status → Strong → Weak)
- [ ] Limite de chips respeitado
- [ ] "+N" funciona com tooltip
- [ ] Integração com `lib/domain/attention.ts` funciona

### 6. NextAction (PR9)

- [ ] Checklist exibe corretamente
- [ ] Próxima ação calculada corretamente
- [ ] Botão habilitado/desabilitado conforme regras
- [ ] Não aparece em pedidos finalizados

### 7. Migração Completa (PR10)

#### 7.1 Tabelas

- [ ] `/admin/orders` - Tabela usa DataTable + OrderStatusStack + DensityToggle
- [ ] `/admin/products` - Tabela usa DataTable + DensityToggle
- [ ] `/admin/capacidade` - Tabela usa DataTable + DensityToggle
- [ ] `/admin/clientes` - Tabela usa DataTable + DensityToggle
- [ ] Todas as tabelas têm sticky header
- [ ] Todas as tabelas têm sorting funcional

#### 7.2 Filtros

- [ ] `/admin/orders` - FiltersPanel funciona
- [ ] `/admin/products` - FiltersPanel funciona
- [ ] `/admin/capacidade` - FiltersPanel funciona
- [ ] `/admin/categories` - FiltersPanel funciona
- [ ] Todos os filtros têm badge de contagem
- [ ] Todos os filtros persistem em URL

#### 7.3 NextAction

- [ ] `/admin/orders/new` - NextAction aparece e funciona
- [ ] `/admin/orders/[id]` - NextAction aparece e funciona
- [ ] `/admin` (dashboard) - NextAction aparece (lista compacta)

#### 7.4 CSS e Tokens

- [ ] Nenhum hardcode de cor restante em CSS modules
- [ ] Todos os CSS modules usam tokens
- [ ] adminPrimitives marcado como DEPRECATED

### 8. Responsive Table Spec (Mobile)

#### 8.1 Tabela de Pedidos

- [ ] Em mobile (< 640px): Apenas Cliente, Status, Entrega visíveis
- [ ] Cliente truncado com ellipsis (max-width: 120px)
- [ ] Data formato: dd/MM (sem hora)
- [ ] OrderStatusStack máximo 2 chips visíveis
- [ ] Expand mostra: Número, Itens, Totais, Observações

#### 8.2 Tabela de Produtos

- [ ] Em mobile: Apenas Nome, Disponível visíveis
- [ ] Nome truncado com line-clamp-2 (max-width: 150px)
- [ ] Expand mostra: SKUs, Preços, Descrição, Atributos

#### 8.3 Tabela de Clientes

- [ ] Em mobile: Nome, Telefone, Última compra visíveis
- [ ] Nome truncado com ellipsis (max-width: 140px)
- [ ] Telefone formato: (XX) XXXXX-XXXX

#### 8.4 Tabela de Produção/Capacidade

- [ ] Em mobile: Produto, Necessário produzir visíveis
- [ ] Produto truncado com ellipsis (max-width: 120px)
- [ ] Expand mostra: SKUs detalhados, Gaps, Histórico

#### 8.5 Touch Targets

- [ ] Todas as células clicáveis: mínimo 44px × 44px
- [ ] Botões de ação (expand, kebab): 44px × 44px
- [ ] Espaçamento entre elementos: mínimo 8px

### 9. Acessibilidade

- [ ] Screen reader: Navegar todas as telas com NVDA/JAWS
- [ ] Teclado: Tab, Enter, Space, Esc funcionam
- [ ] Contraste: Validar todas as cores (WCAG AA)
- [ ] Focus visible: Anel âmbar visível em todos os elementos
- [ ] ARIA: Roles, labels, expanded, controls corretos

### 10. Performance

- [ ] Nenhum console error
- [ ] Performance sem regressões (Lighthouse)
- [ ] Tabelas renderizam sem lag
- [ ] Filtros aplicam sem delay perceptível

### 11. Regressão Visual

- [ ] Comparar screenshots antes/depois
- [ ] Verificar que não há quebras de layout
- [ ] Verificar que cores estão corretas (âmbar, não azul)
- [ ] Verificar que tipografia está correta

---

## Como Usar Este Checklist

1. **Antes de cada release**: Executar checklist completo
2. **Após mudanças**: Executar seção relevante
3. **QA contínua**: Usar playground `/admin/design-system` para validação visual

## Notas

- ✅ = Completo e validado
- ⚠️ = Requer atenção
- ❌ = Não implementado ou com problemas

---

**Última atualização**: Janeiro 2026  
**Versão do Design System**: 2.0 Final
