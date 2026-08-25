import { LocalNotifications } from "@capacitor/local-notifications";
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
    return {
      id: n.id,
      title: n.titulo,
      body: n.corpo,
      smallIcon: "ic_notification",
      schedule: {
        on: {
          hour: n.hora,
          minute: n.minuto,
        },
        allowWhileIdle: true,
      },
    };
  });

  const resultado = await LocalNotifications.schedule({
    notifications: agendamentos,
  });
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

// ID reservado só pra notificação de descanso do treino, longe dos
// ids 1-7 usados pelas notificações diárias fixas.
const ID_NOTIF_DESCANSO = 9999;

export async function agendarNotificacaoDescanso(segundos) {
  if (!Capacitor.isNativePlatform()) return;
  const { display } = await LocalNotifications.requestPermissions();
  if (display !== "granted") return;
  await LocalNotifications.cancel({
    notifications: [{ id: ID_NOTIF_DESCANSO }],
  });
  await LocalNotifications.schedule({
    notifications: [
      {
        id: ID_NOTIF_DESCANSO,
        title: "⏱️ Descanso acabou!",
        body: "Bora pra próxima série 💪",
        smallIcon: "ic_notification",
        schedule: {
          at: new Date(Date.now() + segundos * 1000),
          allowWhileIdle: true,
        },
      },
    ],
  });
}

export async function cancelarNotificacaoDescanso() {
  if (!Capacitor.isNativePlatform()) return;
  await LocalNotifications.cancel({
    notifications: [{ id: ID_NOTIF_DESCANSO }],
  });
}

// IDs reservados pras notificações de resumo da Rotina por período,
// longe dos outros blocos de id já usados no app.
const IDS_NOTIF_ROTINA = {
  Acordar: 9101,
  Manhã: 9102,
  Tarde: 9103,
  Noite: 9104,
};

const HORARIOS_ROTINA = {
  Acordar: { hour: 6, minute: 30 },
  Manhã: { hour: 8, minute: 0 },
  Tarde: { hour: 13, minute: 0 },
  Noite: { hour: 19, minute: 0 },
};

function resumirTarefas(lista) {
  const textos = lista.map((t) => t.texto).filter(Boolean);
  if (textos.length === 0) return "";
  if (textos.length <= 4) return textos.join(" • ");
  return textos.slice(0, 4).join(" • ") + ` • +${textos.length - 4}`;
}

export async function agendarNotificacoesRotina(tarefasPorPeriodo) {
  if (!Capacitor.isNativePlatform()) return;
  const { display } = await LocalNotifications.requestPermissions();
  if (display !== "granted") return;

  await LocalNotifications.cancel({
    notifications: Object.values(IDS_NOTIF_ROTINA).map((id) => ({ id })),
  });

  const agora = new Date();
  const agendamentos = [];

  Object.entries(HORARIOS_ROTINA).forEach(([periodo, hora]) => {
    const lista = tarefasPorPeriodo[periodo] || [];
    if (lista.length === 0) return;

    const quando = new Date();
    quando.setHours(hora.hour, hora.minute, 0, 0);
    if (quando <= agora) return; // já passou esse período hoje

    const resumo = resumirTarefas(lista);
    if (!resumo) return;

    agendamentos.push({
      id: IDS_NOTIF_ROTINA[periodo],
      title: `📋 ${periodo}`,
      body: resumo,
      smallIcon: "ic_notification",
      schedule: { at: quando, allowWhileIdle: true },
    });
  });

  if (agendamentos.length > 0) {
    await LocalNotifications.schedule({ notifications: agendamentos });
  }
}
