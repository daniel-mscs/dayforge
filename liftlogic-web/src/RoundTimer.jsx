import React, { useState, useEffect } from "react";
import { useRoundTimer } from "./lib/useRoundTimer";
import { supabase } from "./lib/supabase";
import { toast } from "./lib/toast";
import { useTravado } from "./lib/useTravado";
import {
  Settings,
  Swords,
  Trophy,
  Check,
  Zap,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  X,
  Minus,
  Plus,
} from "lucide-react";
import "./RoundTimer.css";

const CONFIG_STORAGE_KEY = "df_roundtimer_config";
const PREPARO_STORAGE_KEY = "df_roundtimer_preparo";
const MET_MUAY_THAI = 10.0;

const CONFIG_PADRAO = {
  rounds: 3,
  round_duration: 180,
  rest_duration: 60,
  warning_time: 10,
};

const PRESETS = [
  { nome: "Boxe", rounds: 3, round_duration: 180, rest_duration: 60 },
  { nome: "Muay Thai", rounds: 5, round_duration: 180, rest_duration: 120 },
  { nome: "MMA", rounds: 3, round_duration: 300, rest_duration: 60 },
  { nome: "Jiu-Jitsu", rounds: 5, round_duration: 360, rest_duration: 60 },
  { nome: "Tabata", rounds: 8, round_duration: 20, rest_duration: 10 },
  { nome: "HIIT", rounds: 10, round_duration: 40, rest_duration: 20 },
];

function carregarConfig() {
  try {
    const salvo = localStorage.getItem(CONFIG_STORAGE_KEY);
    return salvo ? { ...CONFIG_PADRAO, ...JSON.parse(salvo) } : CONFIG_PADRAO;
  } catch {
    return CONFIG_PADRAO;
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function Stepper({ valor, onChange, passo, min, max, formatar = (v) => v }) {
  return (
    <div className="rt-stepper">
      <button type="button" onClick={() => onChange(Math.max(min, valor - passo))} aria-label="Diminuir">
        <Minus size={18} />
      </button>
      <span>{formatar(valor)}</span>
      <button type="button" onClick={() => onChange(Math.min(max, valor + passo))} aria-label="Aumentar">
        <Plus size={18} />
      </button>
    </div>
  );
}

function ConfigModal({ config, preparo, mode, onSave, onClose }) {
  const [c, setC] = useState(config);
  const [prep, setPrep] = useState(preparo);
  const set = (campo) => (v) => setC((x) => ({ ...x, [campo]: v }));

  return (
    <div className="rt-modal-fundo" onClick={onClose}>
      <div className="rt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rt-modal-topo">
          <span>
            <Settings size={16} /> Configurar
          </span>
          <button className="rt-icone-btn" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="rt-config-linha">
          <label>Rounds</label>
          <Stepper valor={c.rounds} onChange={set("rounds")} passo={1} min={1} max={30} />
        </div>
        <div className="rt-config-linha">
          <label>Duração do round</label>
          <Stepper valor={c.round_duration} onChange={set("round_duration")} passo={15} min={10} max={1200} formatar={formatTime} />
        </div>
        <div className="rt-config-linha">
          <label>Descanso</label>
          <Stepper valor={c.rest_duration} onChange={set("rest_duration")} passo={15} min={0} max={600} formatar={formatTime} />
        </div>
        <div className="rt-config-linha">
          <label>Preparação antes de começar</label>
          <Stepper valor={prep} onChange={setPrep} passo={5} min={0} max={30} formatar={(v) => `${v}s`} />
        </div>
        {mode === "sparring" && (
          <div className="rt-config-linha">
            <label>Aviso faltando</label>
            <div className="rt-chips">
              {[10, 20, 30].map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`rt-chip ${c.warning_time === v ? "rt-ativo" : ""}`}
                  onClick={() => set("warning_time")(v)}
                >
                  {v}s
                </button>
              ))}
            </div>
          </div>
        )}

        <button className="rt-btn-principal" onClick={() => onSave(c, prep)}>
          Salvar
        </button>
      </div>
    </div>
  );
}

const ROTULO_FASE = {
  parado: "PRONTO",
  preparo: "PREPARAR",
  round: "ROUND",
  descanso: "DESCANSO",
  fim: "CONCLUÍDO",
};

