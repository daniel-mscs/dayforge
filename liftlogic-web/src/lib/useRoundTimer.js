import { useState, useEffect, useRef, useCallback } from "react";

// Toca os arquivos de áudio em public/. Adicione bell.m4a e warning.mp3
// na pasta public/ do projeto pra esses sons funcionarem.
function playBellSound() {
  const audio = new Audio("/bell.m4a");
  audio.play().catch(() => {});
}

function playWarningSound() {
  const audio = new Audio("/warning.mp3");
  audio.play().catch(() => {});
}

export function useRoundTimer(config, mode) {
  const [currentRound, setCurrentRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(config.round_duration);
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState("round");
  const [isFinished, setIsFinished] = useState(false);

  const intervalRef = useRef(null);
  const warnedRef = useRef(false);

  const reset = useCallback(() => {
    clearInterval(intervalRef.current);
    setCurrentRound(1);
    setTimeLeft(config.round_duration);
    setIsRunning(false);
    setPhase("round");
    setIsFinished(false);
    warnedRef.current = false;
  }, [config.round_duration]);

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  useEffect(() => {
    if (!isRunning) {
      clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (
          mode === "sparring" &&
          phase === "round" &&
          prev === config.warning_time + 1 &&
          !warnedRef.current
        ) {
          warnedRef.current = true;
          playWarningSound();
        }

        if (prev > 1) return prev - 1;

        playBellSound();
        warnedRef.current = false;

        setPhase((currentPhase) => {
          if (currentPhase === "round") {
            setCurrentRound((r) => {
              if (r >= config.rounds) {
                setIsFinished(true);
                setIsRunning(false);
                clearInterval(intervalRef.current);
                return r;
              }
              return r + 1;
            });
            setTimeLeft(config.rest_duration);
            return "rest";
          } else {
            setTimeLeft(config.round_duration);
            return "round";
          }
        });

        return 0;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isRunning, config, mode, phase]);

  return {
    currentRound,
    timeLeft,
    isRunning,
    phase,
    isFinished,
    setIsRunning,
    reset,
    progress: (() => {
      const total =
        phase === "round" ? config.round_duration : config.rest_duration;
      if (total === 0) return 0;
      return Math.round(((total - timeLeft) / total) * 100);
    })(),
  };
}
