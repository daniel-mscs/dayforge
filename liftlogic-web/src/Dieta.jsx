import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";
import { agendarNotificacoesDieta } from "./lib/notifications";

const REFEICOES = [
  {
    id: "cafe",
    label: "☀️ Café da manhã",
    horaDe: 5,
    horeAte: 9,
    placeholder: "Ex: 3 ovos mexidos\n1 banana\ncafé preto",
  },
  {
    id: "lanche1",
    label: "🍎 Lanche da manhã",
    horaDe: 10,
    horeAte: 11,
    placeholder: "Ex: 50g de aveia\n30g de leite em pó",
  },
  {
    id: "almoco",
    label: "🍽️ Almoço",
    horaDe: 12,
    horeAte: 13,
    placeholder: "Ex: 120g de arroz\n200g de frango grelhado\nsalada à vontade",
  },
  {
    id: "cafetarde",
    label: "☕ Café da tarde",
    horaDe: 14,
    horeAte: 17,
    placeholder: "Ex: 1 ovo cozido\ncafé preto",
  },
  {
    id: "janta",
    label: "🌙 Janta",
    horaDe: 18,
    horeAte: 22,
    placeholder: "Ex: 120g de frango desfiado\n120g de arroz\nfeijão",
  },
];

export default function Dieta({ user, compact = false, onAjuda }) {
  const [plano, setPlano] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [showSugestao, setShowSugestao] = useState(false);
  const [mostrarTooltip, setMostrarTooltip] = useState(false);
  const [objetivo, setObjetivo] = useState("emagrecer");
  const [renda, setRenda] = useState("baixa");
  const [perfil, setPerfil] = useState(null);
  const [editandoRefeicao, setEditandoRefeicao] = useState(null);

  const buscarDieta = useCallback(async () => {
    setCarregando(true);
    const [{ data }, { data: perfilData }] = await Promise.all([
      supabase.from("dieta_plano").select("*").eq("user_id", user.id),
      supabase
        .from("perfil")
        .select("peso")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    if (perfilData) setPerfil(perfilData);
    const mapa = {};
    (data || []).forEach((r) => {
      mapa[r.refeicao] = r.conteudo;
    });
    setPlano(mapa);
    setCarregando(false);
    agendarNotificacoesDieta(REFEICOES, mapa);
  }, [user.id]);

  useEffect(() => {
    buscarDieta();
  }, [buscarDieta]);

  const salvarRefeicao = async (refeicaoId, conteudo) => {
    setSalvando(true);
    await supabase.from("dieta_plano").upsert(
      {
        user_id: user.id,
        refeicao: refeicaoId,
        conteudo,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,refeicao" },
    );
    setPlano((prev) => {
      const novo = { ...prev, [refeicaoId]: conteudo };
      agendarNotificacoesDieta(REFEICOES, novo);
      return novo;
    });
    setSalvando(false);
  };

  const KCAL_DIETAS = {
    emagrecer: { baixa: 1600, media: 1800, alta: 2000 },
    manter: { baixa: 2000, media: 2200, alta: 2500 },
    massa: { baixa: 2500, media: 2800, alta: 3200 },
  };

  const DIETAS = {
    emagrecer: {
      baixa: {
        cafe: "3 ovos mexidos\ncafé preto sem açúcar\n1 fruta (banana ou maçã)",
        lanche1: "1 ovo cozido\n1 fruta",
        almoco:
          "120g de arroz\nfeijão à vontade\n150g de frango grelhado\nsalada verde à vontade",
        cafetarde: "café preto\n1 ovo cozido",
        janta: "150g de frango desfiado\nlegumes refogados\nsalada",
      },
      media: {
        cafe: "3 ovos mexidos\n30g de aveia\n1 banana\ncafé preto",
        lanche1: "200g de iogurte grego\n1 fruta",
        almoco:
          "120g de arroz integral\n150g de frango grelhado\nsalada à vontade\nfeijão",
        cafetarde: "1 scoop de whey com água\n1 fruta",
        janta: "150g de patinho moído\nlegumes no vapor\nsalada",
      },
      alta: {
        cafe: "3 ovos mexidos\n40g de aveia\n1 banana\ncafé preto\n1 scoop de whey",
        lanche1: "200g de iogurte grego\n30g de granola sem açúcar\n1 fruta",
        almoco:
          "150g de arroz integral\n200g de frango grelhado\nsalada à vontade\n1 batata doce média",
        cafetarde: "1 scoop de whey\n1 punhado de castanhas",
        janta: "200g de salmão grelhado\nlegumes no vapor\nsalada verde",
      },
    },
    manter: {
      baixa: {
        cafe: "3 ovos mexidos\n2 fatias de pão integral\ncafé preto\n1 fruta",
        lanche1: "1 fruta\n1 ovo cozido",
        almoco: "150g de arroz\nfeijão\n150g de frango\nsalada\n1 fruta",
        cafetarde: "café com leite\n2 torradas integrais",
        janta: "150g de carne moída\n120g de arroz\nlegumes refogados",
      },
      media: {
        cafe: "3 ovos mexidos\n40g de aveia\n1 banana\ncafé preto",
        lanche1: "200g de iogurte grego\n1 fruta",
        almoco: "150g de arroz integral\n180g de frango\nfeijão\nsalada",
        cafetarde: "1 scoop de whey\n1 fruta",
        janta: "180g de patinho\nlegumes\n100g de arroz",
      },
      alta: {
        cafe: "4 ovos mexidos\n50g de aveia\n1 banana\ncafé preto\n1 scoop de whey",
        lanche1: "200g de iogurte grego\n30g de granola\n1 fruta",
        almoco:
          "180g de arroz integral\n200g de frango\nfeijão\nsalada\n1 batata doce",
        cafetarde: "1 scoop de whey\n30g de castanhas",
        janta: "200g de filé de peixe\nlegumes\n100g de arroz integral",
      },
    },
    massa: {
      baixa: {
        cafe: "4 ovos mexidos\n2 fatias de pão integral\n1 banana\ncafé preto",
        lanche1: "2 ovos cozidos\n1 banana\n2 fatias de pão integral",
        almoco:
          "200g de arroz\nfeijão\n200g de frango grelhado\nsalada\n1 batata cozida",
        cafetarde: "3 ovos cozidos\n1 banana\n2 fatias de pão",
        janta: "200g de carne vermelha\n150g de arroz\nlegumes refogados",
      },
      media: {
        cafe: "4 ovos mexidos\n60g de aveia\n1 banana\ncafé preto\n1 scoop de whey",
        lanche1: "1 scoop de whey\n1 banana\n30g de amendoim",
        almoco:
          "200g de arroz integral\n250g de frango\nfeijão\nsalada\n1 batata doce",
        cafetarde: "1 scoop de whey\n1 banana\n30g de amendoim",
        janta: "250g de patinho\n150g de arroz integral\nlegumes",
      },
      alta: {
        cafe: "5 ovos mexidos\n80g de aveia\n2 bananas\ncafé preto\n1 scoop de whey",
        lanche1: "2 scoops de whey\n1 banana\n40g de castanhas",
        almoco:
          "250g de arroz integral\n300g de frango grelhado\nfeijão\nsalada\n2 batatas doce",
        cafetarde: "2 scoops de whey\n40g de castanhas\n1 banana",
        janta:
          "300g de picanha ou filé mignon\n200g de arroz integral\nlegumes no vapor",
      },
    },
  };

  const aplicarDieta = async () => {
    const dieta = DIETAS[objetivo][renda];
    const updates = Object.entries(dieta).map(([refeicao, conteudo]) =>
      supabase.from("dieta_plano").upsert(
        {
          user_id: user.id,
          refeicao,
          conteudo,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,refeicao" },
      ),
    );
    await Promise.all(updates);
    setPlano((prev) => ({ ...prev, ...dieta }));
    setShowSugestao(false);
  };

  const refeicaoAtual = () => {
    const hora = new Date().getHours();
    return REFEICOES.find((r) => hora >= r.horaDe && hora <= r.horeAte) || null;
  };

  if (carregando)
    return (
      <div style={{ textAlign: "center", color: "#64748b", paddingTop: 20 }}>
        Carregando seu plano alimentar... 🥗
      </div>
    );

  // MODO COMPACTO — home mostra só refeição atual
  if (compact) {
    const atual = refeicaoAtual();
    if (!atual) return null;
    const conteudo = plano[atual.id]?.trim();
    if (!conteudo) return null;
    const linhas = conteudo.split("\n").filter((l) => l.trim());
    return (
      <div className="dieta-compact">
        <div className="dieta-compact-label">{atual.label}</div>
        {linhas.map((l, i) => (
          <div key={i} className="dieta-compact-item">
            · {l.trim()}
          </div>
        ))}
      </div>
    );
  }

  // MODO COMPLETO
  return (
    <div className="dieta-section">
      <div className="dieta-header">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h2 className="title-divisao" style={{ margin: 0 }}>
            🥗 Plano Alimentar
          </h2>
          <div style={{ position: "relative" }}>
            <button
              className="ajuda-shortcut-btn"
              onClick={() => setMostrarTooltip((v) => !v)}
            >
              ?
            </button>
            {mostrarTooltip && (
              <div
                onClick={() => setMostrarTooltip(false)}
                style={{ position: "fixed", inset: 0, zIndex: 998 }}
              />
            )}
            {mostrarTooltip && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: 36,
                  zIndex: 999,
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: 14,
                  padding: "16px 18px",
                  width: 280,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#f8fafc",
                    marginBottom: 10,
                  }}
                >
                  🥗 Como usar
                </div>
                {[
                  {
                    icon: "✏️",
                    text: "Edite cada refeição diretamente no campo de texto. Salva automaticamente quando você sai do campo.",
                  },
                  {
                    icon: "✨",
                    text: "Use a sugestão automática para gerar um plano completo baseado no seu objetivo e renda.",
                  },
                  {
                    icon: "🏠",
                    text: "A refeição do horário atual aparece automaticamente na Home.",
                  },
                  {
                    icon: "⏰",
                    text: "Cada refeição tem um horário sugerido — café (5-9h), almoço (12-13h), janta (18-22h), etc.",
                  },
                  {
                    icon: "⚠️",
                    text: "A sugestão automática substitui o plano atual. Você pode editar qualquer item depois.",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 10,
                      marginBottom: 8,
                      alignItems: "flex-start",
                    }}
                  >
                    <span style={{ fontSize: 14, flexShrink: 0 }}>
                      {item.icon}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: "#94a3b8",
                        lineHeight: 1.5,
                      }}
                    >
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {salvando && (
          <span style={{ fontSize: 12, color: "#64748b" }}>Salvando...</span>
        )}
      </div>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
        Monte seu plano alimentar. A refeição do horário atual aparece na Home.
      </p>

      <button
        className="dieta-btn-sugestao"
        onClick={() => setShowSugestao(!showSugestao)}
      >
        ✨ Sugestão de dieta automática
      </button>

      {showSugestao && (
        <div className="dieta-sugestao-card">
          <div className="dieta-sugestao-title">Gerar plano alimentar</div>
          <div className="dieta-sugestao-group">
            <div className="dieta-sugestao-label">Objetivo</div>
            <div className="dieta-sugestao-opts">
              {[
                { id: "emagrecer", label: "Emagrecer" },
                { id: "manter", label: "Manter peso" },
                { id: "massa", label: "Ganhar massa" },
              ].map((o) => (
                <button
                  key={o.id}
                  className={`dieta-sugestao-opt ${objetivo === o.id ? "active" : ""}`}
                  onClick={() => setObjetivo(o.id)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="dieta-sugestao-group">
            <div className="dieta-sugestao-label">Renda financeira</div>
            <div className="dieta-sugestao-opts">
              {[
                { id: "baixa", label: "💰 Baixa" },
                { id: "media", label: "💰💰 Média" },
                { id: "alta", label: "💰💰💰 Alta" },
              ].map((r) => (
                <button
                  key={r.id}
                  className={`dieta-sugestao-opt ${renda === r.id ? "active" : ""}`}
                  onClick={() => setRenda(r.id)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div
            style={{
              background: "#24282d",
              borderRadius: 10,
              padding: "10px 14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 12, color: "#64748b" }}>
              Kcal estimadas
            </span>
            <strong style={{ fontSize: 16, color: "#f59e0b" }}>
              ~{KCAL_DIETAS[objetivo][renda].toLocaleString("pt-BR")} kcal/dia
            </strong>
          </div>
          <p style={{ fontSize: 11, color: "#475569", margin: "4px 0" }}>
            ⚠️ Isso vai substituir seu plano atual. Você pode editar depois.
          </p>
          <button className="dieta-btn-aplicar" onClick={aplicarDieta}>
            Aplicar dieta
          </button>
        </div>
      )}

      {REFEICOES.map((r) => {
        const hora = new Date().getHours();
        const isAtual = hora >= r.horaDe && hora <= r.horeAte;
        const conteudo = (plano[r.id] || "").trim();
        const itens = conteudo
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        const emEdicao = editandoRefeicao === r.id;
        return (
          <div key={r.id} className={`dieta-card ${isAtual ? "atual" : ""}`}>
            <div className="dieta-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="dieta-card-label">{r.label}</div>
                {isAtual && <span className="dieta-card-badge">Agora</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="dieta-card-horario">
                  {r.horaDe}h – {r.horeAte}h
                </div>
                <button
                  onClick={() => setEditandoRefeicao(emEdicao ? null : r.id)}
                  style={{
                    background: "none",
                    border: "1px solid #ffffff0d",
                    borderRadius: 8,
                    color: emEdicao ? "#6366f1" : "#64748b",
                    fontSize: 11,
                    padding: "3px 8px",
                    cursor: "pointer",
                  }}
                >
                  {emEdicao ? "✓ Pronto" : "✏️ Editar"}
                </button>
              </div>
            </div>
            {emEdicao ? (
              <textarea
                className="dieta-textarea"
                placeholder={r.placeholder}
                value={plano[r.id] || ""}
                rows={4}
                autoFocus
                onChange={(e) =>
                  setPlano((prev) => ({ ...prev, [r.id]: e.target.value }))
                }
                onBlur={(e) => salvarRefeicao(r.id, e.target.value)}
              />
            ) : itens.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  padding: "4px 2px",
                }}
              >
                {itens.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 8,
                      fontSize: 14,
                      color: "#e2e8f0",
                      lineHeight: 1.4,
                    }}
                  >
                    <span style={{ color: "#6366f1", flexShrink: 0 }}>•</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div
                onClick={() => setEditandoRefeicao(r.id)}
                style={{
                  fontSize: 13,
                  color: "#475569",
                  padding: "8px 2px",
                  cursor: "pointer",
                }}
              >
                Toque em "Editar" pra cadastrar essa refeição
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
