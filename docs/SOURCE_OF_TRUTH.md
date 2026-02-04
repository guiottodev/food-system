# FONTE DA VERDADE

Última atualização: 2026-02-02

Este documento é a única fonte da verdade sobre como o produto funciona hoje.
Ele reflete o código atual (Next.js + Prisma + SQLite). Se este documento e o
código divergirem, atualize este documento primeiro e depois adeque o código.

---

## 1. Visão geral

O sistema é uma ferramenta interna de administração para pedidos, produção e
visibilidade de estoque. É usado por uma única conta admin e roda localmente.

Objetivos principais implementados hoje:
- Criar e gerenciar pedidos com fluxo de status e auditoria
- Manter o catálogo (categorias, produtos, SKUs)
- Gerenciar clientes e histórico de pedidos
- Acompanhar produção e consumo para visibilidade de capacidade
- Destacar atenções/pendências para pedidos incompletos ou de risco

Não implementado (ver seção 12): impressão, relatórios, ledger completo de
estoque, modelo de capacidade por regras, anonimização LGPD.

---

## 2. Autenticação e sessão

A autenticação é um login admin simples baseado em variáveis de ambiente.

Variáveis obrigatórias:
- ADMIN_USER
- ADMIN_PASSWORD
- SESSION_SECRET

Comportamento:
- O login compara o usuário e senha informados com ADMIN_USER/ADMIN_PASSWORD.
- O cookie de sessão é assinado com SESSION_SECRET.
- A sessão dura 12 horas.
- As páginas /admin exigem sessão válida.

---

## 3. Navegacao e rotas principais

Sidebar (adminNav.ts), tres secoes:
- Operacao: Visao geral (/admin), Pedidos (/admin/orders), Producao (/admin/capacidade), Clientes (/admin/clientes)
- Cadastros: Produtos (/admin/products), Categorias (/admin/categories)
- Configuracoes: Configuracoes (/admin/configuracoes)
- Acao primaria: + Novo pedido (/admin/orders/new)

Topo (AdminTopNav): Painel, Pedidos, Clientes, Producao (/admin/capacidade), Registrar producao (/admin/producao), Novo pedido, Categorias, Produtos, Configuracoes.

Rotas principais:
- /login
- /admin
- /admin/orders
- /admin/orders/new
- /admin/orders/[id]
- /admin/orders/[id]/edit
- /admin/clientes
- /admin/clientes/novo
- /admin/clientes/[id]
- /admin/categories
- /admin/products
- /admin/products/new
- /admin/products/[id]
- /admin/configuracoes
- /admin/capacidade
- /admin/producao
- /admin/consumo

A tela /admin/pendencias foi descontinuada; pendencias no Painel (lista) e nos filtros de Pedidos.

---

## 4. Modelo de dados (Prisma schema)

Enums:
- UserRole: ADMIN
- OrderStatus: RASCUNHO, CONFIRMADO, EM_PRODUCAO, PRONTO, ENTREGUE, CANCELADO
- OrderType: PRONTA_ENTREGA, ENCOMENDA
- DeliveryMethod: ENTREGA, RETIRADA
- PaymentMethod: PIX, DINHEIRO, CARTAO, TRANSFERENCIA, A_COMBINAR
- UnitType: UNIDADE, KG
- InventoryMovementType: IN, OUT, ADJUSTMENT
- ProductionConsumptionSourceType: IMMEDIATE, MANUAL

Tabelas principais (simplificado):
- users
- customers
- customer_addresses (não usado pelos fluxos atuais)
- categories
- products
- product_images
- skus
- sku_tags
- orders
- order_items (campos de snapshot armazenados)
- audit_logs
- inventory_stock (não usado pelos fluxos atuais)
- inventory_movements (não usado pelos fluxos atuais)
- capacity_rules (não usado pelos fluxos atuais)
- production_sessions
- production_session_items
- production_consumptions

Observações importantes:
- OrderItem armazena snapshots (nome do SKU, unidade, preço da época, etc.)
  para manter o histórico legível mesmo se o SKU for inativado.
- OrderItem.skuId é anulável (SKU pode ser removido/inativado depois).
- inventory_movements e capacity_rules existem no schema, mas não são usados
  na lógica atual da aplicação.
- Categorias suportam subcategorias (árvore) via `parentId`.

---

## 5. Catálogo (categorias, produtos, SKUs)

