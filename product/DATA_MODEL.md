# DATA_MODEL

## Lista de entidades
- users
- customers
- categories
- products
- skus
- orders
- order_items
- order_status_history
- inventory_movements
- capacity_rules
- audit_logs

## Tabelas e campos

### users
Fields:
- id (uuid, required, PK)
- name (text, required)
- email (text, optional, unique)
- role (text, required, enum: admin)
- created_at (timestamp, required)

Constraints:
- email unique quando presente

### customers
Fields:
- id (uuid, required, PK)
- name (text, required)
- phone (text, optional)
- email (text, optional)
- document (text, optional)
- notes (text, optional)
- is_anonymized (boolean, required, default false)
- created_at (timestamp, required)

Constraints:
- phone obrigatório quando is_anonymized = false
- name obrigatório, exceto quando is_anonymized = true (neste caso deve ser "ANONIMIZADO")

### categories
Fields:
- id (uuid, required, PK)
- name (text, required, unique)
- default_daily_capacity (integer, required)
- created_at (timestamp, required)

Constraints:
- default_daily_capacity >= 0

### products
Fields:
- id (uuid, required, PK)
- name (text, required)
- category_id (uuid, required, FK categories.id)
- active (boolean, required, default true)
- created_at (timestamp, required)

Constraints:
- name unique dentro da categoria

### skus
Fields:
- id (uuid, required, PK)
- product_id (uuid, required, FK products.id)
- display_name (text, required)
- unit_label (text, required, ex: "Unidade", "Cento", "kg", "g")
- unit_type (text, required, enum: unidade, cento, kg, g)
- quantity_step (numeric(10,3), required)
- price_current (numeric(10,2), required)
- is_critical (boolean, required, default false)
- active (boolean, required, default true)
- created_at (timestamp, required)

Constraints:
- display_name unique dentro do produto
- quantity_step > 0

### orders
Fields:
- id (uuid, required, PK)
- order_number (text, required, unique, pattern YYYY-NNNNNN)
- customer_id (uuid, required, FK customers.id)
- status (text, required, enum: Novo, Confirmado, Em produção, Pronto, Em rota, Entregue, Cancelado)
- order_type (text, required, enum: pronta_entrega, encomenda)
- delivery_datetime (timestamp, required)
- delivery_method (text, required, enum: entrega, retirada)
- address_text (text, optional)
- address_bairro (text, optional)
- address_referencia (text, optional)
- address_city (text, optional)
- address_cep (text, optional)
- delivery_fee (numeric(10,2), optional)
- subtotal (numeric(10,2), required)
- total (numeric(10,2), required)
- notes (text, optional)
- cancellation_reason (text, optional)
- created_by (uuid, required, FK users.id)
- created_at (timestamp, required)
- updated_at (timestamp, required)

Constraints:
- order_number unique e ordenável; formato recomendado: 2026-000123
- cancellation_reason obrigatório quando status = Cancelado
- address_text e address_bairro obrigatórios quando delivery_method = entrega

### order_items
Fields:
- id (uuid, required, PK)
- order_id (uuid, required, FK orders.id)
- sku_id (uuid, required, FK skus.id)
- quantity (numeric(10,3), required)
- price_at_time (numeric(10,2), required)
- line_total (numeric(10,2), required)
- created_at (timestamp, required)

Constraints:
- quantity > 0

### order_status_history
Fields:
- id (uuid, required, PK)
- order_id (uuid, required, FK orders.id)
- from_status (text, required)
- to_status (text, required)
- changed_by (uuid, required, FK users.id)
- changed_at (timestamp, required)
- reason (text, optional)

### inventory_movements
Fields:
- id (uuid, required, PK)
- sku_id (uuid, required, FK skus.id)
- movement_type (text, required, enum: in, out, adjustment)
- quantity (numeric(10,3), required)
- reason (text, required)
- related_order_id (uuid, optional, FK orders.id)
- created_by (uuid, required, FK users.id)
- created_at (timestamp, required)

Constraints:
- quantity > 0

### capacity_rules
Fields:
- id (uuid, required, PK)
- category_id (uuid, required, FK categories.id)
- sku_id (uuid, optional, FK skus.id)
- daily_capacity (numeric(10,3), required)
- active (boolean, required, default true)
- created_at (timestamp, required)

