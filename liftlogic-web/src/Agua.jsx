import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";
import { toast } from "./lib/toast";
import {
  Droplet,
  Sofa,
  Dumbbell,
  Container,
  GlassWater,
  CupSoda,
} from "lucide-react";
import { SkeletonAgua } from "./lib/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from "recharts";
import { ganharXP } from "./lib/rpg";

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

export default function Agua({ user, onAjuda }) {
  const [registros, setRegistros] = useState([]);
  const [historico, setHistorico] = useState({});
  const [meta, setMeta] = useState(2500);
  const [metaInput, setMetaInput] = useState("");
  const [customMl, setCustomMl] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [perfil, setPerfil] = useState(null);
  const [editandoMetaAgua, setEditandoMetaAgua] = useState(false);
  const [mostrarTooltip, setMostrarTooltip] = useState(false);

  const hoje = formatarData(new Date());
  const ultimos7 = getLast7Days();

  const buscarTudo = useCallback(async () => {
    setCarregando(true);
    const [{ data: regs }, { data: metaData }, { data: perfilData }] =
      await Promise.all([
        supabase
          .from("agua_registro")
          .select("*")
          .eq("user_id", user.id)
          .gte("data", ultimos7[0])
          .order("data", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("agua_meta")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("perfil")
          .select("peso")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

    const hist = {};
    ultimos7.forEach((d) => {
      hist[d] = [];
    });
    (regs || []).forEach((r) => {
      if (!hist[r.data]) hist[r.data] = [];
      hist[r.data].push(r);
    });

    setHistorico(hist);
    const registrosHoje = (regs || []).filter((r) => r.data === hoje);
    setRegistros(registrosHoje);
    if (metaData) setMeta(metaData.meta_ml);
    if (perfilData) setPerfil(perfilData);
    setCarregando(false);
  }, [user.id]);

  useEffect(() => {
    buscarTudo();
  }, [buscarTudo]);

  const totalHoje = registros.reduce((sum, r) => sum + r.ml, 0);
  const pct = Math.min(100, Math.round((totalHoje / meta) * 100));

  const adicionarAgua = async (ml) => {
    if (!ml || ml <= 0) return;
    const hora = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const { data, error } = await supabase
      .from("agua_registro")
      .insert([{ user_id: user.id, data: hoje, ml: Number(ml), hora }])
      .select();
    if (error) {
      toast("Erro: " + error.message, "error");
      return;
    }
    const novoTotal = registros.reduce((s, r) => s + r.ml, 0) + Number(ml);
    if (novoTotal >= meta && registros.reduce((s, r) => s + r.ml, 0) < meta) {
      toast("🎉 Meta de água atingida!", "success");
      await ganharXP(user.id, "meta_agua");
    }
    setRegistros((prev) => [data[0], ...prev]);
    setHistorico((prev) => ({
      ...prev,
      [hoje]: [data[0], ...(prev[hoje] || [])],
    }));
    setCustomMl("");
  };

  const deletarRegistro = async (id) => {
    await supabase.from("agua_registro").delete().eq("id", id);
    setRegistros((prev) => prev.filter((r) => r.id !== id));
    setHistorico((prev) => ({
      ...prev,
      [hoje]: (prev[hoje] || []).filter((r) => r.id !== id),
    }));
  };

  const salvarMeta = async (novoMl) => {
    const val = Number(novoMl || metaInput);
    if (!val || val < 500) {
      toast("Meta inválida!", "warning");
      return;
    }
    await supabase
      .from("agua_meta")
      .upsert({ user_id: user.id, meta_ml: val }, { onConflict: "user_id" });
    setMeta(val);
    setMetaInput("");
    toast("Meta atualizada!", "success");
  };

  const sugerirMeta = (tipo) => {
    if (!perfil?.peso) {
      toast("Cadastre seu peso no perfil primeiro!", "warning");
      return;
    }
    const ml =
      tipo === "sedentario"
        ? Math.round(perfil.peso * 35)
        : Math.round(perfil.peso * 50);
    salvarMeta(ml);
  };

  if (carregando)
    return (
      <div className="agua-section">
        <SkeletonAgua />
      </div>
    );

  return (
    <div className="agua-section">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h2
          className="title-divisao"
          style={{
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Droplet
            size={20}
            color="#3b82f6"
            style={{ filter: "drop-shadow(0 0 6px rgba(59,130,246,0.5))" }}
          />
          Controle de Água
        </h2>
        <div style={{ position: "relative" }}>
          <button
            className="ajuda-shortcut-btn"
            onClick={() => setMostrarTooltip((v) => !v)}
          >
            ?
          </button>
          {mostrarTooltip && (
            <div
              onClick={() => setMostrarTooltip(false)}
              style={{ position: "fixed", inset: 0, zIndex: 998 }}
            />
          )}
          {mostrarTooltip && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 36,
                zIndex: 999,
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: 14,
                padding: "16px 18px",
                width: 280,
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: "#f8fafc",
                  marginBottom: 10,
                }}
              >
                💧 Como usar
              </div>
              {[
                {
                  icon: "🎯",
                  text: "Defina sua meta diária. Sedentário: peso × 35ml. Ativo (treina): peso × 50ml.",
                },
                {
                  icon: "🥤",
                  text: "Use os botões rápidos (180, 300, 500, 1000ml) ou digite um valor personalizado.",
                },
                {
                  icon: "📊",
                  text: "O gráfico mostra os últimos 7 dias. Barras verdes = meta atingida.",
                },
                {
                  icon: "🔄",
                  text: "Os registros resetam automaticamente a meia-noite.",
                },
                {
                  icon: "💡",
                  text: "Desidratação de 2% já reduz performance em até 20%. Beba antes de sentir sede!",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 10,
                    marginBottom: 8,
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ fontSize: 14, flexShrink: 0 }}>
                    {item.icon}
                  </span>
                  <span
                    style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}
                  >
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="agua-main-card">
        <div className="agua-main-top">
          <div>
            <div className="agua-main-label">CONSUMIDO HOJE</div>
            <div className="agua-main-val">
              {totalHoje.toLocaleString("pt-BR")} <span>ml</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="agua-main-label">META</div>
            <div className="agua-main-meta">
              {meta.toLocaleString("pt-BR")} ml
            </div>
          </div>
        </div>
        <div className="agua-bar-bg">
          <div
            className="agua-bar-fill"
            style={{
              width: `${pct}%`,
              background: pct >= 100 ? "#10b981" : "#3b82f6",
            }}
          />
        </div>
        <div className="agua-bar-pct">
          {pct}% da meta {pct >= 100 ? "✅" : ""}
        </div>
      </div>

      {(() => (
        <div className="agua-card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div className="agua-card-title" style={{ margin: 0 }}>
              Meta diária: {(meta / 1000).toFixed(1)}L
            </div>
            {!editandoMetaAgua && (
              <button
                className="peso-btn-alterar"
                onClick={() => setEditandoMetaAgua(true)}
              >
                Alterar
              </button>
            )}
          </div>
          {editandoMetaAgua && (
            <>
              {perfil?.peso && (
                <div className="agua-sugestoes" style={{ marginTop: 12 }}>
                  <button
                    className="agua-sug-btn"
                    onClick={() => {
                      sugerirMeta("sedentario");
                      setEditandoMetaAgua(false);
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <Sofa size={13} />
                      Sedentário
                    </span>
                    <strong>
                      {Math.round(perfil.peso * 35).toLocaleString("pt-BR")} ml
                    </strong>
                    <small>peso × 35ml</small>
                  </button>
                  <button
                    className="agua-sug-btn"
                    onClick={() => {
                      sugerirMeta("ativo");
                      setEditandoMetaAgua(false);
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <Dumbbell size={13} />
                      Ativo
                    </span>
                    <strong>
                      {Math.round(perfil.peso * 50).toLocaleString("pt-BR")} ml
                    </strong>
                    <small>peso × 50ml</small>
                  </button>
                </div>
              )}
              <div className="agua-meta-row" style={{ marginTop: 10 }}>
                <input
                  type="number"
                  placeholder="Meta personalizada (ml)"
                  value={metaInput}
                  onChange={(e) => setMetaInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      salvarMeta();
                      setEditandoMetaAgua(false);
                    }
                  }}
                  autoFocus
                />
                <button
                  className="agua-btn-salvar"
                  onClick={() => {
                    salvarMeta();
                    setEditandoMetaAgua(false);
                  }}
                >
                  Salvar
                </button>
                <button
                  className="peso-btn-cancelar"
                  onClick={() => {
                    setEditandoMetaAgua(false);
                    setMetaInput("");
                  }}
                >
                  ✕
                </button>
              </div>
            </>
          )}
        </div>
      ))()}

      <div className="agua-card">
        <div className="agua-card-title">Registrar consumo</div>
        <div className="agua-quick-grid">
          {[180, 300, 500, 1000].map((ml) => {
            const Icon =
              ml >= 1000
                ? Container
                : ml >= 500
                  ? GlassWater
                  : ml >= 300
                    ? CupSoda
                    : Droplet;
            return (
              <button
                key={ml}
                className="agua-quick-btn"
                onClick={() => adicionarAgua(ml)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Icon size={18} color="#3b82f6" />
                {ml}ml
              </button>
            );
          })}
        </div>
        <div className="agua-custom-row">
          <input
            type="number"
            placeholder="Outro valor (ml)"
            value={customMl}
            onChange={(e) => setCustomMl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") adicionarAgua(customMl);
            }}
          />
          <button
            className="agua-btn-salvar"
            onClick={() => adicionarAgua(customMl)}
          >
            + Adicionar
          </button>
        </div>
      </div>

      <div className="agua-card">
        <div className="agua-card-title">Registros de hoje</div>
        {registros.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ marginBottom: 8 }}>
              <Droplet size={36} color="#334155" />
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#f8fafc",
                marginBottom: 4,
              }}
            >
              Nenhum registro hoje
            </div>
            <div style={{ fontSize: 12, color: "#475569" }}>
              Use os botões acima para registrar seu consumo de água.
            </div>
          </div>
        ) : (
          <div className="agua-log">
            {registros.map((r) => (
              <div key={r.id} className="agua-log-item">
                <div className="agua-log-left">
                  <span className="agua-log-ml">+{r.ml} ml</span>
                  <span className="agua-log-hora">{r.hora}</span>
                </div>
                <button
                  className="agua-log-del"
                  onClick={() => deletarRegistro(r.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="agua-card">
        <div className="agua-card-title">Últimos 7 dias</div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart
            data={ultimos7.map((data) => {
              const regs = historico[data] || [];
              const total = regs.reduce((s, r) => s + r.ml, 0);
              const d = new Date(data + "T00:00:00");
              return {
                name: d.toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                }),
                ml: total,
              };
            })}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 10 }}
              tickFormatter={(v) => `${(v / 1000).toFixed(1)}L`}
            />
            <Tooltip
              contentStyle={{
                background: "#1a1d21",
                border: "1px solid #ffffff0d",
                borderRadius: 8,
                color: "#f8fafc",
                fontSize: 12,
              }}
              formatter={(v) => [`${(v / 1000).toFixed(1)}L`]}
            />
            <ReferenceLine y={meta} stroke="#10b98166" strokeDasharray="4 4" />
            <Bar
              dataKey="ml"
              radius={[4, 4, 0, 0]}
              fill="#3b82f6"
              label={false}
            >
              {ultimos7.map((data, i) => {
                const regs = historico[data] || [];
                const total = regs.reduce((s, r) => s + r.ml, 0);
                return (
                  <Cell key={i} fill={total >= meta ? "#10b981" : "#3b82f6"} />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ fontSize: 11, color: "#10b981", marginTop: 4 }}>
          — meta: {(meta / 1000).toFixed(1)}L
        </div>
      </div>
    </div>
  );
}
