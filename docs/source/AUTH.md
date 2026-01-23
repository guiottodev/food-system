# Autenticação e sessão

Referência canônica: `docs/SOURCE_OF_TRUTH.md` (seção 2).

Checklist
- ADMIN_USER, ADMIN_PASSWORD, SESSION_SECRET são obrigatórios.
- O cookie de sessão é assinado e válido por 12 horas.
- Todas as rotas /admin exigem sessão válida.
