import React, { useState, useEffect, useCallback } from "react";

let toastHandler = null;

export function toast(mensagem, tipo = "success", duracao = 3000) {
  if (toastHandler) {
    toastHandler(mensagem, tipo, duracao);
  }
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    toastHandler = (mensagem, tipo, duracao) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, mensagem, tipo }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duracao);
    };
    return () => {
      toastHandler = null;
    };
  }, []);

  const remover = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const cores = {
    success: { bg: "#10b981", icon: "✅" },
    error: { bg: "#ef4444", icon: "❌" },
    warning: { bg: "#f59e0b", icon: "⚠️" },
    info: { bg: "#6366f1", icon: "ℹ️" },
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: "calc(100% - 40px)",
        maxWidth: 400,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => {
        const cor = cores[t.tipo] || cores.success;
        return (
          <div
            key={t.id}
            onClick={() => remover(t.id)}
            style={{
              background: "#151a24",
              border: `1px solid ${cor.bg}44`,
              borderLeft: `4px solid ${cor.bg}`,
              borderRadius: 12,
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              boxShadow: "0 8px 32px #00000066",
              animation: "toastIn 0.3s ease",
              pointerEvents: "all",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 18, flexShrink: 0 }}>{cor.icon}</span>
            <span
              style={{
                fontSize: 13,
                color: "#f8fafc",
                fontWeight: 500,
                flex: 1,
              }}
            >
              {t.mensagem}
            </span>
          </div>
        );
      })}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
