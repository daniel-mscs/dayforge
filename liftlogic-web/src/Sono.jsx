import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";
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

function calcularHoras(dormiu, acordou) {
  if (!dormiu || !acordou) return null;
  const [hD, mD] = dormiu.split(":").map(Number);
  const [hA, mA] = acordou.split(":").map(Number);
  let minutos = hA * 60 + mA - (hD * 60 + mD);
  if (minutos < 0) minutos += 24 * 60;
  return (minutos / 60).toFixed(1);
}

function qualidadeLabel(q) {
  const map = {
    1: "😴 Péssimo",
    2: "😟 Ruim",
    3: "😐 Regular",
    4: "😊 Bom",
    5: "🤩 Ótimo",
  };
  return map[q] || "—";
}

function qualidadeCor(q) {
  const map = {
    1: "#ef4444",
    2: "#f97316",
    3: "#f59e0b",
    4: "#10b981",
    5: "#6366f1",
  };
  return map[q] || "#64748b";
}

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return formatarData(d);
  });
}

export default function Sono({ user }) {
  const [registros, setRegistros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [dormiu, setDormiu] = useState("22:00");
  const [acordou, setAcordou] = useState("06:00");
  const [qualidade, setQualidade] = useState(3);
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState(false);

  const hoje = formatarData(new Date());
  const ultimos7 = getLast7Days();

  const buscarTudo = useCallback(async () => {
    setCarregando(true);
    const { data } = await supabase
      .from("sono_registro")
      .select("*")
      .eq("user_id", user.id)
      .order("data", { ascending: false })
      .limit(30);
    setRegistros(data || []);
    setCarregando(false);
  }, [user.id]);

  useEffect(() => {
    buscarTudo();
  }, [buscarTudo]);

  const registroHoje = registros.find((r) => r.data === hoje);

  const salvar = async () => {
    setSalvando(true);
    const payload = {
      user_id: user.id,
      data: hoje,
      dormiu,
      acordou,
      qualidade,
    };
    const { error } = await supabase
      .from("sono_registro")
      .upsert(payload, { onConflict: "user_id,data" });
    if (error) {
      alert("Erro: " + error.message);
      setSalvando(false);
      return;
    }
    await buscarTudo();
    setSalvando(false);
    setEditando(false);
  };

  const deletar = async (id) => {
    if (!confirm("Remover registro?")) return;
    await supabase.from("sono_registro").delete().eq("id", id);
    setRegistros((prev) => prev.filter((r) => r.id !== id));
  };

  const dadosGrafico = ultimos7.map((data) => {
    const reg = registros.find((r) => r.data === data);
    return {
      name: new Date(data + "T00:00:00").toLocaleDateString("pt-BR", {
        weekday: "short",
        day: "2-digit",
      }),
      horas: reg ? parseFloat(calcularHoras(reg.dormiu, reg.acordou)) : 0,
      qualidade: reg?.qualidade || 0,
    };
  });

  const mediaHoras = (() => {
    const comRegistro = dadosGrafico.filter((d) => d.horas > 0);
    if (comRegistro.length === 0) return null;
    return (
      comRegistro.reduce((s, d) => s + d.horas, 0) / comRegistro.length
    ).toFixed(1);
  })();

  const mediaQualidade = (() => {
    const comRegistro = registros.filter(
      (r) => ultimos7.includes(r.data) && r.qualidade,
    );
    if (comRegistro.length === 0) return null;
    return (
      comRegistro.reduce((s, r) => s + r.qualidade, 0) / comRegistro.length
    ).toFixed(1);
  })();

  const diasBom = registros.filter(
    (r) =>
      ultimos7.includes(r.data) &&
      parseFloat(calcularHoras(r.dormiu, r.acordou)) >= 7,
  ).length;

  if (carregando)
    return (
      <div style={{ textAlign: "center", color: "#64748b", paddingTop: 40 }}>
        Carregando seu sono... 😴
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
      <h2 className="title-divisao">😴 Registro de Sono</h2>

      {/* Cards resumo */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}
      >
        <div
          style={{
            background: "#1a1d21",
            border: "1px solid #ffffff0d",
            borderRadius: 12,
            padding: 12,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: "#64748b",
              fontWeight: 800,
              letterSpacing: "0.08em",
            }}
          >
            MÉDIA HORAS
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: mediaHoras >= 7 ? "#10b981" : "#f97316",
              marginTop: 4,
            }}
          >
            {mediaHoras || "—"}
          </div>
          <div style={{ fontSize: 9, color: "#475569" }}>últimos 7 dias</div>
        </div>
        <div
          style={{
            background: "#1a1d21",
            border: "1px solid #ffffff0d",
            borderRadius: 12,
            padding: 12,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: "#64748b",
              fontWeight: 800,
              letterSpacing: "0.08em",
            }}
          >
            DIAS ≥7H
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: diasBom >= 5 ? "#10b981" : "#f97316",
              marginTop: 4,
            }}
          >
            {diasBom}/7
          </div>
          <div style={{ fontSize: 9, color: "#475569" }}>na semana</div>
        </div>
        <div
          style={{
            background: "#1a1d21",
            border: "1px solid #ffffff0d",
            borderRadius: 12,
            padding: 12,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: "#64748b",
              fontWeight: 800,
              letterSpacing: "0.08em",
            }}
          >
            QUALIDADE
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color:
                mediaQualidade >= 4
                  ? "#10b981"
                  : mediaQualidade >= 3
                    ? "#f59e0b"
                    : "#ef4444",
              marginTop: 4,
            }}
          >
            {mediaQualidade || "—"}
          </div>
          <div style={{ fontSize: 9, color: "#475569" }}>média /5</div>
        </div>
      </div>

      {/* Gráfico */}
      {dadosGrafico.some((d) => d.horas > 0) && (
        <div
          style={{
            background: "#1a1d21",
            border: "1px solid #ffffff0d",
            borderRadius: 14,
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
            HORAS DE SONO — 7 DIAS
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 9 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 9 }} domain={[0, 10]} />
              <Tooltip
                contentStyle={{
                  background: "#1a1d21",
                  border: "1px solid #ffffff0d",
                  borderRadius: 8,
                  color: "#f8fafc",
                  fontSize: 12,
                }}
                formatter={(v) => [`${v}h`]}
              />
              <Bar dataKey="horas" radius={[4, 4, 0, 0]}>
                {dadosGrafico.map((d, i) => (
                  <rect
                    key={i}
                    fill={
                      d.horas >= 7
                        ? "#10b981"
                        : d.horas > 0
                          ? "#f59e0b"
                          : "#24282d"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 11 }}>
            <span style={{ color: "#10b981" }}>■ ≥7h (ideal)</span>
            <span style={{ color: "#f59e0b" }}>■ &lt;7h</span>
          </div>
        </div>
      )}

      {/* Registro de hoje */}
      <div
        style={{
          background: "#1a1d21",
          border: "1px solid #ffffff0d",
          borderRadius: 14,
          padding: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "#64748b",
              fontWeight: 800,
              letterSpacing: "0.08em",
            }}
          >
            SONO DE HOJE
          </div>
          {registroHoje && !editando && (
            <button
              className="peso-btn-alterar"
              onClick={() => {
                setDormiu(registroHoje.dormiu.substring(0, 5));
                setAcordou(registroHoje.acordou.substring(0, 5));
                setQualidade(registroHoje.qualidade);
                setEditando(true);
              }}
            >
              Editar
            </button>
          )}
        </div>

        {registroHoje && !editando ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 10,
              }}
            >
              <div
                style={{
                  background: "#24282d",
                  borderRadius: 10,
                  padding: "10px 12px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}
                >
                  DORMIU
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#f8fafc",
                    marginTop: 4,
                  }}
                >
                  {registroHoje.dormiu.substring(0, 5)}
                </div>
              </div>
              <div
                style={{
                  background: "#24282d",
                  borderRadius: 10,
                  padding: "10px 12px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}
                >
                  ACORDOU
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#f8fafc",
                    marginTop: 4,
                  }}
                >
                  {registroHoje.acordou.substring(0, 5)}
                </div>
              </div>
              <div
                style={{
                  background: "#24282d",
                  borderRadius: 10,
                  padding: "10px 12px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}
                >
                  DURAÇÃO
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color:
                      parseFloat(
                        calcularHoras(
                          registroHoje.dormiu,
                          registroHoje.acordou,
                        ),
                      ) >= 7
                        ? "#10b981"
                        : "#f97316",
                    marginTop: 4,
                  }}
                >
                  {calcularHoras(registroHoje.dormiu, registroHoje.acordou)}h
                </div>
              </div>
            </div>
            <div
              style={{
                background: "#24282d",
                borderRadius: 10,
                padding: "10px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 13, color: "#94a3b8" }}>Qualidade</span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: qualidadeCor(registroHoje.qualidade),
                }}
              >
                {qualidadeLabel(registroHoje.qualidade)}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <div>
                <div
                  style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}
                >
                  🌙 Dormiu às
                </div>
                <input
                  type="time"
                  value={dormiu}
                  onChange={(e) => setDormiu(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <div
                  style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}
                >
                  ☀️ Acordou às
                </div>
                <input
                  type="time"
                  value={acordou}
                  onChange={(e) => setAcordou(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            {dormiu && acordou && (
              <div
                style={{
                  background: "#24282d",
                  borderRadius: 10,
                  padding: "8px 14px",
                  textAlign: "center",
                  fontSize: 13,
                  color: "#94a3b8",
                }}
              >
                Duração:{" "}
                <strong
                  style={{
                    color:
                      parseFloat(calcularHoras(dormiu, acordou)) >= 7
                        ? "#10b981"
                        : "#f97316",
                  }}
                >
                  {calcularHoras(dormiu, acordou)}h
                </strong>
              </div>
            )}

            <div>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>
                Qualidade do sono
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[1, 2, 3, 4, 5].map((q) => (
                  <button
                    key={q}
                    onClick={() => setQualidade(q)}
                    style={{
                      flex: 1,
                      background:
                        qualidade === q ? qualidadeCor(q) + "33" : "#24282d",
                      border: `1px solid ${qualidade === q ? qualidadeCor(q) : "#ffffff0d"}`,
                      borderRadius: 8,
                      color: qualidade === q ? qualidadeCor(q) : "#64748b",
                      fontSize: 13,
                      fontWeight: 700,
                      padding: "8px 4px",
                      cursor: "pointer",
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div
                style={{
                  textAlign: "center",
                  fontSize: 12,
                  color: qualidadeCor(qualidade),
                  marginTop: 6,
                }}
              >
                {qualidadeLabel(qualidade)}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={salvar}
                disabled={salvando}
                style={{
                  flex: 1,
                  background: "#6366f1",
                  border: "none",
                  borderRadius: 10,
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  padding: 12,
                  cursor: "pointer",
                }}
              >
                {salvando ? "Salvando..." : "💾 Salvar"}
              </button>
              {editando && (
                <button
                  onClick={() => setEditando(false)}
                  style={{
                    background: "transparent",
                    border: "1px solid #ffffff1a",
                    borderRadius: 10,
                    color: "#64748b",
                    fontSize: 14,
                    fontWeight: 600,
                    padding: "12px 16px",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Histórico */}
      {registros.filter((r) => r.data !== hoje).length > 0 && (
        <div
          style={{
            background: "#1a1d21",
            border: "1px solid #ffffff0d",
            borderRadius: 14,
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
            HISTÓRICO
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {registros
              .filter((r) => r.data !== hoje)
              .slice(0, 14)
              .map((r) => {
                const horas = calcularHoras(r.dormiu, r.acordou);
                return (
                  <div
                    key={r.id}
                    style={{
                      background: "#24282d",
                      borderRadius: 10,
                      padding: "10px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#f8fafc",
                        }}
                      >
                        {new Date(r.data + "T00:00:00").toLocaleDateString(
                          "pt-BR",
                          {
                            weekday: "short",
                            day: "2-digit",
                            month: "2-digit",
                          },
                        )}
                      </div>
                      <div
                        style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}
                      >
                        {r.dormiu.substring(0, 5)} → {r.acordou.substring(0, 5)}{" "}
                        · {horas}h
                      </div>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: qualidadeCor(r.qualidade),
                        }}
                      >
                        {qualidadeLabel(r.qualidade)}
                      </span>
                      <button
                        onClick={() => deletar(r.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          opacity: 0.4,
                          fontSize: 14,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Dicas */}
      <div
        style={{
          background: "#1a1d21",
          border: "1px solid #6366f122",
          borderRadius: 14,
          padding: 16,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#6366f1",
            marginBottom: 10,
          }}
        >
          💡 Por que 7-8h importam
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>
          O GH (hormônio do crescimento) é liberado durante o sono — essencial
          para
          <strong style={{ color: "#f8fafc" }}> recuperação muscular</strong> e
          queima de gordura. Menos de 6h aumenta cortisol, grelina (fome) e
          reduz leptina (saciedade). Durma sempre no mesmo horário, mesmo no fim
          de semana.
        </div>
      </div>
    </div>
  );
}
