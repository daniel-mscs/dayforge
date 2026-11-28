import { useState, useEffect, useRef, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { KeepAwake } from "@capacitor-community/keep-awake";

// ---------- Sons ----------
function tocar(arquivo) {
  const audio = new Audio(arquivo);
  audio.play().catch(() => {});
}
const tocarSino = () => tocar("/bell.m4a");
const tocarAviso = () => tocar("/warning.mp3");

// Bipe curto gerado na hora (contagem 3-2-1), sem precisar de arquivo
let audioCtx = null;
function bipe(freq = 880, duracao = 0.12) {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const ganho = audioCtx.createGain();
    osc.frequency.value = freq;
    ganho.gain.setValueAtTime(0.25, audioCtx.currentTime);
    ganho.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duracao);
    osc.connect(ganho).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duracao);
  } catch {
    /* sem áudio */
  }
}

function vibrar(padrao) {
  try {
    navigator.vibrate?.(padrao);
  } catch {
    /* sem vibração */
  }
}

// ---------- Tela sempre acesa ----------
// No app (Android) usa o plugin nativo; no navegador, a Wake Lock API.
let wakeLockWeb = null;
async function manterTelaAcesa(ligar) {
  try {
    if (Capacitor.isNativePlatform()) {
      if (ligar) await KeepAwake.keepAwake();
      else await KeepAwake.allowSleep();
      return;
    }
    if (ligar && "wakeLock" in navigator && !wakeLockWeb) {
      wakeLockWeb = await navigator.wakeLock.request("screen");
      wakeLockWeb.addEventListener?.("release", () => (wakeLockWeb = null));
    } else if (!ligar && wakeLockWeb) {
      await wakeLockWeb.release();
      wakeLockWeb = null;
    }
  } catch {
    /* sem suporte */
  }
}

// ---------- Motor do timer ----------
// Fases: "parado" → "preparo" → "round" ⇄ "descanso" → "fim".
// O tempo é calculado pelo horário de término da fase (não por "tiques"),
// então não atrasa se o celular travar ou a aba ficar em segundo plano.
export function useRoundTimer(config, mode, { preparo = 5 } = {}) {
  const [fase, setFase] = useState("parado");
  const [round, setRound] = useState(1);
  const [restante, setRestante] = useState(config.round_duration);
  const [rodando, setRodando] = useState(false);

  const ref = useRef({ fimEm: 0, pausadoCom: 0, fase: "parado", round: 1, avisou: false, ultimoBipe: null });
  const cfgRef = useRef(config);
  const modoRef = useRef(mode);
  useEffect(() => {
    cfgRef.current = config;
    modoRef.current = mode;
  });

  const duracaoDa = (f) =>
    f === "preparo" ? preparo : f === "round" ? cfgRef.current.round_duration : cfgRef.current.rest_duration;

  const entrarNaFase = useCallback(
    (f, r, inicio) => {
      const s = ref.current;
      s.fase = f;
      s.round = r;
      s.avisou = false;
      s.ultimoBipe = null;
      s.fimEm = inicio + duracaoDa(f) * 1000;
      setFase(f);
      setRound(r);
      setRestante(duracaoDa(f));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [preparo],
  );

  // Passa para a próxima fase; `quando` mantém o encadeamento sem atraso
  const avancar = useCallback(
    (quando = Date.now()) => {
      const s = ref.current;
      const cfg = cfgRef.current;
      if (s.fase === "preparo") {
        tocarSino();
        vibrar([300]);
        entrarNaFase("round", 1, quando);
      } else if (s.fase === "round") {
        if (s.round >= cfg.rounds) {
          tocarSino();
          vibrar([300, 150, 300, 150, 300]);
          s.fase = "fim";
          setFase("fim");
          setRestante(0);
          setRodando(false);
        } else if (cfg.rest_duration > 0) {
          tocarSino();
          vibrar([200, 100, 200]);
          entrarNaFase("descanso", s.round, quando);
        } else {
          tocarSino();
          entrarNaFase("round", s.round + 1, quando);
        }
      } else if (s.fase === "descanso") {
        tocarSino();
        vibrar([300]);
        entrarNaFase("round", s.round + 1, quando);
      }
    },
    [entrarNaFase],
  );

  // Relógio
  useEffect(() => {
    if (!rodando) return;
    const id = setInterval(() => {
      const s = ref.current;
      const agora = Date.now();
      // Pode ter passado mais de uma fase com o app em segundo plano
      let guarda = 0;
      while (s.fase !== "fim" && agora >= s.fimEm && guarda++ < 100) avancar(s.fimEm);
      if (s.fase === "fim") return;
      const seg = Math.max(0, Math.ceil((s.fimEm - agora) / 1000));
      setRestante(seg);
      const cfg = cfgRef.current;
      if (modoRef.current === "sparring" && s.fase === "round" && !s.avisou && seg === cfg.warning_time) {
        s.avisou = true;
        tocarAviso();
        vibrar([100, 80, 100]);
      }
      // 3-2-1 antes de começar cada round
      if ((s.fase === "preparo" || s.fase === "descanso") && seg <= 3 && seg >= 1 && s.ultimoBipe !== seg) {
        s.ultimoBipe = seg;
        bipe(660);
      }
    }, 200);
    return () => clearInterval(id);
  }, [rodando, avancar]);

  // Tela acesa durante o treino (rodando ou pausado no meio)
  const emTreino = fase !== "parado" && fase !== "fim";
  useEffect(() => {
    manterTelaAcesa(emTreino);
    const reativar = () => {
      if (emTreino && document.visibilityState === "visible") manterTelaAcesa(true);
    };
    document.addEventListener("visibilitychange", reativar);
    return () => document.removeEventListener("visibilitychange", reativar);
  }, [emTreino]);
  useEffect(() => () => manterTelaAcesa(false), []);

  const iniciarOuPausar = useCallback(() => {
    const s = ref.current;
    bipe(0, 0.001); // destrava o áudio no primeiro toque (iOS/Android)
    if (s.fase === "parado" || s.fase === "fim") {
      if (preparo > 0) entrarNaFase("preparo", 1, Date.now());
      else {
        tocarSino();
        entrarNaFase("round", 1, Date.now());
      }
      setRodando(true);
      return;
    }
    if (rodando) {
      s.pausadoCom = Math.max(0, s.fimEm - Date.now());
      setRodando(false);
    } else {
      s.fimEm = Date.now() + s.pausadoCom;
      setRodando(true);
    }
  }, [rodando, preparo, entrarNaFase]);

  const pular = useCallback(() => {
    const s = ref.current;
    if (s.fase === "parado" || s.fase === "fim") return;
    avancar(Date.now());
    if (!rodando) ref.current.pausadoCom = Math.max(0, ref.current.fimEm - Date.now());
  }, [avancar, rodando]);

  const reset = useCallback(() => {
    ref.current = { fimEm: 0, pausadoCom: 0, fase: "parado", round: 1, avisou: false, ultimoBipe: null };
    setRodando(false);
    setFase("parado");
    setRound(1);
    setRestante(cfgRef.current.round_duration);
  }, []);


  const total =
    fase === "preparo" ? preparo : fase === "descanso" ? config.rest_duration : fase === "fim" ? 1 : config.round_duration;
  const progresso = fase === "fim" ? 1 : total > 0 ? (total - restante) / total : 0;

  // Parado: mostra sempre a duração da configuração atual (ex.: ao trocar de preset)
  const restanteVisivel = fase === "parado" ? config.round_duration : restante;

  return { fase, round, restante: restanteVisivel, rodando, progresso, iniciarOuPausar, pular, reset };
}
