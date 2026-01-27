# Plano de Execução: Elevação Premium da Tela "Novo Pedido"

**Objetivo**: Transformar `/admin/orders/new` em experiência premium, mantendo 100% consistência com Design System v2.

**Contexto**: Usuário usa desktop e mobile (cozinha, pressa, touch). Rascunho pode ser incompleto; confirmação exige itens + data.

---

## 1. Diagnóstico de UX (12 bullets)

### Tarefas Primárias do Usuário
1. **Adicionar itens ao pedido** (busca rápida, adicionar quantidade, ver total)
2. **Definir cliente** (buscar existente ou cadastrar novo)
3. **Configurar entrega** (tipo: pronta entrega/encomenda; método: entrega/retirada; endereço se necessário)

### Fricções e Problemas Identificados

#### Hierarquia e Escaneabilidade
- ❌ **Checklist lateral não destaca próxima ação**: Usuário precisa ler 5 itens para descobrir o que falta
- ❌ **Dois CTAs confusos**: "Salvar pedido" não diferencia rascunho vs confirmação
- ❌ **Busca de itens não é dominante**: Campo pequeno, categoria ao lado compete por atenção

#### Microcopy e Descoberta
- ❌ **"Pagamento combinado" é ambíguo**: Não fica claro que é informativo (não processa pagamento)
- ❌ **Validações aparecem tarde**: Erros só mostram após submit, sem feedback inline
- ❌ **Empty state de itens genérico**: Não guia ação clara

#### Densidade e Mobile
- ❌ **Campos condicionais aparecem de repente**: Endereço surge sem transição suave
- ❌ **Touch targets podem ser pequenos**: Botões "Remover" item podem estar < 44x44px
- ❌ **Sticky lateral no mobile**: NextAction pode ficar cortado ou inacessível

#### Validações e Estados
- ❌ **Vermelho exagerado**: Erros usam `--state-error` em tudo, sem hierarquia
- ❌ **Scroll-to-error não existe**: Usuário não sabe onde está o problema
- ❌ **Cliente novo não valida em tempo real**: Telefone precisa ter 10-11 dígitos, mas feedback só aparece no submit

---

## 2. Proposta de Melhoria Premium

### 2.1 Reestruturação de Ações (1 CTA por Estado)

**Estado: Rascunho (incompleto)**
- CTA primário: "Salvar rascunho" (sempre habilitado, salva como RASCUNHO)
- CTA secundário: Nenhum (ou "Limpar formulário" como ghost, se necessário)

**Estado: Pronto para Confirmar (itens + data OK)**
- CTA primário: "Confirmar pedido" (salva como CONFIRMADO)
- CTA secundário: "Salvar como rascunho" (outline, permite salvar incompleto mesmo com tudo OK)

**Lógica**:
```typescript
const isReadyForConfirm = customerReady && itemsReady && scheduleReady;
const primaryAction = isReadyForConfirm 
  ? { label: "Confirmar pedido", action: "confirm" }
  : { label: "Salvar rascunho", action: "draft" };
```

### 2.2 NextAction Transformado (Card de Próxima Ação)

**Estrutura**:
```
┌─────────────────────────────────┐
│ Resumo Financeiro               │
│ Subtotal: R$ X,XX               │
│ Taxa: R$ X,XX                    │
│ Total: R$ X,XX                   │
├─────────────────────────────────┤
│ Próxima ação                     │
│ → Adicionar itens                │  ← DESTAQUE (âmbar, bold)
├─────────────────────────────────┤
│ Checklist                        │
│ ✓ Cliente: João Silva            │
│ ✗ Itens: Nenhum item             │
│ ✓ Data: Cadastro agora           │
│ ○ Horário: Agora                 │
│ ✓ Entrega: Retirada              │
├─────────────────────────────────┤
│ [Confirmar pedido] (primary)     │
│ [Salvar rascunho] (outline)      │
└─────────────────────────────────┘
```

**Comportamento**:
- **Próxima ação** aparece apenas quando há pendência
- Texto dinâmico baseado na primeira pendência: "Adicionar itens", "Definir cliente", "Definir data de entrega", "Informar endereço"
- Quando tudo completo: "Pronto para confirmar" (âmbar claro, não destaque)
- Checklist sempre visível abaixo (máx 5 itens, scroll se necessário)

**Estados**:
- `pending`: X vermelho + texto secundário
- `complete`: ✓ verde + texto primário
- `warning`: ⚠ amarelo + texto secundário (ex.: endereço pendente mas não bloqueia)
- `optional`: ○ cinza + texto muted (ex.: horário em pronta entrega)

### 2.3 Seção Itens: Busca Dominante

**Layout**:
```
┌─────────────────────────────────────────┐
│ Buscar produto                          │
│ [Input grande, 56px altura, foco auto]  │
│                                         │
│ Sugestões (se vazio):                   │
│ • Digite o nome do produto              │
│ • Use categoria para filtrar            │
│                                         │
│ [Categoria: Todas ▼] [Limpar]          │
└─────────────────────────────────────────┘
```

