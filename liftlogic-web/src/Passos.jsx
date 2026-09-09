import React, { useState, useEffect, useCallback } from "react";
import { toast } from "./lib/toast";
import { askConfirm } from "./lib/confirm";
import { supabase } from "./lib/supabase";
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

export default function Passos({ user, onAjuda }) {
  const [registros, setRegistros] = useState([]);
  const [meta, setMeta] = useState(10000);
  const [metaInput, setMetaInput] = useState("");
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [passosInput, setPassosInput] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [mostrarTooltip, setMostrarTooltip] = useState(false);

  const hoje = formatarData(new Date());
  const ultimos7 = getLast7Days();

  const buscarTudo = useCallback(async () => {
    setCarregando(true);
    const [{ data: regs }, { data: metaData }] = await Promise.all([
      supabase
        .from("passos_registro")
        .select("*")
        .eq("user_id", user.id)
        .gte("data", ultimos7[0])
        .order("data", { ascending: false }),
      supabase
        .from("passos_meta")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    setRegistros(regs || []);
    if (metaData) setMeta(metaData.meta_passos);
    setCarregando(false);
  }, [user.id]);

  useEffect(() => {
    buscarTudo();
  }, [buscarTudo]);

  const registrarPassos = async () => {
    const val = parseInt(passosInput);
    if (!val || val <= 0) {
      toast("Digite um valor válido!", "error");
      return;
    }

    const existing = registros.find((r) => r.data === hoje);
    if (existing) {
      if (!(await askConfirm("Já existe um registro hoje. Substituir?")))
        return;
      const { error } = await supabase
        .from("passos_registro")
        .update({ passos: val })
        .eq("id", existing.id);
      if (error) {
        toast("Erro: " + error.message, "error");
        return;
      }
      setRegistros((prev) =>
        prev.map((r) => (r.id === existing.id ? { ...r, passos: val } : r)),
      );
    } else {
      const { data, error } = await supabase
        .from("passos_registro")
        .insert([
          {
            user_id: user.id,
            data: hoje,
            passos: val,
          },
        ])
        .select();
      if (error) {
        toast("Erro: " + error.message, "error");
        return;
      }
      setRegistros((prev) => [data[0], ...prev]);
      if (val >= meta) await ganharXP(user.id, "meta_passos");
    }
    setPassosInput("");
  };

  const deletarRegistro = async (id) => {
    await supabase.from("passos_registro").delete().eq("id", id);
    setRegistros((prev) => prev.filter((r) => r.id !== id));
  };

  const salvarMeta = async () => {
    const val = parseInt(metaInput);
    if (!val || val < 100) {
      toast("Meta inválida!", "error");
      return;
    }
    await supabase
      .from("passos_meta")
      .upsert(
        { user_id: user.id, meta_passos: val },
        { onConflict: "user_id" },
      );
    setMeta(val);
    setMetaInput("");
    setEditandoMeta(false);
  };

  const hoje_reg = registros.find((r) => r.data === hoje);
  const passosHoje = hoje_reg?.passos || 0;
  const pct = Math.min(100, Math.round((passosHoje / meta) * 100));

  const mediaSemana = () => {
    const regs = registros.filter((r) => ultimos7.includes(r.data));
    if (regs.length === 0) return null;
    return Math.round(regs.reduce((s, r) => s + r.passos, 0) / regs.length);
  };
  const media = mediaSemana();

  if (carregando)
    return (
      <div style={{ textAlign: "center", color: "#64748b", paddingTop: 40 }}>
        Carregando seus passos... 👟
      </div>
    );

  return (
    <div className="passos-section">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h2 className="title-divisao" style={{ margin: 0 }}>
          👟 Passos Diários
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
                👟 Como usar
              </div>
              {[
                {
                  icon: "📱",
                  text: "Ao final do dia, registre quantos passos você deu. Use o contador do celular ou relógio.",
                },
                {
                  icon: "⚡",
                  text: "Botões rápidos: toque em 5k, 8k, 10k ou 12k para preencher o campo automaticamente.",
                },
                {
                  icon: "🎯",
                  text: "A OMS recomenda 10.000 passos/dia. Cada 1.000 passos queima ~40 kcal.",
                },
                {
                  icon: "📊",
                  text: "Barras verdes = meta atingida. Roxo = acima de 50%. Laranja = abaixo de 50%.",
                },
                {
                  icon: "🔥",
                  text: "Seus passos entram no cálculo do saldo calórico do dia na aba Macros.",
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

      {/* Card principal */}
      <div className="passos-main-card">
        <div className="passos-main-top">
          <div>
            <div className="passos-label">HOJE</div>
            <div className="passos-val">
              {passosHoje.toLocaleString("pt-BR")} <span>passos</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="passos-label">META</div>
            <div className="passos-meta-val">
              {meta.toLocaleString("pt-BR")}
            </div>
          </div>
        </div>
        <div className="passos-bar-bg">
          <div
            className="passos-bar-fill"
            style={{
              width: `${pct}%`,
              background:
                pct >= 100 ? "#10b981" : pct >= 50 ? "#6366f1" : "#f97316",
            }}
          />
        </div>
        <div className="passos-bar-pct">
          {pct}% da meta {pct >= 100 ? "🎉" : ""}
        </div>

        {/* Equivalências */}
        <div className="passos-equiv">
          <div className="passos-equiv-item">
            <span>📏</span>
            <div>
              <strong>{(passosHoje * 0.0008).toFixed(1)} km</strong>
              <small>distância aprox.</small>
            </div>
          </div>
          <div className="passos-equiv-item">
            <span>🔥</span>
            <div>
              <strong>{Math.round(passosHoje * 0.04)} kcal</strong>
              <small>queimadas aprox.</small>
            </div>
          </div>
          <div className="passos-equiv-item">
            <span>⏱️</span>
            <div>
              <strong>{Math.round(passosHoje / 100)} min</strong>
              <small>tempo aprox.</small>
            </div>
          </div>
        </div>
      </div>

      {/* Registrar */}
      <div className="passos-card">
        <div className="passos-card-title">REGISTRAR PASSOS</div>
        <div className="passos-input-row">
          <input
            type="number"
            placeholder="Ex: 8500"
            value={passosInput}
            onChange={(e) => setPassosInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") registrarPassos();
            }}
            min="1"
          />
          <button className="passos-btn-add" onClick={registrarPassos}>
            + Registrar
          </button>
        </div>
        <div className="passos-quick">
          {[5000, 8000, 10000, 12000].map((v) => (
            <button
              key={v}
              className="passos-quick-btn"
              onClick={() => setPassosInput(String(v))}
            >
              {v.toLocaleString("pt-BR")}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>
          💡 A OMS recomenda 10.000 passos por dia para adultos saudáveis.
        </p>
      </div>

      {/* Meta */}
      <div className="passos-card">
        <div className="passos-card-title-row">
          <div className="passos-card-title" style={{ margin: 0 }}>
            META DIÁRIA
          </div>
          {!editandoMeta && (
            <button
              className="peso-btn-alterar"
              onClick={() => setEditandoMeta(true)}
            >
              Alterar
            </button>
          )}
        </div>
        {!editandoMeta ? (
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "#f8fafc",
              marginTop: 8,
            }}
          >
            🎯 {meta.toLocaleString("pt-BR")} passos/dia
          </div>
        ) : (
          <div className="passos-input-row" style={{ marginTop: 8 }}>
            <input
              type="number"
              placeholder={`Meta atual: ${meta}`}
              value={metaInput}
              onChange={(e) => setMetaInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") salvarMeta();
              }}
              autoFocus
            />
            <button className="passos-btn-add" onClick={salvarMeta}>
              Salvar
            </button>
            <button
              className="peso-btn-cancelar"
              onClick={() => {
                setEditandoMeta(false);
                setMetaInput("");
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Média semanal */}
      {media && (
        <div className="passos-card">
          <div className="passos-card-title">MÉDIA 7 DIAS</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc" }}>
            {media.toLocaleString("pt-BR")}{" "}
            <span style={{ fontSize: 14, color: "#64748b" }}>passos/dia</span>
          </div>
          <div
            style={{
              fontSize: 12,
              color: media >= meta ? "#10b981" : "#f97316",
              marginTop: 4,
            }}
          >
            {media >= meta
              ? "✅ Acima da meta!"
              : `${(meta - media).toLocaleString("pt-BR")} passos abaixo da meta`}
          </div>
        </div>
      )}

      {/* Histórico 7 dias */}
      <div className="passos-card">
        <div className="passos-card-title">ÚLTIMOS 7 DIAS</div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart
            data={ultimos7.map((data) => {
              const reg = registros.find((r) => r.data === data);
              const val = reg?.passos || 0;
              const d = new Date(data + "T00:00:00");
              return {
                name: d.toLocaleDateString("pt-BR", {
                  weekday: "short",
                  day: "2-digit",
                }),
                passos: val,
              };
            })}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 10 }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                background: "#1a1d21",
                border: "1px solid #ffffff0d",
                borderRadius: 8,
                color: "#f8fafc",
                fontSize: 12,
              }}
              formatter={(v) => [`${v.toLocaleString("pt-BR")} passos`]}
            />
            <ReferenceLine y={meta} stroke="#6366f166" strokeDasharray="4 4" />
            <Bar dataKey="passos" radius={[4, 4, 0, 0]}>
              {ultimos7.map((data, i) => {
                const reg = registros.find((r) => r.data === data);
                const val = reg?.passos || 0;
                return (
                  <Cell
                    key={i}
                    fill={
                      val >= meta
                        ? "#10b981"
                        : val >= meta * 0.5
                          ? "#6366f1"
                          : "#f97316"
                    }
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ fontSize: 11, color: "#6366f1", marginTop: 4 }}>
          — meta: {meta.toLocaleString("pt-BR")} passos
        </div>
      </div>
    </div>
  );
}
