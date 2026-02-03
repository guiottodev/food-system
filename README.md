# Sistema interno de pedidos, impressao e estoque para o negocio (uso administrativo).

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

Testes (Vitest + SQLite):
- `.env.test` usa `DATABASE_URL="file:./data/test.sqlite"`
- `npm test` gera o Prisma Client (`prisma generate --no-engine`), prepara o banco de teste com `prisma db push` e roda `vitest` com `NODE_ENV=test`

Popular base de testes:
- `node scripts\\fill_test_data.js --count=1000 --pastDays=90 --futureDays=30 --reset`

Seed simulado (base determinística 2025-12-01 a 2026-02-28, ~450 pedidos, 300 clientes, 130 produtos):
- `npx tsx scripts/seed-simulated.ts --mode=full --reset`
- Modos: `--mode=golden` | `--mode=bulk` | `--mode=full`. `--reset` limpa tabelas antes.
- Ver `docs/SEED_SIMULATED.md` e `npm run seed:sim` / `seed:sim:golden` / `seed:sim:bulk`.

Produtos e SKUs (Categorias/Produtos/SKUs):
- Categoria: nome unico, descricao opcional.
- Produto: lead time (horas), imagens (principal + extras).
- SKU: tamanho, sabor, congelado, tipo de venda (UNIDADE/KG), passo de quantidade, minimo, preco.
- UnitLabel: "un", "kg" (compativel com o tipo de venda).
- Imagens extras ficam em `product_images` e tags em `sku_tags`.
- Labels pt-BR: Tamanho, Tipo de venda, Passo de quantidade, Preco atual.
- Regra: novo pedido usa somente SKUs ativos; historico sempre aparece via snapshots no order_items.

Integridade do banco:
- Rodar `npm run db:check` antes de iniciar, ou use `scripts\\start-local.bat`.

Smoke test (Produtos + Pedidos):
1) `npm.cmd run dev`
2) Login
3) Criar categoria
4) Criar produto ativo
5) Adicionar 3 SKUs (2 UNIDADE, 1 KG)
6) Criar pedido com SKUs ativos
7) Inativar 1 SKU
8) Confirmar: novo pedido nao mostra SKU inativo
9) Confirmar: pedido antigo segue exibindo itens (snapshot)
