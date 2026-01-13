# UI

## Principles
- Speed: poucas telas, mínimo de cliques, foco em fluxo desktop
- Error prevention: validação imediata (client + server), confirmações antes de ações destrutivas
- Clarity: status, ativo/inativo e próxima ação sempre visíveis
- Consistência: mesmos padrões de tabela, modais e mensagens em todo o admin
- Acessibilidade: totalmente operável por teclado

---

## Screens

### Screen: Login (/login)
**Purpose**
- Autenticar operador administrativo.

**Primary actions**
- Entrar

**Layout (wireframe in text)**
- Header: Logo
- Main: Form de login (email, senha)
- Footer: Versão do sistema

**Components**
- Input Email
- Input Senha
- Botão Entrar

**States**
- Loading: botão desabilitado + spinner
- Error: mensagem de credenciais inválidas
- Disabled: botão Entrar desabilitado se campos inválidos

**Validation & messages**
- Email inválido → "Informe um email válido."
- Campos vazios → "Preencha este campo."
- Credenciais inválidas → "Email ou senha incorretos."

**Microcopy**
- Labels: "Email", "Senha"
- Buttons: "Entrar"
- Errors: conforme acima

**Accessibility & keyboard**
- Focus order: Email → Senha → Entrar
- Enter submete o formulário
- Labels associados a inputs

---

### Screen: Admin Home (/admin)
**Purpose**
- Ponto inicial do operador para naveCAtalogo e pedidos.

**Primary actions**
- Acessar Pedidos
- Acessar Catálogo

**Layout (wireframe in text)**
- Header: Navegação principal
- Main: Cards de acesso rápido
- Footer: vazio

**Components**
- Card Pedidos
- Card Catálogo

**States**
- Loading: skeleton dos cards
- Error: "Não foi possível carregar o painel."

**Accessibility & keyboard**
- Cards focáveis via Tab
- Enter ativa o card

---

### Screen: Catálogo (/admin/catalog)
**Purpose**
- Entrada do módulo de catálogo.

**Primary actions**
- Ir para Categorias
- Ir para Produtos

**Layout (wireframe in text)**
- Header: Breadcrumb (Admin > Catálogo)
- Main: Links em lista ou cards
- Footer: vazio

**Components**
- Link Categorias
- Link Produtos
- KPI simples: "SKUs ativos: X"

**States**
- Loading: skeleton
- Error: "Erro ao carregar catálogo."

**Accessibility & keyboard**
- Navegação por Tab
- Enter ativa links

---

### Screen: Categorias – Lista (/admin/catalog/categories)
**Purpose**
- Gerenciar categorias de produtos.

**Primary actions**
- Criar categoria
- Editar categoria

**Layout (wireframe in text)**
- Header: Breadcrumb
- Main:
  - Botão "Nova categoria"
  - Tabela de categorias
- Footer: paginação (se aplicável)

**Components**
- Tabela
  - Colunas: Nome | Ativo
- Botão Nova categoria
- Ação Editar por linha

**States**
- Loading: skeleton da tabela
- Empty: "Nenhuma categoria cadastrada."
- Error: "Erro ao carregar categorias."

**Validation & messages**
- Nenhuma específica na lista

**Microcopy**
- Buttons: "Nova categoria", "Editar"

**Accessibility & keyboard**
- Tabela navegável por teclado
- Enter em "Editar" abre modal

---

### Screen: Categoria – Form (modal)
**Purpose**
- Criar ou editar categoria.

**Primary actions**
- Salvar
- Cancelar

**Layout (wireframe in text)**
- Modal:
  - Campo Nome
  - Toggle Ativo
  - Ações no rodapé

**Components**
- Input Nome
- Toggle Ativo
- Botões Salvar / Cancelar

**States**
- Loading: botões desabilitados
- Error: mensagem inline
- Success: toast "Categoria salva com sucesso."

**Validation & messages**
- Nome obrigatório → "Informe o nome da categoria."
- Nome duplicado → "Já existe uma categoria com este nome."

