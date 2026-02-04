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
- Observação: pedidos ENTREGUE/CANCELADO são finais para transição, mas editáveis sob confirmação.
- Observação: ENTREGUE consome o saldo de pronta-entrega do SKU; se não houver saldo, gera pendência.

# Pedidos: Agenda vs Histórico (Discovery de Implementação)

Objetivo
- Separar claramente o modo de trabalho (`Agenda`) do modo de consulta (`Histórico`) sem preferência configurável no MVP.

Decisões fechadas (MVP)
- Histórico mostra `ENTREGUE` + `CANCELADO`.
- Encomenda sem `deliveryDatetime` entra como pendência na Agenda.
- Timezone: usar o do servidor.
- Presets `Próximos 7/30` incluem hoje.
- Filtros de pendências: manter todos os atuais.

Definições
- `status_final`: `ENTREGUE` e `CANCELADO`.
- `status_operacional`: qualquer status que não seja final.
- `hoje`: data do servidor (start/end of day no fuso do servidor).

Regras por modo
- Agenda: mostra apenas `status_operacional`.
- Histórico: mostra apenas `status_final` (`ENTREGUE` + `CANCELADO`).
- Status vence data: pedido final sempre vai para Histórico, mesmo com data futura.

Data de entrega
- `deliveryDatetime` define ordenação e agrupamentos.
- Pedido operacional sem `deliveryDatetime` entra na Agenda e é marcado como pendência (“Sem data”).

Ordenação
- Agenda: `deliveryDatetime ASC`, com “Sem data” por último.
- Histórico: `deliveryDatetime DESC`.

Filtros por modo
- Agenda:
  - Período: Hoje, Próximos 7, Próximos 30, Intervalo.
  - Tipo: Encomenda, Pronta entrega, Todos.
  - Logística: Entrega, Retirada, Todos.
  - Pendências: manter todos os filtros atuais (ex.: Com pendências, Precisa produzir, Pedido incompleto, Alterado após confirmação).
- Histórico:
  - Período: Últimos 7, Últimos 30, Intervalo.
  - Status: Entregue, Cancelado, Todos (ambos).
  - Tipo/Logística: opcionais conforme necessidade atual do produto.

Busca
- Campo único: cliente, telefone ou código do pedido.
- Busca sempre aplicada dentro do modo atual.

Regra de default (MVP)
- Ao abrir a tela:
  - Se existe ao menos um pedido operacional, abrir Agenda.
  - Caso contrário, abrir Histórico.
- Troca manual entre modos não é persistida.

Edge cases
- Operacional com `deliveryDatetime` no passado: aparece na Agenda com chip “Atrasado”.
- `deliveryDatetime` nulo: tratar como pendência e exibir “Sem data”.

Notas técnicas
- Queries devem derivar modo a partir de `isFinalStatus()` para evitar duplicação.
- Para Agenda, incluir `deliveryDatetime = null` nos filtros de período.
