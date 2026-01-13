    # SPEC

    ## Problem
    A operação interna de pedidos e produção é hoje fragmentada (WhatsApp, anotações manuais e memória operacional), causando retrabalho, inconsistência de catálogo/preços, risco de erro na produção e dificuldade de visualizar o que deve ser produzido e entregue em cada dia.

    ## Goals (30 days)
    - Reduzir em **50%** o tempo médio de cadastro de um pedido (comparação antes/depois em amostra mínima de 10 pedidos).
    - Garantir que **≥95%** dos pedidos do dia sejam operados pela lista “Hoje” do sistema (sem papel avulso).
    - Ter **0 ocorrências** de quebra de listagem por inconsistência de unidade (`UnitType`) durante 14 dias consecutivos.
    - Ter **100% dos produtos ativos** disponíveis via Catálogo interno no fluxo de novo pedido.
    - Utilizar o sistema diariamente por **7 dias consecutivos** sem necessidade de correção manual fora do sistema.

    ## MVP
    Um operador interno consegue, diariamente e sem ajuda externa:  
    fazer login, cadastrar pedidos completos (cliente, data de entrega, itens), visualizar e operar a fila de pedidos por data de entrega, alterar status até “Entregue”, cancelar pedidos com motivo obrigatório e manter um catálogo interno mínimo (categorias, produtos e SKUs) usado obrigatoriamente em novos pedidos.

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
    - Catálogo:
    - Estrutura: Categoria → Produto (pai) → SKU (vendável).
    - Apenas SKUs **ativos** podem ser usados em novos pedidos.
    - Pedidos antigos devem exibir itens mesmo que o SKU/produto esteja inativo.
    - “Sob consulta” pode existir no produto e ser sobrescrito no SKU.
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
    - Crescimento de escopo no catálogo antes de estabilizar o CRUD básico (mitigar com MVP estrito).
    - Dependência de operação manual única (mitigar com simplicidade extrema e validações fortes).

    ## Assumptions
    - O fluxo mínimo de status é suficiente para operação inicial.
    - Impressão não é necessária para o MVP funcional.
    - Não há concorrência de múltiplos operadores simultâneos no início.
