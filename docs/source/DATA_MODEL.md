# Modelo de dados

Referência canônica: `docs/SOURCE_OF_TRUTH.md` (seção 4).

Observações
- Enums e campos são definidos em `prisma/schema.prisma`.
- Categorias são hierárquicas (árvore) via `Category.parentId`.
- Produtos pertencem a uma categoria folha (sem subcategorias).
- Produtos possuem `nameNormalized` para busca case-insensitive.
- SKUs possuem `displayNameNormalized` e `referenciaNormalized` (unicidade por referência quando preenchida).
- Novas tabelas de atributos catalogados:
  - `atributos` (Atributo)
  - `atributo_valores` (AtributoValor)
  - `sku_atributos` (SkuAtributo)
- Integridade de atributos LISTA: o SKU guarda `atributoValorId`.
- Algumas tabelas existem mas não são usadas pelos fluxos atuais:
  - inventory_stock
  - inventory_movements
  - capacity_rules
  - customer_addresses