// Rotinas prontas de mobilidade. Cada exercício é "reps" (X repetições) ou
// "tempo" (X segundos). Com lados=true o exercício é feito dos dois lados.

const reps = (nome, repeticoes, instrucoes, lados = false) => ({
  nome,
  tipo: "reps",
  repeticoes,
  lados,
  instrucoes,
});

const tempo = (nome, duracao_segundos, instrucoes, lados = false) => ({
  nome,
  tipo: "tempo",
  duracao_segundos,
  lados,
  instrucoes,
});

const EX = {
  gatoCamelo: reps(
    "Gato-camelo",
    10,
    "De quatro apoios, mãos sob os ombros e joelhos sob o quadril. Arredonde as costas empurrando o chão (gato) e depois afunde a coluna olhando pra frente (camelo). Lento, acompanhando a respiração.",
  ),
  circuloBraco: reps(
    "Círculos de braço",
    15,
    "Em pé, braços abertos na altura dos ombros. Faça círculos grandes pra frente e depois pra trás (metade de cada), sem encolher os ombros.",
  ),
  aberturaPeito: tempo(
    "Abertura de peito na parede",
    30,
    "Em pé, de lado pra parede, apoie a mão e o antebraço na parede com o braço a 90°. Gire o corpo devagar pro lado oposto até sentir abrir o peito e a frente do ombro. Sem forçar.",
    true,
  ),
  livroAberto: reps(
    "Rotação torácica (livro aberto)",
    8,
    "Deitado de lado, joelhos dobrados e braços esticados à frente. Abra o braço de cima como a página de um livro, girando o tronco e acompanhando com o olhar, e volte. Mantenha os joelhos juntos. Faça de um lado e depois do outro.",
    true,
  ),
  triceps: tempo(
    "Alongamento de tríceps",
    20,
    "Leve um braço por cima da cabeça com o cotovelo dobrado e use a outra mão pra empurrar suavemente o cotovelo pra trás.",
    true,
  ),
  ombroCruzado: tempo(
    "Alongamento cruzado de ombro",
    20,
    "Cruze um braço na frente do peito e puxe com a outra mão, perto do cotovelo. Mantenha o ombro baixo, longe da orelha.",
    true,
  ),
  punhos: tempo(
    "Mobilidade de punhos",
    30,
    "Faça círculos lentos com os punhos pra um lado e pro outro. Depois estique o braço e puxe os dedos suavemente pra trás e pra baixo.",
  ),
  deslizeParede: reps(
    "Deslize na parede",
    10,
    "Costas, cabeça e quadril encostados na parede, braços dobrados em 'W' também encostados. Suba os braços deslizando até esticar, sem arquear a lombar nem tirar as costas da parede, e desça.",
  ),
  agachProfundo: tempo(
    "Agachamento profundo com pausa",
    30,
    "Pés um pouco mais abertos que os ombros, pontas dos pés levemente pra fora. Desça o máximo que conseguir mantendo os calcanhares no chão e fique ali, empurrando os joelhos pra fora com os cotovelos. Se precisar, segure em algo.",
  ),
  tornozelo: reps(
    "Mobilidade de tornozelo na parede",
    10,
    "De frente pra parede, com um pé à frente. Leve o joelho em direção à parede sem tirar o calcanhar do chão e volte. Afaste o pé aos poucos pra aumentar o desafio. Faça de um lado e depois do outro.",
    true,
  ),
  avancoRotacao: reps(
    "Avanço com rotação",
    6,
    "Dê um passo grande à frente em avanço. Apoie a mão de dentro no chão e gire o tronco, abrindo o outro braço pro teto e olhando pra mão. Volte e repita. Faça as repetições de um lado e depois do outro.",
    true,
  ),
  posterior: tempo(
    "Alongamento de posterior em pé",
    30,
    "Em pé, apoie o calcanhar de uma perna à frente com o joelho quase esticado. Incline o tronco à frente com as costas retas até sentir a parte de trás da coxa.",
    true,
  ),
  quadriceps: tempo(
    "Alongamento de quadríceps",
    30,
    "Em pé, segure o pé de uma perna atrás e puxe o calcanhar em direção ao glúteo, mantendo os joelhos juntos e o quadril pra frente. Apoie-se se precisar.",
    true,
  ),
  flexorQuadril: tempo(
    "Alongamento de flexor do quadril",
    30,
    "Com um joelho no chão e o outro pé à frente (avanço baixo), contraia o glúteo da perna de trás e empurre o quadril pra frente até sentir a frente do quadril alongar. Tronco alto.",
    true,
  ),
  ponte: reps(
    "Ponte de glúteo",
    12,
    "Deitado de barriga pra cima, joelhos dobrados e pés no chão. Suba o quadril apertando o glúteo até alinhar ombros, quadril e joelhos, segure 1 segundo e desça.",
  ),
  balancoFrontal: reps(
    "Balanço de perna frontal",
    15,
    "Em pé, apoie uma mão na parede. Balance a perna esticada pra frente e pra trás de forma controlada, aumentando a amplitude aos poucos, sem arquear a lombar.",
    true,
  ),
  balancoLateral: reps(
    "Balanço de perna lateral",
    15,
    "De frente pra parede, apoie as mãos e balance a perna esticada de um lado pro outro, cruzando na frente do corpo, com o tronco parado. Aumente a amplitude aos poucos.",
    true,
  ),
  figura4: tempo(
    "Alongamento de glúteo (figura 4)",
    30,
    "Deitado de barriga pra cima, cruze o tornozelo de uma perna sobre o joelho da outra. Puxe a coxa de baixo em direção ao peito até sentir o glúteo da perna de cima alongar.",
    true,
  ),
  posteriorDeitado: tempo(
    "Alongamento de posterior deitado",
    30,
    "Deitado de barriga pra cima, segure atrás da coxa de uma perna e estique o joelho em direção ao teto até sentir a parte de trás da coxa. A outra perna fica apoiada no chão.",
    true,
  ),
  borboleta: tempo(
    "Borboleta (adutores)",
    40,
    "Sentado, junte as solas dos pés e deixe os joelhos caírem pros lados. Mantenha a coluna alta e, se quiser mais alongamento, incline o tronco à frente com as costas retas.",
  ),
  cossack: reps(
    "Cossack squat",
    8,
    "Pés bem afastados. Jogue o peso pra um lado e agache fundo nessa perna, com o calcanhar no chão e o peito erguido; a outra perna fica esticada com a ponta do pé pra cima. Volte ao centro e faça pro outro lado.",
    true,
  ),
  noventaNoventa: tempo(
    "Rotação de quadril 90/90",
    30,
    "Sentado no chão com as duas pernas dobradas a 90°, uma à frente e a outra ao lado. Mantenha a coluna alta e incline o tronco em direção à perna da frente.",
    true,
  ),
  elevacaoPerna: reps(
    "Elevação de perna esticada",
    10,
    "Deitado de barriga pra cima, uma perna esticada no chão. Levante a outra perna com o joelho esticado o mais alto que conseguir, sem tirar a lombar do chão, e desça devagar. Treina a força na amplitude, importante pro chute.",
    true,
  ),
  circuloQuadril: reps(
    "Círculos de quadril (joelho alto)",
    8,
    "Em pé, levante um joelho e faça círculos grandes com ele, abrindo e fechando o quadril, com o tronco estável. Faça pra um lado e depois pro outro.",
    true,
  ),
  panturrilha: tempo(
    "Alongamento de panturrilha",
    30,
    "Mãos na parede, uma perna atrás com o calcanhar no chão e o joelho esticado. Incline o corpo à frente até sentir a panturrilha.",
    true,
  ),
  respiracao: tempo(
    "Respiração profunda",
    40,
    "Em pé ou sentado, inspire pelo nariz contando 4 segundos e solte pela boca contando 6, relaxando ombros e rosto. Ajuda a baixar os batimentos depois do treino.",
  ),
  peitoralPorta: tempo(
    "Alongamento de peitoral na porta",
    30,
    "Apoie o antebraço no batente da porta, cotovelo a 90°, e dê um pequeno passo à frente até sentir o peito alongar.",
    true,
  ),
  crianca: tempo(
    "Postura da criança",
    30,
    "De joelhos, sente nos calcanhares e leve o tronco à frente com os braços esticados no chão. Relaxe a cabeça e respire fundo.",
  ),
  torcaoDeitado: tempo(
    "Torção de coluna deitado",
    30,
    "Deitado de barriga pra cima, joelhos dobrados. Deixe os dois joelhos caírem pra um lado, mantendo os ombros no chão e os braços abertos. Respire fundo.",
    true,
  ),
  cobra: tempo(
    "Cobra suave",
    20,
    "Deitado de barriga pra baixo, mãos sob os ombros. Empurre o chão e suba o peito só até onde ficar confortável, mantendo o quadril no chão. Sem dor na lombar.",
  ),
  pescocoLateral: tempo(
    "Inclinação lateral do pescoço",
    20,
    "Sentado ou em pé, incline a orelha em direção ao ombro sem levantar o ombro. Deixe só o peso da cabeça trabalhar.",
    true,
  ),
  pescocoRotacao: reps(
    "Rotação do pescoço",
    6,
    "Olhe devagar por cima de um ombro, volte ao centro e olhe pro outro lado. Movimento lento, sem forçar e sem jogar a cabeça pra trás. Faça pra um lado e depois pro outro.",
    true,
  ),
  queixoDentro: reps(
    "Queixo pra dentro",
    10,
    "Em pé ou sentado com a coluna alta, puxe o queixo reto pra trás (como se fizesse papada), sem inclinar a cabeça. Segure 2 segundos e relaxe.",
  ),
  encolherOmbros: reps(
    "Encolher e soltar os ombros",
    10,
    "Suba os ombros em direção às orelhas, segure 2 segundos e solte de uma vez, relaxando.",
  ),
  trapezio: tempo(
    "Alongamento de trapézio",
    20,
    "Sentado, prenda a mão de um lado debaixo da coxa e incline a cabeça pro lado oposto, deixando o peso da cabeça alongar o lado do pescoço.",
    true,
  ),
  giroTronco: reps(
    "Rotação de tronco em pé",
    10,
    "Em pé, pés na largura dos ombros e braços relaxados. Gire o tronco pra um lado e pro outro, deixando os braços acompanharem, sem torcer os joelhos.",
  ),
  caminhadaMaos: reps(
    "Caminhada com as mãos",
    6,
    "Em pé, incline o tronco e apoie as mãos no chão. Ande com as mãos à frente até a posição de prancha, volte andando com as mãos e suba.",
  ),
};

