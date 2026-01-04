# Sistema interno de pedidos, impressao e estoque para o negocio (uso administrativo).

Fonte de verdade do produto: /product

Scripts (placeholders):
- start-local.bat: executar `scripts\\start-local.bat`
- backup.bat: executar `scripts\\backup.bat`

Operacao (Windows):
- Iniciar: `scripts\\start-local.bat`
- Backup diario: `scripts\\backup.bat`
- Restaurar emergencia: `scripts\\restore-latest.bat`

Prisma (Windows):
- Use `scripts\\prisma.ps1` para garantir o DATABASE_URL correto do `.env.local`
- Exemplo: `./scripts/prisma.ps1 migrate deploy`
- Exemplo: `./scripts/prisma.ps1 db seed`

Popular base de testes:
- `node scripts\\fill_test_data.js --count=1000 --pastDays=90 --futureDays=30 --reset`

Catalogo (Categorias/Produtos/SKUs):
- Categoria pode ter hierarquia via parentId (ate 5+ niveis).
- Produto tem lead time (horas), visibilidade publica e sob consulta padrao.
- SKU tem tamanho, sabor, congelado, unidade (KG/UNIDADE/CENTO), passo de quantidade e preco.
- Sob consulta: SKU usa override quando definido; caso contrario herda do produto.
- Imagens ficam em `product_images` e tags em `sku_tags`.
- Labels pt-BR: Tamanho, Tipo de venda, Passo de quantidade, Preco atual.
- Integridade de unidade: triggers bloqueiam unitType/label invalidos.

Integridade do banco:
- Rodar `npm run db:check` antes de iniciar, ou use `scripts\\start-local.bat`.
