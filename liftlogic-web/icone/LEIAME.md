# Ícone do DayForge

- `dayforge-icone.svg`: desenho da bigorna + martelo (camada da frente, 108×108, com a margem de segurança do ícone adaptativo do Android).
- O fundo índigo fica em `android/app/src/main/res/drawable/ic_launcher_fundo.xml`.
- `gerar-icones.cjs`: gera os PNGs (precisa do Playwright). Exemplo:

```
node icone/gerar-icones.cjs '[["saida.png",512,"square"]]'
```

Modos: `fg` (frente transparente), `square` (cantos arredondados), `round` (círculo), `full` (fundo inteiro, usado no PWA e na Play Store).
