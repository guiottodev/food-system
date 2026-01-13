# QA Checklist (Gate 2)

Este checklist deve ser executado para toda entrega que altera comportamento, telas, validações ou impressão.

## 1) Build & qualidade
- [ ] `npm run build` passa sem erros
- [ ] Sem erros no console do navegador nas telas afetadas
- [ ] Sem warnings críticos novos (apenas se inevitáveis e justificados)

## 2) Happy path (fluxo principal)
- [ ] Criar um pedido completo com itens válidos
- [ ] Salvar/confirmar o pedido
- [ ] Ver o pedido refletido na listagem/produção do dia (se existir)

## 3) Validações (casos inválidos essenciais)
- [ ] UNIDADE: quantidade decimal deve falhar (ex.: 2.5)
- [ ] KG: quantidade fora de múltiplo 0.05 deve falhar (ex.: 1.03)
- [ ] Mensagens de erro são claras e aparecem no lugar correto
- [ ] Validação existe no client E no server (não dá para “burlar”)

## 4) Estados de tela
- [ ] Loading state (carregamento) existe e não trava interação indevidamente
- [ ] Empty state (sem dados) mostra orientação e próxima ação
- [ ] Error state mostra mensagem + opção de tentar novamente

## 5) Impressão (se aplicável)
- [ ] Layout não corta conteúdo no papel térmico (A7/A8 conforme padrão do projeto)
- [ ] Texto legível e informações essenciais presentes (pedido, itens, quantidades)
- [ ] Teste de impressão executado em pelo menos 1 cenário real

## 6) Smoke test (regressão rápida)
- [ ] Abrir tela principal do admin sem quebrar
- [ ] Executar a ação mais crítica do dia a dia em menos de 1 minuto
