# Plano v2.1 (Exceptional) - Elevação da Tela "Novo Pedido"

**Objetivo**: Transformar `/admin/orders/new` em experiência premium, mantendo 100% consistência com Design System v2.

**Contexto**: Usuário usa desktop e mobile (cozinha, pressa, touch). Rascunho pode ser incompleto; confirmação exige itens + data + endereço (se entrega).

---

## 1. Mapa de Estados e Regras (Atualizado)

### Estados do Formulário

```
Draft (Rascunho)
├─ Pode ter: cliente vazio, itens vazios, data vazia, endereço vazio
├─ CTA: "Salvar rascunho" (sempre habilitado, mesmo vazio)
└─ Salva como: status = "RASCUNHO"

ReadyToConfirm (Pronto para Confirmar)
├─ Requisitos: cliente OK + itens OK + data OK + endereço OK (se entrega)
├─ CTA primário: "Confirmar pedido" (único CTA quando pronto)
├─ CTA secundário: removido (não necessário quando tudo está OK)
└─ Salva como: status = "CONFIRMADO"

ConfirmedAttempt (Tentativa de Confirmação)
├─ Quando: usuário clica "Confirmar pedido"
├─ Validação: todos os campos obrigatórios (incluindo endereço se entrega)
├─ Se erro: volta para ReadyToConfirm, mostra erros
└─ Se sucesso: redireciona para detalhe do pedido
```

### Checklist - Itens que Bloqueiam Confirmação

**Sempre obrigatórios**:
1. Cliente: `customerReady` (existente selecionado OU novo com nome + telefone válido)
2. Itens: `itemsReady` (pelo menos 1 item com quantidade válida)

**Condicionais por tipo de pedido**:
3. Data: `scheduleReady`
   - Pronta entrega: sempre OK (data automática)
   - Encomenda: `scheduleDate` obrigatória

**Condicionais por método de entrega**:
4. Endereço (BLOQUEANTE se `deliveryMethod === "ENTREGA"`):
   - `addressText` obrigatório
   - `addressCity` obrigatório
   - `deliveryFee` obrigatório (pode ser 0, mas deve ser informado)

**Não bloqueiam**:
- Horário (opcional em encomenda)
- Bairro, Referência, CEP (opcionais)
- Pagamento (opcional)
- Observações (opcional)

**Lógica atualizada**:
```typescript
const addressReady =
  deliveryMethod !== "ENTREGA"
    ? true
    : Boolean(addressText.trim()) && 
      Boolean(addressCity.trim()) && 
      (deliveryFee.trim() !== "" && parseFeeValue(deliveryFee).ok);

const isReadyForConfirm = 
  customerReady && 
  itemsReady && 
  (orderType === "PRONTA_ENTREGA" || scheduleReady) &&
  addressReady;
```

### Warnings vs Erros Bloqueantes (Atualizado)

**Erros bloqueantes** (vermelho, impedem confirmação):
- Cliente não selecionado/inválido
- Nenhum item adicionado
- Quantidade inválida em item
- Data vazia (encomenda)
- **Endereço vazio (entrega)** ← CORRIGIDO
- **Cidade vazia (entrega)** ← CORRIGIDO
- **Taxa de entrega inválida (entrega)** ← CORRIGIDO

**Warnings** (amarelo, não bloqueiam):
- Horário não informado (encomenda) - permite confirmar
- Bairro não informado (entrega) - permite confirmar, mas recomendado

**Info** (azul, dica):
- "Use 0 se não houver cobrança" (taxa)
- "Informe quando souber" (horário)

---

## 2. Escopo por PR (4 PRs - Atualizado)

### PR1: Ações e Estados (Core)

**Objetivo**: Implementar lógica de rascunho vs confirmação, NextAction com próxima ação, CTA dinâmico.

**Arquivos**:
- `app/admin/orders/new/OrderForm.tsx` (lógica de estados, CTA dinâmico, cálculo `isReadyForConfirm`)
- `app/admin/orders/NextAction.client.tsx` (adicionar prop `nextAction?: { label: string, href?: string, onClick?: () => void }`)
- `app/admin/orders/NextAction.module.css` (estilos para próxima ação - hierarquia visual)
- `app/admin/orders/new/actions.ts` (parâmetro `status` opcional: "RASCUNHO" | "CONFIRMADO")

**Riscos**:
- **Risco**: Resumo financeiro pode não existir ou estar incompleto
- **Mitigação**: Renderizar resumo apenas se `subtotal`, `tax`, `total` existirem. Se não existir, mostrar placeholder: "Resumo disponível após adicionar itens"

