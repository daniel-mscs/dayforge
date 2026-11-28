import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";
import { useTravado } from "./lib/useTravado";
import { toast } from "./lib/toast";
import { ganharXP } from "./lib/rpg";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

function formatarData(date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().split("T")[0];
}

// MET (Metabolic Equivalent of Task) por atividade
// kcal = MET × peso(kg) × tempo(horas)
const ATIVIDADES = [
  { id: "Corrida", emoji: "🏃", label: "Corrida", met: 9.8 },
  { id: "Caminhada", emoji: "🚶", label: "Caminhada", met: 3.5 },
  { id: "Bike", emoji: "🚴", label: "Bike", met: 7.5 },
  { id: "Natação", emoji: "🏊", label: "Natação", met: 8.0 },
  { id: "Elíptico", emoji: "⚙️", label: "Elíptico", met: 5.0 },
  { id: "Esteira", emoji: "🏃", label: "Esteira", met: 8.5 },
  { id: "HIIT", emoji: "⚡", label: "HIIT", met: 8.0 },
  { id: "Funcional", emoji: "💪", label: "Funcional", met: 6.0 },
  { id: "Remo", emoji: "🚣", label: "Remo", met: 7.0 },
  { id: "Pular Corda", emoji: "🪢", label: "Pular Corda", met: 11.0 },
  { id: "Escalada", emoji: "🧗", label: "Escalada", met: 8.0 },
  { id: "Surf", emoji: "🏄", label: "Surf", met: 5.0 },
  { id: "Muay Thai", emoji: "🥊", label: "Muay Thai", met: 10.0 },
  { id: "Boxe", emoji: "🥊", label: "Boxe", met: 9.5 },
  { id: "Jiu-Jitsu", emoji: "🥋", label: "Jiu-Jitsu", met: 9.0 },
  { id: "Karatê", emoji: "🥋", label: "Karatê", met: 8.5 },
  { id: "MMA", emoji: "🥊", label: "MMA", met: 10.5 },
  { id: "Lutas", emoji: "🥋", label: "Lutas (geral)", met: 9.5 },
  { id: "Futebol", emoji: "⚽", label: "Futebol", met: 7.0 },
  { id: "Basquete", emoji: "🏀", label: "Basquete", met: 6.5 },
  { id: "Tênis", emoji: "🎾", label: "Tênis", met: 7.3 },
  { id: "Vôlei", emoji: "🏐", label: "Vôlei", met: 4.0 },
  { id: "Dança", emoji: "💃", label: "Dança", met: 5.0 },
  { id: "Yoga", emoji: "🧘", label: "Yoga", met: 2.5 },
  { id: "Pilates", emoji: "🤸", label: "Pilates", met: 3.0 },
  { id: "Crossfit", emoji: "🏋️", label: "Crossfit", met: 8.5 },
  { id: "Outro", emoji: "🏅", label: "Outro", met: 5.0 },
];

function calcularKcal(tipo, duracaoMin, pesoKg) {
  const ativ = ATIVIDADES.find((a) => a.id === tipo);
  if (!ativ || !duracaoMin || !pesoKg) return 0;
  return Math.round(ativ.met * pesoKg * (duracaoMin / 60));
}

