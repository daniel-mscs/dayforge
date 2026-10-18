import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";
import { toast } from "./lib/toast";
import { PALAVRAS_INGLES, carregarBanco } from "./lib/bancoIngles";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { Volume2 } from "lucide-react";

const INTERVALOS = [1, 2, 4, 8, 16, 30];

const getFrases = () =>
  PALAVRAS_INGLES.filter((p) => {
    if (p.cat !== "frase") return false;
    const n = p.en.split(" ").length;
    return n >= 3 && n <= 9;
  });

function dataLocal(d) {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
}

function somarDias(base, n) {
  const d = new Date(base + "T12:00:00");
  d.setDate(d.getDate() + n);
  return dataLocal(d);
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
      /* sem voz */
    }
  });
}

// tira pontuação e deixa minúsculo (menos o "I"), pra não entregar a resposta
function limpar(token) {
  const t = token.replace(/[.,!?]/g, "");
  if (t === "I" || t.startsWith("I'")) return t;
  return t.toLowerCase();
}

function embaralhar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function novoExercicio(progresso, ultima) {
  const hoje = dataLocal(new Date());
  const FRASES = getFrases();
  const mapa = new Map(progresso.map((p) => [p.palavra, p]));
  const vencidas = FRASES.filter((f) => {
    const p = mapa.get(f.en);
    return p && p.proxima <= hoje;
  });
  const novas = FRASES.filter((f) => !mapa.has(f.en));
  const pool = [...vencidas, ...novas, ...FRASES].filter(
    (f) => f.en !== ultima,
  );
  const frase = pool[Math.floor(Math.random() * Math.min(pool.length, 8))];
  const tokens = frase.en.split(" ").map(limpar);
  const chips = embaralhar(tokens.map((t, i) => ({ id: i, t })));
  return { frase, chips, escolhidos: [] };
}

const card = {
  background: "linear-gradient(155deg, #1c2026, #17191d)",
  border: "1px solid #ffffff10",
  borderRadius: 16,
  padding: 18,
  boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
};

