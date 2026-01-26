# PR A - Evidências de Implementação e Testes

## 📋 Resumo Executivo

**Status**: ✅ PR A Completo  
**Data**: 2026-01-26  
**Arquivos Alterados**: 5 arquivos (2 novos, 3 modificados)

---

## 🔍 Evidências de Código (Análise Estática)

### 1. Expand Reset - Implementação ✅

**Arquivo**: `app/admin/_components/DataTable.tsx`
- **Linha 42**: Prop `expandStateKey?: string` adicionada à interface
- **Linha 66-70**: `useEffect` que reseta `expandedRows` quando `expandStateKey` muda
- **Lógica**: `if (expandStateKey !== undefined) { setExpandedRows(new Set()); }`

**Arquivo**: `app/admin/products/ProductsTableExpandable.client.tsx`
- **Linha 161-169**: `expandStateKey` gerado via `useMemo` baseado em filtros:
  ```typescript
  const expandStateKey = useMemo(() => {
    return JSON.stringify({
      q: searchParams.get("q") ?? "",
      active: searchParams.get("active") ?? "",
      stock: searchParams.get("stock") ?? "",
      categoryId: searchParams.get("categoryId") ?? "",
      semSkuAtivo: searchParams.get("semSkuAtivo") ?? "",
    });
  }, [searchParams]);
  ```
- **Observação**: `expandStateKey` **NÃO inclui** `sort` nem `page`, então:
  - ✅ Mudar filtros/busca → reseta expands
  - ✅ Ordenar/paginar → **NÃO** reseta expands

**Evidência de Teste Manual Necessária**:
- [ ] Expandir uma linha
- [ ] Mudar busca (`q`) → expand deve recolher
- [ ] Expandir novamente
- [ ] Mudar categoria (`categoryId`) → expand deve recolher
- [ ] Expandir novamente
- [ ] Ordenar por nome → expand **NÃO** deve recolher
- [ ] Mudar página → expand **NÃO** deve recolher

---

### 2. Row Click - stopPropagation ✅

**Arquivo**: `app/admin/_components/DataTable.tsx`
- **Linha 83-97**: `handleExpandClick` tem `e.stopPropagation()` na linha 85
- **Linha 223**: Row click usa `onClick={(e) => handleRowClick(row, e)}`
- **Linha 224**: Keyboard handler usa `onKeyDown={(e) => handleKeyDown(e, () => handleRowClick(row))}`

**Arquivo**: `app/admin/products/ProductsTableExpandable.client.tsx`
- **Linha 250, 264**: Links "Ver produção" têm `onClick={(e) => e.stopPropagation()}`
- **Linha 417**: Kebab menu button tem `e.stopPropagation()`
- **Linha 270-275**: Container do actionsRenderer tem `onClick={(e) => e.stopPropagation()}`

**Evidência de Teste Manual Necessária**:
- [ ] Clicar na linha (exceto expand/kebab/link) → navega para `/admin/products/[id]`
- [ ] Clicar no botão expand → **NÃO** navega, apenas expande/recolhe
- [ ] Clicar no kebab menu → **NÃO** navega, apenas abre menu
- [ ] Clicar em "Ver produção" → **NÃO** navega linha, apenas abre capacidade
- [ ] Teclado: Tab até linha, Enter → navega

---

### 3. Mobile (<640px) - Colunas e Truncation ✅

**Arquivo**: `app/admin/_components/DataTable.tsx`
- **Linha 121-127**: Lógica de mobile detecta `window.innerWidth < 640`
- **Linha 125**: Colunas com `mobilePriority: "low"` são ocultadas em mobile

