# PRD

## Problema
O fluxo atual depende de WhatsApp e anotações em papel na geladeira, o que gera perda de informações, retrabalho e dificuldade de rastrear pedidos, estoque pronto e capacidade diária. Precisamos de um sistema interno para entrada de pedidos, controle operacional e impressão padronizada, substituindo totalmente o papel.

## Objetivos (primários e secundários)
Primários
- Centralizar pedidos com SKU, preço no momento do pedido e status rastreável.
- Garantir impressão operacional: ticket por pedido e listas diária/semanal/produção.
- Controlar estoque pronto por SKU com movimentações e alertas.
- Respeitar capacidade diária por categoria e por SKU crítico.

Secundários
- Permitir relatórios básicos e exportação CSV.
- Garantir auditoria completa e conformidade LGPD (anonimização).
- Tornar a entrada de pedido possível em até 1 minuto.
- UI e impressões em pt-BR; identificadores de código podem ser em inglês.
- Uso principal em PC; responsivo mobile é nice-to-have.

## Não-objetivos
- Portal público para clientes finais ou vendas online.
- Pagamentos ou integrações financeiras.
- App móvel dedicado.

## Personas
- Dona (admin): precisa de controle total dos pedidos, produção e estoque; usa o PC da loja.
- Assistente (admin): lança pedidos rapidamente e imprime listas; mesmas permissões iniciais.

## Jornada atual vs futura
Atual
- Pedido chega por WhatsApp, é anotado em papel e fixado na geladeira.
- Itens e quantidades são conferidos manualmente para produção.
- Impressões são improvisadas ou inexistentes; controle de estoque é subjetivo.

Futura
- Pedido é lançado no sistema interno com SKU, preço, status, entrega/retirada e data/hora.
- Impressões padronizadas são geradas por dia/semana e por pedido.
- Estoque pronto e capacidade diária são monitorados com alertas e justificativas.

## Escopo por módulos (Pedidos, Impressão, Estoque, Capacidade, Relatórios, Auditoria/LGPD)
Pedidos
- Cadastro de cliente e criação de pedido com order_number, delivery_datetime, itens por SKU e price_at_time.
- Status com histórico e motivo obrigatório para cancelamento.

Impressão
- Ticket por pedido.
- Lista do dia (entrega/retirada hoje).
- Lista da semana (agrupada por dia).
- Produção do dia (agregado por SKU).

Estoque
- Controle de estoque pronto por SKU com movimentações (entrada, saída, ajuste).
- Conversão automática para encomenda quando estoque insuficiente.

Capacidade
- Capacidade diária por categoria com override por SKU crítico.
- Alertas quando exceder capacidade e registro de justificativa.

Relatórios
- Relatórios básicos com filtros por data/status e exportação CSV.

Auditoria/LGPD
- Log de mudanças em pedidos, itens, estoque, capacidade e dados de cliente.
- Anonimização de cliente preservando histórico de pedidos.

Decisões congeladas (verbatim):
1) SKU (variant) is the sellable unit. If something can be sold as “unidade” and “cento”, those are separate SKUs (no automatic conversion).
2) Each order item stores price_at_time captured at save time.
3) If ready-to-sell inventory is insufficient for a “pronta entrega” order, automatically convert it to “encomenda” and show an alert.
4) Capacity model: category-level default capacity + per-critical-SKU override.
5) Printing outputs required:
   - Ticket por pedido
   - Lista do dia (“o que tem para entregar/retirar hoje?”)
   - Lista da semana (agrupada por dia)
   - Produção do dia (agregado: soma por SKU)
6) Printing inclusion rule: daily/weekly/production prints include only statuses Confirmado / Em produção / Pronto / Em rota (exclude Novo and Cancelado).
7) Canceling an order requires a cancel reason (mandatory field).

## Métricas de sucesso (90 dias)
- 90% dos pedidos registrados no sistema (sem papel).
- 95% dos pedidos do dia presentes nas listas de impressão.
- 0 incidentes de alteração de preço após o pedido (price_at_time consistente).
- Estoque pronto com movimentações registradas para os SKUs mais vendidos.

## Riscos e mitigação
- Resistência à mudança: treinamento curto e fluxo de 1 minuto.
- Dados incompletos: validações obrigatórias e mensagens claras.
- Impressão falhar por equipamento: padronizar formatos e testar impressoras.

## Perguntas em aberto (Open Questions)
- Qual modelo de impressora será usado (58mm ou 80mm) e qual papel?
- O horário de entrega é por janela fixa ou horário exato por pedido?
- Qual fuso padrão e se haverá mudança de horário (ex.: horário de verão)?
- Precisamos imprimir em A4 além da térmica?
