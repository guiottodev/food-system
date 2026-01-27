# PR2 - Itens (Busca + UX) - Resumo de Implementação

## Arquivos Alterados

1. **app/admin/orders/new/OrderForm.tsx**
   - Adicionado autofocus inteligente na busca quando não há itens (apenas em modo novo pedido)
   - Placeholder melhorado: "Digite o nome do produto... (ex.: coxinha)"
   - Empty state melhorado: "Busque um produto acima para começar."
   - Função `addItem` atualizada: limpa busca automaticamente e foca na quantidade após adicionar
   - Validação de quantidade melhorada: 3 mensagens críticas claras
   - Categoria marcada como filtro secundário (`itemsFilterSecondary`)

2. **app/admin/_styles/adminPrimitives.module.css**
   - `.itemsFilterMain`: flex: 1 (busca dominante), padding horizontal aumentado (var(--space-5))
   - `.itemsFilterSecondary`: min-width 160px, flex: 0 0 auto (categoria menor)
   - Layout já estava usando grid (2fr 1fr), mantido

## Principais Mudanças

### Autofocus Inteligente
```typescript
// Autofocus na busca se não houver itens e não estiver editando
useEffect(() => {
  if (isEdit) return;
  if (items.length > 0) return;
  if (skuInputRef.current && document.activeElement !== skuInputRef.current) {
    const timeout = setTimeout(() => {
      skuInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timeout);
  }
}, [isEdit, items.length]);
```

### Função addItem Melhorada
- Limpa busca automaticamente (`setSkuQuery("")`)
- Foca na quantidade do item recém-adicionado após renderização
- Seleciona o texto da quantidade para facilitar edição

### Validação de Quantidade (3 Mensagens Críticas)
1. **Quantidade vazia**: "Informe a quantidade"
2. **Quantidade inválida**: "Quantidade inválida"
3. **Quantidade menor que mínimo**: "Quantidade mínima: {minQty} {unitLabel}"

### Placeholder e Empty State
- Placeholder: "Digite o nome do produto... (ex.: coxinha)"
- Empty state: "Nenhum item adicionado." + "Busque um produto acima para começar."

## DoD Checklist

- [x] Busca com altura 44px (já estava no `.control`)
- [x] Padding horizontal maior na busca (var(--space-5))
- [x] Autofocus inteligente quando não há itens (apenas novo pedido)
- [x] Placeholder melhorado com exemplo
- [x] Categoria como filtro secundário menor
- [x] Empty state com copy orientando ação
- [x] Após adicionar: busca limpa e foco vai para quantidade
- [x] Validação mínima: 3 mensagens críticas claras

## QA Mínimo (7 itens)

1. [ ] Abrir `/admin/orders/new` → verificar busca recebe foco (se vazio)
2. [ ] Digitar "coxinha" → verificar autocomplete aparece
3. [ ] Selecionar produto → verificar item adicionado, quantidade com foco
4. [ ] Deixar quantidade vazia → `onBlur` → verificar erro: "Informe a quantidade"
5. [ ] Preencher quantidade < mínimo → verificar erro: "Quantidade mínima: {minQty} {unit}"
6. [ ] Preencher quantidade válida → verificar erro desaparece
7. [ ] **Mobile**: Verificar input 44px altura, touch confortável

## Riscos e Mitigações

### Risco 1: Autofocus pode ser intrusivo
**Mitigação**: Apenas quando não há itens e não está editando, com delay de 100ms

### Risco 2: Foco na quantidade pode não funcionar
**Mitigação**: Usa setTimeout para garantir renderização, já existe useEffect similar que funciona

### Risco 3: Validação pode ser muito restritiva
**Mitigação**: Apenas 3 mensagens críticas, validação inline apenas após primeiro submit (PR3)

## Próximos Passos

- Executar QA mínimo
- Testar em mobile (<640px)
- Verificar regressões do fluxo atual