export default function RoundTimer({ user }) {
  const [config, setConfig] = useState(carregarConfig);
  const [preparo, setPreparo] = useState(() => {
    const v = Number(localStorage.getItem(PREPARO_STORAGE_KEY));
    return Number.isFinite(v) && localStorage.getItem(PREPARO_STORAGE_KEY) !== null ? v : 5;
  });
  const [mode, setMode] = useState("training");
  const [showConfig, setShowConfig] = useState(false);

  const { fase, round, restante, rodando, progresso, iniciarOuPausar, pular, reset } =
    useRoundTimer(config, mode, { preparo });

  // Trava o scroll da página com o modal aberto
  useEffect(() => {
    if (!showConfig) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [showConfig]);

  const aplicarConfig = (nova, novoPreparo = preparo) => {
    setConfig(nova);
    setPreparo(novoPreparo);
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(nova));
    localStorage.setItem(PREPARO_STORAGE_KEY, String(novoPreparo));
    setShowConfig(false);
    reset();
  };

  const [registrarNoCardio, salvandoCardio] = useTravado(async () => {
    if (!user) return;
    const duracaoMin = Math.round(
      (config.rounds * config.round_duration + (config.rounds - 1) * config.rest_duration) / 60,
    );
    const { data: perfil } = await supabase.from("perfil").select("peso").eq("user_id", user.id).single();
    const pesoEfetivo = perfil?.peso || 70;
    const kcal = Math.round(MET_MUAY_THAI * pesoEfetivo * (duracaoMin / 60));
    const d = new Date();
    const hoje = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split("T")[0];
    const { error } = await supabase.from("cardio_registro").insert([
      {
        user_id: user.id,
        data: hoje,
        tipo: "Muay Thai",
        duracao_min: duracaoMin,
        kcal,
        observacao: `${config.rounds}x${formatTime(config.round_duration)} / descanso ${formatTime(config.rest_duration)} (${mode === "sparring" ? "sparring" : "treino"})`,
      },
    ]);
    if (error) return toast(error.message, "error");
    toast("Treino registrado no Cardio! 🥊", "success");
  });

  const emTreino = fase !== "parado" && fase !== "fim";
  const alerta = rodando && fase === "round" && restante <= 10 && restante > 0;
  const totalSessao = config.rounds * config.round_duration + (config.rounds - 1) * config.rest_duration;

  // Anel de progresso
  const R = 140;
  const C = 2 * Math.PI * R;

  return (
    <div className={`rt-tela rt-fase-${fase} ${mode === "sparring" ? "rt-sparring" : ""} ${alerta ? "rt-alerta" : ""}`}>
      <div className="rt-topo">
        <div className="rt-modos">
          <button
            className={mode === "training" ? "rt-ativo" : ""}
            onClick={() => !emTreino && setMode("training")}
            disabled={emTreino}
          >
            <Zap size={14} /> Treino
          </button>
          <button
            className={mode === "sparring" ? "rt-ativo" : ""}
            onClick={() => !emTreino && setMode("sparring")}
            disabled={emTreino}
          >
            <Swords size={14} /> Sparring
          </button>
        </div>
        <button className="rt-icone-btn" onClick={() => setShowConfig(true)} disabled={emTreino} aria-label="Configurar">
          <Settings size={20} />
        </button>
      </div>

      {!emTreino && (
        <div className="rt-presets">
          {PRESETS.map((p) => {
            const ativo =
              p.rounds === config.rounds &&
              p.round_duration === config.round_duration &&
              p.rest_duration === config.rest_duration;
            return (
              <button
                key={p.nome}
                className={`rt-chip ${ativo ? "rt-ativo" : ""}`}
                onClick={() => aplicarConfig({ ...config, ...p })}
              >
                <strong>{p.nome}</strong>
                <small>
                  {p.rounds}×{formatTime(p.round_duration)}
                </small>
              </button>
            );
          })}
        </div>
      )}

      <div className="rt-relogio" onClick={fase !== "fim" ? iniciarOuPausar : undefined}>
        <svg viewBox="0 0 320 320" className="rt-anel">
          <circle cx="160" cy="160" r={R} className="rt-anel-fundo" />
          <circle
            cx="160"
            cy="160"
            r={R}
            className="rt-anel-progresso"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progresso)}
          />
        </svg>
        <div className="rt-relogio-texto">
          <span className="rt-fase-rotulo">
            {fase === "fim" ? <Trophy size={16} /> : null} {ROTULO_FASE[fase]}
            {fase === "round" ? ` ${round}/${config.rounds}` : ""}
          </span>
          <span className="rt-tempo">{fase === "fim" ? formatTime(totalSessao) : formatTime(restante)}</span>
          <span className="rt-sub">
            {fase === "parado" && "toque para começar"}
            {fase === "preparo" && "prepare-se"}
            {fase === "descanso" && `próximo: round ${round + 1}`}
            {fase === "round" && (rodando ? "vai!" : "pausado")}
            {fase === "fim" && "de treino"}
          </span>
        </div>
      </div>

      <div className="rt-rounds">
        {Array.from({ length: config.rounds }, (_, i) => {
          const n = i + 1;
          const feito = fase === "fim" || n < round || (n === round && fase === "descanso");
          const atual = n === round && fase === "round";
          return <span key={n} className={`rt-ponto ${feito ? "rt-feito" : ""} ${atual ? "rt-atual" : ""}`} />;
        })}
      </div>

      <div className="rt-controles">
        <button className="rt-btn-redondo" onClick={reset} aria-label="Recomeçar" disabled={fase === "parado"}>
          <RotateCcw size={22} />
        </button>
        {fase !== "fim" ? (
          <button className="rt-btn-play" onClick={iniciarOuPausar} aria-label={rodando ? "Pausar" : "Iniciar"}>
            {rodando ? <Pause size={34} fill="currentColor" /> : <Play size={34} fill="currentColor" />}
          </button>
        ) : (
          <button className="rt-btn-play" onClick={() => { reset(); }} aria-label="Novo treino">
            <RotateCcw size={32} />
          </button>
        )}
        <button className="rt-btn-redondo" onClick={pular} aria-label="Pular fase" disabled={!emTreino}>
          <SkipForward size={22} />
        </button>
      </div>

      <div className="rt-resumo">
        {config.rounds} rounds · {formatTime(config.round_duration)} · descanso {formatTime(config.rest_duration)} ·
        total {formatTime(totalSessao)}
      </div>

      {fase === "fim" && user && (
        <button className="rt-btn-principal rt-btn-cardio" onClick={registrarNoCardio} disabled={salvandoCardio}>
          {salvandoCardio ? "Salvando..." : (<><Check size={16} /> Registrar no Cardio</>)}
        </button>
      )}

      {showConfig && (
        <ConfigModal
          config={config}
          preparo={preparo}
          mode={mode}
          onSave={aplicarConfig}
          onClose={() => setShowConfig(false)}
        />
      )}
    </div>
  );
}
