# AGENTS_GUIDE  Food System (Admin)

Este documento é o manual de alinhamento para qualquer conversa nova (PODesignEngCodex) entender o produto e trabalhar sem reinventar decisões.

---

## Product snapshot
**Food System** é um sistema interno (admindesktop) para **registrar pedidos**, **operar a produção do dia**, **imprimir ticketslistas** (preferência: impressão térmica) e **manter controle mínimo de estoque**.  
O foco é **velocidade operacional** e **prevenção de erro**, não features bonitas.

**Usuários primários:** operador(a) interno(a) que registra pedidos e conduz produçãoexpedição.

---

## Resultado de sucesso (30 dias)
O sistema é considerado operacional quando:
- Dá para **criar pedidos** diariamente sem suporte.
- A **Produção do Dia** organiza o trabalho (fila por statusprioridade).
- A **impressão** funciona (ticketordem) e é usada no fluxo real.
- **Erros de quantidade** caem para ~zero (validação consistente client+server).
- `npm run build` passa e existe um checklist de QA executável.

---

## MVP (o que tem que existir pra usar todo dia)
1) **Criar pedido** com itens (SKU) e quantidades válidas.
2) **Persistir e listar pedidos do dia** (Produção do Dia).
3) **Status do pedido** (mínimo): Novo  Em Produção  Pronto  Entregue + Cancelado.
4) **Imprimir** pedidolista (térmica preferencial; A4 aceitável como fallback).
5) **Editarcorrigir** pedido (mínimo: itensqtystatus) com segurança.
6) **Busca e filtro** por statustexto na produção.

Fora do MVP (por enquanto): loginpermissões, integrações externas, relatórios avançados, estoque completo.

---

## Regras globais (não negociáveis)
### Quantidade por unidade (crítico)
- **UNIDADE:** quantidade **deve ser inteira**.
- **KG:** quantidade **deve ser múltiplo de 0,05** (50g), **sem arredondar**.
- **Validação obrigatória no client e no server** (não pode burlar via request).
- Evitar ponto flutuante: preferir **aritmética inteira** (ex.: `q100 = qty * 100` e validação por módulo).

### UX operacional
- Menos cliques > estética.
- Erros devem ser **claros, inline** e bloquear ações inválidas.
- Sempre prever estados de tela: **loading  empty  error  disabled**.
- Teclado-friendly (tab order coerente, enter para confirmar quando seguro).

### Qualidade  entrega
- Build obrigatório no fim de cada entrega: `npm run build`.
- Mudança só é done com **Change Report** + **QA checklist** (Gate 2).

---

## Fonte da verdade (importante)
- **A fonte da verdade do negócio são os dados e regras de domínio**, normalmente:
  - modelospersistência (PrismaDB) e regras de validação (ex.: `libquantity.ts`).
- **Rotastelas (ex.: `products`) NÃO são fonte da verdade.** Elas são apenas uma visualizaçãoentrada.
- **Docs (`docsSPEC.md` e `docsUI.md`) são o contrato do produto** e devem refletir o comportamento esperado.

Se surgir dúvida (onde vive a regra X), a resposta correta é:
- regra de negócio  camada de validaçãodomínio + server
- UI só reflete e previne erro

---

## Domínio e glossário
- **Categoria  Produto  SKU:** estrutura do catálogo.
- **Pedido:** registro operacional (clientecontato opcional, observações, status, itens).
- **Item do pedido:** referência ao SKU + qty + unidade.
- **Produção do Dia:** visão operacional dos pedidos do dia e seus status.
- **TicketImpressão:** representação impressa para produçãoexpedição.
- **UnitType:** UNIDADE ou KG.
- **Passo de KG:** 0,05 (padrão atual)  se mudar, registrar em DECISIONS.

---

## Estrutura técnica (pistas do repo)
- Frontadmin em nextTS (pelo padrão de paths).
- Arquivos relevantes já conhecidos:
  - `appadminordersnewOrderForm.tsx`
  - `appadminordersnewactions.ts`
  - `libquantity.ts`
  - `scriptstest-quantity.js`
  - `docs*` (inclui docs de testes e relatórios)

Se um agente sugerir mudanças, deve referenciar paths reais do repo.

---

## Documentos obrigatórios do projeto
### Sempre vivos
- `docsROADMAP.md`  prioridades e fases
- `docsSPEC.md`  contrato do o quê + ACs
- `docsUI.md`  contrato do como operar
- `docsCHANGELOG_AI.md`  o que mudou + como validar

### Mudam raramente
- `docsQA.md`  checklist padrão de validação
- `docsDECISIONS.md`  ADRs curtinhos (decisões não-triviais)

---

## Gates (travas do processo)
### Gate 1  antes de codar
Só iniciar implementação quando:
- `docsSPEC.md` e `docsUI.md` estão atualizados para a feature.

### Gate 2  antes de considerar pronto
Só considerar done quando:
- `docsCHANGELOG_AI.md` foi atualizado com a entrega.
- QA foi executado (guiado por `docsQA.md`).
- Build passou (`npm run build`).

---

## Fluxo padrão com agentes (quem faz o quê)
### PO GPT
- Fecha escopo, corta non-goals, escreve `docsSPEC.md`.
- Se surgir decisão não-trivial, sinaliza Decision candidate.

### Design GPT
- Traduz SPEC em telasestadosmensagens, escreve `docsUI.md`.
- Não inventa regra de negócio nova; se faltar regra, devolve para SPEC.

### Eng Manager GPT
- Lê SPEC+UI, cria plano e tasks executáveis pro Codex.
- Inclui estratégia de testes + checklist QA + rascunho de Change Report.
- Se surgir decisão técnica não-trivial, escreve ADR em `docsDECISIONS.md`.

### Codex (VS Code)
- Executor: implementa tasks, roda buildtest, faz commits pequenos e push.
- Se uma task exigir decisão de produtoUX, **para** e reporta opções (não improvisa regra).

---

## Comandos prontos (para iniciar qualquer conversa nova)
1) **Alinhar contexto**
> Leia `docsAGENTS_GUIDE.md`. Em seguida leia `docsROADMAP.md` e me diga qual é a próxima entrega recomendada.

2) **Gerar SPEC**
> Pronto, agora que finalizamos o escopo, gere `docsSPEC.md` completo para a entrega X.

3) **Gerar UI**
> Pronto, gere `docsUI.md` completo para a entrega X com estados e mensagens.

4) **Gerar tasks pro Codex**
> Pronto, gere TASKS executáveis pro Codex para a entrega X, com paths reais e critérios done when. Inclua o prompt final pro Codex (branch, build, commit, push).

---

## Defaults e preferências do projeto
- Prioridade: operação diária + produção do dia + impressão.
- Desktop-first.
- Validações sempre em duas camadas (client + server).
- Mudanças pequenas e frequentes; evitar refactors grandes sem necessidade.

---