**DoD testável**:
- [ ] CTA primário: "Salvar rascunho" (sempre habilitado, mesmo formulário vazio)
- [ ] CTA primário muda para "Confirmar pedido" quando `isReadyForConfirm === true`
- [ ] CTA secundário: "Salvar como rascunho" (outline) aparece apenas quando `isReadyForConfirm === true`
- [ ] NextAction mostra "Próxima ação" quando há pendência (estilo informativo, não CTA)
- [ ] Próxima ação é acionável (anchor que rola até seção ou onClick que foca campo)
- [ ] Resumo financeiro: renderiza se `summary` existir, senão mostra placeholder consistente
- [ ] Checklist sempre visível abaixo da próxima ação
- [ ] Rascunho vazio salva como RASCUNHO (testar: formulário vazio → salvar → verificar status)
- [ ] Confirmação salva como CONFIRMADO (testar: tudo OK → confirmar → verificar status)

**QA mínimo (8 itens)**:
1. Abrir `/admin/orders/new` → verificar CTA primário = "Salvar rascunho" (habilitado)
2. Formulário vazio → clicar "Salvar rascunho" → verificar salva como RASCUNHO
3. Preencher cliente + itens + data → verificar CTA muda para "Confirmar pedido"
4. Verificar CTA secundário "Salvar como rascunho" aparece quando pronto
5. Verificar "Próxima ação" aparece quando há pendência (estilo informativo, não destaque)
6. Clicar "Próxima ação" → verificar rola/foca seção pendente
7. Verificar resumo financeiro renderiza (ou placeholder se não houver itens)
8. **Mobile**: Verificar CTAs acessíveis, não cortados

**Scope guardrails**:
- ❌ Não inclui: validações inline, mensagens de erro detalhadas (PR3)
- ❌ Não inclui: busca dominante, empty state melhorado (PR2)
- ❌ Não inclui: resumo financeiro como requisito rígido (renderiza se existir)

---

### PR2: Busca de Itens e Validação Básica

**Objetivo**: Busca com foco automático, validação mínima de quantidade, empty state melhorado.

**Arquivos**:
- `app/admin/orders/new/OrderForm.tsx` (foco automático, validação quantidade, empty state)
- `app/admin/_styles/adminPrimitives.module.css` (classe `.searchProminent` - input 44px com padding aumentado)

**Riscos**:
- **Risco**: Foco automático pode ser intrusivo se usuário já está interagindo
- **Mitigação**: Focar apenas se `items.length === 0` E usuário não interagiu ainda (flag `hasInteracted`)

**DoD testável**:
- [ ] Input busca: 44px altura (padrão DS v2), padding `var(--space-5)` horizontal
- [ ] Foco automático ao entrar (se `items.length === 0` E `!hasInteracted`)
- [ ] Placeholder: "Digite o nome do produto... (ex.: coxinha)"
- [ ] Categoria: select menor, à direita da busca
- [ ] Empty state: "Nenhum item adicionado. Busque um produto acima para começar."
- [ ] Validação quantidade: 3 mensagens críticas (vazia, < mínimo, inválida)
- [ ] Após adicionar: quantidade recebe foco, busca limpa automaticamente

**QA mínimo (7 itens)**:
1. Abrir `/admin/orders/new` → verificar busca recebe foco (se vazio)
2. Digitar "coxinha" → verificar autocomplete aparece
3. Selecionar produto → verificar item adicionado, quantidade com foco
4. Deixar quantidade vazia → `onBlur` → verificar erro: "Informe a quantidade"
5. Preencher quantidade < mínimo → verificar erro: "Quantidade mínima: {minQty} {unit}"
6. Preencher quantidade válida → verificar erro desaparece
7. **Mobile**: Verificar input 44px altura, touch confortável

**Scope guardrails**:
- ❌ Não inclui: validações complexas (step, múltiplo) - apenas críticas
- ❌ Não inclui: tratamento de erros de busca (PR3)

---

### PR3: Entrega, Pagamento e Validações Premium

**Objetivo**: Segmented controls, campos condicionais, validação inline, mensagens de erro MVP, **endereço bloqueante**.

**Arquivos**:
- `app/admin/orders/new/OrderForm.tsx` (segmented, validação inline, scroll-to-error, lógica `addressReady` atualizada)
- `app/admin/_components/SegmentedControl.tsx` (novo componente baseado em tokens)
- `app/admin/_components/SegmentedControl.module.css` (tokens DS v2, altura 44px)
- `app/admin/orders/new/OrderForm.tsx` (ErrorMap centralizado, 12 mensagens MVP)

