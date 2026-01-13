# QA Checklist (Gate 2)

Este checklist deve ser executado para toda entrega que altera comportamento, telas, validacoes ou impressao.

## 1) Build & qualidade
- [x] `npm run build` passa sem erros
- [x] `npm test` passa
- [ ] Sem erros no console do navegador nas telas afetadas
- [ ] Sem warnings criticos novos (apenas se inevitaveis e justificados)

## 2) Happy path (fluxo principal)
- [ ] Criar um pedido completo com itens validos
- [ ] Salvar/confirmar o pedido
- [ ] Ver o pedido refletido na listagem/producao do dia (se existir)

## 3) Validacoes (casos invalidos essenciais)
- [ ] UNIDADE: quantidade decimal deve falhar (ex.: 2.5)
- [ ] CENTO: quantidade decimal deve falhar (ex.: 2.5)
- [ ] KG: quantidade fora de multiplo 0.05 deve falhar (ex.: 1.03)
- [ ] Mensagens de erro sao claras e aparecem no lugar correto
- [ ] Validacao existe no client E no server (nao da para "oburlar")
- [ ] Cancelamento sem motivo deve falhar

## 4) Estados de tela
- [ ] Loading state (carregamento) existe e nao trava interacao indevidamente
- [ ] Empty state (sem dados) mostra orientacao e proxima acao
- [ ] Error state mostra mensagem + opcao de tentar novamente

## 5) Impressao (se aplicavel)
- [ ] Layout nao corta conteudo no papel termico (A7/A8 conforme padrao do projeto)
- [ ] Texto legivel e informacoes essenciais presentes (pedido, itens, quantidades)
- [ ] Teste de impressao executado em pelo menos 1 cenario real

## 6) Smoke test (regressao rapida)
- [ ] Estoque nao duplica decremento em Entregue
- [ ] Abrir tela principal do admin sem quebrar
- [ ] Executar a acao mais critica do dia a dia em menos de 1 minuto
