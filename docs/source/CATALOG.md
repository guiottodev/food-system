# Catálogo (categorias, produtos, SKUs)

Referência canônica: `docs/SOURCE_OF_TRUTH.md` (seção 5).

Checklist operacional
- Categoria exige nome; descrição é opcional; flag ativo suporta filtro.
- Categorias suportam **subcategorias (árvore)** via `parentId`.
- Nome de categoria é único **por nível** (mesmo pai) e também único na raiz.
- Ativar/desativar categoria aplica **cascata** para subcategorias.
- Produto exige nome e categoria **folha** (sem filhos) e com ancestrais ativos.
- Criação de produto exige o primeiro SKU.
- Tipo de unidade do SKU deve ser UNIDADE ou KG.
- minQty e quantityStep são definidos pelo tipo de unidade.
- SKU só pode ser usado em pedidos se SKU e produto estiverem ativos.

Listagem de produtos (/admin/products)
- Tabela **expansível**: linha de produto com chevron; ao expandir, linhas de SKU (ou empty state "Adicionar SKU" se 0 SKUs).
- Colunas: Produto, Categoria, SKUs/Un., **Disponível** (produto: "X de Y disponíveis"; SKU: valor + unitLabel, destaque quando 0), **Preço** (editável na célula via `updateSkuPriceAction`), Ações.
- Linha de produto: links **Ver** e **Produção** (/admin/capacidade?q=nome). Linha de SKU: link **Editar** (?tab=skus&skuMode=edit&skuId=).
- Filtros: chips com **×** para remover; botão **Limpar** e pill com quantidade no botão "Filtros" quando há filtros ativos.

Criação de produto (/admin/products/new)
- **Modal de categoria**: Botão "Nova" ao lado do select de categoria permite criar categoria diretamente na página de cadastro.
- **Componentes premium**: Switch para ativo/inativo (produto e SKU), Select customizado para categoria e tipo de venda, campo monetário com máscara brasileira para preço.
- **Atualização automática**: Após criar categoria na modal, lista é atualizada e categoria é selecionada automaticamente.