### Categorias
- **Modelo hierárquico (subcategorias)**:
  - Categorias são uma **árvore** (N níveis), com `parentId` opcional.
  - Categorias **raiz**: `parentId = null`.
  - Subcategorias: `parentId = <id do pai>`.
- **Campos**: name, description (opcional), isActive, parentId (opcional)
- **Unicidade (nome)**:
  - Nome é único **por nível**: não pode existir duas categorias com o mesmo `name`
    sob o mesmo `parentId`.
  - Na **raiz**, `name` também é único.
- **Ativo / inativo**:
  - A flag `isActive` é usada para filtros no admin.
  - **Cascata**: ao ativar/desativar uma categoria, o sistema aplica a mesma
    mudança para todas as subcategorias descendentes.

### Produtos
- Campos: name, categoryId, leadTime (horas, opcional), descriptionLong,
  imageMainUrl, isActive
- Deve pertencer a uma categoria existente.
- **Regra (categoria folha)**: o produto **só pode** estar em uma categoria **folha**
  (sem subcategorias). Isso evita ambiguidade e mantém a navegação/relatórios coerentes.
- **Regra (ancestrais ativos)**: ao criar/editar, a categoria escolhida e todos os
  ancestrais precisam estar ativos.
- Produto é criado junto com o primeiro SKU.

### SKUs
- SKU e a unidade vendavel.
- Tipos de unidade suportados: UNIDADE, KG.
- Campo opcional de referencia (unico quando preenchido, comparacao case-insensitive via referenciaNormalized).
- Regra de preco/custo: UNIDADE suporta ate 4 casas decimais; outros tipos usam 2 casas.
- Cada SKU tem defaults por tipo de unidade:
  - KG: minQty 0.5, quantityStep 0.05, unitLabel "kg"
  - UNIDADE: minQty 1, quantityStep 1, unitLabel "un"
- Disponibilidade do SKU na criacao/edicao de pedidos:
  - O SKU deve estar ativo e o produto pai deve estar ativo.

### Atributos e tags de SKU
- Tags sao salvas em sku_tags (rotulos livres).
- Atributos agora vem do catalogo (/admin/configuracoes):
  - Tipos: Texto, Numero, Lista (valores fixos).
  - Para LISTA, o SKU armazena atributoValorId (integridade em renomeacoes).
  - Maximo de 15 atributos por SKU.
  - SKUs legados com attributesJson aparecem como somente leitura.

### Listagem de produtos (/admin/products)
- **Tabela expansível**: cada linha de produto pode ser expandida para exibir as linhas de SKU.
- **Colunas**: Produto (com miniatura, nome, link, badge ativo/inativo), Categoria, SKUs/Un. (ativo/total na linha de produto; unitLabel na linha de SKU), Disponível, Preço, Ações.
- **Linha de produto**: botão para expandir/recolher; "X de Y disponíveis" (SKUs com stockQuantity > 0 / total); na coluna Preço "—"; links **Ver** (detalhe do produto) e **Produção** (/admin/capacidade?q=nome).
- **Linha de SKU** (ao expandir): displayName, sublinha (sizeText, flavorText, "Congelado"), badge Inativo se aplicável; **Disponível** formatado por unidade (KG: 2 decimais pt-BR + unitLabel; UNIDADE: inteiro + unitLabel), com destaque quando stockQuantity === 0; **Preço** editável na própria célula (clique para editar, blur ou Enter grava via `updateSkuPriceAction`, Escape cancela); link **Editar** para ?tab=skus&skuMode=edit&skuId=.
- **Produto sem SKUs**: ao expandir, uma linha com empty state e link "Adicionar SKU" para ?tab=skus.
- **Server Action** `updateSkuPriceAction(skuId, price)`: valida, atualiza `priceCurrent` do SKU e retorna `{ ok: true }` ou `{ ok: false, error }`.
- **Filtros**: busca por nome ou referencia, categoria, status (ativos/inativos). Chips de filtros ativos com botao **X** para remover; botao **Limpar** (remove todos os filtros e fecha o painel) quando ha filtros ativos; no botao "Filtros", pill com a quantidade de filtros ativos quando > 0.
- Em viewport ≤720px a coluna Categoria é ocultada.

---

## 6. Clientes

Criação e edição de cliente:
- Obrigatório: nome, telefone
- Telefone é normalizado e deve ser único
- Opcionais: documento e campos de endereço

