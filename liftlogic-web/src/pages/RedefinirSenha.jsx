import React, { useState } from "react";
import { supabase } from "../lib/supabase";

export default function RedefinirSenha({ onConcluido }) {
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  const validarSenha = (s) => {
    if (s.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
    if (!/[0-9]/.test(s)) return "A senha deve ter pelo menos um número.";
    if (!/[a-zA-Z]/.test(s)) return "A senha deve ter pelo menos uma letra.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");

    if (senha !== confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }
    const erroValidacao = validarSenha(senha);
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setLoading(false);

    if (error) {
      setErro(error.message);
      return;
    }
    setSucesso(true);
    // Limpa o token da URL pra não ficar exposto/reutilizável
    window.history.replaceState(null, "", window.location.pathname);
    setTimeout(() => onConcluido(), 1800);
  };

  return (
    <div className="login-bg">
      <div className="login-blob login-blob-1" />
      <div className="login-blob login-blob-2" />

      <div className="login-card">
        <h1 className="login-title">Nova senha</h1>
        <p className="login-subtitle">
          {sucesso
            ? "Senha atualizada! Redirecionando..."
            : "Escolha uma nova senha pra sua conta DayForge."}
        </p>

        {!sucesso && (
          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label>NOVA SENHA</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">🔒</span>
                <input
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  style={{
                    position: "absolute",
                    right: 12,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 16,
                    color: "#64748b",
                  }}
                >
                  {mostrarSenha ? "ocultar" : "ver"}
                </button>
              </div>
            </div>

            <div className="login-field">
              <label>CONFIRMAR SENHA</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">🔒</span>
                <input
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="Repita a senha"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            {erro && <div className="login-erro">{erro}</div>}

            <button type="submit" disabled={loading} className="login-btn">
              {loading ? "Salvando..." : "Salvar nova senha"}
            </button>
          </form>
        )}

        {sucesso && <div className="login-sucesso">✅ Tudo certo!</div>}
      </div>
    </div>
  );
}