# Capacidade, produção, consumo

Referência canônica: `docs/SOURCE_OF_TRUTH.md` (seção 9).

Resumo
- Produção registrada aumenta o saldo de pronta-entrega por SKU (stockQuantity).
- Consumos manuais podem ajustar o saldo sem entrega.
- A tela de capacidade mostra produzido, consumido, disponível, demanda e gap.
- Produzido/consumido/disponível referem-se ao **período da produção** (últimos X dias); demanda ao **período da demanda** (próximos X dias).
- A demanda usa pedidos RASCUNHO, CONFIRMADO, EM_PRODUCAO dentro da janela de demanda.
Observação: capacidade/produção é por produto, enquanto estoque pronto é por SKU.
Observação: a lista considera apenas produtos ativos.
Observação: a categoria exibida na capacidade segue o **caminho da categoria folha**
do produto (ex.: `Salgados › Fritos`), pois produtos ficam sempre em categorias folha.

Janelas (dois filtros independentes)
- Demanda (próximos X dias): hoje, 7, 14, 30 — default 7.
- Produção (últimos X dias): hoje, 7, 14, 15, 30 — default 15.
