# UI

## Principles
- Speed: poucas telas, mÃ­nimo de cliques, foco em fluxo desktop
- Error prevention: validaÃ§Ã£o imediata (client + server), confirmaÃ§Ãµes antes de aÃ§Ãµes destrutivas
- Clarity: status, ativo/inativo e prÃ³xima aÃ§Ã£o sempre visÃ­veis
- ConsistÃªncia: mesmos padrÃµes de tabela, modais e mensagens em todo o admin
- Acessibilidade: totalmente operÃ¡vel por teclado

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
- Footer: VersÃ£o do sistema

**Components**
- Input Email
- Input Senha
- BotÃ£o Entrar

**States**
- Loading: botÃ£o desabilitado + spinner
- Error: mensagem de credenciais invÃ¡lidas
- Disabled: botÃ£o Entrar desabilitado se campos invÃ¡lidos

**Validation & messages**
- Email invÃ¡lido â†’ "Informe um email vÃ¡lido."
- Campos vazios â†’ "Preencha este campo."
- Credenciais invÃ¡lidas â†’ "Email ou senha incorretos."

**Microcopy**
- Labels: "Email", "Senha"
- Buttons: "Entrar"
- Errors: conforme acima

**Accessibility & keyboard**
- Focus order: Email â†’ Senha â†’ Entrar
- Enter submete o formulÃ¡rio
- Labels associados a inputs

---

### Screen: Admin Home (/admin)
**Purpose**
- Ponto inicial do operador para navegar pelos pedidos e produtos.

**Primary actions**
- Acessar Pedidos
- Acessar Produtos

**Layout (wireframe in text)**
- Header: NavegaÃ§Ã£o principal
- Main: Cards de acesso rÃ¡pido
- Footer: vazio

**Components**
- Card Pedidos
- Card Produtos

**States**
- Loading: skeleton dos cards
- Error: "NÃ£o foi possÃ­vel carregar o painel."

**Accessibility & keyboard**
- Cards focÃ¡veis via Tab
- Enter ativa o card

---

### Screen: Categorias â€“ Lista (/admin/categories)
**Purpose**
- Gerenciar categorias de produtos.

**Primary actions**
- Criar categoria
- Editar categoria

**Components**
- Busca por nome
- BotÃ£o "Nova categoria" (modal)
- Tabela: Colunas Nome | Ativo

**States**
- Empty: "Nenhuma categoria cadastrada."

---

### Screen: Produtos â€“ Lista (/admin/products)
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
- Footer: paginaÃ§Ã£o

**Components**
- Filtros: Categoria, Status, Busca por nome
- Tabela: Colunas Produto | Categoria | Status | SKUs | AÃ§Ãµes
- BotÃ£o Novo produto

**States**
- Loading: skeleton
- Empty: "Nenhum produto encontrado."
- Error: "Erro ao carregar produtos."

**Validation & messages**
- Busca sem resultado â†’ estado vazio

**Microcopy**
- Buttons: "Novo produto", "Editar"

**Accessibility & keyboard**
- Filtros acessÃ­veis por Tab
- Enter aplica filtros

---

### Screen: Produto â€“ EdiÃ§Ã£o (/admin/products/[id])
**Purpose**
- Gerenciar dados do produto e seus SKUs.

**Primary actions**
- Salvar produto
- Adicionar SKU

**Layout (wireframe in text)**
- Header: Breadcrumb
- Main:
  - SeÃ§Ã£o Dados do produto
  - SeÃ§Ã£o SKUs (tabela)
- Footer: botÃ£o Salvar

**Components**
- Dados do produto:
  - Nome
  - Categoria
  - Toggle Ativo
- Tabela de SKUs
  - Colunas: Display name | Unidade | PreÃ§o | Status
  - AÃ§Ãµes: Editar, Duplicar, Inativar

**States**
- Loading: skeleton da pÃ¡gina
- Error: "Erro ao carregar produto."
- Success: toast "Produto salvo com sucesso."

**Validation & messages**
- Nome obrigatÃ³rio â†’ "Informe o nome do produto."
- Categoria obrigatÃ³ria â†’ "Selecione uma categoria."

**Microcopy**
- Buttons: "Salvar", "Adicionar SKU"
- Confirmations: "Deseja inativar este SKU?"

**Accessibility & keyboard**
- NavegaÃ§Ã£o linear por Tab
- Enter salva produto
- Tabela de SKUs navegÃ¡vel por teclado

---

### Screen: SKU â€“ Form (modal)
**Purpose**
- Criar ou editar SKU.

**Primary actions**
- Salvar
- Cancelar

**Layout (wireframe in text)**
- Modal:
  - Campos do SKU
  - AÃ§Ãµes no rodapÃ©

**Components**
- Input Display name
- Select unitType (UNIDADE, KG, CENTO â€” DECISÃƒO PENDENTE)
- Input unitLabel
- Input priceCurrent
- Toggle Ativo

**States**
- Loading: botÃµes desabilitados
- Error: mensagens inline
- Success: toast "SKU salvo com sucesso."

**Validation & messages**
- Display name obrigatÃ³rio â†’ "Informe o nome do SKU."
- unitLabel obrigatÃ³rio â†’ "Informe a unidade."
- priceCurrent <= 0 â†’ "PreÃ§o deve ser maior que zero."
- unitType KG fora do passo â†’ "Quantidade em KG deve ser mÃºltiplo de 0,05."

**Microcopy**
- Buttons: "Salvar", "Cancelar"

**Accessibility & keyboard**
- Focus inicial no Display name
- Esc fecha modal
- Enter salva

---

## Navigation & flow
- Breadcrumbs em todas as telas de Produtos
- Voltar do produto retorna Ã  lista de produtos
- Modais nÃ£o alteram rota

---

## Notes for engineering
- ValidaÃ§Ãµes devem ser replicadas no backend
- Snapshot de dados (SKU e preÃ§o) deve ser usado em pedidos jÃ¡ criados
- InativaÃ§Ã£o nÃ£o bloqueia entidades jÃ¡ usadas em pedidos
- Usar toast global para feedback de sucesso/erro