**Arquivo**: `app/admin/products/ProductsTableExpandable.client.tsx`
- **Linha 182**: Coluna "Produto" tem `mobilePriority: "high"` e `truncation: "line-clamp-2"`
- **Linha 193**: Coluna "Categoria" tem `mobilePriority: "low"` → oculta em mobile
- **Linha 225**: Coluna "SKUs / Un." tem `mobilePriority: "low"` → oculta em mobile
- **Linha 239**: Coluna "Disponível" tem `mobilePriority: "high"` → visível em mobile
- **Linha 255**: Coluna "Preço" tem `mobilePriority: "low"` → oculta em mobile

**Evidência de Teste Manual Necessária**:
- [ ] Reduzir viewport para <640px
- [ ] Verificar: apenas "Produto" e "Disponível" visíveis (além de expand e ações)
- [ ] Verificar: nome do produto com `line-clamp-2` (máximo 2 linhas)
- [ ] Verificar: touch targets ≥44px (botões, links)

---

### 4. Coluna "Disponível" - 4 Cenários ✅

**Arquivo**: `app/admin/products/ProductsTableExpandable.client.tsx`
- **Linha 231-233**: Cálculo de `activeSkus` e `disponivelX/Y`
- **Linha 235-240**: **Cenário 1 e 2** (sem SKU ou SKU inativo):
  ```typescript
  if (row.skus.length === 0 || activeSkus === 0) {
    return <ToneChip tone="neutral" label="Sem SKU ativo" density="compact" />;
  }
  ```
- **Linha 243-255**: **Cenário 3** (estoque 0):
  ```typescript
  if (disponivelX === 0) {
    return <Link><ToneChip tone="warning" label="Fora de estoque" /></Link>;
  }
  ```
- **Linha 258-268**: **Cenário 4** (estoque > 0):
  ```typescript
  return <Link>{disponivelX} de {disponivelY} disponíveis</Link>;
  ```

**Evidência de Teste Manual Necessária**:
- [ ] **Cenário 1**: Produto sem SKUs → badge "Sem SKU ativo" (cinza, sem link)
- [ ] **Cenário 2**: Produto com SKUs todos inativos → badge "Sem SKU ativo" (cinza, sem link)
- [ ] **Cenário 3**: Produto com SKUs ativos mas estoque 0 → badge "Fora de estoque" (amarelo, com link)
- [ ] **Cenário 4**: Produto com SKUs ativos e estoque > 0 → "X de Y disponíveis" (texto, com link)

---

### 5. KPIs Clicáveis - URL Sync ✅

**Arquivo**: `app/admin/products/page.tsx`
- **Linha 223-229**: KPI "produtos" → `href={withQuery("/admin/products", {})}` (remove filtros)
- **Linha 230-236**: KPI "ativos" → `href={withQuery("/admin/products", { ...baseParams, active: "active", page: 1 })}`
- **Linha 237-245**: KPI "SKUs ativos" → `href={withQuery("/admin/products", { ...baseParams, active: "active", page: 1 })}` (informativo)
- **Linha 246-252**: KPI "Fora de estoque" → `href={withQuery("/admin/products", { ...baseParams, stock: "out", page: 1 })}`

**Evidência de Teste Manual Necessária**:
- [ ] Clicar em "Fora de estoque" → URL muda para `?stock=out&page=1` e lista filtra
- [ ] Clicar em "Ativos" → URL muda para `?active=active&page=1` e lista filtra
- [ ] Clicar em "produtos" → URL remove filtros e mostra todos
- [ ] Verificar: filtros aplicados corretamente na lista

---

### 6. ToneChip - Substituição de Chip com OrderStatus ✅

**Arquivo**: `app/admin/_components/ToneChip.tsx` (NOVO)
- Componente criado com props: `tone: "success" | "neutral" | "warning" | "danger"`

**Arquivo**: `app/admin/products/ProductsTableExpandable.client.tsx`
- **Linha 9**: Import de `ToneChip` (não mais `Chip`)
- **Linha 180-184**: Status do produto usa `ToneChip` (não mais `Chip` com `OrderStatus`)
- **Linha 218, 238, 252, 334**: Todos os badges usam `ToneChip`

