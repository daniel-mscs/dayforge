// Mesmas opções e regra de horário da aba Macros
export const REFEICOES_OPTS = [
  { id: "cafe", label: "☀️ Café da manhã" },
  { id: "lanche1", label: "🍎 Lanche da manhã" },
  { id: "almoco", label: "🍽️ Almoço" },
  { id: "cafetarde", label: "☕ Café da tarde" },
  { id: "janta", label: "🌙 Janta" },
  { id: "outro", label: "⏰ Fora de horário" },
];

export function refeicaoPorHorario() {
  const h = new Date().getHours();
  if (h >= 5 && h <= 9) return "cafe";
  if (h >= 10 && h <= 11) return "lanche1";
  if (h >= 12 && h <= 13) return "almoco";
  if (h >= 14 && h <= 17) return "cafetarde";
  if (h >= 18 && h <= 22) return "janta";
  return "outro";
}

