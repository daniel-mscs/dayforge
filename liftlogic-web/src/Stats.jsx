import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return formatarData(d);
  });
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function calcularHoras(dormiu, acordou) {
  if (!dormiu || !acordou) return null;
  const [hD, mD] = dormiu.split(":").map(Number);
  const [hA, mA] = acordou.split(":").map(Number);
  let minutos = hA * 60 + mA - (hD * 60 + mD);
  if (minutos < 0) minutos += 24 * 60;
  return parseFloat((minutos / 60).toFixed(1));
}

function qualidadeLabel(q) {
  const map = { 1: "Péssimo", 2: "Ruim", 3: "Regular", 4: "Bom", 5: "Ótimo" };
  return map[q] || "—";
}

// Mini card de stat com número grande
function StatCard({ icon, label, val, sub, cor }) {
  return (
    <div
      style={{
        background: "#1a1d21",
        border: "1px solid #ffffff0d",
        borderRadius: 14,
        padding: "14px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#64748b",
          fontWeight: 700,
          letterSpacing: "0.06em",
        }}
      >
        {icon} {label}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
          color: cor || "#f8fafc",
          lineHeight: 1.1,
        }}
      >
        {val}
      </div>
      {sub && <div style={{ fontSize: 11, color: "#475569" }}>{sub}</div>}
    </div>
  );
}

// Linha de stat horizontal
function StatRow({ icon, label, val, cor }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 0",
        borderBottom: "1px solid #ffffff06",
      }}
    >
      <span style={{ fontSize: 13, color: "#94a3b8" }}>
        {icon} {label}
      </span>
      <strong style={{ fontSize: 13, color: cor || "#f8fafc" }}>{val}</strong>
    </div>
  );
}

