# TECH_PLAN — Sistema Interno (Windows 10, Local PC)

## 1) Objetivo e princípios
**Objetivo técnico:** entregar um sistema interno (admin) que rode **localmente no PC** (sem depender de internet), com dados persistidos em **SQLite**, impressão via **HTML (Ctrl+P)** e rotinas simples de operação (abrir de manhã, backup no fim do dia).

**Princípios**
- **Local-first:** o sistema funciona mesmo sem internet.
- **Um arquivo de verdade:** o banco é um arquivo `app.sqlite` (fácil de fazer backup).
- **Fonte de verdade:** regras e critérios de aceite vivem em `/product` (PRD/RULES/DATA_MODEL/UI_MAP/ACCEPTANCE/CODEX_WORKFLOW).
- **Pequenas entregas:** cada mudança é pequena, testável e reversível.
- **Operação simples:** pessoas não técnicas precisam conseguir usar e imprimir sem stress.
- **Sem dependência externa:** o sistema deve operar sem depender de serviços externos (sem CDN obrigatório, sem login externo, sem APIs obrigatórias).

---

## 2) Escopo técnico desta fase
**Inclui**
- Admin web app rodando no PC, acessado por navegador.
- Auth simples (login).
- SQLite + migrations.
- Impressões: ticket por pedido + listas (dia/semana) + produção agregada.
- Estoque pronta entrega + capacidade + relatórios + export CSV.
- Auditoria (quem/quando) e LGPD (anonimização).

**Não inclui (por enquanto)**
- E-commerce/pagamento online.
- Portal público (link para clientes).
- Multi-loja/multi-PC.
- App mobile nativo.
- Integrações externas (WhatsApp API, etc).

---

## 3) Stack e escolhas “congeladas” (não discutir durante execução)
**Aplicação**
- **Next.js (App Router) + TypeScript**
- UI simples; evitar adicionar bibliotecas sem necessidade.

**Banco**
- **SQLite local:** `./data/app.sqlite`
- Migrations via **Prisma**
- Preferência por queries orientadas a impressão (índices para filtros por data/status).

**Impressão**
- Páginas HTML “print-friendly”:
  - Ticket (um por pedido)
  - Lista do dia
  - Lista da semana (por dia)
  - Produção do dia (agregado por SKU)
- `window.print()` e CSS de impressão.
- Suporte a térmica (58/80mm) e fallback A4 (mesmo conteúdo).

**Execução no Windows**
- Usuário abre por **duplo clique**:
  - `scripts/start-local.bat` inicia o servidor e abre o navegador
  - `scripts/backupbat` cria backup do SQLite com timestamp

---

## 4) Estrutura do repositório (padrão)

```text
Sistema/
  product/                 # Fonte de verdade (docs)
  app/                     # Next.js (App Router)
  prisma/                  # schema.prisma + migrations
  scripts/                 # .bat de operação (Windows)
  data/                    # app.sqlite (não versionado)
  backups/                 # backups (não versionado)
  exports/                 # CSV/relatórios exportados (não versionado)
  README.md
  .gitignore
```

**Regra:** `data/`, `backups/` e `exports/` **nunca** entram no Git.

---

## 5) Regras do produto que impactam a arquitetura (obrigatórias)
Estas regras **precisam ser respeitadas no código**, pois afetam dados, impressão e relatórios:

- **SKU é a unidade vendável** (unidade/cento/kg etc = SKUs diferentes).
- `order_items.price_at_time` é obrigatório.
- Se faltar estoque na “pronta entrega”, converter para **encomenda** + alerta.
- Capacidade: **padrão por categoria** + **override por SKU crítico**.
- Impressão inclui apenas status: **Confirmado / Em produção / Pronto / Em rota**.
- Cancelamento exige motivo.
- Auditoria: logar preço, pedido, status, estoque, capacidade, anonimização.

> Fonte de verdade: `/product/RULES.md`, `/product/DATA_MODEL.md`, `/product/ACCEPTANCE.md`.

---

## 6) Modelo operacional (como a empresa usa)
**Rotina diária (ideal)**
1) Abrir `start-local.bat` de manhã
2) Durante o dia: cadastrar pedidos, atualizar status, imprimir
3) No fim do dia: rodar `backup.bat`
4) Semanalmente: copiar pasta `backups/` para pendrive/Drive

**Cenários comuns**
- “Preciso saber o que tem hoje”: imprimir **Lista do dia**
- “Preciso produzir”: imprimir **Produção do dia**
- “Mudou o preço”: atualizar SKU (gera auditoria) — pedido antigo mantém `price_at_time`

---

## 7) Execução por “ícone” (Windows 10)
### 7.1 `scripts/start-local.bat` (requisitos)
- Deve:
  1) validar se dependências já foram instaladas (se não, orientar)
  2) iniciar o servidor em modo produção (`npm run start`)
  3) abrir navegador automaticamente em `http://localhost:3000`
- Deve falhar de forma “humana” (mensagens claras em pt-BR).

**Política de porta**
- Usar padrão `3000`.
- Se já estiver ocupada, mostrar erro com instrução (ex.: “Feche o sistema antigo / reinicie”).

### 7.2 `scripts/backup.bat` (requisitos)
- Criar `backups/` se não existir.
- Fazer backup do `data/app.sqlite` para `backups/app_YYYY-MM-DD_HHMM.sqlite`.
- Se o arquivo do banco não existir, avisar.
- Ideal: instruir a fechar o sistema antes do backup (para evitar escrita durante cópia).

