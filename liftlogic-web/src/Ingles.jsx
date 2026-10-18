import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";
import { toast } from "./lib/toast";
import { PALAVRAS_INGLES, carregarBanco } from "./lib/bancoIngles";
import MontarFrase from "./MontarFrase";
import { Languages, Volume2, Flame } from "lucide-react";
import { TextToSpeech } from "@capacitor-community/text-to-speech";

const META_DIA = 5; // palavras revisadas pra contar o dia no streak
const NOVAS_POR_SESSAO = 5;
const INTERVALOS = [1, 2, 4, 8, 16, 30]; // dias por nível

function dataLocal(d) {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
}

function somarDias(base, n) {
  const d = new Date(base + "T12:00:00");
  d.setDate(d.getDate() + n);
  return dataLocal(d);
}

function calcStreak(dias, hojeStr) {
  const ok = new Set(dias.filter((d) => d.qtd >= META_DIA).map((d) => d.data));
  let cursor = ok.has(hojeStr) ? hojeStr : somarDias(hojeStr, -1);
  let n = 0;
  while (ok.has(cursor)) {
    n++;
    cursor = somarDias(cursor, -1);
  }
  return n;
}

function falar(texto) {
  TextToSpeech.speak({
    text: texto,
    lang: "en-US",
    rate: 0.9,
    pitch: 1.0,
    volume: 1.0,
    category: "ambient",
  }).catch(() => {
    try {
      if (!("speechSynthesis" in window)) return;
      const u = new SpeechSynthesisUtterance(texto);
      u.lang = "en-US";
      u.rate = 0.9;
      window.speechSynthesis.cancel();
      setTimeout(() => window.speechSynthesis.speak(u), 50);
    } catch {
      /* sem voz, tudo bem */
    }
  });
}

// só a primeira forma da palavra pra falar (ex: "go → went → gone" fala tudo trocando a seta)
const textoFalado = (p) => p.en.replace(/→/g, ",");

async function carregarTudo(userId) {
  await carregarBanco();
  const [prog, dias] = await Promise.all([
    supabase.from("ingles_progresso").select("*").eq("user_id", userId),
    supabase
      .from("ingles_dias")
      .select("*")
      .eq("user_id", userId)
      .order("data", { ascending: false })
      .limit(120),
  ]);
  return { progresso: prog.data || [], dias: dias.data || [] };
}

function montarFila(progresso, limiteNovas) {
  const hoje = dataLocal(new Date());
  const mapa = new Map(progresso.map((p) => [p.palavra, p]));
  const vencidas = PALAVRAS_INGLES.filter((w) => {
    const p = mapa.get(w.en);
    return p && p.proxima <= hoje;
  }).slice(0, 15);
  const naoVistas = PALAVRAS_INGLES.filter((w) => !mapa.has(w.en));
  const frasesNovas = naoVistas.filter((w) => w.cat === "frase");
  const palavrasNovas = naoVistas.filter((w) => w.cat !== "frase");
  const qFrases = Math.min(2, frasesNovas.length);
  const novas = [
    ...palavrasNovas.slice(0, limiteNovas - qFrases),
    ...frasesNovas.slice(0, qFrases),
  ].slice(0, limiteNovas);
  if (novas.length < limiteNovas) {
    const resto = naoVistas.filter((w) => !novas.includes(w));
    novas.push(...resto.slice(0, limiteNovas - novas.length));
  }
  return { vencidas, novas };
}

const card = {
  background: "linear-gradient(155deg, #1c2026, #17191d)",
  border: "1px solid #ffffff10",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
};

export function InglesHomeCard({ user, onAbrir, desativado }) {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    carregarTudo(user.id).then(({ progresso, dias }) => {
      const hoje = dataLocal(new Date());
      const { vencidas, novas } = montarFila(progresso, NOVAS_POR_SESSAO);
      const hojeQtd = dias.find((d) => d.data === hoje)?.qtd || 0;
      setInfo({
        streak: calcStreak(dias, hoje),
        pendentes: vencidas.length + novas.length,
        hojeQtd,
      });
    });
  }, [user.id]);

  if (!info) return null;
  const meta = info.hojeQtd >= META_DIA;

  return (
    <div
      className="home-card"
      onClick={() => !desativado && onAbrir()}
      style={{ cursor: "pointer" }}
    >
      <div className="home-section-title">🇺🇸 INGLÊS DO DIA</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 700 }}>
            {meta
              ? "Meta do dia batida ✅"
              : `${info.pendentes} palavras pra hoje`}
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            {info.hojeQtd}/{META_DIA} revisadas hoje
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            color: info.streak > 0 ? "#fb923c" : "#475569",
            fontWeight: 800,
            fontSize: 18,
          }}
        >
          <Flame size={18} /> {info.streak}
        </div>
      </div>
    </div>
  );
}

