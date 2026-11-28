export async function extrairTextoImagem(file, onProgresso) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("por", 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgresso) {
        onProgresso(Math.round(m.progress * 100));
      }
    },
  });
  try {
    const {
      data: { text },
    } = await worker.recognize(file);
    return text;
  } finally {
    await worker.terminate();
  }
}

export async function extrairTextoPDF(file) {
  const pdfjsLib = await import("pdfjs-dist");
  const pdfjsWorker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker.default;

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let textoCompleto = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const linhasPagina = {};
    content.items.forEach((item) => {
      // Agrupa por posição vertical aproximada, pra reconstituir linhas
      const y = Math.round(item.transform[5]);
      if (!linhasPagina[y]) linhasPagina[y] = [];
      linhasPagina[y].push(item.str);
    });
    const ys = Object.keys(linhasPagina)
      .map(Number)
      .sort((a, b) => b - a);
    ys.forEach((y) => {
      textoCompleto += linhasPagina[y].join(" ") + "\n";
    });
    textoCompleto += "\n";
  }
  return textoCompleto;
}

// Cabeçalho de dia: "TREINO A", "Treino B - Costas", "Dia 2", "Ficha C: Pernas"
const REGEX_DIA = /\b(?:treino|dia|ficha)\s*[-:]?\s*([A-E]|[1-5])\b(?:\s*[-–—:(]\s*(.+?)\)?\s*$)?/i;
// "4x12", "4 x 10-12", "3X15"
const REGEX_SERIES_REPS = /(\d+)\s*[xX×]\s*(\d+)(?:\s*[-–a]\s*\d+)?/;
// "3 séries de 12", "4 series x 10 repetições"
const REGEX_SERIES_DE = /(\d+)\s*s[ée]ries?\s*(?:de|x|com)?\s*(\d+)(?:\s*[-–a]\s*\d+)?\s*(?:repeti[çc][õo]es|reps?)?/i;
const REGEX_CARGA = /(\d+(?:[.,]\d+)?)\s*kg/i;
// "60s", "90 seg", "descanso 60 segundos" (sem confundir com "3 séries")
const REGEX_DESCANSO = /(?:descanso\s*[:-]?\s*)?(\d+)\s*(?:segundos|seg|s)(?![\p{L}])/iu;
const LETRAS = ["A", "B", "C", "D", "E"];

function letraDoDia(valor) {
  const v = valor.toUpperCase();
  return /[1-5]/.test(v) ? LETRAS[Number(v) - 1] : v;
}

export function parsearTreinoTexto(texto) {
  const linhas = texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const dias = {};
  let letraAtual = null;
  let grupoAtual = "";

  linhas.forEach((linha) => {
    const matchSeriesReps =
      linha.match(REGEX_SERIES_REPS) || linha.match(REGEX_SERIES_DE);
    const matchDia = linha.match(REGEX_DIA);

    // Linha que anuncia o dia (sem séries/reps), ex: "TREINO A - Peito e Tríceps"
    if (matchDia && !matchSeriesReps) {
      letraAtual = letraDoDia(matchDia[1]);
      grupoAtual = (matchDia[2] || "").replace(/[*_#]/g, "").trim();
      if (!dias[letraAtual]) dias[letraAtual] = [];
      return;
    }

    if (!matchSeriesReps) return; // linha sem padrão de série/rep, ignora

    if (!letraAtual) {
      letraAtual = "A";
      if (!dias[letraAtual]) dias[letraAtual] = [];
    }

    const matchCarga = linha.match(REGEX_CARGA);
    const matchDescanso = linha.match(REGEX_DESCANSO);

    // Nome = a linha inteira, tirando numeração e os números já capturados
    let nome = linha
      .replace(/^\s*(?:\d+\s*[.)º°-]|[-–—•*]+)\s*/, "")
      .replace(REGEX_SERIES_REPS, "")
      .replace(REGEX_SERIES_DE, "")
      .replace(REGEX_CARGA, "")
      .replace(matchDescanso ? REGEX_DESCANSO : "", "")
      .replace(/\b(?:repeti[çc][õo]es|reps?|carga|descanso)\b/gi, "")
      .replace(/[*_#()[\]]/g, "")
      .replace(/[-–—:•|]/g, " ")
      .replace(/\s+/g, " ")
      .replace(/[\s,;.]+$/, "")
      .trim();

    if (!nome) nome = "Exercício sem nome";

    dias[letraAtual].push({
      nome,
      grupo_muscular: grupoAtual,
      series: Number(matchSeriesReps[1]) || 3,
      repeticoes: Number(matchSeriesReps[2]) || 10,
      carga: matchCarga ? Number(matchCarga[1].replace(",", ".")) : 0,
      descanso_segundos: matchDescanso ? Number(matchDescanso[1]) : 90,
      equipamento: "maquina",
    });
  });

  return dias;
}
