import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";

function formatarData(date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().split("T")[0];
}

function getDaysLeft() {
  const hoje = new Date();
  const fimAno = new Date(hoje.getFullYear(), 11, 31);
  const diasRestantes = Math.ceil((fimAno - hoje) / 86400000);
  const diaDoAno = Math.ceil(
    (hoje - new Date(hoje.getFullYear(), 0, 1)) / 86400000,
  );
  const totalDias = hoje.getFullYear() % 4 === 0 ? 366 : 365;
  return { diasRestantes, pct: Math.round((diaDoAno / totalDias) * 100) };
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function HomeWP({
  user,
  onNavegar,
  treinando,
  treinoAtivo,
  divisao,
  onIniciarTreino,
}) {
  const [perfil, setPerfil] = useState(null);
  const [streak, setStreak] = useState(0);
  const [aguaHoje, setAguaHoje] = useState({ total: 0, meta: 2500 });
  const [pesoHoje, setPesoHoje] = useState(null);
  const [kcalHoje, setKcalHoje] = useState(0);
  const [kcalMeta, setKcalMeta] = useState(2000);
  const [passosHoje, setPassosHoje] = useState(0);
  const [passosMeta, setPassosMeta] = useState(10000);
  const [tarefas, setTarefas] = useState([]);
  const [proximoTreino, setProximoTreino] = useState("A");
  const [carregando, setCarregando] = useState(true);
  const [frase, setFrase] = useState(null);

  const hoje = formatarData(new Date());

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [
      { data: p },
      { data: h },
      { data: aguaRegs },
      { data: aguaMeta },
      { data: pesoRegs },
      { data: macrosData },
      { data: macrosMetaData },
      { data: passosData },
      { data: passosMetaData },
      { data: diasData },
      { data: frasesData },
    ] = await Promise.all([
      supabase.from("perfil").select("*").eq("user_id", user.id).single(),
      supabase
        .from("treinos_finalizados")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("agua_registro")
        .select("ml")
        .eq("user_id", user.id)
        .eq("data", hoje),
      supabase
        .from("agua_meta")
        .select("meta_ml")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("peso_registro")
        .select("*")
        .eq("user_id", user.id)
        .order("data", { ascending: false })
        .limit(1),
      supabase
        .from("macros_registro")
        .select("kcal")
        .eq("user_id", user.id)
        .eq("data", hoje),
      supabase
        .from("macros_meta")
        .select("meta_kcal")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("passos_registro")
        .select("passos")
        .eq("user_id", user.id)
        .eq("data", hoje)
        .single(),
      supabase
        .from("passos_meta")
        .select("meta_passos")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("rotina_dias")
        .select("id,data")
        .eq("user_id", user.id)
        .eq("data", hoje)
        .single(),
      supabase.from("frases").select("texto,autor"),
    ]);

    if (p) setPerfil(p);
    if (h) setStreak(calcularStreak(h));

    setAguaHoje({
      total: (aguaRegs || []).reduce((s, r) => s + r.ml, 0),
      meta: aguaMeta?.meta_ml || 2500,
    });
    if (pesoRegs?.[0]) setPesoHoje(Number(pesoRegs[0].peso));
    setKcalHoje((macrosData || []).reduce((s, r) => s + r.kcal, 0));
    if (macrosMetaData) setKcalMeta(macrosMetaData.meta_kcal);
    if (passosData) setPassosHoje(passosData.passos || 0);
    if (passosMetaData) setPassosMeta(passosMetaData.meta_passos);

    if (diasData) {
      const { data: tarefasData } = await supabase
        .from("rotina_tarefas")
        .select("*")
        .eq("dia_id", diasData.id)
        .eq("concluida", false)
        .limit(5);
      setTarefas(tarefasData || []);
    }

    if (frasesData && frasesData.length > 0) {
      setFrase(frasesData[new Date().getDate() % frasesData.length]);
    }

    // Próximo treino
    if (h && h.length > 0 && divisao) {
      const letras = divisao.split("");
      const idx = letras.indexOf(h[0]?.treino);
      setProximoTreino(letras[(idx + 1) % letras.length] || letras[0]);
    }

    setCarregando(false);
  }, [user.id, hoje]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function calcularStreak(hist) {
    if (!hist || hist.length === 0) return 1;
    const diasTreino = new Set(
      hist.map((t) => new Date(t.created_at).toLocaleDateString("pt-BR")),
    );
    diasTreino.add(new Date().toLocaleDateString("pt-BR"));
    let s = 0;
    for (let i = 0; i < 60; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      if (diasTreino.has(d.toLocaleDateString("pt-BR"))) s++;
      else if (i > 0) break;
    }
    return s;
  }

  const nome = perfil?.nome
    ? perfil.nome.split(" ")[0]
    : user.email.split("@")[0];
  const { diasRestantes } = getDaysLeft();
  const pctAgua = Math.min(
    100,
    Math.round((aguaHoje.total / aguaHoje.meta) * 100),
  );
  const pctKcal = Math.min(100, Math.round((kcalHoje / kcalMeta) * 100));
  const pctPassos = Math.min(100, Math.round((passosHoje / passosMeta) * 100));

  if (carregando)
    return (
      <div style={{ textAlign: "center", color: "#64748b", paddingTop: 60 }}>
        Carregando...
      </div>
    );

  return (
    <div className="wp-home">
      {/* Grid de tiles */}
      <div className="wp-grid">
        {/* Tile grande — saudação */}
        <div className="wp-tile wp-tile-2x2 wp-tile-purple" onClick={() => {}}>
          <div className="wp-tile-icon">🧱</div>
          <div className="wp-tile-main">
            {getGreeting()},<br />
            <strong>{nome}</strong>
          </div>
          <div className="wp-tile-sub">
            🔥 {streak} dia{streak !== 1 ? "s" : ""} seguidos
          </div>
        </div>

        {/* Tile médio — treino */}
        <div
          className="wp-tile wp-tile-1x2 wp-tile-green"
          onClick={() => onNavegar("treino")}
        >
          <div className="wp-tile-icon">⚔️</div>
          <div className="wp-tile-main">Treino {proximoTreino}</div>
          <div className="wp-tile-sub">
            {treinando ? "⏱ Em andamento" : "Próximo"}
          </div>
        </div>

        {/* Tile — água */}
        <div
          className="wp-tile wp-tile-1x1 wp-tile-blue"
          onClick={() => onNavegar("agua")}
        >
          <div className="wp-tile-icon">💧</div>
          <div className="wp-tile-val">
            {(aguaHoje.total / 1000).toFixed(1)}L
          </div>
          <div className="wp-tile-bar">
            <div style={{ width: `${pctAgua}%` }} />
          </div>
        </div>

        {/* Tile — peso */}
        <div
          className="wp-tile wp-tile-1x1 wp-tile-indigo"
          onClick={() => onNavegar("peso")}
        >
          <div className="wp-tile-icon">⚖️</div>
          <div className="wp-tile-val">
            {pesoHoje ? `${pesoHoje.toFixed(1)}kg` : "—"}
          </div>
          <div className="wp-tile-sub">peso</div>
        </div>

        {/* Tile — kcal */}
        <div
          className="wp-tile wp-tile-1x1 wp-tile-orange"
          onClick={() => onNavegar("macros")}
        >
          <div className="wp-tile-icon">🔥</div>
          <div className="wp-tile-val">{kcalHoje > 0 ? kcalHoje : "—"}</div>
          <div className="wp-tile-bar">
            <div style={{ width: `${pctKcal}%` }} />
          </div>
        </div>

        {/* Tile — passos */}
        <div
          className="wp-tile wp-tile-1x1 wp-tile-teal"
          onClick={() => onNavegar("passos")}
        >
          <div className="wp-tile-icon">👟</div>
          <div className="wp-tile-val">
            {passosHoje > 0 ? (passosHoje / 1000).toFixed(1) + "k" : "—"}
          </div>
          <div className="wp-tile-bar">
            <div style={{ width: `${pctPassos}%` }} />
          </div>
        </div>

        {/* Tile médio — tarefas */}
        <div
          className="wp-tile wp-tile-2x1 wp-tile-slate"
          onClick={() => onNavegar("rotina")}
        >
          <div className="wp-tile-icon">📋</div>
          {tarefas.length === 0 ? (
            <div className="wp-tile-sub">Sem tarefas hoje</div>
          ) : (
            <div className="wp-tile-list">
              {tarefas.slice(0, 3).map((t) => (
                <div key={t.id} className="wp-tile-list-item">
                  · {t.texto}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tile — frase */}
        <div className="wp-tile wp-tile-2x1 wp-tile-dark">
          <div className="wp-tile-frase">
            {frase
              ? `"${frase.texto.substring(0, 80)}${frase.texto.length > 80 ? "..." : ""}"`
              : ""}
          </div>
          {frase?.autor && <div className="wp-tile-sub">— {frase.autor}</div>}
        </div>

        {/* Tile — dias restantes */}
        <div className="wp-tile wp-tile-1x1 wp-tile-yellow" onClick={() => {}}>
          <div className="wp-tile-icon">⏳</div>
          <div className="wp-tile-val">{diasRestantes}</div>
          <div className="wp-tile-sub">dias p/ fim do ano</div>
        </div>

        {/* Tile — macros */}
        <div
          className="wp-tile wp-tile-1x1 wp-tile-pink"
          onClick={() => onNavegar("macros")}
        >
          <div className="wp-tile-icon">🍽️</div>
          <div className="wp-tile-val">{pctKcal}%</div>
          <div className="wp-tile-sub">meta kcal</div>
        </div>

        {/* Tile — suplementos */}
        <div
          className="wp-tile wp-tile-1x1 wp-tile-purple2"
          onClick={() => onNavegar("suplementos")}
        >
          <div className="wp-tile-icon">💊</div>
          <div className="wp-tile-val">Suplem.</div>
          <div className="wp-tile-sub">do dia</div>
        </div>

        {/* Tile — stats */}
        <div
          className="wp-tile wp-tile-1x1 wp-tile-green2"
          onClick={() => onNavegar("stats")}
        >
          <div className="wp-tile-icon">📊</div>
          <div className="wp-tile-val">Stats</div>
          <div className="wp-tile-sub">semana</div>
        </div>
      </div>
    </div>
  );
}
