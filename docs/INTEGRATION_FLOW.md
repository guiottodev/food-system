# Integration Flow (Manual)

Use este roteiro quando nao houver testes de integracao automatizados.

## Fluxo 1 â€” Pedido ate Entregue (estoque uma vez)
1) Criar ou escolher um SKU ativo com estoque > 0.
2) Criar um novo pedido com o SKU e quantidade valida.
3) Ir para o detalhe do pedido e transicionar: RASCUNHO -> EM_PRODUCAO -> PRONTO -> ENTREGUE.
4) Verificar que o estoque foi decrementado uma unica vez.
5) Repetir a transicao para ENTREGUE e confirmar que nao decrementa novamente.

## Fluxo 2 â€” Disponibilidade de SKU (ativo/inativo)
1) Criar categoria ativa.
2) Criar produto ativo com a categoria.
3) Criar SKU ativo e verificar que aparece no novo pedido.
4) Inativar SKU e confirmar que nao aparece no novo pedido, mas permanece no historico.

## Fluxo 3 â€” Snapshot de pedido
1) Criar um pedido com SKU ativo e confirmar que aparece no detalhe com nome/valor/unidade.
2) Editar o SKU (nome/unidade/preco) ou inativar o SKU.
3) Reabrir o pedido historico e confirmar que os dados exibidos seguem o snapshot original.

