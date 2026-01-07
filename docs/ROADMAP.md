# ROADMAP — Execução por tarefas (v1.0)

## Regras de execução
- 1 tarefa por vez
- branch por tarefa
- PR pequeno com diff revisável
- sempre rodar build no fim

## Ordem recomendada (reduz retrabalho)
T0) Criar docs/SPEC.md e ROADMAP.md; garantir .env.example; garantir .gitignore correto
T1) Validação de quantidade (KG 0,05 / UN inteiro) — para SKU e Item Livre
T2) OrderItem Livre (DB + UI + server) com disciplina (categoria+tags obrigatórias)
T3) Preço editável por item + snapshot consistente (unitPriceAtTime)
T4) Travas de edição em ENTREGUE/CANCELADO (UI + server)
T5) “Sob consulta” bloqueia adicionar ao pedido + CTA WhatsApp
T6) Impressão A4 por pedido (HTML print-friendly) + botão no detalhe
T7) Estoque ledger completo (SALE/CANCEL/ADJUST/CONVERT_RESTORE) + delta em edição + conversão depois
T8) Relatórios básicos (KG separado de UNIDADE; top SKUs; itens livres agrupados)

## Critérios de aceite por task
Cada tarefa deve ter:
- Critérios de aceitação claros
- Build passando (npm run build)
- Mudanças mínimas fora do escopo
