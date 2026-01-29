# Fluxo Completo de Estoque e Disponibilidade

## Princípio Fundamental

**`stockQuantity` sempre reflete `produced - consumed`**

O estoque físico (`stockQuantity`) é sempre calculado como a diferença entre o que foi produzido e o que foi consumido. Isso garante consistência total entre os dados.

---

## 1. Registro de Produção (`/admin/producao`)

**O que acontece:**
1. Usuário registra produção de um SKU (ex: 15 unidades de Croissant)
2. Sistema cria registro em `ProductionSession` e `ProductionSessionItem`
3. Sistema recalcula `stockQuantity = SUM(produced) - SUM(consumed)` para o SKU
4. Se houver `pendingProductionQuantity`, reduz primeiro antes de aumentar estoque

**Código:** `app/admin/producao/actions.ts`

**Exemplo:**
- Produzido: 15 unidades
- Consumido: 0 unidades
- **stockQuantity = 15 - 0 = 15**

---

## 2. Registro de Consumo Manual (`/admin/consumo`)

**O que acontece:**
1. Usuário registra consumo manual de um SKU (ex: 5 unidades)
2. Sistema cria registro em `ProductionConsumption` com `sourceType: "MANUAL"`
3. Sistema recalcula `stockQuantity = SUM(produced) - SUM(consumed)` para o SKU
4. Se consumo > estoque atual, aumenta `pendingProductionQuantity`

**Código:** `app/admin/consumo/actions.ts`

**Exemplo:**
- Produzido: 15 unidades
- Consumido: 5 unidades (manual)
- **stockQuantity = 15 - 5 = 10**

---

## 3. Criação de Pedido (`/admin/orders/new`)

**O que acontece:**
1. Usuário cria pedido com itens
2. Sistema verifica disponibilidade via `/api/orders/availability`
3. Para `PRONTA_ENTREGA`: verifica `stockQuantity` do SKU
4. Para `ENCOMENDA`: verifica disponibilidade de produção (agregado por produto)
5. Mostra alertas se necessário, mas **não bloqueia** (permite salvar como rascunho)

**Alertas:**
- **"Precisa produzir"**: Quando `hasUnavailableItems = true` (produção insuficiente)
- **"Sem estoque"**: Quando `hasOutOfStockSkus = true` (stockQuantity insuficiente para PRONTA_ENTREGA)

**Código:** 
- `app/admin/orders/new/OrderForm.tsx` (cliente)
- `app/api/orders/availability/route.ts` (API)

---

## 4. Entrega de Pedido (`transitionOrderStatus` → `ENTREGUE`)

**O que acontece:**
1. Usuário marca pedido como `ENTREGUE`
2. Sistema cria registro em `ProductionConsumption` com:
   - `sourceType: "IMMEDIATE"`
   - `note: "Entrega do pedido {orderNumber}"`
   - Quantidade = soma dos itens do pedido
3. Sistema recalcula `stockQuantity = SUM(produced) - SUM(consumed)` para cada SKU
4. Se `stockQuantity` ficar negativo, ajusta para 0 e aumenta `pendingProductionQuantity`

**Código:** `lib/domain/transitionOrderStatus.ts`

**Exemplo:**
- Antes: Produzido 15, Consumido 5 → stockQuantity = 10
- Entrega: 8 unidades
- Depois: Produzido 15, Consumido 13 → **stockQuantity = 2**

---

## 5. Edição de Pedido Entregue (`/admin/orders/[id]/edit`)

**O que acontece:**
1. Usuário edita pedido com status `ENTREGUE`
2. Sistema busca consumo existente relacionado ao pedido (pela nota)
3. Atualiza ou cria consumo conforme quantidade final dos itens
4. Sistema recalcula `stockQuantity = SUM(produced) - SUM(consumed)` para cada SKU afetado

**Código:** `app/admin/orders/[id]/edit/actions.ts`