**Riscos**:
- **Risco**: Endereço bloqueante pode confundir usuário (pensar que é opcional)
- **Mitigação**: Checklist mostra claramente "Entrega: Endereço pendente" (vermelho) quando bloqueia
- **Risco**: SegmentedControl novo componente
- **Mitigação**: Componente simples baseado em tokens, testar isolado

**DoD testável**:
- [ ] SegmentedControl: componente reutilizável, altura 44px, tokens DS v2
- [ ] Campos condicionais: animação 200ms ease-out (altura)
- [ ] Validação inline: apenas em `onBlur` após primeiro submit (não intrusiva)
- [ ] ErrorMap centralizado: 12 mensagens críticas (ver catálogo mínimo)
- [ ] **Endereço bloqueante**: Se `deliveryMethod === "ENTREGA"`, `addressText`, `addressCity` e `deliveryFee` bloqueiam confirmação
- [ ] Lógica `isReadyForConfirm` inclui `addressReady` quando entrega
- [ ] Scroll-to-error: primeiro erro visível, foco no campo
- [ ] Pagamento: título "Pagamento (informativo)" + texto explicativo
- [ ] Sinal condicional: aparece com animação, validação se "Sim"

**QA mínimo (10 itens)**:
1. Selecionar "Entrega" → verificar campos endereço aparecem (animação)
2. Preencher endereço incompleto → `onBlur` → verificar erro: "Informe o endereço de entrega"
3. Preencher cidade vazia → verificar erro: "Informe a cidade"
4. Preencher taxa inválida → verificar erro: "Taxa deve ser um número (use 0 se não houver)"
5. **Teste bloqueante**: Selecionar "Entrega", deixar endereço vazio → verificar `isReadyForConfirm = false`
6. Preencher endereço completo → verificar `isReadyForConfirm = true` (se outros OK)
7. Selecionar "Retirada" → verificar endereço não bloqueia mais
8. Submeter com erros → verificar scroll-to-error funciona
9. **Mobile**: Verificar segmented controls 44px altura
10. **Teclado**: Setas navegam segmented (←→)

**Scope guardrails**:
- ❌ Não inclui: todas as 30+ mensagens do catálogo original (apenas 12 MVP)
- ❌ Não inclui: tratamento de erros de rede (PR4 ou futuro)

---

### PR4: Mobile, A11y e Polimento

**Objetivo**: Sticky bottom bar mobile, touch targets, acessibilidade completa.

**Arquivos**:
- `app/admin/orders/new/OrderForm.tsx` (sticky bottom mobile, foco inicial, aria-labels)
- `app/admin/orders/NextAction.module.css` (estilos mobile, sticky bottom)
- `app/admin/orders/new/OrderForm.tsx` (aria-invalid, aria-describedby, aria-live)

**Riscos**:
- **Risco**: Sticky bottom bar esconde conteúdo importante
- **Mitigação**: Altura máxima 40vh, scroll interno, testar em dispositivos reais

**DoD testável**:
- [ ] NextAction sticky bottom no mobile (<640px), altura máx 40vh
- [ ] Todos os botões: mínimo 44x44px (verificar "Remover" item)
- [ ] Foco visível: anel âmbar 3px em todos os elementos
- [ ] Aria-labels: todos os botões e controles descritivos
- [ ] Aria-invalid + aria-describedby: campos com erro
- [ ] Aria-live="polite": mensagens de erro anunciadas
- [ ] Navegação teclado: Tab, Enter, Space, Esc, setas
- [ ] Motion: 160-220ms ease-out (verificar todas as animações)
- [ ] Contraste WCAG AA: verificado (ferramenta)

**QA mínimo (8 itens)**:
1. **Mobile**: NextAction sticky bottom, sempre visível
2. **Mobile**: Altura máxima 40vh, scroll interno funciona
3. **Mobile**: Todos os botões 44x44px (medir com DevTools)
4. **A11y**: Tab navega corretamente (todos os campos)
5. **A11y**: Enter ativa CTA primário
6. **A11y**: Foco visível em todos os elementos (anel âmbar)
7. **A11y**: Leitor de tela anuncia mensagens de erro
8. **Regressão**: Rascunho vazio salva, dados mantidos após erro

**Scope guardrails**:
- ❌ Não inclui: accordion para seções (removido)
- ❌ Não inclui: tratamento de erros de rede (futuro)

---

## 3. Próxima Ação - Hierarquia Visual

### Design da Próxima Ação

**Hierarquia** (do mais importante ao menos):
1. **CTA primário** (âmbar escuro `--action-primary`, bold, maior)
2. **Próxima ação** (âmbar claro `--brand-amber-light`, texto secundário, link acionável)
3. **Checklist** (texto muted, ícones pequenos)

