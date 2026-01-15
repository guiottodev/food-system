# Decisions (ADRs curtinhos)

Use este arquivo para registrar decisoes nao-triviais e evitar re-discussao.
Mantenha cada decisao curta e objetiva.

---

## ADR-001 — UnitType, snapshot de pedido e idempotencia de estoque
**Data:** 2026-01-13  
**Contexto:** UI cita "DECISAO PENDENTE" para UnitType, mas a SPEC define UNIDADE/CENTO/KG; pedidos precisam manter historico mesmo com SKU inativado; "Entregue" deve baixar estoque uma vez.  
**Decisao:** UnitType allowlist = UNIDADE | CENTO | KG; validacao server-side: UNIDADE/CENTO inteiros > 0, KG multiplo de 0.05 via inteiro escalado (qty * 20); OrderItem salva snapshot (skuName, unitType, unitPrice, productName se aplicavel); estoque decrementa apenas na transicao para "Entregue", em transacao Prisma com guard `stockDecrementedAt`.  
**Consequencias:** UI oculta tipos fora do allowlist; historico nao quebra com SKU inativo; transicao para "Entregue" e idempotente e transacional.  
**Alternativas rejeitadas:** UnitType dinamico (risco de inconsistencias); nao manter snapshot (historico errado); decrementar estoque antes de "Entregue" (risco de baixa indevida).  
**Notas:** Assumptions: fluxo de pedidos nao detalhado em `docs/UI.md` seguira padrao atual; divergencia UI vs SPEC resolvida seguindo a SPEC.

---

## ADR-002 - Defaults de SKU e KIT fora do MVP
**Data:** 2026-01-15  
**Contexto:** O modal de SKU nao coleta unitLabel/minQty/quantityStep, mas o server exigia; "KIT" apareceu em normalizacoes e scripts sem estar no escopo do MVP.  
**Decisao:** O server aplica defaults automaticos por unitType: UNIDADE/CENTO -> minQty=1, step=1, unitLabel conforme tipo; KG -> minQty=0.5, step=0.05, unitLabel="kg". KIT fica fora do MVP e nao e aceito em normalizacoes/labels/UI.  
**Consequencias:** Cadastro de SKU fica simples e consistente; nenhum campo manual de unitLabel/minQty/step no MVP.  
