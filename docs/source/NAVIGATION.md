# Navegacao e rotas

Referencia canonica: `docs/SOURCE_OF_TRUTH.md` (secao 3).

## Sidebar (menu lateral)

Controlada por `app/admin/adminNav.ts`. Tres secoes:

### Operacao
- Visao geral -> /admin
- Pedidos -> /admin/orders (match startsWith)
- Producao -> /admin/capacidade (match startsWith)
- Clientes -> /admin/clientes (match startsWith)

### Cadastros
- Produtos -> /admin/products (match startsWith)
- Categorias -> /admin/categories (match startsWith)

### Configuracoes
- Configuracoes -> /admin/configuracoes (match startsWith)

### Acao primaria (destaque)
- + Novo pedido -> /admin/orders/new

As rotas /admin/producao (Registrar producao) e /admin/consumo nao ficam na sidebar; sao acessadas pelo topo, pela tela de capacidade ou pelo detalhe do pedido.

---

## Topo (AdminTopNav)

Controlado por `app/admin/AdminTopNav.client.tsx`. Links, na ordem:

1. Painel -> /admin
2. Pedidos -> /admin/orders
3. Clientes -> /admin/clientes
4. Producao -> /admin/capacidade
5. Registrar producao -> /admin/producao
6. Novo pedido -> /admin/orders/new
7. Categorias -> /admin/categories
8. Produtos -> /admin/products
9. Configuracoes -> /admin/configuracoes

---

## Rotas principais

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

A tela /admin/pendencias foi descontinuada; as pendencias aparecem no Painel (/admin) e nos filtros de /admin/orders (Com pendencias, etc.).