export default function MontarFrase({ user, onVoltar }) {
  const [progresso, setProgresso] = useState([]);
  const [qtdHoje, setQtdHoje] = useState(0);
  const [ex, setEx] = useState(null);
  const [resultado, setResultado] = useState(null); // null | "certo" | "errado"
  const [acertos, setAcertos] = useState(0);
  const [feitas, setFeitas] = useState(0);
  const hoje = dataLocal(new Date());

  useEffect(() => {
    Promise.all([
      carregarBanco(),
      supabase.from("ingles_progresso").select("*").eq("user_id", user.id),
      supabase
        .from("ingles_dias")
        .select("*")
        .eq("user_id", user.id)
        .eq("data", hoje),
    ]).then(([, p, d]) => {
      const prog = p.data || [];
      setProgresso(prog);
      setQtdHoje(d.data?.[0]?.qtd || 0);
      setEx(novoExercicio(prog, null));
    });
  }, [user.id, hoje]);

  const proxima = useCallback(() => {
    setResultado(null);
    setEx((atual) => novoExercicio(progresso, atual?.frase.en));
  }, [progresso]);

  const escolher = (chip) => {
    if (resultado) return;
    setEx((e) => ({
      ...e,
      chips: e.chips.filter((c) => c.id !== chip.id),
      escolhidos: [...e.escolhidos, chip],
    }));
  };

  const devolver = (chip) => {
    if (resultado) return;
    setEx((e) => ({
      ...e,
      escolhidos: e.escolhidos.filter((c) => c.id !== chip.id),
      chips: [...e.chips, chip],
    }));
  };

  const registrar = async (acertou) => {
    const w = ex.frase;
    const atual = progresso.find((p) => p.palavra === w.en);
    const nivel = acertou
      ? Math.min((atual?.nivel || 0) + 1, INTERVALOS.length)
      : 0;
    const linha = {
      user_id: user.id,
      palavra: w.en,
      nivel,
      proxima: somarDias(hoje, acertou ? INTERVALOS[nivel - 1] : 1),
      acertos: (atual?.acertos || 0) + (acertou ? 1 : 0),
      erros: (atual?.erros || 0) + (acertou ? 0 : 1),
    };
    const novaQtd = qtdHoje + 1;
    setProgresso((prev) => [...prev.filter((p) => p.palavra !== w.en), linha]);
    setQtdHoje(novaQtd);
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

  const verificar = () => {
    const montada = ex.escolhidos.map((c) => c.t).join(" ");
    const certa = ex.frase.en.split(" ").map(limpar).join(" ");
    const acertou = montada === certa;
    setResultado(acertou ? "certo" : "errado");
    setFeitas((n) => n + 1);
    if (acertou) setAcertos((n) => n + 1);
    registrar(acertou);
    falar(ex.frase.en);
  };

  if (!ex)
    return <div style={{ color: "#64748b", padding: 20 }}>Carregando...</div>;

  const completa = ex.chips.length === 0;
  const chipStyle = (cor) => ({
    background: `${cor}22`,
    border: `1px solid ${cor}`,
    borderRadius: 10,
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: 700,
    padding: "8px 12px",
    cursor: "pointer",
  });

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          onClick={onVoltar}
          style={{
            background: "transparent",
            border: "1px solid #ffffff1a",
            borderRadius: 10,
            color: "#94a3b8",
            fontSize: 13,
            fontWeight: 700,
            padding: "6px 12px",
            cursor: "pointer",
          }}
        >
          ← Cartas
        </button>
        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>
          {acertos}/{feitas} acertos · {qtdHoje} hoje
        </div>
      </div>

      <div
        style={{ ...card, display: "flex", flexDirection: "column", gap: 14 }}
      >
        <div
          style={{
            fontSize: 11,
            color: "#64748b",
            fontWeight: 800,
            letterSpacing: "0.08em",
          }}
        >
          MONTE A FRASE EM INGLÊS
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#f8fafc" }}>
          “{ex.frase.pt}”
        </div>

        <div
          style={{
            minHeight: 56,
            border: "1px dashed #475569",
            borderRadius: 12,
            padding: 8,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignContent: "flex-start",
            background:
              resultado === "certo"
                ? "rgba(16,185,129,0.1)"
                : resultado === "errado"
                  ? "rgba(239,68,68,0.1)"
                  : "transparent",
          }}
        >
          {ex.escolhidos.length === 0 && (
            <span style={{ color: "#475569", fontSize: 13, padding: 6 }}>
              Toque nas palavras abaixo na ordem certa
            </span>
          )}
          {ex.escolhidos.map((c) => (
            <button
              key={c.id}
              onClick={() => devolver(c)}
              style={chipStyle("#6366f1")}
            >
              {c.t}
            </button>
          ))}
        </div>

        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 8, minHeight: 44 }}
        >
          {ex.chips.map((c) => (
            <button
              key={c.id}
              onClick={() => escolher(c)}
              style={chipStyle("#64748b")}
            >
              {c.t}
            </button>
          ))}
        </div>

        {resultado && (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: resultado === "certo" ? "#34d399" : "#f87171",
              }}
            >
              {resultado === "certo" ? "Certo! 🎉" : "Quase! A resposta era:"}
            </div>
            <div
              style={{
                fontSize: 18,
                color: "#f8fafc",
                fontWeight: 700,
                marginTop: 4,
              }}
            >
              {ex.frase.en}
            </div>
            <div style={{ fontSize: 14, color: "#a5b4fc", marginTop: 4 }}>
              🔊 {ex.frase.pron}
            </div>
            <button
              onClick={() => falar(ex.frase.en)}
              style={{
                marginTop: 8,
                background: "#6366f122",
                border: "1px solid #6366f1",
                borderRadius: 999,
                color: "#c7d2fe",
                padding: "6px 14px",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Volume2 size={14} /> Ouvir
            </button>
          </div>
        )}

        {resultado ? (
          <button
            onClick={proxima}
            style={{
              background: "linear-gradient(135deg,#6366f1,#4f46e5)",
              border: "none",
              borderRadius: 12,
              color: "#fff",
              fontWeight: 800,
              fontSize: 15,
              padding: "13px 0",
              cursor: "pointer",
            }}
          >
            Próxima →
          </button>
        ) : (
          <button
            onClick={verificar}
            disabled={!completa}
            style={{
              background: completa
                ? "linear-gradient(135deg,#10b981,#059669)"
                : "#ffffff0d",
              border: "none",
              borderRadius: 12,
              color: completa ? "#fff" : "#64748b",
              fontWeight: 800,
              fontSize: 15,
              padding: "13px 0",
              cursor: completa ? "pointer" : "default",
            }}
          >
            Verificar
          </button>
        )}
      </div>
    </div>
  );
}
