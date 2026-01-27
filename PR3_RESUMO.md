# PR3 - Entrega, Pagamento e Validações Premium - Resumo de Implementação

## Arquivos Alterados

1. **app/admin/orders/new/OrderForm.tsx**
   - ErrorMap centralizado com 12 mensagens MVP
   - Função `getErrorMessage` para mensagens centralizadas
   - Validação inline não intrusiva: `onBlur` após primeiro submit
   - Estado `fieldTouched` para controlar quando mostrar erros inline
   - Scroll-to-error melhorado com offset para não esconder com sticky
   - Navegação por teclado nos segmented controls (setas ←→)
   - Campos condicionais com classe `conditionalField` para animação
   - Pagamento: título atualizado para "Pagamento (informativo)" + texto explicativo
   - Sinal condicional com animação

2. **app/admin/_styles/adminPrimitives.module.css**
   - `.segmentedOption`: altura mínima 44px, transições suaves, hover melhorado
   - `.segmentedActive`: borda âmbar, sombra sutil
   - `.conditionalField`: animação slideDown (200ms ease-out)

## Principais Mudanças

### ErrorMap Centralizado (12 Mensagens MVP)
```typescript
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

### Validação Inline Não Intrusiva
- Erros aparecem apenas após primeiro submit (`submitAttempted`)
- Depois disso, `onBlur` marca campo como tocado e mostra erro
- `aria-live="polite"` para anunciar erros via leitor de tela
- `role="alert"` nos elementos de erro

### Segmented Controls Melhorados
- Altura mínima 44px (touch target)
- Transições suaves (160-220ms ease-out)
- Hover melhorado
- Estado ativo com borda âmbar e sombra
- Navegação por teclado: setas ←→

### Campos Condicionais com Animação
- Classe `conditionalField` aplicada
- Animação `slideDown` (200ms ease-out)
- Altura e opacidade animadas

### Scroll-to-Error Melhorado
- Offset de 80px para não esconder com sticky header
- Foco automático no campo após scroll
- Tratamento especial para erros de itens (scroll até seção)

## DoD Checklist

- [x] SegmentedControl: altura 44px, tokens DS v2, transições suaves
- [x] Campos condicionais: animação 200ms ease-out (altura/opacidade)
- [x] Validação inline: apenas em `onBlur` após primeiro submit (não intrusiva)
- [x] ErrorMap centralizado: 12 mensagens críticas
- [x] Endereço bloqueante: `addressText`, `addressCity` e `deliveryFee` bloqueiam confirmação quando entrega
- [x] Lógica `isReadyForConfirm` inclui `addressReady` quando entrega (já implementado no PR1)
- [x] Scroll-to-error: primeiro erro visível, foco no campo, offset para sticky
- [x] Pagamento: título "Pagamento (informativo)" + texto explicativo
- [x] Sinal condicional: aparece com animação, validação se "Sim"

## QA Mínimo (10 itens)

1. [ ] Selecionar "Entrega" → verificar campos endereço aparecem (animação)
2. [ ] Preencher endereço incompleto → `onBlur` → verificar erro: "Informe o endereço de entrega"
3. [ ] Preencher cidade vazia → verificar erro: "Informe a cidade"
4. [ ] Preencher taxa inválida → verificar erro: "Taxa deve ser um número (use 0 se não houver)"
5. [ ] **Teste bloqueante**: Selecionar "Entrega", deixar endereço vazio → verificar `isReadyForConfirm = false`
6. [ ] Preencher endereço completo → verificar `isReadyForConfirm = true` (se outros OK)
7. [ ] Selecionar "Retirada" → verificar endereço não bloqueia mais
8. [ ] Submeter com erros → verificar scroll-to-error funciona
9. [ ] **Mobile**: Verificar segmented controls 44px altura
10. [ ] **Teclado**: Setas navegam segmented (←→)

## Riscos e Mitigações

### Risco 1: Validação inline pode ser intrusiva
**Mitigação**: Apenas após primeiro submit, depois apenas em `onBlur`

### Risco 2: Animação pode causar layout shift
**Mitigação**: Usa `max-height` com valor alto, transição suave

### Risco 3: Scroll-to-error pode não funcionar em mobile
**Mitigação**: Offset de 80px, testar em dispositivos reais

## Próximos Passos

- Executar QA mínimo
- Testar em mobile (<640px)
- Verificar regressões do fluxo atual
