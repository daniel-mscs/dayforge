# DayForge

**Forje seu dia. Um tijolo por vez.**

DayForge é um super app de saúde e performance pessoal — construído para quem leva a sério treino, alimentação, rotina e hábitos. Tudo em um único lugar, sincronizado na nuvem.

[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite)](https://vitejs.dev)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?logo=supabase)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com)

[Acessar o app](https://dayforge-web.vercel.app) · [Reportar bug](https://github.com/daniel-mscs/dayforge/issues)

---

## Sobre o projeto

DayForge nasceu da necessidade de ter um único app que centralizasse treino, dieta, hidratação, rotina diária e hábitos — sem depender de cinco aplicativos diferentes. O foco é na consistência: pequenas ações diárias que, somadas, geram resultados reais.

---

## Funcionalidades

### 🏠 Home
- Saudação personalizada com nome e data
- Frase motivacional diária (estoicismo, fitness, hábitos)
- Cards de resumo: água, peso, kcal e passos do dia
- Refeição atual baseada no horário
- Suplementos e hábitos do dia com check interativo
- Semana de treino com divisão e status de cada letra
- Blocos arrastáveis para personalizar a ordem da home
- Mostrar e ocultar seções individualmente

### 🏋️ Treino
- Divisões A/B/C/D/E personalizáveis
- Timer de treino e timer de descanso configurável
- Modal de exercício com bolinhas de séries, bip aos 10s e animação de timer
- Drag and drop para reordenar exercícios
- Editar exercícios existentes
- Registro de carga por exercício
- Resumo ao finalizar (tempo, kcal estimado, volume)
- Gráficos de evolução de carga, volume e histórico
- Histórico completo de treinos finalizados

### 📋 Rotina
- Grade mensal navegável por mês
- Períodos: Acordar, Manhã, Tarde, Noite
- Drag and drop para reordenar tarefas
- Clone de tarefas entre dias
- Progresso diário com barra visual

### 💧 Água
- Registro de consumo com botões rápidos (180, 300, 500, 1000ml)
- Meta personalizada baseada no peso (sedentário/ativo)
- Gráfico dos últimos 7 dias

### ⚖️ Peso
- Registro diário com substituição
- Gráfico de evolução com linha de tendência e meta
- IMC, TMB, composição corporal estimada e peso ideal
- Sub-aba de medidas corporais (bíceps, cintura, quadril, etc.) com visual corporal SVG
- Comparativo antes/depois de medidas

### 🍽️ Macros
- Banco com 110+ alimentos da tabela TACO
- Alimentos personalizados
- Log por refeição com preview de macros
- Clonar refeições de dias anteriores
- Saldo calórico cruzando treino, cardio e passos
- Meta calórica diária e TMB

### 🥗 Dieta
- Plano alimentar por refeição
- Sugestão automática de dieta por objetivo e renda
- Exibe refeição atual na home baseado no horário

### 💊 Suplementos
- Cadastro com nome e dose
- Check diário com horário registrado
- Reset automático à meia-noite

### 👟 Passos
- Registro manual diário
- Meta personalizável
- Equivalências em km, kcal e tempo

### 🧱 Hábitos
- 6 hábitos fixos + hábitos personalizados com emoji
- Histórico 7 dias com heatmap
- Streak de dias consecutivos
- XP por hábito concluído

### 🏃 Cardio
- 27 atividades com cálculo automático de kcal via MET
- Override manual de kcal
- Gráfico de sessões do mês
- Integração com saldo calórico do Macros

### 😴 Sono
- Registro de horário dormiu/acordou
- Avaliação de qualidade (1-5)
- Gráfico de horas dos últimos 7 dias
- Média de horas e qualidade semanal

### 📊 Stats
- Rings de progresso circulares por métrica
- Gráficos de área com gradiente
- Resumo semanal de treinos, água, peso, macros e passos

### 🤖 Coach IA
- Relatório semanal gerado por IA
- Análise de treinos, macros, sono, cardio e passos
- Contexto personalizado do perfil

### 🎮 RPG
- Sistema de XP por ações concluídas
- Avatar com skin, roupa e itens personalizáveis
- Níveis e missões diárias

### 💰 SmartPocket
- Controle de gastos, cartão, investimentos e entradas
- Saldo mensal com gráfico
- Resumo por categoria

### 👤 Perfil
- Dados pessoais com IMC e TMB calculados
- Campo "Sobre mim" usado pelo Coach IA
- Notificações configuráveis
- Aba de ajuda com navegação por tópico
- Tooltip de ajuda em cada seção do app

---

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18 + Vite |
| Estilização | CSS puro (dark theme) |
| Backend | Supabase (PostgreSQL + Auth) |
| Deploy | Vercel |
| Drag and Drop | @dnd-kit |
| Gráficos | Recharts |
| IA | Anthropic Claude API |

---

## Banco de dados

```
perfil · exercicio · treinos_finalizados · historico_carga
rotina_dias · rotina_tarefas · habitos_registro · habitos_custom
agua_registro · agua_meta · peso_registro · medidas_registro
suplementos · suplementos_check · dieta_plano
macros_registro · macros_meta · alimentos_base · alimentos_custom
passos_registro · passos_meta · cardio_registro · sono_registro
rpg_perfil · rpg_xp_log · rpg_missoes_log · streak_registro
financeiro_gastos · financeiro_cartao · financeiro_investimentos · financeiro_entradas
frases · humor_registro
```

---

## Rodando localmente

```bash
git clone https://github.com/daniel-mscs/dayforge.git
cd liftlogic-web
npm install
cp .env.example .env
npm run dev
```

**.env**
```
VITE_SUPABASE_URL=sua_url
VITE_SUPABASE_ANON_KEY=sua_chave
VITE_ANTHROPIC_API_KEY=sua_chave
```

---

## Roadmap

- [ ] Integração com API Java/Spring Boot própria
- [ ] App nativo com Capacitor
- [ ] Notificações push de descanso entre séries
- [ ] Templates de treino prontos
- [ ] Exportar dados (CSV/PDF)
- [x] Sistema de XP e níveis (RPG)
- [x] Controle financeiro (SmartPocket)
- [x] Coach IA com relatório semanal

---

## Autor

Desenvolvido por **Daniel** — [@daniel-mscs](https://github.com/daniel-mscs)

---

*DayForge — Construa hábitos. Forje resultados.*