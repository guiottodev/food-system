# CODEX_WORKFLOW

## Template padrão de prompt
```
Objetivo:
[descreva a tarefa com clareza]

Escopo:
- Fazer: [lista objetiva]
- Não fazer: [fora do escopo]

Entradas:
- Regras congeladas: [copiar aqui]
- Restrições: [técnicas/negócio]

Saídas obrigatórias:
- Arquivos: [nomes]
- Formato da resposta: Plan -> Diff -> Commands -> Checklist
```

## Formato obrigatório de resposta
- Plan: passos em bullets.
- Diff: alterações aplicadas (ou conteúdo completo quando não houver diff).
- Commands: comandos executados.
- Checklist: validações realizadas.

## WIP e uma tarefa por vez
- Apenas uma tarefa ativa por vez.
- WIP máximo: 2 itens simultâneos.

## Condições de parada
- Se o escopo crescer, dividir em tarefas menores antes de continuar.
- Se houver dependência externa (ex.: decisão de impressora), registrar como pergunta aberta.

## Definition of Done
- Aceite revisado e atendido.
- Testes executados quando aplicável.
- Documentação atualizada e consistente.
