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

const REGEX_DIA = /\b(?:treino|dia)\s*[-:]?\s*([A-E])\b/i;
const REGEX_SERIES_REPS = /(\d+)\s*[xX×]\s*(\d+)/;
const REGEX_CARGA = /(\d+(?:[.,]\d+)?)\s*\s?kg/i;
const REGEX_DESCANSO = /(\d+)\s*\s?(?:s|seg|segundos)\b/i;

export function parsearTreinoTexto(texto) {
  const linhas = texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const dias = {};
  let letraAtual = null;

  linhas.forEach((linha) => {
    const matchDia = linha.match(REGEX_DIA);
    // Linha curta que só anuncia o dia (ex: "TREINO A"), não conta como exercício
    if (matchDia && linha.length < 20) {
      letraAtual = matchDia[1].toUpperCase();
      if (!dias[letraAtual]) dias[letraAtual] = [];
      return;
    }

    const matchSeriesReps = linha.match(REGEX_SERIES_REPS);
    if (!matchSeriesReps) return; // linha sem padrão de série/rep, ignora

    if (!letraAtual) {
      letraAtual = "A";
      if (!dias[letraAtual]) dias[letraAtual] = [];
    }

    const matchCarga = linha.match(REGEX_CARGA);
    const matchDescanso = linha.match(REGEX_DESCANSO);

    // Nome = a linha inteira, tirando os números que já foram capturados
    let nome = linha
      .replace(REGEX_SERIES_REPS, "")
      .replace(REGEX_CARGA, "")
      .replace(matchDescanso ? REGEX_DESCANSO : "", "")
      .replace(/[-–—:•]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!nome) nome = "Exercício sem nome";

    dias[letraAtual].push({
      nome,
      grupo_muscular: "",
      series: Number(matchSeriesReps[1]) || 3,
      repeticoes: Number(matchSeriesReps[2]) || 10,
      carga: matchCarga ? Number(matchCarga[1].replace(",", ".")) : 0,
      descanso_segundos: matchDescanso ? Number(matchDescanso[1]) : 90,
      equipamento: "maquina",
    });
  });

  return dias;
}
