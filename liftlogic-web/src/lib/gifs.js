// Casamento entre o nome de um exercício e os GIFs do banco (exercicio_gifs).
const STOP = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "com",
  "no",
  "na",
  "nos",
  "nas",
  "em",
  "a",
  "o",
  "e",
  "para",
  "por",
  "the",
  "with",
]);

export function normalizar(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function radical(t) {
  if (t.length > 4 && t.endsWith("es")) return t.slice(0, -2);
  if (t.length > 3 && t.endsWith("s")) return t.slice(0, -1);
  return t;
}

function tokens(s) {
  return normalizar(s)
    .split(" ")
    .filter((t) => t && !STOP.has(t) && !/^\d+$/.test(t))
    .map(radical);
}

// Pontua todos os GIFs contra o nome do exercício (maior = mais parecido).
export function rankearGifs(nome, gifs) {
  const alvo = normalizar(nome);
  const tAlvo = new Set(tokens(nome));
  if (tAlvo.size === 0) return [];
  const lista = [];
  for (const g of gifs) {
    const tG = new Set(tokens(g.nome));
    if (tG.size === 0) continue;
    let comum = 0;
    tAlvo.forEach((t) => {
      if (tG.has(t)) comum++;
    });
    if (comum === 0) continue;
    const dice = (2 * comum) / (tAlvo.size + tG.size);
    const subconjunto = comum === tAlvo.size || comum === tG.size;
    const nomeG = normalizar(g.nome);
    const exato = nomeG === alvo;
    lista.push({
      gif: g,
      score: exato ? 2 : dice,
      subconjunto: exato || subconjunto,
      tam: nomeG.length,
    });
  }
  lista.sort(
    (a, b) =>
      b.score - a.score ||
      a.tam - b.tam ||
      a.gif.nome.localeCompare(b.gif.nome),
  );
  return lista;
}

// Melhor GIF automático (ou null se nada parecido o bastante).
export function acharGif(nome, gifs) {
  const melhor = rankearGifs(nome, gifs).find(
    (r) => r.subconjunto && r.score >= 0.5,
  );
  return melhor ? melhor.gif : null;
}

// Busca manual: todas as palavras digitadas precisam estar no nome.
export function buscarGifs(texto, gifs, limite = 30) {
  const t = tokens(texto);
  if (t.length === 0) return [];
  return gifs
    .filter((g) => {
      const tG = new Set(tokens(g.nome));
      return t.every((x) => tG.has(x));
    })
    .slice(0, limite);
}
