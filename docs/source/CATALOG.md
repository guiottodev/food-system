# Catálogo (categorias, produtos, SKUs)

Referência canônica: `docs/SOURCE_OF_TRUTH.md` (seção 5).

Checklist operacional
- Categoria exige nome; descrição é opcional; flag ativo suporta filtro.
- Categorias suportam **subcategorias (árvore)** via `parentId`.
- Nome de categoria é único **por nível** (mesmo pai) e também único na raiz.
- Ativar/desativar categoria aplica **cascata** para subcategorias.
- Produto exige nome e categoria **folha** (sem filhos) e com ancestrais ativos.
- Criação de produto exige o primeiro SKU.
- Tipo de unidade do SKU deve ser UNIDADE, CENTO ou KG.
- minQty e quantityStep são definidos pelo tipo de unidade.
- SKU só pode ser usado em pedidos se SKU e produto estiverem ativos.