Endereço padrão de entrega:
- Ao criar/editar pedido, se o modo for ENTREGA e o usuário optar por salvar
  o endereço como padrão (ou se o cliente foi criado na mesma ação), o endereço
  é salvo nos campos padrão do cliente.
- Se o cliente não tiver endereço padrão, o sistema pode sugerir o último
  endereço usado.

Lista de clientes:
- Busca por nome ou dígitos do telefone.
- A lista mostra data do último pedido e total de pedidos.

---

## 7. Pedidos

### 7.1 Fluxo de status (transições reais)
Transições aplicadas pelo código:
- RASCUNHO -> CONFIRMADO, EM_PRODUCAO, CANCELADO
- CONFIRMADO -> EM_PRODUCAO, CANCELADO
- EM_PRODUCAO -> PRONTO, CANCELADO
- PRONTO -> ENTREGUE, CANCELADO
- ENTREGUE -> (sem transições)
- CANCELADO -> (sem transições)

Status finais: ENTREGUE, CANCELADO.
Regras de validação: CONFIRMADO e EM_PRODUCAO exigem pedido pronto (itens + data).
Transições para PRONTO ou ENTREGUE são bloqueadas se houver pendências fortes
(INCOMPLETE ou needsReconfirmation). O fluxo permite ir de RASCUNHO direto para EM_PRODUCAO.

### 7.2 Tipos de pedido
- PRONTA_ENTREGA: entrega é agendada imediatamente (agora) na criação.
- ENCOMENDA: data/hora pode ser definida depois; confirmação exige data.

### 7.3 Fluxo de criação de pedido
Passos:
1) Selecionar cliente existente ou criar novo cliente.
2) Escolher método de entrega (ENTREGA ou RETIRADA).
3) Escolher tipo de pedido (PRONTA_ENTREGA ou ENCOMENDA).
4) Adicionar itens (SKU, quantidade, preço unitário).
5) Informar método de pagamento e sinal (opcional).
6) Salvar pedido em status RASCUNHO.

Número do pedido:
- Gerado no salvamento.
- Formato: YYYY-NNNNNN, baseado no último pedido do ano.

Regras de entrega:
- ENTREGA: o endereço é coletado, mas o sistema não bloqueia se faltar;
  ele gera atenção/pendência.
- RETIRADA: campos de endereço são ignorados.

Regras de agendamento:
- PRONTA_ENTREGA: deliveryDatetime recebe agora; deliveryTime recebe a hora atual.
- ENCOMENDA: deliveryDatetime só é exigido na confirmação; hora padrão é "00:00"
  quando não informada.
- Datas no passado são rejeitadas na criação/edição de ENCOMENDA.

### 7.4 Fluxo de edição de pedido
Editar um pedido substitui todos os itens e recalcula subtotal e total.

Mudanças críticas (entrega, endereço, itens, totais, etc.) após confirmação
marcam needsReconfirmation como true e geram auditoria.

Edição de pedidos finais:
- ENTREGUE/CANCELADO podem ser editados somente com confirmação explícita e motivo.
- É criada auditoria "final_order_edit".
Observação: ENTREGUE/CANCELADO são finais para transição, mas editáveis sob confirmação.

### 7.5 Confirmação e reconfirmação
Confirmação:
- Permitida apenas a partir de RASCUNHO.
- Exige pelo menos um item e data de entrega.
- Define status como CONFIRMADO, confirmedAt agora, needsReconfirmation false.

Reconfirmação:
- Somente para pedidos não finais com needsReconfirmation true.
- Exige um motivo.
- Atualiza confirmedAt e needsReconfirmation false.

### 7.6 Cancelamento
- Cancelar é permitido para status não finais.
- Exige motivo obrigatório.
- Define status CANCELADO e registra auditoria.

### 7.7 Marcar pago e entregar
- Ação de marcar pago define paidAt e registra auditoria.
- ENTREGUE não exige pagamento.
- Ao ir para ENTREGUE, o estoque é decrementado uma única vez por pedido.

### 7.8 Preço e totais
- Cada item usa priceAtTime do payload se informado; caso contrário usa
  sku.priceCurrent.
- lineTotal = quantidade * preço unitário
- subtotal = soma de lineTotal
- total = subtotal + taxa de entrega

### 7.9 Validação de quantidade
Regras por tipo de unidade:
- KG: múltiplos de 0.05
- UNIDADE: apenas inteiros
- Também valida minQty e quantityStep do SKU

