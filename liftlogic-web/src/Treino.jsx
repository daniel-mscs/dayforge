import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";
import ModalDescanso from "./ModalDescanso";
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
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { CSS } from "@dnd-kit/utilities";
import "./App.css";
import Home from "./Home";
import Rotina from "./Rotina";
import Habitos from "./Habitos";
import Agua from "./Agua";
import Peso from "./Peso";
import Suplementos from "./Suplementos";
import Dieta from "./Dieta";
import Macros from "./Macros";
import Passos from "./Passos";
import Stats from "./Stats";
import HomeWP from "./HomeWP";
import SmartPocket from "./SmartPocket";
import RPG from "./RPG";
import Sono from "./Sono";
import Cardio from "./Cardio";
import RoundTimer from "./RoundTimer";
import Coach from "./Coach";
import BottomNav from "./BottomNav";
import ModalResumo from "./ModalResumo";
import TreinoStats from "./TreinoStats";
import PerfilTab from "./PerfilTab";
import { ganharXP } from "./lib/rpg";
import { toast } from "./lib/toast";
import Tour from "./lib/tour";
import { useTour } from "./lib/useTour";
import { NOTIFICACOES } from "./lib/notifications";

function ExercicioCard({
  ex,
  concluidos,
  seriesFeitas,
  treinando,
  toggleConcluido,
  atualizarExercicio,
  deletarExercicio,
  onEditar,
  onVincular,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ex.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card ${concluidos[ex.id] ? "concluido" : ""}`}
    >
      <div className="card-header">
        <span className="tag">{ex.grupo_muscular}</span>
        <div className="card-header-actions">
          <span className="drag-handle" {...attributes} {...listeners}>
            ☰
          </span>
          {!treinando && (
            <>
              <button
                className="btn-delete-mini"
                onClick={() => onEditar(ex)}
                style={{ color: "#818cf8", marginRight: 2 }}
              >
                ✏️
              </button>
              <button
                className="btn-delete-mini"
                onClick={() => onVincular(ex)}
                style={{
                  color: ex.superset_id ? "#f97316" : "#64748b",
                  marginRight: 2,
                }}
                title="Superset"
              >
                🔗
              </button>
            </>
          )}
          <button
            className="btn-delete-mini"
            onClick={() => deletarExercicio(ex.id)}
          >
            ×
          </button>
        </div>
      </div>
      <div className="card-main-row">
        {treinando && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            {concluidos[ex.id] ? (
              <span style={{ fontSize: 22 }}>✅</span>
            ) : (
              <button
                className="btn-check"
                onClick={() => toggleConcluido(ex.id)}
                style={{
                  fontSize: 13,
                  padding: "6px 10px",
                  whiteSpace: "nowrap",
                }}
              >
                ▶ Iniciar
              </button>
            )}
            <span
              style={{
                fontSize: 11,
                color: concluidos[ex.id] ? "#10b981" : "#94a3b8",
                fontWeight: 700,
              }}
            >
              {seriesFeitas[ex.id] || 0}/{ex.series}
            </span>
          </div>
        )}
        <div className="exercise-details">
          <h3>{ex.nome}</h3>
          {ex.superset_id && (
            <div
              style={{
                fontSize: 11,
                color: "#f97316",
                fontWeight: 600,
                marginBottom: 4,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              🔗 Superset
            </div>
          )}
          <div className="edit-stats-row">
            <input
              type="number"
              className="inline-edit"
              defaultValue={ex.series}
              onBlur={(e) =>
                atualizarExercicio(ex.id, "series", e.target.value)
              }
            />
            <span>séries x</span>
            <input
              type="number"
              className="inline-edit"
              defaultValue={ex.repeticoes}
              onBlur={(e) =>
                atualizarExercicio(ex.id, "repeticoes", e.target.value)
              }
            />
            <span>reps</span>
          </div>
        </div>
      </div>
      <div className="info">
        <div className="carga-edit">
          <span>
            {ex.equipamento === "halter"
              ? "🏋️"
              : ex.equipamento === "barra"
                ? "🔩"
                : "⚙️"}{" "}
            Carga:
          </span>
          <input
            type="number"
            className="inline-edit carga-input"
            defaultValue={ex.carga}
            onBlur={(e) => atualizarExercicio(ex.id, "carga", e.target.value)}
          />
          <strong>kg</strong>
        </div>
      </div>
    </div>
  );
}

function Treino({ logout, user, abrirPerfil, onAbrirPerfilConcluido }) {
  const TREINO_START_KEY = "liftlogic_treino_inicio";
  const TREINO_ATIVO_KEY = "liftlogic_treino_ativo";
  const MAX_TREINO_SEG = 5 * 60 * 60;
  const [exercicios, setExercicios] = useState([]);
  const [divisao, setDivisao] = useState(
    localStorage.getItem("divisao") || null,
  );
  const [treinoAtivo, setTreinoAtivo] = useState(
    () => localStorage.getItem(TREINO_ATIVO_KEY) || "A",
  );
  const [concluidos, setConcluidos] = useState({});
  const [seriesFeitas, setSeriesFeitas] = useState({});
  const [modalDescanso, setModalDescanso] = useState(null);
  const [modalEditEx, setModalEditEx] = useState(null);
  const [salvandoTreino, setSalvandoTreino] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [abaPrincipal, setAbaPrincipal] = useState("home");
  const [perfilCompleto, setPerfilCompleto] = useState(true);
  const [historico, setHistorico] = useState([]);
  const [modalResumo, setModalResumo] = useState(null);
  const [showMore, setShowMore] = useState(false);
  const [subAbaTreino, setSubAbaTreino] = useState("exercicios");
  const [subAbaPerfil, setSubAbaPerfil] = useState("perfil");
  const [ajudaAncora, setAjudaAncora] = useState(null);
  const { ativo: tourAtivo, fechar: fecharTour } = useTour();
  const [celebrando, setCelebrando] = useState(false);
  const [xpGanho, setXpGanho] = useState(0);
  const [mensagemCelebracao, setMensagemCelebracao] = useState("");
  const [notifAtivas, setNotifAtivas] = useState(() => {
    const salvo = localStorage.getItem("df_notif_ativas");
    return salvo ? JSON.parse(salvo) : NOTIFICACOES.map((n) => n.id);
  });
  const [notifPermissao, setNotifPermissao] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );
  const [treinando, setTreinando] = useState(() => {
    const salvo = localStorage.getItem(TREINO_START_KEY);
    if (!salvo) return false;
    const elapsed = Math.floor((Date.now() - Number(salvo)) / 1000);
    return elapsed < MAX_TREINO_SEG;
  });
  const [tempoTotal, setTempoTotal] = useState(() => {
    const salvo = localStorage.getItem(TREINO_START_KEY);
    if (!salvo) return 0;
    const elapsed = Math.floor((Date.now() - Number(salvo)) / 1000);
    return elapsed < MAX_TREINO_SEG ? elapsed : 0;
  });
  const [descanso, setDescanso] = useState(0);
  const [inputDescanso, setInputDescanso] = useState("");
  const [perfil, setPerfil] = useState({
    nome: "",
    peso: "",
    altura: "",
    idade: "",
    sexo: "M",
    data_nascimento: "",
    sobre_mim: "",
  });
  const [perfilEditado, setPerfilEditado] = useState(false);
  const [perfilOriginal, setPerfilOriginal] = useState(null);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [perfilMsg, setPerfilMsg] = useState("");
  const [dashData, setDashData] = useState({
    historico: [],
    exercicioSelecionado: null,
    evolucao: [],
  });
  const [prs, setPrs] = useState({});
  const [modalSuperset, setModalSuperset] = useState(null);

  const timerRef = useRef(null);
  const descansoRef = useRef(null);
  const alertaAtivoRef = useRef(false);
  const alerta10sDisparadoRef = useRef(false);
  const inicioTreinoRef = useRef(
    localStorage.getItem(TREINO_START_KEY)
      ? Number(localStorage.getItem(TREINO_START_KEY))
      : null,
  );
  const inicioDescansoRef = useRef(null);
  const duracaoDescansoRef = useRef(0);
  const audioRef = useRef(
    new Audio(
      "https://codeskulptor-demos.commondatastorage.googleapis.com/GalaxyInvaders/pause.wav",
    ),
  );
  const nomeExercicioRef = useRef(null);

  const [novoExercicio, setNovoExercicio] = useState({
    nome: "",
    series: "",
    repeticoes: "",
    carga: "",
    grupo_muscular: "",
    treino: "A",
    equipamento: "maquina",
    descanso_segundos: "90",
  });
  const [sugestoesExercicio, setSugestoesExercicio] = useState([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [exerciciosPreset, setExerciciosPreset] = useState([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  );

  const tocarAlertaLongo = () => {
    if (alertaAtivoRef.current) return;
    alertaAtivoRef.current = true;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    let repeticoes = 0;
    const intervaloSom = setInterval(() => {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      repeticoes++;
      if (repeticoes >= 3) {
        clearInterval(intervaloSom);
        setTimeout(() => {
          alertaAtivoRef.current = false;
        }, 1000);
      }
    }, 600);
  };

  const buscarExercicios = async () => {
    setCarregando(true);
    const { data, error } = await supabase
      .from("exercicio")
      .select("*")
      .eq("user_id", user.id)
      .order("ordem", { ascending: true });
    if (error) console.error("Erro:", error.message);
    else setExercicios(data || []);
    setCarregando(false);
  };

  const buscarHistorico = async () => {
    const { data, error } = await supabase
      .from("treinos_finalizados")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) console.error("Erro:", error.message);
    else setHistorico(data || []);
  };

  const buscarPerfil = async () => {
    const { data, error } = await supabase
      .from("perfil")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (error && error.code !== "PGRST116")
      console.error("Erro perfil:", error.message);
    if (data) {
      const p = {
        nome: data.nome || "",
        peso: data.peso || "",
        altura: data.altura || "",
        idade: data.idade || "",
        sexo: data.sexo || "M",
        data_nascimento: data.data_nascimento || "",
        sobre_mim: data.sobre_mim || "",
      };
      setPerfil(p);
      setPerfilOriginal(p);
      setPerfilEditado(false);
      const completo = !!(
        data.nome &&
        data.peso &&
        data.altura &&
        data.idade &&
        data.sexo
      );
      setPerfilCompleto(completo);
      if (!completo) {
        setAbaPrincipal("perfil");
        setPerfilEditado(true);
      }
    } else {
      setPerfilCompleto(false);
      setAbaPrincipal("perfil");
      setPerfilEditado(true);
    }
  };

  const salvarPerfil = async (e) => {
    e.preventDefault();
    setSalvandoPerfil(true);
    setPerfilMsg("");
    const payload = {
      user_id: user.id,
      nome: perfil.nome,
      peso: Number(perfil.peso),
      altura: Number(perfil.altura),
      idade: perfil.data_nascimento
        ? (() => {
            const nasc = new Date(perfil.data_nascimento + "T00:00:00");
            const hoje = new Date();
            let idade = hoje.getFullYear() - nasc.getFullYear();
            if (
              hoje.getMonth() < nasc.getMonth() ||
              (hoje.getMonth() === nasc.getMonth() &&
                hoje.getDate() < nasc.getDate())
            )
              idade--;
            return idade;
          })()
        : Number(perfil.idade),
      sexo: perfil.sexo,
      objetivo: perfil.objetivo || "manter",
      data_nascimento: perfil.data_nascimento || null,
      sobre_mim: perfil.sobre_mim || "",
    };
    const { error } = await supabase
      .from("perfil")
      .upsert(payload, { onConflict: "user_id" });
    if (error) setPerfilMsg("Erro ao salvar: " + error.message);
    else {
      setPerfilMsg("Perfil salvo com sucesso! ✅");
      setPerfilCompleto(true);
      setPerfilOriginal(perfil);
      setPerfilEditado(false);
    }
    setSalvandoPerfil(false);
    setTimeout(() => setPerfilMsg(""), 3000);
  };

  const buscarDashboard = async () => {
    const { data } = await supabase
      .from("treinos_finalizados")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    const filtrado = (data || []).filter((t) => t.created_at !== null);
    setDashData((prev) => ({ ...prev, historico: filtrado }));
  };

  const buscarEvolucao = async (nomeExercicio) => {
    const { data } = await supabase
      .from("historico_carga")
      .select("carga, created_at")
      .eq("user_id", user.id)
      .eq("exercicio_nome", nomeExercicio)
      .order("created_at", { ascending: true });
    setDashData((prev) => ({
      ...prev,
      evolucao: data || [],
      exercicioSelecionado: nomeExercicio,
    }));
  };

  const calcularIMC = () => {
    if (!perfil.peso || !perfil.altura) return null;
    const alturaM = Number(perfil.altura) / 100;
    return (Number(perfil.peso) / (alturaM * alturaM)).toFixed(1);
  };

  const classificarIMC = (imc) => {
    if (imc < 18.5) return { label: "Abaixo do peso", color: "#fbbf24" };
    if (imc < 25) return { label: "Peso normal", color: "#10b981" };
    if (imc < 30) return { label: "Sobrepeso", color: "#f97316" };
    return { label: "Obesidade", color: "#ef4444" };
  };

  const calcularTMB = () => {
    if (!perfil.peso || !perfil.altura || !perfil.idade || !perfil.sexo)
      return null;
    if (perfil.sexo === "M")
      return Math.round(
        88.36 +
          13.4 * Number(perfil.peso) +
          4.8 * Number(perfil.altura) -
          5.7 * Number(perfil.idade),
      );
    return Math.round(
      447.6 +
        9.2 * Number(perfil.peso) +
        3.1 * Number(perfil.altura) -
        4.3 * Number(perfil.idade),
    );
  };

  useEffect(() => {
    buscarExercicios();
    buscarPerfil();
    supabase
      .from("exercicios_preset")
      .select("nome, grupo_muscular")
      .then(({ data, error }) => {
        if (error) console.error("Erro ao buscar presets:", error.message);
        else setExerciciosPreset(data || []);
      });
  }, []);

  useEffect(() => {
    if (abrirPerfil) {
      setAbaPrincipal("perfil");
      setPerfilEditado(true);
      onAbrirPerfilConcluido?.();
    }
  }, [abrirPerfil]);
  useEffect(() => {
    if (divisao) localStorage.setItem("divisao", divisao);
  }, [divisao]);
  useEffect(() => {
    buscarHistorico();
  }, []);
  useEffect(() => {
    if (abaPrincipal === "perfil") buscarPerfil();
  }, [abaPrincipal]);
  useEffect(() => {
    if (abaPrincipal === "dashboard") buscarDashboard();
  }, [abaPrincipal]);

  useEffect(() => {
    if (subAbaTreino !== "stats" || exercicios.length === 0) return;
    Promise.all(
      [...new Set(exercicios.map((ex) => ex.nome))].map(async (nome) => {
        const { data } = await supabase
          .from("historico_carga")
          .select("carga, created_at")
          .eq("user_id", user.id)
          .eq("exercicio_nome", nome)
          .order("carga", { ascending: false })
          .limit(1);
        return {
          nome,
          pr: data?.[0]?.carga || null,
          data: data?.[0]?.created_at || null,
        };
      }),
    ).then((results) => {
      const map = {};
      results.forEach((r) => {
        map[r.nome] = { pr: r.pr, data: r.data };
      });
      setPrs(map);
    });
  }, [subAbaTreino, exercicios.length]);

  useEffect(() => {
    if (treinando) {
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor(
          (Date.now() - inicioTreinoRef.current) / 1000,
        );
        if (elapsed >= MAX_TREINO_SEG) {
          clearInterval(timerRef.current);
          localStorage.removeItem(TREINO_START_KEY);
          localStorage.removeItem(TREINO_ATIVO_KEY);
          setTreinando(false);
          setTempoTotal(MAX_TREINO_SEG);
          return;
        }
        setTempoTotal(elapsed);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [treinando]);

  const iniciarTimerDescanso = (segundos) => {
    clearInterval(descansoRef.current);
    descansoRef.current = null;
    inicioDescansoRef.current = Date.now();
    duracaoDescansoRef.current = segundos;
    setDescanso(segundos);
    alerta10sDisparadoRef.current = false;
    descansoRef.current = setInterval(() => {
      const restante =
        duracaoDescansoRef.current -
        Math.floor((Date.now() - inicioDescansoRef.current) / 1000);
      if (restante <= 0) {
        clearInterval(descansoRef.current);
        descansoRef.current = null;
        inicioDescansoRef.current = null;
        duracaoDescansoRef.current = 0;
        setDescanso(0);
        alerta10sDisparadoRef.current = false;
        tocarAlertaLongo();
      } else {
        if (restante === 10 && !alerta10sDisparadoRef.current) {
          alerta10sDisparadoRef.current = true;
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
        setDescanso(restante);
      }
    }, 1000);
  };

  const adicionarDescanso = (segundos) => {
    const atual =
      duracaoDescansoRef.current > 0
        ? duracaoDescansoRef.current -
          Math.floor((Date.now() - inicioDescansoRef.current) / 1000)
        : 0;
    iniciarTimerDescanso(Math.max(0, atual) + segundos);
  };

  const iniciarDescansoManual = () => {
    const segundos = parseInt(inputDescanso, 10);
    if (!Number.isFinite(segundos) || segundos <= 0) return;
    iniciarTimerDescanso(segundos);
    setInputDescanso("");
  };

  const cancelarDescanso = () => {
    clearInterval(descansoRef.current);
    descansoRef.current = null;
    inicioDescansoRef.current = null;
    duracaoDescansoRef.current = 0;
    setDescanso(0);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const exerciciosFiltrados = exercicios.filter(
      (ex) => ex.treino === treinoAtivo,
    );
    const outrosExercicios = exercicios.filter(
      (ex) => ex.treino !== treinoAtivo,
    );
    const oldIndex = exerciciosFiltrados.findIndex((ex) => ex.id === active.id);
    const newIndex = exerciciosFiltrados.findIndex((ex) => ex.id === over.id);
    const novaOrdem = arrayMove(exerciciosFiltrados, oldIndex, newIndex);
    setExercicios([...outrosExercicios, ...novaOrdem]);
    const updates = novaOrdem.map((ex, index) =>
      supabase
        .from("exercicio")
        .update({ ordem: index })
        .eq("id", ex.id)
        .eq("user_id", user.id),
    );
    await Promise.all(updates);
  };

  const finalizarTreino = () => {
    clearInterval(timerRef.current);
    const treinoIniciado =
      localStorage.getItem(TREINO_ATIVO_KEY) || treinoAtivo;
    const filtrados = exercicios.filter((ex) => ex.treino === treinoIniciado);
    const volumeTotal = filtrados.reduce(
      (acc, ex) =>
        acc +
        Number(ex.series || 0) *
          Number(ex.repeticoes || 0) *
          Number(ex.carga || 0),
      0,
    );
    const concluídosCount = Object.values(concluidos).filter(Boolean).length;
    const kcal = perfil.peso
      ? Math.round(5.0 * Number(perfil.peso) * (tempoTotal / 3600))
      : null;
    const maisHeavy = filtrados.reduce(
      (max, ex) => (Number(ex.carga) > Number(max?.carga || 0) ? ex : max),
      null,
    );
    setModalResumo({
      volumeTotal,
      concluídosCount,
      total: filtrados.length,
      kcal,
      maisHeavy,
      treinoIniciado,
    });
  };

  const confirmarFinalizarTreino = async () => {
    if (salvandoTreino) return;
    setSalvandoTreino(true);
    const treinoIniciado =
      localStorage.getItem(TREINO_ATIVO_KEY) || treinoAtivo;
    localStorage.removeItem(TREINO_START_KEY);
    localStorage.removeItem(TREINO_ATIVO_KEY);
    const filtrados = exercicios.filter((ex) => ex.treino === treinoIniciado);
    const volumeTotal = filtrados.reduce(
      (acc, ex) =>
        acc +
        Number(ex.series || 0) *
          Number(ex.repeticoes || 0) *
          Number(ex.carga || 0),
      0,
    );
    const { data, error } = await supabase
      .from("treinos_finalizados")
      .insert([
        {
          treino: treinoIniciado,
          tempo_segundos: tempoTotal,
          volume_total: volumeTotal,
          kcal: modalResumo.kcal || 0,
          user_id: user.id,
        },
      ])
      .select();
    if (error) {
      toast("Erro ao salvar: " + error.message, "error");
      return;
    }
    const registrosCarga = filtrados.map((ex) => ({
      user_id: user.id,
      exercicio_nome: ex.nome,
      carga: Number(ex.carga),
      treino: treinoAtivo,
    }));
    await supabase.from("historico_carga").insert(registrosCarga);
    setModalResumo(null);
    setTreinando(false);
    setTempoTotal(0);
    cancelarDescanso();
    setConcluidos({});
    setSeriesFeitas({});
    await buscarHistorico();
    setSalvandoTreino(false);
    await ganharXP(user.id, "treino_finalizado");
    const mensagens = [
      "Mais um tijolo na forja. Continue assim! 💪",
      "Sem desculpas, só resultado. Você mandou bem! 🔥",
      "Enquanto outros dormiam, você estava aqui. Respeito! ⚔️",
      "Consistência é o segredo. Você tá provando isso! 🏆",
      "Seu eu do futuro agradece esse treino hoje. 🚀",
      "Dor passa, fraqueza vai embora, orgulho fica! 💥",
      "Mais forte do que ontem. Sempre. 🧱",
      "Cada rep conta. Cada treino forja quem você é! ⭐",
    ];
    const msg = mensagens[Math.floor(Math.random() * mensagens.length)];
    setMensagemCelebracao(msg);
    setXpGanho(50);
    setCelebrando(true);
    setTimeout(() => setCelebrando(false), 3500);
  };

  const buscarSugestoesExercicio = (texto) => {
    setNovoExercicio({ ...novoExercicio, nome: texto });
    if (texto.trim().length < 2) {
      setSugestoesExercicio([]);
      setMostrarSugestoes(false);
      return;
    }
    const normalizar = (str) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    const termo = normalizar(texto.trim());
    const encontrados = exerciciosPreset
      .filter(
        (ex) =>
          normalizar(ex.nome).includes(termo) ||
          normalizar(ex.grupo_muscular).includes(termo),
      )
      .slice(0, 8);
    setSugestoesExercicio(encontrados);
    setMostrarSugestoes(encontrados.length > 0);
  };

  const selecionarExercicioPreset = (preset) => {
    setNovoExercicio({
      ...novoExercicio,
      nome: preset.nome,
      grupo_muscular: preset.grupo_muscular,
    });
    setSugestoesExercicio([]);
    setMostrarSugestoes(false);
  };

  const salvarExercicio = async (e) => {
    e.preventDefault();
    setCarregando(true);
    const exerciciosFiltrados = exercicios.filter(
      (ex) => ex.treino === treinoAtivo,
    );
    const { error } = await supabase.from("exercicio").insert([
      {
        nome: novoExercicio.nome,
        grupo_muscular: novoExercicio.grupo_muscular,
        series: Number(novoExercicio.series),
        repeticoes: Number(novoExercicio.repeticoes),
        carga: Number(novoExercicio.carga),
        treino: treinoAtivo,
        user_id: user.id,
        ordem: exerciciosFiltrados.length,
        equipamento: novoExercicio.equipamento,
        descanso_segundos: Number(novoExercicio.descanso_segundos) || 90,
      },
    ]);
    if (error) toast(error.message, "error");
    else {
      buscarExercicios();
      setNovoExercicio({
        nome: "",
        series: "",
        repeticoes: "",
        carga: "",
        grupo_muscular: "",
        treino: treinoAtivo,
        equipamento: "maquina",
      });
      nomeExercicioRef.current?.focus();
    }
    setCarregando(false);
  };

  const atualizarExercicio = async (id, campo, valor) => {
    const valorFinal = ["carga", "series", "repeticoes"].includes(campo)
      ? Number(valor)
      : valor;
    const { error } = await supabase
      .from("exercicio")
      .update({ [campo]: valorFinal })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) console.error(error.message);
    else buscarExercicios();
  };

  const deletarExercicio = async (id) => {
    const { error } = await supabase
      .from("exercicio")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) toast(error.message, "error");
    else buscarExercicios();
  };

  const toggleConcluido = (id) => {
    const ex = exercicios.find((e) => e.id === id);
    if (!ex) return;
    if (concluidos[id]) return;
    const supersetGrupo = ex.superset_id
      ? exerciciosFiltrados.filter((e) => e.superset_id === ex.superset_id)
      : null;
    setModalDescanso({
      exId: ex.id,
      nomeEx: ex.nome,
      serieAtual: seriesFeitas[ex.id] || 0,
      totalSeries: Number(ex.series),
      descansoSeg: Number(ex.descanso_segundos) || 90,
      carga: ex.carga,
      repeticoes: ex.repeticoes,
      supersetExs: supersetGrupo,
      supersetIdx: supersetGrupo
        ? supersetGrupo.findIndex((e) => e.id === ex.id)
        : 0,
    });
    cancelarDescanso();
  };

  const vincularSuperset = async (exOrigem, exDestino) => {
    const supersetId = exOrigem.superset_id || crypto.randomUUID();
    await supabase
      .from("exercicio")
      .update({ superset_id: supersetId })
      .eq("id", exOrigem.id);
    await supabase
      .from("exercicio")
      .update({ superset_id: supersetId })
      .eq("id", exDestino.id);
    buscarExercicios();
    setModalSuperset(null);
  };

  const desvincularSuperset = async (ex) => {
    await supabase
      .from("exercicio")
      .update({ superset_id: null })
      .eq("superset_id", ex.superset_id)
      .eq("user_id", user.id);
    buscarExercicios();
  };

  const abrirAjuda = (ancora) => {
    setAjudaAncora(ancora);
    setAbaPrincipal("perfil");
    setSubAbaPerfil("ajuda");
  };

  const formatarTempo = (segundos) => {
    const s = Number(segundos || 0);
    return `${Math.floor(s / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  };

  const abasDisponiveis = divisao ? divisao.split("") : [];
  const exerciciosFiltrados = exercicios.filter(
    (ex) => ex.treino === treinoAtivo,
  );
  const imc = calcularIMC();
  const tmb = calcularTMB();

  return (
    <div className="container">
      {tourAtivo && (
        <Tour
          onFechar={fecharTour}
          onNavegar={(aba) => {
            if (aba === "perfil") {
              setAbaPrincipal("perfil");
              setSubAbaPerfil("ajuda");
            } else setAbaPrincipal(aba);
          }}
        />
      )}

      {/* ── Celebração ── */}
      {celebrando && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.85)",
            animation: "tourFadeIn 0.3s ease",
            pointerEvents: "none",
          }}
        >
          <style>{`
            @keyframes celebPop { 0%{transform:scale(0.5) rotate(-10deg);opacity:0} 60%{transform:scale(1.15) rotate(5deg);opacity:1} 100%{transform:scale(1) rotate(0deg);opacity:1} }
            @keyframes celebFloat { 0%{transform:translateY(0px);opacity:1} 100%{transform:translateY(-40px);opacity:0} }
            @keyframes xpBadge { 0%{transform:scale(0) translateY(20px);opacity:0} 50%{transform:scale(1.2) translateY(-5px);opacity:1} 100%{transform:scale(1) translateY(0);opacity:1} }
          `}</style>
          <div
            style={{
              animation: "celebPop 0.5s cubic-bezier(0.16,1,0.3,1)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 80, lineHeight: 1, marginBottom: 16 }}>
              🏆
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: "#f8fafc",
                marginBottom: 8,
              }}
            >
              Treino Concluído!
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
              {mensagemCelebracao}
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "#6366f122",
                border: "1px solid #6366f144",
                borderRadius: 99,
                padding: "10px 24px",
                animation: "xpBadge 0.5s cubic-bezier(0.16,1,0.3,1) 0.3s both",
              }}
            >
              <span style={{ fontSize: 20 }}>⭐</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#818cf8" }}>
                +{xpGanho} XP
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
              {["🎉", "✨", "🌟", "💥", "🎊", "⚡", "🔥"].map((e, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: `${10 + i * 13}%`,
                    top: `${20 + (i % 3) * 20}%`,
                    fontSize: 24 + (i % 3) * 8,
                    animation: `celebFloat ${1.5 + i * 0.2}s ease ${i * 0.1}s infinite`,
                  }}
                >
                  {e}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de exercício / descanso ── */}
      <ModalDescanso
        modalDescanso={modalDescanso}
        descanso={descanso}
        seriesFeitas={seriesFeitas}
        exerciciosFiltrados={exerciciosFiltrados}
        formatarTempo={formatarTempo}
        adicionarDescanso={adicionarDescanso}
        cancelarDescanso={cancelarDescanso}
        iniciarTimerDescanso={iniciarTimerDescanso}
        iniciarDescansoManual={iniciarDescansoManual}
        inputDescanso={inputDescanso}
        setInputDescanso={setInputDescanso}
        setModalDescanso={setModalDescanso}
        setSeriesFeitas={setSeriesFeitas}
        setConcluidos={setConcluidos}
      />

      {/* ── Modal superset ── */}
      {modalSuperset && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9992,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setModalSuperset(null)}
        >
          <div
            style={{
              background: "#1a1d21",
              borderRadius: 20,
              padding: "24px 20px",
              width: "90%",
              maxWidth: 380,
              border: "1px solid #1e1e1e",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: "#f8fafc",
                marginBottom: 6,
              }}
            >
              🔗 Vincular ao superset
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
              Escolha o exercício que vem em seguida:
            </div>
            {modalSuperset.superset_id && (
              <button
                onClick={() => {
                  desvincularSuperset(modalSuperset);
                  setModalSuperset(null);
                }}
                style={{
                  width: "100%",
                  background: "#ef444415",
                  border: "1px solid #ef444433",
                  borderRadius: 10,
                  color: "#ef4444",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "10px 0",
                  cursor: "pointer",
                  marginBottom: 12,
                }}
              >
                🔓 Remover do superset
              </button>
            )}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                maxHeight: 300,
                overflowY: "auto",
              }}
            >
              {exercicios
                .filter(
                  (e) => e.treino === treinoAtivo && e.id !== modalSuperset.id,
                )
                .map((e) => (
                  <button
                    key={e.id}
                    onClick={() => vincularSuperset(modalSuperset, e)}
                    style={{
                      background: "#24282d",
                      border: "1px solid #ffffff0d",
                      borderRadius: 10,
                      color: "#f8fafc",
                      fontSize: 14,
                      padding: "12px 16px",
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    {e.superset_id &&
                      e.superset_id === modalSuperset.superset_id && (
                        <span style={{ color: "#f97316" }}>🔗</span>
                      )}
                    <div>
                      <div style={{ fontWeight: 600 }}>{e.nome}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>
                        {e.series}x{e.repeticoes} · {e.carga}kg
                      </div>
                    </div>
                  </button>
                ))}
            </div>
            <button
              onClick={() => setModalSuperset(null)}
              style={{
                marginTop: 14,
                width: "100%",
                background: "transparent",
                border: "1px solid #ffffff0d",
                borderRadius: 8,
                color: "#64748b",
                fontSize: 13,
                padding: "10px 0",
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Modal editar exercício ── */}
      {modalEditEx && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9991,
            background: "rgba(0,0,0,0.82)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#1e293b",
              borderRadius: 20,
              padding: "24px 20px",
              width: "90%",
              maxWidth: 380,
              border: "1px solid #334155",
              boxShadow: "0 8px 40px #0008",
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "#f8fafc",
                marginBottom: 20,
              }}
            >
              ✏️ Editar Exercício
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                type="text"
                placeholder="Nome do exercício"
                value={modalEditEx.nome}
                onChange={(e) =>
                  setModalEditEx({ ...modalEditEx, nome: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Grupo muscular"
                value={modalEditEx.grupo_muscular}
                onChange={(e) =>
                  setModalEditEx({
                    ...modalEditEx,
                    grupo_muscular: e.target.value,
                  })
                }
              />
              <div className="sexo-selector">
                {[
                  { val: "halter", label: "🏋️ Halter" },
                  { val: "barra", label: "🔩 Barra" },
                  { val: "maquina", label: "⚙️ Máquina" },
                ].map((eq) => (
                  <button
                    key={eq.val}
                    type="button"
                    className={
                      modalEditEx.equipamento === eq.val
                        ? "sexo-btn active"
                        : "sexo-btn"
                    }
                    onClick={() =>
                      setModalEditEx({ ...modalEditEx, equipamento: eq.val })
                    }
                  >
                    {eq.label}
                  </button>
                ))}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <input
                  type="number"
                  placeholder="Descanso (seg)"
                  value={modalEditEx.descanso_segundos}
                  onChange={(e) =>
                    setModalEditEx({
                      ...modalEditEx,
                      descanso_segundos: e.target.value,
                    })
                  }
                />
                <input
                  type="number"
                  placeholder="Séries"
                  value={modalEditEx.series}
                  onChange={(e) =>
                    setModalEditEx({ ...modalEditEx, series: e.target.value })
                  }
                />
                <input
                  type="number"
                  placeholder="Reps"
                  value={modalEditEx.repeticoes}
                  onChange={(e) =>
                    setModalEditEx({
                      ...modalEditEx,
                      repeticoes: e.target.value,
                    })
                  }
                />
                <input
                  type="number"
                  placeholder="Kg"
                  value={modalEditEx.carga}
                  onChange={(e) =>
                    setModalEditEx({ ...modalEditEx, carga: e.target.value })
                  }
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button
                onClick={() => setModalEditEx(null)}
                style={{
                  flex: 1,
                  background: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: 10,
                  color: "#94a3b8",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "12px 0",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const { error } = await supabase
                    .from("exercicio")
                    .update({
                      nome: modalEditEx.nome,
                      grupo_muscular: modalEditEx.grupo_muscular,
                      equipamento: modalEditEx.equipamento,
                      series: Number(modalEditEx.series),
                      repeticoes: Number(modalEditEx.repeticoes),
                      carga: Number(modalEditEx.carga),
                      descanso_segundos:
                        Number(modalEditEx.descanso_segundos) || 90,
                    })
                    .eq("id", modalEditEx.id)
                    .eq("user_id", user.id);
                  if (error) toast(error.message, "error");
                  else {
                    buscarExercicios();
                    setModalEditEx(null);
                    toast("Exercício atualizado! ✅", "success");
                  }
                }}
                style={{
                  flex: 2,
                  background: "#6366f1",
                  border: "none",
                  borderRadius: 10,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  padding: "12px 0",
                  cursor: "pointer",
                }}
              >
                💾 Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      <ModalResumo
        modalResumo={modalResumo}
        treinoAtivo={treinoAtivo}
        tempoTotal={tempoTotal}
        exercicios={exercicios}
        concluidos={concluidos}
        confirmarFinalizarTreino={confirmarFinalizarTreino}
        setModalResumo={setModalResumo}
        inicioTreinoRef={inicioTreinoRef}
        timerRef={timerRef}
        setTempoTotal={setTempoTotal}
        formatarTempo={formatarTempo}
      />
      <BottomNav
        abaPrincipal={abaPrincipal}
        setAbaPrincipal={setAbaPrincipal}
        showMore={showMore}
        setShowMore={setShowMore}
        logout={logout}
      />

      {abaPrincipal === "home" && (
        <Home
          user={user}
          onIniciarTreino={() => setAbaPrincipal("treino")}
          treinando={treinando}
          treinoAtivo={treinoAtivo}
          divisao={divisao}
          onNavegar={setAbaPrincipal}
        />
      )}
      {abaPrincipal === "rotina" && <Rotina user={user} />}
      {abaPrincipal === "habitos" && (
        <Habitos user={user} onAjuda={abrirAjuda} />
      )}
      {abaPrincipal === "agua" && <Agua user={user} onAjuda={abrirAjuda} />}
      {abaPrincipal === "peso" && <Peso user={user} onAjuda={abrirAjuda} />}
      {abaPrincipal === "suplementos" && (
        <Suplementos user={user} onAjuda={abrirAjuda} />
      )}
      {abaPrincipal === "dieta" && <Dieta user={user} onAjuda={abrirAjuda} />}
      {abaPrincipal === "macros" && <Macros user={user} onAjuda={abrirAjuda} />}
      {abaPrincipal === "passos" && <Passos user={user} onAjuda={abrirAjuda} />}
      {abaPrincipal === "stats" && <Stats user={user} />}
      {abaPrincipal === "smartpocket" && <SmartPocket user={user} />}
      {abaPrincipal === "rpg" && <RPG user={user} />}
      {abaPrincipal === "sono" && <Sono user={user} onAjuda={abrirAjuda} />}
      {abaPrincipal === "cardio" && <Cardio user={user} />}
      {abaPrincipal === "roundtimer" && <RoundTimer user={user} />}
      {abaPrincipal === "coach" && <Coach user={user} />}

      {abaPrincipal === "treino" && (
        <>
          <div className="treino-subnav">
            <button
              className={
                subAbaTreino === "exercicios"
                  ? "treino-subnav-btn active"
                  : "treino-subnav-btn"
              }
              onClick={() => setSubAbaTreino("exercicios")}
            >
              🏋️ Exercícios
            </button>
            <button
              className={
                subAbaTreino === "stats"
                  ? "treino-subnav-btn active"
                  : "treino-subnav-btn"
              }
              onClick={() => {
                setSubAbaTreino("stats");
                buscarDashboard();
              }}
            >
              📊 Stats
            </button>
            <button
              className={
                subAbaTreino === "historico"
                  ? "treino-subnav-btn active"
                  : "treino-subnav-btn"
              }
              onClick={() => setSubAbaTreino("historico")}
            >
              📜 Histórico
            </button>
          </div>

          {subAbaTreino === "exercicios" && (
            <>
              {!divisao ? (
                <div className="selection-screen" style={{ padding: "20px 0" }}>
                  <p className="subtitle">Escolha sua divisão de treino:</p>
                  <div className="selection-grid">
                    {["AB", "ABC", "ABCD", "ABCDE"].map((op) => (
                      <button
                        key={op}
                        onClick={() => {
                          setDivisao(op);
                          setTreinoAtivo("A");
                        }}
                        className="select-btn"
                      >
                        {op}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <header className="header-app">
                  <button
                    className="back-btn"
                    onClick={() => {
                      localStorage.removeItem("divisao");
                      setDivisao(null);
                    }}
                  >
                    ← Trocar Divisão
                  </button>
                </header>
              )}

              {divisao && (
                <>
                  <div className="timer-section">
                    {!treinando ? (
                      <button
                        className="btn-start-workout"
                        onClick={() => {
                          const agora = Date.now();
                          localStorage.setItem(TREINO_START_KEY, agora);
                          localStorage.setItem(TREINO_ATIVO_KEY, treinoAtivo);
                          inicioTreinoRef.current = agora;
                          setTreinando(true);
                          setTempoTotal(0);
                        }}
                      >
                        ▶ Iniciar Treino {treinoAtivo}
                      </button>
                    ) : (
                      <div className="active-timer-container">
                        <div className="main-timer">
                          <span>TEMPO DE TREINO</span>
                          <strong>{formatarTempo(tempoTotal)}</strong>
                        </div>
                        <div
                          className={`rest-timer ${descanso > 0 ? "active" : ""}`}
                        >
                          <span>DESCANSO</span>
                          <strong>{formatarTempo(descanso)}</strong>
                          <div className="quick-rest-buttons">
                            <button
                              className="btn-quick-rest"
                              onClick={() => adicionarDescanso(30)}
                            >
                              +30s
                            </button>
                            <button
                              className="btn-quick-rest"
                              onClick={() => adicionarDescanso(60)}
                            >
                              +60s
                            </button>
                            <button
                              className="btn-quick-rest"
                              onClick={() => adicionarDescanso(90)}
                            >
                              +90s
                            </button>
                          </div>
                          <div className="custom-rest-input">
                            <input
                              type="number"
                              inputMode="numeric"
                              placeholder="Tempo manual (seg)"
                              value={inputDescanso}
                              onChange={(e) => setInputDescanso(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") iniciarDescansoManual();
                              }}
                            />
                            <div className="rest-actions">
                              <button
                                type="button"
                                className="btn-play-rest"
                                onClick={iniciarDescansoManual}
                              >
                                ▶
                              </button>
                              <button
                                type="button"
                                className="btn-cancel-rest"
                                onClick={cancelarDescanso}
                                disabled={descanso === 0}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        </div>
                        <button
                          className="btn-stop-workout"
                          onClick={finalizarTreino}
                          disabled={salvandoTreino}
                        >
                          {salvandoTreino ? "Salvando..." : "Finalizar Treino"}
                        </button>
                      </div>
                    )}
                  </div>

                  <h1 className="title-divisao">Treino {divisao}</h1>
                  <div className="tabs">
                    {abasDisponiveis.map((letra) => (
                      <button
                        key={letra}
                        className={
                          treinoAtivo === letra
                            ? "tab-button active"
                            : "tab-button"
                        }
                        onClick={() => setTreinoAtivo(letra)}
                      >
                        {letra}
                      </button>
                    ))}
                  </div>

                  {!treinando && exerciciosFiltrados.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        marginBottom: 8,
                      }}
                    >
                      <button
                        onClick={async () => {
                          if (
                            !confirm(
                              `Apagar todos os exercícios do Treino ${treinoAtivo}?`,
                            )
                          )
                            return;
                          await Promise.all(
                            exerciciosFiltrados.map((ex) =>
                              supabase
                                .from("exercicio")
                                .delete()
                                .eq("id", ex.id)
                                .eq("user_id", user.id),
                            ),
                          );
                          buscarExercicios();
                        }}
                        style={{
                          background: "transparent",
                          border: "1px solid #ef444433",
                          borderRadius: 8,
                          color: "#ef4444",
                          fontSize: 12,
                          padding: "5px 12px",
                          cursor: "pointer",
                        }}
                      >
                        🗑️ Apagar Treino {treinoAtivo}
                      </button>
                    </div>
                  )}

                  {!treinando && (
                    <form className="form-cadastro" onSubmit={salvarExercicio}>
                      <div style={{ position: "relative" }}>
                        <input
                          ref={nomeExercicioRef}
                          type="text"
                          placeholder="Nome do Exercício (ex: Supino Reto)"
                          value={novoExercicio.nome}
                          onChange={(e) =>
                            buscarSugestoesExercicio(e.target.value)
                          }
                          onFocus={() =>
                            sugestoesExercicio.length > 0 &&
                            setMostrarSugestoes(true)
                          }
                          onBlur={() =>
                            setTimeout(() => setMostrarSugestoes(false), 150)
                          }
                          required
                        />
                        {mostrarSugestoes && (
                          <div
                            style={{
                              position: "absolute",
                              top: "100%",
                              left: 0,
                              right: 0,
                              zIndex: 20,
                              background: "#1a1d21",
                              border: "1px solid #ffffff0d",
                              borderRadius: 10,
                              marginTop: 4,
                              overflow: "hidden",
                            }}
                          >
                            {sugestoesExercicio.map((preset) => (
                              <button
                                key={preset.nome}
                                type="button"
                                onClick={() =>
                                  selecionarExercicioPreset(preset)
                                }
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  width: "100%",
                                  background: "transparent",
                                  border: "none",
                                  borderBottom: "1px solid #ffffff0d",
                                  color: "#f8fafc",
                                  fontSize: 13,
                                  padding: "10px 12px",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                              >
                                <span>{preset.nome}</span>
                                <span
                                  style={{ color: "#64748b", fontSize: 11 }}
                                >
                                  {preset.grupo_muscular}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Grupo Muscular (ex: Peitoral)"
                        value={novoExercicio.grupo_muscular}
                        onChange={(e) =>
                          setNovoExercicio({
                            ...novoExercicio,
                            grupo_muscular: e.target.value,
                          })
                        }
                        required
                      />
                      <div className="sexo-selector">
                        {[
                          { val: "halter", label: "🏋️ Halter" },
                          { val: "barra", label: "🔩 Barra" },
                          { val: "maquina", label: "⚙️ Máquina" },
                        ].map((eq) => (
                          <button
                            key={eq.val}
                            type="button"
                            className={
                              novoExercicio.equipamento === eq.val
                                ? "sexo-btn active"
                                : "sexo-btn"
                            }
                            onClick={() =>
                              setNovoExercicio({
                                ...novoExercicio,
                                equipamento: eq.val,
                              })
                            }
                          >
                            {eq.label}
                          </button>
                        ))}
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 10,
                        }}
                      >
                        <input
                          type="number"
                          placeholder="Descanso (seg)"
                          value={novoExercicio.descanso_segundos}
                          onChange={(e) =>
                            setNovoExercicio({
                              ...novoExercicio,
                              descanso_segundos: e.target.value,
                            })
                          }
                        />
                        <input
                          type="number"
                          placeholder="Séries"
                          value={novoExercicio.series}
                          onChange={(e) =>
                            setNovoExercicio({
                              ...novoExercicio,
                              series: e.target.value,
                            })
                          }
                          required
                        />
                        <input
                          type="number"
                          placeholder="Reps"
                          value={novoExercicio.repeticoes}
                          onChange={(e) =>
                            setNovoExercicio({
                              ...novoExercicio,
                              repeticoes: e.target.value,
                            })
                          }
                          required
                        />
                        <input
                          type="number"
                          placeholder="Kg"
                          value={novoExercicio.carga}
                          onChange={(e) =>
                            setNovoExercicio({
                              ...novoExercicio,
                              carga: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <button type="submit" disabled={carregando}>
                        {carregando
                          ? "Salvando..."
                          : `+ Adicionar ao Treino ${treinoAtivo}`}
                      </button>
                    </form>
                  )}

                  <div className="lista-exercicios">
                    {carregando && (
                      <p className="empty-msg">Forjando seu treino...</p>
                    )}
                    {!carregando && exerciciosFiltrados.length === 0 && (
                      <p className="empty-msg">
                        Nenhum exercício no Treino {treinoAtivo}. Adicione um!
                        💪
                      </p>
                    )}
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={exerciciosFiltrados.map((ex) => ex.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {exerciciosFiltrados.map((ex) => (
                          <ExercicioCard
                            key={ex.id}
                            ex={ex}
                            concluidos={concluidos}
                            seriesFeitas={seriesFeitas}
                            treinando={treinando}
                            toggleConcluido={toggleConcluido}
                            atualizarExercicio={atualizarExercicio}
                            deletarExercicio={deletarExercicio}
                            onEditar={(ex) =>
                              setModalEditEx({
                                ...ex,
                                descanso_segundos: ex.descanso_segundos || 90,
                              })
                            }
                            onVincular={(ex) => setModalSuperset(ex)}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </div>
                </>
              )}
            </>
          )}

          {subAbaTreino === "stats" && (
            <TreinoStats
              dashData={dashData}
              exercicios={exercicios}
              prs={prs}
              buscarEvolucao={buscarEvolucao}
            />
          )}

          {subAbaTreino === "historico" && (
            <div className="historico-section">
              <h1 className="title-divisao">Histórico 📜</h1>
              {historico.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>📜</div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "#f8fafc",
                      marginBottom: 6,
                    }}
                  >
                    Nenhum treino finalizado
                  </div>
                  <div
                    style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}
                  >
                    Conclua seu primeiro treino para ver o histórico aqui.
                  </div>
                </div>
              ) : (
                historico.map((t) => (
                  <div key={t.id} className="card-historico">
                    <div className="hist-header">
                      <span className="hist-tag">Treino {t.treino || "—"}</span>
                      <span className="hist-date">
                        {t.created_at
                          ? new Date(t.created_at).toLocaleDateString("pt-BR")
                          : "-"}
                      </span>
                    </div>
                    <div className="hist-stats">
                      <div className="hist-stat-item">
                        <span>TEMPO</span>
                        <strong>{formatarTempo(t.tempo_segundos)}</strong>
                        <button
                          onClick={() => {
                            const input = prompt(
                              "Novo tempo em minutos:",
                              Math.round((t.tempo_segundos || 0) / 60),
                            );
                            if (!input) return;
                            const mins = parseInt(input);
                            if (!mins || mins <= 0) {
                              toast("Tempo inválido!", "warning");
                              return;
                            }
                            const novosSeg = mins * 60;
                            const novaKcal = perfil.peso
                              ? Math.round(
                                  5.0 * Number(perfil.peso) * (novosSeg / 3600),
                                )
                              : t.kcal;
                            supabase
                              .from("treinos_finalizados")
                              .update({
                                tempo_segundos: novosSeg,
                                kcal: novaKcal,
                              })
                              .eq("id", t.id)
                              .then(({ error }) => {
                                if (error) {
                                  toast(
                                    "Erro ao salvar: " + error.message,
                                    "error",
                                  );
                                  return;
                                }
                                setHistorico((prev) =>
                                  prev.map((h) =>
                                    h.id === t.id
                                      ? {
                                          ...h,
                                          tempo_segundos: novosSeg,
                                          kcal: novaKcal,
                                        }
                                      : h,
                                  ),
                                );
                              });
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#64748b",
                            cursor: "pointer",
                            fontSize: 11,
                            marginLeft: 4,
                          }}
                        >
                          ✏️
                        </button>
                      </div>
                      <div className="hist-stat-item">
                        <span>🔥 KCAL</span>
                        <strong>{t.kcal || "—"}</strong>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {abaPrincipal === "perfil" && (
        <PerfilTab
          perfil={perfil}
          setPerfil={setPerfil}
          perfilEditado={perfilEditado}
          setPerfilEditado={setPerfilEditado}
          perfilOriginal={perfilOriginal}
          salvandoPerfil={salvandoPerfil}
          perfilMsg={perfilMsg}
          salvarPerfil={salvarPerfil}
          perfilCompleto={perfilCompleto}
          subAbaPerfil={subAbaPerfil}
          setSubAbaPerfil={setSubAbaPerfil}
          notifAtivas={notifAtivas}
          setNotifAtivas={setNotifAtivas}
          notifPermissao={notifPermissao}
          setNotifPermissao={setNotifPermissao}
          ajudaAncora={ajudaAncora}
          setAjudaAncora={setAjudaAncora}
          imc={imc}
          tmb={tmb}
          classificarIMC={classificarIMC}
          logout={logout}
        />
      )}
    </div>
  );
}

export default Treino;