**Implementação**:
```css
.nextAction {
  /* CTA primário já tem destaque */
}

.nextActionLink {
  color: var(--brand-amber-light);
  font-size: var(--text-sm);
  font-weight: var(--fw-medium);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}

.nextActionLink:hover {
  color: var(--brand-amber);
}
```

**Comportamento**:
- Próxima ação aparece apenas quando há pendência
- Texto: "Adicionar itens", "Definir cliente", "Definir data", "Informar endereço"
- É acionável: anchor que rola até seção (`href="#order-items"`) ou onClick que foca campo
- Não parece CTA: cor mais clara, texto menor, underline sutil

**Exemplo visual**:
```
┌─────────────────────────────────┐
│ Resumo Financeiro               │
│ Subtotal: R$ X,XX               │
│ Total: R$ X,XX                   │
├─────────────────────────────────┤
│ → Adicionar itens                │ ← Próxima ação (âmbar claro, link)
├─────────────────────────────────┤
│ Checklist                        │
│ ✓ Cliente: João                  │
│ ✗ Itens: Nenhum item            │
│ ✓ Data: Agora                    │
├─────────────────────────────────┤
│ [Confirmar pedido] (primary)     │ ← CTA primário (âmbar escuro, bold)
│ [Salvar rascunho] (outline)      │
└─────────────────────────────────┘
```

---

## 4. Catálogo Mínimo de Validações (MVP - 12 mensagens)

### Estrutura ErrorMap

```typescript
type ErrorKey = 
  | "customer.required"
  | "customer.phone.invalid"
  | "customer.phone.exists"
  | "items.empty"
  | "items.quantity.invalid"
  | "items.quantity.min"
  | "schedule.date.required"
  | "schedule.date.past"
  | "address.required"           // BLOQUEANTE se entrega
  | "address.city.required"      // BLOQUEANTE se entrega
  | "delivery.fee.invalid"       // BLOQUEANTE se entrega
  | "deposit.amount.invalid";

const ERROR_MESSAGES: Record<ErrorKey, string> = {
  "customer.required": "Selecione ou cadastre um cliente",
  "customer.phone.invalid": "Telefone deve ter 10 ou 11 dígitos",
  "customer.phone.exists": "Telefone já cadastrado. Use cliente existente",
  "items.empty": "Adicione pelo menos 1 item",
  "items.quantity.invalid": "Quantidade inválida",
  "items.quantity.min": "Quantidade mínima: {minQty} {unit}",
  "schedule.date.required": "Informe a data de entrega",
  "schedule.date.past": "Data deve ser no futuro",
  "address.required": "Informe o endereço de entrega",
  "address.city.required": "Informe a cidade",
  "delivery.fee.invalid": "Taxa deve ser um número (use 0 se não houver)",
  "deposit.amount.invalid": "Valor do sinal deve ser maior que zero",
};
```

### Implementação

**Localização**: `app/admin/orders/new/OrderForm.tsx`

**Função centralizada**:
```typescript
function getErrorMessage(key: ErrorKey, params?: Record<string, string>): string {
  let message = ERROR_MESSAGES[key];
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      message = message.replace(`{${k}}`, v);
    });
  }
  return message;
}
```

**Uso**:
```typescript
// Exemplo: validação de endereço (bloqueante se entrega)
if (deliveryMethod === "ENTREGA") {
  if (!addressText.trim()) {
    errors.addressText = getErrorMessage("address.required");
  }
  if (!addressCity.trim()) {
    errors.addressCity = getErrorMessage("address.city.required");
  }
  const feeCheck = parseFeeValue(deliveryFee);
  if (!feeCheck.ok) {
    errors.deliveryFee = getErrorMessage("delivery.fee.invalid");
  }
}
```

---

## 5. QA Checklist Premium (25 itens)

### Desktop (8 itens)
1. [ ] CTA primário muda: "Salvar rascunho" → "Confirmar pedido" quando pronto
2. [ ] CTA secundário aparece apenas quando pronto para confirmar
3. [ ] Próxima ação aparece quando há pendência (estilo informativo, não CTA)
4. [ ] Próxima ação é acionável (rola/foca seção pendente)
5. [ ] Resumo financeiro renderiza se existir, senão placeholder consistente
6. [ ] Busca recebe foco automático se `items.length === 0`
7. [ ] Segmented controls funcionam (tipo pedido, método entrega)
8. [ ] Scroll-to-error funciona (primeiro erro visível, foco no campo)

