import React, { useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "./lib/supabase";
import { toast } from "./lib/toast";
import { Plus, X, Droplet, Scale, Banknote } from "lucide-react";

function formatarData(date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().split("T")[0];
}

const OPCOES = [
  { id: "agua", icon: Droplet, label: "Água", cor: "#3b82f6" },
  { id: "peso", icon: Scale, label: "Peso", cor: "#6366f1" },
  { id: "gasto", icon: Banknote, label: "Gasto", cor: "#ef4444" },
];

export default function RegistroRapido({ user, onRegistrado }) {
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState(null);
  const [valor, setValor] = useState("");
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);

  const fechar = () => {
    setAberto(false);
    setTipo(null);
    setValor("");
    setNome("");
  };

  const registrarAgua = async (ml) => {
    setSalvando(true);
    const agora = new Date();
    const hoje = formatarData(agora);
    const hora = agora.toTimeString().slice(0, 5);
    const { error } = await supabase
      .from("agua_registro")
      .insert([{ user_id: user.id, data: hoje, ml, hora }]);
    setSalvando(false);
    if (error) return toast(error.message, "error");
    toast(`+${ml}ml registrado!`, "success");
    onRegistrado?.();
    fechar();
  };

  const registrarPeso = async () => {
    if (!valor) return toast("Digite o peso!", "error");
    setSalvando(true);
    const hoje = formatarData(new Date());
    const { error } = await supabase
      .from("peso_registro")
      .upsert(
        { user_id: user.id, data: hoje, peso: parseFloat(valor) },
        { onConflict: "user_id,data" },
      );
    setSalvando(false);
    if (error) return toast(error.message, "error");
    toast("Peso registrado!", "success");
    onRegistrado?.();
    fechar();
  };

  const registrarGasto = async () => {
    if (!nome || !valor) return toast("Preencha nome e valor!", "error");
    setSalvando(true);
    const agora = new Date();
    const { error } = await supabase.from("financeiro_gastos").insert([
      {
        user_id: user.id,
        mes: agora.getMonth(),
        ano: agora.getFullYear(),
        nome,
        valor: parseFloat(valor),
        categoria: "Outros",
        data: formatarData(agora),
      },
    ]);
    setSalvando(false);
    if (error) return toast(error.message, "error");
    toast("Gasto registrado!", "success");
    onRegistrado?.();
    fechar();
  };

  return createPortal(
    <>
      <button
        onClick={() => setAberto(true)}
        style={{
          position: "fixed",
          right: 18,
          bottom: 84,
          width: 54,
          height: 54,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #6366f1, #4f46e5)",
          border: "none",
          boxShadow: "0 4px 20px rgba(99,102,241,0.5)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 150,
        }}
      >
        <Plus size={26} />
      </button>

      {aberto && (
        <div
          onClick={fechar}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 200,
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              background: "linear-gradient(155deg, #1c2026, #17191d)",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: "20px 18px 28px",
              animation: "fadeInUp 0.2s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 800, color: "#f8fafc" }}>
                {!tipo
                  ? "Registro rápido"
                  : tipo === "agua"
                    ? "Quanto de água?"
                    : tipo === "peso"
                      ? "Peso de hoje"
                      : "Novo gasto"}
              </div>
              <button
                onClick={fechar}
                style={{
                  background: "none",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {!tipo && (
              <div style={{ display: "flex", gap: 10 }}>
                {OPCOES.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setTipo(o.id)}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                      background: "#24282d",
                      border: "1px solid #ffffff0d",
                      borderRadius: 14,
                      padding: "18px 8px",
                      cursor: "pointer",
                    }}
                  >
                    <o.icon size={26} color={o.cor} />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#e2e8f0",
                      }}
                    >
                      {o.label}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {tipo === "agua" && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 8,
                }}
              >
                {[180, 300, 500, 1000].map((ml) => (
                  <button
                    key={ml}
                    disabled={salvando}
                    onClick={() => registrarAgua(ml)}
                    style={{
                      background: "#24282d",
                      border: "1px solid #3b82f633",
                      borderRadius: 12,
                      color: "#3b82f6",
                      fontSize: 13,
                      fontWeight: 700,
                      padding: "16px 4px",
                      cursor: "pointer",
                    }}
                  >
                    {ml}ml
                  </button>
                ))}
              </div>
            )}

            {tipo === "peso" && (
              <div>
                <input
                  type="number"
                  placeholder="Peso em kg"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && registrarPeso()}
                />
                <button
                  onClick={registrarPeso}
                  disabled={salvando}
                  style={{
                    marginTop: 10,
                    width: "100%",
                    background: "#6366f1",
                    border: "none",
                    borderRadius: 10,
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 700,
                    padding: 12,
                    cursor: "pointer",
                  }}
                >
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
              </div>
            )}

            {tipo === "gasto" && (
              <div>
                <input
                  placeholder="Nome (ex: Uber)"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  autoFocus
                />
                <input
                  type="number"
                  placeholder="Valor R$"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  style={{ marginTop: 8 }}
                  onKeyDown={(e) => e.key === "Enter" && registrarGasto()}
                />
                <div style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>
                  Categoria "Outros" — edite depois em Finanças se quiser mudar.
                </div>
                <button
                  onClick={registrarGasto}
                  disabled={salvando}
                  style={{
                    marginTop: 10,
                    width: "100%",
                    background: "#ef4444",
                    border: "none",
                    borderRadius: 10,
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 700,
                    padding: 12,
                    cursor: "pointer",
                  }}
                >
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
              </div>
            )}

            {tipo && (
              <button
                onClick={() => setTipo(null)}
                style={{
                  marginTop: 12,
                  width: "100%",
                  background: "transparent",
                  border: "1px solid #ffffff0d",
                  borderRadius: 10,
                  color: "#64748b",
                  fontSize: 13,
                  padding: 10,
                  cursor: "pointer",
                }}
              >
                ← Voltar
              </button>
            )}
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
