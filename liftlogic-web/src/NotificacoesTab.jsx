import React, { useState } from "react";
import { toast } from "./lib/toast";
import {
  getNotificacoes,
  salvarNotificacoes,
  resetarNotificacoes,
  agendarNotificacoes,
  cancelarNotificacoes,
  notificacoesSuportadas,
} from "./lib/notifications";

export default function NotificacoesTab({
  notifAtivas,
  setNotifAtivas,
  notifPermissao,
  setNotifPermissao,
}) {
  const [notifs, setNotifs] = useState(() => getNotificacoes());
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});

  const abrirEdicao = (n) => {
    setEditando(n.id);
    setForm({
      titulo: n.titulo,
      corpo: n.corpo,
      hora: n.hora,
      minuto: n.minuto,
    });
  };

  const salvarEdicao = (id) => {
    const atualizadas = notifs.map((n) =>
      n.id === id
        ? {
            ...n,
            titulo: form.titulo,
            corpo: form.corpo,
            hora: Number(form.hora),
            minuto: Number(form.minuto),
          }
        : n,
    );
    setNotifs(atualizadas);
    salvarNotificacoes(atualizadas);
    setEditando(null);
    toast("Notificação atualizada!", "success");
  };

  const resetar = () => {
    const padrao = resetarNotificacoes();
    setNotifs(padrao);
    toast("Notificações resetadas!", "info");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 className="title-divisao" style={{ margin: 0 }}>
          🔔 Alertas & Notificações
        </h2>
        <button
          onClick={resetar}
          style={{
            background: "transparent",
            border: "1px solid #334155",
            borderRadius: 8,
            color: "#64748b",
            fontSize: 11,
            fontWeight: 600,
            padding: "5px 10px",
            cursor: "pointer",
          }}
        >
          Resetar
        </button>
      </div>

      {!notificacoesSuportadas() && (
        <div
          style={{
            background: "#ef444415",
            border: "1px solid #ef444433",
            borderRadius: 12,
            padding: 14,
            fontSize: 13,
            color: "#ef4444",
          }}
        >
          ⚠️ Notificações só funcionam no app Android. No navegador não é
          suportado.
        </div>
      )}

      {notificacoesSuportadas() && notifPermissao === "denied" && (
        <div
          style={{
            background: "#f59e0b15",
            border: "1px solid #f59e0b33",
            borderRadius: 12,
            padding: 14,
            fontSize: 13,
            color: "#f59e0b",
          }}
        >
          ⚠️ Notificações bloqueadas. Vá nas configurações e permita
          notificações para este app.
        </div>
      )}

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
            marginBottom: 14,
          }}
        >
          ESCOLHA OS ALERTAS
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {notifs.map((n) => {
            const ativa = notifAtivas.includes(n.id);
            const emEdicao = editando === n.id;

            return (
              <div
                key={n.id}
                style={{
                  background: "#24282d",
                  borderRadius: 12,
                  padding: "12px 14px",
                }}
              >
                {emEdicao ? (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    <input
                      type="text"
                      value={form.titulo}
                      onChange={(e) =>
                        setForm({ ...form, titulo: e.target.value })
                      }
                      placeholder="Título"
                      style={{ fontSize: 13 }}
                    />
                    <input
                      type="text"
                      value={form.corpo}
                      onChange={(e) =>
                        setForm({ ...form, corpo: e.target.value })
                      }
                      placeholder="Mensagem"
                      style={{ fontSize: 13 }}
                    />
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 8,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "#64748b",
                            marginBottom: 4,
                          }}
                        >
                          HORA
                        </div>
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={form.hora}
                          onChange={(e) =>
                            setForm({ ...form, hora: e.target.value })
                          }
                          style={{ textAlign: "center" }}
                        />
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "#64748b",
                            marginBottom: 4,
                          }}
                        >
                          MINUTO
                        </div>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={form.minuto}
                          onChange={(e) =>
                            setForm({ ...form, minuto: e.target.value })
                          }
                          style={{ textAlign: "center" }}
                        />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => salvarEdicao(n.id)}
                        style={{
                          flex: 2,
                          background: "#6366f1",
                          border: "none",
                          borderRadius: 8,
                          color: "#fff",
                          fontSize: 13,
                          fontWeight: 700,
                          padding: "8px 0",
                          cursor: "pointer",
                        }}
                      >
                        💾 Salvar
                      </button>
                      <button
                        onClick={() => setEditando(null)}
                        style={{
                          flex: 1,
                          background: "transparent",
                          border: "1px solid #334155",
                          borderRadius: 8,
                          color: "#64748b",
                          fontSize: 13,
                          padding: "8px 0",
                          cursor: "pointer",
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#f8fafc",
                        }}
                      >
                        {n.titulo}
                      </div>
                      <div
                        style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}
                      >
                        {String(n.hora).padStart(2, "0")}:
                        {String(n.minuto).padStart(2, "0")}h — {n.corpo}
                      </div>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <button
                        onClick={() => abrirEdicao(n)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#64748b",
                          cursor: "pointer",
                          fontSize: 14,
                          padding: "0 4px",
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => {
                          const novo = ativa
                            ? notifAtivas.filter((i) => i !== n.id)
                            : [...notifAtivas, n.id];
                          setNotifAtivas(novo);
                          localStorage.setItem(
                            "df_notif_ativas",
                            JSON.stringify(novo),
                          );
                        }}
                        style={{
                          width: 40,
                          height: 24,
                          borderRadius: 12,
                          background: ativa ? "#6366f1" : "#334155",
                          border: "none",
                          cursor: "pointer",
                          position: "relative",
                          transition: "background 0.2s",
                        }}
                      >
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: "#fff",
                            position: "absolute",
                            top: 3,
                            transition: "left 0.2s",
                            left: ativa ? 19 : 3,
                          }}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {notificacoesSuportadas() && notifPermissao !== "denied" && (
        <>
          <button
            onClick={async () => {
              const ativas = notifs.filter((n) => notifAtivas.includes(n.id));
              const ok = await agendarNotificacoes(notifAtivas);
              if (ok) {
                setNotifPermissao("granted");
                toast("Notificações ativadas!", "success");
              } else {
                toast("Permissão negada. Ative nas configurações.", "error");
              }
            }}
            style={{
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
            🔔 Ativar Notificações
          </button>

          <button
            onClick={() => {
              cancelarNotificacoes();
              toast("Notificações desativadas!", "info");
            }}
            style={{
              background: "transparent",
              border: "1px solid #ffffff1a",
              borderRadius: 12,
              color: "#64748b",
              fontSize: 14,
              fontWeight: 600,
              padding: 12,
              cursor: "pointer",
            }}
          >
            🔕 Desativar todas
          </button>
        </>
      )}
    </div>
  );
}
