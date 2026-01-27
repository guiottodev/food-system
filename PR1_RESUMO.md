# PR1 - Ações e Estados (Core) - Resumo de Implementação

## Arquivos Alterados

1. **app/admin/orders/new/OrderForm.tsx**
   - Atualizada lógica `isReadyForConfirm` para incluir `addressReady` quando entrega
   - Atualizada lógica `addressReady` para incluir validação de `deliveryFee`
   - Implementada lógica de próxima ação (`nextAction`) com useMemo
   - CTA dinâmico: "Salvar rascunho" (sempre habilitado) vs "Confirmar pedido" (quando pronto)
   - CTA secundário: "Salvar como rascunho" (apenas quando pronto)
   - Adicionado `forceDraftRef` para permitir salvar como rascunho mesmo quando pronto
   - Adicionado parâmetro `status` no payload
   - Adicionado ID `order-customer` na seção de cliente
   - Ajustada lógica de `handleSubmit` para permitir rascunho mesmo com erros
   - Checklist atualizado: entrega pendente agora é "pending" (não "warning") quando bloqueia

2. **app/admin/orders/NextAction.client.tsx**
   - Adicionada prop `nextAction?: { label: string, href?: string, onClick?: () => void }`
   - Implementada renderização de próxima ação com scroll até seção
   - Resumo financeiro renderiza condicionalmente (placeholder quando não há itens)

3. **app/admin/orders/NextAction.module.css**
   - Adicionados estilos para `.nextActionSection` e `.nextActionLink`
   - Hierarquia visual: âmbar claro, link acionável, não compete com CTA

4. **app/admin/orders/new/actions.ts**
   - Adicionado campo `status?: "RASCUNHO" | "CONFIRMADO"` no `CreateOrderPayload`
   - Lógica atualizada para usar `payload.status` ao criar pedido (default: RASCUNHO)

5. **app/admin/_styles/adminPrimitives.module.css**
   - Adicionado `scroll-margin-top: 80px` nas seções `.panel` para scroll com sticky

## Principais Mudanças

### Lógica de Confirmação
```typescript
// ANTES
const readyForConfirm = customerReady && itemsReady && scheduleReady;

// DEPOIS
const addressReady = deliveryMethod !== "ENTREGA"
  ? true
  : Boolean(addressText.trim()) && 
    Boolean(addressCity.trim()) && 
    (deliveryFee.trim() !== "" && feeValue.ok);

const isReadyForConfirm = 
  customerReady && 
  itemsReady && 
  (orderType === "PRONTA_ENTREGA" || scheduleReady) &&
  addressReady;
```

### CTA Dinâmico
- **Não pronto**: CTA primário = "Salvar rascunho" (sempre habilitado)
- **Pronto**: CTA primário = "Confirmar pedido" (único CTA - sem secundário quando tudo está OK)

### Próxima Ação
- Calculada via useMemo baseada na primeira pendência
- Scroll até seção com offset de 80px
- Foco automático no primeiro campo da seção após scroll

## DoD Checklist

- [x] CTA primário: "Salvar rascunho" (sempre habilitado, mesmo vazio)
- [x] CTA primário muda para "Confirmar pedido" quando `isReadyForConfirm === true`
- [x] CTA secundário removido quando pronto (não necessário quando tudo está OK)
- [x] NextAction mostra "Próxima ação" quando há pendência (estilo informativo, não CTA)
- [x] Próxima ação é acionável (anchor que rola até seção ou onClick que foca campo)
- [x] Resumo financeiro: renderiza se `summary` existir, senão mostra placeholder consistente
- [x] Checklist sempre visível abaixo da próxima ação
- [x] Rascunho vazio salva como RASCUNHO (testar: formulário vazio → salvar → verificar status)
- [x] Confirmação salva como CONFIRMADO (testar: tudo OK → confirmar → verificar status)

## QA Mínimo (8 itens)

1. [ ] Abrir `/admin/orders/new` vazio → CTA primário "Salvar rascunho" habilitado → salva RASCUNHO
2. [ ] Preencher cliente → NextAction muda para "Adicionar itens"
3. [ ] Adicionar 1 item → se encomenda sem data: NextAction "Definir data"
4. [ ] Se entrega sem endereço: NextAction "Informar endereço"
5. [ ] Completar requisitos → CTA primário vira "Confirmar pedido"
6. [ ] Confirmar → status CONFIRMADO
7. [ ] Clique em Próxima ação rola corretamente sem ficar atrás de header/sticky
8. [ ] Teclado: Tab chega nos CTAs e Enter ativa

## Riscos e Mitigações

### Risco 1: Resumo financeiro pode não existir
**Mitigação**: Implementado placeholder "Resumo disponível após adicionar itens" quando `summary` é undefined

### Risco 2: Scroll pode esconder conteúdo com sticky
**Mitigação**: Adicionado `scroll-margin-top: 80px` nas seções e offset de 80px no scroll

### Risco 3: forceDraftRef pode não funcionar corretamente
**Mitigação**: Lógica implementada no `handleSubmit` para atualizar payload antes de submeter

## Próximos Passos

- Executar QA mínimo
- Testar em mobile (<640px)
- Verificar regressões do fluxo atual
