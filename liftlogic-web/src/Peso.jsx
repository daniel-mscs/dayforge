import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { ganharXP } from "./lib/rpg";

function formatarData(date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().split("T")[0];
}

function calcularIMC(peso, alturaCm) {
  if (!peso || !alturaCm) return null;
  const h = alturaCm / 100;
  return (peso / (h * h)).toFixed(1);
}

function classificarIMC(imc) {
  if (imc < 18.5) return { label: "Abaixo do peso", color: "#85B7EB" };
  if (imc < 25) return { label: "Normal", color: "#10b981" };
  if (imc < 30) return { label: "Sobrepeso", color: "#fbbf24" };
  if (imc < 35) return { label: "Obesidade I", color: "#f97316" };
  return { label: "Obesidade II+", color: "#ef4444" };
}

function imcBarPct(imc) {
  const min = 15,
    max = 40;
  return Math.min(100, Math.max(0, ((imc - min) / (max - min)) * 100));
}

const IMG_MASC = "/body-masc.png";
const IMG_FEM = "/body-fem.png";

const CORES = {
  biceps: "#f59e0b",
  peito: "#6366f1",
  cintura: "#10b981",
  quadril: "#ec4899",
  coxa: "#f97316",
  panturrilha: "#38bdf8",
};

const LABELS = {
  biceps: "Bíceps",
  peito: "Peito",
  cintura: "Cintura",
  quadril: "Quadril",
  coxa: "Coxa",
  panturrilha: "Panturrilha",
};

const PONTOS_MASC = {
  biceps: { x: 145, y: 320, lado: "esq" },
  peito: { x: 240, y: 305, lado: "dir" },
  cintura: { x: 210, y: 340, lado: "dir" },
  quadril: { x: 250, y: 400, lado: "dir" },
  coxa: { x: 180, y: 440, lado: "esq" },
  panturrilha: { x: 165, y: 515, lado: "esq" },
};

const PONTOS_FEM = {
  biceps: { x: 155, y: 310, lado: "esq" },
  peito: { x: 215, y: 310, lado: "dir" },
  cintura: { x: 215, y: 345, lado: "dir" },
  quadril: { x: 245, y: 400, lado: "dir" },
  coxa: { x: 178, y: 450, lado: "esq" },
  panturrilha: { x: 165, y: 522, lado: "esq" },
};

