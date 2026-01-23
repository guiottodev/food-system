# Validações

Referência canônica: `docs/SOURCE_OF_TRUTH.md` (seções 7.8 a 7.10).

Regras de quantidade
- KG: múltiplos de 0.05
- UNIDADE/CENTO: inteiros
- minQty e quantityStep do SKU são respeitados

Datas
- ENCOMENDA não aceita datas passadas.
- Confirmação exige data de entrega e pelo menos um item.

Pagamento
- ENTREGUE não exige paidAt.

Checagem de estoque
- ENTREGUE usa sku.stockQuantity e não bloqueia; apenas alerta e registra pendência.
- PRONTA_ENTREGA pode alertar na criação quando faltar saldo.
Observação: estoque pronto é por SKU; disponibilidade de produção é por produto.