### Mobile (<640px) (7 itens)
9. [ ] NextAction sticky bottom bar, sempre visível
10. [ ] Altura máxima 40vh, scroll interno funciona
11. [ ] Todos os botões têm mínimo 44x44px (medir com DevTools)
12. [ ] Botão "Remover" item tem 44x44px (não apenas ícone)
13. [ ] Segmented controls têm 44px altura (touch confortável)
14. [ ] Input busca: 44px altura (touch confortável)
15. [ ] Mensagens de erro legíveis, não cortam conteúdo

### Teclado/A11y (6 itens)
16. [ ] Tab navega corretamente (todos os campos)
17. [ ] Enter ativa CTA primário
18. [ ] Esc fecha autocomplete/dropdowns
19. [ ] Setas navegam autocomplete (↑↓) e segmented (←→)
20. [ ] Foco visível: anel âmbar 3px em todos os elementos
21. [ ] Leitor de tela: mensagens de erro anunciadas (`aria-live="polite"`)

### Regressão do Fluxo (4 itens)
22. [ ] Rascunho vazio salva como RASCUNHO (sem validação)
23. [ ] Rascunho completo salva como RASCUNHO (se escolher secundário)
24. [ ] **Endereço bloqueia confirmação** (entrega sem endereço → `isReadyForConfirm = false`)
25. [ ] Dados mantidos após erro (não perde rascunho)

---

## 6. Scope Guardrails (O que NÃO entra)

### Não entra neste projeto:
- ❌ Atalho Ctrl+K (removido - risco de conflito)
- ❌ Accordion mobile (removido - overengineering)
- ❌ Input 56px (removido - viola DS v2)
- ❌ Catálogo completo de 30+ mensagens (apenas 12 MVP)
- ❌ Tratamento de erros de rede (futuro, se necessário)
- ❌ Toast component (usar InlineNotice existente)
- ❌ Melhorias de performance (outro PR)
- ❌ Testes automatizados (outro PR)
- ❌ Resumo financeiro como requisito rígido (renderiza se existir)

### Pode entrar depois (futuro):
- Catálogo completo de mensagens (incrementar gradualmente)
- Tratamento de erros de rede (se necessário)
- Atalho de teclado (se não houver conflito)

---

## 7. Riscos e Mitigações (Atualizado)

### Risco 1: Endereço bloqueante confunde usuário
**Mitigação**: Checklist mostra claramente "Entrega: Endereço pendente" (vermelho) quando bloqueia. Próxima ação indica "Informar endereço".

### Risco 2: Resumo financeiro não existe
**Mitigação**: Renderizar apenas se `summary` existir. Se não existir, mostrar placeholder: "Resumo disponível após adicionar itens" (texto muted).

### Risco 3: Próxima ação compete com CTA
**Mitigação**: Hierarquia visual clara: CTA primário (âmbar escuro, bold) > Próxima ação (âmbar claro, link) > Checklist (muted).

### Risco 4: SegmentedControl novo componente
**Mitigação**: Componente simples baseado em tokens, testar em PR3 isolado.

### Risco 5: Validação inline intrusiva
**Mitigação**: Mostrar apenas após primeiro submit, não em cada `onBlur` inicial.

### Risco 6: Sticky bottom bar esconde conteúdo
**Mitigação**: Altura máxima 40vh (não 50vh), scroll interno, testar em dispositivos reais.

---

## 8. Próximos Passos

1. Revisar plano v2.1 com time (aprovado)
2. Criar issues no GitHub (1 por PR)
3. Iniciar PR1 (Ações e Estados) - não depende de resumo financeiro
4. QA após cada PR (usar checklist mínimo)
5. Deploy incremental (não tudo de uma vez)

---

## Changelog v2.0 → v2.1

### Correções Críticas
- ✅ **Endereço bloqueante**: Se `deliveryMethod === "ENTREGA"`, `addressText`, `addressCity` e `deliveryFee` bloqueiam confirmação
- ✅ **Lógica `isReadyForConfirm`**: Inclui `addressReady` quando entrega
- ✅ **PR1 flexível**: Resumo financeiro não é requisito rígido (renderiza se existir)
- ✅ **Próxima ação**: Hierarquia visual clara, não compete com CTA
- ✅ **PRs executáveis**: Cada PR tem riscos, DoD testável, QA mínimo (6-10 itens)

### Melhorias
- ✅ Mapa de estados atualizado com endereço bloqueante
- ✅ Warnings vs erros atualizados (endereço agora é bloqueante)
- ✅ QA checklist atualizado (teste de endereço bloqueante)
- ✅ Catálogo de validações mantém 12 mensagens (inclui endereço)
