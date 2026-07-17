import React, { useState, useEffect } from "react";
import { useRoundTimer } from "./lib/useRoundTimer";
import { supabase } from "./lib/supabase";
import { toast } from "./lib/toast";
import "./RoundTimer.css";

const CONFIG_STORAGE_KEY = "df_roundtimer_config";
const MET_MUAY_THAI = 10.0;

const CONFIG_PADRAO = {
  rounds: 3,
  round_duration: 180,
  rest_duration: 60,
  warning_time: 10,
};

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

function ConfigModal({ config, mode, onSave, onClose }) {
  const [rounds, setRounds] = useState(config.rounds);
  const [roundMin, setRoundMin] = useState(
    Math.floor(config.round_duration / 60),
  );
  const [roundSec, setRoundSec] = useState(config.round_duration % 60);
  const [restMin, setRestMin] = useState(Math.floor(config.rest_duration / 60));
  const [restSec, setRestSec] = useState(config.rest_duration % 60);
  const [warningTime, setWarningTime] = useState(config.warning_time || 10);

  const handleSave = () => {
    onSave({
      rounds,
      round_duration: roundMin * 60 + roundSec,
      rest_duration: restMin * 60 + restSec,
      warning_time: warningTime,
    });
  };

  return (
    <div className="ct-modal-overlay" onClick={onClose}>
      <div
        className={`ct-modal-box ${mode === "sparring" ? "ct-sparring" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ct-modal-header">
          <span className="ct-modal-title">⚙ CONFIGURAÇÕES</span>
          <button className="ct-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="ct-modal-body">
          <div className="ct-config-row">
            <label className="ct-config-label">Número de rounds</label>
            <div className="ct-stepper">
              <button onClick={() => setRounds((r) => Math.max(1, r - 1))}>
                −
              </button>
              <span>{rounds}</span>
              <button onClick={() => setRounds((r) => Math.min(30, r + 1))}>
                +
              </button>
            </div>
          </div>

          <div className="ct-config-row">
            <label className="ct-config-label">Duração do round</label>
            <div className="ct-time-inputs">
              <div className="ct-time-field">
                <input
                  type="number"
                  min="0"
                  max="9"
                  value={roundMin}
                  onChange={(e) => setRoundMin(Number(e.target.value) || 0)}
                />
                <span className="ct-time-unit">min</span>
              </div>
              <span className="ct-time-sep">:</span>
              <div className="ct-time-field">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={String(roundSec).padStart(2, "0")}
                  onChange={(e) =>
                    setRoundSec(Math.min(59, Number(e.target.value) || 0))
                  }
                />
                <span className="ct-time-unit">seg</span>
              </div>
            </div>
          </div>

          <div className="ct-config-row">
            <label className="ct-config-label">Tempo de descanso</label>
            <div className="ct-time-inputs">
              <div className="ct-time-field">
                <input
                  type="number"
                  min="0"
                  max="9"
                  value={restMin}
                  onChange={(e) => setRestMin(Number(e.target.value) || 0)}
                />
                <span className="ct-time-unit">min</span>
              </div>
              <span className="ct-time-sep">:</span>
              <div className="ct-time-field">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={String(restSec).padStart(2, "0")}
                  onChange={(e) =>
                    setRestSec(Math.min(59, Number(e.target.value) || 0))
                  }
                />
                <span className="ct-time-unit">seg</span>
              </div>
            </div>
          </div>

          {mode === "sparring" && (
            <div className="ct-config-row">
              <label className="ct-config-label">Aviso sonoro faltando</label>
              <div className="ct-warning-options">
                {[10, 20, 30].map((val) => (
                  <button
                    key={val}
                    className={`ct-warning-btn ${warningTime === val ? "ct-active" : ""}`}
                    onClick={() => setWarningTime(val)}
                  >
                    {val}s
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="ct-modal-footer">
          <button className="ct-btn-cancel" onClick={onClose}>
            CANCELAR
          </button>
          <button className="ct-btn-save" onClick={handleSave}>
            SALVAR
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RoundTimer({ user }) {
  const [config, setConfig] = useState(carregarConfig);
  const [mode, setMode] = useState("training");
  const [showConfig, setShowConfig] = useState(false);
  const [salvandoCardio, setSalvandoCardio] = useState(false);

  useEffect(() => {
    if (showConfig) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      return () => {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [showConfig]);

  const {
    currentRound,
    timeLeft,
    isRunning,
    phase,
    isFinished,
    setIsRunning,
    reset,
  } = useRoundTimer(config, mode);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setShowConfig(false);
    reset();
  };

  const salvarConfig = (newConfig) => {
    setConfig(newConfig);
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    setShowConfig(false);
    reset();
  };

  const registrarNoCardio = async () => {
    if (!user) return;
    setSalvandoCardio(true);
    const duracaoMin = Math.round(
      (config.rounds * config.round_duration +
        (config.rounds - 1) * config.rest_duration) /
        60,
    );
    const { data: perfil } = await supabase
      .from("perfil")
      .select("peso")
      .eq("user_id", user.id)
      .single();
    const pesoEfetivo = perfil?.peso || 70;
    const kcal = Math.round(MET_MUAY_THAI * pesoEfetivo * (duracaoMin / 60));
    const hoje = (() => {
      const d = new Date();
      const offset = d.getTimezoneOffset();
      return new Date(d.getTime() - offset * 60000).toISOString().split("T")[0];
    })();

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
    setSalvandoCardio(false);
    if (error) {
      toast(error.message, "error");
      return;
    }
    toast("Treino registrado no Cardio! 🥊", "success");
  };

  const isWarning =
    timeLeft <= 10 && timeLeft > 0 && isRunning && phase === "round";

  return (
    <div className={`ct-app-wrapper ${isWarning ? "ct-warning-pulse" : ""}`}>
      <div className="ct-noise-overlay" />

      <header className="ct-top-bar">
        <div className="ct-logo-mark">
          <span className="ct-logo-icon">✦</span>
          <span className="ct-logo-text">
            COMBAT<span className="ct-logo-sub">TIMER</span>
          </span>
        </div>
      </header>

      <div className="ct-mode-selector">
        <button
          className={`ct-mode-btn ${mode === "training" ? "ct-active" : ""}`}
          onClick={() => handleModeChange("training")}
        >
          🥊 TREINO
        </button>
        <button
          className={`ct-mode-btn ${mode === "sparring" ? "ct-active ct-sparring" : ""}`}
          onClick={() => handleModeChange("sparring")}
        >
          ⚔️ SPARRING
        </button>
      </div>

      <main className="ct-timer-stage">
        <div className="ct-round-indicator">
          {Array.from({ length: config.rounds }, (_, i) => (
            <span
              key={i}
              className={`ct-round-dot ${i + 1 < currentRound ? "ct-done" : ""} ${i + 1 === currentRound ? "ct-active" : ""} ${mode === "sparring" ? "ct-sparring" : ""}`}
            />
          ))}
        </div>

        <div className="ct-phase-badge-wrap">
          <span
            className={`ct-phase-badge ${phase === "rest" ? "ct-rest" : ""} ${isFinished ? "ct-finished" : ""} ${mode === "sparring" && phase === "round" ? "ct-sparring" : ""}`}
          >
            {isFinished
              ? "🏆 TREINO CONCLUÍDO"
              : phase === "round"
                ? `ROUND ${currentRound} / ${config.rounds}`
                : "DESCANSO"}
          </span>
        </div>

        <div
          className={`ct-clock-display ${isWarning ? "ct-flash" : ""} ${isFinished ? "ct-dim" : ""}`}
        >
          {isFinished ? "00:00" : formatTime(timeLeft)}
        </div>

        <div className="ct-controls">
          {!isFinished ? (
            <button
              className={`ct-main-btn ${isRunning ? "ct-pause" : "ct-play"} ${mode === "sparring" ? "ct-sparring" : ""}`}
              onClick={() => setIsRunning((r) => !r)}
            >
              {isRunning
                ? "⏸ PAUSAR"
                : timeLeft === config.round_duration && currentRound === 1
                  ? "▶ INICIAR"
                  : "▶ CONTINUAR"}
            </button>
          ) : null}
          <button className="ct-reset-btn" onClick={reset}>
            ↺
          </button>
          <button
            className="ct-config-inline-btn"
            onClick={() => setShowConfig(true)}
          >
            ⚙
          </button>
        </div>

        <div className="ct-config-summary">
          {config.rounds} rounds • {formatTime(config.round_duration)} •
          descanso {formatTime(config.rest_duration)}
        </div>

        {isFinished && user && (
          <button
            className="ct-btn-save"
            style={{ maxWidth: 400, width: "100%", marginTop: 16 }}
            onClick={registrarNoCardio}
            disabled={salvandoCardio}
          >
            {salvandoCardio ? "Salvando..." : "✅ Registrar no Cardio"}
          </button>
        )}
      </main>

      {showConfig && (
        <ConfigModal
          config={config}
          mode={mode}
          onSave={salvarConfig}
          onClose={() => setShowConfig(false)}
        />
      )}
    </div>
  );
}
