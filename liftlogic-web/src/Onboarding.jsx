import React, { useState } from "react";
import { supabase } from "./lib/supabase";

export default function Onboarding({ user, onConcluir }) {
  const [etapa, setEtapa] = useState(1);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    peso: "",
    altura: "",
    idade: "",
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
        idade: form.idade ? parseInt(form.idade) : null,
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

  const btnStyle = (ativo) => ({
    flex: 1,
    padding: "10px 6px",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    border: `1px solid ${ativo ? "#6366f1" : "#ffffff0d"}`,
    background: ativo ? "#6366f1" : "#24282d",
    color: ativo ? "#fff" : "#64748b",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f1113",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 20px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚔️</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#f8fafc" }}>
            Bem-vindo ao DayForge
          </div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>
            Vamos configurar seu perfil em 3 passos
          </div>
        </div>

        {/* Barra de progresso */}
        <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 99,
                background: etapa >= n ? "#6366f1" : "#24282d",
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>

        {/* Etapa 1 — Nome */}
        {etapa === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#f8fafc",
                  marginBottom: 6,
                }}
              >
                Como você se chama?
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
                Seu nome vai aparecer no app e nos relatórios.
              </div>
              <input
                type="text"
                placeholder="Seu nome"
                value={form.nome}
                onChange={(e) => set("nome", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && form.nome.trim()) avancar();
                }}
                autoFocus
                style={{ width: "100%", fontSize: 16 }}
              />
            </div>
            <button
              onClick={avancar}
              disabled={!form.nome.trim()}
              style={{
                background: form.nome.trim() ? "#6366f1" : "#24282d",
                border: "none",
                borderRadius: 12,
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                padding: 14,
                cursor: form.nome.trim() ? "pointer" : "default",
                opacity: form.nome.trim() ? 1 : 0.5,
              }}
            >
              Continuar →
            </button>
          </div>
        )}

        {/* Etapa 2 — Medidas */}
        {etapa === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#f8fafc",
                  marginBottom: 6,
                }}
              >
                Suas medidas
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
                Usadas para calcular TMB e metas de macros. Pode pular e
                preencher depois.
              </div>
            </div>

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
                  style={{ width: "100%" }}
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
                  style={{ width: "100%" }}
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
                  IDADE
                </label>
                <input
                  type="number"
                  placeholder="Ex: 25"
                  value={form.idade}
                  onChange={(e) => set("idade", e.target.value)}
                  style={{ width: "100%" }}
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
                  SEXO
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => set("sexo", "M")}
                    style={btnStyle(form.sexo === "M")}
                  >
                    ♂ Masc
                  </button>
                  <button
                    onClick={() => set("sexo", "F")}
                    style={btnStyle(form.sexo === "F")}
                  >
                    ♀ Fem
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
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
                  background: "#6366f1",
                  border: "none",
                  borderRadius: 12,
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 700,
                  padding: 14,
                  cursor: "pointer",
                }}
              >
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* Etapa 3 — Objetivo */}
        {etapa === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#f8fafc",
                  marginBottom: 6,
                }}
              >
                Qual seu objetivo?
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
                Isso vai ajustar as metas de macros para você.
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                {
                  id: "emagrecer",
                  emoji: "🔥",
                  label: "Emagrecer",
                  sub: "Déficit calórico, mais proteína",
                },
                {
                  id: "manter",
                  emoji: "⚖️",
                  label: "Manter peso",
                  sub: "Equilíbrio e saúde geral",
                },
                {
                  id: "ganhar",
                  emoji: "💪",
                  label: "Ganhar massa",
                  sub: "Superávit calórico, mais carbo",
                },
              ].map((o) => (
                <button
                  key={o.id}
                  onClick={() => set("objetivo", o.id)}
                  style={{
                    background:
                      form.objetivo === o.id ? "#6366f122" : "#24282d",
                    border: `1px solid ${form.objetivo === o.id ? "#6366f1" : "#ffffff0d"}`,
                    borderRadius: 12,
                    padding: "14px 16px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: 26 }}>{o.emoji}</span>
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: form.objetivo === o.id ? "#f8fafc" : "#94a3b8",
                      }}
                    >
                      {o.label}
                    </div>
                    <div
                      style={{ fontSize: 11, color: "#475569", marginTop: 2 }}
                    >
                      {o.sub}
                    </div>
                  </div>
                  {form.objetivo === o.id && (
                    <span
                      style={{
                        marginLeft: "auto",
                        color: "#6366f1",
                        fontSize: 16,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
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
                  background: "#6366f1",
                  border: "none",
                  borderRadius: 12,
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 700,
                  padding: 14,
                  cursor: "pointer",
                  opacity: salvando ? 0.7 : 1,
                }}
              >
                {salvando ? "Salvando..." : "🚀 Começar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
