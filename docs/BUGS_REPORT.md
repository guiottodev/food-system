# RELATÓRIO DE BUGS E SOLUÇÕES PROPOSTAS

**Data:** 2026-01-XX  
**Sistema:** Sistema de Pedidos e Produção  
**Versão analisada:** MVP atual

---

## ÍNDICE

1. [Bugs Críticos](#bugs-críticos)
2. [Bugs de Alta Prioridade](#bugs-de-alta-prioridade)
3. [Bugs de Média Prioridade](#bugs-de-média-prioridade)
4. [Melhorias Recomendadas](#melhorias-recomendadas)

---

## BUGS CRÍTICOS

### BUG #1: Estoque Desabilitado (STOCK_ENABLED = false)

#### O que é o bug:
O sistema tem todo o código necessário para decrementar estoque quando um pedido é marcado como "ENTREGUE", mas está desabilitado por uma flag `STOCK_ENABLED = false` hardcoded no código.

**Localização:** `lib/domain/transitionOrderStatus.ts:29`

**Código atual:**
```typescript
const STOCK_ENABLED = false; // ❌ Hardcoded como false
```

#### Decisão necessária:
**Opção A (Recomendada):** Ativar estoque imediatamente
- Remover a flag `STOCK_ENABLED` ou mudá-la para `true`
- O código já está implementado e testado
- Risco: Baixo (código já existe e tem teste)

**Opção B:** Ativar com feature flag via variável de ambiente
- Criar `ENABLE_STOCK=true` no `.env.local`
- Permitir ativar/desativar sem mudar código
- Risco: Muito baixo (mais controle)

**Opção C:** Manter desabilitado e implementar sistema completo de estoque
- Implementar `InventoryMovement` completo primeiro
- Depois ativar decremento
- Risco: Médio (mais trabalho, mas mais completo)

#### Impacto no sistema:

**ANTES (atual):**
- ❌ Estoque nunca é decrementado
- ❌ `stockDecrementedAt` nunca é preenchido
- ❌ `sku.stockQuantity` nunca muda
- ❌ Violação da regra de negócio (SPEC linha 63)
- ❌ Teste `stockIdempotency.test.ts` pode estar passando incorretamente

**DEPOIS (Opção A - Recomendada):**
- ✅ Ao marcar pedido como "ENTREGUE", estoque é decrementado automaticamente
- ✅ `stockDecrementedAt` é preenchido com timestamp
- ✅ `sku.stockQuantity` é decrementado por item do pedido
- ✅ Idempotência garantida (não decrementa duas vezes)
- ✅ Audit log registra a operação
- ✅ Conforme SPEC: "Baixa de estoque ocorre somente ao mudar o status do pedido para 'Entregue'"

**Como funciona após correção:**
1. Usuário marca pedido como "ENTREGUE"
2. Sistema verifica se `stockDecrementedAt` é `null` (não foi decrementado antes)
3. Se for `null`, atualiza pedido com `stockDecrementedAt = now()`
4. Para cada item do pedido:
   - Decrementa `sku.stockQuantity` pela quantidade do item
5. Registra no audit log
6. Se tentar marcar como ENTREGUE novamente, não decrementa (idempotência)

**Impacto em dados existentes:**
- ⚠️ Pedidos já marcados como ENTREGUE não terão estoque decrementado retroativamente
- 💡 **Decisão adicional:** Quer que eu crie um script para processar pedidos antigos?

---

### BUG #2: Falta Validação de Estoque na Criação de Pedido PRONTA_ENTREGA

#### O que é o bug:
Ao criar um pedido do tipo "PRONTA_ENTREGA", o sistema não verifica se há estoque suficiente antes de salvar. Isso permite criar pedidos que não podem ser atendidos.

**Localização:** `app/admin/orders/new/actions.ts`

#### Decisão necessária:
**Opção A (Recomendada):** Validar estoque e avisar, mas permitir salvar
- Verificar estoque antes de salvar
- Se faltar estoque, mostrar aviso claro
- Permitir salvar mesmo assim (usuário decide)
- Marcar pedido com flag de "sem estoque"
- Risco: Baixo

**Opção B:** Validar estoque e bloquear criação
- Não permitir criar pedido PRONTA_ENTREGA sem estoque
- Forçar conversão para ENCOMENDA ou adicionar estoque
- Risco: Médio (pode atrapalhar operação se estoque estiver desatualizado)

**Opção C:** Converter automaticamente para ENCOMENDA
- Se faltar estoque, converter automaticamente
- Registrar no audit log
- Mostrar aviso ao usuário
- Risco: Baixo (conforme RULES.md linha 24)

#### Impacto no sistema:

**ANTES (atual):**
- ❌ Pode criar pedido PRONTA_ENTREGA sem estoque
- ❌ Usuário só descobre problema depois
- ❌ Não há aviso preventivo

**DEPOIS (Opção A - Recomendada):**
- ✅ Ao criar pedido PRONTA_ENTREGA, verifica estoque de cada item
- ✅ Se faltar estoque, mostra aviso: "⚠️ Alguns itens não têm estoque suficiente"
- ✅ Lista quais itens estão faltando
- ✅ Permite salvar mesmo assim (usuário decide)
- ✅ Pedido aparece com badge "Sem estoque" na listagem
- ✅ Sistema calcula disponibilidade corretamente

**Como funciona após correção:**
1. Usuário adiciona itens ao pedido PRONTA_ENTREGA
2. Ao clicar "Salvar", sistema verifica estoque de cada SKU
3. Se algum item faltar estoque:
   - Mostra modal/aviso listando itens faltantes
   - Exibe: "Item X: pedido 10, disponível 5, falta 5"
   - Botões: "Salvar mesmo assim" ou "Revisar itens"
4. Se salvar, pedido é criado normalmente
5. Na listagem, aparece badge de atenção

**DEPOIS (Opção C - Automática):**
1. Usuário tenta criar pedido PRONTA_ENTREGA
2. Sistema verifica estoque
3. Se faltar, converte automaticamente para ENCOMENDA
4. Mostra aviso: "Pedido convertido para ENCOMENDA por falta de estoque"
5. Registra no audit log

---

### BUG #3: Conversão Automática PRONTA_ENTREGA → ENCOMENDA Não Implementada

#### O que é o bug:
A regra de negócio (RULES.md linha 24) diz que se faltar estoque, o pedido deve ser convertido automaticamente para ENCOMENDA, mas isso não está implementado.

**Localização:** `app/admin/orders/new/actions.ts` e `app/admin/orders/[id]/edit/actions.ts`

#### Decisão necessária:
**Opção A (Recomendada):** Implementar conversão automática na criação
- Ao criar pedido PRONTA_ENTREGA, verificar estoque
- Se faltar, converter para ENCOMENDA automaticamente
- Mostrar aviso ao usuário
- Registrar no audit log
- Risco: Baixo

**Opção B:** Implementar conversão automática na confirmação
- Permitir criar como PRONTA_ENTREGA
- Ao confirmar, verificar estoque
- Se faltar, converter para ENCOMENDA
- Risco: Médio (muda workflow)

**Opção C:** Não implementar automática, apenas manual
- Manter botão "Converter para encomenda" no detalhe
- Usuário converte manualmente quando necessário
- Risco: Muito baixo (já existe)

#### Impacto no sistema:

**ANTES (atual):**
- ❌ Não há conversão automática
- ❌ Usuário precisa converter manualmente
- ❌ Pode esquecer de converter

**DEPOIS (Opção A - Recomendada):**
- ✅ Ao criar pedido PRONTA_ENTREGA sem estoque, converte automaticamente
- ✅ Mostra aviso: "⚠️ Pedido convertido para ENCOMENDA por falta de estoque"
- ✅ Registra no audit log: "order_type: PRONTA_ENTREGA → ENCOMENDA (motivo: falta estoque)"
- ✅ Pedido é salvo como ENCOMENDA
- ✅ Usuário pode ver no histórico que foi convertido

**Como funciona após correção:**
1. Usuário cria pedido PRONTA_ENTREGA
2. Sistema verifica estoque de cada item
3. Se qualquer item faltar estoque:
   - Converte `orderType` para ENCOMENDA
   - Salva pedido como ENCOMENDA
   - Mostra aviso na tela
   - Registra no audit log
4. Pedido aparece como ENCOMENDA na listagem

---

## BUGS DE ALTA PRIORIDADE

### BUG #4: Preço Não Editável por Item (ROADMAP T3 Não Implementado)

#### O que é o bug:
O sistema sempre usa `sku.priceCurrent` ao criar/editar pedidos, ignorando o campo `priceAtTime` que vem do formulário. O ROADMAP T3 prevê preço editável por item.

**Localização:** 
- `app/admin/orders/new/actions.ts:219`
- `app/admin/orders/[id]/edit/actions.ts:223`

**Código atual:**
```typescript
const unitPrice = Number(item.sku.priceCurrent); // ❌ Ignora priceAtTime do payload
```

#### Decisão necessária:
**Opção A (Recomendada):** Usar priceAtTime do payload quando fornecido
- Se `item.priceAtTime` vier no payload, usar esse valor
- Se não vier, usar `sku.priceCurrent` como fallback
- Sempre salvar em `snapshotUnitPrice` (já existe no schema)
- Risco: Baixo

**Opção B:** Sempre usar priceAtTime, obrigatório no formulário
- Frontend sempre envia priceAtTime
- Backend sempre usa priceAtTime
- Se não vier, erro de validação
- Risco: Médio (pode quebrar formulários existentes)

**Opção C:** Não implementar agora (deixar para depois)
- Manter comportamento atual
- Implementar T3 do ROADMAP em momento separado
- Risco: Muito baixo (não muda nada)

#### Impacto no sistema:

**ANTES (atual):**
- ❌ Preço sempre vem do SKU atual
- ❌ Não permite ajuste de preço por pedido
- ❌ Se preço do SKU mudar, pedidos antigos mostram preço errado (não, snapshot existe)
- ⚠️ Na verdade, snapshot existe mas não é usado corretamente

**DEPOIS (Opção A - Recomendada):**
- ✅ Permite ajustar preço por item no formulário
- ✅ Preço ajustado é salvo em `snapshotUnitPrice`
- ✅ Histórico de preços é preservado
- ✅ Se não ajustar, usa preço atual do SKU
- ✅ Compatível com pedidos antigos

**Como funciona após correção:**
1. No formulário de pedido, cada item tem campo "Preço unitário" (editável)
2. Por padrão, preenche com `sku.priceCurrent`
3. Usuário pode editar o preço
4. Ao salvar, usa o preço editado (se fornecido) ou o preço do SKU
5. Salva em `orderItem.snapshotUnitPrice`
6. Total do pedido é recalculado com preços ajustados
7. Histórico preserva o preço usado naquele momento

**Mudanças necessárias:**
- Frontend: Tornar campo de preço editável (já existe, só precisa funcionar)
- Backend: Usar `item.priceAtTime` do payload ao invés de `sku.priceCurrent`

---

### BUG #5: Travas de Edição em ENTREGUE/CANCELADO Não Implementadas (ROADMAP T4)

#### O que é o bug:
Pedidos com status ENTREGUE ou CANCELADO ainda podem ser editados. A SPEC diz que "Entregue" é estado final e imutável.

**Localização:** `app/admin/orders/[id]/edit/page.tsx`

#### Decisão necessária:
**Opção A (Recomendada):** Bloquear edição completamente
- Desabilitar botão "Editar pedido" para ENTREGUE/CANCELADO
- Mostrar mensagem: "Pedido finalizado, não pode ser editado"
- Risco: Muito baixo

**Opção B:** Permitir edição apenas de campos não-críticos
- Bloquear edição de itens, valores, data
- Permitir edição de observações, endereço (para histórico)
- Risco: Médio (mais complexo)

**Opção C:** Permitir edição mas exigir reconfirmação
- Permitir editar mas marcar como "alterado após entrega"
- Exigir motivo e confirmação
- Risco: Alto (pode causar confusão)

#### Impacto no sistema:

**ANTES (atual):**
- ❌ Pode editar pedido ENTREGUE
- ❌ Pode editar pedido CANCELADO
- ❌ Pode alterar valores de pedidos já entregues
- ❌ Violação da regra de negócio

**DEPOIS (Opção A - Recomendada):**
- ✅ Botão "Editar pedido" desabilitado para ENTREGUE/CANCELADO
- ✅ Mensagem clara: "Este pedido foi finalizado e não pode ser editado"
- ✅ Link para edição não aparece ou aparece desabilitado
- ✅ Se tentar acessar URL diretamente, mostra erro
- ✅ Conforme SPEC: "Entregue é estado final e imutável"

**Como funciona após correção:**
1. Usuário acessa detalhe de pedido ENTREGUE
2. Botão "Editar pedido" não aparece ou aparece desabilitado
3. Se tentar acessar `/admin/orders/[id]/edit` diretamente:
   - Verifica status do pedido
   - Se ENTREGUE ou CANCELADO, redireciona para detalhe com mensagem
4. Apenas pedidos em status ativo podem ser editados

---

### BUG #6: Validação de Transição Permite CONFIRMADO sem READY

#### O que é o bug:
A função `validateOrderTransition` valida `not_ready` apenas para `EM_PRODUCAO`, mas `CONFIRMADO` também deveria exigir READY (itens + data).

**Localização:** `lib/domain/order.ts:113-115`

**Código atual:**
```typescript
if (nextStatus === "EM_PRODUCAO" && !pending.ready) {
  return { ok: false, error: "not_ready" };
}
// ❌ Falta validação para CONFIRMADO
```

#### Decisão necessária:
**Opção A (Recomendada):** Adicionar validação para CONFIRMADO
- Validar READY também para CONFIRMADO
- Manter validação existente em `confirmOrderAction` como backup
- Risco: Muito baixo

**Opção B:** Remover validação de `confirmOrderAction` e confiar apenas em `validateOrderTransition`
- Centralizar validação em um lugar
- Risco: Médio (pode quebrar se houver edge cases)

#### Impacto no sistema:

**ANTES (atual):**
- ⚠️ `validateOrderTransition` permite CONFIRMADO sem READY
- ✅ `confirmOrderAction` valida READY (tem validação duplicada)
- ⚠️ Inconsistência entre validações

**DEPOIS (Opção A - Recomendada):**
- ✅ `validateOrderTransition` valida READY para CONFIRMADO
- ✅ `confirmOrderAction` continua validando (defesa em profundidade)
- ✅ Consistência entre validações
- ✅ Não permite confirmar pedido incompleto

**Como funciona após correção:**
1. Ao tentar confirmar pedido sem itens ou sem data
2. `validateOrderTransition` retorna erro "not_ready"
3. Sistema bloqueia a transição
4. Mostra mensagem: "Pedido incompleto. Adicione itens e defina data de entrega."

---

## BUGS DE MÉDIA PRIORIDADE

### BUG #7: Performance na Listagem de Pedidos com Filtro de Atenção

#### O que é o bug:
Quando filtra pedidos por "atenção" (pendencias), o sistema busca TODOS os pedidos e depois filtra em memória, causando problemas de performance.

**Localização:** `app/admin/orders/page.tsx:393-420`

#### Decisão necessária:
**Opção A (Recomendada):** Otimizar query para filtrar no banco
- Criar índices apropriados
- Filtrar por status no WHERE (já faz)
- Calcular atenção apenas para pedidos retornados
- Risco: Baixo

**Opção B:** Limitar busca inicial
- Buscar apenas últimos N pedidos
- Depois filtrar em memória
- Risco: Médio (pode perder pedidos antigos com pendências)

**Opção C:** Manter como está (se volume for baixo)
- Se tiver poucos pedidos (< 1000), performance é aceitável
- Risco: Muito baixo (não muda nada)

#### Impacto no sistema:

**ANTES (atual):**
- ❌ Busca todos os pedidos do banco
- ❌ Calcula atenção para todos
- ❌ Filtra em memória
- ⚠️ Lento com muitos pedidos (> 500)

**DEPOIS (Opção A - Recomendada):**
- ✅ Filtra por status no WHERE (já faz)
- ✅ Calcula atenção apenas para pedidos da página atual
- ✅ Performance melhor mesmo com muitos pedidos
- ✅ Paginação funciona corretamente

---

### BUG #8: Falta Paginação na Tela de Pendencias

#### O que é o bug:
A tela de pendencias busca todos os pedidos sem paginação, pode ficar lenta.

**Localização:** `app/admin/pendencias/page.tsx:78`

#### Decisão necessária:
**Opção A (Recomendada):** Adicionar paginação
- Implementar paginação similar à tela de pedidos
- Manter filtros funcionando
- Risco: Baixo

**Opção B:** Limitar a N pendencias mais recentes
- Mostrar apenas últimas 50 pendencias
- Risco: Muito baixo

#### Impacto no sistema:

**ANTES (atual):**
- ❌ Busca todos os pedidos
- ❌ Pode ficar lento com muitos pedidos

**DEPOIS (Opção A - Recomendada):**
- ✅ Paginação de 15/30/50 itens por página
- ✅ Performance melhor
- ✅ UX consistente com outras telas

---

## MELHORIAS RECOMENDADAS

### BUG #9: Mensagens de Erro Genéricas

#### O que é o bug:
Mensagens de erro usam códigos genéricos (`?error=sku-invalido`) sem texto claro para o usuário.

#### Decisão necessária:
**Opção A (Recomendada):** Criar componente de mensagens de erro
- Mapear códigos para mensagens claras
- Mostrar mensagens amigáveis
- Risco: Baixo

#### Impacto:
- ✅ Usuário entende o que deu errado
- ✅ Melhor UX

---

### BUG #10: Falta Validação Client-Side

#### O que é o bug:
Algumas validações só acontecem no servidor, usuário só descobre erro após submit.

#### Decisão necessária:
**Opção A (Recomendada):** Adicionar validações client-side
- Validar quantidade, preço, etc. antes de enviar
- Mostrar erros em tempo real
- Risco: Baixo

#### Impacto:
- ✅ Melhor UX
- ✅ Menos requisições ao servidor

---

## RESUMO DE DECISÕES NECESSÁRIAS

### Críticos (Decidir AGORA):

1. **BUG #1 - Estoque:** 
   - ✅ **Recomendado: Opção A** (Ativar imediatamente)
   - ⚠️ Decisão adicional: Processar pedidos antigos?

2. **BUG #2 - Validação de Estoque:**
   - ✅ **Recomendado: Opção A** (Validar e avisar)
   - Ou Opção C (Converter automático)

3. **BUG #3 - Conversão Automática:**
   - ✅ **Recomendado: Opção A** (Implementar na criação)
   - Ou Opção C (Manter manual)

### Alta Prioridade (Decidir em BREVE):

4. **BUG #4 - Preço Editável:**
   - ✅ **Recomendado: Opção A** (Usar priceAtTime quando fornecido)
   - Ou Opção C (Deixar para depois)

5. **BUG #5 - Travas de Edição:**
   - ✅ **Recomendado: Opção A** (Bloquear completamente)

6. **BUG #6 - Validação CONFIRMADO:**
   - ✅ **Recomendado: Opção A** (Adicionar validação)

### Média Prioridade (Decidir quando tiver tempo):

7. **BUG #7 - Performance:**
   - ✅ **Recomendado: Opção A** (Otimizar queries)
   - Ou Opção C (Manter se volume for baixo)

8. **BUG #8 - Paginação:**
   - ✅ **Recomendado: Opção A** (Adicionar paginação)

---

## PRÓXIMOS PASSOS

Após você decidir sobre cada bug, eu posso:

1. ✅ Implementar as correções conforme suas decisões
2. ✅ Criar testes para validar as correções
3. ✅ Atualizar documentação
4. ✅ Fazer build e verificar se tudo compila

**Aguardando suas decisões para prosseguir!** 🚀