Constraints:
- sku_id nullable para capacidade padrão da categoria
- daily_capacity >= 0

### audit_logs
Fields:
- id (uuid, required, PK)
- actor_id (uuid, required, FK users.id)
- entity_type (text, required)
- entity_id (uuid, required)
- action (text, required)
- changes (text, optional)
- created_at (timestamp, required)

## Relacionamentos (FKs)
- products.category_id -> categories.id
- skus.product_id -> products.id
- orders.customer_id -> customers.id
- orders.created_by -> users.id
- order_items.order_id -> orders.id
- order_items.sku_id -> skus.id
- order_status_history.order_id -> orders.id
- order_status_history.changed_by -> users.id
- inventory_movements.sku_id -> skus.id
- inventory_movements.related_order_id -> orders.id
- inventory_movements.created_by -> users.id
- capacity_rules.category_id -> categories.id
- capacity_rules.sku_id -> skus.id
- audit_logs.actor_id -> users.id

## Indexes (o que e por que)
- orders(order_number): busca rápida e unicidade.
- orders(status, delivery_datetime): listas diária/semanal e filtros por status.
- orders(delivery_method, delivery_datetime): agrupamento entrega/retirada.
- order_items(order_id): carregar itens do pedido.
- order_items(sku_id): agregações de produção por SKU.
- inventory_movements(sku_id, created_at): auditoria e saldo por SKU.
- capacity_rules(category_id, sku_id): resolver override de SKU crítico.
- audit_logs(entity_type, entity_id): trilha de auditoria por entidade.

## Exemplos de registros
SKU (unidade):
- id: "sku-123"
  product_id: "prod-10"
  display_name: "Coxinha 25g Frango Congelada"
  unit_label: "Cento"
  unit_type: "cento"
  quantity_step: 1
  price_current: 120.00
  is_critical: true
  active: true
  created_at: "2026-01-10T10:00:00Z"

SKU (kg):
- id: "sku-200"
  product_id: "prod-20"
  display_name: "Bolo Chocolate"
  unit_label: "kg"
  unit_type: "kg"
  quantity_step: 0.1
  price_current: 45.00
  is_critical: false
  active: true
  created_at: "2026-01-10T10:00:00Z"

Order:
- id: "ord-900"
  order_number: "2026-000123"
  customer_id: "cust-55"
  status: "Confirmado"
  order_type: "pronta_entrega"
  delivery_datetime: "2026-01-12T14:00:00-03:00"
  delivery_method: "entrega"
  address_text: "Rua A, 100"
  address_bairro: "Centro"
  address_referencia: "Perto da padaria"
  address_city: "Fortaleza"
  address_cep: "60000-000"
  delivery_fee: 10.00
  subtotal: 240.00
  total: 250.00
  notes: "Sem pimenta"
  created_by: "user-1"
  created_at: "2026-01-10T12:00:00-03:00"
  updated_at: "2026-01-10T12:00:00-03:00"

Order Item (kg):
- id: "item-kg-1"
  order_id: "ord-900"
  sku_id: "sku-200"
  quantity: 1.5
  price_at_time: 45.00
  line_total: 67.50
  created_at: "2026-01-10T12:00:00-03:00"

Inventory Movement:
- id: "mov-1"
  sku_id: "sku-123"
  movement_type: "out"
  quantity: 2
  reason: "Baixa por pedido 2026-000123"
  related_order_id: "ord-900"
  created_by: "user-1"
  created_at: "2026-01-10T12:05:00-03:00"

Capacity Rule:
- id: "cap-1"
  category_id: "cat-5"
  sku_id: "sku-123"
  daily_capacity: 150
  active: true
  created_at: "2026-01-01T00:00:00-03:00"

Audit Log:
- id: "aud-1"
  actor_id: "user-1"
  entity_type: "orders"
  entity_id: "ord-900"
  action: "status_change"
  changes: "Confirmado -> Em produção"
  created_at: "2026-01-10T13:00:00-03:00"

## Convenção de nomes (SKU display_name)
- Padrão: <Produto> <Peso/Tamanho> <Sabor> <Estado> <Apresentação>
- Exemplo: "Coxinha 25g Frango Congelada" ou "Bolinha de Queijo 20g Frita"
