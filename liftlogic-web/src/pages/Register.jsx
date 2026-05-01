import React, { useState } from "react";

export default function Register({ onSwitchToLogin }) {
  const [form, setForm] = useState({
    nome: "",
    email: "",
    senha: "",
    confirmarSenha: "",
  });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    setSucesso("");

    if (form.senha !== form.confirmarSenha) {
      setErro("As senhas não coincidem!");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:8080/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome,
          email: form.email,
          senha: form.senha,
        }),
      });

      if (response.ok) {
        setSucesso("Cadastro realizado com sucesso! Redirecionando...");
        setTimeout(() => {
          onSwitchToLogin();
        }, 1200);
      } else {
        const data = await response.json().catch(() => ({}));
        setErro(data.message || "Erro ao cadastrar. Tente novamente.");
      }
    } catch (err) {
      setErro(
        "Não foi possível conectar ao servidor. Verifique se o Back-end está rodando.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #16213e 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Segoe UI', sans-serif",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "24px",
          padding: "48px 40px",
          width: "100%",
          maxWidth: "420px",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: "28px",
            }}
          >
            💪
          </div>
          <h1
            style={{
              color: "#fff",
              fontSize: "24px",
              fontWeight: "700",
              margin: "0 0 8px",
            }}
          >
            LiftLogic
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: "14px",
              margin: 0,
            }}
          >
            Crie sua conta e comece a evoluir
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "13px",
                fontWeight: "600",
                display: "block",
                marginBottom: "8px",
              }}
            >
              NOME
            </label>
            <input
              type="text"
              name="nome"
              placeholder="Seu nome completo"
              value={form.nome}
              onChange={handleChange}
              required
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "12px",
                color: "#fff",
                fontSize: "15px",
                outline: "none",
                boxSizing: "border-box",
                transition: "border 0.2s",
              }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "13px",
                fontWeight: "600",
                display: "block",
                marginBottom: "8px",
              }}
            >
              EMAIL
            </label>
            <input
              type="email"
              name="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={handleChange}
              required
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "12px",
                color: "#fff",
                fontSize: "15px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "13px",
                fontWeight: "600",
                display: "block",
                marginBottom: "8px",
              }}
            >
              SENHA
            </label>
            <input
              type="password"
              name="senha"
              placeholder="Mínimo 6 caracteres"
              value={form.senha}
              onChange={handleChange}
              required
              minLength={6}
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "12px",
                color: "#fff",
                fontSize: "15px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "13px",
                fontWeight: "600",
                display: "block",
                marginBottom: "8px",
              }}
            >
              CONFIRMAR SENHA
            </label>
            <input
              type="password"
              name="confirmarSenha"
              placeholder="Repita sua senha"
              value={form.confirmarSenha}
              onChange={handleChange}
              required
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "12px",
                color: "#fff",
                fontSize: "15px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {erro && (
            <div
              style={{
                background: "rgba(255, 59, 59, 0.15)",
                border: "1px solid rgba(255, 59, 59, 0.4)",
                borderRadius: "10px",
                padding: "12px 16px",
                color: "#ff6b6b",
                fontSize: "13px",
                marginBottom: "16px",
              }}
            >
              ⚠️ {erro}
            </div>
          )}

          {sucesso && (
            <div
              style={{
                background: "rgba(34, 197, 94, 0.15)",
                border: "1px solid rgba(34, 197, 94, 0.4)",
                borderRadius: "10px",
                padding: "12px 16px",
                color: "#4ade80",
                fontSize: "13px",
                marginBottom: "16px",
              }}
            >
              ✅ {sucesso}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: loading
                ? "rgba(102, 126, 234, 0.5)"
                : "linear-gradient(135deg, #667eea, #764ba2)",
              border: "none",
              borderRadius: "12px",
              color: "#fff",
              fontSize: "16px",
              fontWeight: "700",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              boxShadow: loading
                ? "none"
                : "0 4px 20px rgba(102, 126, 234, 0.4)",
            }}
          >
            {loading ? "⏳ Cadastrando..." : "🚀 Criar Conta"}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            color: "rgba(255,255,255,0.4)",
            fontSize: "14px",
            marginTop: "24px",
            marginBottom: 0,
          }}
        >
          Já tem conta?{" "}
          <span
            style={{ color: "#667eea", cursor: "pointer", fontWeight: "600" }}
            onClick={onSwitchToLogin}
          >
            Entrar
          </span>
        </p>
      </div>
    </div>
  );
}
