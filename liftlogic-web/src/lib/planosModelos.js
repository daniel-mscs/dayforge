// Modelos prontos pra criar um plano já com a lista de coisas a fazer.
// Tudo aqui é só ponto de partida — depois de criado dá pra editar,
// apagar e adicionar qualquer item.
export const MODELOS_PLANO = [
  {
    id: "viagem",
    emoji: "✈️",
    nome: "Viagem",
    tituloSugerido: "Minha viagem dos sonhos",
    grupos: {
      Dinheiro: [
        { texto: "Juntar dinheiro das passagens", valor: true },
        { texto: "Juntar dinheiro da hospedagem", valor: true },
        { texto: "Separar dinheiro de passeios e alimentação", valor: true },
        { texto: "Manter a reserva de emergência intocada" },
      ],
      Documentos: [
        { texto: "Passaporte válido (de preferência 6+ meses de validade)" },
        { texto: "Ver se precisa de visto ou autorização de entrada" },
        { texto: "Contratar seguro viagem" },
        { texto: "Salvar cópias dos documentos e reservas no celular" },
      ],
      Planejamento: [
        { texto: "Escolher destino e datas" },
        { texto: "Combinar folga / férias no trabalho" },
        { texto: "Montar o roteiro" },
        { texto: "Comprar as passagens" },
        { texto: "Reservar a hospedagem" },
        { texto: "Ver como pagar lá fora (cartão, câmbio, taxas)" },
      ],
      Saúde: [
        { texto: "Conferir vacinas exigidas no destino" },
        { texto: "Levar remédios de uso contínuo e receitas" },
      ],
    },
  },
  {
    id: "morar-fora",
    emoji: "🌍",
    nome: "Morar fora do Brasil",
    tituloSugerido: "Morar fora do Brasil",
    grupos: {
      Dinheiro: [
        {
          texto: "Reserva de emergência (6 a 12 meses de custo de vida)",
          valor: true,
        },
        {
          texto:
            "Dinheiro para os primeiros meses lá (aluguel, depósito, passagem)",
          valor: true,
        },
        { texto: "Quitar dívidas" },
        { texto: "Abrir uma conta internacional" },
      ],
      Trabalho: [
        { texto: "Estar trabalhando remoto com renda estável" },
        { texto: "Ter clientes ou contrato recorrentes" },
        { texto: "Portfólio, GitHub e LinkedIn em inglês" },
        {
          texto:
            "Entender como fica o imposto de renda (saída do país e renda de fora)",
        },
      ],
      Documentos: [
        { texto: "Passaporte válido" },
        { texto: "Certidões apostiladas e traduzidas (nascimento, casamento)" },
        { texto: "Antecedentes criminais" },
        { texto: "Diploma e histórico traduzidos" },
        { texto: "Se tiver filhos: autorização e acordo de guarda/viagem" },
      ],
      "Visto e destino": [
        {
          texto:
            "Pesquisar países e tipos de visto (trabalho, nômade digital, estudo)",
        },
        { texto: "Comparar custo de vida e cidades" },
        { texto: "Checar requisitos de renda mínima do visto" },
        { texto: "Escolher o país e começar o processo do visto" },
      ],
      Idioma: [
        { texto: "Chegar no nível de idioma necessário" },
        { texto: "Praticar conversação toda semana" },
      ],
      "Saúde e moradia": [
        { texto: "Contratar seguro saúde internacional" },
        { texto: "Definir onde vai morar nos primeiros meses" },
      ],
      "Antes de ir": [
        { texto: "Resolver pendências no Brasil (contas, CPF regular)" },
        { texto: "Ter um plano B caso precise voltar" },
      ],
    },
  },
  {
    id: "branco",
    emoji: "🎯",
    nome: "Plano em branco",
    tituloSugerido: "",
    grupos: { Geral: [] },
  },
];