**Exemplo:**
- Pedido tinha 8 unidades entregues
- Edição muda para 10 unidades
- Sistema atualiza consumo de 8 → 10
- Recalcula: Produzido 15, Consumido 15 → **stockQuantity = 0**

---

## 6. Verificação de Disponibilidade

### Para PRONTA_ENTREGA
- Verifica `sku.stockQuantity` diretamente
- Se `requiredQty > stockQuantity` → mostra alerta "Sem estoque"

### Para ENCOMENDA
- Verifica disponibilidade agregada por produto: `SUM(produced) - SUM(consumed)`
- Se `requiredQty > available` → mostra alerta "Precisa produzir"

**Código:** `app/api/orders/availability/route.ts`

---

## 7. Tela de Capacidade (`/admin/capacidade`)

**O que mostra:**
- **Produzido**: Soma de `ProductionSessionItem` por produto/SKU
- **Consumido**: Soma de `ProductionConsumption` por produto/SKU
- **Disponível**: `Produzido - Consumido` (igual a `stockQuantity` para SKU)
- **Demanda**: Soma de pedidos `RASCUNHO`, `CONFIRMADO`, `EM_PRODUCAO`
- **Gap**: `max(Demanda - Disponível, 0)`

**Código:** `lib/domain/production.ts` → `getCapacityRows()`

---

## 8. Sincronização Inicial (Script)

**Script:** `scripts/sync-stock-quantity.ts`

**O que faz:**
1. Para cada SKU ativo:
   - Calcula `produced = SUM(ProductionSessionItem)`
   - Calcula `consumed = SUM(ProductionConsumption)`
   - Calcula `newStockQuantity = produced - consumed`
   - Atualiza `stockQuantity` se diferente
   - Ajusta `pendingProductionQuantity` se necessário

**Quando executar:**
- Após migração de dados
- Se houver inconsistências detectadas
- Após correções de bugs

---

## Garantias do Sistema

✅ **Consistência**: `stockQuantity` sempre reflete `produced - consumed`
✅ **Rastreabilidade**: Todo consumo tem registro em `ProductionConsumption`
✅ **Idempotência**: Entrega só cria consumo uma vez (`stockDecrementedAt`)
✅ **Alertas**: Sistema avisa mas não bloqueia (permite rascunho)
✅ **Sincronização**: Todas as operações mantêm estoque sincronizado

---

## Fluxo Visual

```
PRODUÇÃO
  ↓
ProductionSessionItem criado
  ↓
stockQuantity = produced - consumed (recalculado)
  ↓
Estoque disponível aumenta

CONSUMO MANUAL
  ↓
ProductionConsumption criado (MANUAL)
  ↓
stockQuantity = produced - consumed (recalculado)
  ↓
Estoque disponível diminui

ENTREGA DE PEDIDO
  ↓
ProductionConsumption criado (IMMEDIATE)
  ↓
stockQuantity = produced - consumed (recalculado)
  ↓
Estoque disponível diminui

VERIFICAÇÃO DE DISPONIBILIDADE
  ↓
PRONTA_ENTREGA: verifica stockQuantity
ENCOMENDA: verifica produced - consumed (agregado)
  ↓
Mostra alertas se necessário
  ↓
Permite salvar mesmo assim (rascunho)
```

---

## Campos Importantes

- **`sku.stockQuantity`**: Estoque físico atual (sempre = produced - consumed)
- **`sku.pendingProductionQuantity`**: Quantidade que precisa ser produzida para atender pendências
- **`ProductionSessionItem.quantity`**: Quantidade produzida em uma sessão
- **`ProductionConsumption.quantity`**: Quantidade consumida (manual ou entrega)
- **`ProductionConsumption.sourceType`**: `"MANUAL"` ou `"IMMEDIATE"` (entrega)
- **`ProductionConsumption.note`**: Descrição do consumo (ex: "Entrega do pedido #12345")
