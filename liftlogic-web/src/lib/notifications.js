export const NOTIFICACOES = [
  {
    id: "suplementos",
    hora: 8,
    minuto: 0,
    titulo: "💊 Suplementos",
    corpo: "Hora de tomar seus suplementos!",
  },
  {
    id: "agua",
    hora: 10,
    minuto: 0,
    titulo: "💧 Hidratação",
    corpo: "Você já bebeu água hoje?",
  },
  {
    id: "agua2",
    hora: 14,
    minuto: 0,
    titulo: "💧 Hidratação",
    corpo: "Não esquece da água da tarde!",
  },
  {
    id: "treino",
    hora: 17,
    minuto: 0,
    titulo: "🏋️ Treino",
    corpo: "Bora treinar hoje?",
  },
  {
    id: "macros",
    hora: 20,
    minuto: 0,
    titulo: "🍽️ Macros",
    corpo: "Registrou suas refeições hoje?",
  },
  {
    id: "peso",
    hora: 21,
    minuto: 0,
    titulo: "⚖️ Peso",
    corpo: "Lembre de pesar amanhã cedo em jejum!",
  },
  {
    id: "habitos",
    hora: 22,
    minuto: 0,
    titulo: "✅ Hábitos",
    corpo: "Completou seus hábitos hoje?",
  },
];

export async function pedirPermissao() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export async function agendarNotificacoes(notificacoesAtivas) {
  const permitido = await pedirPermissao();
  if (!permitido) return false;

  // Cancela agendamentos antigos
  cancelarNotificacoes();

  const agora = new Date();

  notificacoesAtivas.forEach((notif) => {
    const alvo = new Date();
    alvo.setHours(notif.hora, notif.minuto, 0, 0);

    // Se já passou hoje, agenda pra amanhã
    if (alvo <= agora) alvo.setDate(alvo.getDate() + 1);

    const delay = alvo.getTime() - agora.getTime();

    const timerId = setTimeout(() => {
      new Notification(notif.titulo, {
        body: notif.corpo,
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        tag: notif.id,
      });
      // Reagenda pra próximo dia (24h)
      const timer24h = setTimeout(
        () => {
          agendarNotificacoes(notificacoesAtivas);
        },
        24 * 60 * 60 * 1000,
      );
      salvarTimer(notif.id + "_24h", timer24h);
    }, delay);

    salvarTimer(notif.id, timerId);
  });

  return true;
}

function salvarTimer(id, timerId) {
  const timers = JSON.parse(localStorage.getItem("df_notif_timers") || "{}");
  timers[id] = timerId;
  localStorage.setItem("df_notif_timers", JSON.stringify(timers));
}

export function cancelarNotificacoes() {
  const timers = JSON.parse(localStorage.getItem("df_notif_timers") || "{}");
  Object.values(timers).forEach((id) => clearTimeout(id));
  localStorage.removeItem("df_notif_timers");
}

export function notificacoesSuportadas() {
  return "Notification" in window;
}
