# Testes rapidos de quantidade

Executar localmente:

```
node scripts/test-quantity.js
```

Casos cobertos:
- KG: 0.50 (ok), 0.55 (ok), 0.53 (erro)
- UNIDADE: 1 (ok), 1.0 (ok, normaliza para 1), 1.5 (erro)
- Strings: "0,55" (ok), " 2 " (ok)
