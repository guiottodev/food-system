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
