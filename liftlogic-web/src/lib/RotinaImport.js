// Lê uma semana de rotina (texto colado ou JSON) e devolve
// [{ data: "YYYY-MM-DD", periodos: { Acordar: [], Manhã: [], Tarde: [], Noite: [] } }]

export const PERIODOS_IMPORT = ["Acordar", "Manhã", "Tarde", "Noite"];

const semAcento = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

const normalizarPeriodo = (s) => {
  const k = semAcento(s).replace(/[:\s]+$/g, "");
  if (k === "acordar") return "Acordar";
  if (k === "manha") return "Manhã";
  if (k === "tarde") return "Tarde";
  if (k === "noite") return "Noite";
  return null;
};

const pad = (n) => String(n).padStart(2, "0");

// Sem ano na data: usa o ano atual, ou o próximo se a data já passou há muito tempo
function montarData(dia, mes, ano) {
  const hoje = new Date();
  let y = ano ? Number(ano) : hoje.getFullYear();
  if (y < 100) y += 2000;
  if (!ano) {
    const limite = new Date(hoje.getTime() - 180 * 86400000);
    if (new Date(y, mes - 1, dia) < limite) y += 1;
  }
  const d = new Date(y, mes - 1, dia);
  if (d.getMonth() !== mes - 1 || d.getDate() !== dia) return null;
  return `${y}-${pad(mes)}-${pad(dia)}`;
}

const RE_DIA =
  /^(?:(?:seg|ter|qua|qui|sex|s[aá]b|dom)[a-zçê-]*\.?\s*,?\s*)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s*(?:\(.*\))?\s*:?$/i;

function vazio() {
  return { Acordar: [], Manhã: [], Tarde: [], Noite: [] };
}

function parseTexto(texto) {
  const dias = [];
  const avisos = [];
  let atual = null;
  let periodo = "Manhã";

  const linhas = String(texto || "").split(/\r?\n/);
  for (const bruta of linhas) {
    let l = bruta
      .replace(/```[a-z]*/gi, "")
      .replace(/\*\*/g, "")
      .replace(/^#+\s*/, "")
      .trim();
    if (!l) continue;
    l = l.replace(/^[-•*]\s+/, "").trim();
    if (!l) continue;

    const m = l.match(RE_DIA);
    if (m) {
      const data = montarData(Number(m[1]), Number(m[2]), m[3]);
      if (!data) {
        avisos.push(`Data inválida: ${l}`);
        atual = null;
        continue;
      }
      atual = dias.find((d) => d.data === data);
      if (!atual) {
        atual = { data, periodos: vazio() };
        dias.push(atual);
      }
      periodo = "Manhã";
      continue;
    }

    const p = normalizarPeriodo(l);
    if (p) {
      periodo = p;
      continue;
    }

    if (!atual) {
      avisos.push(`Sem data antes de: "${l}"`);
      continue;
    }
    atual.periodos[periodo].push(l);
  }
  return { dias, avisos };
}

function parseJson(obj) {
  const lista = Array.isArray(obj) ? obj : obj?.dias || obj?.semana || [];
  const dias = [];
  const avisos = [];
  for (const item of lista) {
    let data = item?.data || item?.date;
    if (typeof data === "string" && /^\d{1,2}\/\d{1,2}/.test(data)) {
      const m = data.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
      data = montarData(Number(m[1]), Number(m[2]), m[3]);
    }
    if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      avisos.push(`Dia sem data válida: ${JSON.stringify(item).slice(0, 40)}`);
      continue;
    }
    const fonte = item.periodos || item;
    const periodos = vazio();
    Object.keys(fonte).forEach((k) => {
      const p = normalizarPeriodo(k);
      if (!p) return;
      const v = fonte[k];
      const arr = Array.isArray(v) ? v : String(v || "").split(/\r?\n/);
      periodos[p] = arr.map((x) => String(x).trim()).filter(Boolean);
    });
    dias.push({ data, periodos });
  }
  return { dias, avisos };
}

export function lerRotinaImportada(entrada) {
  const t = String(entrada || "").trim();
  if (!t) return { dias: [], avisos: [] };
  if (t.startsWith("{") || t.startsWith("[")) {
    try {
      return parseJson(JSON.parse(t));
    } catch {
      return {
        dias: [],
        avisos: ["JSON inválido. Confira as vírgulas e aspas."],
      };
    }
  }
  return parseTexto(t);
}

export function contarTarefas(dia) {
  return PERIODOS_IMPORT.reduce((s, p) => s + dia.periodos[p].length, 0);
}
