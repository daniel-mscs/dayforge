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
  // Cancela só os ids 1-7 (as notificações diárias fixas) — antes isso
  // cancelava TUDO que estava pendente no app (Rotina, ausência,
  // pendências etc), apagando avisos que ainda iam disparar.
  const idsFixos = getNotificacoes().map((n) => ({ id: n.id }));
  await LocalNotifications.cancel({ notifications: idsFixos });
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

// Lembrete de "sumiço" — reagendado do zero toda vez que o app abre.
// Se a pessoa não abrir de novo antes do prazo, o lembrete dispara.
const ID_NOTIF_AUSENCIA = 9201;

export async function agendarNotificacaoAusencia(dias = 3) {
  if (!Capacitor.isNativePlatform()) return;
  const { display } = await LocalNotifications.requestPermissions();
  if (display !== "granted") return;

  await LocalNotifications.cancel({
    notifications: [{ id: ID_NOTIF_AUSENCIA }],
  });

  const quando = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
  await LocalNotifications.schedule({
    notifications: [
      {
        id: ID_NOTIF_AUSENCIA,
        title: "🔥 Sentimos sua falta!",
        body: "Já faz uns dias que você não abre o DayForge — bora manter o ritmo?",
        smallIcon: "ic_notification",
        schedule: { at: quando, allowWhileIdle: true },
      },
    ],
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
  Manhã: { hour: 7, minute: 0 },
  Tarde: { hour: 12, minute: 0 },
  Noite: { hour: 17, minute: 0 },
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

// Resumo noturno — sempre dispara à noite com um recap do dia inteiro
// (treino, água, sono, gastos), no lugar de vários lembretes separados.
const ID_NOTIF_PENDENCIAS = 9301;

export async function agendarResumoNoturno(
  { treinou, kcalTreino, aguaMl, aguaMeta, sonoOk, gastosHoje },
  hora = 21,
  minuto = 0,
) {
  if (!Capacitor.isNativePlatform()) return;

  await LocalNotifications.cancel({
    notifications: [{ id: ID_NOTIF_PENDENCIAS }],
  });

  const { display } = await LocalNotifications.requestPermissions();
  if (display !== "granted") return;

  const agora = new Date();
  const alvo = new Date();
  alvo.setHours(hora, minuto, 0, 0);
  if (alvo <= agora) return; // já passou do horário hoje, não agenda

  const linhas = [
    treinou
      ? `🏋️ Treino feito${kcalTreino ? ` (${kcalTreino} kcal)` : ""}`
      : "🏋️ Sem treino hoje",
    aguaMeta ? `💧 ${aguaMl}/${aguaMeta}ml` : `💧 ${aguaMl}ml`,
    sonoOk ? "😴 Sono registrado" : "😴 Sono não registrado",
    gastosHoje > 0
      ? `💰 Gastos: R$${gastosHoje.toFixed(2).replace(".", ",")}`
      : "💰 Sem gastos hoje",
  ];

  await LocalNotifications.schedule({
    notifications: [
      {
        id: ID_NOTIF_PENDENCIAS,
        title: "📋 Resumo do seu dia",
        body: linhas.join("\n"),
        smallIcon: "ic_notification",
        schedule: { at: alvo, allowWhileIdle: true },
      },
    ],
  });
}

// Notificação por refeição da Dieta — dispara no início da janela de
// horário de cada refeição (ex: Café da manhã às 5h), mostrando os
// itens cadastrados naquela refeição, um por linha.
const IDS_NOTIF_DIETA = {
  cafe: 9401,
  lanche1: 9402,
  almoco: 9403,
  cafetarde: 9404,
  janta: 9405,
};

export async function agendarNotificacoesDieta(refeicoes, plano) {
  if (!Capacitor.isNativePlatform()) return;
  const { display } = await LocalNotifications.requestPermissions();
  if (display !== "granted") return;

  await LocalNotifications.cancel({
    notifications: Object.values(IDS_NOTIF_DIETA).map((id) => ({ id })),
  });

  const agora = new Date();
  const agendamentos = [];

  refeicoes.forEach((r) => {
    const conteudo = (plano[r.id] || "").trim();
    if (!conteudo) return;

    const quando = new Date();
    quando.setHours(r.horaDe, 0, 0, 0);
    if (quando <= agora) return; // já passou essa refeição hoje

    const itens = conteudo
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (itens.length === 0) return;

    agendamentos.push({
      id: IDS_NOTIF_DIETA[r.id],
      title: r.label,
      body: itens.map((i) => `• ${i}`).join("\n"),
      smallIcon: "ic_notification",
      schedule: { at: quando, allowWhileIdle: true },
    });
  });

  if (agendamentos.length > 0) {
    await LocalNotifications.schedule({ notifications: agendamentos });
  }
}

// Lembrete por suplemento — cada um pode ter seu próprio horário
// (ex: Vitamina D às 12h). Como a lista de suplementos é dinâmica
// (o usuário cadastra quantos quiser), reservamos uma faixa de 400
// ids (9500-9899) e derivamos um id fixo por suplemento a partir do
// seu UUID, pra sempre cancelar/reagendar o mesmo id certinho.
const BASE_ID_SUPLEMENTOS = 9500;
const FAIXA_ID_SUPLEMENTOS = 400;

function idNotifSuplemento(suplementoId) {
  let h = 0;
  for (let i = 0; i < suplementoId.length; i++) {
    h = (h * 31 + suplementoId.charCodeAt(i)) % FAIXA_ID_SUPLEMENTOS;
  }
  return BASE_ID_SUPLEMENTOS + h;
}

export async function agendarNotificacoesSuplementos(suplementos) {
  if (!Capacitor.isNativePlatform()) return;
  const { display } = await LocalNotifications.requestPermissions();
  if (display !== "granted") return;

  const todosIds = Array.from({ length: FAIXA_ID_SUPLEMENTOS }, (_, i) => ({
    id: BASE_ID_SUPLEMENTOS + i,
  }));
  await LocalNotifications.cancel({ notifications: todosIds });

  const comLembrete = suplementos.filter((s) => s.horario_lembrete);
  if (comLembrete.length === 0) return;

  const agendamentos = comLembrete.map((s) => {
    const [hora, minuto] = s.horario_lembrete.split(":").map(Number);
    return {
      id: idNotifSuplemento(s.id),
      title: `💊 ${s.nome}`,
      body: `Hora de tomar — ${s.dose}`,
      smallIcon: "ic_notification",
      schedule: {
        on: { hour: hora, minute: minuto || 0 },
        allowWhileIdle: true,
      },
    };
  });

  await LocalNotifications.schedule({ notifications: agendamentos });
}
