# ACCEPTANCE

## Criação de pedido (price_at_time)
- [ ] Dado SKU com price_current = 120,00, quando pedido é salvo com quantidade 2, então order_items.price_at_time = 120,00 e line_total = 240,00.
- [ ] Se o SKU mudar para 130,00 depois, o pedido existente mantém price_at_time = 120,00.

## Transições de status e cancelamento
- [ ] Transições só permitem o fluxo definido em RULES.md; tentativa inválida é bloqueada.
- [ ] Cancelar pedido exige cancellation_reason preenchido; sem motivo o sistema não salva.

## Unidades e quantidades fracionárias
- [ ] Para SKU com unit_type = kg e quantity_step = 0,1, o sistema aceita quantidade 1,5 e calcula line_total = price_at_time * 1,5.
- [ ] Para SKU com unit_type = kg e quantity_step = 0,5, o sistema rejeita quantidade 1,3 e aceita 1,0 e 1,5.

## Impressão: regras gerais
- [ ] Impressões diária/semanal/produção incluem apenas status Confirmado, Em produção, Pronto, Em rota.
- [ ] Pedidos com status Novo ou Cancelado nunca aparecem nas impressões acima.

## Impressão: Ticket por pedido
- [ ] Ticket inclui order_number, status, delivery_datetime, delivery_method, cliente, telefone, endereço (se entrega), taxa, total e itens.
- [ ] Resumo compacto segue o formato: <NOME SKU> x<QTD>; <NOME SKU> x<QTD>; <NOME SKU> x<QTD>.
- [ ] Para item em kg, o resumo usa vírgula: "Bolo Chocolate kg x1,5".

## Impressão: Lista do Dia
- [ ] Lista do dia agrupa por Entrega e Retirada, nesta ordem.
- [ ] Dentro de cada grupo, pedidos ordenados por delivery_datetime crescente.
- [ ] Cada linha contém order_number, horário, cliente, telefone e resumo compacto.

## Impressão: Lista da Semana
- [ ] Lista da semana agrupa por data (dia).
- [ ] Dentro de cada dia, pedidos ordenados por delivery_datetime.
- [ ] Cada linha contém order_number, horário, cliente, telefone e resumo compacto.

## Impressão: Produção do Dia
- [ ] Produção do dia agrega quantidades por SKU somente para status permitidos.
- [ ] Exibe SKU, unidade, total por SKU e total geral do dia.
- [ ] Para SKU em kg com quantidades 1,0 e 1,5 no mesmo dia, o agregado do SKU é 2,5.

## Estoque e conversão para encomenda
- [ ] Dado estoque pronto do SKU = 10 e pedido prático com quantidade 6, ao confirmar gera inventory_movement out de 6 e mantém order_type = pronta_entrega.
- [ ] Dado estoque pronto do SKU = 3 e pedido prático com quantidade 6, ao confirmar converte order_type para encomenda, não gera baixa e exibe alerta "Estoque insuficiente, pedido convertido para encomenda".
- [ ] A conversão gera log em audit_logs com ação "auto_convert_encomenda".
- [ ] Ajuste manual de estoque exige motivo e gera inventory_movement adjustment.

## Capacidade
- [ ] Para SKU crítico com override = 150, capacidade usada é 150 mesmo que categoria tenha 200.
- [ ] Ao exceder a capacidade do dia, sistema exibe alerta e permite salvar com justificativa registrada.

## Auditoria
- [ ] Gera log para: criação/edição de pedido, mudança de status, cancelamento, alteração de price_current, movimentação de estoque, alteração de capacidade e anonimização.

## Relatórios e CSV
- [ ] Exportação CSV respeita filtros de data e status.
- [ ] CSV inclui colunas: order_number, delivery_datetime, delivery_method, order_type, status, customer_name, total, delivery_fee.

## LGPD - Anonimização
- [ ] Ao anonimizar, customer.name vira "ANONIMIZADO" e phone/email/document são removidos.
- [ ] customer.phone é obrigatório quando is_anonymized = false e opcional quando is_anonymized = true.
- [ ] Os pedidos antigos permanecem ligados ao customer_id anonimizado e continuam em relatórios.
- [ ] A ação gera audit_log com usuário, data/hora e motivo.

## order_number
- [ ] Ao criar dois pedidos em sequência no mesmo dia, order_number é único e incremental (ex.: 2026-000123 e 2026-000124).
- [ ] Não há duplicação de order_number mesmo com cancelamento de pedidos.
