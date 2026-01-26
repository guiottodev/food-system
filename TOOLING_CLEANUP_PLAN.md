# PR tooling-cleanup - Plano de Correção de Erros

## 📋 Objetivo

Reduzir gradualmente erros de lint/typecheck **SEM alterar comportamento de UI**.

**Regras**:
- ✅ Correções pequenas e localizadas
- ✅ Nunca refatorar telas inteiras
- ✅ Commits pequenos e explicativos
- ❌ Não alterar comportamento visual/funcional

---

## 🔍 Análise de Erros

### TypeScript Errors (12 erros)

#### 1. `app/admin/_components/Button.tsx` (1 erro)
**Erro**: `TS18046: 'children.props' is of type 'unknown'`
**Linha**: 40
**Prioridade**: 🔴 Alta (pode atrapalhar desenvolvimento)
**Correção**: Adicionar type assertion ou type guard para `children.props`

#### 2. `tests/attention.test.ts` (6 erros)
**Erro**: `TS2345: Type 'string' is not assignable to type 'OrderStatus'`
**Linhas**: 19, 30, 48, 54, 62
**Prioridade**: 🟡 Média (apenas em testes)
**Correção**: Substituir `status: string` por `status: OrderStatus` (usar valores válidos do enum)

#### 3. `tests/orderCore.test.ts` (5 erros)
**Erro**: `TS2345: Type 'string' is not assignable to type 'OrderStatus'`
**Linhas**: 26, 57, 123, 129, 135
**Prioridade**: 🟡 Média (apenas em testes)
**Correção**: Substituir `status: string` por `status: OrderStatus` (usar valores válidos do enum)

---

## 📝 Plano de Correção

### Fase 1: TypeScript Errors (Prioridade Alta)

#### Commit 1: Corrigir Button.tsx
**Arquivo**: `app/admin/_components/Button.tsx`
**Erro**: `children.props` é `unknown`
**Correção**: 
```typescript
// ANTES:
const linkProps = children.props;

// DEPOIS (opção 1 - type assertion):
const linkProps = children.props as Record<string, unknown>;

// DEPOIS (opção 2 - type guard):
if (React.isValidElement(children) && typeof children.props === 'object' && children.props !== null) {
  const linkProps = children.props as Record<string, unknown>;
  // ...
}
```
**Risco**: Baixo (apenas type assertion, não altera runtime)

#### Commit 2: Corrigir attention.test.ts
**Arquivo**: `tests/attention.test.ts`
**Erro**: `status: string` → `status: OrderStatus`
**Correção**: 
```typescript
// ANTES:
status: string

// DEPOIS:
status: "PENDENTE" as OrderStatus  // ou outro valor válido do enum
```
**Risco**: Baixo (apenas testes, não altera UI)

#### Commit 3: Corrigir orderCore.test.ts
**Arquivo**: `tests/orderCore.test.ts`
**Erro**: `status: string` → `status: OrderStatus`
**Correção**: Similar ao Commit 2
**Risco**: Baixo (apenas testes, não altera UI)

---

### Fase 2: Lint Errors (Se houver)

**Status**: Aguardar análise de lint errors após correção de TypeScript.

**Estratégia**:
1. Executar `npm run lint` ou equivalente
2. Filtrar apenas **errors** (não warnings)
3. Priorizar erros mais fáceis/seguros primeiro
4. Commits pequenos (1-3 erros por commit)

---

## 🎯 Ordem de Execução

1. ✅ **Button.tsx** (1 erro) - Prioridade alta
2. ✅ **attention.test.ts** (6 erros) - Prioridade média
3. ✅ **orderCore.test.ts** (5 erros) - Prioridade média
4. ⏳ **Lint errors** (se houver) - Após TypeScript

---

## 📊 Métricas de Sucesso

### Antes
- TypeScript errors: **12**
- Lint errors: **?** (a verificar)

### Depois (Meta)
- TypeScript errors: **0**
- Lint errors: **0** (ou reduzidos significativamente)

---

## ⚠️ Regras de Ouro

1. **Nunca alterar comportamento de UI**
   - Apenas correções de tipos
   - Apenas correções de sintaxe
   - Nunca refatorar telas inteiras

2. **Commits pequenos e explicativos**
   - 1-3 erros por commit
   - Mensagem: `fix(Button): corrigir tipo de children.props`
   - Descrição: `Erro → Correção`

3. **Testar após cada commit**
   - `npx tsc --noEmit` deve mostrar menos erros
   - `npm run lint` não deve piorar
   - UI não deve mudar visualmente

4. **Se houver dúvida, não fazer**
   - Erros complexos podem esperar
   - Melhor deixar erro conhecido do que quebrar algo

---

## 🚀 Primeira Rodada de Correções

### ✅ Correção 1: Button.tsx (APLICADA)

**Arquivo**: `app/admin/_components/Button.tsx`
**Linha**: 40
**Erro**: `TS18046: 'children.props' is of type 'unknown'`

**Correção Aplicada**:
```typescript
// ANTES:
return React.cloneElement(children as React.ReactElement<any>, {
  className: `${classes} ${children.props.className || ""}`.trim(),
  ...props,
});

// DEPOIS:
const childProps = children.props as Record<string, unknown>;
return React.cloneElement(children as React.ReactElement<any>, {
  className: `${classes} ${(childProps.className as string) || ""}`.trim(),
  ...props,
});
```

**Status**: ✅ Corrigido
**Validação**: `npx tsc --noEmit` - erro removido
**Risco**: Baixo (apenas type assertion, não altera runtime)

---

## 📝 Template de Commit

```
fix(Button): corrigir tipo de children.props

Erro: TS18046 - 'children.props' is of type 'unknown'
Correção: Adicionar type assertion para Record<string, unknown>
Risco: Baixo (apenas type, não altera runtime)
```

---

## ✅ Checklist de Validação

Após cada correção:
- [ ] `npx tsc --noEmit` mostra menos erros
- [ ] `npm run lint` não piorou
- [ ] UI não mudou visualmente
- [ ] Commit message explicativo
- [ ] Arquivo modificado documentado

---

## 📌 Notas

- **Não corrigir warnings** nesta PR (apenas errors)
- **Não refatorar** código que funciona
- **Focar em correções seguras** primeiro
- **Se houver dúvida**, deixar para depois

---

**Status**: Plano criado. Pronto para primeira rodada de correções após merge do PR B.
