import { useState, useEffect } from "react";

const TOUR_KEY = "dayforge_tour_visto";

export function useTour() {
  const [ativo, setAtivo] = useState(false);

  useEffect(() => {
    const visto = localStorage.getItem(TOUR_KEY);
    if (!visto) setTimeout(() => setAtivo(true), 800);
  }, []);

  const fechar = () => {
    localStorage.setItem(TOUR_KEY, "1");
    setAtivo(false);
  };

  const resetar = () => {
    localStorage.removeItem(TOUR_KEY);
    setAtivo(true);
  };

  return { ativo, fechar, resetar };
}