> Futuro recomendado: botão “Gerar backup” dentro do app (mais seguro que copiar arquivo “vivo”).

---

## 8) Banco de dados (SQLite) — confiabilidade e integridade
### 8.1 Local do banco
- `./data/app.sqlite`
- Não versionado.

### 8.2 Segurança contra corrupção
- Evitar desligar o PC no meio de gravações.
- Preferir encerrar o sistema antes do backup.
- (Opcional) ativar modo WAL no SQLite para melhor concorrência e performance.

### 8.3 Migrations
- Usar Prisma migrations com comandos consistentes:
  - `prisma migrate dev` (dev)
  - `prisma migrate deploy` (produção local)
- Manter migrations pequenas, sempre compatíveis com dados existentes.

---

## 9) Auth e segurança (local, mas não “aberto”)
Mínimo obrigatório:
- Login obrigatório para acessar `/admin`.
- Sessão por cookie.
- Tela “Sair”.
- Evoluir do stub para hash de senha quando houver usuários reais.

LGPD:
- Implementar fluxo de **anonimização** sem quebrar histórico de pedidos.
- Auditoria deve registrar anonimização.

---

## 10) Impressão (o coração do valor)
### 10.1 Páginas de impressão
Rotas sugeridas:
- `/admin/print/order/[id]` (ticket)
- `/admin/print/day?date=YYYY-MM-DD`
- `/admin/print/week?start=YYYY-MM-DD`
- `/admin/print/production?date=YYYY-MM-DD`

### 10.2 Layout e CSS
- CSS de impressão com:
  - fonte legível
  - quebra de página correta
  - sem menus/cabeçalhos
- Suporte a 58/80mm:
  - container com largura configurável
  - “modo 58mm / modo 80mm” (preferência do usuário)

### 10.3 Regras de inclusão (não negociável)
Listas (dia/semana/produção) **só** incluem pedidos nos status:
- Confirmado, Em produção, Pronto, Em rota

---

## 11) Performance (para ~200 itens e rotina real)
- Índices para:
  - `orders.delivery_datetime`
  - `orders.status`
  - `orders.delivery_type`
  - `order_items.sku_id`
- Busca rápida de SKU por nome/código.

---

## 12) Logs, auditoria e rastreabilidade
**Obrigatório**
- Registrar alterações: preço, pedido, status, estoque, capacidade.
- Registrar: quem fez, quando fez, o que mudou.
- Exportáveis para auditoria simples (CSV).

---

## 13) Backup e recuperação (cenários e respostas)
### Cenário A: PC desligou / falta de energia
- Ao ligar: abrir sistema e validar se dados estão íntegros.
- Se SQLite corromper: restaurar último backup de `backups/`.

### Cenário B: “Sumiu pedido / alguém alterou”
- Ver auditoria: quem/quando.
- Restaurar backup só em último caso.

### Cenário C: “Preciso trocar de PC”
- Copiar pasta do projeto + `data/app.sqlite` + `backups/`.
- Rodar `npm install` e `npm run build` no novo PC.
- Iniciar com `start-local.bat`.

### Política de backup recomendada
- **Diário:** `backup.bat` no fim do dia
- **Antes de atualização:** backup extra
- **Semanal:** copiar `backups/` para pendrive/Drive

---

## 14) Deploy/Distribuição (local)
Estratégia:
- Dev: `npm run dev`
- Operação: `npm run build` (uma vez) + `npm run start` via `.bat`

---

## 15) Plano de execução (ordem de implementação)
**T0** — Repo, docs, scripts placeholders ✅  
**T1.1** — Scaffold Next + TS + Prisma + SQLite + login + `start-local.bat` funcional  
**T2** — Migrations core (customers, orders, order_items, products, skus)  
**T3** — Cadastro mínimo SKU/Produto + import CSV  
**T4** — Pedidos (1 minuto) + status + cancelamento  
**T5** — Impressões (ticket/dia/semana/produção)  
**T6** — Agenda dia/semana + filtros  
**T7** — Estoque + movimentos + conversão encomenda  
**T8** — Capacidade + alertas + relatórios + export CSV  
**T9** — Hardening (LGPD, auditoria completa, UX, performance)

Cada etapa deve passar no `product/ACCEPTANCE.md`.

---

## 16) “Stop conditions” (quando parar e dividir tarefa)
- Se o diff crescer demais (>300–400 linhas), dividir.
- Se começar a misturar “cadastro” com “impressão”, dividir.
- Se inventar regra não prevista em `/product`, parar e registrar decisão.

---

## 17) Checklist de pronto para operação (DoD operacional)
- Sistema inicia por `start-local.bat`.
- Usuário consegue: logar, cadastrar pedido, imprimir, rodar backup.
- Banco em `data/app.sqlite` e backup gera arquivo em `backups/`.
- Auditoria funcionando nos eventos críticos.
- Export CSV funcionando.

---

## 18) Riscos e mitigação
- **Risco:** corrupção/erro humano no PC  
  **Mitigação:** backups diários + restore simples
- **Risco:** “clicar no ícone” e nada abrir  
  **Mitigação:** `start-local.bat` com mensagens claras + verificação de porta
- **Risco:** impressão desalinhada na térmica  
  **Mitigação:** modo 58/80 + CSS print + testes reais
- **Risco:** escopo crescer (virar e-commerce)  
  **Mitigação:** PRD e stop conditions
