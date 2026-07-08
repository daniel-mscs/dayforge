import React, { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "./lib/supabase";
import Habitos from "./Habitos";
import Dieta from "./Dieta";
import Suplementos from "./Suplementos";
import {
  SkeletonStyle,
  SkeletonBox,
  SkeletonCard,
  SkeletonRow,
  SkeletonGrid,
} from "./lib/skeleton";
import Confetti from "react-confetti";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function formatarData(date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().split("T")[0];
}

function diasDesdeData(dataStr) {
  if (!dataStr) return null;
  return Math.floor((Date.now() - new Date(dataStr).getTime()) / 86400000);
}

function getDaysLeft() {
  const hoje = new Date();
  const fimAno = new Date(hoje.getFullYear(), 11, 31);
  const diasRestantes = Math.ceil((fimAno - hoje) / 86400000);
  const diaDoAno = Math.ceil(
    (hoje - new Date(hoje.getFullYear(), 0, 1)) / 86400000,
  );
  const totalDias = hoje.getFullYear() % 4 === 0 ? 366 : 365;
  return { diasRestantes, pct: Math.round((diaDoAno / totalDias) * 100) };
}

export default function Home({
  user,
  onIniciarTreino,
  treinando,
  treinoAtivo,
  divisao,
  onNavegar,
}) {
  const [perfil, setPerfil] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [streak, setStreak] = useState(0);
  const [aguaHoje, setAguaHoje] = useState({ total: 0, meta: 2500 });
  const [passosHoje, setPassosHoje] = useState(null);
  const [passosMeta, setPassosMeta] = useState(10000);
  const [pesoHoje, setPesoHoje] = useState(null);
  const [pesoPrev, setPesoPrev] = useState(null);
  const [rotina, setRotina] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [frase, setFrase] = useState(null);
  const [mostrarHabitos, setMostrarHabitos] = useState(() => {
    return localStorage.getItem("home_mostrar_habitos") !== "false";
  });
  const [kcalHoje, setKcalHoje] = useState(0);
  const [kcalMeta, setKcalMeta] = useState(2000);
  const [kcalGasto, setKcalGasto] = useState({ treino: 0, passos: 0 });
  const [humor, setHumor] = useState(null);
  const [sonoHoje, setSonoHoje] = useState(null);
  const [treinosSemana, setTreinosSemana] = useState([]);
  const [salvandoHumor, setSalvandoHumor] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [statsAniversario, setStatsAniversario] = useState(null);

  const isNatal = (() => {
    const hoje = new Date();
    return hoje.getDate() === 25 && hoje.getMonth() === 11;
  })();

  const isAnoNovo = (() => {
    const hoje = new Date();
    return hoje.getDate() === 1 && hoje.getMonth() === 0;
  })();

  const isAniversario = (() => {
    if (!perfil?.data_nascimento) return false;
    const nasc = new Date(perfil.data_nascimento + "T00:00:00");
    const hoje = new Date();
    return (
      nasc.getDate() === hoje.getDate() && nasc.getMonth() === hoje.getMonth()
    );
  })();

  const idadeAniversario = (() => {
    if (!perfil?.data_nascimento) return null;
    const nasc = new Date(perfil.data_nascimento + "T00:00:00");
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    if (
      hoje.getMonth() < nasc.getMonth() ||
      (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate())
    )
      idade--;
    return idade;
  })();

  useEffect(() => {
    if (isAniversario) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 8000);
      buscarStatsAniversario();
    }
    if (isNatal || isAnoNovo) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 8000);
    }
  }, [isAniversario, isNatal, isAnoNovo]);

  const buscarStatsAniversario = async () => {
    const anoAtual = new Date().getFullYear();
    const inicioAno = `${anoAtual}-01-01`;

    const [
      { data: treinos },
      { data: habitos },
      { data: agua },
      { data: passos },
      { data: pesoInicio },
      { data: pesoFim },
      { data: sono },
      { data: macros },
    ] = await Promise.all([
      supabase
        .from("treinos_finalizados")
        .select("id, tempo_segundos, kcal")
        .eq("user_id", user.id)
        .gte("created_at", inicioAno),
      supabase
        .from("habitos_check")
        .select("data")
        .eq("user_id", user.id)
        .eq("concluido", true)
        .gte("data", inicioAno),
      supabase
        .from("agua_registro")
        .select("ml")
        .eq("user_id", user.id)
        .gte("data", inicioAno),
      supabase
        .from("passos_registro")
        .select("passos")
        .eq("user_id", user.id)
        .gte("data", inicioAno),
      supabase
        .from("peso_registro")
        .select("peso")
        .eq("user_id", user.id)
        .gte("data", inicioAno)
        .order("data", { ascending: true })
        .limit(1),
      supabase
        .from("peso_registro")
        .select("peso")
        .eq("user_id", user.id)
        .order("data", { ascending: false })
        .limit(1),
      supabase
        .from("sono_registro")
        .select("dormiu, acordou")
        .eq("user_id", user.id)
        .gte("data", inicioAno),
      supabase
        .from("macros_registro")
        .select("kcal, prot")
        .eq("user_id", user.id)
        .gte("data", inicioAno),
    ]);

    const totalTreinos = treinos?.length || 0;
    const totalMinTreino = Math.round(
      (treinos || []).reduce((s, t) => s + (t.tempo_segundos || 0), 0) / 60,
    );
    const totalHorasTreino = Math.round(totalMinTreino / 60);
    const totalKcalTreino = (treinos || []).reduce(
      (s, t) => s + (t.kcal || 0),
      0,
    );
    const totalHabitos = habitos?.length || 0;
    const totalAguaL = Math.round(
      (agua || []).reduce((s, r) => s + r.ml, 0) / 1000,
    );
    const totalPassos = (passos || []).reduce((s, r) => s + r.passos, 0);
    const totalKmPassos = Math.round(totalPassos * 0.0008);

    const pesoInicioVal = pesoInicio?.[0]?.peso
      ? Number(pesoInicio[0].peso)
      : null;
    const pesoFimVal = pesoFim?.[0]?.peso ? Number(pesoFim[0].peso) : null;
    const diffPesoAno =
      pesoInicioVal && pesoFimVal
        ? (pesoFimVal - pesoInicioVal).toFixed(1)
        : null;

    const mediaHorasSono = (() => {
      if (!sono || sono.length === 0) return null;
      const total = sono.reduce((s, r) => {
        if (!r.dormiu || !r.acordou) return s;
        const [hD, mD] = r.dormiu.split(":").map(Number);
        const [hA, mA] = r.acordou.split(":").map(Number);
        let min = hA * 60 + mA - (hD * 60 + mD);
        if (min < 0) min += 24 * 60;
        return s + min / 60;
      }, 0);
      return (total / sono.length).toFixed(1);
    })();

    const totalProtg = Math.round(
      (macros || []).reduce((s, r) => s + (Number(r.prot) || 0), 0),
    );

    setStatsAniversario({
      totalTreinos,
      totalHorasTreino,
      totalKcalTreino,
      totalHabitos,
      totalAguaL,
      totalKmPassos,
      diffPesoAno,
      mediaHorasSono,
      totalProtg,
    });
  };

  const [editandoHome, setEditandoHome] = useState(false);
  const [blocos, setBlocos] = useState(() => {
    const saved = localStorage.getItem("home_blocos");
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migra blocos antigos
      const temPassosSupl = parsed.find((b) => b.id === "passos_supl");
      if (!temPassosSupl) {
        localStorage.removeItem("home_blocos");
        return null;
      }
      const temHumor = parsed.find((b) => b.id === "humor");
      if (!temHumor) {
        const novo = [
          ...parsed,
          { id: "humor", label: "Humor + Energia", visivel: true },
          { id: "sono", label: "Sono", visivel: true },
        ];
        localStorage.setItem("home_blocos", JSON.stringify(novo));
        return novo;
      }
      const temSono = parsed.find((b) => b.id === "sono");
      if (!temSono) {
        const novo = [...parsed, { id: "sono", label: "Sono", visivel: true }];
        localStorage.setItem("home_blocos", JSON.stringify(novo));
        return novo;
      }
      return parsed;
    }
    return [
      { id: "tarefas", label: "Tarefas", visivel: true },
      { id: "cards", label: "Água + Peso", visivel: true },
      { id: "kcal", label: "Kcal + Saldo", visivel: true },
      { id: "refeicao", label: "Refeição", visivel: true },
      { id: "passos_supl", label: "Passos + Suplementos", visivel: true },
      { id: "habitos", label: "Hábitos", visivel: true },
      { id: "humor", label: "Humor + Energia", visivel: true },
      { id: "sono", label: "Sono", visivel: true },
      { id: "treino_semana", label: "Semana de Treino", visivel: true },
    ];
  });

  const hoje = formatarData(new Date());
  const buscarFrase = useCallback(async () => {
    const { data } = await supabase.from("frases").select("texto, autor");
    if (data && data.length > 0) {
      const idx = Math.floor(Math.random() * data.length);
      setFrase(data[idx]);
    }
  }, []);

  useEffect(() => {
    buscarFrase();
  }, [buscarFrase]);

  const carregar = useCallback(async () => {
    const hoje = formatarData(new Date());
    setCarregando(true);
    const [
      { data: p },
      { data: h },
      { data: aguaRegs },
      { data: aguaMeta },
      { data: pesoRegs },
      { data: diasData },
      { data: passosData },
      { data: passosMetaData },
      { data: macrosData },
      { data: macrosMetaData },
      { data: treinoHoje },
      { data: humorHoje },
      { data: sonoHoje },
    ] = await Promise.all([
      supabase.from("perfil").select("*").eq("user_id", user.id).single(),
      supabase
        .from("treinos_finalizados")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("agua_registro")
        .select("ml")
        .eq("user_id", user.id)
        .eq("data", hoje),
      supabase
        .from("agua_meta")
        .select("meta_ml")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("peso_registro")
        .select("*")
        .eq("user_id", user.id)
        .order("data", { ascending: false })
        .limit(2),
      supabase
        .from("rotina_dias")
        .select("id,data")
        .eq("user_id", user.id)
        .eq("data", hoje)
        .single(),
      supabase
        .from("passos_registro")
        .select("passos")
        .eq("user_id", user.id)
        .eq("data", hoje)
        .single(),
      supabase
        .from("passos_meta")
        .select("meta_passos")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("macros_registro")
        .select("kcal")
        .eq("user_id", user.id)
        .eq("data", hoje),
      supabase
        .from("macros_meta")
        .select("meta_kcal")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("treinos_finalizados")
        .select("kcal, created_at")
        .eq("user_id", user.id)
        .gte("created_at", hoje + "T03:00:00Z")
        .lte(
          "created_at",
          new Date(new Date(hoje).getTime() + 86400000)
            .toISOString()
            .split("T")[0] + "T02:59:59Z",
        ),
      supabase
        .from("humor_registro")
        .select("*")
        .eq("user_id", user.id)
        .eq("data", hoje)
        .single(),
      supabase
        .from("sono_registro")
        .select("*")
        .eq("user_id", user.id)
        .eq("data", hoje)
        .single(),
    ]);
    if (p) setPerfil(p);
    if (h) setHistorico(h);
    await registrarStreakHoje(user.id);
    const s = await calcularStreak(user.id);
    setStreak(s);

    const totalAgua = (aguaRegs || []).reduce((s, r) => s + r.ml, 0);
    setAguaHoje({ total: totalAgua, meta: aguaMeta?.meta_ml || 2500 });

    if (passosData) setPassosHoje(passosData.passos);
    if (passosMetaData) setPassosMeta(passosMetaData.meta_passos);
    const totalKcal = (macrosData || []).reduce((s, r) => s + r.kcal, 0);
    setKcalHoje(totalKcal);
    if (macrosMetaData) setKcalMeta(macrosMetaData.meta_kcal);
    const kcalTreino = (treinoHoje || [])
      .filter((r) => {
        const offset = new Date().getTimezoneOffset();
        const dataLocal = new Date(
          new Date(r.created_at).getTime() - offset * 60000,
        )
          .toISOString()
          .split("T")[0];
        return dataLocal === hoje;
      })
      .reduce((s, r) => s + (r.kcal || 0), 0);
    const kcalPassosGasto = Math.round((passosData?.passos || 0) * 0.04);
    setKcalGasto({ treino: kcalTreino, passos: kcalPassosGasto });

    if (pesoRegs && pesoRegs.length > 0) {
      setPesoHoje(pesoRegs[0]);
      setPesoPrev(pesoRegs[1] || null);
    }

    if (diasData) {
      const { data: tarefasData } = await supabase
        .from("rotina_tarefas")
        .select("*")
        .eq("dia_id", diasData.id)
        .order("ordem", { ascending: true });
      setRotina({ dia: diasData, tarefas: tarefasData || [] });
    }

    if (humorHoje) setHumor(humorHoje);
    if (sonoHoje) setSonoHoje(sonoHoje);

    const inicioSemana = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      return formatarData(d);
    })();
    const { data: treinosSemanaDados } = await supabase
      .from("treinos_finalizados")
      .select("treino, created_at")
      .eq("user_id", user.id)
      .gte("created_at", inicioSemana + "T00:00:00");
    setTreinosSemana(treinosSemanaDados || []);
    setCarregando(false);
  }, [user.id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function registrarStreakHoje(userId) {
    const hoje = formatarData(new Date());
    await supabase
      .from("streak_registro")
      .upsert({ user_id: userId, data: hoje }, { onConflict: "user_id,data" });
  }

  async function calcularStreak(userId) {
    const { data } = await supabase
      .from("streak_registro")
      .select("data")
      .eq("user_id", userId)
      .order("data", { ascending: false })
      .limit(60);

    if (!data || data.length === 0) return 1;

    let s = 0;
    for (let i = 0; i < 60; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dataStr = formatarData(d);
      if (data.find((r) => r.data === dataStr)) s++;
      else if (i > 0) break;
    }
    return s;
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocos.findIndex((b) => b.id === active.id);
    const newIndex = blocos.findIndex((b) => b.id === over.id);
    const novosBlocos = arrayMove(blocos, oldIndex, newIndex);
    setBlocos(novosBlocos);
    localStorage.setItem("home_blocos", JSON.stringify(novosBlocos));
  };

  const toggleVisivel = (id) => {
    const novosBlocos = blocos.map((b) =>
      b.id === id ? { ...b, visivel: !b.visivel } : b,
    );
    setBlocos(novosBlocos);
    localStorage.setItem("home_blocos", JSON.stringify(novosBlocos));
  };

  const toggleTarefa = async (tarefa) => {
    const nova = !tarefa.concluida;
    await supabase
      .from("rotina_tarefas")
      .update({ concluida: nova })
      .eq("id", tarefa.id);
    setRotina((prev) => ({
      ...prev,
      tarefas: prev.tarefas.map((t) =>
        t.id === tarefa.id ? { ...t, concluida: nova } : t,
      ),
    }));
  };

  const nome = perfil?.nome
    ? perfil.nome.split(" ")[0]
    : user.email.split("@")[0];
  const { diasRestantes, pct: pctAno } = getDaysLeft();
  const pctAgua = Math.min(
    100,
    Math.round((aguaHoje.total / aguaHoje.meta) * 100),
  );
  const diffPeso =
    pesoHoje && pesoPrev
      ? (Number(pesoHoje.peso) - Number(pesoPrev.peso)).toFixed(1)
      : null;

  const PERIODOS = ["Acordar", "Manhã", "Tarde", "Noite"];
  const tarefasPorPeriodo = rotina
    ? PERIODOS.reduce((acc, p) => {
        const itens = rotina.tarefas.filter((t) => t.periodo === p && t.texto);
        if (itens.length > 0) acc[p] = itens;
        return acc;
      }, {})
    : {};
  const temTarefas = Object.keys(tarefasPorPeriodo).length > 0;

  const salvarHumor = async (campo, val) => {
    setSalvandoHumor(true);
    const atual = humor || {};
    const payload = {
      user_id: user.id,
      data: hoje,
      humor: atual.humor || null,
      energia: atual.energia || null,
      [campo]: val,
    };
    const { data, error } = await supabase
      .from("humor_registro")
      .upsert(payload, { onConflict: "user_id,data" })
      .select()
      .single();
    if (!error && data) setHumor(data);
    setSalvandoHumor(false);
  };
  if (carregando)
    return (
      <div className="home-section">
        <SkeletonStyle />
        <SkeletonCard style={{ height: 70 }}>
          <SkeletonBox width="50%" height={20} />
          <SkeletonBox width="35%" height={13} />
        </SkeletonCard>
        <SkeletonCard>
          <SkeletonBox height={40} radius={99} />
        </SkeletonCard>
        <SkeletonGrid cols={2} gap={10}>
          <SkeletonCard style={{ margin: 0 }}>
            <SkeletonBox width={32} height={32} radius={99} />
            <SkeletonBox width="60%" height={13} />
            <SkeletonBox height={8} radius={99} />
          </SkeletonCard>
          <SkeletonCard style={{ margin: 0 }}>
            <SkeletonBox width={32} height={32} radius={99} />
            <SkeletonBox width="60%" height={13} />
            <SkeletonBox height={8} radius={99} />
          </SkeletonCard>
        </SkeletonGrid>
        <SkeletonCard>
          <SkeletonBox width="45%" height={11} />
          {[1, 2, 3].map((i) => (
            <SkeletonBox key={i} height={36} radius={8} />
          ))}
        </SkeletonCard>
      </div>
    );

  return (
    <div className="home-section">
      {/* Saudação + streak */}
      <div className="home-header">
        <div>
          <h2 className="home-greeting">
            {getGreeting()}, {nome}!
          </h2>
          <p className="home-date">
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        {streak > 0 && (
          <div className="home-streak">
            🔥 {streak} dia{streak > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Confete aniversário */}
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={300}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            zIndex: 9999,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Card aniversário */}
      {isAniversario && (
        <div
          className="birthday-card"
          style={{
            background: "#1a1d21",
            border: "1px solid #f59e0b55",
            borderRadius: 16,
            padding: "20px",
            animation: "fadeInUp 0.4s ease",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>🎂</div>
            <div style={{ fontSize: 18, marginBottom: 4 }}>
              <span className="birthday-star">⭐</span>
              <span className="birthday-star">✨</span>
              <span className="birthday-star">🌟</span>
              <span className="birthday-star">✨</span>
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#f8fafc",
                marginBottom: 4,
              }}
            >
              Feliz aniversário, {nome}!
            </div>
            <div style={{ fontSize: 14, color: "#94a3b8" }}>
              Hoje você completa {idadeAniversario} anos! 🎉
            </div>
          </div>

          {/* Stats do ano */}
          {statsAniversario && (
            <>
              <div
                style={{
                  fontSize: 10,
                  color: "#f59e0b",
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  marginBottom: 12,
                  textAlign: "center",
                }}
              >
                SEU ANO EM NÚMEROS 🏆
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                {[
                  {
                    icon: "🏋️",
                    label: "Treinos",
                    val: statsAniversario.totalTreinos,
                    sub: `${statsAniversario.totalHorasTreino}h de treino`,
                  },
                  {
                    icon: "✅",
                    label: "Hábitos",
                    val: statsAniversario.totalHabitos,
                    sub: "check-ins no ano",
                  },
                  {
                    icon: "💧",
                    label: "Água",
                    val: `${statsAniversario.totalAguaL}L`,
                    sub: "consumidos no ano",
                  },
                  {
                    icon: "👟",
                    label: "Passos",
                    val: `~${statsAniversario.totalKmPassos}km`,
                    sub: "percorridos",
                  },
                  statsAniversario.diffPesoAno !== null && {
                    icon: "⚖️",
                    label: "Peso",
                    val: `${Number(statsAniversario.diffPesoAno) < 0 ? "" : "+"}${statsAniversario.diffPesoAno}kg`,
                    sub:
                      Number(statsAniversario.diffPesoAno) < 0
                        ? "perdidos no ano 🔥"
                        : "ganhos no ano 💪",
                    cor:
                      Number(statsAniversario.diffPesoAno) < 0
                        ? "#10b981"
                        : "#6366f1",
                  },
                  statsAniversario.mediaHorasSono && {
                    icon: "😴",
                    label: "Sono",
                    val: `${statsAniversario.mediaHorasSono}h`,
                    sub: "média por noite",
                  },
                ]
                  .filter(Boolean)
                  .map((s, i) => (
                    <div
                      key={i}
                      style={{
                        background: "#24282d",
                        borderRadius: 12,
                        padding: "12px 14px",
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <div style={{ fontSize: 22, flexShrink: 0 }}>
                        {s.icon}
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 9,
                            color: "#64748b",
                            fontWeight: 800,
                            letterSpacing: "0.06em",
                          }}
                        >
                          {s.label.toUpperCase()}
                        </div>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: s.cor || "#f8fafc",
                          }}
                        >
                          {s.val}
                        </div>
                        <div style={{ fontSize: 10, color: "#475569" }}>
                          {s.sub}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}

          {/* Mensagem */}
          <div
            style={{
              background: "#f59e0b15",
              border: "1px solid #f59e0b33",
              borderRadius: 10,
              padding: "12px 14px",
              fontSize: 13,
              color: "#f59e0b",
              fontStyle: "italic",
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            "Que cada treino, cada hábito e cada conquista deste novo ano seja
            mais forte que o anterior. Bora forjar mais um ano incrível!"
          </div>
        </div>
      )}

      {/* Card Natal */}
      {isNatal && (
        <div
          style={{
            background: "#1a1d21",
            border: "1px solid #10b98155",
            borderRadius: 16,
            padding: "20px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 44, marginBottom: 8 }}>🎄</div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#f8fafc",
              marginBottom: 6,
            }}
          >
            Feliz Natal, {nome}!
          </div>
          <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 14 }}>
            Que esse dia seja de descanso, família e muita energia pra continuar
            forjando! 🎁
          </div>
          <div
            style={{
              background: "#10b98115",
              border: "1px solid #10b98133",
              borderRadius: 10,
              padding: "12px 14px",
              fontSize: 13,
              color: "#10b981",
              fontStyle: "italic",
              lineHeight: 1.6,
            }}
          >
            "O descanso faz parte do processo. Aproveita o Natal — amanhã a
            bigorna te espera."
          </div>
        </div>
      )}

      {/* Card Ano Novo */}
      {isAnoNovo && (
        <div
          style={{
            background: "#1a1d21",
            border: "1px solid #6366f155",
            borderRadius: 16,
            padding: "20px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 44, marginBottom: 8 }}>🎆</div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#f8fafc",
              marginBottom: 6,
            }}
          >
            Feliz {new Date().getFullYear()}, {nome}!
          </div>
          <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 14 }}>
            Novo ano, nova rotina, novos recordes. Bora forjar mais um ano
            incrível! 🔥
          </div>
          <div
            style={{
              background: "#6366f115",
              border: "1px solid #6366f133",
              borderRadius: 10,
              padding: "12px 14px",
              fontSize: 13,
              color: "#6366f1",
              fontStyle: "italic",
              lineHeight: 1.6,
            }}
          >
            "Cada dia 1 de janeiro é uma bigorna nova. O que você vai forjar
            nesse ano?"
          </div>
        </div>
      )}

      {/* Banner stats fim de semana */}
      {(() => {
        const dow = new Date().getDay();
        if (dow !== 0 && dow !== 6) return null;
        return (
          <div className="home-stats-banner" onClick={() => onNavegar("stats")}>
            <span>📊</span>
            <div>
              <div className="home-stats-banner-title">
                Resumo da semana disponível!
              </div>
              <div className="home-stats-banner-sub">
                Veja onde acertou e onde pode melhorar →
              </div>
            </div>
          </div>
        );
      })()}

      {/* Frase motivacional */}
      {frase && (
        <div className="home-frase">
          <span>"{frase.texto}"</span>
          {frase.autor && (
            <span className="home-frase-autor">— {frase.autor}</span>
          )}
        </div>
      )}

      {/* Contador fim do ano */}
      <div className="home-countdown">
        <span className="home-countdown-icon">⏳</span>
        <div className="home-countdown-body">
          <div className="home-countdown-dias">{diasRestantes} dias</div>
          <div className="home-countdown-label">
            restam até o fim de {new Date().getFullYear()} · {pctAno}% do ano
            passou
          </div>
          <div className="home-countdown-bar-bg">
            <div
              className="home-countdown-bar-fill"
              style={{ width: `${pctAno}%` }}
            />
          </div>
        </div>
      </div>

      {/* Botão personalizar */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => setEditandoHome(!editandoHome)}
          style={{
            background: editandoHome ? "#6366f1" : "none",
            border: "1px solid #ffffff0d",
            borderRadius: 8,
            color: editandoHome ? "#fff" : "#64748b",
            fontSize: 11,
            padding: "5px 12px",
            cursor: "pointer",
          }}
        >
          {editandoHome ? "✓ Concluir" : "✏️ Personalizar"}
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={blocos.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          {blocos.map((bloco) => (
            <BlocoArrastavel
              key={bloco.id}
              bloco={bloco}
              editando={editandoHome}
              onToggleVisivel={toggleVisivel}
            >
              {bloco.id === "tarefas" && (
                <div className="home-card">
                  <div className="home-section-title">TAREFAS DE HOJE</div>
                  {!temTarefas ? (
                    <p
                      style={{
                        fontSize: 13,
                        color: "#475569",
                        textAlign: "center",
                        padding: "8px 0",
                      }}
                    >
                      Nenhuma tarefa para hoje. Gere sua rotina! 📋
                    </p>
                  ) : (
                    Object.entries(tarefasPorPeriodo).map(
                      ([periodo, itens]) => (
                        <div key={periodo} style={{ marginBottom: 12 }}>
                          <div className="home-periodo-title">{periodo}</div>
                          {itens.map((t) => (
                            <label
                              key={t.id}
                              className={`home-tarefa ${t.concluida ? "done" : ""}`}
                            >
                              <input
                                type="checkbox"
                                checked={!!t.concluida}
                                onChange={() => toggleTarefa(t)}
                                style={{
                                  accentColor: "#6366f1",
                                  width: 16,
                                  height: 16,
                                  flexShrink: 0,
                                }}
                              />
                              <span
                                style={{
                                  textDecoration: t.concluida
                                    ? "line-through"
                                    : "none",
                                  color: t.concluida ? "#475569" : "#f8fafc",
                                }}
                              >
                                {t.texto}
                              </span>
                            </label>
                          ))}
                        </div>
                      ),
                    )
                  )}
                </div>
              )}

              {bloco.id === "cards" && (
                <div className="home-cards-row">
                  <div
                    className="home-mini-card"
                    onClick={() => !editandoHome && onNavegar("agua")}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="home-mini-icon">💧</div>
                    <div className="home-mini-info">
                      <div className="home-mini-label">ÁGUA HOJE</div>
                      <div className="home-mini-val">
                        {aguaHoje.total.toLocaleString("pt-BR")} ml
                      </div>
                      <div className="home-mini-bar-bg">
                        <div
                          className="home-mini-bar-fill"
                          style={{
                            width: `${pctAgua}%`,
                            background: pctAgua >= 100 ? "#10b981" : "#3b82f6",
                          }}
                        />
                      </div>
                      <div className="home-mini-sub">{pctAgua}% da meta</div>
                    </div>
                  </div>
                  <div
                    className="home-mini-card"
                    onClick={() => !editandoHome && onNavegar("peso")}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="home-mini-icon">⚖️</div>
                    <div className="home-mini-info">
                      <div className="home-mini-label">PESO HOJE</div>
                      <div className="home-mini-val">
                        {pesoHoje
                          ? `${Number(pesoHoje.peso).toFixed(1)} kg`
                          : "—"}
                      </div>
                      {diffPeso !== null && (
                        <div
                          className="home-mini-sub"
                          style={{
                            color:
                              Number(diffPeso) < 0
                                ? "#10b981"
                                : Number(diffPeso) > 0
                                  ? "#ef4444"
                                  : "#64748b",
                          }}
                        >
                          {Number(diffPeso) > 0
                            ? "▲"
                            : Number(diffPeso) < 0
                              ? "▼"
                              : "="}{" "}
                          {Math.abs(diffPeso)} kg
                        </div>
                      )}
                      {!pesoHoje && (
                        <div className="home-mini-sub">Registre seu peso</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {bloco.id === "kcal" && (
                <div className="home-cards-row">
                  <div
                    className="home-mini-card"
                    onClick={() => !editandoHome && onNavegar("macros")}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="home-mini-icon">🔥</div>
                    <div className="home-mini-info">
                      <div className="home-mini-label">KCAL HOJE</div>
                      <div className="home-mini-val">
                        {kcalHoje > 0 ? kcalHoje.toLocaleString("pt-BR") : "—"}
                      </div>
                      <div className="home-mini-bar-bg">
                        <div
                          className="home-mini-bar-fill"
                          style={{
                            width: `${Math.min(100, Math.round((kcalHoje / kcalMeta) * 100))}%`,
                            background:
                              kcalHoje > kcalMeta
                                ? "#ef4444"
                                : kcalHoje >= kcalMeta * 0.9
                                  ? "#10b981"
                                  : "#f59e0b",
                          }}
                        />
                      </div>
                      <div
                        className="home-mini-sub"
                        style={{
                          color: kcalHoje > kcalMeta ? "#ef4444" : "#64748b",
                        }}
                      >
                        {Math.round((kcalHoje / kcalMeta) * 100)}% da meta{" "}
                        {kcalHoje > kcalMeta ? "⚠️" : ""}
                      </div>
                    </div>
                  </div>
                  <div
                    className="home-mini-card"
                    onClick={() => !editandoHome && onNavegar("macros")}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="home-mini-icon">⚡</div>
                    <div className="home-mini-info">
                      <div className="home-mini-label">SALDO</div>
                      {(() => {
                        const gastoTotal =
                          kcalMeta +
                          kcalGasto.treino +
                          kcalGasto.passos +
                          (kcalGasto.cardio || 0);
                        const saldo = kcalHoje - gastoTotal;
                        return (
                          <>
                            <div
                              className="home-mini-val"
                              style={{
                                color: saldo < 0 ? "#10b981" : "#ef4444",
                                fontSize: "1.2rem",
                              }}
                            >
                              {saldo < 0 ? "-" : "+"}
                              {Math.abs(saldo).toLocaleString("pt-BR")}
                            </div>
                            <div
                              className="home-mini-sub"
                              style={{
                                color: saldo < 0 ? "#10b981" : "#ef4444",
                              }}
                            >
                              {saldo < 0 ? "deficit" : "superavit"}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
              {bloco.id === "refeicao" && (
                <div className="home-card">
                  <div className="home-section-title">🥗 REFEIÇÃO ATUAL</div>
                  <Dieta user={user} compact={true} />
                </div>
              )}

              {bloco.id === "passos_supl" && (
                <div className="home-cards-row">
                  <div
                    className="home-mini-card"
                    onClick={() => !editandoHome && onNavegar("passos")}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="home-mini-icon">👟</div>
                    <div className="home-mini-info">
                      <div className="home-mini-label">PASSOS HOJE</div>
                      <div className="home-mini-val">
                        {passosHoje ? passosHoje.toLocaleString("pt-BR") : "—"}
                      </div>
                      <div className="home-mini-bar-bg">
                        <div
                          className="home-mini-bar-fill"
                          style={{
                            width: `${Math.min(100, Math.round(((passosHoje || 0) / passosMeta) * 100))}%`,
                            background:
                              (passosHoje || 0) >= passosMeta
                                ? "#10b981"
                                : "#6366f1",
                          }}
                        />
                      </div>
                      <div className="home-mini-sub">
                        {Math.min(
                          100,
                          Math.round(((passosHoje || 0) / passosMeta) * 100),
                        )}
                        % da meta
                      </div>
                    </div>
                  </div>
                  <div
                    className="home-mini-card"
                    onClick={() => !editandoHome && onNavegar("suplementos")}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="home-mini-icon">💊</div>
                    <div className="home-mini-info">
                      <div className="home-mini-label">SUPLEMENTOS</div>
                      <Suplementos user={user} compact={true} minimode={true} />
                    </div>
                  </div>
                </div>
              )}

              {bloco.id === "humor" && (
                <div className="home-card">
                  <div className="home-section-title">
                    🧠 COMO VOCÊ TÁ HOJE?
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                      marginTop: 8,
                    }}
                  >
                    {[
                      {
                        campo: "humor",
                        label: "😄 Humor",
                        emojis: ["😞", "😟", "😐", "😊", "🤩"],
                      },
                      {
                        campo: "energia",
                        label: "⚡ Energia",
                        emojis: ["😴", "🥱", "😐", "💪", "🚀"],
                      },
                    ].map(({ campo, label, emojis }) => (
                      <div key={campo}>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#64748b",
                            fontWeight: 700,
                            marginBottom: 8,
                          }}
                        >
                          {label}
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          {emojis.map((emoji, i) => {
                            const val = i + 1;
                            const sel = humor?.[campo] === val;
                            return (
                              <button
                                key={val}
                                onClick={() =>
                                  !editandoHome && salvarHumor(campo, val)
                                }
                                style={{
                                  flex: 1,
                                  background: sel ? "#6366f122" : "#24282d",
                                  border: `1px solid ${sel ? "#6366f1" : "#ffffff0d"}`,
                                  borderRadius: 10,
                                  fontSize: 20,
                                  padding: "8px 4px",
                                  cursor: editandoHome ? "default" : "pointer",
                                  transform: sel ? "scale(1.1)" : "scale(1)",
                                  transition: "all 0.15s",
                                }}
                              >
                                {emoji}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {humor?.humor && humor?.energia && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#475569",
                          textAlign: "center",
                        }}
                      >
                        registrado hoje ✓
                      </div>
                    )}
                  </div>
                </div>
              )}

              {bloco.id === "sono" && (
                <div
                  className="home-mini-card"
                  onClick={() => !editandoHome && onNavegar("sono")}
                  style={{ cursor: "pointer" }}
                >
                  <div className="home-mini-icon">😴</div>
                  <div className="home-mini-info">
                    <div className="home-mini-label">SONO HOJE</div>
                    {sonoHoje ? (
                      (() => {
                        const [hD, mD] = sonoHoje.dormiu.split(":").map(Number);
                        const [hA, mA] = sonoHoje.acordou
                          .split(":")
                          .map(Number);
                        let min = hA * 60 + mA - (hD * 60 + mD);
                        if (min < 0) min += 24 * 60;
                        const horas = (min / 60).toFixed(1);
                        const qualLabels = [
                          "",
                          "Péssimo",
                          "Ruim",
                          "Regular",
                          "Bom",
                          "Ótimo",
                        ];
                        return (
                          <>
                            <div className="home-mini-val">{horas}h</div>
                            <div
                              className="home-mini-sub"
                              style={{
                                color:
                                  parseFloat(horas) >= 7
                                    ? "#10b981"
                                    : "#f97316",
                              }}
                            >
                              {qualLabels[sonoHoje.qualidade] || ""}{" "}
                              {parseFloat(horas) >= 7 ? "✓" : "⚠️"}
                            </div>
                          </>
                        );
                      })()
                    ) : (
                      <div className="home-mini-sub">Registre seu sono</div>
                    )}
                  </div>
                </div>
              )}

              {bloco.id === "treino_semana" && divisao && (
                <div
                  className="home-card"
                  onClick={() => !editandoHome && onNavegar("treino")}
                  style={{ cursor: "pointer" }}
                >
                  <div className="home-section-title">🏋️ SEMANA DE TREINO</div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {divisao.split("").map((letra) => {
                      const feito = treinosSemana.some(
                        (t) => t.treino === letra,
                      );
                      return (
                        <div
                          key={letra}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 4,
                            background: feito ? "#10b98115" : "#24282d",
                            border: `1px solid ${feito ? "#10b98144" : "#ffffff0d"}`,
                            borderRadius: 12,
                            padding: "10px 14px",
                            minWidth: 52,
                          }}
                        >
                          <span style={{ fontSize: 18 }}>
                            {feito ? "✅" : "⬜"}
                          </span>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 800,
                              color: feito ? "#10b981" : "#64748b",
                            }}
                          >
                            {letra}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 8 }}>
                    {treinosSemana.length} treino
                    {treinosSemana.length !== 1 ? "s" : ""} nos últimos 7 dias
                  </div>
                </div>
              )}

              {bloco.id === "habitos" && (
                <div className="home-card">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: mostrarHabitos ? 8 : 0,
                    }}
                  >
                    <div className="home-section-title" style={{ margin: 0 }}>
                      HÁBITOS DO DIA
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => onNavegar("habitos")}
                        style={{
                          background: "none",
                          border: "1px solid #ffffff0d",
                          borderRadius: 8,
                          color: "#6366f1",
                          fontSize: 11,
                          padding: "4px 10px",
                          cursor: "pointer",
                        }}
                      >
                        + Personalizar
                      </button>
                      <button
                        onClick={() => {
                          const novo = !mostrarHabitos;
                          setMostrarHabitos(novo);
                          localStorage.setItem(
                            "home_mostrar_habitos",
                            String(novo),
                          );
                        }}
                        style={{
                          background: "none",
                          border: "1px solid #ffffff0d",
                          borderRadius: 8,
                          color: "#64748b",
                          fontSize: 11,
                          padding: "4px 10px",
                          cursor: "pointer",
                        }}
                      >
                        {mostrarHabitos ? "Ocultar" : "Mostrar"}
                      </button>
                    </div>
                  </div>
                  {mostrarHabitos && <Habitos user={user} compact={true} />}
                </div>
              )}
            </BlocoArrastavel>
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}

function BlocoArrastavel({ bloco, editando, onToggleVisivel, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: bloco.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : bloco.visivel ? 1 : 0.3,
  };

  if (!bloco.visivel && !editando) return null;

  return (
    <div ref={setNodeRef} style={style}>
      {editando && (
        <div className="home-bloco-edit-bar">
          <span className="home-bloco-drag" {...attributes} {...listeners}>
            ☰
          </span>
          <span className="home-bloco-label">{bloco.label}</span>
          <button
            className="home-bloco-toggle"
            onClick={() => onToggleVisivel(bloco.id)}
          >
            {bloco.visivel ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      )}
      {children}
    </div>
  );
}
