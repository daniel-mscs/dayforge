import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";
import { ganharXP } from "./lib/rpg";

const HABITOS_FIXOS = [
  { id: "treino", label: "Treino", icon: "🏋️" },
  { id: "estudo", label: "Estudo", icon: "📚" },
  { id: "sono", label: "Sono ok", icon: "😴" },
  { id: "hidratacao", label: "Hidratação", icon: "💧" },
  { id: "alimentacao", label: "Alimentação", icon: "🥗" },
  { id: "produtividade", label: "Produtividade", icon: "🎯" },
];

const EMOJIS = [
  "⭐",
  "🏃",
  "📖",
  "🧘",
  "💪",
  "🎨",
  "🎵",
  "🌿",
  "🧹",
  "💊",
  "🛁",
  "☀️",
  "🌙",
  "🍎",
  "🥤",
  "✍️",
  "🧠",
  "❤️",
  "🔥",
  "💰",
  "🎯",
  "🚴",
  "🏊",
  "🧗",
  "🤸",
];

function formatarData(date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().split("T")[0];
}

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return formatarData(d);
  });
}

export default function Habitos({ user, compact = false }) {
  const [registros, setRegistros] = useState({});
  const [customHabitos, setCustom] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [streak, setStreak] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [novoLabel, setNovoLabel] = useState("");
  const [novoIcon, setNovoIcon] = useState("⭐");
  const [showEmojis, setShowEmojis] = useState(false);

  const hoje = formatarData(new Date());
  const ultimos7 = getLast7Days();

  const buscarTudo = useCallback(async () => {
    setCarregando(true);
    const [{ data: regs }, { data: customs }] = await Promise.all([
      supabase
        .from("habitos_registro")
        .select("*")
        .eq("user_id", user.id)
        .gte("data", ultimos7[0]),
      supabase
        .from("habitos_custom")
        .select("*")
        .eq("user_id", user.id)
        .order("ordem", { ascending: true }),
    ]);

    const mapa = {};
    (regs || []).forEach((r) => {
      if (!mapa[r.data]) mapa[r.data] = {};
      mapa[r.data][r.habito] = r.concluido;
    });
    setRegistros(mapa);
    setCustom(customs || []);
    setStreak(calcularStreak(mapa));
    setCarregando(false);
  }, [user.id]);

  useEffect(() => {
    buscarTudo();
  }, [buscarTudo]);

  const todosHabitos = [
    ...HABITOS_FIXOS,
    ...customHabitos.map((c) => ({
      id: `custom_${c.id}`,
      label: c.label,
      icon: c.icon,
      customId: c.id,
    })),
  ];

  function calcularStreak(mapa) {
    let s = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = formatarData(d);
      const h = mapa[key] || {};
      if (Object.values(h).some((v) => v)) s++;
      else if (i > 0) break;
    }
    return s;
  }

  const toggleHabito = async (habitoId) => {
    const atual = registros[hoje]?.[habitoId] || false;
    const novo = !atual;
    setRegistros((prev) => ({
      ...prev,
      [hoje]: { ...prev[hoje], [habitoId]: novo },
    }));
    await supabase.from("habitos_registro").upsert(
      {
        user_id: user.id,
        data: hoje,
        habito: habitoId,
        concluido: novo,
      },
      { onConflict: "user_id,data,habito" },
    );
    if (novo) await ganharXP(user.id, "habito_concluido");
    const novoMapa = {
      ...registros,
      [hoje]: { ...registros[hoje], [habitoId]: novo },
    };
    setStreak(calcularStreak(novoMapa));
  };

  const adicionarCustom = async () => {
    if (!novoLabel.trim()) {
      alert("Digite o nome do hábito!");
      return;
    }
    const { data, error } = await supabase
      .from("habitos_custom")
      .insert([
        {
          user_id: user.id,
          label: novoLabel.trim(),
          icon: novoIcon,
          ordem: customHabitos.length,
        },
      ])
      .select();
    if (error) {
      alert("Erro: " + error.message);
      return;
    }
    setCustom((prev) => [...prev, data[0]]);
    setNovoLabel("");
    setNovoIcon("⭐");
    setShowForm(false);
    setShowEmojis(false);
  };

  const deletarCustom = async (customId) => {
    if (!confirm("Remover este hábito?")) return;
    await supabase.from("habitos_custom").delete().eq("id", customId);
    setCustom((prev) => prev.filter((c) => c.id !== customId));
  };

  const habitosHoje = registros[hoje] || {};
  const concluidosHoje = todosHabitos.filter((h) => habitosHoje[h.id]).length;

  if (carregando)
    return (
      <div style={{ textAlign: "center", color: "#64748b", paddingTop: 20 }}>
        Forjando seus hábitos... 🧱
      </div>
    );

  // MODO COMPACTO
  if (compact) {
    return (
      <div className="habitos-compact">
        <div className="habitos-compact-header">
          <div className="habitos-compact-prog">
            <span style={{ fontSize: 13, color: "#94a3b8" }}>
              {concluidosHoje}/{todosHabitos.length} hábitos hoje
            </span>
          </div>
          <div className="habitos-compact-bar-bg">
            <div
              className="habitos-compact-bar-fill"
              style={{
                width: `${(concluidosHoje / todosHabitos.length) * 100}%`,
              }}
            />
          </div>
        </div>
        <div className="habitos-grid">
          {todosHabitos.map((h) => {
            const done = !!habitosHoje[h.id];
            return (
              <div
                key={h.id}
                className={`habito-item ${done ? "done" : ""}`}
                onClick={() => toggleHabito(h.id)}
              >
                <span className="habito-icon">{h.icon}</span>
                <span className="habito-label">{h.label}</span>
                <span className="habito-check">{done ? "✓" : "○"}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // MODO COMPLETO
  return (
    <div className="habitos-section">
      {/* Header */}
      <div className="habitos-header">
        <div>
          <div className="habitos-hoje-label">HOJE</div>
          <div className="habitos-hoje-data">
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            })}
          </div>
        </div>
        {streak > 0 && (
          <div className="habitos-streak">
            🔥 {streak} dia{streak > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Progresso */}
      <div className="habitos-prog-card">
        <div className="habitos-prog-top">
          <span className="habitos-prog-num">
            {concluidosHoje}
            <span>/{todosHabitos.length}</span>
          </span>
          <span className="habitos-prog-label">hábitos hoje</span>
        </div>
        <div className="habitos-prog-bar-bg">
          <div
            className="habitos-prog-bar-fill"
            style={{
              width: `${(concluidosHoje / todosHabitos.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Grid de hábitos */}
      <div className="habitos-grid">
        {todosHabitos.map((h) => {
          const done = !!habitosHoje[h.id];
          return (
            <div
              key={h.id}
              className={`habito-item ${done ? "done" : ""}`}
              onClick={() => toggleHabito(h.id)}
            >
              <span className="habito-icon">{h.icon}</span>
              <span className="habito-label">{h.label}</span>
              {h.customId ? (
                <button
                  className="habito-del-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    deletarCustom(h.customId);
                  }}
                >
                  ×
                </button>
              ) : (
                <span className="habito-check">{done ? "✓" : "○"}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Adicionar hábito */}
      <div className="habitos-add-section">
        {!showForm ? (
          <button className="habitos-btn-add" onClick={() => setShowForm(true)}>
            + Adicionar hábito personalizado
          </button>
        ) : (
          <div className="habitos-form">
            <div className="habitos-form-row">
              <button
                className="habitos-emoji-btn"
                onClick={() => setShowEmojis(!showEmojis)}
              >
                {novoIcon}
              </button>
              <input
                type="text"
                placeholder="Nome do hábito"
                value={novoLabel}
                onChange={(e) => setNovoLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") adicionarCustom();
                }}
                autoFocus
              />
              <button className="habitos-btn-salvar" onClick={adicionarCustom}>
                +
              </button>
              <button
                className="habitos-btn-cancelar"
                onClick={() => {
                  setShowForm(false);
                  setShowEmojis(false);
                  setNovoLabel("");
                }}
              >
                ✕
              </button>
            </div>
            {showEmojis && (
              <div className="habitos-emoji-picker">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    className={`habitos-emoji-opt ${novoIcon === e ? "selected" : ""}`}
                    onClick={() => {
                      setNovoIcon(e);
                      setShowEmojis(false);
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Histórico 7 dias */}
      <div className="habitos-historico">
        <div className="habitos-hist-title">ÚLTIMOS 7 DIAS</div>
        <div className="habitos-hist-grid">
          {ultimos7.map((data) => {
            const h = registros[data] || {};
            const count = todosHabitos.filter((hab) => h[hab.id]).length;
            const isHoje = data === hoje;
            const d = new Date(data + "T00:00:00");
            return (
              <div key={data} className="habitos-hist-dia">
                <div className="habitos-hist-weekday">
                  {d.toLocaleDateString("pt-BR", { weekday: "narrow" })}
                </div>
                <div
                  className={`habitos-hist-dot ${count === 0 ? "zero" : count <= 2 ? "low" : count <= 4 ? "mid" : "high"} ${isHoje ? "hoje" : ""}`}
                >
                  {count > 0 ? count : ""}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
