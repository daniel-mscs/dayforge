# DayForge

**Forje seu dia. Um tijolo por vez.**

DayForge é um super app de saúde e performance pessoal — construído para quem leva a sério treino, alimentação, rotina e hábitos. Tudo em um único lugar, sincronizado na nuvem.

[Acessar o app](https://liftlogic-core.vercel.app) · [Reportar bug](https://github.com/daniel-mscs/dayforge/issues)

---

## Sobre o projeto

DayForge nasceu da necessidade de ter um único app que centralizasse treino, dieta, hidratação, rotina diária e hábitos — sem depender de cinco aplicativos diferentes. O foco é na consistência: pequenas ações diárias que, somadas, geram resultados reais.

---

## Funcionalidades

### Home
- Saudação personalizada com nome e data
- Frase motivacional diária (estoicismo, fitness, hábitos)
- Contador de dias até o fim do ano
- Cards de resumo: água, peso, kcal e passos do dia
- Tarefas do dia com check interativo
- Refeição atual baseada no horário
- Suplementos do dia com check
- Hábitos do dia
- Blocos arrastáveis para personalizar a ordem
- Mostrar e ocultar seções individualmente
- Resumo semanal automático aos sábados e domingos

### Treino
- Divisões A/B/C/D/E personalizáveis
- Timer de treino e timer de descanso
- Drag and drop para reordenar exercícios
- Registro de carga por exercício
- Resumo ao finalizar (tempo, kcal estimado, volume)
- Gráficos de kcal, volume, tempo e evolução de carga
- Histórico completo de treinos

### Rotina
- Grade semanal com períodos (Acordar, Manhã, Tarde, Noite)
- Drag and drop para reordenar tarefas
- Clone de dia
- Progresso diário

### Agua
- Registro de consumo com botões rápidos
- Meta personalizada baseada no peso
- Histórico dos últimos 7 dias

### Peso
- Registro diário
- Gráfico de evolução
- IMC, TMB e meta de peso

### Macros
- Banco com 110 alimentos da tabela TACO
- Alimentos personalizados
- Log por refeição
- Meta calórica diária

### Dieta
- Plano alimentar por refeição
- Exibe refeição atual na home baseado no horário

### Suplementos
- Cadastro com nome e dose
- Check diário com horário
- Reset automático a cada dia

### Passos
- Registro manual diário
- Meta personalizável
- Equivalências em km, kcal e tempo

### Habitos
- 6 hábitos fixos
- Hábitos personalizados com emoji
- Histórico 7 dias com heatmap
- Streak de dias consecutivos

### Stats da Semana
- Resumo de treinos, água, peso, macros e passos
- Gráficos por dia da semana

### Perfil e Ajuda
- Dados pessoais com IMC e TMB calculados
- Aba de ajuda com navegação direta por tópico
- Atalho de ajuda em cada seção do app

---

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18 + Vite |
| Estilização | CSS puro (dark theme) |
| Backend | Supabase (PostgreSQL + Auth) |
| Deploy | Vercel |
| Drag and Drop | @dnd-kit |
| Graficos | Recharts |

---

## Banco de dados

```
perfil · exercicio · treinos_finalizados · historico_carga
rotina_dias · rotina_tarefas · habitos_registro · habitos_custom
agua_registro · agua_meta · peso_registro · suplementos
suplementos_check · dieta_plano · macros_registro · macros_meta
alimentos_base · alimentos_custom · passos_registro · passos_meta · frases
```

---

## Rodando localmente

```bash
git clone https://github.com/daniel-mscs/dayforge.git
cd dayforge
npm install
cp .env.example .env
npm run dev
```

**.env**
```
VITE_SUPABASE_URL=sua_url
VITE_SUPABASE_ANON_KEY=sua_chave
```

---

## Roadmap

- Sistema de XP e niveis por treino
- Controle financeiro integrado (SmartPocket)
- App nativo com Capacitor
- Plano premium com Stripe

---

## Autor

Desenvolvido por **Daniel** — [@daniel-mscs](https://github.com/daniel-mscs)

---

*DayForge — Construa habitos. Forje resultados.*