**Melhorias**:
- Input de busca com 56px altura (maior que padrão 44px)
- Foco automático ao entrar na tela (se não houver itens)
- Placeholder: "Digite o nome do produto... (ex.: coxinha)"
- Categoria vira filtro secundário (select menor, à direita)
- Atalho opcional: `Ctrl+K` / `Cmd+K` foca busca (se não conflitar com navegação)
- Empty state melhorado: "Nenhum item adicionado. Busque um produto acima para começar."

**Fluxo de adicionar**:
1. Usuário digita → autocomplete aparece (máx 10 resultados)
2. Seleciona produto → adiciona com quantidade mínima
3. Input de quantidade recebe foco automaticamente
4. Usuário ajusta quantidade → Enter ou Tab confirma
5. Busca limpa automaticamente, pronto para próximo item

### 2.4 Entrega: Controles Segmentados com Microcopy

**Layout**:
```
┌─────────────────────────────────────────┐
│ Tipo de pedido                          │
│ [● Pronta entrega] [○ Encomenda]        │
│   Data/hora automáticas                  │
│                                         │
│ Método de entrega                        │
│ [● Retirada] [○ Entrega]                │
│   Sem endereço, sem taxa                 │
│                                         │
│ ┌─ Aparece se "Entrega" ─────────────┐ │
│ │ Endereço *                          │ │
│ │ [Input]                             │ │
│ │ Cidade *                            │ │
│ │ [Input]                             │ │
│ │ Bairro                              │ │
│ │ [Input]                             │ │
│ │ Taxa de entrega *                   │ │
│ │ [Input] R$ 0,00                     │ │
│ │ Use 0 se não houver cobrança        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─ Aparece se "Encomenda" ───────────┐ │
│ │ Data *                              │ │
│ │ [Date picker]                       │ │
│ │ Horário (opcional)                  │ │
│ │ [Select: 00:00, 00:30...]           │ │
│ │ Informe quando souber               │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Melhorias**:
- Controles segmentados (segmented control) em vez de radio buttons soltos
- Microcopy abaixo de cada opção explica o que acontece
- Campos condicionais aparecem com animação suave (200ms ease-out, altura)
- Validação inline: campos obrigatórios marcados com `*`, erro aparece abaixo do campo
- Autofill de endereço mantido (cliente existente + entrega)

### 2.5 Pagamento: Clareza e Condicionais

**Layout**:
```
┌─────────────────────────────────────────┐
│ Pagamento (informativo)                  │
│ Não processamos pagamento. Registre      │
│ apenas para controle.                     │
│                                         │
│ Forma de pagamento                       │
│ [Select: Pix, Dinheiro, Cartão...]      │
│                                         │
│ Teve sinal?                              │
│ [● Não] [○ Sim]                          │
│                                         │
│ ┌─ Aparece se "Sim" ─────────────────┐ │
│ │ Valor do sinal *                    │ │
│ │ [Input] R$ 0,00                      │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Melhorias**:
- Título muda para "Pagamento (informativo)" ou adiciona badge "Informativo"
- Texto explicativo no topo: "Não processamos pagamento. Registre apenas para controle."
- Campo "Valor do sinal" aparece condicionalmente (animação 200ms)
- Validação: se "Sim", valor obrigatório e > 0

### 2.6 Estados e Validações Premium

**Validação Inline**:
- Campos validam em `onBlur` (não em cada keystroke, para não ser intrusivo)
- Erro aparece abaixo do campo com `--state-error-text`
- Ícone de erro (XCircle 16px) ao lado do label quando há erro
- Scroll-to-error no submit: primeiro erro visível, foco no campo

**Hierarquia de Erros**:
- **Bloqueante** (vermelho): `--state-error` + texto "Campo obrigatório" / "Valor inválido"
- **Atenção** (amarelo): `--state-warning` + texto "Recomendado preencher" (ex.: horário em encomenda)
- **Info** (azul): `--state-info` + texto "Dica: ..." (ex.: "Use 0 se não houver cobrança")

**Mensagens**:
- Curta (máx 60 caracteres)
- Ação clara: "Informe um telefone válido (10 ou 11 dígitos)"
- Sem jargão técnico

### 2.6.1 Catálogo de Mensagens de Erro

**Padrão de Mensagens**:
- **Formato**: "Ação + contexto" (ex.: "Informe um telefone válido" em vez de "Telefone inválido")
- **Tom**: Direto, sem culpar o usuário
- **Comprimento**: Máximo 60 caracteres (ideal: 30-40)
- **Consistência**: Mesmo padrão para campos similares

**Catálogo Completo por Campo**:

#### Cliente

**Cliente Existente**:
- `customerId` vazio: "Selecione um cliente"
- Cliente não encontrado: "Cliente não encontrado. Tente buscar novamente"

**Novo Cliente**:
- `customerName` vazio: "Informe o nome do cliente"
- `customerName` muito curto (< 2 caracteres): "Nome deve ter pelo menos 2 caracteres"
- `customerPhone` vazio: "Informe o telefone do cliente"
- `customerPhone` inválido (não tem 10-11 dígitos): "Telefone deve ter 10 ou 11 dígitos"
- `customerPhone` já existe: "Este telefone já está cadastrado. Use o cliente existente" (com botão "Selecionar cliente existente")