**Grep Validation**:
```bash
grep -r "CONFIRMADO\|CANCELADO\|variant.*status" app/admin/products
# Resultado: 0 matches ✅
```

**Evidência de Teste Manual Necessária**:
- [ ] Badge "Ativo" aparece em verde (tone="success")
- [ ] Badge "Inativo" aparece em amarelo (tone="warning")
- [ ] Badge "Sem SKU ativo" aparece em cinza (tone="neutral")
- [ ] Badge "Fora de estoque" aparece em amarelo (tone="warning")

---

### 7. Link Removido do Nome do Produto ✅

**Arquivo**: `app/admin/products/ProductsTableExpandable.client.tsx`
- **Linha 179**: `<span className={layoutStyles.productName}>` (antes era `<Link>`)
- **Linha 265**: `rowHref={(row: ProductRow) => `/admin/products/${row.id}`}` no DataTable

**Evidência de Teste Manual Necessária**:
- [ ] Nome do produto não é mais clicável diretamente
- [ ] Clicar em qualquer parte da linha (exceto expand/kebab/link) → navega
- [ ] Visual: nome não tem underline nem cor de link

---

## 🧪 Testes Manuais Necessários

### Checklist de Testes (15 itens)

#### Expand Reset (3 itens)
- [ ] Expandir linha → mudar busca → expand recolhe
- [ ] Expandir linha → mudar categoria → expand recolhe
- [ ] Expandir linha → ordenar → expand **NÃO** recolhe

#### Row Click (4 itens)
- [ ] Clicar linha → navega
- [ ] Clicar expand → **NÃO** navega
- [ ] Clicar kebab → **NÃO** navega
- [ ] Clicar "Ver produção" → **NÃO** navega linha

#### Mobile (3 itens)
- [ ] Viewport <640px → apenas "Produto" e "Disponível" visíveis
- [ ] Nome do produto com `line-clamp-2`
- [ ] Touch targets ≥44px

#### Coluna "Disponível" (4 itens)
- [ ] Sem SKU → "Sem SKU ativo" (cinza)
- [ ] SKU inativo → "Sem SKU ativo" (cinza)
- [ ] Estoque 0 → "Fora de estoque" (amarelo, link)
- [ ] Estoque > 0 → "X de Y disponíveis" (texto, link)

#### KPIs (1 item)
- [ ] Clicar KPI → URL muda e lista filtra

---

## 📊 Validações de Código Executadas

### TypeScript
```bash
npx tsc --noEmit
```
- ✅ Sem erros nos arquivos do PR A
- ⚠️ Erros em outros arquivos (tests, Button.tsx) não relacionados

### Linter
```bash
read_lints
```
- ✅ `DataTable.tsx`: 0 erros
- ✅ `ToneChip.tsx`: 0 erros
- ✅ `ProductsTableExpandable.client.tsx`: 0 erros

### Grep Validations
```bash
# Verificar que não há mais uso de Chip com OrderStatus
grep -r "CONFIRMADO\|CANCELADO\|variant.*status" app/admin/products
# Resultado: 0 matches ✅

# Verificar que expandStateKey está implementado
grep -r "expandStateKey" app/admin/_components/DataTable.tsx
# Resultado: 5 matches ✅

# Verificar que ToneChip está sendo usado
grep -r "ToneChip" app/admin/products/ProductsTableExpandable.client.tsx
# Resultado: 13 matches ✅
```

---

## 📝 Lista Final de Diffs

### Arquivos Modificados

1. **`app/admin/_components/DataTable.tsx`**
   - Adicionada prop `expandStateKey?: string`
   - Adicionado `useEffect` para resetar expands
   - Corrigido tipo de `handleRowClick` (evento opcional)

