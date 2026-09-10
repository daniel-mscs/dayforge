import React, { useState, useEffect, useCallback } from "react";
import { toast } from "./lib/toast";
import MetasPessoais from "./MetasPessoais";
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
  Area,
  AreaChart,
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

const CSS_VARS = `
  :root {
    --bg: #080a0e;
    --surface: #0f1218;
    --surface2: #151920;
    --border: rgba(255,255,255,0.06);
    --border2: rgba(255,255,255,0.1);
    --text: #f0f2f7;
    --text2: #8892a4;
    --text3: #4a5568;
    --accent: #5b7fff;
    --accent2: #7c3aed;
    --green: #00d97e;
    --orange: #ff8c42;
    --red: #ff4d6d;
    --yellow: #ffd166;
  }
`;

const tooltipStyle = {
  background: "#151920",
  border: "1px solid rgba(91,127,255,0.2)",
  borderRadius: 10,
  color: "#f0f2f7",
  fontSize: 12,
  boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
};

function RingProgress({ value, max, color, size = 56, stroke = 5 }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const dash = circ * pct;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
    </svg>
  );
}

function MetricRing({ icon, label, value, sub, color, pct }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        padding: "18px 14px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: color,
          opacity: 0.6,
        }}
      />
      <div style={{ position: "relative" }}>
        <RingProgress value={pct} max={1} color={color} size={60} stroke={5} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
          }}
        >
          {icon}
        </div>
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: "var(--text)",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 9,
          color: "var(--text2)",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        {label}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 10,
            color: "var(--text3)",
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 12,
        marginTop: 8,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.12em",
          color: "var(--text3)",
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      <div
        style={{
          flex: 1,
          height: 1,
          background: "var(--border)",
        }}
      />
    </div>
  );
}

function CompareRow({ icon, label, prev, atual, unit, maisMelhor = true }) {
  const diff = atual - prev;
  const melhorou = maisMelhor ? diff > 0 : diff < 0;
  const cor =
    diff === 0 ? "var(--text3)" : melhorou ? "var(--green)" : "var(--red)";
  const seta = diff === 0 ? null : melhorou ? "↑" : "↓";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <span style={{ fontSize: 13, color: "var(--text2)" }}>
        {icon} {label}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 12, color: "var(--text3)" }}>
          {prev}
          {unit}
        </span>
        <span style={{ fontSize: 10, color: "var(--text3)" }}>→</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
          {atual}
          {unit}
        </span>
        {seta && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: cor,
              minWidth: 32,
              textAlign: "right",
            }}
          >
            {seta} {parseFloat(Math.abs(diff).toFixed(1))}
          </span>
        )}
      </div>
    </div>
  );
}

