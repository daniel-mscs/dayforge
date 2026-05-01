import React, { useState, useEffect } from "react";



const STEPS = [
  {
    title: "👋 Bem-vindo ao DayForge!",
    desc: "Seu super app de saúde e performance. Vamos te mostrar tudo em poucos passos!",
    destaque: null,
  },
  {
    title: "🏠 Home — visão geral do dia",
    desc: "Acompanhe água, peso, kcal, tarefas da rotina, hábitos e humor. Tudo personalizável e arrastável.",
    destaque: "home",
  },
  {
    title: "🏋️ Treino",
    desc: "Registre exercícios com timer, descanso cronometrado, histórico de volume, carga e cardio.",
    destaque: "treino",
  },
  {
    title: "📋 Rotina",
    desc: "Crie sua rotina com tarefas por período: Acordar, Manhã, Tarde e Noite. Navegue por meses no calendário.",
    destaque: "rotina",
  },
  {
    title: "🗃️ Mais — água, macros, sono…",
    desc: "Acesse Água, Peso, Dieta, Macros, Suplementos, Passos, Sono, Stats, SmartPocket e RPG.",
    destaque: "mais",
  },
  {
    title: "👤 Perfil & configurações",
    desc: "Configure seu nome, peso, altura, idade e objetivo. Ative notificações e veja seu IMC e TMB.",
    destaque: "perfil",
  },
  {
    title: "✅ Tudo pronto, forjador!",
    desc: "Agora é só começar. Quer aprender cada funcionalidade em detalhes? A aba Ajuda tem tudo explicado passo a passo.",
    destaque: null,
    final: true,
  },
];



export default function Tour({ onFechar, onNavegar }) {
  const [step, setStep] = useState(0);
  const [saindo, setSaindo] = useState(false);

  const fechar = (navAjuda = false) => {
    setSaindo(true);
    setTimeout(() => {
      onFechar();
      if (navAjuda && onNavegar) {
        onNavegar("perfil");
      }
    }, 300);
  };

  const proximo = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      fechar(false);
      if (onNavegar) onNavegar("home");
    }
  };

  const s = STEPS[step];
  const isUltimo = step === STEPS.length - 1;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.78)",
        zIndex: 9000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "0 0 100px",
        animation: saindo ? "tourFadeOut 0.3s ease forwards" : "tourFadeIn 0.3s ease",
      }}
      onClick={() => fechar(false)}
    >
      <style>{`
        @keyframes tourFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes tourFadeOut { from{opacity:1} to{opacity:0} }
        @keyframes tourSlideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes tourPulse { 0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0.4)} 50%{box-shadow:0 0 0 6px rgba(99,102,241,0)} }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1e2126",
          border: "1px solid #6366f1",
          borderRadius: 20,
          padding: "24px 22px 20px",
          width: "calc(100% - 32px)",
          maxWidth: 460,
          animation: "tourSlideUp 0.3s ease",
          boxShadow: "0 8px 40px rgba(99,102,241,0.25)",
        }}
      >
        {/* Progresso */}
        <div style={{ display: "flex", gap: 4, marginBottom: 18 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              flex: i === step ? 2 : 1,
              height: 3,
              borderRadius: 99,
              background: i <= step ? "#6366f1" : "#334155",
              transition: "all 0.3s",
            }} />
          ))}
        </div>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#f8fafc", lineHeight: 1.3, flex: 1, paddingRight: 12 }}>
            {s.title}
          </div>
          <button onClick={() => fechar(false)} style={{ background: "none", border: "none", color: "#475569", fontSize: 22, cursor: "pointer", padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
        </div>

        {/* Descrição */}
        <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6, marginBottom: 16 }}>
          {s.desc}
        </div>

        {/* Ícones de destaque */}
        {s.destaque && (
          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {getIcones(s.destaque).map((ic, i) => (
              <div key={i} style={{
                background: "#24282d",
                border: "1px solid #6366f144",
                borderRadius: 8,
                padding: "5px 10px",
                fontSize: 11,
                color: "#818cf8",
                fontWeight: 600,
                animation: `tourPulse 2s ease ${i * 0.15}s infinite`,
              }}>
                {ic}
              </div>
            ))}
          </div>
        )}

        {/* Card final — botão Ajuda */}
        {isUltimo && (
          <button
            onClick={() => fechar(true)}
            style={{
              width: "100%",
              background: "#6366f115",
              border: "1px dashed #6366f155",
              borderRadius: 12,
              color: "#818cf8",
              fontSize: 13,
              fontWeight: 600,
              padding: "12px 16px",
              cursor: "pointer",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.15s",
            }}
          >
            ❓ Abrir aba Ajuda — guia completo do app
          </button>
        )}

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 11, color: "#475569" }}>
            {step + 1} / {STEPS.length}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => fechar(false)} style={{ background: "none", border: "none", color: "#475569", fontSize: 12, cursor: "pointer", padding: "6px 4px" }}>
              Pular
            </button>
            <button
              onClick={proximo}
              style={{
                background: "#6366f1",
                border: "none",
                borderRadius: 10,
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                padding: "10px 18px",
                cursor: "pointer",
              }}
            >
              {isUltimo ? "✓ Começar" : "Próximo →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getIcones(destaque) {
  const map = {
    home:   ["🏠 Saudação", "💧 Água", "⚖️ Peso", "🔥 Kcal", "✅ Tarefas", "😄 Humor"],
    treino: ["⏱️ Timer", "🏋️ Exercícios", "📊 Stats", "📜 Histórico", "🏃 Cardio"],
    rotina: ["📋 Tarefas", "🗓️ Calendário", "☀️ Períodos", "⧉ Clonar dias"],
    mais:   ["💧 Água", "⚖️ Peso", "🍽️ Macros", "💊 Suplementos", "👟 Passos", "😴 Sono", "📊 Stats"],
    perfil: ["👤 Dados", "📏 Medidas", "🎯 Objetivo", "🔔 Alertas", "⚔️ RPG"],
  };
  return map[destaque] || [];
}