# UI_MAP

## Lista de telas (Admin)
- Produtos
- SKUs
- Clientes
- Pedidos
- Detalhe do Pedido
- Agenda do Dia
- Agenda da Semana
- Impressão: Ticket
- Impressão: Lista do Dia
- Impressão: Lista da Semana
- Impressão: Produção do Dia
- Estoque
- Capacidade
- Relatórios
- Auditoria

## Produtos
Ações principais:
- Criar, editar, ativar/desativar produto.

Campos-chave:
- Nome do produto, categoria, status.

Validações:
- Nome obrigatório, categoria obrigatória.

Empty state:
- "Nenhum produto cadastrado. Clique em Novo produto."

## SKUs
Ações principais:
- Criar, editar, ativar/desativar SKU; marcar como crítico.

Campos-chave:
- Produto, Nome de exibição, Unidade (Unidade/Cento/kg/g), Tipo de unidade, Passo de quantidade, Preço atual, SKU crítico.

Validações:
- Nome de exibição obrigatório, preço >= 0.
- Passo de quantidade > 0.
- unidade/cento exigem passo 1.
- kg permite passo 0,1 ou 0,5.
- g exige passo 1.

Empty state:
- "Nenhum SKU cadastrado. Cadastre o primeiro SKU."

## Clientes
Ações principais:
- Criar, editar, anonimizar cliente.

Campos-chave:
- Nome, telefone, email, documento, observações.

Validações:
- Nome e telefone obrigatórios (exceto quando anonimizado).

Empty state:
- "Nenhum cliente cadastrado."

## Pedidos
Ações principais:
- Criar pedido, filtrar por status, data e método (entrega/retirada).
- Acessar impressão rápida do ticket.

Campos-chave:
- order_number, cliente, status, order_type, delivery_method, delivery_datetime, total.

Validações:
- Cliente, order_type, delivery_method e delivery_datetime obrigatórios.

Empty state:
- "Nenhum pedido encontrado."

Requisito de entrada de pedido em 1 minuto:
- Busca rápida de cliente por telefone.
- Busca rápida de SKU por nome com autocomplete.
- Adição de múltiplos itens sem sair do teclado.
- Campos mínimos: cliente, delivery_datetime, order_type, delivery_method e ao menos 1 item.
- Após salvar, botão "Imprimir ticket" visível imediatamente.

## Detalhe do Pedido
Ações principais:
- Adicionar/remover itens, alterar status, cancelar com motivo, imprimir ticket.

Campos-chave:
- order_number, status, delivery_datetime, delivery_method, order_type.
- Itens por SKU: quantidade, unidade, price_at_time, line_total.
- Endereço: address_text, address_bairro, address_referencia.
- Taxa de entrega e total.

Validações:
- Cancelamento exige motivo.
- Entrega exige endereço (texto + bairro).
- Quantidade deve respeitar o passo do SKU (ex.: kg com passo 0,1).

Empty state:
- "Pedido sem itens. Adicione SKUs para continuar."

## Agenda do Dia
Ações principais:
- Visualizar pedidos do dia; imprimir lista do dia; alterar status rápido.

Campos-chave:
- Data (derivada de delivery_datetime), status, delivery_method, order_number, cliente, horário.

Validações:
- Data obrigatória para listagem.

Empty state:
- "Nenhum pedido para hoje."

## Agenda da Semana
Ações principais:
- Visualizar pedidos da semana; imprimir lista da semana.

Campos-chave:
- Intervalo de datas, agrupamento por dia, order_number, cliente, horário.

Validações:
- Início e fim obrigatórios.

Empty state:
- "Nenhum pedido na semana."

## Impressão: Ticket
Ações principais:
- Gerar ticket por pedido.

Campos-chave:
- order_number, status, delivery_datetime, delivery_method, cliente, telefone, endereço (se entrega), taxa e total, itens e resumo compacto.

Validações:
- Pedido deve ter ao menos 1 item.

Empty state:
- "Selecione um pedido para imprimir."

## Impressão: Lista do Dia
Ações principais:
- Gerar lista diária por data.

Campos-chave:
- Data, agrupamento Entrega/Retirada, order_number, horário, cliente, resumo compacto.

Validações:
- Data obrigatória.

Empty state:
- "Sem pedidos para a data selecionada."

## Impressão: Lista da Semana
Ações principais:
- Gerar lista semanal agrupada por dia.

Campos-chave:
- Intervalo de datas, order_number, horário, cliente, resumo compacto.

Validações:
- Intervalo obrigatório.

Empty state:
- "Sem pedidos na semana selecionada."

## Impressão: Produção do Dia
Ações principais:
- Gerar agregado diário por SKU.

Campos-chave:
- Data, SKU, unidade, quantidade total por SKU, total geral.

Validações:
- Data obrigatória.

Empty state:
- "Sem produção para a data selecionada."

## Estoque
Ações principais:
- Registrar entrada/saída/ajuste por SKU.

Campos-chave:
- SKU, quantidade, tipo de movimento, motivo.

Validações:
- Quantidade > 0 e motivo obrigatório.
- Quantidade respeita o passo do SKU.

Empty state:
- "Sem movimentações registradas."

## Capacidade
Ações principais:
- Definir capacidade diária por categoria e overrides por SKU crítico.

Campos-chave:
- Categoria, capacidade diária, SKU crítico (opcional).

Validações:
- Capacidade >= 0.

Empty state:
- "Nenhuma regra de capacidade definida."

## Relatórios
Ações principais:
- Filtrar pedidos e exportar CSV.

Campos-chave:
- Intervalo de datas, status, order_number, cliente, total.

Validações:
- Intervalo obrigatório para exportação.

Empty state:
- "Sem dados para exportar."

## Auditoria
Ações principais:
- Consultar logs por entidade, período e usuário.

Campos-chave:
- actor, entity_type, ação, data/hora, resumo de mudanças.

Validações:
- Período obrigatório.

Empty state:
- "Sem registros de auditoria no período."
