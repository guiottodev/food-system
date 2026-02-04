# Catalogo (categorias, produtos, SKUs)

Referencia canonica: `docs/SOURCE_OF_TRUTH.md` (secao 5).

Checklist operacional
- Categoria exige nome; descricao e opcional; flag ativo suporta filtro.
- Categorias suportam subcategorias (arvore) via `parentId`.
- Na tela /admin/categories, a arvore abre com todos os nos recolhidos; o usuario expande os que desejar.
- Nome de categoria e unico por nivel (mesmo pai) e unico na raiz.
- Ativar/desativar categoria aplica cascata para subcategorias.
- Produto exige nome e categoria folha (sem filhos) e com ancestrais ativos.
- Criacao de produto exige o primeiro SKU.
- Tipo de unidade do SKU deve ser UNIDADE ou KG.
- Regra de preco/custo: UNIDADE ate 4 casas decimais; outros tipos usam 2 casas.
- SKU pode ter referencia opcional, unica quando preenchida (case-insensitive).
- minQty e quantityStep sao definidos pelo tipo de unidade.
- SKU so pode ser usado em pedidos se SKU e produto estiverem ativos.
- Atributos de SKU usam catalogo (/admin/configuracoes) com tipos Texto, Numero, Lista.

Listagem de produtos (/admin/products)
- Tabela expansivel: linha de produto com chevron; ao expandir, linhas de SKU (ou empty state "Adicionar SKU" se 0 SKUs).
- Colunas: Produto, Categoria, SKUs/Un., Disponivel (produto: "X de Y disponiveis"; SKU: valor + unitLabel, destaque quando 0), Preco (editavel na celula via `updateSkuPriceAction`), Acoes.
- Linha de produto: links Ver e Producao (/admin/capacidade?q=nome). Linha de SKU: link Editar (?tab=skus&skuMode=edit&skuId=).
- Filtros: busca por nome ou referencia, categoria, status (ativos/inativos). Chips com X para remover; botao Limpar e pill com quantidade no botao "Filtros" quando ha filtros ativos.

Criacao de produto (/admin/products/new)
- Categoria com autocomplete (digitar para filtrar) e lista de ultimas categorias usadas.
- Botao "Nova" abre modal de categoria e atualiza a lista automaticamente.
- Campo "Referencia" opcional no primeiro SKU.
- Campo monetario aceita 4 casas para UNIDADE, 2 para outros tipos.