export default function Stats({ user }) {
  const [treinos, setTreinos] = useState([]);
  const [agua, setAgua] = useState([]);
  const [aguaMeta, setAguaMeta] = useState(2500);
  const [pesos, setPesos] = useState([]);
  const [macros, setMacros] = useState([]);
  const [passos, setPassos] = useState([]);
  const [passosMeta, setPassosMeta] = useState(10000);
  const [sono, setSono] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [rpg, setRpg] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [compartilhando, setCompartilhando] = useState(false);
  const [aba, setAba] = useState("semana");

  const [treinosMes, setTreinosMes] = useState([]);
  const [aguaMes, setAguaMes] = useState([]);
  const [pesosMes, setPesosMes] = useState([]);
  const [passosMes, setPassosMes] = useState([]);
  const [sonoMes, setSonoMes] = useState([]);
  const [carregandoMes, setCarregandoMes] = useState(false);
  const [mesSel, setMesSel] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const ultimos7 = getLast7Days();
  const inicio = ultimos7[0];

  const buscarTudo = useCallback(async () => {
    setCarregando(true);
    const [
      { data: treinosData },
      { data: aguaData },
      { data: aguaMetaData },
      { data: pesosData },
      { data: macrosData },
      { data: passosData },
      { data: passosMetaData },
      { data: rpgData },
      { data: perfilData },
      { data: sonoData },
    ] = await Promise.all([
      supabase
        .from("treinos_finalizados")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", inicio)
        .order("created_at", { ascending: true }),
      supabase
        .from("agua_registro")
        .select("*")
        .eq("user_id", user.id)
        .gte("data", inicio),
      supabase
        .from("agua_meta")
        .select("meta_ml")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("peso_registro")
        .select("*")
        .eq("user_id", user.id)
        .gte("data", inicio)
        .order("data", { ascending: true }),
      supabase
        .from("macros_registro")
        .select("*")
        .eq("user_id", user.id)
        .gte("data", inicio),
      supabase
        .from("passos_registro")
        .select("*")
        .eq("user_id", user.id)
        .gte("data", inicio),
      supabase
        .from("passos_meta")
        .select("meta_passos")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("rpg_perfil")
        .select("xp, streak, nivel")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("perfil")
        .select("nome, peso")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("sono_registro")
        .select("*")
        .eq("user_id", user.id)
        .gte("data", inicio),
    ]);
    setTreinos(treinosData || []);
    setAgua(aguaData || []);
    if (aguaMetaData) setAguaMeta(aguaMetaData.meta_ml);
    setPesos(pesosData || []);
    setMacros(macrosData || []);
    setPassos(passosData || []);
    if (passosMetaData) setPassosMeta(passosMetaData.meta_passos);
    setRpg(rpgData || null);
    setPerfil(perfilData || null);
    setSono(sonoData || []);
    setCarregando(false);
  }, [user.id]);

  const buscarMes = useCallback(
    async (mes) => {
      setCarregandoMes(true);
      const [ano, m] = mes.split("-").map(Number);
      const inicioMes = `${mes}-01`;
      const fimMesStr = formatarData(new Date(ano, m, 0));
      const [
        { data: treinosM },
        { data: aguaM },
        { data: pesosM },
        { data: passosM },
        { data: sonoM },
      ] = await Promise.all([
        supabase
          .from("treinos_finalizados")
          .select("*")
          .eq("user_id", user.id)
          .gte("created_at", inicioMes)
          .lte("created_at", fimMesStr + "T23:59:59"),
        supabase
          .from("agua_registro")
          .select("*")
          .eq("user_id", user.id)
          .gte("data", inicioMes)
          .lte("data", fimMesStr),
        supabase
          .from("peso_registro")
          .select("*")
          .eq("user_id", user.id)
          .gte("data", inicioMes)
          .lte("data", fimMesStr)
          .order("data", { ascending: true }),
        supabase
          .from("passos_registro")
          .select("*")
          .eq("user_id", user.id)
          .gte("data", inicioMes)
          .lte("data", fimMesStr),
        supabase
          .from("sono_registro")
          .select("*")
          .eq("user_id", user.id)
          .gte("data", inicioMes)
          .lte("data", fimMesStr),
      ]);
      setTreinosMes(treinosM || []);
      setAguaMes(aguaM || []);
      setPesosMes(pesosM || []);
      setPassosMes(passosM || []);
      setSonoMes(sonoM || []);
      setCarregandoMes(false);
    },
    [user.id],
  );

  useEffect(() => {
    buscarTudo();
  }, [buscarTudo]);
  useEffect(() => {
    if (aba === "mes") buscarMes(mesSel);
  }, [aba, mesSel, buscarMes]);

  // Cálculos semanais
  const totalTreinos = treinos.length;
  const treinosLetras = [...new Set(treinos.map((t) => t.treino))]
    .sort()
    .join(", ");
  const tempoTotal = treinos.reduce((s, t) => s + (t.tempo_segundos || 0), 0);
  const kcalTotal = treinos.reduce((s, t) => s + (t.kcal || 0), 0);

  const formatarTempo = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  };

  const aguaPorDia = ultimos7.map((data) => ({
    data,
    total: agua.filter((r) => r.data === data).reduce((s, r) => s + r.ml, 0),
  }));
  const mediaAgua = Math.round(aguaPorDia.reduce((s, d) => s + d.total, 0) / 7);
  const diasMetaAgua = aguaPorDia.filter((d) => d.total >= aguaMeta).length;

  const pesoDados = ultimos7
    .map((data) => {
      const reg = pesos.find((r) => r.data === data);
      return { data, peso: reg ? Number(reg.peso) : null };
    })
    .filter((d) => d.peso !== null);
  const variacaoPeso =
    pesoDados.length >= 2
      ? round1(pesoDados[pesoDados.length - 1].peso - pesoDados[0].peso)
      : null;

  const macrosPorDia = ultimos7.map((data) => {
    const regs = macros.filter((r) => r.data === data);
    return {
      data,
      kcal: Math.round(regs.reduce((s, r) => s + r.kcal, 0)),
      prot: round1(regs.reduce((s, r) => s + Number(r.prot), 0)),
    };
  });
  const diasComMacros = macrosPorDia.filter((d) => d.kcal > 0);
  const mediaKcal =
    diasComMacros.length > 0
      ? Math.round(
          diasComMacros.reduce((s, d) => s + d.kcal, 0) / diasComMacros.length,
        )
      : 0;
  const mediaProt =
    diasComMacros.length > 0
      ? round1(
          diasComMacros.reduce((s, d) => s + d.prot, 0) / diasComMacros.length,
        )
      : 0;

  const passosPorDia = ultimos7.map((data) => {
    const reg = passos.find((r) => r.data === data);
    return { data, passos: reg?.passos || 0 };
  });
  const mediaPassos = Math.round(
    passosPorDia.reduce((s, d) => s + d.passos, 0) / 7,
  );
  const diasMetaPassos = passosPorDia.filter(
    (d) => d.passos >= passosMeta,
  ).length;

  const sonoComRegistro = sono.filter((r) => ultimos7.includes(r.data));
  const mediaHorasSono =
    sonoComRegistro.length > 0
      ? (
          sonoComRegistro.reduce(
            (s, r) => s + calcularHoras(r.dormiu, r.acordou),
            0,
          ) / sonoComRegistro.length
        ).toFixed(1)
      : null;
  const diasSono7h = sonoComRegistro.filter(
    (r) => calcularHoras(r.dormiu, r.acordou) >= 7,
  ).length;
  const mediaQualidadeSono =
    sonoComRegistro.length > 0
      ? (
          sonoComRegistro.reduce((s, r) => s + r.qualidade, 0) /
          sonoComRegistro.length
        ).toFixed(1)
      : null;

  const sonoPorDia = ultimos7.map((data) => {
    const reg = sono.find((r) => r.data === data);
    return {
      name: new Date(data + "T00:00:00").toLocaleDateString("pt-BR", {
        weekday: "short",
        day: "2-digit",
      }),
      horas: reg ? calcularHoras(reg.dormiu, reg.acordou) : 0,
    };
  });

  const labelDia = (data) =>
    new Date(data + "T00:00:00").toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
    });
  const tooltipStyle = {
    background: "#1a1d21",
    border: "1px solid #ffffff0d",
    borderRadius: 8,
    color: "#f8fafc",
    fontSize: 12,
  };

  // Cálculos mensais
  const totalTreinosMes = treinosMes.length;
  const tempoTotalMes = treinosMes.reduce(
    (s, t) => s + (t.tempo_segundos || 0),
    0,
  );
  const kcalTotalMes = treinosMes.reduce((s, t) => s + (t.kcal || 0), 0);
  const divisoesMes = treinosMes.reduce((acc, t) => {
    acc[t.treino] = (acc[t.treino] || 0) + 1;
    return acc;
  }, {});
  const [ano, m] = mesSel.split("-").map(Number);
  const diasNoMes = new Date(ano, m, 0).getDate();
  const aguaPorDiaMes = (() => {
    const map = {};
    aguaMes.forEach((r) => {
      if (!map[r.data]) map[r.data] = 0;
      map[r.data] += r.ml;
    });
    return map;
  })();
  const diasMetaAguaMes = Object.values(aguaPorDiaMes).filter(
    (v) => v >= aguaMeta,
  ).length;
  const diasMetaPassosMes = passosMes.filter(
    (r) => r.passos >= passosMeta,
  ).length;
  const pesoInicioMes = pesosMes[0] ? Number(pesosMes[0].peso) : null;
  const pesoFimMes =
    pesosMes.length > 0 ? Number(pesosMes[pesosMes.length - 1].peso) : null;
  const variacaoPesoMes =
    pesoInicioMes && pesoFimMes ? round1(pesoFimMes - pesoInicioMes) : null;
  const mediaHorasSonoMes =
    sonoMes.length > 0
      ? (
          sonoMes.reduce((s, r) => s + calcularHoras(r.dormiu, r.acordou), 0) /
          sonoMes.length
        ).toFixed(1)
      : null;
  const diasSono7hMes = sonoMes.filter(
    (r) => calcularHoras(r.dormiu, r.acordou) >= 7,
  ).length;
  const mediaQualidadeSonoMes =
    sonoMes.length > 0
      ? (sonoMes.reduce((s, r) => s + r.qualidade, 0) / sonoMes.length).toFixed(
          1,
        )
      : null;

  const mesesOpts = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return {
      val,
      label: d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
    };
  });

  if (carregando)
    return (
      <div style={{ textAlign: "center", color: "#64748b", paddingTop: 40 }}>
        Carregando seus stats... 📊
      </div>
    );

  return (
    <div className="stats-section">
      <h2 className="title-divisao">📊 Stats</h2>

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
          { id: "semana", label: "📅 Semana" },
          { id: "mes", label: "📆 Mês" },
        ].map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            style={{
              flex: 1,
              background: aba === a.id ? "#24282d" : "transparent",
              border: "none",
              borderRadius: 8,
              color: aba === a.id ? "#f8fafc" : "#64748b",
              fontSize: 13,
              fontWeight: 600,
              padding: "8px 2px",
              cursor: "pointer",
            }}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* ABA SEMANA */}
      {aba === "semana" && (
        <>
          <p
            style={{
              fontSize: 12,
              color: "#64748b",
              marginTop: -8,
              marginBottom: 16,
            }}
          >
            {new Date(inicio + "T00:00:00").toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
            })}{" "}
            —{" "}
            {new Date().toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
            })}
          </p>

          {/* Grid de highlights */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <StatCard
              icon="⚔️"
              label="TREINOS"
              val={totalTreinos}
              sub={
                totalTreinos > 0
                  ? `${treinosLetras} · ${formatarTempo(tempoTotal)}`
                  : "nenhum essa semana"
              }
              cor={totalTreinos >= 3 ? "#10b981" : "#f8fafc"}
            />
            <StatCard
              icon="⚖️"
              label="PESO"
              val={
                pesoDados.length > 0
                  ? `${pesoDados[pesoDados.length - 1].peso}kg`
                  : "—"
              }
              sub={
                variacaoPeso !== null
                  ? `${variacaoPeso > 0 ? "▲" : "▼"} ${Math.abs(variacaoPeso)}kg na semana`
                  : "sem registros"
              }
              cor={
                variacaoPeso !== null
                  ? variacaoPeso < 0
                    ? "#10b981"
                    : variacaoPeso > 0
                      ? "#ef4444"
                      : "#64748b"
                  : "#64748b"
              }
            />
            <StatCard
              icon="💧"
              label="ÁGUA"
              val={`${diasMetaAgua}/7`}
              sub={`meta ${(aguaMeta / 1000).toFixed(1)}L · média ${mediaAgua > 0 ? (mediaAgua / 1000).toFixed(1) + "L" : "—"}`}
              cor={diasMetaAgua >= 5 ? "#10b981" : "#f97316"}
            />
            <StatCard
              icon="👟"
              label="PASSOS"
              val={`${diasMetaPassos}/7`}
              sub={`média ${mediaPassos > 0 ? mediaPassos.toLocaleString("pt-BR") : "—"}/dia`}
              cor={diasMetaPassos >= 5 ? "#10b981" : "#f97316"}
            />
            <StatCard
              icon="😴"
              label="SONO"
              val={mediaHorasSono ? `${mediaHorasSono}h` : "—"}
              sub={
                mediaHorasSono
                  ? `${diasSono7h}/7 dias ≥7h · qualidade ${mediaQualidadeSono}/5`
                  : "sem registros"
              }
              cor={parseFloat(mediaHorasSono) >= 7 ? "#10b981" : "#f97316"}
            />
            <StatCard
              icon="🍽️"
              label="MACROS"
              val={mediaKcal > 0 ? `${mediaKcal}` : "—"}
              sub={
                mediaKcal > 0
                  ? `kcal média · ${mediaProt}g prot`
                  : "sem registros"
              }
              cor="#f59e0b"
            />
          </div>

          {/* RPG strip */}
          <div
            style={{
              background: "#1a1d21",
              border: "1px solid #6366f122",
              borderRadius: 14,
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-around",
              marginBottom: 10,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20 }}>🔥</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#f8fafc" }}>
                {rpg?.streak || 0}
              </div>
              <div style={{ fontSize: 10, color: "#64748b" }}>streak dias</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20 }}>⭐</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#6366f1" }}>
                {(rpg?.xp || 0).toLocaleString("pt-BR")}
              </div>
              <div style={{ fontSize: 10, color: "#64748b" }}>XP total</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20 }}>🏆</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#f8fafc" }}>
                Nv. {rpg?.nivel || 1}
              </div>
              <div style={{ fontSize: 10, color: "#64748b" }}>nível atual</div>
            </div>
          </div>

          {/* Gráficos colapsáveis */}
          {treinos.length > 0 && (
            <div className="stats-card">
              <div className="stats-card-title">⚔️ EVOLUÇÃO TREINOS</div>
              <ResponsiveContainer width="100%" height={100}>
                <BarChart
                  data={treinos.map((t) => ({
                    name: `${t.treino} ${new Date(t.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`,
                    min: Math.round((t.tempo_segundos || 0) / 60),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#64748b", fontSize: 9 }}
                  />
                  <YAxis tick={{ fill: "#64748b", fontSize: 9 }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => [`${v} min`]}
                  />
                  <Bar dataKey="min" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {pesoDados.length >= 2 && (
            <div className="stats-card">
              <div className="stats-card-title">⚖️ EVOLUÇÃO PESO</div>
              <ResponsiveContainer width="100%" height={90}>
                <LineChart
                  data={pesoDados.map((d) => ({
                    name: labelDia(d.data),
                    peso: d.peso,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#64748b", fontSize: 9 }}
                  />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 9 }}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => [`${v} kg`]}
                  />
                  <Line
                    type="monotone"
                    dataKey="peso"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ fill: "#6366f1", r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {diasComMacros.length > 0 && (
            <div className="stats-card">
              <div className="stats-card-title">🍽️ KCAL DIÁRIA</div>
              <ResponsiveContainer width="100%" height={90}>
                <BarChart
                  data={macrosPorDia.map((d) => ({
                    name: labelDia(d.data),
                    kcal: d.kcal,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#64748b", fontSize: 9 }}
                  />
                  <YAxis tick={{ fill: "#64748b", fontSize: 9 }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => [`${v} kcal`]}
                  />
                  <Bar dataKey="kcal" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {sonoComRegistro.length > 0 && (
            <div className="stats-card">
              <div className="stats-card-title">😴 HORAS DE SONO</div>
              <ResponsiveContainer width="100%" height={90}>
                <BarChart data={sonoPorDia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#64748b", fontSize: 9 }}
                  />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 9 }}
                    domain={[0, 10]}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => [`${v}h`]}
                  />
                  <Bar dataKey="horas" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Card compartilhável */}
          <div style={{ borderRadius: 20, overflow: "hidden" }}>
            <div
              id="share-card"
              style={{
                background: "linear-gradient(135deg, #0f1113 0%, #1a1d21 100%)",
                border: "1px solid #ffffff0d",
                borderRadius: 20,
                padding: 24,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#64748b",
                      fontWeight: 800,
                      letterSpacing: "0.1em",
                    }}
                  >
                    RELATÓRIO SEMANAL
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#f8fafc",
                      marginTop: 2,
                    }}
                  >
                    {perfil?.nome || "DayForge"}
                  </div>
                </div>
                <div style={{ fontSize: 28 }}>⚔️</div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 8,
                }}
              >
                {[
                  {
                    icon: "🏋️",
                    label: "Treinos",
                    val: totalTreinos,
                    sub:
                      totalTreinos > 0 ? formatarTempo(tempoTotal) : "nenhum",
                  },
                  {
                    icon: "⚖️",
                    label: "Peso",
                    val:
                      pesoDados.length > 0
                        ? `${pesoDados[pesoDados.length - 1].peso}kg`
                        : "—",
                    sub:
                      variacaoPeso !== null
                        ? `${variacaoPeso > 0 ? "+" : ""}${variacaoPeso}kg`
                        : "sem reg.",
                  },
                  {
                    icon: "💧",
                    label: "Água",
                    val: `${diasMetaAgua}/7`,
                    sub: "dias meta",
                  },
                  {
                    icon: "👟",
                    label: "Passos",
                    val:
                      mediaPassos > 0
                        ? mediaPassos.toLocaleString("pt-BR")
                        : "—",
                    sub: "média/dia",
                  },
                  {
                    icon: "😴",
                    label: "Sono",
                    val: mediaHorasSono ? `${mediaHorasSono}h` : "—",
                    sub: `${diasSono7h}/7 ≥7h`,
                  },
                  {
                    icon: "🔥",
                    label: "Streak",
                    val: `${rpg?.streak || 0}d`,
                    sub: "consecutivos",
                  },
                  {
                    icon: "⭐",
                    label: "XP",
                    val: (rpg?.xp || 0).toLocaleString("pt-BR"),
                    sub: `Nível ${rpg?.nivel || 1}`,
                  },
                  {
                    icon: "🎯",
                    label: "Kcal",
                    val: mediaKcal > 0 ? `${mediaKcal}` : "—",
                    sub: "média kcal",
                  },
                  {
                    icon: "💪",
                    label: "Proteína",
                    val: mediaProt > 0 ? `${mediaProt}g` : "—",
                    sub: "média/dia",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      background: "#24282d",
                      borderRadius: 10,
                      padding: "10px 8px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      textAlign: "center",
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: "#f8fafc",
                        lineHeight: 1.2,
                      }}
                    >
                      {item.val}
                    </div>
                    <div
                      style={{ fontSize: 9, color: "#64748b", lineHeight: 1.3 }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{ fontSize: 9, color: "#475569", lineHeight: 1.3 }}
                    >
                      {item.sub}
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  textAlign: "center",
                  fontSize: 10,
                  color: "#475569",
                  marginTop: 4,
                }}
              >
                dayforge-web.vercel.app ·{" "}
                {new Date().toLocaleDateString("pt-BR")}
              </div>
            </div>
          </div>

          <button
            onClick={async () => {
              setCompartilhando(true);
              try {
                const html2canvas = (await import("html2canvas")).default;
                const el = document.getElementById("share-card");
                const canvasRaw = await html2canvas(el, {
                  backgroundColor: null,
                  scale: 2,
                  useCORS: true,
                });
                const pad = 20;
                const finalCanvas = document.createElement("canvas");
                finalCanvas.width = canvasRaw.width + pad * 2;
                finalCanvas.height = canvasRaw.height + pad * 2;
                const ctx = finalCanvas.getContext("2d");
                ctx.fillStyle = "#0f1113";
                ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
                const r = 40;
                ctx.beginPath();
                ctx.moveTo(pad + r, pad);
                ctx.lineTo(finalCanvas.width - pad - r, pad);
                ctx.quadraticCurveTo(
                  finalCanvas.width - pad,
                  pad,
                  finalCanvas.width - pad,
                  pad + r,
                );
                ctx.lineTo(
                  finalCanvas.width - pad,
                  finalCanvas.height - pad - r,
                );
                ctx.quadraticCurveTo(
                  finalCanvas.width - pad,
                  finalCanvas.height - pad,
                  finalCanvas.width - pad - r,
                  finalCanvas.height - pad,
                );
                ctx.lineTo(pad + r, finalCanvas.height - pad);
                ctx.quadraticCurveTo(
                  pad,
                  finalCanvas.height - pad,
                  pad,
                  finalCanvas.height - pad - r,
                );
                ctx.lineTo(pad, pad + r);
                ctx.quadraticCurveTo(pad, pad, pad + r, pad);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(canvasRaw, pad, pad);
                finalCanvas.toBlob(async (blob) => {
                  if (
                    navigator.share &&
                    navigator.canShare({
                      files: [
                        new File([blob], "dayforge.png", { type: "image/png" }),
                      ],
                    })
                  ) {
                    await navigator.share({
                      title: "Meu relatório semanal — DayForge",
                      files: [
                        new File([blob], "dayforge.png", { type: "image/png" }),
                      ],
                    });
                  } else {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "dayforge-semana.png";
                    a.click();
                    URL.revokeObjectURL(url);
                  }
                });
              } catch (e) {
                alert("Erro ao gerar imagem: " + e.message);
              }
              setCompartilhando(false);
            }}
            style={{
              width: "100%",
              background: "#6366f1",
              border: "none",
              borderRadius: 12,
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              padding: 14,
              cursor: "pointer",
              opacity: compartilhando ? 0.7 : 1,
            }}
          >
            {compartilhando ? "Gerando..." : "📤 Compartilhar Semana"}
          </button>
        </>
      )}

      {/* ABA MÊS */}
      {aba === "mes" && (
        <>
          <select
            value={mesSel}
            onChange={(e) => setMesSel(e.target.value)}
            style={{
              width: "100%",
              background: "#1a1d21",
              border: "1px solid #ffffff0d",
              borderRadius: 10,
              color: "#f8fafc",
              fontSize: 13,
              padding: "10px 12px",
              marginBottom: 16,
            }}
          >
            {mesesOpts.map((o) => (
              <option key={o.val} value={o.val}>
                {o.label}
              </option>
            ))}
          </select>

          {carregandoMes ? (
            <div
              style={{ textAlign: "center", color: "#64748b", paddingTop: 20 }}
            >
              Carregando... 📊
            </div>
          ) : (
            <>
              {/* Grid highlights mensal */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <StatCard
                  icon="🏋️"
                  label="TREINOS"
                  val={totalTreinosMes}
                  sub={
                    totalTreinosMes > 0
                      ? formatarTempo(tempoTotalMes) + " total"
                      : "nenhum"
                  }
                  cor={totalTreinosMes >= 10 ? "#10b981" : "#f8fafc"}
                />
                <StatCard
                  icon="🔥"
                  label="KCAL TREINO"
                  val={
                    kcalTotalMes > 0
                      ? kcalTotalMes.toLocaleString("pt-BR")
                      : "—"
                  }
                  sub="queimadas no mês"
                  cor="#f97316"
                />
                <StatCard
                  icon="💧"
                  label="META ÁGUA"
                  val={`${diasMetaAguaMes}/${diasNoMes}`}
                  sub="dias atingidos"
                  cor={
                    diasMetaAguaMes >= diasNoMes * 0.7 ? "#10b981" : "#f97316"
                  }
                />
                <StatCard
                  icon="👟"
                  label="META PASSOS"
                  val={`${diasMetaPassosMes}/${diasNoMes}`}
                  sub="dias atingidos"
                  cor={
                    diasMetaPassosMes >= diasNoMes * 0.7 ? "#10b981" : "#f97316"
                  }
                />
                <StatCard
                  icon="⚖️"
                  label="PESO"
                  val={
                    variacaoPesoMes !== null
                      ? `${variacaoPesoMes > 0 ? "+" : ""}${variacaoPesoMes} kg`
                      : "—"
                  }
                  sub={
                    pesoInicioMes
                      ? `${pesoInicioMes}kg → ${pesoFimMes}kg`
                      : "sem registro"
                  }
                  cor={
                    variacaoPesoMes !== null
                      ? variacaoPesoMes < 0
                        ? "#10b981"
                        : variacaoPesoMes > 0
                          ? "#ef4444"
                          : "#64748b"
                      : "#64748b"
                  }
                />
                <StatCard
                  icon="😴"
                  label="SONO"
                  val={mediaHorasSonoMes ? `${mediaHorasSonoMes}h` : "—"}
                  sub={
                    mediaHorasSonoMes
                      ? `${diasSono7hMes}/${diasNoMes} dias ≥7h`
                      : "sem registros"
                  }
                  cor={
                    parseFloat(mediaHorasSonoMes) >= 7 ? "#10b981" : "#f97316"
                  }
                />
              </div>

              {/* Divisões */}
              {Object.keys(divisoesMes).length > 0 && (
                <div className="stats-card">
                  <div className="stats-card-title">🏋️ TREINOS POR DIVISÃO</div>
                  {Object.entries(divisoesMes)
                    .sort((a, b) => b[1] - a[1])
                    .map(([div, qtd]) => (
                      <div
                        key={div}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "7px 0",
                          borderBottom: "1px solid #ffffff06",
                        }}
                      >
                        <span style={{ fontSize: 13, color: "#94a3b8" }}>
                          Treino {div}
                        </span>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              height: 5,
                              width: Math.round((qtd / totalTreinosMes) * 80),
                              background: "#6366f1",
                              borderRadius: 99,
                            }}
                          />
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: "#6366f1",
                              minWidth: 24,
                            }}
                          >
                            {qtd}x
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {pesosMes.length >= 2 && (
                <div className="stats-card">
                  <div className="stats-card-title">⚖️ EVOLUÇÃO DO PESO</div>
                  <ResponsiveContainer width="100%" height={110}>
                    <LineChart
                      data={pesosMes.map((p) => ({
                        name: new Date(p.data + "T00:00:00").toLocaleDateString(
                          "pt-BR",
                          { day: "2-digit", month: "2-digit" },
                        ),
                        peso: Number(p.peso),
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#64748b", fontSize: 9 }}
                      />
                      <YAxis
                        tick={{ fill: "#64748b", fontSize: 9 }}
                        domain={["auto", "auto"]}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v) => [`${v} kg`]}
                      />
                      <Line
                        type="monotone"
                        dataKey="peso"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={{ fill: "#6366f1", r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {sonoMes.length >= 2 && (
                <div className="stats-card">
                  <div className="stats-card-title">😴 EVOLUÇÃO DO SONO</div>
                  <ResponsiveContainer width="100%" height={110}>
                    <BarChart
                      data={sonoMes.map((r) => ({
                        name: new Date(r.data + "T00:00:00").toLocaleDateString(
                          "pt-BR",
                          { day: "2-digit", month: "2-digit" },
                        ),
                        horas: calcularHoras(r.dormiu, r.acordou),
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#64748b", fontSize: 9 }}
                      />
                      <YAxis
                        tick={{ fill: "#64748b", fontSize: 9 }}
                        domain={[0, 10]}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v) => [`${v}h`]}
                      />
                      <Bar
                        dataKey="horas"
                        fill="#6366f1"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {totalTreinosMes === 0 &&
                pesosMes.length === 0 &&
                diasMetaAguaMes === 0 &&
                sonoMes.length === 0 && (
                  <p
                    style={{
                      textAlign: "center",
                      color: "#475569",
                      fontSize: 13,
                      paddingTop: 20,
                    }}
                  >
                    Nenhum dado registrado neste mês ainda.
                  </p>
                )}
            </>
          )}
        </>
      )}
    </div>
  );
}
