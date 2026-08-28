import React, { useState } from "react";
import { supabase } from "./lib/supabase";

function formatarData(date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().split("T")[0];
}

function calcularHoras(dormiu, acordou) {
  if (!dormiu || !acordou) return null;
  const [hD, mD] = dormiu.split(":").map(Number);
  const [hA, mA] = acordou.split(":").map(Number);
  let min = hA * 60 + mA - (hD * 60 + mD);
  if (min < 0) min += 24 * 60;
  return (min / 60).toFixed(1);
}

const PERIODOS = [
  { id: "hoje", label: "Hoje", icon: "📅" },
  { id: "semana", label: "Esta semana", icon: "📆" },
  { id: "mes", label: "Este mês", icon: "🗓️" },
];

const IAS = [
  { label: "ChatGPT", url: "https://chat.openai.com", icon: "🤖" },
  { label: "Gemini", url: "https://gemini.google.com", icon: "✨" },
  { label: "Claude", url: "https://claude.ai", icon: "🧠" },
];

export default function Coach({ user }) {
  const [periodo, setPeriodo] = useState("semana");
  const [dataCustom, setDataCustom] = useState(formatarData(new Date()));
  const [gerando, setGerando] = useState(false);
  const [prompt, setPrompt] = useState(null);
  const [copiado, setCopiado] = useState(false);

  const getRange = () => {
    const hoje = new Date();
    const fmt = (d) => formatarData(d);
    if (periodo === "hoje") {
      const s = fmt(hoje);
      return { inicio: s, fim: s, label: "hoje" };
    }
    if (periodo === "semana") {
      const d = new Date(hoje);
      d.setDate(d.getDate() - 6);
      return { inicio: fmt(d), fim: fmt(hoje), label: "nos últimos 7 dias" };
    }
    if (periodo === "mes") {
      const ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      return { inicio: fmt(ini), fim: fmt(hoje), label: "neste mês" };
    }
    return {
      inicio: dataCustom,
      fim: dataCustom,
      label: `em ${new Date(dataCustom + "T00:00:00").toLocaleDateString("pt-BR")}`,
    };
  };

  const gerar = async () => {
    setGerando(true);
    setPrompt(null);
    setCopiado(false);

    try {
      const { inicio, fim, label } = getRange();

      const [
        { data: perfil },
        { data: treinos },
        { data: cardio },
        { data: agua },
        { data: aguaMeta },
        { data: peso },
        { data: passos },
        { data: passosMeta },
        { data: sono },
        { data: macros },
        { data: macrosMeta },
        { data: humor },
        { data: habitos },
        { data: suplementos },
      ] = await Promise.all([
        supabase.from("perfil").select("*").eq("user_id", user.id).single(),
        supabase
          .from("treinos_finalizados")
          .select("*")
          .eq("user_id", user.id)
          .gte("created_at", inicio + "T00:00:00")
          .lte("created_at", fim + "T23:59:59"),
        supabase
          .from("cardio_registro")
          .select("*")
          .eq("user_id", user.id)
          .gte("data", inicio)
          .lte("data", fim),
        supabase
          .from("agua_registro")
          .select("*")
          .eq("user_id", user.id)
          .gte("data", inicio)
          .lte("data", fim),
        supabase
          .from("agua_meta")
          .select("meta_ml")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("peso_registro")
          .select("*")
          .eq("user_id", user.id)
          .gte("data", inicio)
          .lte("data", fim)
          .order("data", { ascending: true }),
        supabase
          .from("passos_registro")
          .select("*")
          .eq("user_id", user.id)
          .gte("data", inicio)
          .lte("data", fim),
        supabase
          .from("passos_meta")
          .select("meta_passos")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("sono_registro")
          .select("*")
          .eq("user_id", user.id)
          .gte("data", inicio)
          .lte("data", fim),
        supabase
          .from("macros_registro")
          .select("*")
          .eq("user_id", user.id)
          .gte("data", inicio)
          .lte("data", fim),
        supabase
          .from("macros_meta")
          .select("*")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("humor_registro")
          .select("*")
          .eq("user_id", user.id)
          .gte("data", inicio)
          .lte("data", fim),
        supabase
          .from("habitos_check")
          .select("*")
          .eq("user_id", user.id)
          .gte("data", inicio)
          .lte("data", fim),
        supabase.from("suplementos").select("nome").eq("user_id", user.id),
      ]);

      const { data: exerciciosAtuais } = await supabase
        .from("exercicio")
        .select("*")
        .eq("user_id", user.id);

      const totalExerciciosAtuais = (exerciciosAtuais || []).length;
      const exerciciosPiramide = (exerciciosAtuais || []).filter(
        (ex) =>
          (ex.reps_por_serie && ex.reps_por_serie.length > 0) ||
          (ex.carga_por_serie && ex.carga_por_serie.length > 0),
      );
      const descansosConfigurados = (exerciciosAtuais || [])
        .map((ex) => ex.descanso_segundos)
        .filter(Boolean);
      const descansoMin =
        descansosConfigurados.length > 0
          ? Math.min(...descansosConfigurados)
          : null;
      const descansoMax =
        descansosConfigurados.length > 0
          ? Math.max(...descansosConfigurados)
          : null;
      const ultimoTreinoPronto = localStorage.getItem(
        "df_ultimo_treino_pronto",
      );

      const metaAgua = aguaMeta?.meta_ml || 2500;
      const totalAgua = (agua || []).reduce((s, r) => s + r.ml, 0);
      const diasAgua = [...new Set((agua || []).map((r) => r.data))].length;
      const aguaPorDia = {};
      (agua || []).forEach((r) => {
        aguaPorDia[r.data] = (aguaPorDia[r.data] || 0) + r.ml;
      });
      const diasMetaAgua = Object.values(aguaPorDia).filter(
        (v) => v >= metaAgua,
      ).length;

      const metaPassos = passosMeta?.meta_passos || 10000;
      const totalPassos = (passos || []).reduce((s, r) => s + r.passos, 0);
      const diasMetaPassos = (passos || []).filter(
        (r) => r.passos >= metaPassos,
      ).length;

      const sonoRegs = sono || [];
      const mediaHorasSono =
        sonoRegs.length > 0
          ? (
              sonoRegs.reduce(
                (s, r) =>
                  s + parseFloat(calcularHoras(r.dormiu, r.acordou) || 0),
                0,
              ) / sonoRegs.length
            ).toFixed(1)
          : null;
      const qualidadeSono =
        sonoRegs.length > 0
          ? (
              sonoRegs.reduce((s, r) => s + r.qualidade, 0) / sonoRegs.length
            ).toFixed(1)
          : null;

      const macrosRegs = macros || [];
      const kcalPorDia = {};
      const protPorDia = {};
      macrosRegs.forEach((r) => {
        kcalPorDia[r.data] = (kcalPorDia[r.data] || 0) + r.kcal;
        protPorDia[r.data] = (protPorDia[r.data] || 0) + Number(r.prot);
      });
      const diasMacros = Object.keys(kcalPorDia);
      const mediaKcal =
        diasMacros.length > 0
          ? Math.round(
              Object.values(kcalPorDia).reduce((s, v) => s + v, 0) /
                diasMacros.length,
            )
          : null;
      const mediaProt =
        diasMacros.length > 0
          ? (
              Object.values(protPorDia).reduce((s, v) => s + v, 0) /
              diasMacros.length
            ).toFixed(1)
          : null;

      const humorRegs = (humor || []).filter((r) => r.humor);
      const energiaRegs = (humor || []).filter((r) => r.energia);
      const mediaHumor =
        humorRegs.length > 0
          ? (
              humorRegs.reduce((s, r) => s + r.humor, 0) / humorRegs.length
            ).toFixed(1)
          : null;
      const mediaEnergia =
        energiaRegs.length > 0
          ? (
              energiaRegs.reduce((s, r) => s + r.energia, 0) /
              energiaRegs.length
            ).toFixed(1)
          : null;

      const habitosFeitos = (habitos || []).filter((r) => r.concluido).length;
      const totalHabitos = (habitos || []).length;
      const pesoInicio = peso?.[0] ? Number(peso[0].peso) : null;
      const pesoFim =
        peso?.length > 0 ? Number(peso[peso.length - 1].peso) : null;

      const p = `Você é um personal trainer e coach de saúde especializado. Analise os dados reais do meu app de saúde e me dê uma análise personalizada, direta e motivadora em português brasileiro.

## MEU PERFIL
- Nome: ${perfil?.nome || "Usuário"}
- Peso: ${perfil?.peso || "?"}kg | Altura: ${perfil?.altura || "?"}cm | Idade: ${perfil?.idade || "?"} anos
- Sexo: ${perfil?.sexo === "M" ? "Masculino" : "Feminino"}
- Objetivo: ${perfil?.objetivo === "emagrecer" ? "Emagrecer" : perfil?.objetivo === "ganhar" ? "Ganhar massa" : "Manter peso"}
${perfil?.sobre_mim ? `- Contexto pessoal: ${perfil.sobre_mim}` : ""}

## PERÍODO ANALISADO: ${label.toUpperCase()}

## TREINOS
- Total: ${(treinos || []).length} treinos
- Divisões: ${[...new Set((treinos || []).map((t) => t.treino))].join(", ") || "nenhuma"}
- Tempo total: ${Math.round((treinos || []).reduce((s, t) => s + (t.tempo_segundos || 0), 0) / 60)} minutos
- Kcal queimadas: ${(treinos || []).reduce((s, t) => s + (t.kcal || 0), 0)} kcal
- Volume total: ${(treinos || []).reduce((s, t) => s + (t.volume_total || 0), 0).toLocaleString("pt-BR")} kg
- Ficha atual: ${totalExerciciosAtuais} exercícios cadastrados${ultimoTreinoPronto ? `, baseada em "${ultimoTreinoPronto}"` : ""}
- Exercícios em pirâmide (reps/carga variam por série): ${exerciciosPiramide.length > 0 ? exerciciosPiramide.map((ex) => ex.nome).join(", ") : "nenhum"}
- Descanso configurado entre séries: ${descansoMin !== null ? `${descansoMin}s a ${descansoMax}s` : "não configurado"}

## CARDIO
- Sessões: ${(cardio || []).length}
- Tipos: ${[...new Set((cardio || []).map((r) => r.tipo))].join(", ") || "nenhum"}
- Tempo: ${(cardio || []).reduce((s, r) => s + r.duracao_min, 0)} minutos
- Kcal: ${(cardio || []).reduce((s, r) => s + (r.kcal || 0), 0)} kcal

## HIDRATAÇÃO
- Meta: ${(metaAgua / 1000).toFixed(1)}L/dia
- Total consumido: ${(totalAgua / 1000).toFixed(1)}L
- Dias que bati a meta: ${diasMetaAgua} de ${diasAgua} dias

## SONO
${
  mediaHorasSono
    ? `- Média: ${mediaHorasSono}h/noite\n- Qualidade média: ${qualidadeSono}/5\n- Noites registradas: ${sonoRegs.length}`
    : "- Sem registros no período"
}

## NUTRIÇÃO
${
  mediaKcal
    ? `- Kcal média/dia: ${mediaKcal}${macrosMeta?.meta_kcal ? ` (meta: ${macrosMeta.meta_kcal})` : ""}\n- Proteína média: ${mediaProt}g/dia\n- Dias registrados: ${diasMacros.length}`
    : "- Sem registros no período"
}

## PASSOS
- Total: ${totalPassos.toLocaleString("pt-BR")} passos
- Meta diária: ${metaPassos.toLocaleString("pt-BR")}
- Dias que bati a meta: ${diasMetaPassos} de ${(passos || []).length}

## HUMOR E ENERGIA
${
  mediaHumor
    ? `- Humor médio: ${mediaHumor}/5\n- Energia média: ${mediaEnergia}/5`
    : "- Sem registros no período"
}

## HÁBITOS
- Check-ins concluídos: ${habitosFeitos} de ${totalHabitos}

## PESO
${
  pesoInicio
    ? `- Início do período: ${pesoInicio}kg\n- Fim do período: ${pesoFim}kg\n- Variação: ${(pesoFim - pesoInicio).toFixed(1)}kg`
    : "- Sem registros no período"
}

## SUPLEMENTOS EM USO
${(suplementos || []).map((s) => `- ${s.nome}`).join("\n") || "- Nenhum cadastrado"}

---

Com base nesses dados reais, me dê uma análise completa com:

1. **Resumo geral** — como foi meu período em poucas palavras
2. **Pontos positivos** — onde fui bem (cite os números)
3. **Pontos de atenção** — onde estou falhando e por quê importa (máx 3)
4. **Recomendações práticas** — o que fazer nos próximos dias (máx 3, seja específico)
5. **Mensagem motivacional** — curta, direta e personalizada pra mim

Seja direto, use os números reais, evite respostas genéricas.`;

      setPrompt(p);
    } catch (e) {
      console.error(e);
    }

    setGerando(false);
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      const el = document.createElement("textarea");
      el.value = prompt;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        paddingBottom: 80,
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", padding: "20px 0 8px" }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>🤖</div>
        <h2 className="title-divisao" style={{ margin: 0 }}>
          DayForge Coach
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "#64748b",
            marginTop: 6,
            lineHeight: 1.5,
          }}
        >
          Gera um relatório completo com seus dados para você analisar com
          qualquer IA
        </p>
      </div>

      {/* Como funciona */}
      <div
        style={{
          background: "#6366f110",
          border: "1px solid #6366f133",
          borderRadius: 14,
          padding: 14,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: "#818cf8",
            fontWeight: 800,
            letterSpacing: "0.06em",
            marginBottom: 10,
          }}
        >
          COMO FUNCIONA
        </div>
        {[
          "1️⃣  Escolha o período que quer analisar",
          "2️⃣  Clique em Gerar Relatório",
          "3️⃣  Copie o prompt gerado",
          "4️⃣  Cole em qualquer IA gratuita (ChatGPT, Gemini, Claude...)",
        ].map((s, i) => (
          <div
            key={i}
            style={{ fontSize: 13, color: "#94a3b8", marginBottom: 5 }}
          >
            {s}
          </div>
        ))}
      </div>

      {/* Período */}
      <div
        style={{
          background: "#1a1d21",
          border: "1px solid #ffffff0d",
          borderRadius: 16,
          padding: 16,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: "#64748b",
            fontWeight: 800,
            letterSpacing: "0.08em",
            marginBottom: 12,
          }}
        >
          PERÍODO DA ANÁLISE
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {PERIODOS.map((p) => {
            const sel = periodo === p.id;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setPeriodo(p.id);
                  setPrompt(null);
                }}
                style={{
                  flex: 1,
                  background: sel ? "#6366f122" : "#24282d",
                  border: `1px solid ${sel ? "#6366f1" : "#ffffff0d"}`,
                  borderRadius: 12,
                  padding: "10px 4px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 16 }}>{p.icon}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: sel ? "#818cf8" : "#64748b",
                  }}
                >
                  {p.label}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ borderTop: "1px solid #ffffff0d", paddingTop: 14 }}>
          <div
            style={{
              fontSize: 11,
              color: "#64748b",
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            📅 OU ESCOLHA UM DIA ESPECÍFICO
          </div>
          <input
            type="date"
            value={dataCustom}
            max={formatarData(new Date())}
            onChange={(e) => {
              setDataCustom(e.target.value);
              setPeriodo("custom");
              setPrompt(null);
            }}
            style={{ width: "100%", colorScheme: "dark" }}
          />
          {periodo === "custom" && (
            <div style={{ fontSize: 11, color: "#6366f1", marginTop: 6 }}>
              ✓{" "}
              {new Date(dataCustom + "T00:00:00").toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })}
            </div>
          )}
        </div>
      </div>

      {/* Botão gerar */}
      <button
        onClick={gerar}
        disabled={gerando}
        style={{
          background: gerando
            ? "#334155"
            : "linear-gradient(135deg, #6366f1, #4f46e5)",
          border: "none",
          borderRadius: 14,
          color: "#fff",
          fontSize: 16,
          fontWeight: 700,
          padding: 16,
          cursor: gerando ? "not-allowed" : "pointer",
          boxShadow: gerando ? "none" : "0 4px 20px rgba(99,102,241,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
      >
        {gerando ? "⏳ Coletando seus dados..." : "📋 Gerar Relatório"}
      </button>

      {/* Prompt gerado */}
      {prompt && (
        <div
          style={{
            background: "#1a1d21",
            border: "1px solid #6366f133",
            borderRadius: 16,
            padding: 20,
          }}
        >
          {copiado && (
            <div
              style={{
                background: "#10b98122",
                border: "1px solid #10b98144",
                borderRadius: 10,
                padding: "10px 14px",
                marginBottom: 12,
                fontSize: 13,
                color: "#10b981",
                fontWeight: 700,
                textAlign: "center",
              }}
            >
              ✅ Relatório copiado! Agora cole em qualquer IA abaixo.
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#f8fafc" }}>
                ✅ Relatório gerado!
              </div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                Copie e cole em qualquer IA
              </div>
            </div>
            <button
              onClick={copiar}
              style={{
                background: copiado ? "#10b981" : "#6366f1",
                border: "none",
                borderRadius: 10,
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                padding: "8px 16px",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
            >
              {copiado ? "✓ Copiado!" : "📋 Copiar"}
            </button>
          </div>

          {/* Preview resumido */}
          <div
            style={{
              background: "#24282d",
              borderRadius: 10,
              padding: 12,
              marginBottom: 14,
              maxHeight: 180,
              overflowY: "auto",
            }}
          >
            <pre
              style={{
                fontSize: 10,
                color: "#475569",
                margin: 0,
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
              }}
            >
              {prompt.slice(0, 600)}...
            </pre>
          </div>

          {/* Links para IAs */}
          <div
            style={{
              fontSize: 10,
              color: "#64748b",
              fontWeight: 800,
              letterSpacing: "0.06em",
              marginBottom: 10,
            }}
          >
            ABRIR EM
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {IAS.map((ia) => (
              <a
                key={ia.label}
                href={ia.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  background: "#24282d",
                  border: "1px solid #ffffff0d",
                  borderRadius: 10,
                  padding: "10px 4px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  textDecoration: "none",
                }}
              >
                <span style={{ fontSize: 20 }}>{ia.icon}</span>
                <span
                  style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}
                >
                  {ia.label}
                </span>
              </a>
            ))}
          </div>

          <div
            style={{
              fontSize: 11,
              color: "#334155",
              marginTop: 12,
              textAlign: "center",
            }}
          >
            Copie o relatório → abra a IA → cole e envie
          </div>
        </div>
      )}
    </div>
  );
}
