# Integration Flow (Manual)

Use este roteiro quando nao houver testes de integracao automatizados.

## Fluxo 1 — Pedido ate Entregue (estoque uma vez)
1) Criar ou escolher um SKU ativo com estoque > 0.
2) Criar um novo pedido com o SKU e quantidade valida.
3) Ir para o detalhe do pedido e transicionar: NOVO -> EM_PRODUCAO -> PRONTO -> ENTREGUE.
4) Verificar que o estoque foi decrementado uma unica vez.
5) Repetir a transicao para ENTREGUE e confirmar que nao decrementa novamente.

## Fluxo 2 — Catalogo (active/inactive)
1) Criar categoria ativa.
2) Criar produto ativo com a categoria.
3) Criar SKU ativo e verificar que aparece no novo pedido.
4) Inativar SKU e confirmar que nao aparece no novo pedido, mas permanece no historico.
