    # SPEC

    ## Problem
    A operação interna de pedidos e produção é hoje fragmentada (WhatsApp, anotações manuais e memória operacional), causando retrabalho, inconsistência de produtos/preços, risco de erro na produção e dificuldade de visualizar o que deve ser produzido e entregue em cada dia.

    ## Goals (30 days)
    - Reduzir em **50%** o tempo médio de cadastro de um pedido (comparação antes/depois em amostra mínima de 10 pedidos).
    - Garantir que **≥95%** dos pedidos do dia sejam operados pela lista “Hoje” do sistema (sem papel avulso).
    - Ter **0 ocorrências** de quebra de listagem por inconsistência de unidade (`UnitType`) durante 14 dias consecutivos.
    - Ter **100% dos produtos ativos** disponíveis no fluxo de novo pedido.
    - Utilizar o sistema diariamente por **7 dias consecutivos** sem necessidade de correção manual fora do sistema.

    ## MVP
    Um operador interno consegue, diariamente e sem ajuda externa:  
    fazer login, cadastrar pedidos completos (cliente, data de entrega, itens), visualizar e operar a fila de pedidos por data de entrega, alterar status até “Entregue”, cancelar pedidos com motivo obrigatório e manter o cadastro interno de categorias, produtos e SKUs usado obrigatoriamente em novos pedidos.

    ## Non-goals
    - Pagamentos online ou controle financeiro.
    - Integrações externas (WhatsApp API, iFood, etc.).
    - Importação ou exportação de dados (CSV/Excel).
    - Modo offline.
    - Sistema público para clientes finais.
    - Relatórios avançados além das listagens operacionais.

    ## Users & Context
    - Primary users: Operador(a) interno(a) responsável por pedidos e produção.
    - Environment (desktop/mobile, printing, etc.): Desktop Windows 10; uso contínuo durante o dia; impressão não é requisito do MVP.
    - Frequency/volume: Volume semanal desconhecido (assumir dezenas de pedidos).
    - Assumptions:
    - Sistema roda localmente (Next.js + Prisma + SQLite).
    - Existe apenas um usuário administrativo no MVP.
    - O cliente final não acessa o sistema.

    ## Business Rules
    - Autenticação:
    - Login único via credenciais administrativas.
    - Sessão baseada em cookie httpOnly assinado.
    - Pedidos:
    - A listagem é sempre baseada na **data de entrega**.
    - Tabs obrigatórias:
        - **Hoje**: entrega na data corrente.
        - **Semana**: entrega dentro da semana corrente.
        - **Todos**: pedidos com entrega hoje ou no futuro.
        - **Anteriores**: pedidos com entrega nos últimos 30 dias.
    - Cancelamento de pedido exige motivo obrigatório.
    - Pedidos cancelados não podem ser entregues.
    - Workflow de status (MVP):
    - Novo → Em Produção → Pronto → Entregue
    - Cancelado é permitido até antes de “Entregue”.
    - “Entregue” é estado final e imutável.
    - Produtos e SKUs:
    - Estrutura: Categoria → Produto (pai) → SKU (vendável).
    - Apenas SKUs **ativos** podem ser usados em novos pedidos.
    - Pedidos antigos devem exibir itens mesmo que o SKU/produto esteja inativo.
    - Lead time é definido no produto pai.
    - Unidades e quantidades:
    - **UNIDADE**: apenas valores inteiros.
    - **CENTO**: apenas valores inteiros.
    - **KG**: apenas múltiplos de 0,05.
    - Estoque:
    - Controle por SKU.
    - Falta de estoque de pronta entrega converte o item em ENCOMENDA.
    - **Baixa de estoque ocorre somente ao mudar o status do pedido para “Entregue”.**

    ## Edge cases
    - Cookie de sessão inválido não pode gerar loop entre `/login` e `/admin`.
    - Registros antigos com `UnitType` inválido não podem quebrar listagens.
    - SKU inativado após existir em pedido deve continuar visível no histórico.
    - Pedido de retirada (sem endereço) vs pedido com entrega devem coexistir.
    - Tentativa de cancelar pedido sem motivo deve ser bloqueada.
    - Quantidades fracionárias inválidas devem ser rejeitadas no client e no server.
    - Paginação deve manter filtros e tab selecionada.

    ## Acceptance Criteria
    - Given usuário não autenticado When acessa `/admin` Then é redirecionado para `/login`.
    - Given credenciais inválidas When envia login Then permanece em `/login` sem sessão válida.
    - Given pedido com entrega hoje When acesso a tab “Hoje” Then o pedido aparece.
    - Given pedido com entrega futura When acesso “Todos” Then o pedido aparece.
    - Given pedido com entrega passada When acesso “Anteriores” Then o pedido aparece.
    - Given pedido em qualquer status antes de “Entregue” When cancelo com motivo Then status muda para Cancelado e o motivo é persistido.
    - Given tentativa de cancelamento sem motivo When salvo Then o sistema bloqueia a ação.
    - Given SKU ativo When crio novo pedido Then consigo selecioná-lo.
    - Given SKU inativo When crio novo pedido Then não consigo selecioná-lo.
    - Given pedido antigo com SKU inativado When abro o detalhe Then o item é exibido corretamente.
    - Given unidade UNIDADE ou CENTO When informo valor fracionário Then o sistema rejeita.
    - Given unidade KG When informo valor não múltiplo de 0,05 Then o sistema rejeita.
    - Given pedido muda para “Entregue” When a transição é salva Then o estoque do SKU é baixado.
    - Given pedido já “Entregue” When tento alterar status Then o sistema bloqueia.

    ## Metrics
    - Leading metrics:
    - Tempo médio de cadastro de pedido.
    - % de pedidos do dia registrados antes do início da produção.
    - Número de erros de validação por semana.
    - Lagging metrics:
    - Redução de retrabalho manual.
    - Redução de divergência entre pedido e produção.
    - Frequência de uso diário do sistema.

    ## Risks
    - Inconsistência histórica de unidades quebrando regras de validação (mitigar com normalização/migração).
    - Crescimento de escopo em produtos/SKUs antes de estabilizar o CRUD básico (mitigar com MVP estrito).
    - Dependência de operação manual única (mitigar com simplicidade extrema e validações fortes).

    ## Assumptions
    - O fluxo mínimo de status é suficiente para operação inicial.
    - Impressão não é necessária para o MVP funcional.
    - Não há concorrência de múltiplos operadores simultâneos no início.


