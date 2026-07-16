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

export default function RoundTimer({ user }) {
  const [config, setConfig] = useState(carregarConfig);
  const [mode, setMode] = useState("training");
  const [showConfig, setShowConfig] = useState(false);
  const [salvandoCardio, setSalvandoCardio] = useState(false);

  const [localRounds, setLocalRounds] = useState(config.rounds);
  const [localRoundMin, setLocalRoundMin] = useState(
    Math.floor(config.round_duration / 60),
  );
  const [localRoundSec, setLocalRoundSec] = useState(
    config.round_duration % 60,
  );
  const [localRestMin, setLocalRestMin] = useState(
    Math.floor(config.rest_duration / 60),
  );
  const [localRestSec, setLocalRestSec] = useState(config.rest_duration % 60);
  const [localWarningTime, setLocalWarningTime] = useState(
    config.warning_time || 10,
  );

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

  const applyInlineConfig = () => {
    const newConfig = {
      ...config,
      rounds: localRounds,
      round_duration: localRoundMin * 60 + localRoundSec,
      rest_duration: localRestMin * 60 + localRestSec,
      warning_time: localWarningTime,
    };
    setConfig(newConfig);
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    setShowConfig(false);
    reset();
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
            className={`ct-config-inline-btn ${showConfig ? "ct-active" : ""}`}
            onClick={() => setShowConfig((s) => !s)}
          >
            ⚙
          </button>
        </div>

        {showConfig && (
          <div className="ct-inline-config">
            <div className="ct-inline-row">
              <span className="ct-inline-label">ROUNDS</span>
              <input
                type="number"
                min="1"
                max="30"
                value={localRounds}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    setLocalRounds("");
                    return;
                  }
                  setLocalRounds(Number(val));
                }}
                className="ct-rounds-input"
              />
            </div>

            <div className="ct-inline-row">
              <span className="ct-inline-label">ROUND</span>
              <div className="ct-time-inputs">
                <div className="ct-time-field">
                  <input
                    type="number"
                    min="0"
                    max="9"
                    value={localRoundMin}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLocalRoundMin(val === "" ? "" : Number(val));
                    }}
                    onBlur={() => setLocalRoundMin((v) => Number(v) || 0)}
                  />
                  <span className="ct-time-unit">min</span>
                </div>
                <span className="ct-time-sep">:</span>
                <div className="ct-time-field">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={String(localRoundSec).padStart(2, "0")}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLocalRoundSec(
                        val === "" ? "" : Math.min(59, Number(val)),
                      );
                    }}
                    onBlur={() => setLocalRoundSec((v) => Number(v) || 0)}
                  />
                  <span className="ct-time-unit">seg</span>
                </div>
              </div>
            </div>

            <div className="ct-inline-row">
              <span className="ct-inline-label">DESCANSO</span>
              <div className="ct-time-inputs">
                <div className="ct-time-field">
                  <input
                    type="number"
                    min="0"
                    max="9"
                    value={localRestMin}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLocalRestMin(val === "" ? "" : Number(val));
                    }}
                    onBlur={() => setLocalRestMin((v) => Number(v) || 0)}
                  />
                  <span className="ct-time-unit">min</span>
                </div>
                <span className="ct-time-sep">:</span>
                <div className="ct-time-field">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={String(localRestSec).padStart(2, "0")}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLocalRestSec(
                        val === "" ? "" : Math.min(59, Number(val)),
                      );
                    }}
                    onBlur={() => setLocalRestSec((v) => Number(v) || 0)}
                  />
                  <span className="ct-time-unit">seg</span>
                </div>
              </div>
            </div>

            {mode === "sparring" && (
              <div className="ct-inline-row">
                <span className="ct-inline-label">AVISO</span>
                <div className="ct-warning-options">
                  {[10, 20, 30].map((val) => (
                    <button
                      key={val}
                      className={`ct-warning-btn ${localWarningTime === val ? "ct-active" : ""}`}
                      onClick={() => setLocalWarningTime(val)}
                    >
                      {val}s
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button className="ct-inline-apply" onClick={applyInlineConfig}>
              ✓ APLICAR
            </button>
          </div>
        )}

        <div className="ct-config-summary">
          {config.rounds} rounds • {formatTime(config.round_duration)} •
          descanso {formatTime(config.rest_duration)}
        </div>

        {isFinished && user && (
          <button
            className="ct-inline-apply"
            style={{ maxWidth: 400, marginTop: 16 }}
            onClick={registrarNoCardio}
            disabled={salvandoCardio}
          >
            {salvandoCardio ? "Salvando..." : "✅ Registrar no Cardio"}
          </button>
        )}
      </main>
    </div>
  );
}