2. **`app/admin/products/ProductsTableExpandable.client.tsx`**
   - Removido `<Link>` do nome do produto
   - Adicionado `expandStateKey` baseado em filtros
   - Substituído `Chip` por `ToneChip` em todos os lugares
   - Padronizada coluna "Disponível" com lógica correta
   - Adicionado `mobilePriority: "low"` em category e skus

3. **`app/admin/products/products.module.css`**
   - Adicionado `.availableCell`
   - Adicionado `.productName`
   - **Ajuste**: `menuTrigger` alterado de 28px → 44px (touch target)

4. **`app/admin/_components/DataTable.module.css`**
   - **Ajuste**: `expandButton` alterado de 32px → 44px (touch target)

### Arquivos Novos

4. **`app/admin/_components/ToneChip.tsx`** (NOVO)
   - Componente para status genérico (não OrderStatus)

5. **`app/admin/_components/ToneChip.module.css`** (NOVO)
   - Estilos usando tokens do Design System

---

## ⚠️ Riscos Restantes

### Riscos Identificados

1. **Expand Reset pode ser muito agressivo**
   - **Risco**: Se o usuário expandir uma linha e mudar um filtro não relacionado, o expand fecha
   - **Mitigação**: Comportamento esperado conforme DoD. Usuário pode expandir novamente.

2. **Mobile Priority pode ocultar informações importantes**
   - **Risco**: Em mobile, categoria e SKUs ficam ocultos
   - **Mitigação**: Informações disponíveis no expand. Conforme Design System.

3. **ToneChip pode não ter todos os estilos do Chip original**
   - **Risco**: Diferenças visuais sutis
   - **Mitigação**: ToneChip usa tokens do Design System, garantindo consistência.

### Riscos Não Identificados

- Nenhum risco adicional identificado na análise estática.

---

---

## 🔧 Ajustes Aplicados Durante Análise

### Ajuste 1: Touch Targets (Acessibilidade) ✅
**Problema Identificado**: Botões `expandButton` e `menuTrigger` tinham tamanhos abaixo de 44px (requisito WCAG AA).

**Correção Aplicada**:
- `app/admin/_components/DataTable.module.css`: `expandButton` alterado de 32px → 44px
- `app/admin/products/products.module.css`: `menuTrigger` alterado de 28px → 44px
- Adicionado `min-width: 44px` e `min-height: 44px` para garantir tamanho mínimo

**Status**: ✅ Corrigido antes dos testes manuais

---

## 🧪 Testes Manuais - Roteiro de Execução

### Ambiente de Teste
- [ ] Desktop (Chrome) - Versão: __________
- [ ] Mobile simulado (<640px) - Device: __________
- [ ] Mobile real (touch) - Device: __________ (se possível)

### Roteiro de Testes (15 itens)

#### 1. Row Click
**Teste**: Clicar em área neutra da linha (não em expand/kebab/link)
- [ ] **PASS** / [ ] **FAIL**
- **Observações**: _________________________________________________

#### 2. Expand Click
**Teste**: Clicar no chevron → expande/recolhe e NÃO navega
- [ ] **PASS** / [ ] **FAIL**
- **Observações**: _________________________________________________

#### 3. Kebab Menu
**Teste**: Abrir menu → NÃO navega; clicar em item do menu executa ação esperada
- [ ] **PASS** / [ ] **FAIL**
- **Observações**: _________________________________________________

#### 4. Link "Ver produção"
**Teste**: Clicar no link dentro de "Disponível" → vai para `/admin/capacidade?...` e NÃO navega para produto
- [ ] **PASS** / [ ] **FAIL**
- **Observações**: _________________________________________________

#### 5. Reset Expands - Busca (q)
**Teste**: Expandir 2 linhas, mudar `q` (busca) → recolhe tudo
- [ ] **PASS** / [ ] **FAIL**
- **Observações**: _________________________________________________

#### 6. Reset Expands - Categoria (categoryId)
**Teste**: Expandir 2 linhas, mudar `categoryId` → recolhe tudo
- [ ] **PASS** / [ ] **FAIL**
- **Observações**: _________________________________________________