📘 SPEC-MASTER.md
Sistema de Pedidos – Controle Operacional com Tranquilidade Mental
1. Objetivo do Produto
Eliminar a ansiedade operacional de pequenos empreendedores que recebem pedidos por WhatsApp/Instagram, garantindo que:
nenhum pedido seja esquecido
nenhuma alteração passe despercebida
o usuário não precise revisar histórico manualmente
O sistema substitui o “controle mental” por sinalização ativa de atenção.

2. Princípios do Sistema
O usuário não procura problemas → o sistema aponta pendências.
Estados, completude e pendências são conceitos distintos.
A fonte da verdade é server-side.
UI existe para reduzir ansiedade, não para criar culpa.
Produção pode começar com incertezas, entrega não.

3. Glossário
READY: pedido tem requisitos mínimos para produção.
CONFIRMADO: cliente validou o pedido como está naquele momento.
Pendência: algo que exige atenção humana.
Alteração crítica: mudança que invalida uma confirmação anterior.
Reconfirmar: ação explícita de validação após alteração crítica.

4. Estrutura de SPECS
SPEC-Core-Orders.md
SPEC-Attention-Inbox.md
SPEC-Home.md
SPEC-UI-FieldFlags.md
SPEC-AuditLog.md

📘 SPEC-Core-Orders.md
Núcleo de Pedidos (Domínio)
1. Estados do Pedido
Estados possíveis:
RASCUNHO
CONFIRMADO
EM_PRODUCAO
PRONTO
ENTREGUE
CANCELADO

2. Transições Permitidas
RASCUNHO → CONFIRMADO
RASCUNHO → EM_PRODUCAO
CONFIRMADO → EM_PRODUCAO
EM_PRODUCAO → PRONTO
PRONTO → ENTREGUE
Qualquer estado → CANCELADO

3. Completude (READY)
Definição
Um pedido é considerado READY quando:
possui itens
possui data de entrega
Nada além disso é obrigatório para READY.
Observações
Horário: opcional
Endereço: opcional
Pagamento: opcional
READY não significa pedido fechado ou confirmado.

4. Confirmação
Definição
CONFIRMADO significa:
“O cliente validou esse pedido como ele está agora.”
CONFIRMADO exige READY mínimo (itens + data).
CONFIRMADO não implica pagamento.

5. Alterações Críticas
Campos críticos
Itens / quantidades
Data
Horário
Endereço
Valor / preço
Observações
Regra
Se um pedido CONFIRMADO sofrer alteração em qualquer campo crítico:
marcar como Alterado
gerar pendência ativa
bloquear PRONTO e ENTREGUE
exigir reconfirmação

6. Reconfirmar
Ação explícita do usuário
Motivo opcional
Remove pendência de alteração
Libera PRONTO / ENTREGUE