export const ROTINAS_MOBILIDADE = [
  {
    id: "superiores",
    nome: "Treino de superiores",
    emoji: "💪",
    descricao:
      "Ombros, peito, costas e punhos prontos antes de supino, puxadas e remadas.",
    exercicios: [
      EX.circuloBraco,
      EX.aberturaPeito,
      EX.gatoCamelo,
      EX.livroAberto,
      EX.deslizeParede,
      EX.triceps,
      EX.ombroCruzado,
      EX.punhos,
    ],
  },
  {
    id: "pernas",
    nome: "Treino de perna",
    emoji: "🦵",
    descricao:
      "Tornozelo, quadril e posterior soltos pra agachar fundo com boa técnica.",
    exercicios: [
      EX.tornozelo,
      EX.balancoFrontal,
      EX.avancoRotacao,
      EX.agachProfundo,
      EX.ponte,
      EX.flexorQuadril,
      EX.posterior,
      EX.quadriceps,
      EX.figura4,
    ],
  },
  {
    id: "chute",
    nome: "Chutar mais alto",
    emoji: "🥋",
    descricao:
      "Quadril, posterior e adutores pra ganhar amplitude de chute. Aumente a amplitude aos poucos, sem forçar no frio.",
    exercicios: [
      EX.circuloQuadril,
      EX.balancoFrontal,
      EX.balancoLateral,
      EX.cossack,
      EX.flexorQuadril,
      EX.posteriorDeitado,
      EX.borboleta,
      EX.noventaNoventa,
      EX.elevacaoPerna,
    ],
  },
  {
    id: "pos-treino",
    nome: "Pós-treino",
    emoji: "🧘",
    descricao: "Volta à calma e alongamentos pra relaxar depois de treinar.",
    exercicios: [
      EX.respiracao,
      EX.crianca,
      EX.peitoralPorta,
      EX.ombroCruzado,
      EX.quadriceps,
      EX.posterior,
      EX.figura4,
      EX.panturrilha,
      EX.torcaoDeitado,
    ],
  },
  {
    id: "costas-pescoco",
    nome: "Costas e pescoço",
    emoji: "🧍",
    descricao:
      "Alívio de tensão de quem passa muito tempo sentado, de pé ou em plantão. Movimentos suaves.",
    exercicios: [
      EX.encolherOmbros,
      EX.queixoDentro,
      EX.pescocoLateral,
      EX.pescocoRotacao,
      EX.trapezio,
      EX.gatoCamelo,
      EX.livroAberto,
      EX.crianca,
      EX.cobra,
      EX.torcaoDeitado,
    ],
  },
  {
    id: "corpo-inteiro",
    nome: "Corpo inteiro",
    emoji: "🔄",
    descricao: "Rotina geral pra acordar o corpo todo, boa pra qualquer dia.",
    exercicios: [
      EX.circuloBraco,
      EX.giroTronco,
      EX.gatoCamelo,
      EX.caminhadaMaos,
      EX.avancoRotacao,
      EX.agachProfundo,
      EX.tornozelo,
      EX.balancoFrontal,
      EX.posterior,
    ],
  },
];

// Tempo aproximado da rotina em minutos (3s por repetição + 8s de troca).
export function tempoEstimadoMin(rotina) {
  const seg = rotina.exercicios.reduce((total, ex) => {
    const base =
      ex.tipo === "reps" ? ex.repeticoes * 3 : ex.duracao_segundos || 30;
    return total + base * (ex.lados ? 2 : 1) + 8;
  }, 0);
  return Math.max(1, Math.round(seg / 60));
}