function BodyMeasureVisual({ sexo, medidas }) {
  const isMasc = sexo !== "F";
  const pontos = isMasc ? PONTOS_MASC : PONTOS_FEM;
  const img = isMasc ? IMG_MASC : IMG_FEM;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <svg
        viewBox="0 50 400 600"
        width="100%"
        style={{ maxWidth: 340, display: "block" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <image
          href={img}
          x="60"
          y="10"
          width="280"
          height="680"
          preserveAspectRatio="xMidYMid meet"
        />
        <defs>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="55%" stopColor="transparent" stopOpacity="0" />
            <stop offset="100%" stopColor="#0d0f11" stopOpacity="1" />
          </radialGradient>
        </defs>

        {Object.entries(pontos).map(([key, { x, y, lado }]) => {
          const val = medidas?.[key];
          const cor = CORES[key];
          const isDir = lado === "dir";
          const lx1 = isDir ? x + 18 : x - 18;
          const lx2 = isDir ? x + 95 : x - 95;
          const anchor = isDir ? "start" : "end";
          const tx = lx2 + (isDir ? 4 : -4);

          return (
            <g key={key}>
              <line
                x1={x}
                y1={y}
                x2={lx1}
                y2={y}
                stroke={cor}
                strokeWidth="1.2"
                strokeDasharray="3 2"
                opacity="0.8"
              />
              <line
                x1={lx1}
                y1={y}
                x2={lx2}
                y2={y}
                stroke={cor}
                strokeWidth="1.2"
                opacity="0.8"
              />
              <circle cx={x} cy={y} r="5.5" fill={cor} opacity="0.95" />
              <circle cx={x} cy={y} r="2.5" fill="#fff" />
              <rect
                x={isDir ? lx2 : lx2 - 80}
                y={y - 17}
                width="80"
                height="28"
                rx="5"
                fill="#0d0f11"
                opacity="0.6"
              />
              <text
                x={tx}
                y={y - 4}
                fill={cor}
                fontSize="9"
                fontWeight="700"
                textAnchor={anchor}
                fontFamily="monospace"
              >
                {LABELS[key].toUpperCase()}
              </text>
              <text
                x={tx}
                y={y + 9}
                fill={val ? "#f8fafc" : "#475569"}
                fontSize="11"
                fontWeight="800"
                textAnchor={anchor}
                fontFamily="monospace"
              >
                {val ? `${val} cm` : "— cm"}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function Peso({ user, onAjuda }) {
  const [registros, setRegistros] = useState([]);
  const [perfil, setPerfil] = useState(null);
  const [pesoInput, setPesoInput] = useState("");
  const [metaInput, setMetaInput] = useState("");
  const [meta, setMeta] = useState(null);
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [periodoGrafico, setPeriodoGrafico] = useState(14);
  const [carregando, setCarregando] = useState(true);
  const [subAba, setSubAba] = useState("peso");
  const [medidas, setMedidas] = useState([]);
  const [medidasForm, setMedidasForm] = useState({
    biceps: "",
    peito: "",
    cintura: "",
    quadril: "",
    coxa: "",
    panturrilha: "",
  });
  const [medidaSel, setMedidaSel] = useState("cintura");
  const [compDataA, setCompDataA] = useState("");
  const [compDataB, setCompDataB] = useState("");

  const hoje = formatarData(new Date());

  const buscarTudo = useCallback(async () => {
    setCarregando(true);
    const [{ data: regs }, { data: perfilData }, { data: medidasData }] =
      await Promise.all([
        supabase
          .from("peso_registro")
          .select("*")
          .eq("user_id", user.id)
          .order("data", { ascending: false })
          .limit(30),
        supabase.from("perfil").select("*").eq("user_id", user.id).single(),
        supabase
          .from("medidas_registro")
          .select("*")
          .eq("user_id", user.id)
          .order("data", { ascending: false })
          .limit(20),
      ]);
    setMedidas(medidasData || []);
    setRegistros(regs || []);
    if (perfilData) {
      setPerfil(perfilData);
      setMeta(perfilData.meta_peso || null);
    }
    setCarregando(false);
  }, [user.id]);

  useEffect(() => {
    buscarTudo();
  }, [buscarTudo]);

  const registrarPeso = async () => {
    const val = parseFloat(pesoInput);
    if (!val || val < 30 || val > 300) {
      alert("Digite um peso válido!");
      return;
    }
    const existing = registros.find((r) => r.data === hoje);
    if (existing) {
      if (!confirm("Já existe um registro hoje. Substituir?")) return;
      const { error } = await supabase
        .from("peso_registro")
        .update({ peso: val })
        .eq("id", existing.id);
      if (error) {
        alert("Erro: " + error.message);
        return;
      }
      setRegistros((prev) =>
        prev.map((r) => (r.id === existing.id ? { ...r, peso: val } : r)),
      );
    } else {
      const { data, error } = await supabase
        .from("peso_registro")
        .insert([{ user_id: user.id, data: hoje, peso: val }])
        .select();
      if (error) {
        alert("Erro: " + error.message);
        return;
      }
      setRegistros((prev) => [data[0], ...prev]);
    }
    await supabase
      .from("perfil")
      .upsert({ user_id: user.id, peso: val }, { onConflict: "user_id" });
    setPerfil((prev) => ({ ...prev, peso: val }));
    setPesoInput("");
    await ganharXP(user.id, "peso_registrado");
  };

  const deletarRegistro = async (id) => {
    await supabase.from("peso_registro").delete().eq("id", id);
    setRegistros((prev) => prev.filter((r) => r.id !== id));
  };

  const salvarMeta = async () => {
    const val = parseFloat(metaInput);
    if (!val || val < 30) {
      alert("Meta inválida!");
      return;
    }
    await supabase
      .from("perfil")
      .upsert({ user_id: user.id, meta_peso: val }, { onConflict: "user_id" });
    setMeta(val);
    setMetaInput("");
    setEditandoMeta(false);
  };

  const mediaSemana = () => {
    const ultimos7 = registros.filter(
      (r) => (new Date(hoje) - new Date(r.data)) / 86400000 <= 6,
    );
    if (ultimos7.length === 0) return null;
    return (
      ultimos7.reduce((s, r) => s + Number(r.peso), 0) / ultimos7.length
    ).toFixed(1);
  };

  const dadosGrafico = [...registros]
    .reverse()
    .slice(-periodoGrafico)
    .map((r) => ({
      data: new Date(r.data + "T00:00:00").toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
      peso: Number(r.peso),
    }));

  const tendencia = (() => {
    if (dadosGrafico.length < 3) return [];
    const n = dadosGrafico.length;
    const sumX = dadosGrafico.reduce((s, _, i) => s + i, 0);
    const sumY = dadosGrafico.reduce((s, d) => s + d.peso, 0);
    const sumXY = dadosGrafico.reduce((s, d, i) => s + i * d.peso, 0);
    const sumX2 = dadosGrafico.reduce((s, _, i) => s + i * i, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return dadosGrafico.map((d, i) => ({
      ...d,
      tend: parseFloat((slope * i + intercept).toFixed(1)),
    }));
  })();

  const ultimo = registros[0] || null;
  const penultimo = registros[1] || null;
  const imc =
    ultimo && perfil?.altura
      ? calcularIMC(Number(ultimo.peso), Number(perfil.altura))
      : null;
  const imcCls = imc ? classificarIMC(Number(imc)) : null;
  const media = mediaSemana();
  const diff =
    ultimo && penultimo
      ? (Number(ultimo.peso) - Number(penultimo.peso)).toFixed(1)
      : null;
  const diffMeta =
    ultimo && meta ? (Number(ultimo.peso) - meta).toFixed(1) : null;
  const pesoIdeal = perfil?.altura
    ? (() => {
        const h = perfil.altura / 100;
        return { min: (22 * h * h).toFixed(1), max: (24 * h * h).toFixed(1) };
      })()
    : null;

  const CAMPOS_GRAF = [
    { id: "biceps", label: "Bíceps", cor: "#f59e0b" },
    { id: "peito", label: "Peito", cor: "#6366f1" },
    { id: "cintura", label: "Cintura", cor: "#10b981" },
    { id: "quadril", label: "Quadril", cor: "#ec4899" },
    { id: "coxa", label: "Coxa", cor: "#f97316" },
    { id: "panturrilha", label: "Panturrilha", cor: "#38bdf8" },
  ];

  if (carregando)
    return (
      <div style={{ textAlign: "center", color: "#64748b", paddingTop: 40 }}>
        Carregando seu peso... ⚖️
      </div>
    );

  return (
    <div className="peso-section">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h2 className="title-divisao" style={{ margin: 0 }}>
          ⚖️ Controle de Peso
        </h2>
        <button
          className="ajuda-shortcut-btn"
          onClick={() => onAjuda("ajuda-peso")}
        >
          ?
        </button>
      </div>

      {/* Sub-nav */}
      <div
        style={{
          display: "flex",
          gap: 6,
          background: "#1a1d21",
          padding: 5,
          borderRadius: 12,
          marginBottom: 16,
        }}
      >
        {[
          { id: "peso", label: "⚖️ Peso" },
          { id: "medidas", label: "📏 Medidas" },
        ].map((a) => (
          <button
            key={a.id}
            onClick={() => setSubAba(a.id)}
            style={{
              flex: 1,
              background: subAba === a.id ? "#24282d" : "transparent",
              border: "none",
              borderRadius: 8,
              color: subAba === a.id ? "#f8fafc" : "#64748b",
              fontSize: 12,
              fontWeight: 600,
              padding: "8px 2px",
              cursor: "pointer",
            }}
          >
            {a.label}
          </button>
        ))}
      </div>

      {subAba === "medidas" &&
        (() => {
          const CAMPOS = [
            {
              id: "biceps",
              label: "Bíceps",
              dica: "Braço flexionado, parte mais grossa",
            },
            {
              id: "peito",
              label: "Peito",
              dica: "Na altura dos mamilos, braços relaxados",
            },
            {
              id: "cintura",
              label: "Cintura",
              dica: "Parte mais estreita do abdômen",
            },
            {
              id: "quadril",
              label: "Quadril",
              dica: "Parte mais larga do quadril/glúteo",
            },
            { id: "coxa", label: "Coxa", dica: "Parte mais grossa da coxa" },
            {
              id: "panturrilha",
              label: "Panturrilha",
              dica: "Parte mais grossa da panturrilha",
            },
          ];
          const ultima = medidas[0] || null;

          const campo = CAMPOS_GRAF.find((c) => c.id === medidaSel);
          const datas = [
            ...new Set(
              [...medidas]
                .reverse()
                .map((m) =>
                  new Date(m.data + "T00:00:00").toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                  }),
                ),
            ),
          ];
          const dadosGrafTodos = datas.map((data) => {
            const reg = [...medidas]
              .reverse()
              .find(
                (m) =>
                  new Date(m.data + "T00:00:00").toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                  }) === data,
              );
            const ponto = { data };
            CAMPOS_GRAF.forEach((c) => {
              if (reg?.[c.id]) ponto[c.id] = Number(reg[c.id]);
            });
            return ponto;
          });
          const dadosGraf = [...medidas]
            .reverse()
            .filter((m) => m[medidaSel])
            .map((m) => ({
              data: new Date(m.data + "T00:00:00").toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
              }),
              valor: Number(m[medidaSel]),
            }));

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Visual corporal */}
              <div style={{ borderRadius: 16, overflow: "hidden" }}>
                <BodyMeasureVisual sexo={perfil?.sexo} medidas={ultima} />
              </div>

              {/* Dica de como medir */}
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
                  📏 Como medir corretamente
                </div>
                <div
                  style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}
                >
                  Use uma{" "}
                  <strong style={{ color: "#f8fafc" }}>
                    fita métrica flexível
                  </strong>{" "}
                  encostada na pele sem apertar nem folgar. Meça sempre no{" "}
                  <strong style={{ color: "#f8fafc" }}>mesmo horário</strong>,
                  de preferência pela manhã em jejum. Respire normalmente e não
                  prenda a respiração.
                </div>
              </div>

              {/* Cards da última medida */}
              {ultima && (
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
                    ÚLTIMA MEDIDA —{" "}
                    {new Date(ultima.data + "T00:00:00").toLocaleDateString(
                      "pt-BR",
                    )}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 10,
                    }}
                  >
                    {CAMPOS.map((c) =>
                      ultima[c.id] ? (
                        <div
                          key={c.id}
                          style={{
                            background: "#24282d",
                            borderRadius: 10,
                            padding: "10px 12px",
                            textAlign: "center",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              color: "#64748b",
                              fontWeight: 700,
                            }}
                          >
                            {c.label.toUpperCase()}
                          </div>
                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 700,
                              color: "#f8fafc",
                              marginTop: 4,
                            }}
                          >
                            {ultima[c.id]}
                          </div>
                          <div style={{ fontSize: 9, color: "#475569" }}>
                            cm
                          </div>
                        </div>
                      ) : null,
                    )}
                  </div>
                </div>
              )}

              {/* Formulário */}
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
                    marginBottom: 14,
                  }}
                >
                  REGISTRAR MEDIDAS
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    marginBottom: 14,
                  }}
                >
                  {CAMPOS.map((c) => (
                    <div key={c.id}>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#94a3b8",
                          fontWeight: 600,
                          marginBottom: 2,
                        }}
                      >
                        {c.label} (cm)
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "#475569",
                          marginBottom: 4,
                        }}
                      >
                        {c.dica}
                      </div>
                      <input
                        type="number"
                        placeholder="Ex: 38"
                        step="0.1"
                        value={medidasForm[c.id]}
                        onChange={(e) =>
                          setMedidasForm((p) => ({
                            ...p,
                            [c.id]: e.target.value,
                          }))
                        }
                        style={{ width: "100%" }}
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={async () => {
                    const algum = Object.values(medidasForm).some(
                      (v) => v !== "",
                    );
                    if (!algum) {
                      alert("Preencha ao menos uma medida!");
                      return;
                    }
                    const payload = { user_id: user.id, data: hoje };
                    CAMPOS.forEach((c) => {
                      if (medidasForm[c.id])
                        payload[c.id] = parseFloat(medidasForm[c.id]);
                    });
                    const { data: novo, error } = await supabase
                      .from("medidas_registro")
                      .insert([payload])
                      .select();
                    if (error) {
                      alert(error.message);
                      return;
                    }
                    setMedidas((prev) => [novo[0], ...prev]);
                    setMedidasForm({
                      biceps: "",
                      peito: "",
                      cintura: "",
                      quadril: "",
                      coxa: "",
                      panturrilha: "",
                    });
                  }}
                  style={{
                    width: "100%",
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
                  + Registrar Medidas
                </button>
              </div>

              {/* Gráfico de evolução das medidas */}
              {medidas.length >= 2 && (
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
                    EVOLUÇÃO DAS MEDIDAS
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "nowrap",
                      overflowX: "auto",
                      gap: 6,
                      marginBottom: 14,
                      paddingBottom: 4,
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
                    }}
                  >
                    <button
                      onClick={() => setMedidaSel("todos")}
                      style={{
                        background:
                          medidaSel === "todos" ? "#ffffff22" : "#24282d",
                        border: `1px solid ${medidaSel === "todos" ? "#ffffff44" : "#ffffff0d"}`,
                        borderRadius: 8,
                        color: medidaSel === "todos" ? "#f8fafc" : "#64748b",
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "3px 7px",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Todos
                    </button>
                    {CAMPOS_GRAF.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setMedidaSel(c.id)}
                        style={{
                          background:
                            medidaSel === c.id ? c.cor + "33" : "#24282d",
                          border: `1px solid ${medidaSel === c.id ? c.cor : "#ffffff0d"}`,
                          borderRadius: 8,
                          color: medidaSel === c.id ? c.cor : "#64748b",
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "3px 7px",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                  {medidaSel === "todos" ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={dadosGrafTodos}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#ffffff08"
                        />
                        <XAxis
                          dataKey="data"
                          tick={{ fill: "#64748b", fontSize: 10 }}
                        />
                        <YAxis
                          tick={{ fill: "#64748b", fontSize: 10 }}
                          domain={["auto", "auto"]}
                          tickFormatter={(v) => `${v}cm`}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#1a1d21",
                            border: "1px solid #ffffff0d",
                            borderRadius: 8,
                            color: "#f8fafc",
                          }}
                          formatter={(v, name) => [`${v} cm`, LABELS[name]]}
                        />
                        {CAMPOS_GRAF.map((c) => (
                          <Line
                            key={c.id}
                            type="monotone"
                            dataKey={c.id}
                            stroke={c.cor}
                            strokeWidth={2}
                            dot={false}
                            connectNulls
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : dadosGraf.length >= 2 ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={dadosGraf}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#ffffff08"
                        />
                        <XAxis
                          dataKey="data"
                          tick={{ fill: "#64748b", fontSize: 10 }}
                        />
                        <YAxis
                          tick={{ fill: "#64748b", fontSize: 10 }}
                          domain={["auto", "auto"]}
                          tickFormatter={(v) => `${v}cm`}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#1a1d21",
                            border: "1px solid #ffffff0d",
                            borderRadius: 8,
                            color: "#f8fafc",
                          }}
                          formatter={(v) => [`${v} cm`, campo?.label]}
                        />
                        <Line
                          type="monotone"
                          dataKey="valor"
                          stroke={campo?.cor}
                          strokeWidth={2}
                          dot={{ fill: campo?.cor, r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p
                      style={{
                        textAlign: "center",
                        color: "#475569",
                        fontSize: 13,
                      }}
                    >
                      Registre mais medidas de {campo?.label} para ver a
                      evolução.
                    </p>
                  )}
                </div>
              )}

              {/* Comparativo antes/depois */}
              {medidas.length >= 2 &&
                (() => {
                  const dataA =
                    compDataA || medidas[medidas.length - 1]?.data || "";
                  const dataB = compDataB || medidas[0]?.data || "";
                  const regA = medidas.find((m) => m.data === dataA);
                  const regB = medidas.find((m) => m.data === dataB);
                  return (
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
                          marginBottom: 14,
                        }}
                      >
                        COMPARATIVO ANTES / DEPOIS
                      </div>
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
                              fontSize: 10,
                              color: "#64748b",
                              marginBottom: 4,
                            }}
                          >
                            ANTES
                          </div>
                          <select
                            value={dataA}
                            onChange={(e) => setCompDataA(e.target.value)}
                            style={{
                              width: "100%",
                              background: "#24282d",
                              border: "1px solid #ffffff0d",
                              borderRadius: 8,
                              color: "#f8fafc",
                              fontSize: 12,
                              padding: "6px 8px",
                            }}
                          >
                            {[...medidas].reverse().map((m) => (
                              <option key={m.id} value={m.data}>
                                {new Date(
                                  m.data + "T00:00:00",
                                ).toLocaleDateString("pt-BR")}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 10,
                              color: "#64748b",
                              marginBottom: 4,
                            }}
                          >
                            DEPOIS
                          </div>
                          <select
                            value={dataB}
                            onChange={(e) => setCompDataB(e.target.value)}
                            style={{
                              width: "100%",
                              background: "#24282d",
                              border: "1px solid #ffffff0d",
                              borderRadius: 8,
                              color: "#f8fafc",
                              fontSize: 12,
                              padding: "6px 8px",
                            }}
                          >
                            {[...medidas].reverse().map((m) => (
                              <option key={m.id} value={m.data}>
                                {new Date(
                                  m.data + "T00:00:00",
                                ).toLocaleDateString("pt-BR")}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        {CAMPOS_GRAF.map((c) => {
                          const vA = regA?.[c.id];
                          const vB = regB?.[c.id];
                          const diff =
                            vA && vB
                              ? (Number(vB) - Number(vA)).toFixed(1)
                              : null;
                          const positivo = diff > 0;
                          const negativo = diff < 0;
                          return (
                            <div
                              key={c.id}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "80px 1fr 1fr 60px",
                                alignItems: "center",
                                gap: 8,
                                background: "#24282d",
                                borderRadius: 10,
                                padding: "8px 12px",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: c.cor,
                                }}
                              >
                                {c.label}
                              </div>
                              <div style={{ textAlign: "center" }}>
                                <div
                                  style={{
                                    fontSize: 9,
                                    color: "#475569",
                                    marginBottom: 2,
                                  }}
                                >
                                  ANTES
                                </div>
                                <div
                                  style={{
                                    fontSize: 15,
                                    fontWeight: 700,
                                    color: "#f8fafc",
                                  }}
                                >
                                  {vA ? `${vA}cm` : "—"}
                                </div>
                              </div>
                              <div style={{ textAlign: "center" }}>
                                <div
                                  style={{
                                    fontSize: 9,
                                    color: "#475569",
                                    marginBottom: 2,
                                  }}
                                >
                                  DEPOIS
                                </div>
                                <div
                                  style={{
                                    fontSize: 15,
                                    fontWeight: 700,
                                    color: "#f8fafc",
                                  }}
                                >
                                  {vB ? `${vB}cm` : "—"}
                                </div>
                              </div>
                              <div style={{ textAlign: "center" }}>
                                {diff !== null ? (
                                  <span
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 700,
                                      color: negativo
                                        ? "#10b981"
                                        : positivo
                                          ? "#ef4444"
                                          : "#64748b",
                                    }}
                                  >
                                    {positivo ? "+" : ""}
                                    {diff}cm
                                  </span>
                                ) : (
                                  <span
                                    style={{ color: "#475569", fontSize: 12 }}
                                  >
                                    —
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

              {/* Histórico de medidas */}
              {medidas.length > 1 && (
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
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {medidas.slice(0, 10).map((m) => (
                      <div
                        key={m.id}
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
                              marginBottom: 4,
                            }}
                          >
                            {new Date(m.data + "T00:00:00").toLocaleDateString(
                              "pt-BR",
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#64748b",
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 8,
                            }}
                          >
                            {CAMPOS.map((c) =>
                              m[c.id] ? (
                                <span key={c.id}>
                                  {c.label}:{" "}
                                  <strong style={{ color: "#94a3b8" }}>
                                    {m[c.id]}cm
                                  </strong>
                                </span>
                              ) : null,
                            )}
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            await supabase
                              .from("medidas_registro")
                              .delete()
                              .eq("id", m.id);
                            setMedidas((prev) =>
                              prev.filter((x) => x.id !== m.id),
                            );
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            opacity: 0.4,
                            fontSize: 16,
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

      {subAba === "peso" && (
        <>
          <div className="peso-cards-grid">
            <div className="peso-stat-card">
              <div className="peso-stat-label">PESO ATUAL</div>
              <div className="peso-stat-val">
                {ultimo ? `${Number(ultimo.peso).toFixed(1)} kg` : "—"}
              </div>
              {diff !== null && (
                <div
                  className="peso-stat-sub"
                  style={{
                    color:
                      Number(diff) < 0
                        ? "#10b981"
                        : Number(diff) > 0
                          ? "#ef4444"
                          : "#64748b",
                  }}
                >
                  {Number(diff) > 0 ? "▲" : Number(diff) < 0 ? "▼" : "="}{" "}
                  {Math.abs(diff)} kg
                </div>
              )}
            </div>
            <div className="peso-stat-card">
              <div className="peso-stat-label">IMC</div>
              <div className="peso-stat-val" style={{ color: imcCls?.color }}>
                {imc || "—"}
              </div>
              <div className="peso-stat-sub">
                {imcCls?.label ||
                  (perfil?.altura ? "Registre um peso" : "Configure altura")}
              </div>
            </div>
            <div className="peso-stat-card">
              <div className="peso-stat-label">MÉDIA 7 DIAS</div>
              <div className="peso-stat-val">{media ? `${media} kg` : "—"}</div>
              <div className="peso-stat-sub">
                {
                  registros.filter(
                    (r) => (new Date(hoje) - new Date(r.data)) / 86400000 <= 6,
                  ).length
                }{" "}
                registros
              </div>
            </div>
            <div className="peso-stat-card">
              <div className="peso-stat-label">PESO IDEAL</div>
              <div className="peso-stat-val" style={{ fontSize: "1rem" }}>
                {pesoIdeal ? `${pesoIdeal.min}–${pesoIdeal.max}` : "—"}
              </div>
              <div className="peso-stat-sub">IMC 22–24</div>
            </div>
          </div>

          {dadosGrafico.length >= 2 && (
            <div className="peso-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <div className="peso-card-title" style={{ margin: 0 }}>
                  EVOLUÇÃO DO PESO
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {[7, 14, 30, 90].map((d) => (
                    <button
                      key={d}
                      onClick={() => setPeriodoGrafico(d)}
                      style={{
                        background:
                          periodoGrafico === d ? "#6366f1" : "#24282d",
                        border: "1px solid #ffffff0d",
                        borderRadius: 6,
                        color: periodoGrafico === d ? "#fff" : "#64748b",
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "3px 8px",
                        cursor: "pointer",
                      }}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dadosGrafico}>
                  <defs>
                    <linearGradient id="pesoGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis
                    dataKey="data"
                    tick={{ fill: "#64748b", fontSize: 10 }}
                  />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    domain={["auto", "auto"]}
                    tickFormatter={(v) => `${v}kg`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1a1d21",
                      border: "1px solid #ffffff0d",
                      borderRadius: 8,
                      color: "#f8fafc",
                    }}
                    formatter={(v) => [`${v} kg`]}
                  />
                  <Line
                    type="monotone"
                    dataKey="peso"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ fill: "#6366f1", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  {tendencia.length >= 2 && (
                    <Line
                      type="monotone"
                      data={tendencia}
                      dataKey="tend"
                      stroke="#f59e0b"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                      dot={false}
                      name="Tendência"
                    />
                  )}
                  {meta && (
                    <Line
                      type="monotone"
                      dataKey={() => meta}
                      stroke="#10b98166"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                      dot={false}
                      name="Meta"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
              <div
                style={{ display: "flex", gap: 14, marginTop: 6, fontSize: 11 }}
              >
                <span style={{ color: "#6366f1" }}>— Peso</span>
                <span style={{ color: "#f59e0b" }}>- - Tendência</span>
                {meta && (
                  <span style={{ color: "#10b981" }}>- - Meta: {meta} kg</span>
                )}
              </div>
            </div>
          )}

          {imc && (
            <div className="peso-card">
              <div className="peso-card-title">FAIXA DE IMC</div>
              <div className="peso-imc-track">
                <div style={{ width: "13%", background: "#85B7EB" }} />
                <div style={{ width: "22%", background: "#10b981" }} />
                <div style={{ width: "20%", background: "#fbbf24" }} />
                <div style={{ width: "20%", background: "#f97316" }} />
                <div style={{ width: "25%", background: "#ef4444" }} />
              </div>
              <div className="peso-imc-marker-wrap">
                <div
                  className="peso-imc-marker"
                  style={{ left: `${imcBarPct(Number(imc))}%` }}
                >
                  ▲ {imc}
                </div>
              </div>
              <div className="peso-imc-labels">
                <span>Abaixo</span>
                <span>Normal</span>
                <span>Sobre</span>
                <span>Ob.I</span>
                <span>Ob.II+</span>
              </div>
            </div>
          )}

          {imc &&
            perfil?.sexo &&
            (() => {
              const imcN = Number(imc);
              const sexo = perfil.sexo;
              // Fórmula de Deurenberg: %gordura = (1.2 * IMC) + (0.23 * idade) - (10.8 * sexo) - 5.4
              // sexo: 1=masculino, 0=feminino
              const idadeN = Number(perfil.idade) || 25;
              const s = sexo === "M" ? 1 : 0;
              const pctGordura = Math.max(
                0,
                1.2 * imcN + 0.23 * idadeN - 10.8 * s - 5.4,
              ).toFixed(1);
              const pesoN = Number(ultimo?.peso);
              const massaGorda = ((pctGordura / 100) * pesoN).toFixed(1);
              const massaMagra = (pesoN - massaGorda).toFixed(1);
              const classGordura =
                sexo === "M"
                  ? pctGordura < 6
                    ? { label: "Atleta", cor: "#3b82f6" }
                    : pctGordura < 14
                      ? { label: "Fitness", cor: "#10b981" }
                      : pctGordura < 18
                        ? { label: "Aceitável", cor: "#f59e0b" }
                        : pctGordura < 25
                          ? { label: "Sobrepeso", cor: "#f97316" }
                          : { label: "Obesidade", cor: "#ef4444" }
                  : pctGordura < 14
                    ? { label: "Atleta", cor: "#3b82f6" }
                    : pctGordura < 21
                      ? { label: "Fitness", cor: "#10b981" }
                      : pctGordura < 25
                        ? { label: "Aceitável", cor: "#f59e0b" }
                        : pctGordura < 32
                          ? { label: "Sobrepeso", cor: "#f97316" }
                          : { label: "Obesidade", cor: "#ef4444" };

              return (
                <div className="peso-card">
                  <div className="peso-card-title">
                    🧬 COMPOSIÇÃO CORPORAL ESTIMADA
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 10,
                      marginBottom: 12,
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
                        style={{
                          fontSize: 10,
                          color: "#64748b",
                          fontWeight: 700,
                        }}
                      >
                        % GORDURA
                      </div>
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 800,
                          color: classGordura.cor,
                          marginTop: 4,
                        }}
                      >
                        {pctGordura}%
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: classGordura.cor,
                          marginTop: 2,
                        }}
                      >
                        {classGordura.label}
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
                        style={{
                          fontSize: 10,
                          color: "#64748b",
                          fontWeight: 700,
                        }}
                      >
                        M. GORDA
                      </div>
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 800,
                          color: "#f8fafc",
                          marginTop: 4,
                        }}
                      >
                        {massaGorda}
                      </div>
                      <div
                        style={{ fontSize: 10, color: "#475569", marginTop: 2 }}
                      >
                        kg
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
                        style={{
                          fontSize: 10,
                          color: "#64748b",
                          fontWeight: 700,
                        }}
                      >
                        M. MAGRA
                      </div>
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 800,
                          color: "#10b981",
                          marginTop: 4,
                        }}
                      >
                        {massaMagra}
                      </div>
                      <div
                        style={{ fontSize: 10, color: "#475569", marginTop: 2 }}
                      >
                        kg
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      height: 8,
                      background: "#ffffff0d",
                      borderRadius: 99,
                      overflow: "hidden",
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{
                        height: 8,
                        width: `${Math.min(100, pctGordura)}%`,
                        background: classGordura.cor,
                        borderRadius: 99,
                      }}
                    />
                  </div>
                  <p
                    style={{ fontSize: 11, color: "#475569", lineHeight: 1.5 }}
                  >
                    💡 Estimativa pela fórmula de Deurenberg (IMC + idade +
                    sexo). Para maior precisão use bioimpedância ou DEXA.
                  </p>
                </div>
              );
            })()}

          <div className="peso-card">
            <div className="peso-card-title-row">
              <div className="peso-card-title" style={{ margin: 0 }}>
                META DE PESO
              </div>
              {meta && !editandoMeta && (
                <button
                  className="peso-btn-alterar"
                  onClick={() => setEditandoMeta(true)}
                >
                  Alterar
                </button>
              )}
            </div>
            {meta && !editandoMeta ? (
              <div className="peso-meta-display">
                <div className="peso-meta-val">🎯 {meta} kg</div>
                {diffMeta !== null &&
                  (Number(diffMeta) <= 0 ? (
                    <span className="peso-meta-badge done">
                      ✅ Meta atingida!
                    </span>
                  ) : (
                    <span className="peso-meta-badge">
                      Faltam {diffMeta} kg
                    </span>
                  ))}
              </div>
            ) : (
              <div
                className="peso-input-row"
                style={{ marginTop: meta ? 12 : 0 }}
              >
                <input
                  type="number"
                  placeholder={meta ? `Meta atual: ${meta} kg` : "Ex: 75.0"}
                  step="0.1"
                  min="30"
                  max="300"
                  value={metaInput}
                  onChange={(e) => setMetaInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") salvarMeta();
                  }}
                  autoFocus={editandoMeta}
                />
                <span className="peso-unit">kg</span>
                <button className="peso-btn-add" onClick={salvarMeta}>
                  Salvar
                </button>
                {editandoMeta && (
                  <button
                    className="peso-btn-cancelar"
                    onClick={() => {
                      setEditandoMeta(false);
                      setMetaInput("");
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>

          {meta &&
            tendencia.length >= 3 &&
            (() => {
              const n = dadosGrafico.length;
              const sumX = dadosGrafico.reduce((s, _, i) => s + i, 0);
              const sumY = dadosGrafico.reduce((s, d) => s + d.peso, 0);
              const sumXY = dadosGrafico.reduce((s, d, i) => s + i * d.peso, 0);
              const sumX2 = dadosGrafico.reduce((s, _, i) => s + i * i, 0);
              const slope =
                (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
              if (Math.abs(slope) < 0.001) return null;
              const pesoAtual = dadosGrafico[dadosGrafico.length - 1].peso;
              const diasRestantes = Math.round((meta - pesoAtual) / slope);
              const sentidoCerto =
                (slope < 0 && meta < pesoAtual) ||
                (slope > 0 && meta > pesoAtual);
              if (Math.abs(slope) < 0.001) return null;
              const muitoDevagar =
                sentidoCerto && Math.abs(diasRestantes) > 365;
              const dataEst = new Date();
              dataEst.setDate(dataEst.getDate() + Math.abs(diasRestantes));
              const cor = sentidoCerto ? "#10b981" : "#ef4444";
              return (
                <div className="peso-card">
                  <div className="peso-card-title">📅 PREVISÃO DE META</div>
                  {!sentidoCerto ? (
                    <div
                      style={{
                        background: "#ef444415",
                        border: "1px solid #ef444433",
                        borderRadius: 10,
                        padding: 12,
                        marginTop: 4,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          color: "#ef4444",
                          fontWeight: 700,
                          marginBottom: 4,
                        }}
                      >
                        ⚠️ Tendência contrária à meta
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>
                        Você está {slope > 0 ? "ganhando" : "perdendo"}{" "}
                        {Math.abs(slope).toFixed(2)} kg/dia, mas sua meta é{" "}
                        {meta < pesoAtual ? "emagrecer" : "ganhar peso"}.
                        Mantenha a consistência para reverter a tendência.
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        marginTop: 4,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontSize: 13, color: "#94a3b8" }}>
                          Tendência atual
                        </span>
                        <span
                          style={{ fontSize: 13, fontWeight: 700, color: cor }}
                        >
                          {slope > 0 ? "+" : ""}
                          {slope.toFixed(2)} kg/dia
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontSize: 13, color: "#94a3b8" }}>
                          Dias restantes
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: muitoDevagar ? "#f59e0b" : "#f8fafc",
                          }}
                        >
                          {muitoDevagar
                            ? "+1 ano"
                            : `${Math.abs(diasRestantes)} dias`}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontSize: 13, color: "#94a3b8" }}>
                          Data estimada
                        </span>
                        <span
                          style={{ fontSize: 13, fontWeight: 700, color: cor }}
                        >
                          {dataEst.toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  )}
                  <p
                    style={{
                      fontSize: 11,
                      color: "#475569",
                      marginTop: 8,
                      lineHeight: 1.5,
                    }}
                  >
                    💡 Baseado na tendência dos últimos {periodoGrafico} dias.
                    Pode variar conforme sua consistência.
                  </p>
                </div>
              );
            })()}

          <div className="peso-card">
            <div className="peso-card-title">REGISTRAR HOJE</div>
            <div className="peso-input-row">
              <input
                type="number"
                placeholder="Ex: 80.5"
                step="0.1"
                min="30"
                max="300"
                value={pesoInput}
                onChange={(e) => setPesoInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") registrarPeso();
                }}
              />
              <span className="peso-unit">kg</span>
              <button className="peso-btn-add" onClick={registrarPeso}>
                + Registrar
              </button>
            </div>
            <p style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>
              💡 Pese-se sempre em jejum logo ao acordar para resultados
              consistentes.
            </p>
          </div>

          {media && (
            <div className="peso-card">
              <div className="peso-card-title">MÉDIA SEMANAL</div>
              <div className="peso-media-val">
                {media} <span>kg</span>
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  marginTop: 8,
                  lineHeight: 1.6,
                }}
              >
                A média dos últimos 7 dias elimina oscilações de retenção
                hídrica e resíduo gástrico. Use ela para saber se realmente
                emagreceu ou engordou na semana.
              </p>
            </div>
          )}

          <div className="peso-card">
            <div className="peso-card-title">HISTÓRICO</div>
            {registros.length === 0 ? (
              <p className="empty-msg" style={{ marginTop: 8, fontSize: 13 }}>
                Nenhum registro ainda.
              </p>
            ) : (
              <div className="peso-log">
                {registros.map((r, idx) => {
                  const prev = registros[idx + 1];
                  const d = prev
                    ? (Number(r.peso) - Number(prev.peso)).toFixed(1)
                    : null;
                  return (
                    <div key={r.id} className="peso-log-item">
                      <div className="peso-log-left">
                        <span className="peso-log-val">
                          {Number(r.peso).toFixed(1)} kg
                        </span>
                        <span className="peso-log-data">
                          {new Date(r.data + "T00:00:00").toLocaleDateString(
                            "pt-BR",
                          )}
                        </span>
                        {d !== null && (
                          <span
                            style={{
                              fontSize: 11,
                              color:
                                Number(d) < 0
                                  ? "#10b981"
                                  : Number(d) > 0
                                    ? "#ef4444"
                                    : "#64748b",
                            }}
                          >
                            {Number(d) > 0 ? "▲" : Number(d) < 0 ? "▼" : "="}{" "}
                            {Math.abs(d)} kg
                          </span>
                        )}
                      </div>
                      <button
                        className="agua-log-del"
                        onClick={() => deletarRegistro(r.id)}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
