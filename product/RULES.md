# RULES

## Workflow de status e transições permitidas
Status (pt-BR): Novo, Confirmado, Em produção, Pronto, Em rota, Entregue, Cancelado.

Transições:
- Novo -> Confirmado | Cancelado
- Confirmado -> Em produção | Pronto | Cancelado
- Em produção -> Pronto | Cancelado
- Pronto -> Em rota | Entregue | Cancelado
- Em rota -> Entregue | Cancelado
- Entregue -> (sem mudanças)
- Cancelado -> (sem mudanças)

Cancelamento exige motivo obrigatório (cancellation_reason).

## Regras de estoque e tipo de pedido
Definições:
- Pronta entrega: pedido cuja entrega deve ser atendida a partir do estoque pronto no momento da confirmação.
- Encomenda: pedido que será produzido; não consome estoque pronto na confirmação.

Regras:
- Ao confirmar um pedido de prontos itens (order_type = pronta_entrega), o sistema tenta baixar o estoque pronto imediatamente.
- Se algum SKU não tiver saldo suficiente, o pedido é convertido automaticamente para encomenda, gera alerta visível e nenhum saldo é baixado.
- A conversão automática deve registrar auditoria (quem/quando) e a mensagem do alerta.
- Baixa de estoque gera inventory_movements do tipo out por SKU.
- Ajustes manuais (override) são permitidos apenas para admins e exigem motivo explícito; gerar inventory_movements do tipo adjustment.

## Regras de unidades e quantidades (fracionárias)
- Cada SKU define unit_type e quantity_step.
- unit_type permitido: unidade, cento, kg, g.
- Quantidade deve ser múltiplo exato de quantity_step do SKU.
- unidade e cento: quantity_step = 1 (somente inteiros).
- kg: quantity_step = 0,1 por padrão (pode ser 0,5 quando configurado no SKU).
- g: quantity_step = 1 (inteiros em gramas).
- Exemplo: SKU "Bolo Chocolate" com unit_type = kg e quantity_step = 0,1 aceita 1,0; 1,5; 2,3 e rejeita 1,55.

## Regras de capacidade
- Capacidade diária padrão é definida por categoria.
- SKU crítico pode ter override de capacidade diária que prevalece sobre a categoria.
- Se a soma de quantidades por SKU ou categoria exceder a capacidade do dia, o sistema gera alerta.
- O alerta não bloqueia a criação; o admin pode prosseguir com justificativa registrada em auditoria.

## Regras de entrega e taxa
- Método de entrega: entrega ou retirada.
- Entrega exige endereço; retirada não exige endereço.
- A taxa de entrega é um campo manual no pedido e compõe o total.

## Regras de order_number
- order_number é gerado no salvamento do pedido.
- Formato: YYYY-NNNNNN (ex.: 2026-000123).
- Sequência é incremental e reinicia a cada ano.
- Geração deve ser atômica para garantir unicidade e ordenação.
- order_number nunca é reutilizado, mesmo se pedido for cancelado.

## Regras de impressão
Inclusão (verbatim):
Printing inclusion rule: daily/weekly/production prints include only statuses Confirmado / Em produção / Pronto / Em rota (exclude Novo and Cancelado).

Campos obrigatórios por tipo:
- Ticket por pedido: order_number, status, data/hora (delivery_datetime), tipo (entrega/retirada), cliente, telefone, endereço (se entrega), taxa de entrega, total, itens e resumo compacto.
- Lista do dia: data do dia, agrupamento por Entrega/Retirada, order_number, horário, cliente, telefone, status, resumo compacto.
- Lista da semana: agrupamento por dia, order_number, horário, cliente, telefone, status, resumo compacto.
- Produção do dia: data do dia, SKU, unidade, quantidade total agregada por SKU, total geral de itens.

Ordenação e agrupamento:
- Lista do dia: ordenar por delivery_datetime e agrupar por Entrega/Retirada.
- Lista da semana: agrupar por dia e ordenar por delivery_datetime.
- Produção do dia: agrupar por SKU e ordenar por nome do SKU.

Resumo compacto de itens:
- Formato: <NOME SKU> x<QTD>; <NOME SKU> x<QTD>; <NOME SKU> x<QTD>
- Quantidades fracionárias devem usar vírgula como separador decimal (ex.: 1,5).
- Exemplo: Coxinha 25g Frango Congelada x100; Bolinha de Queijo x50; Bolo Chocolate kg x1,5

## Regras de auditoria (obrigatórias)
Registrar audit_logs para:
- Criação e edição de pedido (inclui endereço, taxa, itens e observações).
- Mudança de status e cancelamento (com motivo).
- Mudança de preço de SKU e alterações em price_at_time.
- Movimentações e ajustes de estoque.
- Alterações de capacidade e overrides.
- Anonimização de cliente (LGPD).
