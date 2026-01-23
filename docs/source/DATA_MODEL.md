# Modelo de dados

Referência canônica: `docs/SOURCE_OF_TRUTH.md` (seção 4).

Observações
- Enums e campos são definidos em `prisma/schema.prisma`.
- Categorias agora são hierárquicas (árvore) via `Category.parentId`.
- Produtos pertencem a uma categoria **folha** (sem subcategorias).
- Algumas tabelas existem mas não são usadas pelos fluxos atuais:
  - inventory_stock
  - inventory_movements
  - capacity_rules
  - customer_addresses