**Microcopy**
- Labels: "Nome", "Ativa"
- Buttons: "Salvar", "Cancelar"
- Confirmations (inativar): "Tem certeza que deseja inativar esta categoria?"

**Accessibility & keyboard**
- Focus inicial no campo Nome
- Esc fecha modal
- Enter salva

---

### Screen: Produtos – Lista (/admin/catalog/products)
**Purpose**
- Visualizar e acessar produtos.

**Primary actions**
- Criar produto
- Editar produto

**Layout (wireframe in text)**
- Header: Breadcrumb
- Main:
  - Filtros
  - Tabela de produtos
- Footer: paginação

**Components**
- Filtros: Categoria, Status, Busca por nome
- Tabela:
  - Colunas: Produto | Categoria | Ativo | Lead time | Sob consulta
- Botão Novo produto

**States**
- Loading: skeleton
- Empty: "Nenhum produto encontrado."
- Error: "Erro ao carregar produtos."

**Validation & messages**
- Busca sem resultado → estado vazio

**Microcopy**
- Buttons: "Novo produto", "Editar"

**Accessibility & keyboard**
- Filtros acessíveis por Tab
- Enter aplica filtros

---

### Screen: Produto – Edição (/admin/catalog/products/[id])
**Purpose**
- Gerenciar dados do produto e seus SKUs.

**Primary actions**
- Salvar produto
- Adicionar SKU

**Layout (wireframe in text)**
- Header: Breadcrumb
- Main:
  - Seção Dados do produto
  - Seção SKUs (tabela)
- Footer: botão Salvar

**Components**
- Dados do produto:
  - Nome
  - Categoria
  - Toggle Ativo
  - Lead time (opcional)
  - Toggle Sob consulta
- Tabela de SKUs
  - Colunas: Display name | Unidade | Preço | Ativo | Crítico | Sob consulta
  - Ações: Editar, Duplicar, Inativar

**States**
- Loading: skeleton da página
- Error: "Erro ao carregar produto."
- Success: toast "Produto salvo com sucesso."

**Validation & messages**
- Nome obrigatório → "Informe o nome do produto."
- Categoria obrigatória → "Selecione uma categoria."
- Lead time < 0 → "Lead time deve ser maior ou igual a zero."

**Microcopy**
- Buttons: "Salvar", "Adicionar SKU"
- Confirmations: "Deseja inativar este SKU?"

**Accessibility & keyboard**
- Navegação linear por Tab
- Enter salva produto
- Tabela de SKUs navegável por teclado

---

### Screen: SKU – Form (modal)
**Purpose**
- Criar ou editar SKU.

**Primary actions**
- Salvar
- Cancelar

**Layout (wireframe in text)**
- Modal:
  - Campos do SKU
  - Ações no rodapé

**Components**
- Input Display name
- Select unitType (UNIDADE, KG, CENTO — DECISÃO PENDENTE)
- Input unitLabel
- Input priceCurrent
- Toggle Crítico
- Toggle Ativo
- Select Sob consulta (Herdar / Forçar sim / Forçar não)

**States**
- Loading: botões desabilitados
- Error: mensagens inline
- Success: toast "SKU salvo com sucesso."

**Validation & messages**
- Display name obrigatório → "Informe o nome do SKU."
- unitLabel obrigatório → "Informe a unidade."
- priceCurrent <= 0 → "Preço deve ser maior que zero."
- unitType KG fora do passo → "Quantidade em KG deve ser múltiplo de 0,05."

**Microcopy**
- Buttons: "Salvar", "Cancelar"

**Accessibility & keyboard**
- Focus inicial no Display name
- Esc fecha modal
- Enter salva

---

## Navigation & flow
- Breadcrumbs em todas as telas de catálogo
- Voltar do produto retorna à lista de produtos
- Modais não alteram rota

---

## Notes for engineering
- Validações devem ser replicadas no backend
- Snapshot de dados (SKU e preço) deve ser usado em pedidos já criados
- Inativação não bloqueia entidades já usadas em pedidos
- Usar toast global para feedback de sucesso/erro