export default function Cardio({ user }) {
  const [registros, setRegistros] = useState([]);
  const [perfil, setPerfil] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [celebrando, setCelebrando] = useState(false);
  const [msgCelebracao, setMsgCelebracao] = useState("");
  const [form, setForm] = useState({
    tipo: "Corrida",
    duracao: "",
    kcalOverride: "",
    observacao: "",
  });

  const hoje = formatarData(new Date());

  const buscarTudo = useCallback(async () => {
    setCarregando(true);
    const inicioMes = new Date();
    inicioMes.setDate(1);
    const inicioStr = formatarData(inicioMes);

    const [{ data: regs }, { data: perfilData }] = await Promise.all([
      supabase
        .from("cardio_registro")
        .select("*")
        .eq("user_id", user.id)
        .gte("data", inicioStr)
        .order("created_at", { ascending: false }),
      supabase.from("perfil").select("peso").eq("user_id", user.id).single(),
    ]);

    setRegistros(regs || []);
    if (perfilData) setPerfil(perfilData);
    setCarregando(false);
  }, [user.id]);

  useEffect(() => {
    buscarTudo();
  }, [buscarTudo]);

  const kcalPreview = (() => {
    if (!form.kcalOverride && form.duracao && perfil?.peso) {
      return calcularKcal(form.tipo, parseInt(form.duracao), perfil.peso);
    }
    return form.kcalOverride ? parseInt(form.kcalOverride) : null;
  })();

  const ativSelecionada = ATIVIDADES.find((a) => a.id === form.tipo);

  const [registrar] = useTravado(async () => {
    if (!form.duracao) {
      toast("Informe a duração!", "warning");
      return;
    }
    const duracaoMin = parseInt(form.duracao);
    if (!duracaoMin || duracaoMin <= 0) {
      toast("Duração inválida!", "warning");
      return;
    }

    const kcalFinal = form.kcalOverride
      ? parseInt(form.kcalOverride)
      : calcularKcal(form.tipo, duracaoMin, perfil?.peso || 70);

    const { data: novo, error } = await supabase
      .from("cardio_registro")
      .insert([
        {
          user_id: user.id,
          data: hoje,
          tipo: form.tipo,
          duracao_min: duracaoMin,
          kcal: kcalFinal,
          observacao: form.observacao || null,
        },
      ])
      .select();

    if (error) {
      toast(error.message, "error");
      return;
    }

    setRegistros((prev) => [novo[0], ...prev]);
    setForm((p) => ({ ...p, duracao: "", kcalOverride: "", observacao: "" }));
    await ganharXP(user.id, "treino_finalizado");
    const mensagens = [
      "Cardio feito! Seu coração agradece. ❤️",
      "Mais uma sessão na conta. Consistência é tudo! 🔥",
      "Suor é gordura chorando. Continue assim! 💪",
      "Enquanto outros descansavam, você estava correndo. Respeito! ⚡",
      "Cada minuto de cardio é um tijolo na sua saúde. 🧱",
      "Seu pulmão tá mais forte do que ontem. 🏃",
      "Cardio concluído. Missão cumprida! 🏅",
    ];
    setMsgCelebracao(mensagens[Math.floor(Math.random() * mensagens.length)]);
    setCelebrando(true);
    setTimeout(() => setCelebrando(false), 3000);
  });

  const deletar = async (id) => {
    await supabase.from("cardio_registro").delete().eq("id", id);
    setRegistros((prev) => prev.filter((r) => r.id !== id));
  };

  // Stats do mês
  const totalMin = registros.reduce((s, r) => s + r.duracao_min, 0);
  const totalKcal = registros.reduce((s, r) => s + (r.kcal || 0), 0);
  const totalSessoes = registros.length;

  // Dados do gráfico — últimos 10
  const dadosGraf = [...registros]
    .reverse()
    .slice(-10)
    .map((r) => ({
      name: new Date(r.data + "T00:00:00").toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
      kcal: r.kcal || 0,
      min: r.duracao_min,
    }));

  const tooltipStyle = {
    background: "#1e2126",
    border: "1px solid #6366f133",
    borderRadius: 10,
    color: "#f8fafc",
    fontSize: 12,
  };

  if (carregando)
    return (
      <div style={{ textAlign: "center", color: "#64748b", paddingTop: 40 }}>
        Carregando cardio... 🏃
      </div>
    );

  // — overlay de celebração —
  if (celebrando)
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.88)",
        }}
      >
        <style>{`
          @keyframes cardioPop {
            0%   { transform: scale(0.5); opacity: 0; }
            60%  { transform: scale(1.15); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes cardioFloat {
            0%   { transform: translateY(0); opacity: 1; }
            100% { transform: translateY(-40px); opacity: 0; }
          }
        `}</style>
        <div
          style={{
            animation: "cardioPop 0.5s cubic-bezier(0.16,1,0.3,1)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 80, lineHeight: 1, marginBottom: 16 }}>
            🏃
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "#f8fafc",
              marginBottom: 8,
            }}
          >
            Cardio Registrado!
          </div>
          <div
            style={{
              fontSize: 15,
              color: "#94a3b8",
              marginBottom: 24,
              maxWidth: 280,
              lineHeight: 1.6,
            }}
          >
            {msgCelebracao}
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#f59e0b22",
              border: "1px solid #f59e0b44",
              borderRadius: 99,
              padding: "10px 24px",
            }}
          >
            <span style={{ fontSize: 20 }}>⭐</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#f59e0b" }}>
              +50 XP
            </span>
          </div>
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              overflow: "hidden",
            }}
          >
            {["🏃", "🔥", "❤️", "⚡", "💪", "🏅", "✨"].map((e, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${10 + i * 13}%`,
                  top: `${20 + (i % 3) * 20}%`,
                  fontSize: 24 + (i % 3) * 8,
                  animation: `cardioFloat ${1.5 + i * 0.2}s ease ${i * 0.1}s infinite`,
                }}
              >
                {e}
              </div>
            ))}
          </div>
        </div>
      </div>
    );

  if (false)
    return (
      <div style={{ textAlign: "center", color: "#64748b", paddingTop: 40 }}>
        Carregando cardio... 🏃
      </div>
    );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        paddingBottom: 80,
      }}
    >
      <h2 className="title-divisao">🏃 Cardio</h2>

      {/* Stats do mês */}
      {totalSessoes > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 10,
          }}
        >
          {[
            {
              label: "SESSÕES",
              val: totalSessoes,
              color: "#6366f1",
              icon: "🏅",
            },
            { label: "MINUTOS", val: totalMin, color: "#10b981", icon: "⏱️" },
            {
              label: "KCAL",
              val: totalKcal.toLocaleString("pt-BR"),
              color: "#f59e0b",
              icon: "🔥",
            },
          ].map((c, i) => (
            <div
              key={i}
              style={{
                background: "#1a1d21",
                border: "1px solid #ffffff0d",
                borderRadius: 12,
                padding: 12,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 4 }}>{c.icon}</div>
              <div
                style={{
                  fontSize: 9,
                  color: "#64748b",
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                }}
              >
                {c.label}
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: c.color,
                  marginTop: 2,
                }}
              >
                {c.val}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulário */}
      <div
        style={{
          background: "#1a1d21",
          border: "1px solid #ffffff0d",
          borderRadius: 16,
          padding: 18,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: "#64748b",
            fontWeight: 800,
            letterSpacing: "0.08em",
            marginBottom: 16,
          }}
        >
          REGISTRAR CARDIO
        </div>

        {/* Grid de atividades */}
        <div
          style={{
            fontSize: 11,
            color: "#64748b",
            marginBottom: 8,
            fontWeight: 700,
          }}
        >
          ATIVIDADE
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 6,
            marginBottom: 16,
          }}
        >
          {ATIVIDADES.map((a) => {
            const sel = form.tipo === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setForm((p) => ({ ...p, tipo: a.id }))}
                style={{
                  background: sel ? "#6366f122" : "#24282d",
                  border: `1px solid ${sel ? "#6366f1" : "#ffffff0d"}`,
                  borderRadius: 10,
                  padding: "8px 4px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 18 }}>{a.emoji}</span>
                <span
                  style={{
                    fontSize: 9,
                    color: sel ? "#818cf8" : "#475569",
                    fontWeight: 600,
                    textAlign: "center",
                    lineHeight: 1.2,
                  }}
                >
                  {a.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* MET info */}
        {ativSelecionada && (
          <div
            style={{
              background: "#6366f110",
              border: "1px solid #6366f122",
              borderRadius: 8,
              padding: "8px 12px",
              marginBottom: 14,
              fontSize: 12,
              color: "#818cf8",
            }}
          >
            ⚡ {ativSelecionada.label} — MET {ativSelecionada.met} ·{" "}
            {perfil?.peso
              ? `~${calcularKcal(form.tipo, 30, perfil.peso)} kcal/30min`
              : "cadastre seu peso no perfil para ver o cálculo"}
          </div>
        )}

        {/* Duração */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                color: "#64748b",
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              DURAÇÃO (min)
            </div>
            <input
              type="number"
              placeholder="Ex: 45"
              value={form.duracao}
              onChange={(e) =>
                setForm((p) => ({ ...p, duracao: e.target.value }))
              }
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                color: "#64748b",
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              KCAL{" "}
              <span style={{ color: "#334155", fontWeight: 400 }}>
                (sobrescrever)
              </span>
            </div>
            <input
              type="number"
              placeholder={kcalPreview ? `Auto: ${kcalPreview}` : "Ex: 300"}
              value={form.kcalOverride}
              onChange={(e) =>
                setForm((p) => ({ ...p, kcalOverride: e.target.value }))
              }
              style={{ width: "100%" }}
            />
          </div>
        </div>

        {/* Preview kcal */}
        {kcalPreview !== null && form.duracao && (
          <div
            style={{
              background: "#10b98115",
              border: "1px solid #10b98133",
              borderRadius: 8,
              padding: "8px 12px",
              marginBottom: 14,
              fontSize: 13,
              color: "#10b981",
              fontWeight: 600,
            }}
          >
            🔥 Estimativa: <strong>{kcalPreview} kcal</strong>
            {!form.kcalOverride && " (calculado automaticamente)"}
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 11,
              color: "#64748b",
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            OBSERVAÇÃO (opcional)
          </div>
          <input
            type="text"
            placeholder="Ex: 5km no parque, aula na academia..."
            value={form.observacao}
            onChange={(e) =>
              setForm((p) => ({ ...p, observacao: e.target.value }))
            }
            style={{ width: "100%" }}
          />
        </div>

        <button
          onClick={registrar}
          style={{
            width: "100%",
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            border: "none",
            borderRadius: 12,
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            padding: 14,
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(99,102,241,0.3)",
          }}
        >
          + Registrar Cardio
        </button>
      </div>

      {/* Gráfico */}
      {dadosGraf.length >= 2 && (
        <div
          style={{
            background: "#1a1d21",
            border: "1px solid #ffffff0d",
            borderRadius: 16,
            padding: 16,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "#64748b",
              fontWeight: 800,
              letterSpacing: "0.08em",
              marginBottom: 12,
            }}
          >
            🔥 KCAL POR SESSÃO
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={dadosGraf}>
              <defs>
                <linearGradient id="gradCardio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                  <stop offset="100%" stopColor="#d97706" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 9 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 9 }} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v, n) => [
                  n === "kcal" ? `${v} kcal` : `${v} min`,
                  n === "kcal" ? "Kcal" : "Duração",
                ]}
                cursor={{ fill: "#ffffff08" }}
              />
              <Bar
                dataKey="kcal"
                fill="url(#gradCardio)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Lista */}
      {registros.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🏃</div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#f8fafc",
              marginBottom: 6,
            }}
          >
            Nenhum cardio este mês
          </div>
          <div style={{ fontSize: 13, color: "#475569" }}>
            Registre sua primeira sessão acima!
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              fontSize: 10,
              color: "#64748b",
              fontWeight: 800,
              letterSpacing: "0.08em",
            }}
          >
            HISTÓRICO DO MÊS
          </div>
          {registros.map((r) => {
            const ativ = ATIVIDADES.find((a) => a.id === r.tipo);
            return (
              <div
                key={r.id}
                style={{
                  background: "#1a1d21",
                  border: "1px solid #ffffff0d",
                  borderLeft: "3px solid #f59e0b",
                  borderRadius: 12,
                  padding: "12px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div
                    style={{ fontSize: 14, fontWeight: 600, color: "#f8fafc" }}
                  >
                    {ativ?.emoji || "🏅"} {r.tipo}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#64748b",
                      marginTop: 3,
                      display: "flex",
                      gap: 8,
                    }}
                  >
                    <span>⏱️ {r.duracao_min} min</span>
                    <span>🔥 {r.kcal} kcal</span>
                    {r.observacao && <span>· {r.observacao}</span>}
                  </div>
                  <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>
                    {new Date(r.data + "T00:00:00").toLocaleDateString(
                      "pt-BR",
                      { weekday: "short", day: "2-digit", month: "2-digit" },
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deletar(r.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ef4444",
                    cursor: "pointer",
                    opacity: 0.4,
                    fontSize: 18,
                    padding: "0 4px",
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
