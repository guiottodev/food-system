# Fluxo de status

Referência canônica: `docs/SOURCE_OF_TRUTH.md` (seção 7.1).

Transições
- RASCUNHO -> CONFIRMADO, EM_PRODUCAO, CANCELADO
- CONFIRMADO -> EM_PRODUCAO, CANCELADO
- EM_PRODUCAO -> PRONTO, CANCELADO
- PRONTO -> ENTREGUE, CANCELADO
- ENTREGUE -> (sem transições)
- CANCELADO -> (sem transições)

Regras
- CONFIRMADO e EM_PRODUCAO exigem pedido pronto (itens + data).
- PRONTO e ENTREGUE não podem ocorrer se houver pendências fortes.
- ENTREGUE não exige pagamento.
Observação: o fluxo permite ir de RASCUNHO direto para EM_PRODUCAO.
