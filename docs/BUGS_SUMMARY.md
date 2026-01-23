# RESUMO EXECUTIVO - BUGS E DECISÕES

## 🚨 BUGS CRÍTICOS (Decidir AGORA)

### 1. Estoque Desabilitado
**Problema:** Estoque nunca é decrementado ao entregar pedido  
**Solução Recomendada:** Ativar imediatamente (código já existe)  
**Decisão:** ✅ Ativar agora | ⏸️ Ativar depois | 🔧 Feature flag  
**Impacto:** Estoque funcionará corretamente após ativação

### 2. Validação de Estoque na Criação
**Problema:** Pode criar pedido PRONTA_ENTREGA sem estoque  
**Solução Recomendada:** Validar e avisar, permitir salvar  
**Decisão:** ✅ Validar e avisar | 🚫 Bloquear criação | 🔄 Converter automático  
**Impacto:** Usuário saberá antes de salvar se falta estoque

### 3. Conversão Automática Não Implementada
**Problema:** Não converte PRONTA_ENTREGA → ENCOMENDA automaticamente  
**Solução Recomendada:** Converter na criação se faltar estoque  
**Decisão:** ✅ Automática na criação | ⏸️ Automática na confirmação | 🔧 Manual apenas  
**Impacto:** Pedidos serão convertidos automaticamente quando necessário

---

## ⚠️ BUGS ALTA PRIORIDADE (Decidir em BREVE)

### 4. Preço Não Editável
**Problema:** Sempre usa preço do SKU, ignora priceAtTime  
**Solução Recomendada:** Usar priceAtTime quando fornecido  
**Decisão:** ✅ Implementar | ⏸️ Deixar para depois  
**Impacto:** Poderá ajustar preço por item

### 5. Travas de Edição
**Problema:** Pode editar pedido ENTREGUE/CANCELADO  
**Solução Recomendada:** Bloquear edição completamente  
**Decisão:** ✅ Bloquear | 🔧 Permitir campos não-críticos  
**Impacto:** Pedidos finalizados não poderão ser editados

### 6. Validação CONFIRMADO
**Problema:** Permite confirmar sem itens/data  
**Solução Recomendada:** Adicionar validação READY  
**Decisão:** ✅ Adicionar validação  
**Impacto:** Não permitirá confirmar pedido incompleto

---

## 📊 BUGS MÉDIA PRIORIDADE (Quando tiver tempo)

### 7. Performance Listagem
**Problema:** Busca todos pedidos para filtrar atenção  
**Solução:** Otimizar queries  
**Impacto:** Mais rápido com muitos pedidos

### 8. Paginação Pendencias
**Problema:** Busca todos pedidos sem paginar  
**Solução:** Adicionar paginação  
**Impacto:** Mais rápido e consistente

---

## ✅ MINHA RECOMENDAÇÃO

**Implementar AGORA:**
1. ✅ BUG #1 - Ativar estoque (Opção A)
2. ✅ BUG #2 - Validar estoque (Opção A)  
3. ✅ BUG #3 - Conversão automática (Opção A)
4. ✅ BUG #5 - Travar edição (Opção A)
5. ✅ BUG #6 - Validar CONFIRMADO (Opção A)

**Implementar DEPOIS:**
6. BUG #4 - Preço editável (quando tiver tempo)
7. BUG #7 e #8 - Performance (se volume crescer)

---

**Veja relatório completo em `docs/BUGS_REPORT.md` para detalhes!**
