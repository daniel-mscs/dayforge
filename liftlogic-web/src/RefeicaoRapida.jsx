import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./lib/supabase";
import { REFEICOES_OPTS, refeicaoPorHorario } from "./lib/refeicao";

function normalizar(t) {
  return (t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const round1 = (n) => Math.round(n * 10) / 10;

// Mesmo cálculo da aba Macros (valores do alimento são por 100 g)
function calcMacros(food, g) {
  const f = g / 100;
  return {
    kcal: Math.round(food.kcal * f),
    prot: round1(food.prot * f),
    carb: round1(food.carb * f),
    gord: round1(food.gord * f),
    vit_c: round1((food.vit_c || 0) * f),
    vit_d: round1((food.vit_d || 0) * f),
    calcio: round1((food.calcio || 0) * f),
    ferro: round1((food.ferro || 0) * f),
    fibra: round1((food.fibra || 0) * f),
  };
}

const lerCache = (chave) => {
  try {
    return JSON.parse(localStorage.getItem(chave));
  } catch {
    return null;
  }
};
const salvarCache = (chave, valor) => {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* sem espaço */
  }
};

const estiloItem = {
  display: "block",
  width: "100%",
  textAlign: "left",
  background: "#1f2533",
  border: "1px solid #ffffff0d",
  borderRadius: 10,
  padding: "10px 12px",
  cursor: "pointer",
  color: "#f8fafc",
};

// Busca na lista de alimentos (base + personalizados), igual à aba Macros.
// Lista e recentes ficam em cache para abrir na hora.
export default function RefeicaoRapida({ user, onSalvar, onManual }) {
  const chaveAlimentos = `df_alimentos_cache_${user.id}`;
  const chaveRecentes = `df_alimentos_recentes_${user.id}`;
  const [alimentos, setAlimentos] = useState(
    () => lerCache(chaveAlimentos) || [],
  );
  const [recentes, setRecentes] = useState(() => lerCache(chaveRecentes) || []);
  const [query, setQuery] = useState("");
  const [foodSel, setFoodSel] = useState(null);
  const [gramas, setGramas] = useState("");
  const [refeicao, setRefeicao] = useState(refeicaoPorHorario);

  useEffect(() => {
    let ativo = true;
    Promise.all([
      supabase
        .from("alimentos_base")
        .select("*")
        .order("nome", { ascending: true }),
      supabase.from("alimentos_custom").select("*").eq("user_id", user.id),
      supabase
        .from("macros_registro")
        .select("nome, gramas, created_at")
        .eq("user_id", user.id)
        .gt("gramas", 0)
        .order("created_at", { ascending: false })
        .limit(60),
    ]).then(([base, custom, ultimos]) => {
      if (!ativo) return;
      if (!base.error && !custom.error) {
        const lista = [
          ...(base.data || []),
          ...(custom.data || []).map((f) => ({ ...f, custom: true })),
        ];
        setAlimentos(lista);
        salvarCache(chaveAlimentos, lista);
      }
      if (!ultimos.error) {
        // Nomes distintos, do mais recente para o mais antigo, com a última gramagem usada
        const vistos = new Map();
        for (const r of ultimos.data || []) {
          if (!vistos.has(r.nome)) vistos.set(r.nome, r.gramas);
        }
        const lista = [...vistos]
          .slice(0, 8)
          .map(([nome, g]) => ({ nome, gramas: g }));
        setRecentes(lista);
        salvarCache(chaveRecentes, lista);
      }
    });
    return () => {
      ativo = false;
    };
  }, [user.id, chaveAlimentos, chaveRecentes]);

  const porNome = useMemo(() => {
    const m = new Map();
    for (const a of alimentos) m.set(a.nome, a);
    return m;
  }, [alimentos]);

  const sugestoes = useMemo(() => {
    const q = normalizar(query.trim());
    if (!q) return [];
    return alimentos.filter((a) => normalizar(a.nome).includes(q)).slice(0, 8);
  }, [alimentos, query]);

  const recentesValidos = recentes
    .map((r) => ({ food: porNome.get(r.nome), gramas: r.gramas }))
    .filter((r) => r.food);

  const selecionar = (food, gramasSugeridas) => {
    setFoodSel(food);
    setQuery(food.nome);
    setGramas(gramasSugeridas ? String(gramasSugeridas) : "");
  };

  const g = parseFloat(String(gramas).replace(",", "."));
  const preview = foodSel && g > 0 ? calcMacros(foodSel, g) : null;

  const jaSalvou = useRef(false);
  const salvar = () => {
    if (!preview || jaSalvou.current) return; // evita dois toques seguidos
    jaSalvou.current = true;
    onSalvar({ nome: foodSel.nome, gramas: g, refeicao, ...preview });
  };

  const infoAlimento = (a) =>
    `${a.kcal} kcal · P ${a.prot} · C ${a.carb} · G ${a.gord} /100g`;

  return (
    <div>
      {!foodSel && (
        <>
          <input
            type="text"
            placeholder="Buscar alimento... (ex: frango, arroz)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            autoComplete="off"
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginTop: 10,
              maxHeight: "38vh",
              overflowY: "auto",
            }}
          >
            {!query.trim() && recentesValidos.length > 0 && (
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#64748b",
                  letterSpacing: "0.08em",
                }}
              >
                RECENTES
              </div>
            )}
            {(query.trim()
              ? sugestoes.map((food) => ({ food }))
              : recentesValidos
            ).map(({ food, gramas: gSug }) => (
              <button
                key={food.nome}
                type="button"
                style={estiloItem}
                onClick={() => selecionar(food, gSug)}
              >
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  {food.nome}
                  {food.custom && (
                    <span
                      style={{ fontSize: 10, color: "#818cf8", marginLeft: 6 }}
                    >
                      personalizado
                    </span>
                  )}
                  {gSug ? (
                    <span
                      style={{ fontSize: 11, color: "#64748b", marginLeft: 6 }}
                    >
                      · {gSug}g da última vez
                    </span>
                  ) : null}
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  {infoAlimento(food)}
                </div>
              </button>
            ))}
            {query.trim() && sugestoes.length === 0 && (
              <div
                style={{ fontSize: 12, color: "#64748b", padding: "6px 2px" }}
              >
                {alimentos.length === 0
                  ? "Carregando alimentos..."
                  : "Nenhum alimento encontrado."}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onManual}
            style={{
              marginTop: 10,
              background: "none",
              border: "none",
              color: "#f59e0b",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              padding: 0,
            }}
          >
            Não achou? Lançar só as calorias
          </button>
        </>
      )}

      {foodSel && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            salvar();
          }}
        >
          <button
            type="button"
            onClick={() => setFoodSel(null)}
            style={{ ...estiloItem, borderColor: "#f59e0b55" }}
          >
            <div style={{ fontSize: 13, fontWeight: 700 }}>
              {foodSel.nome}{" "}
              <span style={{ color: "#64748b", fontWeight: 500 }}>
                · trocar
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
              {infoAlimento(foodSel)}
            </div>
          </button>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <input
              autoFocus
              type="text"
              inputMode="decimal"
              placeholder="Gramas"
              value={gramas}
              onChange={(e) => setGramas(e.target.value)}
              style={{ width: 110, flexShrink: 0 }}
            />
            <select
              value={refeicao}
              onChange={(e) => setRefeicao(e.target.value)}
            >
              {REFEICOES_OPTS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 10,
              fontSize: 13,
              fontWeight: 700,
              minHeight: 18,
            }}
          >
            {preview ? (
              <>
                <span style={{ color: "#f97316" }}>⚡ {preview.kcal} kcal</span>
                <span style={{ color: "#ef4444" }}>P {preview.prot}g</span>
                <span style={{ color: "#3b82f6" }}>C {preview.carb}g</span>
                <span style={{ color: "#eab308" }}>G {preview.gord}g</span>
              </>
            ) : (
              <span style={{ color: "#64748b", fontWeight: 500 }}>
                Digite as gramas
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={!preview}
            style={{
              marginTop: 12,
              width: "100%",
              background: preview ? "#f59e0b" : "#3f3f46",
              border: "none",
              borderRadius: 10,
              color: "#0a0a0a",
              fontSize: 14,
              fontWeight: 800,
              padding: 12,
              cursor: preview ? "pointer" : "default",
            }}
          >
            Adicionar
          </button>
        </form>
      )}
    </div>
  );
}