#### Itens

**Busca de Produtos**:
- Nenhum produto encontrado: "Nenhum produto encontrado. Tente outra busca"
- Erro ao buscar: "Não foi possível buscar produtos. Tente novamente"

**Item Adicionado**:
- `quantity` vazia: "Informe a quantidade"
- `quantity` inválida (não numérica): "Quantidade deve ser um número"
- `quantity` menor que mínimo: "Quantidade mínima: {minQty} {unit}"
- `quantity` não é múltiplo do step: "Quantidade deve ser múltiplo de {step} {unit}"
- `quantity` zero ou negativa: "Quantidade deve ser maior que zero"
- Erro ao adicionar item: "Não foi possível adicionar o item. Tente novamente"

**Estoque/Disponibilidade**:
- Item sem estoque (pronta entrega): "Item sem estoque suficiente para pronta entrega"
- Item indisponível: "Item indisponível no momento. Será necessário produzir"

#### Entrega

**Tipo de Pedido**:
- `scheduleDate` vazia (encomenda): "Informe a data de entrega"
- `scheduleDate` inválida: "Data inválida. Use o formato DD/MM/AAAA"
- `scheduleDate` no passado: "Data deve ser no futuro"
- `scheduleTime` inválido: "Horário inválido"
- `scheduleTime` no passado (com data): "Horário deve ser no futuro"

**Método de Entrega**:
- `addressText` vazio (entrega): "Informe o endereço de entrega"
- `addressText` muito curto (< 5 caracteres): "Endereço muito curto. Informe um endereço completo"
- `addressCity` vazio (entrega): "Informe a cidade"
- `addressCity` muito curto (< 2 caracteres): "Cidade deve ter pelo menos 2 caracteres"
- `deliveryFee` vazio (entrega): "Informe a taxa de entrega (use 0 se não houver cobrança)"
- `deliveryFee` inválido (não numérico): "Taxa deve ser um número"
- `deliveryFee` negativa: "Taxa não pode ser negativa. Use 0 se não houver cobrança"

#### Pagamento

**Forma de Pagamento**:
- `paymentMethod` vazio (opcional, mas se houver validação): "Selecione a forma de pagamento"

**Sinal**:
- `depositAmount` vazio (se "Teve sinal: Sim"): "Informe o valor do sinal"
- `depositAmount` inválido (não numérico): "Valor do sinal deve ser um número"
- `depositAmount` zero ou negativa: "Valor do sinal deve ser maior que zero"
- `depositAmount` maior que total: "Valor do sinal não pode ser maior que o total do pedido"

#### Observações

- Nenhuma validação (campo opcional)

#### Erros Gerais do Formulário

**Validação no Submit**:
- Formulário incompleto: "Revise os campos destacados" (aparece no topo, com scroll para primeiro erro)
- Erro ao salvar rascunho: "Não foi possível salvar o rascunho. Tente novamente"
- Erro ao confirmar pedido: "Não foi possível confirmar o pedido. Verifique os dados e tente novamente"
- Erro de rede: "Erro de conexão. Verifique sua internet e tente novamente"
- Erro inesperado: "Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte"

**Validação de Disponibilidade**:
- Itens sem estoque: "Alguns itens estão sem estoque suficiente para pronta entrega"
- Itens indisponíveis: "Alguns itens não estão disponíveis no momento. Será necessário produzir"

### 2.6.2 Onde e Como Exibir Erros

**Erros Inline (abaixo do campo)**:
```
┌─────────────────────────────┐
│ Nome do cliente *           │
│ [Input com borda vermelha]   │
│ ⚠ Informe o nome do cliente  │ ← Erro inline
└─────────────────────────────┘
```

**Erros no Topo (submit)**:
```
┌─────────────────────────────┐
│ ⚠ Revise os campos          │ ← Erro geral no topo
│    destacados                │
├─────────────────────────────┤
│ [Formulário...]              │
└─────────────────────────────┘
```

**Erros em Toast/Notice**:
- Erros de rede ou salvamento: Toast no canto superior direito
- Duração: 5 segundos (auto-dismiss)
- Ação: Botão "Tentar novamente" (se aplicável)