function InsightRow({ icon, label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "9px 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <span style={{ fontSize: 13, color: "var(--text2)" }}>
        {icon} {label}
      </span>
      <strong style={{ fontSize: 13, color: "var(--text)", fontWeight: 700 }}>
        {value}
      </strong>
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
  const [aba, setAba] = useState("metas");
  const [semanaAnterior, setSemanaAnterior] = useState(null);

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

  const getPrev7Days = () =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return formatarData(d);
    });
  const prev7 = getPrev7Days();
  const inicioPrev = prev7[0];
  const fimPrev = prev7[6];

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

    const [
      { data: treinosPrev },
      { data: aguaPrev },
      { data: passosPrev },
      { data: sonoPrev },
      { data: aguaMetaPrev },
      { data: passosMetaPrev },
    ] = await Promise.all([
      supabase
        .from("treinos_finalizados")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", inicioPrev)
        .lte("created_at", fimPrev + "T23:59:59"),
      supabase
        .from("agua_registro")
        .select("*")
        .eq("user_id", user.id)
        .gte("data", inicioPrev)
        .lte("data", fimPrev),
      supabase
        .from("passos_registro")
        .select("*")
        .eq("user_id", user.id)
        .gte("data", inicioPrev)
        .lte("data", fimPrev),
      supabase
        .from("sono_registro")
        .select("*")
        .eq("user_id", user.id)
        .gte("data", inicioPrev)
        .lte("data", fimPrev),
      supabase
        .from("agua_meta")
        .select("meta_ml")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("passos_meta")
        .select("meta_passos")
        .eq("user_id", user.id)
        .single(),
    ]);

    const metaAguaVal = aguaMetaPrev?.meta_ml || 2500;
    const metaPassosVal = passosMetaPrev?.meta_passos || 10000;
    const aguaPrevPorDia = prev7.map((d) => ({
      total: (aguaPrev || [])
        .filter((r) => r.data === d)
        .reduce((s, r) => s + r.ml, 0),
    }));
    const diasMetaAguaPrev = aguaPrevPorDia.filter(
      (d) => d.total >= metaAguaVal,
    ).length;
    const diasMetaPassosPrev = (passosPrev || []).filter(
      (r) => r.passos >= metaPassosVal,
    ).length;
    const sonoFiltradoPrev = (sonoPrev || []).filter((r) =>
      prev7.includes(r.data),
    );
    const mediaHorasSonoPrev =
      sonoFiltradoPrev.length > 0
        ? (
            sonoFiltradoPrev.reduce(
              (s, r) => s + calcularHoras(r.dormiu, r.acordou),
              0,
            ) / sonoFiltradoPrev.length
          ).toFixed(1)
        : null;

    setSemanaAnterior({
      treinos: (treinosPrev || []).length,
      diasAgua: diasMetaAguaPrev,
      diasPassos: diasMetaPassosPrev,
      horasSono: mediaHorasSonoPrev,
    });

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

  // ── Cálculos semanais ──
  const totalTreinos = treinos.length;
  const tempoTotal = treinos.reduce((s, t) => s + (t.tempo_segundos || 0), 0);
  const kcalTreinoSemana = treinos.reduce((s, t) => s + (t.kcal || 0), 0);

  const formatarTempo = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  };

  const aguaPorDia = ultimos7.map((data) => ({
    data,
    name: new Date(data + "T00:00:00").toLocaleDateString("pt-BR", {
      weekday: "short",
    }),
    total: agua.filter((r) => r.data === data).reduce((s, r) => s + r.ml, 0),
  }));
  const mediaAgua = Math.round(aguaPorDia.reduce((s, d) => s + d.total, 0) / 7);
  const diasMetaAgua = aguaPorDia.filter((d) => d.total >= aguaMeta).length;

  const pesoDados = ultimos7
    .map((data) => {
      const reg = pesos.find((r) => r.data === data);
      return {
        data,
        name: new Date(data + "T00:00:00").toLocaleDateString("pt-BR", {
          weekday: "short",
          day: "2-digit",
        }),
        peso: reg ? Number(reg.peso) : null,
      };
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
      name: new Date(data + "T00:00:00").toLocaleDateString("pt-BR", {
        weekday: "short",
      }),
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
    return {
      data,
      name: new Date(data + "T00:00:00").toLocaleDateString("pt-BR", {
        weekday: "short",
      }),
      passos: reg?.passos || 0,
    };
  });
  const mediaPassos = Math.round(
    passosPorDia.reduce((s, d) => s + d.passos, 0) / 7,
  );
  const diasMetaPassos = passosPorDia.filter(
    (d) => d.passos >= passosMeta,
  ).length;
  const totalPassosSemana = passosPorDia.reduce((s, d) => s + d.passos, 0);

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
      }),
      horas: reg ? calcularHoras(reg.dormiu, reg.acordou) : 0,
    };
  });

  const volumeTotal = treinos.reduce((s, t) => s + (t.volume_total || 0), 0);
  const mediaDuracaoTreino =
    treinos.length > 0
      ? Math.round(
          treinos.reduce((s, t) => s + (t.tempo_segundos || 0), 0) /
            treinos.length /
            60,
        )
      : null;
  const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const treinoPorDia = treinos.reduce((acc, t) => {
    const dow = new Date(t.created_at).getDay();
    acc[dow] = (acc[dow] || 0) + 1;
    return acc;
  }, {});
  const diaMaisTreino = Object.entries(treinoPorDia).sort(
    (a, b) => b[1] - a[1],
  )[0];

  // ── Cálculos mensais ──
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
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: 300,
          gap: 12,
          color: "var(--text3)",
        }}
      >
        <div style={{ fontSize: 32 }}>📊</div>
        <div style={{ fontSize: 13 }}>Carregando seus stats...</div>
      </div>
    );

  return (
    <>
      <style>{CSS_VARS}</style>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 0,
          paddingBottom: 80,
          background: "transparent",
        }}
      >
        {/* Hero header */}
        <div
          style={{
            padding: "24px 0 20px",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: 200,
              height: 200,
              background:
                "radial-gradient(circle, rgba(91,127,255,0.12) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.2em",
              color: "var(--text3)",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            DayForge
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: "var(--text)",
              lineHeight: 1.1,
              marginBottom: 4,
            }}
          >
            {perfil?.nome
              ? `${perfil.nome.split(" ")[0]}'s Stats`
              : "Seus Stats"}
          </div>
          <div style={{ fontSize: 12, color: "var(--text3)" }}>
            {new Date(inicio + "T00:00:00").toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
            })}{" "}
            —{" "}
            {new Date().toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
            })}
          </div>
        </div>

        {/* Tab switcher */}
        <div
          style={{
            display: "flex",
            background: "var(--surface)",
            borderRadius: 14,
            padding: 4,
            marginBottom: 20,
            border: "1px solid var(--border)",
          }}
        >
          {[
            { id: "metas", label: "Metas" },
            { id: "semana", label: "Semana" },
            { id: "mes", label: "Mês" },
          ].map((a) => (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              style={{
                flex: 1,
                background:
                  aba === a.id
                    ? "linear-gradient(135deg, var(--accent), var(--accent2))"
                    : "transparent",
                border: "none",
                borderRadius: 10,
                color: aba === a.id ? "#fff" : "var(--text3)",
                fontSize: 13,
                fontWeight: 700,
                padding: "10px 0",
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow:
                  aba === a.id ? "0 4px 16px rgba(91,127,255,0.3)" : "none",
              }}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* ══ ABA METAS ══ */}
        {aba === "metas" && <MetasPessoais user={user} />}

        {/* ══ ABA SEMANA ══ */}
        {aba === "semana" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* XP / RPG strip */}
            <div
              style={{
                background:
                  "linear-gradient(135deg, rgba(91,127,255,0.1), rgba(124,58,237,0.1))",
                border: "1px solid rgba(91,127,255,0.2)",
                borderRadius: 18,
                padding: "16px 20px",
                display: "flex",
                justifyContent: "space-around",
                alignItems: "center",
              }}
            >
              {[
                {
                  icon: "🔥",
                  val: rpg?.streak || 0,
                  label: "dias streak",
                  cor: "#ff8c42",
                },
                {
                  icon: "⭐",
                  val: (rpg?.xp || 0).toLocaleString("pt-BR"),
                  label: "XP total",
                  cor: "#5b7fff",
                },
                {
                  icon: "🏆",
                  val: `Nv. ${rpg?.nivel || 1}`,
                  label: "nível",
                  cor: "#ffd166",
                },
              ].map((item, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, marginBottom: 2 }}>
                    {item.icon}
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 900,
                      color: item.cor,
                      lineHeight: 1,
                    }}
                  >
                    {item.val}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text3)",
                      marginTop: 2,
                    }}
                  >
                    {item.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Ring metrics grid */}
            <div>
              <SectionHeader title="Esta semana" />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 8,
                }}
              >
                <MetricRing
                  icon="🏋️"
                  label="Treinos"
                  value={totalTreinos}
                  sub={totalTreinos > 0 ? formatarTempo(tempoTotal) : "nenhum"}
                  color="#5b7fff"
                  pct={totalTreinos / 5}
                />
                <MetricRing
                  icon="💧"
                  label="Meta Água"
                  value={`${diasMetaAgua}/7`}
                  sub={`${(aguaMeta / 1000).toFixed(1)}L/dia`}
                  color="#00d97e"
                  pct={diasMetaAgua / 7}
                />
                <MetricRing
                  icon="👟"
                  label="Meta Passos"
                  value={`${diasMetaPassos}/7`}
                  sub={`${(mediaPassos / 1000).toFixed(1)}k/dia`}
                  color="#ff8c42"
                  pct={diasMetaPassos / 7}
                />
                <MetricRing
                  icon="😴"
                  label="Sono"
                  value={mediaHorasSono ? `${mediaHorasSono}h` : "—"}
                  sub={mediaHorasSono ? `${diasSono7h}/7 ≥ 7h` : "sem dados"}
                  color="#7c3aed"
                  pct={mediaHorasSono ? parseFloat(mediaHorasSono) / 9 : 0}
                />
                <MetricRing
                  icon="⚖️"
                  label="Peso"
                  value={
                    pesoDados.length > 0
                      ? `${pesoDados[pesoDados.length - 1].peso}kg`
                      : "—"
                  }
                  sub={
                    variacaoPeso !== null
                      ? `${variacaoPeso > 0 ? "+" : ""}${variacaoPeso}kg`
                      : "sem dados"
                  }
                  color={
                    variacaoPeso !== null
                      ? variacaoPeso <= 0
                        ? "#00d97e"
                        : "#ff4d6d"
                      : "#5b7fff"
                  }
                  pct={0.6}
                />
                <MetricRing
                  icon="🍽️"
                  label="Kcal"
                  value={mediaKcal > 0 ? `${mediaKcal}` : "—"}
                  sub={mediaProt > 0 ? `${mediaProt}g prot` : "sem dados"}
                  color="#ffd166"
                  pct={mediaKcal > 0 ? 0.7 : 0}
                />
              </div>
            </div>

            {/* Gráficos */}
            {treinos.length > 0 && (
              <div>
                <SectionHeader title="Treinos na semana" />
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 18,
                    padding: 16,
                  }}
                >
                  <ResponsiveContainer width="100%" height={110}>
                    <BarChart
                      data={treinos.map((t) => ({
                        name: `${t.treino} ${new Date(t.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`,
                        min: Math.round((t.tempo_segundos || 0) / 60),
                      }))}
                    >
                      <defs>
                        <linearGradient
                          id="gTreino"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#5b7fff"
                            stopOpacity={1}
                          />
                          <stop
                            offset="100%"
                            stopColor="#7c3aed"
                            stopOpacity={0.8}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.04)"
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#4a5568", fontSize: 9 }}
                      />
                      <YAxis tick={{ fill: "#4a5568", fontSize: 9 }} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v) => [`${v} min`, "Duração"]}
                        cursor={{ fill: "rgba(255,255,255,0.03)" }}
                      />
                      <Bar
                        dataKey="min"
                        fill="url(#gTreino)"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {pesoDados.length >= 2 && (
              <div>
                <SectionHeader title="Evolução do peso" />
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 18,
                    padding: 16,
                  }}
                >
                  <ResponsiveContainer width="100%" height={100}>
                    <AreaChart data={pesoDados}>
                      <defs>
                        <linearGradient id="gPeso" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="0%"
                            stopColor="#00d97e"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="100%"
                            stopColor="#00d97e"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.04)"
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#4a5568", fontSize: 9 }}
                      />
                      <YAxis
                        tick={{ fill: "#4a5568", fontSize: 9 }}
                        domain={["auto", "auto"]}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v) => [`${v} kg`, "Peso"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="peso"
                        stroke="#00d97e"
                        strokeWidth={2.5}
                        fill="url(#gPeso)"
                        dot={{
                          fill: "#00d97e",
                          r: 4,
                          stroke: "#080a0e",
                          strokeWidth: 2,
                        }}
                        activeDot={{ r: 6 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {aguaPorDia.some((d) => d.total > 0) && (
              <div>
                <SectionHeader title="Hidratação diária" />
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 18,
                    padding: 16,
                  }}
                >
                  <ResponsiveContainer width="100%" height={100}>
                    <BarChart data={aguaPorDia}>
                      <defs>
                        <linearGradient id="gAgua" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="0%"
                            stopColor="#00d97e"
                            stopOpacity={1}
                          />
                          <stop
                            offset="100%"
                            stopColor="#00d97e"
                            stopOpacity={0.4}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.04)"
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#4a5568", fontSize: 9 }}
                      />
                      <YAxis tick={{ fill: "#4a5568", fontSize: 9 }} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v) => [`${(v / 1000).toFixed(1)}L`, "Água"]}
                        cursor={{ fill: "rgba(255,255,255,0.03)" }}
                      />
                      <Bar
                        dataKey="total"
                        fill="url(#gAgua)"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {diasComMacros.length > 0 && (
              <div>
                <SectionHeader title="Kcal diária" />
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 18,
                    padding: 16,
                  }}
                >
                  <ResponsiveContainer width="100%" height={100}>
                    <BarChart data={macrosPorDia}>
                      <defs>
                        <linearGradient id="gKcal" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="0%"
                            stopColor="#ffd166"
                            stopOpacity={1}
                          />
                          <stop
                            offset="100%"
                            stopColor="#ff8c42"
                            stopOpacity={0.6}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.04)"
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#4a5568", fontSize: 9 }}
                      />
                      <YAxis tick={{ fill: "#4a5568", fontSize: 9 }} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v) => [`${v} kcal`, "Ingerido"]}
                        cursor={{ fill: "rgba(255,255,255,0.03)" }}
                      />
                      <Bar
                        dataKey="kcal"
                        fill="url(#gKcal)"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {sonoComRegistro.length > 0 && (
              <div>
                <SectionHeader title="Horas de sono" />
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 18,
                    padding: 16,
                  }}
                >
                  <ResponsiveContainer width="100%" height={100}>
                    <BarChart data={sonoPorDia}>
                      <defs>
                        <linearGradient id="gSono" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="0%"
                            stopColor="#7c3aed"
                            stopOpacity={1}
                          />
                          <stop
                            offset="100%"
                            stopColor="#5b7fff"
                            stopOpacity={0.5}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.04)"
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#4a5568", fontSize: 9 }}
                      />
                      <YAxis
                        tick={{ fill: "#4a5568", fontSize: 9 }}
                        domain={[0, 10]}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v) => [`${v}h`, "Dormido"]}
                        cursor={{ fill: "rgba(255,255,255,0.03)" }}
                      />
                      <Bar
                        dataKey="horas"
                        fill="url(#gSono)"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Comparativo semana anterior */}
            {semanaAnterior && (
              <div>
                <SectionHeader title="vs semana anterior" />
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 18,
                    padding: "4px 16px",
                  }}
                >
                  <CompareRow
                    icon="🏋️"
                    label="Treinos"
                    prev={semanaAnterior.treinos}
                    atual={totalTreinos}
                    unit="x"
                    maisMelhor
                  />
                  <CompareRow
                    icon="💧"
                    label="Meta Água"
                    prev={semanaAnterior.diasAgua}
                    atual={diasMetaAgua}
                    unit="/7"
                    maisMelhor
                  />
                  <CompareRow
                    icon="👟"
                    label="Meta Passos"
                    prev={semanaAnterior.diasPassos}
                    atual={diasMetaPassos}
                    unit="/7"
                    maisMelhor
                  />
                  <CompareRow
                    icon="😴"
                    label="Sono médio"
                    prev={parseFloat(semanaAnterior.horasSono || 0)}
                    atual={parseFloat(mediaHorasSono || 0)}
                    unit="h"
                    maisMelhor
                  />
                </div>
              </div>
            )}

            {/* Insights */}
            {(mediaDuracaoTreino ||
              volumeTotal > 0 ||
              diaMaisTreino ||
              totalPassosSemana > 0 ||
              mediaProt > 0) && (
              <div>
                <SectionHeader title="Insights" />
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 18,
                    padding: "4px 16px",
                  }}
                >
                  {mediaDuracaoTreino && (
                    <InsightRow
                      icon="⏱️"
                      label="Duração média por treino"
                      value={`${mediaDuracaoTreino} min`}
                    />
                  )}
                  {volumeTotal > 0 && (
                    <InsightRow
                      icon="📦"
                      label="Volume total levantado"
                      value={`${volumeTotal.toLocaleString("pt-BR")} kg`}
                    />
                  )}
                  {diaMaisTreino && (
                    <InsightRow
                      icon="📅"
                      label="Dia que mais treinou"
                      value={diasSemana[diaMaisTreino[0]]}
                    />
                  )}
                  {totalPassosSemana > 0 && (
                    <InsightRow
                      icon="🗺️"
                      label="Total de passos na semana"
                      value={totalPassosSemana.toLocaleString("pt-BR")}
                    />
                  )}
                  {mediaProt > 0 && (
                    <InsightRow
                      icon="💪"
                      label="Proteína média diária"
                      value={`${mediaProt}g`}
                    />
                  )}
                  {kcalTreinoSemana > 0 && (
                    <InsightRow
                      icon="🔥"
                      label="Kcal queimadas no treino"
                      value={`${kcalTreinoSemana}`}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Share card */}
            <div>
              <SectionHeader title="Relatório semanal" />
              <div
                id="share-card"
                style={{
                  background:
                    "linear-gradient(135deg, #0a0c12 0%, #0f1420 50%, #0a0c12 100%)",
                  border: "1px solid rgba(91,127,255,0.15)",
                  borderRadius: 20,
                  padding: 20,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--text3)",
                        fontWeight: 800,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                      }}
                    >
                      Relatório Semanal
                    </div>
                    <div
                      style={{
                        fontSize: 17,
                        fontWeight: 800,
                        color: "var(--text)",
                        marginTop: 2,
                      }}
                    >
                      {perfil?.nome || "DayForge"}
                    </div>
                  </div>
                  <div
                    style={{
                      background: "rgba(91,127,255,0.15)",
                      border: "1px solid rgba(91,127,255,0.3)",
                      borderRadius: 10,
                      padding: "6px 10px",
                      fontSize: 10,
                      color: "#5b7fff",
                      fontWeight: 700,
                    }}
                  >
                    {new Date().toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 6,
                  }}
                >
                  {[
                    {
                      icon: "🏋️",
                      label: "Treinos",
                      val: totalTreinos,
                      sub: totalTreinos > 0 ? formatarTempo(tempoTotal) : "—",
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
                          : "—",
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
                  ].map((item, i) => (
                    <div
                      key={i}
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 12,
                        padding: "10px 6px",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: 16, marginBottom: 4 }}>
                        {item.icon}
                      </div>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color: "var(--text)",
                          lineHeight: 1,
                          marginBottom: 2,
                        }}
                      >
                        {item.val}
                      </div>
                      <div style={{ fontSize: 9, color: "var(--text3)" }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 9, color: "var(--text3)" }}>
                        {item.sub}
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    textAlign: "center",
                    fontSize: 10,
                    color: "var(--text3)",
                    marginTop: 14,
                    letterSpacing: "0.06em",
                  }}
                >
                  dayforge-web.vercel.app
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
                    canvasRaw.toBlob(async (blob) => {
                      if (
                        navigator.share &&
                        navigator.canShare({
                          files: [
                            new File([blob], "dayforge.png", {
                              type: "image/png",
                            }),
                          ],
                        })
                      ) {
                        await navigator.share({
                          title: "Meu relatório semanal — DayForge",
                          files: [
                            new File([blob], "dayforge.png", {
                              type: "image/png",
                            }),
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
                    toast("Erro ao gerar imagem: " + e.message, "error");
                  }
                  setCompartilhando(false);
                }}
                style={{
                  width: "100%",
                  background:
                    "linear-gradient(135deg, var(--accent), var(--accent2))",
                  border: "none",
                  borderRadius: 14,
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  padding: 14,
                  cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(91,127,255,0.35)",
                  opacity: compartilhando ? 0.7 : 1,
                }}
              >
                {compartilhando ? "Gerando..." : "📤 Compartilhar Semana"}
              </button>
            </div>
          </div>
        )}

        {/* ══ ABA MÊS ══ */}
        {aba === "mes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <select
              value={mesSel}
              onChange={(e) => setMesSel(e.target.value)}
              style={{
                width: "100%",
                background: "var(--surface)",
                border: "1px solid var(--border2)",
                borderRadius: 12,
                color: "var(--text)",
                fontSize: 13,
                padding: "12px 14px",
                outline: "none",
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
                style={{
                  textAlign: "center",
                  color: "var(--text3)",
                  padding: 40,
                }}
              >
                Carregando... 📊
              </div>
            ) : (
              <>
                {/* Grid mensal */}
                <div>
                  <SectionHeader title="Resumo do mês" />
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 8,
                    }}
                  >
                    <MetricRing
                      icon="🏋️"
                      label="Treinos"
                      value={totalTreinosMes}
                      sub={
                        totalTreinosMes > 0
                          ? formatarTempo(tempoTotalMes)
                          : "nenhum"
                      }
                      color="#5b7fff"
                      pct={totalTreinosMes / 20}
                    />
                    <MetricRing
                      icon="💧"
                      label="Meta Água"
                      value={`${diasMetaAguaMes}/${diasNoMes}`}
                      sub="dias atingidos"
                      color="#00d97e"
                      pct={diasMetaAguaMes / diasNoMes}
                    />
                    <MetricRing
                      icon="👟"
                      label="Meta Passos"
                      value={`${diasMetaPassosMes}/${diasNoMes}`}
                      sub="dias atingidos"
                      color="#ff8c42"
                      pct={diasMetaPassosMes / diasNoMes}
                    />
                    <MetricRing
                      icon="😴"
                      label="Sono"
                      value={mediaHorasSonoMes ? `${mediaHorasSonoMes}h` : "—"}
                      sub={
                        mediaHorasSonoMes
                          ? `${diasSono7hMes}/${diasNoMes} ≥7h`
                          : "sem dados"
                      }
                      color="#7c3aed"
                      pct={
                        mediaHorasSonoMes
                          ? parseFloat(mediaHorasSonoMes) / 9
                          : 0
                      }
                    />
                    <MetricRing
                      icon="⚖️"
                      label="Peso"
                      value={
                        variacaoPesoMes !== null
                          ? `${variacaoPesoMes > 0 ? "+" : ""}${variacaoPesoMes}kg`
                          : "—"
                      }
                      sub={
                        pesoInicioMes
                          ? `${pesoInicioMes} → ${pesoFimMes}kg`
                          : "sem dados"
                      }
                      color={
                        variacaoPesoMes !== null
                          ? variacaoPesoMes <= 0
                            ? "#00d97e"
                            : "#ff4d6d"
                          : "#5b7fff"
                      }
                      pct={0.6}
                    />
                    <MetricRing
                      icon="🔥"
                      label="Kcal"
                      value={
                        kcalTotalMes > 0
                          ? kcalTotalMes.toLocaleString("pt-BR")
                          : "—"
                      }
                      sub="queimadas"
                      color="#ffd166"
                      pct={kcalTotalMes > 0 ? 0.7 : 0}
                    />
                  </div>
                </div>

                {/* Divisões */}
                {Object.keys(divisoesMes).length > 0 && (
                  <div>
                    <SectionHeader title="Treinos por divisão" />
                    <div
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 18,
                        padding: "8px 16px",
                      }}
                    >
                      {Object.entries(divisoesMes)
                        .sort((a, b) => b[1] - a[1])
                        .map(([div, qtd]) => (
                          <div
                            key={div}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "10px 0",
                              borderBottom: "1px solid var(--border)",
                            }}
                          >
                            <span
                              style={{
                                fontSize: 13,
                                color: "var(--text2)",
                              }}
                            >
                              Treino {div}
                            </span>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              <div
                                style={{
                                  height: 4,
                                  width: Math.round(
                                    (qtd / totalTreinosMes) * 80,
                                  ),
                                  background:
                                    "linear-gradient(90deg, #5b7fff, #7c3aed)",
                                  borderRadius: 99,
                                }}
                              />
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 800,
                                  color: "#5b7fff",
                                  minWidth: 24,
                                }}
                              >
                                {qtd}x
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Insights mensais */}
                {(totalTreinosMes > 0 ||
                  sonoMes.length > 0 ||
                  passosMes.length > 0) && (
                  <div>
                    <SectionHeader title="Insights do mês" />
                    <div
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 18,
                        padding: "4px 16px",
                      }}
                    >
                      {totalTreinosMes > 0 && (
                        <InsightRow
                          icon="⏱️"
                          label="Duração média por treino"
                          value={`${Math.round(tempoTotalMes / totalTreinosMes / 60)} min`}
                        />
                      )}
                      {treinosMes.reduce(
                        (s, t) => s + (t.volume_total || 0),
                        0,
                      ) > 0 && (
                        <InsightRow
                          icon="📦"
                          label="Volume total levantado"
                          value={`${treinosMes.reduce((s, t) => s + (t.volume_total || 0), 0).toLocaleString("pt-BR")} kg`}
                        />
                      )}
                      {passosMes.length > 0 && (
                        <InsightRow
                          icon="🗺️"
                          label="Km percorridos (passos)"
                          value={`~${Math.round(passosMes.reduce((s, r) => s + r.passos, 0) * 0.0008)} km`}
                        />
                      )}
                      {mediaQualidadeSonoMes && (
                        <InsightRow
                          icon="😴"
                          label="Qualidade média do sono"
                          value={`${mediaQualidadeSonoMes}/5`}
                        />
                      )}
                      {kcalTotalMes > 0 && (
                        <InsightRow
                          icon="🔥"
                          label="Kcal queimadas (treino)"
                          value={kcalTotalMes.toLocaleString("pt-BR")}
                        />
                      )}
                    </div>
                  </div>
                )}

                {pesosMes.length >= 2 && (
                  <div>
                    <SectionHeader title="Evolução do peso" />
                    <div
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 18,
                        padding: 16,
                      }}
                    >
                      <ResponsiveContainer width="100%" height={120}>
                        <AreaChart
                          data={pesosMes.map((p) => ({
                            name: new Date(
                              p.data + "T00:00:00",
                            ).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                            }),
                            peso: Number(p.peso),
                          }))}
                        >
                          <defs>
                            <linearGradient
                              id="gPesoMes"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#5b7fff"
                                stopOpacity={0.3}
                              />
                              <stop
                                offset="100%"
                                stopColor="#5b7fff"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.04)"
                          />
                          <XAxis
                            dataKey="name"
                            tick={{ fill: "#4a5568", fontSize: 9 }}
                          />
                          <YAxis
                            tick={{ fill: "#4a5568", fontSize: 9 }}
                            domain={["auto", "auto"]}
                          />
                          <Tooltip
                            contentStyle={tooltipStyle}
                            formatter={(v) => [`${v} kg`]}
                          />
                          <Area
                            type="monotone"
                            dataKey="peso"
                            stroke="#5b7fff"
                            strokeWidth={2.5}
                            fill="url(#gPesoMes)"
                            dot={{
                              fill: "#5b7fff",
                              r: 3,
                              stroke: "#080a0e",
                              strokeWidth: 2,
                            }}
                            activeDot={{ r: 5 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {sonoMes.length >= 2 && (
                  <div>
                    <SectionHeader title="Sono no mês" />
                    <div
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 18,
                        padding: 16,
                      }}
                    >
                      <ResponsiveContainer width="100%" height={110}>
                        <BarChart
                          data={sonoMes.map((r) => ({
                            name: new Date(
                              r.data + "T00:00:00",
                            ).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                            }),
                            horas: calcularHoras(r.dormiu, r.acordou),
                          }))}
                        >
                          <defs>
                            <linearGradient
                              id="gSonoMes"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#7c3aed"
                                stopOpacity={1}
                              />
                              <stop
                                offset="100%"
                                stopColor="#5b7fff"
                                stopOpacity={0.4}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.04)"
                          />
                          <XAxis
                            dataKey="name"
                            tick={{ fill: "#4a5568", fontSize: 9 }}
                          />
                          <YAxis
                            tick={{ fill: "#4a5568", fontSize: 9 }}
                            domain={[0, 10]}
                          />
                          <Tooltip
                            contentStyle={tooltipStyle}
                            formatter={(v) => [`${v}h`]}
                          />
                          <Bar
                            dataKey="horas"
                            fill="url(#gSonoMes)"
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {totalTreinosMes === 0 &&
                  pesosMes.length === 0 &&
                  diasMetaAguaMes === 0 &&
                  sonoMes.length === 0 && (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "40px 0",
                        color: "var(--text3)",
                        fontSize: 13,
                      }}
                    >
                      Nenhum dado registrado neste mês.
                    </div>
                  )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
