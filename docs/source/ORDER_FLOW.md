# Fluxo de pedido

Referência canônica: `docs/SOURCE_OF_TRUTH.md` (seção 7).

Passos principais
1) Selecionar ou criar cliente.
2) Escolher método de entrega.
3) Escolher tipo de pedido.
4) Adicionar itens e preços unitários.
5) Informar método de pagamento e sinal (opcional).
6) Salvar como RASCUNHO.

Notas
- PRONTA_ENTREGA define deliveryDatetime como agora na criação.
- ENCOMENDA pode ser salva sem data de entrega, mas a confirmação exige data.
- A edição substitui itens e recalcula totais.
- Pedidos finais exigem confirmação e motivo para edição.
Observação: pedidos ENTREGUE/CANCELADO são finais para transição, mas editáveis sob confirmação.
Observação: ENTREGUE consome o saldo de pronta-entrega do SKU; se não houver saldo, gera pendência.