**Hierarquia Visual**:
- **Bloqueante** (vermelho): `--state-error` (#DC2626) + ícone XCircle
- **Atenção** (amarelo): `--state-warning` (#CA8A04) + ícone AlertTriangle
- **Info** (azul): `--state-info` (#0EA5E9) + ícone Info

**Comportamento**:
- Erros aparecem em `onBlur` (não em cada keystroke)
- Erros desaparecem quando campo corrigido (validação em tempo real após primeiro erro)
- Scroll-to-error no submit: primeiro erro visível, foco no campo
- Múltiplos erros: todos visíveis, scroll para o primeiro

### 2.6.3 Tratamento de Erros de Rede e Salvamento

**Erros de Rede**:
- **Quando ocorre**: Falha ao buscar produtos, salvar rascunho, confirmar pedido
- **Onde exibir**: Toast no canto superior direito (desktop) ou topo da tela (mobile)
- **Mensagem**: "Erro de conexão. Verifique sua internet e tente novamente"
- **Ação**: Botão "Tentar novamente" (se aplicável)
- **Duração**: 5 segundos (auto-dismiss) ou até usuário fechar
- **Comportamento**: Não bloqueia interface, permite continuar editando

**Erros de Salvamento**:
- **Quando ocorre**: Falha ao salvar rascunho ou confirmar pedido
- **Onde exibir**: 
  - Toast para erros de rede/timeout
  - Notice no topo do formulário para erros de validação do servidor
- **Mensagens**:
  - Rascunho: "Não foi possível salvar o rascunho. Tente novamente"
  - Confirmação: "Não foi possível confirmar o pedido. Verifique os dados e tente novamente"
  - Validação servidor: "Alguns dados estão inválidos. Revise os campos destacados"
- **Ação**: Botão "Tentar novamente" (se aplicável)
- **Comportamento**: Mantém dados do formulário (não perde rascunho)

**Erros de Disponibilidade**:
- **Quando ocorre**: Itens sem estoque ou indisponíveis
- **Onde exibir**: Notice no topo do formulário (antes do submit)
- **Mensagens**:
  - Sem estoque: "Alguns itens estão sem estoque suficiente para pronta entrega"
  - Indisponíveis: "Alguns itens não estão disponíveis no momento. Será necessário produzir"
- **Ação**: Botões "Salvar mesmo assim" (primary) e "Revisar itens" (secondary)
- **Comportamento**: Bloqueia submit até usuário escolher ação

**Erros Inesperados**:
- **Quando ocorre**: Erro não categorizado (500, erro desconhecido)
- **Onde exibir**: Toast com mensagem genérica
- **Mensagem**: "Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte"
- **Ação**: Botão "Tentar novamente" (se aplicável)
- **Comportamento**: Log erro no console para debug

**Implementação**:
- Usar componente `Toast` do DS v2 (se existir) ou criar baseado em tokens
- Usar componente `InlineNotice` para erros no formulário
- Todos os erros devem ter `aria-live="assertive"` para leitores de tela
- Timeout de requisições: 30 segundos (mostrar erro antes de timeout)

### 2.7 Mobile First: Touch e Sticky

**Layout Mobile**:
- NextAction vira sticky bottom bar (sempre visível)
- Altura mínima: 200px (resumo + checklist compacto + CTA)
- Scroll interno se necessário (checklist)
- CTA primário sempre acessível (sticky no bottom)

**Touch Targets**:
- Todos os botões: mínimo 44x44px
- Inputs: altura 44px (confortável para toque)
- Botão "Remover" item: 44x44px (não apenas ícone)
- Segmented controls: cada opção mínimo 44px altura

**Colapsar/Expandir**:
- Seções podem colapsar no mobile (accordion)
- Estado persistido em `sessionStorage` (preferência do usuário)
- Desktop: sempre expandido

**Foco Inicial**:
- Desktop: busca de itens (se vazio) ou primeiro campo pendente
- Mobile: busca de itens (se vazio) ou scroll para topo

---

## 3. Layout/Wireframe Textual Revisado

### Desktop (≥1024px)

```
┌─────────────────────────────────────────────────────────────────┐
│ Novo pedido                                                      │
│ Você pode salvar como rascunho e completar depois.             │
│ Confirmação exige itens + data.                                 │
├─────────────────────────────────────┬───────────────────────────┤
│                                     │                           │
│ ┌─ Cliente ──────────────────────┐ │ ┌─ Resumo ─────────────┐ │
│ │ [● Existente] [○ Novo]          │ │ │ Subtotal: R$ X,XX    │ │
│ │ [Buscar cliente...]             │ │ │ Taxa: R$ X,XX        │ │
│ │ ou                              │ │ │ Total: R$ X,XX       │ │
│ │ Nome: [________]                │ │ ├─────────────────────┤ │
│ │ Telefone: [________]            │ │ │ → Adicionar itens   │ │
│ └─────────────────────────────────┘ │ ├─────────────────────┤ │
│                                     │ │ ✓ Cliente: João      │ │
│ ┌─ Itens ────────────────────────┐ │ │ ✗ Itens: Nenhum     │ │
│ │ [Buscar produto...] (56px)      │ │ │ ✓ Data: Agora       │ │
│ │ [Categoria: Todas ▼]            │ │ │ ○ Horário: Agora    │ │
│ │                                 │ │ │ ✓ Entrega: Retirada │ │
│ │ [Empty state ou lista]          │ │ ├─────────────────────┤ │
│ └─────────────────────────────────┘ │ │ [Confirmar pedido]   │ │
│                                     │ │ [Salvar rascunho]    │ │
│ ┌─ Entrega ──────────────────────┐ │ └───────────────────────┘ │
│ │ [● Pronta] [○ Encomenda]        │ │                           │
│ │ [● Retirada] [○ Entrega]        │ │                           │
│ │ [Campos condicionais]           │ │                           │
│ └─────────────────────────────────┘ │                           │
│                                     │                           │
│ ┌─ Pagamento ───────────────────┐ │                           │
│ │ [Forma: Select]                │ │                           │
│ │ [● Não] [○ Sim] sinal          │ │                           │
│ │ [Valor se Sim]                 │ │                           │
│ └─────────────────────────────────┘ │                           │
│                                     │                           │
│ ┌─ Observações ──────────────────┐ │                           │
│ │ [Textarea]                      │ │                           │
│ └─────────────────────────────────┘ │                           │
└─────────────────────────────────────┴───────────────────────────┘
```

### Mobile (<1024px)

```
┌─────────────────────────┐
│ Novo pedido             │
│ [Texto explicativo]      │
├─────────────────────────┤
│ ┌─ Cliente ───────────┐ │
│ │ [Tabs]               │ │
│ │ [Campos]             │ │
│ └──────────────────────┘ │
│                         │
│ ┌─ Itens ─────────────┐ │
│ │ [Busca 44px]         │ │
│ │ [Categoria]          │ │
│ │ [Lista ou empty]     │ │
│ └──────────────────────┘ │
│                         │
│ ┌─ Entrega ───────────┐ │
│ │ [Segmentados]        │ │
│ │ [Campos]             │ │
│ └──────────────────────┘ │
│                         │
│ ┌─ Pagamento ─────────┐ │
│ │ [Campos]             │ │
│ └──────────────────────┘ │
│                         │
│ ┌─ Observações ───────┐ │
│ │ [Textarea]           │ │
│ └──────────────────────┘ │
│                         │
│ ┌─ STICKY BOTTOM ─────┐ │
│ │ Subtotal: R$ X,XX   │ │
│ │ Total: R$ X,XX      │ │
│ │ → Adicionar itens   │ │
│ │ ✓ Cliente           │ │
│ │ ✗ Itens             │ │
│ │ [Confirmar pedido]  │ │
│ │ [Salvar rascunho]   │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

### Foco Inicial

**Desktop**:
- Se `items.length === 0`: foco em busca de itens
- Se `items.length > 0 && !customerReady`: foco em busca de cliente
- Se `customerReady && !scheduleReady`: foco em data (se encomenda)
- Caso contrário: foco em primeiro campo pendente

**Mobile**:
- Sempre: scroll para topo, foco em busca de itens (se vazio) ou primeiro campo pendente

### Sticky Behavior

**Desktop**:
- NextAction sticky na lateral (sempre visível ao scroll)
- Altura máxima: 90vh, scroll interno se necessário

**Mobile**:
- NextAction sticky no bottom (sempre visível)
- Altura: auto (máx 50vh), scroll interno se necessário
- Backdrop blur leve (opcional, para separar do conteúdo)

---

## 4. Plano de Implementação em PRs

### PR1: Ações + NextAction Transformado + Tratamento de Erros

**Arquivos**:
- `app/admin/orders/new/OrderForm.tsx` (lógica de ações, estado rascunho vs confirmado, tratamento de erros)
- `app/admin/orders/NextAction.client.tsx` (adicionar prop `nextAction?: { label: string, onClick?: () => void }`)
- `app/admin/orders/NextAction.module.css` (estilos para próxima ação destacada)
- `app/admin/orders/new/actions.ts` (adicionar lógica para salvar como rascunho vs confirmado)
- `app/admin/orders/new/OrderForm.tsx` (toast/notice para erros de salvamento)

**Definition of Done**:
- [ ] CTA primário muda dinamicamente: "Salvar rascunho" (incompleto) vs "Confirmar pedido" (completo)
- [ ] CTA secundário "Salvar rascunho" aparece apenas quando pronto para confirmar
- [ ] NextAction mostra "Próxima ação" destacada quando há pendência
- [ ] Próxima ação desaparece quando tudo completo
- [ ] Checklist sempre visível abaixo
- [ ] Resumo financeiro sempre visível no topo
- [ ] Tratamento de erros de salvamento:
  - [ ] Toast para erros de rede: "Erro de conexão. Verifique sua internet e tente novamente"
  - [ ] Notice para erros de validação: "Não foi possível salvar. Revise os campos destacados"
  - [ ] Botão "Tentar novamente" quando aplicável
  - [ ] Dados do formulário mantidos após erro (não perde rascunho)
- [ ] Testes: rascunho salva como RASCUNHO, confirmação salva como CONFIRMADO

**Risk Surface**:
- **Risco**: Quebrar fluxo existente de salvamento
- **Mitigação**: Manter compatibilidade com `createOrderAction`, adicionar parâmetro `status` opcional
- **Risco**: Erros de rede podem causar perda de dados
- **Mitigação**: Manter rascunho em `sessionStorage`, restaurar após erro

**QA Script**:
1. Abrir `/admin/orders/new`
2. Verificar: CTA primário = "Salvar rascunho" (desabilitado se formulário vazio)
3. Preencher cliente (novo ou existente)
4. Verificar: CTA primário ainda = "Salvar rascunho", NextAction mostra "→ Adicionar itens"
5. Adicionar 1 item
6. Verificar: CTA primário ainda = "Salvar rascunho", NextAction mostra "→ Definir data" (se encomenda)
7. Definir data (se encomenda) ou manter pronta entrega
8. Verificar: CTA primário = "Confirmar pedido", CTA secundário = "Salvar rascunho"
9. Clicar "Salvar rascunho" → verificar pedido salvo como RASCUNHO
10. Recarregar página, preencher tudo
11. Clicar "Confirmar pedido" → verificar pedido salvo como CONFIRMADO
12. **Teste de erro de rede**:
    - Desconectar internet, tentar salvar → verificar toast: "Erro de conexão. Verifique sua internet e tente novamente"
    - Verificar: dados do formulário mantidos (não perdeu)
    - Reconectar, tentar novamente → verificar salva com sucesso
13. **Teste de erro de validação do servidor**:
    - Preencher dados que causam erro no servidor → verificar notice no topo
    - Verificar: dados mantidos, pode corrigir e tentar novamente
14. **Mobile**: Verificar sticky bottom bar, scroll interno funciona
15. **Teclado**: Tab navega corretamente, Enter ativa CTA primário
16. **A11y**: Verificar mensagens de erro são anunciadas pelo leitor de tela

---

### PR2: Seção Itens Premium + Mensagens de Erro

**Arquivos**:
- `app/admin/orders/new/OrderForm.tsx` (busca dominante, foco automático, empty state, validação de quantidade)
- `app/admin/_styles/adminPrimitives.module.css` (classe `.itemsSearchDominant` para input 56px, estilos de erro em itens)
- `app/admin/orders/new/OrderForm.tsx` (atalho `Ctrl+K` / `Cmd+K` opcional, mensagens de erro de quantidade)

**Definition of Done**:
- [ ] Input de busca tem 56px altura (maior que padrão)
- [ ] Foco automático ao entrar na tela (se `items.length === 0`)
- [ ] Placeholder melhorado: "Digite o nome do produto... (ex.: coxinha)"
- [ ] Categoria vira filtro secundário (select menor, à direita)
- [ ] Empty state melhorado: "Nenhum item adicionado. Busque um produto acima para começar."
- [ ] Atalho `Ctrl+K` / `Cmd+K` foca busca (se não conflitar)
- [ ] Após adicionar item, quantidade recebe foco automaticamente
- [ ] Busca limpa automaticamente após adicionar
- [ ] Validação de quantidade inline em `onBlur`:
  - [ ] Quantidade vazia: "Informe a quantidade"
  - [ ] Quantidade inválida: "Quantidade deve ser um número"
  - [ ] Quantidade menor que mínimo: "Quantidade mínima: {minQty} {unit}"
  - [ ] Quantidade não é múltiplo do step: "Quantidade deve ser múltiplo de {step} {unit}"
  - [ ] Quantidade zero ou negativa: "Quantidade deve ser maior que zero"
- [ ] Erro de busca: "Nenhum produto encontrado. Tente outra busca" (quando busca vazia)
- [ ] Erro de rede na busca: "Não foi possível buscar produtos. Tente novamente"

**Risk Surface**:
- **Risco**: Conflito com atalho `Ctrl+K` de navegação global
- **Mitigação**: Verificar se há navegação global, se sim, remover atalho ou usar `Ctrl+Shift+K`
- **Risco**: Validação de quantidade pode ser intrusiva durante digitação
- **Mitigação**: Validar apenas em `onBlur`, não em cada keystroke

**QA Script**:
1. Abrir `/admin/orders/new`
2. Verificar: foco automático em busca de itens
3. Digitar "coxinha" → verificar autocomplete aparece
4. Selecionar produto → verificar item adicionado, quantidade com foco
5. **Teste de validação de quantidade**:
   - Deixar quantidade vazia → `onBlur` → verificar erro: "Informe a quantidade"
   - Preencher quantidade menor que mínimo → `onBlur` → verificar erro: "Quantidade mínima: {minQty} {unit}"
   - Preencher quantidade inválida (ex.: "abc") → `onBlur` → verificar erro: "Quantidade deve ser um número"
   - Preencher quantidade zero → `onBlur` → verificar erro: "Quantidade deve ser maior que zero"
   - Preencher quantidade válida → verificar erro desaparece
6. Ajustar quantidade, pressionar Enter → verificar confirma
7. Verificar: busca limpa automaticamente
8. Adicionar mais itens → verificar fluxo funciona
9. Limpar todos os itens → verificar empty state aparece
10. **Teste de busca vazia**: Buscar produto inexistente → verificar mensagem: "Nenhum produto encontrado. Tente outra busca"
11. **Mobile**: Verificar input 44px altura (touch confortável)
12. **Teclado**: Tab navega corretamente, setas navegam autocomplete, Enter seleciona

---

### PR3: Entrega + Pagamento Premium + Mensagens de Erro

**Arquivos**:
- `app/admin/orders/new/OrderForm.tsx` (controles segmentados, microcopy, campos condicionais, validação inline, mensagens de erro)
- `app/admin/_styles/adminPrimitives.module.css` (classe `.segmented` para controles segmentados, estilos de erro)
- `app/admin/orders/new/OrderForm.tsx` (scroll-to-error, catálogo de mensagens)

**Definition of Done**:
- [ ] Controles segmentados em vez de radio buttons soltos
- [ ] Microcopy abaixo de cada opção explica comportamento
- [ ] Campos condicionais aparecem com animação (200ms ease-out, altura)
- [ ] Validação inline em `onBlur` (erro abaixo do campo)
- [ ] Mensagens de erro implementadas conforme catálogo (seção 2.6.1)
- [ ] Ícone de erro (XCircle 16px) ao lado do label quando há erro
- [ ] Borda vermelha no campo com erro (`--state-error`)
- [ ] Scroll-to-error no submit (primeiro erro visível, foco no campo)
- [ ] Erro geral no topo quando submit com erros: "Revise os campos destacados"
- [ ] Pagamento: título "Pagamento (informativo)" + texto explicativo
- [ ] Campo "Valor do sinal" aparece condicionalmente (animação 200ms)
- [ ] Validação: se "Sim" sinal, valor obrigatório e > 0
- [ ] Mensagens de erro seguem padrão: "Ação + contexto" (máx 60 caracteres)
- [ ] Erros desaparecem quando campo corrigido (validação em tempo real após primeiro erro)

**Risk Surface**:
- **Risco**: Controles segmentados podem não existir no DS v2
- **Mitigação**: Criar componente `SegmentedControl` baseado em tokens, ou usar radio buttons estilizados
- **Risco**: Muitas mensagens de erro podem poluir a interface
- **Mitigação**: Erros aparecem apenas em `onBlur`, desaparecem quando corrigido, máximo 1 erro por campo

**QA Script**:
1. Abrir `/admin/orders/new`
2. Verificar: controles segmentados para tipo de pedido e método de entrega
3. Selecionar "Encomenda" → verificar campos data/horário aparecem (animação)
4. Selecionar "Entrega" → verificar campos endereço aparecem (animação)
5. **Teste de validação inline**:
   - Clicar em campo "Endereço" e sair sem preencher (`onBlur`) → verificar erro aparece: "Informe o endereço de entrega"
   - Verificar: borda vermelha no campo, ícone XCircle ao lado do label
   - Preencher endereço → verificar erro desaparece
6. **Teste de validação de telefone**:
   - Modo "Novo cliente", preencher telefone com 5 dígitos → `onBlur` → verificar erro: "Telefone deve ter 10 ou 11 dígitos"
   - Preencher telefone válido → verificar erro desaparece
7. **Teste de validação de quantidade**:
   - Adicionar item, preencher quantidade menor que mínimo → `onBlur` → verificar erro: "Quantidade mínima: {minQty} {unit}"
8. **Teste de submit com erros**:
   - Submeter sem preencher obrigatórios → verificar:
     - Erro geral no topo: "Revise os campos destacados"
     - Scroll automático para primeiro erro
     - Foco no primeiro campo com erro
     - Todos os erros visíveis
9. **Teste de validação de sinal**:
   - Selecionar "Teve sinal: Sim" → verificar campo valor aparece (animação)
   - Deixar valor vazio → `onBlur` → verificar erro: "Informe o valor do sinal"
   - Preencher valor zero → verificar erro: "Valor do sinal deve ser maior que zero"
   - Preencher valor maior que total → verificar erro: "Valor do sinal não pode ser maior que o total do pedido"
10. **Teste de validação de data**:
    - Selecionar "Encomenda", preencher data no passado → `onBlur` → verificar erro: "Data deve ser no futuro"
    - Preencher data futura → verificar erro desaparece
11. **Teste de validação de taxa**:
    - Selecionar "Entrega", preencher taxa negativa → `onBlur` → verificar erro: "Taxa não pode ser negativa. Use 0 se não houver cobrança"
12. **Mobile**: Verificar controles segmentados têm 44px altura (touch)
13. **Teclado**: Tab navega corretamente, setas mudam opção em segmentados
14. **Acessibilidade**: Verificar mensagens de erro têm `aria-live="polite"` para leitores de tela

---

### PR4: Polimento Mobile + A11y

**Arquivos**:
- `app/admin/orders/new/OrderForm.tsx` (sticky bottom bar mobile, accordion opcional)
- `app/admin/orders/NextAction.module.css` (estilos mobile, sticky bottom)
- `app/admin/orders/new/OrderForm.tsx` (touch targets 44x44px, foco visível, aria-labels)

**Definition of Done**:
- [ ] NextAction sticky bottom bar no mobile (sempre visível)
- [ ] Altura máxima 50vh, scroll interno se necessário
- [ ] Todos os botões têm mínimo 44x44px (touch targets)
- [ ] Botão "Remover" item: 44x44px (não apenas ícone)
- [ ] Foco visível em todos os elementos interativos (anel âmbar 3px)
- [ ] Aria-labels em todos os botões e controles
- [ ] Navegação por teclado completa (Tab, Enter, Space, Esc, setas)
- [ ] Accordion opcional para seções no mobile (estado em `sessionStorage`)
- [ ] Motion 160-220ms ease-out em todas as animações
- [ ] Testes de contraste WCAG AA (ferramenta automatizada)

**Risk Surface**:
- **Risco**: Sticky bottom bar pode esconder conteúdo importante
- **Mitigação**: Altura máxima 50vh, scroll interno, backdrop blur leve

**QA Script**:
1. Abrir `/admin/orders/new` no mobile (Chrome DevTools)
2. Verificar: NextAction sticky no bottom, sempre visível
3. Scroll página → verificar NextAction permanece visível
4. Verificar: todos os botões têm mínimo 44x44px
5. Verificar: botão "Remover" item tem 44x44px
6. **A11y**: Ativar leitor de tela (NVDA/JAWS), navegar formulário
7. **A11y**: Verificar foco visível em todos os elementos (Tab)
8. **A11y**: Verificar aria-labels descritivos
9. **A11y**: Verificar mensagens de erro têm `aria-live="polite"` e são anunciadas pelo leitor de tela
10. **A11y**: Verificar contraste WCAG AA (ferramenta) - mensagens de erro devem ter contraste adequado
11. **A11y**: Verificar `aria-invalid="true"` em campos com erro
12. **A11y**: Verificar `aria-describedby` ligando campo ao erro
13. **Teclado**: Tab navega corretamente, Enter ativa, Esc fecha modais/autocomplete
14. **Motion**: Verificar animações 160-220ms, não atrasam ações
15. **Mobile**: Testar em dispositivo real (iPhone/Android), verificar touch targets
16. **Erros no mobile**: Verificar mensagens de erro são legíveis e não cortam conteúdo importante

---

## 5. Regras Obrigatórias (Não Negociar)

### Consistência DS v2
- ✅ Usar apenas tokens definidos (`--action-primary`, `--text-primary`, etc.)
- ✅ Proibido hardcode de cores, espaçamentos, raios, sombras
- ✅ Motion: 160-220ms `ease-out` apenas
- ✅ Radius: apenas `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-full`
- ✅ Sombras: apenas `--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-focus`

### CTA Único
- ✅ 1 CTA primário por tela/estado
- ✅ Outras ações: secondary, outline ou ghost
- ✅ CTA primário muda dinamicamente conforme estado (rascunho vs confirmado)

### Acessibilidade
- ✅ Foco visível: anel âmbar 3px (`--shadow-focus`)
- ✅ Aria-labels em todos os botões e controles
- ✅ Navegação por teclado completa (Tab, Enter, Space, Esc, setas)
- ✅ Contraste WCAG AA mínimo (4.5:1 texto normal, 3:1 texto grande)

### Motion
- ✅ Duração: 160-220ms (`--duration-normal`)
- ✅ Easing: `--ease-out` (cubic-bezier(0, 0, 0.2, 1))
- ✅ Proibido: bounce, elastic, spring, ease-in
- ✅ Motion nunca atrasa ação (se animação > 200ms, usar `will-change`)

### Touch Targets
- ✅ Mínimo 44x44px no mobile
- ✅ Inputs: altura 44px (confortável para toque)
- ✅ Botões: mínimo 44x44px

### Microcopy
- ✅ PT-BR, curto (máx 60 caracteres por mensagem)
- ✅ Consistente com resto do sistema
- ✅ Ação clara: "Adicionar itens" em vez de "Itens pendentes"

---

## Decisões Pendentes

### 1. Controles Segmentados
**Decisão**: Criar componente `SegmentedControl` baseado em tokens DS v2 ou usar radio buttons estilizados?

**Recomendação**: Criar componente `SegmentedControl` reutilizável (pode ser usado em outras telas). Baseado em tokens, altura 44px, animação 200ms ease-out.

### 2. Atalho `Ctrl+K` / `Cmd+K`
**Decisão**: Implementar atalho para focar busca de itens ou remover?

**Recomendação**: Verificar se há navegação global com `Ctrl+K`. Se sim, remover atalho ou usar `Ctrl+Shift+K`. Se não, implementar.

### 3. Accordion no Mobile
**Decisão**: Implementar accordion para seções no mobile ou manter sempre expandido?

**Recomendação**: Opcional (toggle no topo da seção), estado em `sessionStorage`. Padrão: expandido. Usuário pode colapsar se preferir.

---

## Checklist Final

Antes de marcar PR como "Ready for Review":

- [ ] Todos os tokens do DS v2 usados (sem hardcode)
- [ ] 1 CTA primário por estado
- [ ] Acessibilidade: foco visível, aria-labels, teclado
- [ ] Motion: 160-220ms ease-out
- [ ] Touch targets: 44x44px no mobile
- [ ] Microcopy: PT-BR, curto, consistente
- [ ] Testes: desktop, mobile, teclado, leitor de tela
- [ ] Contraste WCAG AA verificado
- [ ] Sem regressões (testar fluxo completo)

---

**Próximos Passos**:
1. Revisar plano com time
2. Aprovar decisões pendentes
3. Iniciar PR1 (Ações + NextAction)
4. QA após cada PR
5. Deploy incremental
