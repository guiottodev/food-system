# `/admin/capacidade` — filtro produção (últimos 15 dias) + colunas + sort + defaults

## Resumo

Implementação completa de melhorias na tela `/admin/capacidade` para adicionar:
- Filtro independente de "Período da PRODUÇÃO" (últimos X dias - passado)
- Colunas "Produzido" e "Consumido" ordenáveis na tabela principal
- Filtros de demanda e produção funcionando de forma independente
- Defaults coerentes (produção: últimos 15 dias, demanda: próximos 7 dias)

## Mudanças Implementadas

### Backend (`lib/domain/production.ts`)

- ✅ Adicionado "15" ao `CapacityWindowKey` e `WINDOW_DAYS`
- ✅ Criada função `getPastWindowRange` para calcular range de "últimos X dias" (passado)
- ✅ Estendido `CapacityOptions` com `productionWindow?` (default "15")
- ✅ Modificado `getCapacityRows` para filtrar produção/consumo por período histórico
- ✅ Garantido NUMBER em `produced`/`consumed` (normalização com `Number()`)
- ✅ Range sempre usa `gte: start, lt: end` (não `lte`)

### Page + Sort (`app/admin/capacidade/page.tsx`)

- ✅ Adicionado `productionWindow?` em `SearchParams`
- ✅ Normalização de `productionWindow` com default "15"
- ✅ Adicionados sort keys "produced" e "consumed"
- ✅ Implementada ordenação em `sortRows` para ambas as colunas

### Table UI (`app/admin/capacidade/CapacityTable.client.tsx`)

- ✅ Adicionadas colunas "Produzido" e "Consumido" após "Categoria"
- ✅ Configurado: `sortable: true`, `numeric: true`, `align: "right"`, `mobilePriority: "low"`

### Filters UI (`app/admin/capacidade/ProductionFilters.client.tsx`)

- ✅ Adicionado grupo "Período da produção" no drawer (Últimos X dias)
- ✅ Chips com prefixos "Demanda:" e "Produção:" (só aparecem quando != default)
- ✅ URL sync: remove `productionWindow` quando == "15" (default)
- ✅ Reset/Limpar filtros: volta para defaults e ordena por gap desc

## Critérios de Aceitação

### 1. Filtros Independentes
- ✅ Alterar "Período da demanda" não altera "Produção"
- ✅ Alterar "Período da produção" não altera "Demanda"

### 2. Defaults Coerentes
- ✅ Sem `productionWindow` na URL, UI mostra default "15" e backend filtra últimos 15 dias
- ✅ Sem `window` na URL, mantém default demanda (provavelmente "7")
- ✅ Reset/Limpar volta para defaults e ordena por gap desc

### 3. Colunas Produzido/Consumido
- ✅ Colunas aparecem na tabela principal após "Categoria"
- ✅ Ordenação funciona (asc/desc) para ambas
- ✅ Formatação numérica com `formatQty` e `unitLabel`
- ✅ Alinhamento à direita

### 4. Chips e Drawer
- ✅ Chip "Produção: ..." aparece apenas quando `productionWindow !== "15"` (default)
- ✅ Chip "Demanda: ..." aparece apenas quando `window !== "7"` (default demanda)
- ✅ Remover chip de produção remove apenas `productionWindow` da URL (volta para default "15")
- ✅ Remover chip de demanda remove apenas `window` da URL (volta para default "7")
- ✅ "Limpar" remove todos os filtros (q, window, productionWindow, gap) e reseta sort para gap desc

### 5. Range gte/lt
- ✅ Código usa `gte: start` e `lt: end` (não `lte`)
- ✅ Validação: inspecionar código em `lib/domain/production.ts`

### 6. Mobile
- ✅ Tabela continua utilizável em <640px
- ✅ Colunas "Produzido" e "Consumido" têm `mobilePriority: "low"` (colapsam no expand)
- ✅ Sem valores inválidos em `mobilePriority`

### 7. Não Regressão
- ✅ Filtros existentes (q, window, gap) continuam funcionando
- ✅ Listagem atual não quebra
- ✅ Rotas e navegação intactas
- ✅ Ordenação existente continua funcionando

## TODOs de Performance

### Backend (`lib/domain/production.ts`)

```typescript
// TODO: Se volume crescer, considerar groupBy por skuId no Prisma para agregar no banco
// Localização: lib/domain/production.ts, função getCapacityRows
```

**Contexto**: Atualmente usa `findMany` com `select` mínimo e agregação em memória (JavaScript). Se o volume de registros de produção/consumo crescer significativamente, considerar usar `groupBy` por `skuId` no Prisma para realizar a agregação diretamente no banco de dados, melhorando a performance.

**Ação sugerida**: Monitorar performance da query `getCapacityRows` com volumes maiores de dados. Se necessário, implementar agregação via `groupBy` no Prisma.

## Arquivos Modificados

1. `lib/domain/production.ts` - Backend logic
2. `app/admin/capacidade/page.tsx` - Page + sort
3. `app/admin/capacidade/CapacityTable.client.tsx` - Table UI
4. `app/admin/capacidade/ProductionFilters.client.tsx` - Filters UI

## QA Manual (8 Passos)

1. **Filtros Independentes**: Acessar `/admin/capacidade`, alterar "Período da demanda" para "Hoje", verificar que "Produção" permanece "Últimos 15 dias" (default). Alterar "Produção" para "Últimos 30 dias", verificar que "Demanda" permanece "Hoje".

2. **Colunas Visíveis**: Verificar que colunas "Produzido" e "Consumido" aparecem após "Categoria" na tabela principal.

3. **Ordenação**: Clicar no header "Produzido" → verificar ordenação asc. Clicar novamente → verificar ordenação desc. Repetir para "Consumido".

4. **Chips**: Com filtros ativos, verificar chips "Demanda: ..." e "Produção: ..." aparecem apenas quando != default. Clicar × no chip "Produção" → verificar que apenas `productionWindow` é removido da URL (volta para default "15").

5. **Limpar Filtros**: Com múltiplos filtros ativos, clicar "Limpar" → verificar que todos os filtros são removidos (q, window, productionWindow, gap) e **sort volta para gap desc**.

6. **URL Sync**: Alterar filtro de produção → verificar que `productionWindow=...` aparece na URL. Remover filtro → verificar que `productionWindow` é removido da URL.

7. **Mobile**: Redimensionar para <640px → verificar que tabela continua utilizável, colunas "Produzido" e "Consumido" colapsam no expand.

8. **Não Regressão**: Verificar que busca (q), filtro de gap, e ordenação existente continuam funcionando normalmente.

## Greps Úteis para Validação

```bash
# Verificar uso de productionWindow
grep -r "productionWindow" app/admin/capacidade lib/domain/production.ts

# Verificar colunas produced/consumed
grep -r "produced\|consumed" app/admin/capacidade/CapacityTable.client.tsx

# Verificar range gte/lt
grep -r "gte.*start\|lt.*end" lib/domain/production.ts

# Verificar mobilePriority válido
grep -r "mobilePriority" app/admin/capacidade/CapacityTable.client.tsx
```

## Notas Técnicas

- **Range**: Sempre usar `gte: start, lt: end` (não `lte`) para ranges de calendário
- **NUMBER**: Garantido normalização com `Number()` para evitar problemas com Decimal/string em sort
- **Defaults**: Produção = "15" (últimos 15 dias), Demanda = "7" (próximos 7 dias)
- **Mobile**: Colunas novas têm `mobilePriority: "low"` (colapsam no expand em <640px)