export default function Ingles({ user }) {
  const [progresso, setProgresso] = useState([]);
  const [dias, setDias] = useState([]);
  const [fila, setFila] = useState([]);
  const [revelado, setRevelado] = useState(false);
  const [qtdHoje, setQtdHoje] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [repetidas, setRepetidas] = useState({});
  const [modo, setModo] = useState("cartas");

  const hoje = dataLocal(new Date());

  const iniciar = useCallback(async () => {
    const { progresso: prog, dias: d } = await carregarTudo(user.id);
    setProgresso(prog);
    setDias(d);
    setQtdHoje(d.find((x) => x.data === hoje)?.qtd || 0);
    const { vencidas, novas } = montarFila(prog, NOVAS_POR_SESSAO);
    setFila([...vencidas, ...novas]);
    setRevelado(false);
    setRepetidas({});
    setCarregando(false);
  }, [user.id, hoje]);

  useEffect(() => {
    iniciar();
  }, [iniciar]);

  const responder = async (sei) => {
    const w = fila[0];
    if (!w) return;
    const atual = progresso.find((p) => p.palavra === w.en);
    const nivel = sei
      ? Math.min((atual?.nivel || 0) + 1, INTERVALOS.length)
      : 0;
    const proxima = somarDias(hoje, sei ? INTERVALOS[nivel - 1] : 1);
    const linha = {
      user_id: user.id,
      palavra: w.en,
      nivel,
      proxima,
      acertos: (atual?.acertos || 0) + (sei ? 1 : 0),
      erros: (atual?.erros || 0) + (sei ? 0 : 1),
    };
    const novaQtd = qtdHoje + 1;

    setProgresso((prev) => [...prev.filter((p) => p.palavra !== w.en), linha]);
    setQtdHoje(novaQtd);
    setDias((prev) => [
      ...prev.filter((x) => x.data !== hoje),
      { user_id: user.id, data: hoje, qtd: novaQtd },
    ]);
    setRevelado(false);

    // errou: volta pro fim da fila uma vez
    if (!sei && !repetidas[w.en]) {
      setRepetidas((r) => ({ ...r, [w.en]: true }));
      setFila((f) => [...f.slice(1), w]);
    } else {
      setFila((f) => f.slice(1));
    }

    if (novaQtd === META_DIA) toast("Meta do dia batida! 🔥", "success");

    const [r1, r2] = await Promise.all([
      supabase
        .from("ingles_progresso")
        .upsert([linha], { onConflict: "user_id,palavra" }),
      supabase
        .from("ingles_dias")
        .upsert([{ user_id: user.id, data: hoje, qtd: novaQtd }], {
          onConflict: "user_id,data",
        }),
    ]);
    if (r1.error || r2.error) toast((r1.error || r2.error).message, "error");
  };

  if (modo === "montar") {
    return (
      <MontarFrase
        user={user}
        onVoltar={() => {
          setModo("cartas");
          iniciar();
        }}
      />
    );
  }

  if (carregando) {
    return <div style={{ color: "#64748b", padding: 20 }}>Carregando...</div>;
  }

  const w = fila[0];
  const streak = calcStreak(dias, hoje);
  const dominadas = progresso.filter((p) => p.nivel >= 4).length;
  const total = PALAVRAS_INGLES.length;
  const restamNovas = PALAVRAS_INGLES.filter(
    (x) => !progresso.find((p) => p.palavra === x.en),
  ).length;

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <h2
        className="title-divisao"
        style={{
          margin: 0,
          fontSize: "1.2rem",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Languages size={20} color="#818cf8" />
        Inglês diário
      </h2>

      <button
        onClick={() => setModo("montar")}
        style={{
          background: "#6366f122",
          border: "1px solid #6366f1",
          borderRadius: 12,
          color: "#c7d2fe",
          fontWeight: 800,
          fontSize: 14,
          padding: "11px 0",
          cursor: "pointer",
        }}
      >
        🧩 Montar frases
      </button>

      <div style={{ display: "flex", gap: 10 }}>
        {[
          { v: `🔥 ${streak}`, l: "dias seguidos" },
          {
            v: `${Math.min(qtdHoje, META_DIA)}/${META_DIA}`,
            l: "meta de hoje",
          },
          { v: dominadas, l: `dominadas de ${total}` },
        ].map((s) => (
          <div
            key={s.l}
            style={{ ...card, flex: 1, padding: 12, textAlign: "center" }}
          >
            <div style={{ fontSize: 20, fontWeight: 800, color: "#f8fafc" }}>
              {s.v}
            </div>
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>
              {s.l}
            </div>
          </div>
        ))}
      </div>

      {w ? (
        <div
          style={{
            ...card,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            padding: 22,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#64748b",
              fontWeight: 800,
              letterSpacing: "0.08em",
            }}
          >
            {fila.length} NA FILA ·{" "}
            {{
              dev: "DEV",
              verbo: "VERBO IRREGULAR",
              frase: "FRASE",
              saude: "SAÚDE",
              viagem: "VIAGEM",
            }[w.cat] || "ROTINA"}
            {!progresso.find((p) => p.palavra === w.en) && " · NOVA"}
          </div>
          <div
            style={{
              fontSize: w.en.length > 22 ? 22 : 30,
              fontWeight: 800,
              color: "#f8fafc",
              textAlign: "center",
            }}
          >
            {w.en}
          </div>
          <div style={{ fontSize: 16, color: "#a5b4fc", fontWeight: 700 }}>
            🔊 {w.pron}
          </div>
          <button
            onClick={() => falar(textoFalado(w))}
            style={{
              background: "#6366f122",
              border: "1px solid #6366f1",
              borderRadius: 999,
              color: "#c7d2fe",
              padding: "8px 16px",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Volume2 size={15} /> Ouvir
          </button>

          {revelado ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, color: "#34d399", fontWeight: 800 }}>
                {w.pt}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#94a3b8",
                  marginTop: 6,
                  fontStyle: "italic",
                  cursor: "pointer",
                }}
                onClick={() => falar(w.ex)}
              >
                {w.ex ? `“${w.ex}” 🔈` : ""}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setRevelado(true)}
              style={{
                background: "transparent",
                border: "1px dashed #475569",
                borderRadius: 12,
                color: "#94a3b8",
                padding: "10px 20px",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Mostrar significado
            </button>
          )}

          <div
            style={{ display: "flex", gap: 10, width: "100%", marginTop: 6 }}
          >
            <button
              onClick={() => responder(false)}
              style={{
                flex: 1,
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.5)",
                borderRadius: 12,
                color: "#f87171",
                fontWeight: 800,
                fontSize: 15,
                padding: "13px 0",
                cursor: "pointer",
              }}
            >
              ✗ Não sei
            </button>
            <button
              onClick={() => responder(true)}
              style={{
                flex: 1,
                background: "rgba(16,185,129,0.15)",
                border: "1px solid rgba(16,185,129,0.5)",
                borderRadius: 12,
                color: "#34d399",
                fontWeight: 800,
                fontSize: 15,
                padding: "13px 0",
                cursor: "pointer",
              }}
            >
              ✓ Sei
            </button>
          </div>
        </div>
      ) : (
        <div style={{ ...card, textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 36 }}>🎉</div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "#f8fafc",
              margin: "6px 0",
            }}
          >
            Sessão concluída!
          </div>
          <div style={{ fontSize: 13, color: "#94a3b8" }}>
            {qtdHoje} revisões hoje · volte amanhã pra revisar o que ficou.
          </div>
          {restamNovas > 0 && (
            <button
              onClick={() => iniciar()}
              style={{
                marginTop: 14,
                background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                border: "none",
                borderRadius: 12,
                color: "#fff",
                fontWeight: 800,
                fontSize: 14,
                padding: "12px 20px",
                cursor: "pointer",
              }}
            >
              + Mais {Math.min(NOVAS_POR_SESSAO, restamNovas)} palavras novas
            </button>
          )}
        </div>
      )}
    </div>
  );
}
