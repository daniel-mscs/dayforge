import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./lib/supabase";
import { toast } from "./lib/toast";
import { askConfirm } from "./lib/confirm";
import { ganharXP } from "./lib/rpg";
import { Timer, Play, Pause, Square, RotateCcw, Trash2 } from "lucide-react";

const CHAVE_TIMER = "df_foco_timer";
const OPCOES_FOCO = [15, 25, 45, 60];
const OPCOES_PAUSA = [5, 10, 15];
const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function dataLocal(d) {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
}

function segundaDaSemana(base = new Date()) {
  const d = new Date(base);
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmtMin(min) {
  const m = Math.round(min);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}min` : `${h}h`;
}

function fmtRelogio(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function lerTimerSalvo() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_TIMER) || "null");
  } catch {
    return null;
  }
}

function apitar() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.25, 0.5].forEach((delay) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.value = 0.15;
      o.connect(g);
      g.connect(ctx.destination);
      o.start(ctx.currentTime + delay);
      o.stop(ctx.currentTime + delay + 0.18);
    });
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  } catch {
    /* sem áudio, tudo bem */
  }
}

const card = {
  background: "linear-gradient(155deg, #1c2026, #17191d)",
  border: "1px solid #ffffff10",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
};

const chip = (ativo, cor = "#6366f1") => ({
  background: ativo ? `${cor}33` : "#0f1115",
  border: ativo ? `1px solid ${cor}` : "1px solid #ffffff14",
  borderRadius: 999,
  color: ativo ? "#f8fafc" : "#94a3b8",
  fontSize: 12,
  fontWeight: 700,
  padding: "6px 12px",
  cursor: "pointer",
});

export default function Foco({ user }) {
  const [duracaoFoco, setDuracaoFoco] = useState(25);
  const [duracaoPausa, setDuracaoPausa] = useState(5);
  const [modo, setModo] = useState("foco"); // foco | pausa
  const [estado, setEstado] = useState("parado"); // parado | rodando | pausado
  const [restanteMs, setRestanteMs] = useState(25 * 60000);
  const [materia, setMateria] = useState("");
  const [sessoes, setSessoes] = useState([]);
  const fimEmRef = useRef(0);
  const jaFinalizou = useRef(false);

  const buscar = useCallback(async () => {
    const desde = new Date();
    desde.setDate(desde.getDate() - 35);
    const { data, error } = await supabase
      .from("foco_sessoes")
      .select("*")
      .eq("user_id", user.id)
      .gte("data", dataLocal(desde))
      .order("created_at", { ascending: false });
    if (error) toast(error.message, "error");
    setSessoes(data || []);
  }, [user.id]);

  const registrarSessao = useCallback(
    async (mat, minutos, completa) => {
      if (minutos < 1) return;
      const { data, error } = await supabase
        .from("foco_sessoes")
        .insert([
          {
            user_id: user.id,
            materia: (mat || "").trim() || "Geral",
            minutos,
            data: dataLocal(new Date()),
          },
        ])
        .select();
      if (error) return toast(error.message, "error");
      setSessoes((prev) => [...data, ...prev]);
      if (completa && minutos >= 15) {
        const hoje = dataLocal(new Date());
        const completasHoje = [...data, ...sessoes].filter(
          (s) => s.data === hoje && s.minutos >= 15,
        ).length;
        // XP só nas 4 primeiras sessões do dia (evita farmar)
        if (completasHoje <= 4) ganharXP(user.id, "foco_concluido");
      }
    },
    [user.id, sessoes],
  );

  const salvarTimer = (extra) => {
    localStorage.setItem(
      CHAVE_TIMER,
      JSON.stringify({
        modo,
        estado,
        materia,
        duracaoFoco,
        duracaoPausa,
        fimEm: fimEmRef.current,
        restanteMs,
        ...extra,
      }),
    );
  };

  // ao abrir: busca histórico e restaura o timer que ficou rodando
  useEffect(() => {
    buscar();
    const salvo = lerTimerSalvo();
    if (!salvo) return;
    setDuracaoFoco(salvo.duracaoFoco || 25);
    setDuracaoPausa(salvo.duracaoPausa || 5);
    setMateria(salvo.materia || "");
    setModo(salvo.modo || "foco");
    if (salvo.estado === "rodando") {
      const resta = salvo.fimEm - Date.now();
      if (resta > 0) {
        fimEmRef.current = salvo.fimEm;
        setRestanteMs(resta);
        setEstado("rodando");
      } else {
        // terminou enquanto você estava fora
        localStorage.removeItem(CHAVE_TIMER);
        if (salvo.modo === "foco") {
          registrarSessao(salvo.materia, salvo.duracaoFoco || 25, true);
          toast(
            "Sessão de foco concluída enquanto você estava fora ✅",
            "success",
          );
          setModo("pausa");
          setRestanteMs((salvo.duracaoPausa || 5) * 60000);
        } else {
          setModo("foco");
          setRestanteMs((salvo.duracaoFoco || 25) * 60000);
        }
      }
    } else if (salvo.estado === "pausado") {
      setRestanteMs(salvo.restanteMs);
      setEstado("pausado");
    } else {
      setRestanteMs(
        (salvo.modo === "pausa" ? salvo.duracaoPausa : salvo.duracaoFoco) *
          60000,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const concluir = useCallback(async () => {
    if (jaFinalizou.current) return;
    jaFinalizou.current = true;
    localStorage.removeItem(CHAVE_TIMER);
    apitar();
    setEstado("parado");
    if (modo === "foco") {
      await registrarSessao(materia, duracaoFoco, true);
      toast("Sessão concluída! 🎯 Hora da pausa.", "success");
      setModo("pausa");
      setRestanteMs(duracaoPausa * 60000);
    } else {
      toast("Pausa acabou. Bora de novo? 💪", "success");
      setModo("foco");
      setRestanteMs(duracaoFoco * 60000);
    }
  }, [modo, materia, duracaoFoco, duracaoPausa, registrarSessao]);

  useEffect(() => {
    if (estado !== "rodando") return;
    jaFinalizou.current = false;
    const tick = () => {
      const resta = fimEmRef.current - Date.now();
      if (resta <= 0) {
        setRestanteMs(0);
        concluir();
      } else {
        setRestanteMs(resta);
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [estado, concluir]);

  const iniciar = () => {
    const base =
      estado === "pausado"
        ? restanteMs
        : (modo === "foco" ? duracaoFoco : duracaoPausa) * 60000;
    fimEmRef.current = Date.now() + base;
    jaFinalizou.current = false;
    setRestanteMs(base);
    setEstado("rodando");
    salvarTimer({ estado: "rodando", fimEm: fimEmRef.current });
  };

  const pausar = () => {
    const resta = Math.max(0, fimEmRef.current - Date.now());
    setRestanteMs(resta);
    setEstado("pausado");
    salvarTimer({ estado: "pausado", restanteMs: resta });
  };

  const resetar = () => {
    localStorage.removeItem(CHAVE_TIMER);
    setEstado("parado");
    setRestanteMs((modo === "foco" ? duracaoFoco : duracaoPausa) * 60000);
  };

  // encerra antes do fim: registra o tempo já feito (sem XP)
  const encerrarAntes = async () => {
    if (modo !== "foco") return resetar();
    const totalMs = duracaoFoco * 60000;
    const feitoMs =
      estado === "rodando"
        ? totalMs - Math.max(0, fimEmRef.current - Date.now())
        : totalMs - restanteMs;
    const minutos = Math.floor(feitoMs / 60000);
    localStorage.removeItem(CHAVE_TIMER);
    setEstado("parado");
    setRestanteMs(totalMs);
    if (minutos >= 1) {
      await registrarSessao(materia, minutos, false);
      toast(`Registrei ${minutos} min de foco.`, "success");
    }
  };

  const escolherDuracao = (min, tipo) => {
    if (estado !== "parado") return;
    if (tipo === "foco") {
      setDuracaoFoco(min);
      if (modo === "foco") setRestanteMs(min * 60000);
    } else {
      setDuracaoPausa(min);
      if (modo === "pausa") setRestanteMs(min * 60000);
    }
  };

  const trocarModo = (novo) => {
    if (estado !== "parado") return;
    setModo(novo);
    setRestanteMs((novo === "foco" ? duracaoFoco : duracaoPausa) * 60000);
  };

  const apagarSessao = async (s) => {
    const ok = await askConfirm(
      `Apagar ${fmtMin(s.minutos)} de "${s.materia}"?`,
    );
    if (!ok) return;
    await supabase.from("foco_sessoes").delete().eq("id", s.id);
    setSessoes((prev) => prev.filter((x) => x.id !== s.id));
  };

  // ── estatísticas ──
  const hojeStr = dataLocal(new Date());
  const seg = segundaDaSemana();
  const segAnterior = new Date(seg);
  segAnterior.setDate(seg.getDate() - 7);
  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(seg);
    d.setDate(seg.getDate() + i);
    return dataLocal(d);
  });
  const minutosDoDia = (data) =>
    sessoes.filter((s) => s.data === data).reduce((t, s) => t + s.minutos, 0);
  const porDia = diasSemana.map(minutosDoDia);
  const totalSemana = porDia.reduce((a, b) => a + b, 0);
  const totalHoje = minutosDoDia(hojeStr);
  const inicioAnt = dataLocal(segAnterior);
  const totalSemanaAnt = sessoes
    .filter((s) => s.data >= inicioAnt && s.data < diasSemana[0])
    .reduce((t, s) => t + s.minutos, 0);
  const maxDia = Math.max(...porDia, 1);
  const porMateria = {};
  sessoes
    .filter((s) => s.data >= diasSemana[0])
    .forEach((s) => {
      porMateria[s.materia] = (porMateria[s.materia] || 0) + s.minutos;
    });
  const listaMaterias = Object.entries(porMateria).sort((a, b) => b[1] - a[1]);
  const freq = {};
  sessoes.forEach((s) => {
    freq[s.materia] = (freq[s.materia] || 0) + 1;
  });
  const materiasRecentes = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([m]) => m);

  // ── anel do timer ──
  const totalMs = (modo === "foco" ? duracaoFoco : duracaoPausa) * 60000;
  const pct = Math.max(0, Math.min(1, 1 - restanteMs / totalMs));
  const R = 88;
  const C = 2 * Math.PI * R;
  const corModo = modo === "foco" ? "#6366f1" : "#10b981";

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
        <Timer size={20} color="#818cf8" />
        Foco e estudo
      </h2>

      <div
        style={{
          ...card,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <button
            style={chip(modo === "foco")}
            onClick={() => trocarModo("foco")}
          >
            🎯 Foco
          </button>
          <button
            style={chip(modo === "pausa", "#10b981")}
            onClick={() => trocarModo("pausa")}
          >
            ☕ Pausa
          </button>
        </div>

        <div style={{ position: "relative", width: 210, height: 210 }}>
          <svg width="210" height="210" viewBox="0 0 210 210">
            <circle
              cx="105"
              cy="105"
              r={R}
              stroke="#ffffff0f"
              strokeWidth="10"
              fill="none"
            />
            <circle
              cx="105"
              cy="105"
              r={R}
              stroke={corModo}
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - pct)}
              transform="rotate(-90 105 105)"
              style={{ transition: "stroke-dashoffset 0.5s linear" }}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: 44,
                fontWeight: 800,
                color: "#f8fafc",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {fmtRelogio(restanteMs)}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#64748b",
                fontWeight: 700,
                letterSpacing: "0.08em",
              }}
            >
              {estado === "rodando"
                ? "EM ANDAMENTO"
                : estado === "pausado"
                  ? "PAUSADO"
                  : "PRONTO"}
            </div>
          </div>
        </div>

        {modo === "foco" && (
          <div style={{ width: "100%" }}>
            <input
              value={materia}
              onChange={(e) => setMateria(e.target.value)}
              disabled={estado === "rodando"}
              placeholder="O que você vai estudar? (ex: Algoritmos)"
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "#0f1115",
                border: "1px solid #ffffff14",
                borderRadius: 10,
                color: "#f8fafc",
                fontSize: 14,
                padding: "10px 12px",
              }}
            />
            {materiasRecentes.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  marginTop: 8,
                }}
              >
                {materiasRecentes.map((m) => (
                  <button
                    key={m}
                    style={chip(materia === m)}
                    onClick={() => estado !== "rodando" && setMateria(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            justifyContent: "center",
            opacity: estado === "parado" ? 1 : 0.4,
          }}
        >
          {(modo === "foco" ? OPCOES_FOCO : OPCOES_PAUSA).map((min) => (
            <button
              key={min}
              style={chip(
                (modo === "foco" ? duracaoFoco : duracaoPausa) === min,
                corModo,
              )}
              onClick={() => escolherDuracao(min, modo)}
            >
              {min} min
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, width: "100%" }}>
          {estado === "rodando" ? (
            <button
              onClick={pausar}
              style={{
                flex: 1,
                background: "rgba(245,158,11,0.15)",
                border: "1px solid rgba(245,158,11,0.5)",
                borderRadius: 12,
                color: "#fbbf24",
                fontWeight: 800,
                fontSize: 15,
                padding: "13px 0",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Pause size={16} /> Pausar
            </button>
          ) : (
            <button
              onClick={iniciar}
              style={{
                flex: 1,
                background: `linear-gradient(135deg, ${corModo}, ${modo === "foco" ? "#4f46e5" : "#059669"})`,
                border: "none",
                borderRadius: 12,
                color: "#fff",
                fontWeight: 800,
                fontSize: 15,
                padding: "13px 0",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Play size={16} />{" "}
              {estado === "pausado" ? "Continuar" : "Iniciar"}
            </button>
          )}
          {estado !== "parado" && (
            <>
              <button
                onClick={encerrarAntes}
                title={
                  modo === "foco"
                    ? "Encerrar e registrar o que já fez"
                    : "Encerrar pausa"
                }
                style={{
                  background: "transparent",
                  border: "1px solid #ffffff1a",
                  borderRadius: 12,
                  color: "#94a3b8",
                  padding: "0 16px",
                  cursor: "pointer",
                }}
              >
                <Square size={16} />
              </button>
              <button
                onClick={resetar}
                title="Zerar sem registrar"
                style={{
                  background: "transparent",
                  border: "1px solid #ffffff1a",
                  borderRadius: 12,
                  color: "#94a3b8",
                  padding: "0 16px",
                  cursor: "pointer",
                }}
              >
                <RotateCcw size={16} />
              </button>
            </>
          )}
        </div>
        <div style={{ fontSize: 11, color: "#64748b", textAlign: "center" }}>
          Sessão completa de 15+ min dá XP (até 4 por dia). ■ encerra e registra
          o que você já fez. ↺ zera sem registrar.
        </div>
      </div>

      <div style={card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "#64748b",
            }}
          >
            ESTA SEMANA
          </div>
          <div style={{ fontSize: 11, color: "#64748b" }}>
            Hoje: {fmtMin(totalHoje)}
          </div>
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "#f8fafc",
            margin: "4px 0",
          }}
        >
          {fmtMin(totalSemana)}
        </div>
        {totalSemanaAnt > 0 && (
          <div
            style={{
              fontSize: 11,
              color: totalSemana >= totalSemanaAnt ? "#34d399" : "#f87171",
            }}
          >
            {totalSemana >= totalSemanaAnt ? "▲" : "▼"}{" "}
            {fmtMin(Math.abs(totalSemana - totalSemanaAnt))} vs semana passada (
            {fmtMin(totalSemanaAnt)})
          </div>
        )}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 6,
            height: 90,
            marginTop: 14,
          }}
        >
          {porDia.map((min, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                height: "100%",
                justifyContent: "flex-end",
              }}
            >
              <div style={{ fontSize: 9, color: "#64748b" }}>
                {min > 0 ? fmtMin(min) : ""}
              </div>
              <div
                style={{
                  width: "100%",
                  height: `${Math.max(min > 0 ? 6 : 2, (min / maxDia) * 60)}px`,
                  background:
                    diasSemana[i] === hojeStr
                      ? "linear-gradient(180deg,#818cf8,#6366f1)"
                      : min > 0
                        ? "#4f46e5aa"
                        : "#ffffff0d",
                  borderRadius: 4,
                }}
              />
              <div
                style={{
                  fontSize: 10,
                  color: diasSemana[i] === hojeStr ? "#a5b4fc" : "#64748b",
                  fontWeight: 700,
                }}
              >
                {DIAS[i]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {listaMaterias.length > 0 && (
        <div style={card}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "#64748b",
              marginBottom: 10,
            }}
          >
            POR MATÉRIA (SEMANA)
          </div>
          {listaMaterias.map(([m, min]) => (
            <div key={m} style={{ marginBottom: 8 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  color: "#e2e8f0",
                  marginBottom: 3,
                }}
              >
                <span>{m}</span>
                <strong>{fmtMin(min)}</strong>
              </div>
              <div
                style={{
                  height: 5,
                  background: "#ffffff0d",
                  borderRadius: 999,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${(min / listaMaterias[0][1]) * 100}%`,
                    height: "100%",
                    background: "#6366f1",
                    borderRadius: 999,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {sessoes.length > 0 && (
        <div style={card}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "#64748b",
              marginBottom: 6,
            }}
          >
            ÚLTIMAS SESSÕES
          </div>
          {sessoes.slice(0, 8).map((s) => (
            <div
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 0",
                borderTop: "1px solid #ffffff08",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "#e2e8f0" }}>
                  {s.materia}
                </div>
                <div style={{ fontSize: 10, color: "#64748b" }}>
                  {s.data.split("-").reverse().slice(0, 2).join("/")}
                </div>
              </div>
              <strong style={{ fontSize: 13, color: "#a5b4fc" }}>
                {fmtMin(s.minutos)}
              </strong>
              <button
                onClick={() => apagarSessao(s)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#7f1d1d",
                  cursor: "pointer",
                  padding: 4,
                }}
                aria-label="Apagar sessão"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}