#### 7. Reset Expands - Estoque (stock)
**Teste**: Expandir 2 linhas, mudar `stock` → recolhe tudo
- [ ] **PASS** / [ ] **FAIL**
- **Observações**: _________________________________________________

#### 8. Reset Expands - Ativo (active)
**Teste**: Expandir 2 linhas, mudar `active` → recolhe tudo
- [ ] **PASS** / [ ] **FAIL**
- **Observações**: _________________________________________________

#### 9. NÃO Resetar - Ordenar
**Teste**: Expandir 2 linhas, ordenar → mantém expand
- [ ] **PASS** / [ ] **FAIL**
- **Observações**: _________________________________________________

#### 10. NÃO Resetar - Paginar (se aplicável)
**Teste**: Expandir 2 linhas, paginar → mantém expand (se dataset mudar e isso quebrar UX, documente)
- [ ] **PASS** / [ ] **FAIL** / [ ] **N/A** (sem paginação)
- **Observações**: _________________________________________________

#### 11. Coluna "Disponível" - Sem SKU
**Teste**: Produto sem SKUs → badge "Sem SKU ativo" (cinza, sem link)
- [ ] **PASS** / [ ] **FAIL**
- **Observações**: _________________________________________________

#### 12. Coluna "Disponível" - SKUs Inativos
**Teste**: Produto com SKUs todos inativos → badge "Sem SKU ativo" (cinza, sem link)
- [ ] **PASS** / [ ] **FAIL**
- **Observações**: _________________________________________________

#### 13. Coluna "Disponível" - Estoque 0
**Teste**: Produto com SKUs ativos mas estoque 0 → badge "Fora de estoque" (amarelo, com link)
- [ ] **PASS** / [ ] **FAIL**
- **Observações**: _________________________________________________

#### 14. Coluna "Disponível" - Estoque > 0
**Teste**: Produto com SKUs ativos e estoque > 0 → "X de Y disponíveis" (texto, com link)
- [ ] **PASS** / [ ] **FAIL**
- **Observações**: _________________________________________________

#### 15. Mobile (<640px) - Colunas
**Teste**: Colunas low ocultas (categoria, skus, preço), colunas high visíveis
- [ ] **PASS** / [ ] **FAIL**
- **Observações**: _________________________________________________

#### 16. Mobile - Truncation
**Teste**: Truncation `line-clamp-2` funciona e não quebra layout
- [ ] **PASS** / [ ] **FAIL**
- **Observações**: _________________________________________________

#### 17. Mobile - Touch Targets
**Teste**: Expand e kebab são fáceis de tocar (≈44px) — anote se estiver "apertado"
- [ ] **PASS** / [ ] **FAIL**
- **Observações**: _________________________________________________

#### 18. KPIs - "Ativos" e "Fora de estoque"
**Teste**: Clicar "Ativos" e "Fora de estoque" altera URL e lista; "Produtos" remove filtros
- [ ] **PASS** / [ ] **FAIL**
- **Observações**: _________________________________________________

---

## 📊 Resultados dos Testes Manuais

### Resumo
- **Total de Testes**: 18
- **PASS**: ___ / 18
- **FAIL**: ___ / 18
- **N/A**: ___ / 18

### Itens com FAIL
1. _________________________________________________
2. _________________________________________________
3. _________________________________________________

### Ajustes Necessários (se houver)
1. _________________________________________________
2. _________________________________________________
3. _________________________________________________

---

## ✅ Conclusão Final

### Status do PR A
- [ ] **PR A pronto para merge** (todos os testes PASS)
- [ ] **Pendências identificadas** (X/Y itens com FAIL - ver seção acima)

### Recomendação
_________________________________________________
_________________________________________________
_________________________________________________

**Data de Execução dos Testes**: __________  
**Executado por**: __________