7. Produção
Pedido pode ir para EM_PRODUCAO sem confirmação
Requisito mínimo: READY
Alteração crítica em produção:
mantém status
exige reconfirmação para concluir

8. Pagamento
Pagamento só é obrigatório para marcar ENTREGUE
Falta de pagamento não gera pendência no MVP

📘 SPEC-Attention-Inbox.md
Pendências (Sistema Anti-Ansiedade)
1. Definição
Pendência é qualquer condição que:
exige atenção humana
representa risco operacional ou de esquecimento

2. Tipos de Pendência (MVP)
Tipo
Descrição
Pedido incompleto
Falta requisito de READY
Alterado após confirmação
Campo crítico mudou
Entrega em até 7 dias sem horário
Risco de agenda
Pedido de entrega sem endereço
Impossível entregar


3. Gatilhos
Pedido incompleto → READY = false
Alterado → alteração crítica pós CONFIRMADO
Sem horário → data ≤ 7 dias e horário vazio
Sem endereço → tipo = entrega e endereço vazio

4. Severidade
Forte
bloqueia PRONTO / ENTREGUE
ex: alteração crítica, incompleto

5. Alertas (não bloqueiam)
Alertas são sinais operacionais que não bloqueiam o fluxo.
Exemplos: itens indisponíveis (precisa produzir), falta de horário, falta de endereço.
Fraca
alerta visual
ex: sem horário próximo

5. SLA Mental
Pendências devem ser resolvidas:
até confirmação
ou antes de PRONTO / ENTREGUE
Produção não é bloqueada por pendências fracas.

6. Comportamento
Pendências aparecem na Home
Pendências podem ser filtradas na listagem
Pendências são a fonte única de alerta

📘 SPEC-Home.md
Home Operacional
1. Objetivo
Substituir o hábito de revisar 30 dias por:
“Se não há pendências, nada foi esquecido.”

2. Papel da Home
Primeira tela após login
Central de controle operacional
Não é BI avançado

3. Blocos Obrigatórios
Pendências
contador destacado
ação primária
Pedidos
hoje
próximos 7 dias
Receita
filtrável por período

4. Ações Principais
Ver e resolver pendências
Ver pedidos de hoje

5. Filtros
Hoje
Próximos 7 dias
Período customizado

📘 SPEC-UI-FieldFlags.md
Flags Visuais por Campo
1. Objetivo
Reduzir ansiedade mostrando claramente:
“O que falta neste pedido?”

2. Princípio
Flags não são regra de negócio.
Elas derivam de:
completude
pendências
missingFields calculados no server

3. Estados de Campo
OK
Pendente
Opcional

4. Campos com Flag
Itens
Data
Horário
Endereço
Pagamento (informativo)

5. Copy
Curto
Objetivo
Sem tom de erro
Ex:
“Horário a confirmar”
“Endereço ainda não informado”

6. Listagem
Badge “Incompleto”
Badge “Com alteração”

📘 SPEC-AuditLog.md
Histórico e Prova de Controle
1. Objetivo
Eliminar paranoia e disputas com:
evidência clara de mudanças

2. O que gera log
Criação de pedido
Alteração de qualquer campo
Confirmação
Reconfirmação
Mudança de status

3. Estrutura do Log
usuário
data/hora
campo alterado
valor anterior
novo valor
motivo (se informado)

4. Regras
Alterações em rascunho → apenas log
Motivo nunca obrigatório
Histórico sempre visível no pedido

✅ Encerramento
Este conjunto de SPECS:
resolve a dor emocional + operacional
evita overengineering
cria base sólida para evolução futura
impede decisões implícitas na implementação
Qualquer implementação que viole estes SPECS está errada.
Quando você quiser, o próximo passo natural é:
transformar isso em documentação oficial do repositório
ou derivar critérios de aceite
ou então preparar o terreno para o Codex executar sem inventar regra
Aqui, como produto, está fechado.
## Clientes
Regras do modulo de clientes (server-side):
- name e phone sao obrigatorios.
- phone deve ser normalizado para conter apenas digitos.
- phone nao e chave unica rigida, mas e o identificador preferencial.
  - ao criar/editar com telefone ja existente, o sistema avisa e permite abrir o cliente existente.
- document e opcional.
- endereco e opcional: cep, street, number, complement, neighborhood, city, state.
- pedidos sempre referenciam customerId.
  - no fluxo de criar pedido, se o telefone normalizado ja existir, reutiliza o cliente existente.

UI minima:
- /admin/clientes: lista com nome, telefone, ultimo pedido, #pedidos e link "Ver".
- /admin/clientes/novo: cadastro com dados e endereco opcional.
- /admin/clientes/[id]: abas Dados (editar) e Pedidos (lista com link).

