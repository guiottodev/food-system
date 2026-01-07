# SPEC — Sistema Interno de Pedidos (v1.0)

## 0. Objetivo
Sistema interno para registrar 100% dos pedidos (principalmente inserção manual), operar status, imprimir (A4 no início) e gerar relatórios básicos.
Não é e-commerce. O fluxo principal é WhatsApp/telefone → registro manual.

## 1. Metas de sucesso (30 dias)
- 100% dos pedidos registrados no sistema
- Operação diária: lista Hoje/Semana + busca + status funcionando
- Impressão A4 por pedido (HTML print-friendly) disponível
- Relatórios básicos de vendas e produtos (KG separado de UNIDADE)

## 2. Escopo do MVP
- Login simples (porta única)
- Pedidos: criar, listar (Hoje/Semana/Todos/Anteriores), detalhe, mudar status, cancelar com motivo
- Itens: SKU (catálogo) e Item Livre (sem SKU)
- Preço editável por item (snapshot no pedido)
- Impressão A4 (por pedido)
- Estoque “Pronta Entrega” como ledger de movimentos (após consolidar pedido/itens)
- Relatórios básicos (após consolidar)

## 3. Conceitos e glossário
### 3.1 Tipos
- OrderType:
  - PRONTA_ENTREGA
  - ENCOMENDA
- DeliveryMethod:
  - ENTREGA
  - RETIRADA
- UnitType:
  - KG
  - UNIDADE
- UnitLabel:
  - Texto livre (ex: "kg", "un", "cento", "kit"). UnitLabel NÃO muda matemática.

### 3.2 Definições
- SKU: item vendável do catálogo (tem size texto livre, unitType, unitLabel, tags, priceCurrent)
- Item Livre: item do pedido sem skuId, usado quando não existe SKU (deve manter disciplina mínima para relatórios)
- “Sob consulta”: SKU/produto marcado como consult-only. NÃO vira pedido; UI redireciona para WhatsApp.

## 4. Regras de quantidade
- Se unitType = KG:
  - qty deve ser múltiplo de 0,05 (50g)
  - se inválido: erro (NÃO arredondar automaticamente)
  - sugestão (opcional): oferecer botões "ajustar para baixo/para cima", sempre explícito
- Se unitType = UNIDADE:
  - qty deve ser inteiro

Validação deve existir tanto no client quanto no server.

## 5. Regras de preço por item (snapshot)
- Todo OrderItem deve persistir unitPriceAtTime (snapshot do preço usado no pedido).
- Para itens de SKU:
  - default = sku.priceCurrent
  - operador pode editar unitPriceAtTime
- Alterar preço do SKU não altera pedidos antigos.

## 6. Itens do pedido: SKU vs Item Livre
### 6.1 Item de SKU
- Tem skuId
- Persistir snapshot suficiente no item para manter consistência histórica (pelo menos unitPriceAtTime; opcionalmente name/size/label/tags at time).

### 6.2 Item Livre (sem skuId)
Permitido.
Campos obrigatórios:
- freeName (texto)
- freeCategoryId (obrigatório)
- freeTags (>= 1 obrigatório)
- unitType, unitLabel
- qty
- unitPriceAtTime
Campos opcionais:
- freeSize (texto)

Regras:
- Item livre NÃO mexe em estoque
- Deve aparecer no detalhe do pedido e na impressão A4

## 7. Status e travas
- Edção permitida até antes de ENTREGUE/CANCELADO
- Após ENTREGUE ou CANCELADO:
  - bloquear qualquer edição (itens, preços, entrega, etc)
  - bloquear também via server (não apenas UI)

## 8. “Sob consulta”
- SKU/produto consult-only:
  - não pode ser adicionado ao pedido
  - UI mostra CTA "Tratar no WhatsApp"
- Não existe pedido com preço pendente:
  - se for sob consulta, trata fora e só registra quando já houver preço.

## 9. Estoque (ledger) — Pronta Entrega
### 9.1 Princípios
- Estoque só reflete PRONTA_ENTREGA
- ENCOMENDA NÃO mexe em estoque
- Estoque baixa ao CONFIRMAR pedidos PRONTA_ENTREGA
- Cancelamento devolve automaticamente
- Edição após Confirmado recalcula delta e cria ajustes
- Conversão PRONTA_ENTREGA → ENCOMENDA pode ocorrer DEPOIS:
  - deve reverter qualquer impacto de estoque já aplicado
  - depois disso, pedido passa a não afetar estoque

### 9.2 Tipos de movimento
Enum InventoryMovementType:
- SALE (baixa na confirmação)
- CANCEL_RESTORE (devolve ao cancelar)
- ADJUST_FROM_EDIT (ajuste por delta em edição)
- CONVERT_TO_ENCOMENDA_RESTORE (reversão total ao converter depois)

### 9.3 Algoritmos (sempre em transação)
A) Confirmar PRONTA_ENTREGA:
- agregue qty por skuId dos itens de SKU
- crie SALE com qtyDelta = -qty
- atualize InventoryStock de cada sku

B) Cancelar:
- calcule impacto líquido aplicado do orderId no estoque (somatório de movimentos daquele orderId)
- crie CANCEL_RESTORE com delta oposto
- atualize InventoryStock

C) Editar após Confirmado (até antes de Entregue):
- compare agregado por skuId do "antes" vs "depois"
- deltaQty = novo - antigo
- crie ADJUST_FROM_EDIT com qtyDelta = -deltaQty
- atualize InventoryStock

D) Converter para ENCOMENDA depois:
- calcule impacto líquido do orderId
- crie CONVERT_TO_ENCOMENDA_RESTORE revertendo tudo
- marque orderType=ENCOMENDA
- a partir daí, editar não gera movimentos

## 10. Impressão A4 (HTML)
- Rota /admin/orders/[id]/print (ou padrão do repo)
- Conteúdo mínimo:
  - Cabeçalho: cliente, telefone, entrega/retirada, data/hora
  - Itens: qty + unitLabel, size, tags, unitPriceAtTime, lineTotal
  - Taxa de entrega (se houver), subtotal/total
- Deve funcionar para itens de SKU e itens livres
- Usar CSS @media print

## 11. Relatórios
- Somar e exibir separado por padrão:
  - KG
  - UNIDADE
- UnitLabel é só exibição (ex.: "cento"), não conversão.

## 12. Não-escopo (por enquanto)
- Pagamento, checkout, gateways
- Integrações externas
- Capacidade diária (fase 2)
- LGPD/anônimização detalhada (fase 2)

## 13. Critérios gerais de pronto (DoD)
- Implementação apenas do escopo da tarefa
- Build passando: npm run build
- Não quebrar rotas atuais
- Mensagens de erro claras (UI + server)
- Mostrar diff ao final
