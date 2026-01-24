# Atenção e pendências

Referência canônica: `docs/SOURCE_OF_TRUTH.md` (seção 8).

## Razões fortes
- INCOMPLETE (sem itens ou sem data de entrega)
- ALTERADO_APOS_CONFIRMACAO (needsReconfirmation true)

## Razões fracas
- UNAVAILABLE_ITEMS (gap de disponibilidade de produção)
- MISSING_ADDRESS (ENTREGA sem endereço)
- MISSING_TIME (entrega nos próximos 7 dias sem horário específico)
- SALDO_INSUFICIENTE (entrega realizada sem saldo suficiente; produção pendente)

## Onde as pendências aparecem

- **Painel (/admin)**  
  Contador de "Pendencias fortes" (todos os pedidos ativos) e lista de até 10 itens: pedidos com `hasAttention` ou `needsProduction`, entrega nos próximos 15 dias, ordenados por fortes primeiro e depois por data. Cada item: número, cliente, entrega, tipo de pendência; link para o pedido. "Ver todos" → /admin/orders?attention=with.

- **Pedidos (/admin/orders)**  
  Filtro "Com pendencias" e subtipos (Itens indisponiveis, Pedido incompleto, etc.); badges na tabela e na expansão.

- **Detalhe do pedido (/admin/orders/[id])**  
  Blocos "Pendencias (bloqueiam)" e "Alertas (não bloqueiam)".

A tela dedicada /admin/pendencias foi descontinuada; o filtro de Pedidos e a lista no Painel cobrem o fluxo.
