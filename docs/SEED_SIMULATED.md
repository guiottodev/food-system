# Seed simulado (`scripts/seed-simulated.ts`)

Gerador determinístico de base simulada (2025-12-01 a 2026-02-28): ~450 pedidos, 130 produtos, 300 clientes. Respeita o domínio existente (status, disponibilidade por produto, INCOMPLETE, needsReconfirmation).

## Como rodar

```bash
npx tsx scripts/seed-simulated.ts [--mode=golden|bulk|full] [--reset]
```

- **`--mode=full`** (default): golden + bulk. Garante todos os mínimos e volume.
- **`--mode=golden`**: foco em mínimos (pendências, indisponíveis, etc.).
- **`--mode=bulk`**: foco em volume; mínimos não obrigatórios.
- **`--reset`**: limpa tabelas relacionadas antes de gerar (idempotente). Mantém `User`.

Exemplo completo:

```bash
npx tsx scripts/seed-simulated.ts --mode=full --reset
```

## npm scripts

- `npm run seed:sim` — `--mode=full --reset`
- `npm run seed:sim:golden` — `--mode=golden --reset`
- `npm run seed:sim:bulk` — `--mode=bulk --reset`

## Correções e invariants

1. **Sem rebalance loop**: indisponibilidade é planejada antes (8–12 produtos “críticos”, produção baixa, 40 pedidos golden que usam esses produtos com `requiredQty > availableNow`). Validação final via `computeUnavailableItemsForOrders`; assert >= 40. Se falhar, throw (bug do script).

2. **Status como fonte da verdade**: sempre usar o enum de status. `stockDecrementedAt` só quando `status === ENTREGUE`; `cancellationReason` só quando `status === CANCELADO`. Invariants: `status ENTREGUE => stockDecrementedAt`; `status CANCELADO => cancellationReason`; `cancellationReason` não existe fora de CANCELADO.

3. **Disponibilidade por produto**: o domínio usa `getAvailableNowByProductIds` (agregação por produto). Produção/consumo são por SKU; disponibilidade e planejamento da indisponibilidade seguem o mesmo nível (produto).

4. **Telefones**: gerados no formato normalizado (10–11 dígitos). “Quase duplicados” = mesmo prefixo + último dígito diferente (ex.: 11999123450 vs 11999123451). Garantir unicidade para não estourar `unique` em `Customer.phone`.

5. **Reset**: ordem de deleção respeitando FKs. `InventoryMovement` antes de `Order`; `Category.parentId` anulado antes de deletar categorias. Try/catch para tabelas inexistentes. Idempotente.

6. **Performance**: `createMany` onde for seguro; transações pontuais (Order + Items + Consumo de entrega). `prisma.$disconnect()` no `finally`. Todo `shuffle`/`sample` usa PRNG.

7. **Invariants finais**: ver secção “Validação” em baixo.

## Validação e asserts

- `status ENTREGUE` => `stockDecrementedAt` existe
- `status CANCELADO` => `cancellationReason` existe
- `cancellationReason` não existe fora de CANCELADO
- Pedidos CONFIRMADO ou superior => `confirmedAt` existe
- `needsReconfirmation` >= 25 e nenhum deles ENTREGUE
- >= 40 pedidos com indisponível (via `computeUnavailableItemsForOrders`), sem rebalance
- >= 300 clientes; >= 70% com >= 1 pedido
- >= 130 produtos; SKUs cobrindo UNIDADE e KG
- INCOMPLETE apenas por ausência de itens ou de data (usar `getOrderReadiness` / `getOrderPendingSummary`)

## Não altera

- O seed padrão (`prisma db seed` / `prisma/seed.js`) permanece intacto. Este script é independente.
