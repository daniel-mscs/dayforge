'import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";

export const NOTIFICACOES_PADRAO = [
  {
    id: 1,
    hora: 7,
    minuto: 0,
    titulo: "⚖️ Peso",
    corpo: "Hora de se pesar em jejum!",
  },
  {
    id: 2,
    hora: 7,
    minuto: 30,
    titulo: "☀️ Café + Água",
    corpo: "Hora do café da manhã e hidratação!",
  },
  {
    id: 3,
    hora: 10,
    minuto: 0,
    titulo: "💧 Hidratação",
    corpo: "Não esquece da água!",
  },
  {
    id: 4,
    hora: 12,
    minuto: 0,
    titulo: "🍽️ Almoço + Macros",
    corpo: "Hora do almoço! Registra os macros.",
  },
  {
    id: 5,
    hora: 14,
    minuto: 0,
    titulo: "💧 Hidratação",
    corpo: "Água da tarde!",
  },
  {
    id: 6,
    hora: 16,
    minuto: 0,
    titulo: "☕ Café + Água",
    corpo: "Café da tarde e hidratação!",
  },
  {
    id: 7,
    hora: 23,
    minuto: 0,
    titulo: "👟 Passos",
    corpo: "Registrou seus passos hoje?",
  },
];

const STORAGE_KEY = "df_notificacoes_custom";

export function getNotificacoes() {
  try {
    const salvo = localStorage.getItem(STORAGE_KEY);
    return salvo ? JSON.parse(salvo) : NOTIFICACOES_PADRAO;
  } catch {
    return NOTIFICACOES_PADRAO;
  }
}

export function salvarNotificacoes(notifs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs));
}

export function resetarNotificacoes() {
  localStorage.removeItem(STORAGE_KEY);
  return NOTIFICACOES_PADRAO;
}

// Mantém compatibilidade com o código existente
export const NOTIFICACOES = getNotificacoes();

export function notificacoesSuportadas() {
  return Capacitor.isNativePlatform();
}

export async function pedirPermissao() {
  if (!Capacitor.isNativePlatform()) return false;
  const { display } = await LocalNotifications.requestPermissions();
  return display === "granted";
}

export async function agendarNotificacoes(idsAtivos) {
  if (!Capacitor.isNativePlatform()) return false;

  const { display } = await LocalNotifications.requestPermissions();
  if (display !== "granted") return false;

  await cancelarNotificacoes();

    await new Promise((resolve) => setTimeout(resolve, 300));

    const todasNotifs = getNotificacoes();
  const notifsFiltradas = todasNotifs.filter((n) => idsAtivos.includes(n.id));

  const agendamentos = notifsFiltradas.map((n) => {
    const agora = new Date();
    const alvo = new Date();
    alvo.setHours(n.hora, n.minuto, 0, 0);
    if (alvo <= agora) alvo.setDate(alvo.getDate() + 1);

    return {
      id: n.id,
      title: n.titulo,
      body: n.corpo,
      smallIcon: "ic_launcher",
      schedule: {
        at: alvo,
        repeats: true,
        every: "day",
        allowWhileIdle: true,
      },
    };
  });

  const resultado = await LocalNotifications.schedule({ notifications: agendamentos });
    console.log("DayForge agendamentos:", JSON.stringify(agendamentos));
    console.log("DayForge resultado:", JSON.stringify(resultado));
    return true;
}

export async function cancelarNotificacoes() {
  if (!Capacitor.isNativePlatform()) return;
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({ notifications: pending.notifications });
  }
}
'