# Validações

Referência canônica: `docs/SOURCE_OF_TRUTH.md` (seções 5 e 7.8 a 7.10).

Regras de quantidade
- KG: múltiplos de 0.05
- UNIDADE: inteiros
- minQty e quantityStep do SKU são respeitados

Preço e custo
- UNIDADE: até 4 casas decimais
- Outros tipos: 2 casas decimais

Referência de SKU
- Opcional, máxima 50 caracteres
- Única quando preenchida (case-insensitive via referenciaNormalized)

Atributos de SKU
- Máximo de 15 atributos por SKU
- Atributos devem existir no catálogo e estar ativos
- Para LISTA, o valor deve existir em `atributo_valores`

Datas
- ENCOMENDA não aceita datas passadas.
- Confirmação exige data de entrega e pelo menos um item.

Pagamento
- ENTREGUE não exige paidAt.

Checagem de estoque
- ENTREGUE usa sku.stockQuantity e não bloqueia; apenas alerta e registra pendência.
- PRONTA_ENTREGA pode alertar na criação quando faltar saldo.
- Observação: estoque pronto é por SKU; disponibilidade de produção é por produto.