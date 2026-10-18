import { supabase } from "./supabase";
import { PALAVRAS_INGLES as BASE } from "./palavrasIngles";

const CACHE = "df_banco_ingles";

// Lista compartilhada: começa com o arquivo local (reserva) e é
// substituída NO LUGAR pelo conteúdo da tabela ingles_palavras.
export const PALAVRAS_INGLES = [...BASE];

let carregado = false;

function aplicar(lista) {
  PALAVRAS_INGLES.splice(
    0,
    PALAVRAS_INGLES.length,
    ...lista.map((x) => ({
      en: x.en,
      pron: x.pron,
      pt: x.pt,
      ex: x.ex || "",
      cat: x.cat || "rotina",
    })),
  );
}

export async function carregarBanco() {
  if (carregado) return PALAVRAS_INGLES;
  try {
    const tudo = [];
    for (let de = 0; de < 20000; de += 1000) {
      const { data, error } = await supabase
        .from("ingles_palavras")
        .select("en,pron,pt,ex,cat")
        .eq("ativo", true)
        .order("id", { ascending: true })
        .range(de, de + 999);
      if (error) throw error;
      tudo.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    if (tudo.length > 0) {
      aplicar(tudo);
      carregado = true;
      try {
        localStorage.setItem(CACHE, JSON.stringify(tudo));
      } catch {
        /* sem cache, tudo bem */
      }
      return PALAVRAS_INGLES;
    }
  } catch {
    try {
      const salvo = JSON.parse(localStorage.getItem(CACHE) || "null");
      if (salvo?.length) aplicar(salvo);
    } catch {
      /* usa o arquivo local */
    }
  }
  return PALAVRAS_INGLES;
}