### 7.10 Validações de disponibilidade
Existem dois conceitos distintos (estoque pronto por SKU vs disponibilidade por produto):

1) Estoque pronto (sku.stockQuantity):
- Representa pronta-entrega disponível por SKU.
- A produção registrada aumenta o stockQuantity.
- A entrega consome esse saldo.
- Se não houver saldo suficiente, o sistema não bloqueia a entrega, mas registra
  pendência de produção até o saldo ser recomposto.

2) Disponibilidade de produção (por produto):
- Usada para alertas de atenção/pendência e flags no detalhe do pedido.
- Calculada com base em produção e consumo por produto.

### 7.11 Baixa de estoque na entrega
- Regra padrão: entregar quando há saldo suficiente; se não houver, permite
  entregar com alerta e registra pendência.
- Ao mudar para ENTREGUE, sku.stockQuantity é decrementado para cada item.
- O saldo não fica negativo: trava em zero e registra pendência de produção.
- A pendência diminui conforme novas produções são registradas.
- Proteção idempotente: stockDecrementedAt evita dupla baixa.
- inventory_movements não é utilizado.

---

## 8. Atenção e pendências

O sistema de atenção sinaliza pedidos com risco ou dados faltantes.

Razões fortes:
- INCOMPLETE: sem itens ou sem data de entrega
- ALTERADO_APOS_CONFIRMACAO: needsReconfirmation true

Razões fracas:
- UNAVAILABLE_ITEMS: falta de disponibilidade de produção
- MISSING_ADDRESS: ENTREGA sem endereço
- MISSING_TIME: entrega nos próximos 7 dias sem horário específico
- SALDO_INSUFICIENTE: entrega realizada sem saldo suficiente; indica produção pendente

Pendências são exibidas em:
- /admin (Painel: contador de fortes e lista de até 10 itens, 15 dias; "Ver todos" → /admin/orders?attention=with)
- /admin/orders (lista, filtro "Com pendencias" e subtipos)
- /admin/orders/[id] (blocos Pendencias/Alertas)

A tela /admin/pendencias foi descontinuada. Pedidos ENTREGUE/CANCELADO não exibem pendências.

---

## 9. Capacidade, produção, consumo

A capacidade é calculada a partir de produção e consumo, não por capacity_rules.

Produção:
- /admin/producao registra produção por SKU.
- Cada produção aumenta o saldo de pronta-entrega do SKU (stockQuantity).
- Validação de quantidade usa as regras do SKU.

Consumo:
- /admin/consumo registra consumo manual.
- Pode ser usado para ajustes operacionais sem entrega.

Tela de capacidade:
- /admin/capacidade mostra por produto (e por SKU na expansão):
  - produzido, consumido, disponível (produzido - consumido no período da produção)
  - demanda (pedidos RASCUNHO, CONFIRMADO, EM_PRODUCAO dentro da janela de demanda)
  - gap (max(demanda - disponível, 0))
  - stockQuantity do SKU é o saldo total (todos os tempos); produzido/consumido/disponível da tabela referem-se ao período selecionado.
Observação: a lista considera apenas produtos ativos.

Janelas (dois filtros independentes):
- Demanda (próximos X dias): hoje, 7, 14, 30 — default 7.
- Produção (últimos X dias): hoje, 7, 14, 15, 30 — default 15.

---

## 10. Auditoria

A auditoria registra:
- criação de pedido e itens
- mudanças de status, confirmações, cancelamentos
- marcar pago
- flag de reconfirmação e reconfirmação
- edições de pedidos finais
- mudanças de campos no fluxo de edição

Não registra atualmente:
- movimentos de estoque
- alterações de capacidade (regras)
- anonimização LGPD

---

## 11. Relatórios e impressão

Impressão e relatórios não estão implementados. Não existem rotas /admin/print.

---

## 12. Fora de escopo / não implementado

Itens presentes em docs ou schema, mas não implementados no código:
- Impressão (ticket, lista do dia, lista da semana, produção do dia)
- Relatórios e exportação CSV
- Ledger de estoque com inventory_movements
- Regras de capacidade (categoria e override por SKU crítico) — há tabelas no schema,
  mas não há UI/fluxo de edição dedicado.
- Fluxo de anonimização LGPD
- Uso de customer_addresses

---

## 13. Notas operacionais

- O sistema foi pensado para uma única conta admin e execução local.
- Os dados ficam em SQLite via Prisma.
- Use a pasta docs/source para navegar por tópicos rapidamente.
