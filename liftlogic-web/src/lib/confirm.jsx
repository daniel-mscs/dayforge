import React, { useState, useEffect } from "react";

let confirmHandler = null;
let promptHandler = null;

// Substitui o confirm() nativo do navegador (que aparece feio, fora do
// padrão visual do app). Uso: `if (!(await askConfirm("Apagar isso?"))) return;`
export function askConfirm(mensagem, opcoes = {}) {
  return new Promise((resolve) => {
    if (confirmHandler) {
      confirmHandler(mensagem, opcoes, resolve);
    } else {
      resolve(window.confirm(mensagem));
    }
  });
}

// Substitui o prompt() nativo (pede um texto/número). Resolve com a
// string digitada, ou null se cancelado.
// Uso: `const valor = await askPrompt("Novo tempo em minutos:", 10);`
export function askPrompt(mensagem, valorInicial = "", opcoes = {}) {
  return new Promise((resolve) => {
    if (promptHandler) {
      promptHandler(mensagem, valorInicial, opcoes, resolve);
    } else {
      resolve(window.prompt(mensagem, valorInicial));
    }
  });
}

export function ConfirmContainer() {
  const [estado, setEstado] = useState(null);
  const [estadoPrompt, setEstadoPrompt] = useState(null);
  const [valorPrompt, setValorPrompt] = useState("");

  useEffect(() => {
    confirmHandler = (mensagem, opcoes, resolve) => {
      setEstado({ mensagem, opcoes, resolve });
    };
    promptHandler = (mensagem, valorInicial, opcoes, resolve) => {
      setEstadoPrompt({ mensagem, valorInicial, opcoes, resolve });
      setValorPrompt(String(valorInicial ?? ""));
    };
    return () => {
      confirmHandler = null;
      promptHandler = null;
    };
  }, []);

  if (estadoPrompt) {
    const responderPrompt = (valor) => {
      estadoPrompt.resolve(valor);
      setEstadoPrompt(null);
    };
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10000,
          background: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
        onClick={() => responderPrompt(null)}
      >
        <div
          style={{
            background: "linear-gradient(155deg, #22222f, #1a1a26)",
            border: "1px solid #ffffff10",
            borderRadius: 20,
            padding: "24px 22px",
            width: "100%",
            maxWidth: 380,
            boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              fontSize: 15,
              color: "#f8fafc",
              fontWeight: 600,
              lineHeight: 1.5,
              marginBottom: 14,
              textAlign: "center",
            }}
          >
            {estadoPrompt.mensagem}
          </div>
          <input
            type={estadoPrompt.opcoes.tipo || "text"}
            autoFocus
            defaultValue={estadoPrompt.valorInicial}
            onChange={(e) => setValorPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") responderPrompt(valorPrompt);
            }}
            style={{ width: "100%", marginBottom: 16, textAlign: "center" }}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => responderPrompt(null)}
              style={{
                flex: 1,
                background: "transparent",
                border: "1px solid #ffffff1a",
                color: "#94a3b8",
                borderRadius: 10,
                padding: "11px 0",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={() => responderPrompt(valorPrompt)}
              style={{
                flex: 1,
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                border: "none",
                color: "#fff",
                borderRadius: 10,
                padding: "11px 0",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(99,102,241,0.35)",
              }}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!estado) return null;

  const responder = (valor) => {
    estado.resolve(valor);
    setEstado(null);
  };

  const perigo = estado.opcoes.perigo !== false;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={() => responder(false)}
    >
      <div
        style={{
          background: "linear-gradient(155deg, #22222f, #1a1a26)",
          border: "1px solid #ffffff10",
          borderRadius: 20,
          padding: "24px 22px",
          width: "100%",
          maxWidth: 380,
          boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontSize: 15,
            color: "#f8fafc",
            fontWeight: 600,
            lineHeight: 1.5,
            marginBottom: 20,
            textAlign: "center",
          }}
        >
          {perigo && <span style={{ marginRight: 6 }}>⚠️</span>}
          {estado.mensagem}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => responder(false)}
            style={{
              flex: 1,
              background: "transparent",
              border: "1px solid #ffffff1a",
              color: "#94a3b8",
              borderRadius: 10,
              padding: "11px 0",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {estado.opcoes.textoCancelar || "Cancelar"}
          </button>
          <button
            onClick={() => responder(true)}
            style={{
              flex: 1,
              background: perigo
                ? "linear-gradient(135deg, #ef4444, #dc2626)"
                : "linear-gradient(135deg, #6366f1, #4f46e5)",
              border: "none",
              color: "#fff",
              borderRadius: 10,
              padding: "11px 0",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: perigo
                ? "0 4px 16px rgba(239,68,68,0.35)"
                : "0 4px 16px rgba(99,102,241,0.35)",
            }}
          >
            {estado.opcoes.textoConfirmar || "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
