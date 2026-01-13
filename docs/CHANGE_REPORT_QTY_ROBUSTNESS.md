# CHANGE REPORT — Quantity Robustness

## 1) Summary
Este ajuste estabiliza a validacao de quantidade (KG/UNIDADE) no client e no server, com normalizacao consistente e tolerancia numerica realista, garantindo que entradas humanas comuns (virgula e espacos) sejam aceitas sem alterar as regras de negocio.

## 2) What changed
- Normalizacao de quantidade com base em centesimos (q100) e tolerancia 1e-6.
- Validacao de KG (multiplo de 0,05) e UNIDADE (inteiro) centralizada.
- Client usa validacao compartilhada para bloquear envio e mostrar erro claro.
- Script simples para testar casos criticos.
- next-env.d.ts alinhado para nao sujar o git apos build.

## 3) Files changed
- next-env.d.ts
- lib/quantity.ts
- app/admin/orders/new/OrderForm.tsx
- app/admin/orders/new/actions.ts
- scripts/test-quantity.js
- docs/quantity-tests.md

## 4) Behavior before vs after
- Antes: KG aceitava apenas numeros com 1 casa decimal; virgula podia falhar; valores como 0,55 eram invalidos no client.
- Depois: KG aceita 0,50 e 0,55 (inclusive com virgula), rejeita 0,53; UNIDADE aceita 1 e 1.0 (normaliza para 1), rejeita 1,5.

## 5) Edge cases covered
- KG: 0.50 (ok), 0.55 (ok), 0.53 (erro)
- UNIDADE: 1 (ok), 1.0 (ok, normaliza), 1.5 (erro)
- Strings: "0,55" (ok), " 2 " (ok)

## 6) How to test
- `node scripts/test-quantity.js`
- `npm run build`
- Fluxo manual: criar pedido e informar quantidades KG/UNIDADE validas e invalidas.

## 7) Risks / Trade-offs
- Input de quantidade no client passou a aceitar texto para permitir virgula; ainda depende de validacao no submit.
- Nao foi implementado UI para item livre (nao existe no repo).
