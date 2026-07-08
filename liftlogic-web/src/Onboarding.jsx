import React, { useState } from "react";
import { supabase } from "./lib/supabase";

const ETAPAS = [
  {
    icon: "👋",
    titulo: "Como você se chama?",
    sub: "Seu nome aparece no app e nos relatórios.",
  },
  {
    icon: "📏",
    titulo: "Suas medidas",
    sub: "Usadas para calcular TMB e metas. Pode pular e preencher depois.",
  },
  {
    icon: "🎯",
    titulo: "Qual seu objetivo?",
    sub: "Vamos ajustar suas metas de macros automaticamente.",
  },
];

export default function Onboarding({ user, onConcluir }) {
  const [etapa, setEtapa] = useState(1);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    peso: "",
    altura: "",
    data_nascimento: "",
    sexo: "M",
    objetivo: "manter",
  });

  const set = (campo, val) => setForm((p) => ({ ...p, [campo]: val }));
  const avancar = () => setEtapa((p) => p + 1);
  const voltar = () => setEtapa((p) => p - 1);

  const salvar = async () => {
    if (!form.nome.trim()) {
      alert("Digite seu nome!");
      return;
    }
    setSalvando(true);
    const { error } = await supabase.from("perfil").upsert(
      {
        user_id: user.id,
        nome: form.nome.trim(),
        peso: form.peso ? parseFloat(form.peso) : null,
        altura: form.altura ? parseFloat(form.altura) : null,
        idade: form.data_nascimento
          ? new Date().getFullYear() -
            new Date(form.data_nascimento).getFullYear()
          : null,
        data_nascimento: form.data_nascimento || null,
        sexo: form.sexo,
        objetivo: form.objetivo,
      },
      { onConflict: "user_id" },
    );
    if (error) {
      alert("Erro ao salvar: " + error.message);
      setSalvando(false);
      return;
    }
    setSalvando(false);
    onConcluir();
  };

  const btnOpcao = (ativo) => ({
    flex: 1,
    padding: "12px 8px",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    border: `1px solid ${ativo ? "#6366f1" : "#ffffff0d"}`,
    background: ativo ? "#6366f1" : "#1a1d21",
    color: ativo ? "#fff" : "#64748b",
    transition: "all 0.2s",
  });

  const etapaInfo = ETAPAS[etapa - 1];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0b0e",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes blobFloat {
          0%, 100% { transform: translate(0,0) scale(1); }
          50%       { transform: translate(20px, -20px) scale(1.08); }
        }
        @keyframes onboardIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes iconBounce {
          0%,100% { transform: scale(1) rotate(-4deg); }
          50%     { transform: scale(1.12) rotate(4deg); }
        }
      `}</style>

      {/* Blobs de fundo */}
      <div
        style={{
          position: "absolute",
          width: 360,
          height: 360,
          background: "#6366f1",
          borderRadius: "50%",
          filter: "blur(100px)",
          opacity: 0.1,
          top: -80,
          left: -80,
          animation: "blobFloat 7s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 280,
          height: 280,
          background: "#10b981",
          borderRadius: "50%",
          filter: "blur(90px)",
          opacity: 0.08,
          bottom: -60,
          right: -60,
          animation: "blobFloat 9s ease-in-out 3s infinite",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: 420,
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              fontSize: 52,
              marginBottom: 10,
              animation: "iconBounce 3s ease-in-out infinite",
              display: "inline-block",
            }}
          >
            ⚔️
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "#f8fafc",
              letterSpacing: "-0.5px",
            }}
          >
            DayForge
          </div>
          <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>
            Forje seu dia. Um tijolo por vez.
          </div>
        </div>

        {/* Barra de progresso */}
        <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              style={{
                flex: n === etapa ? 2 : 1,
                height: 4,
                borderRadius: 99,
                background:
                  etapa > n ? "#10b981" : etapa === n ? "#6366f1" : "#1e2126",
                transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
              }}
            />
          ))}
        </div>

        {/* Card da etapa */}
        <div
          key={etapa}
          style={{
            background: "rgba(26,29,33,0.9)",
            border: "1px solid #ffffff0d",
            borderRadius: 20,
            padding: "28px 24px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
            animation: "onboardIn 0.35s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {/* Ícone e título da etapa */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div
              style={{
                fontSize: 56,
                marginBottom: 12,
                lineHeight: 1,
                filter: "drop-shadow(0 4px 12px rgba(99,102,241,0.3))",
              }}
            >
              {etapaInfo.icon}
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#f8fafc",
                marginBottom: 6,
              }}
            >
              {etapaInfo.titulo}
            </div>
            <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
              {etapaInfo.sub}
            </div>
          </div>

          {/* Etapa 1 — Nome */}
          {etapa === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <input
                type="text"
                placeholder="Seu nome completo"
                value={form.nome}
                onChange={(e) => set("nome", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && form.nome.trim()) avancar();
                }}
                autoFocus
                style={{
                  width: "100%",
                  fontSize: 16,
                  textAlign: "center",
                  padding: "14px",
                }}
              />
              <button
                onClick={avancar}
                disabled={!form.nome.trim()}
                style={{
                  background: form.nome.trim()
                    ? "linear-gradient(135deg, #6366f1, #4f46e5)"
                    : "#1e2126",
                  border: "none",
                  borderRadius: 12,
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 700,
                  padding: 16,
                  cursor: form.nome.trim() ? "pointer" : "default",
                  opacity: form.nome.trim() ? 1 : 0.4,
                  boxShadow: form.nome.trim()
                    ? "0 4px 20px rgba(99,102,241,0.4)"
                    : "none",
                  transition: "all 0.2s",
                }}
              >
                Continuar →
              </button>
            </div>
          )}

          {/* Etapa 2 — Medidas */}
          {etapa === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      color: "#64748b",
                      fontWeight: 700,
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    PESO (kg)
                  </label>
                  <input
                    type="number"
                    placeholder="Ex: 80"
                    value={form.peso}
                    onChange={(e) => set("peso", e.target.value)}
                    style={{ width: "100%", textAlign: "center" }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      color: "#64748b",
                      fontWeight: 700,
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    ALTURA (cm)
                  </label>
                  <input
                    type="number"
                    placeholder="Ex: 175"
                    value={form.altura}
                    onChange={(e) => set("altura", e.target.value)}
                    style={{ width: "100%", textAlign: "center" }}
                  />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label
                    style={{
                      fontSize: 11,
                      color: "#64748b",
                      fontWeight: 700,
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    DATA DE NASCIMENTO
                  </label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 2fr 1fr",
                      gap: 8,
                    }}
                  >
                    <select
                      value={
                        form.data_nascimento
                          ? form.data_nascimento.split("-")[2]
                          : ""
                      }
                      onChange={(e) => {
                        const parts = (form.data_nascimento || "--").split("-");
                        const ano = parts[0] || new Date().getFullYear();
                        const mes = parts[1] || "01";
                        set(
                          "data_nascimento",
                          e.target.value
                            ? `${ano}-${mes}-${e.target.value.padStart(2, "0")}`
                            : "",
                        );
                      }}
                      style={{ textAlign: "center", colorScheme: "dark" }}
                    >
                      <option value="">Dia</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={String(d).padStart(2, "0")}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <select
                      value={
                        form.data_nascimento
                          ? form.data_nascimento.split("-")[1]
                          : ""
                      }
                      onChange={(e) => {
                        const parts = (form.data_nascimento || "--").split("-");
                        const ano = parts[0] || new Date().getFullYear();
                        const dia = parts[2] || "01";
                        set(
                          "data_nascimento",
                          e.target.value
                            ? `${ano}-${e.target.value}-${dia}`
                            : "",
                        );
                      }}
                      style={{ colorScheme: "dark" }}
                    >
                      <option value="">Mês</option>
                      {[
                        "Janeiro",
                        "Fevereiro",
                        "Março",
                        "Abril",
                        "Maio",
                        "Junho",
                        "Julho",
                        "Agosto",
                        "Setembro",
                        "Outubro",
                        "Novembro",
                        "Dezembro",
                      ].map((m, i) => (
                        <option key={i} value={String(i + 1).padStart(2, "0")}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <select
                      value={
                        form.data_nascimento
                          ? form.data_nascimento.split("-")[0]
                          : ""
                      }
                      onChange={(e) => {
                        const parts = (form.data_nascimento || "--").split("-");
                        const mes = parts[1] || "01";
                        const dia = parts[2] || "01";
                        set(
                          "data_nascimento",
                          e.target.value
                            ? `${e.target.value}-${mes}-${dia}`
                            : "",
                        );
                      }}
                      style={{ textAlign: "center", colorScheme: "dark" }}
                    >
                      <option value="">Ano</option>
                      {Array.from(
                        { length: 100 },
                        (_, i) => new Date().getFullYear() - i,
                      ).map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label
                    style={{
                      fontSize: 11,
                      color: "#64748b",
                      fontWeight: 700,
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    SEXO
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => set("sexo", "M")}
                      style={btnOpcao(form.sexo === "M")}
                    >
                      ♂ Masculino
                    </button>
                    <button
                      onClick={() => set("sexo", "F")}
                      style={btnOpcao(form.sexo === "F")}
                    >
                      ♀ Feminino
                    </button>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button
                  onClick={voltar}
                  style={{
                    background: "transparent",
                    border: "1px solid #ffffff1a",
                    borderRadius: 12,
                    color: "#64748b",
                    fontSize: 14,
                    fontWeight: 600,
                    padding: "14px 20px",
                    cursor: "pointer",
                  }}
                >
                  ← Voltar
                </button>
                <button
                  onClick={avancar}
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                    border: "none",
                    borderRadius: 12,
                    color: "#fff",
                    fontSize: 15,
                    fontWeight: 700,
                    padding: 14,
                    cursor: "pointer",
                    boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
                  }}
                >
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {/* Etapa 3 — Objetivo */}
          {etapa === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {[
                  {
                    id: "emagrecer",
                    emoji: "🔥",
                    label: "Emagrecer",
                    sub: "Déficit calórico, mais proteína",
                    cor: "#ef4444",
                  },
                  {
                    id: "manter",
                    emoji: "⚖️",
                    label: "Manter peso",
                    sub: "Equilíbrio e saúde geral",
                    cor: "#f59e0b",
                  },
                  {
                    id: "ganhar",
                    emoji: "💪",
                    label: "Ganhar massa",
                    sub: "Superávit calórico, mais carbo",
                    cor: "#10b981",
                  },
                ].map((o) => {
                  const ativo = form.objetivo === o.id;
                  return (
                    <button
                      key={o.id}
                      onClick={() => set("objetivo", o.id)}
                      style={{
                        background: ativo ? `${o.cor}15` : "#1a1d21",
                        border: `1px solid ${ativo ? o.cor + "66" : "#ffffff0d"}`,
                        borderRadius: 14,
                        padding: "16px 18px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        textAlign: "left",
                        transition: "all 0.2s",
                        transform: ativo ? "scale(1.02)" : "scale(1)",
                      }}
                    >
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 12,
                          background: ativo ? `${o.cor}22` : "#24282d",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 26,
                          flexShrink: 0,
                          border: `1px solid ${ativo ? o.cor + "44" : "transparent"}`,
                        }}
                      >
                        {o.emoji}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: ativo ? "#f8fafc" : "#94a3b8",
                          }}
                        >
                          {o.label}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#475569",
                            marginTop: 2,
                          }}
                        >
                          {o.sub}
                        </div>
                      </div>
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: ativo ? o.cor : "#24282d",
                          border: `2px solid ${ativo ? o.cor : "#ffffff1a"}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          color: "#fff",
                          flexShrink: 0,
                          transition: "all 0.2s",
                        }}
                      >
                        {ativo ? "✓" : ""}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button
                  onClick={voltar}
                  style={{
                    background: "transparent",
                    border: "1px solid #ffffff1a",
                    borderRadius: 12,
                    color: "#64748b",
                    fontSize: 14,
                    fontWeight: 600,
                    padding: "14px 20px",
                    cursor: "pointer",
                  }}
                >
                  ← Voltar
                </button>
                <button
                  onClick={salvar}
                  disabled={salvando}
                  style={{
                    flex: 1,
                    background: salvando
                      ? "#334155"
                      : "linear-gradient(135deg, #6366f1, #4f46e5)",
                    border: "none",
                    borderRadius: 12,
                    color: "#fff",
                    fontSize: 15,
                    fontWeight: 700,
                    padding: 14,
                    cursor: salvando ? "not-allowed" : "pointer",
                    boxShadow: salvando
                      ? "none"
                      : "0 4px 20px rgba(99,102,241,0.4)",
                    transition: "all 0.2s",
                  }}
                >
                  {salvando ? "Salvando..." : "🚀 Começar a Forjar"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: 20,
            fontSize: 12,
            color: "#334155",
          }}
        >
          Etapa {etapa} de 3
        </div>
      </div>
    </div>
  );
}
