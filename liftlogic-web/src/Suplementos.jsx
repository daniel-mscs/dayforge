import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";
import { toast } from "./lib/toast";
import { SkeletonSupl } from "./lib/skeleton";

function formatarData(date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().split("T")[0];
}

export default function Suplementos({
  user,
  compact = false,
  minimode = false,
  onAjuda,
}) {
  const [lista, setLista] = useState([]);
  const [checks, setChecks] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [nomeInput, setNomeInput] = useState("");
  const [doseInput, setDoseInput] = useState("");
  const [estoqueInput, setEstoqueInput] = useState("");
  const [estoqueAlertaInput, setEstoqueAlertaInput] = useState("5");
  const [vitCInput, setVitCInput] = useState("");
  const [vitDInput, setVitDInput] = useState("");
  const [calcioInput, setCalcioInput] = useState("");
  const [ferroInput, setFerroInput] = useState("");
  const [fibraInput, setFibraInput] = useState("");
  const [mostrarVitaminas, setMostrarVitaminas] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const dataAtualRef = React.useRef(formatarData(new Date()));
  const [mostrarTooltip, setMostrarTooltip] = useState(false);

  const buscarTudo = useCallback(async () => {
    const hoje = formatarData(new Date());
    setCarregando(true);
    const [{ data: suplementos }, { data: checksData }] = await Promise.all([
      supabase
        .from("suplementos")
        .select("*")
        .eq("user_id", user.id)
        .order("ordem", { ascending: true }),
      supabase
        .from("suplementos_check")
        .select("*")
        .eq("user_id", user.id)
        .eq("data", hoje),
    ]);
    setLista(suplementos || []);
    const mapa = {};
    (checksData || []).forEach((c) => {
      mapa[c.suplemento_id] = { concluido: c.concluido, hora: c.hora };
    });
    setChecks(mapa);
    setCarregando(false);
  }, [user.id]);

  useEffect(() => {
    buscarTudo();
  }, [buscarTudo]);

  useEffect(() => {
    const verificarMudancaDia = () => {
      const hoje = formatarData(new Date());
      if (hoje !== dataAtualRef.current) {
        dataAtualRef.current = hoje;
        buscarTudo();
      }
    };
    document.addEventListener("visibilitychange", verificarMudancaDia);
    window.addEventListener("focus", verificarMudancaDia);
    return () => {
      document.removeEventListener("visibilitychange", verificarMudancaDia);
      window.removeEventListener("focus", verificarMudancaDia);
    };
  }, [buscarTudo]);

  const toggleCheck = async (suplId) => {
    const hoje = formatarData(new Date());
    const atual = checks[suplId]?.concluido || false;
    const novo = !atual;
    const hora = novo
      ? new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;
    setChecks((prev) => ({ ...prev, [suplId]: { concluido: novo, hora } }));
    await supabase.from("suplementos_check").upsert(
      {
        user_id: user.id,
        data: hoje,
        suplemento_id: suplId,
        concluido: novo,
        hora,
      },
      { onConflict: "user_id,data,suplemento_id" },
    );

    // Baixa (ou devolve) 1 unidade do estoque, se o suplemento tiver controle
    const supl = lista.find((s) => s.id === suplId);
    if (
      supl &&
      supl.estoque_atual !== null &&
      supl.estoque_atual !== undefined
    ) {
      const novoEstoque = Math.max(0, supl.estoque_atual + (novo ? -1 : 1));
      setLista((prev) =>
        prev.map((s) =>
          s.id === suplId ? { ...s, estoque_atual: novoEstoque } : s,
        ),
      );
      await supabase
        .from("suplementos")
        .update({ estoque_atual: novoEstoque })
        .eq("id", suplId);
      if (
        novo &&
        novoEstoque <= (supl.estoque_alerta ?? 5) &&
        novoEstoque > 0
      ) {
        toast(`⚠️ ${supl.nome} tá acabando (restam ${novoEstoque})`, "warning");
      } else if (novo && novoEstoque === 0) {
        toast(`🚨 ${supl.nome} acabou!`, "error");
      }
    }
  };

  const adicionarSupl = async () => {
    if (!nomeInput.trim() || !doseInput.trim()) {
      toast("Preencha nome e dose!", "warning");
      return;
    }
    const { data, error } = await supabase
      .from("suplementos")
      .insert([
        {
          user_id: user.id,
          nome: nomeInput.trim(),
          dose: doseInput.trim(),
          ordem: lista.length,
          estoque_atual: estoqueInput ? Number(estoqueInput) : null,
          estoque_alerta: Number(estoqueAlertaInput) || 5,
          vit_c: Number(vitCInput) || 0,
          vit_d: Number(vitDInput) || 0,
          calcio: Number(calcioInput) || 0,
          ferro: Number(ferroInput) || 0,
          fibra: Number(fibraInput) || 0,
        },
      ])
      .select();
    if (error) {
      toast("Erro: " + error.message, "error");
      return;
    }
    setLista((prev) => [...prev, data[0]]);
    setNomeInput("");
    setDoseInput("");
    setEstoqueInput("");
    setEstoqueAlertaInput("5");
    setVitCInput("");
    setVitDInput("");
    setCalcioInput("");
    setFerroInput("");
    setFibraInput("");
    setMostrarVitaminas(false);
    toast("Suplemento adicionado!", "success");
  };

  const deletarSupl = async (id) => {
    await supabase.from("suplementos").delete().eq("id", id);
    setLista((prev) => prev.filter((s) => s.id !== id));
    setChecks((prev) => {
      const n = { ...prev };
      delete n[id];
      return n;
    });
    setConfirmDelete(null);
    toast("Suplemento removido!", "info");
  };

  const concluidosHoje = lista.filter((s) => checks[s.id]?.concluido).length;

  if (carregando)
    return (
      <div className="supl-section">
        <SkeletonSupl />
      </div>
    );

  if (minimode) {
    return (
      <div style={{ marginTop: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc" }}>
          {concluidosHoje}/{lista.length}
        </div>
        <div style={{ fontSize: 11, color: "#64748b" }}>concluídos hoje</div>
        <div className="home-mini-bar-bg" style={{ marginTop: 6 }}>
          <div
            className="home-mini-bar-fill"
            style={{
              width: `${lista.length > 0 ? Math.round((concluidosHoje / lista.length) * 100) : 0}%`,
              background:
                concluidosHoje === lista.length && lista.length > 0
                  ? "#10b981"
                  : "#6366f1",
            }}
          />
        </div>
      </div>
    );
  }

  if (compact) {
    if (lista.length === 0) return null;
    return (
      <div className="supl-compact">
        <div className="supl-compact-prog">
          <span>
            {concluidosHoje}/{lista.length} suplementos hoje
          </span>
        </div>
        {lista.map((s) => {
          const done = !!checks[s.id]?.concluido;
          const hora = checks[s.id]?.hora || null;
          return (
            <div
              key={s.id}
              className={`supl-item ${done ? "done" : ""}`}
              onClick={() => toggleCheck(s.id)}
            >
              <span className="supl-check">{done ? "✅" : "💊"}</span>
              <div className="supl-info">
                <span className="supl-nome">{s.nome}</span>
                <span className="supl-dose">
                  {s.dose}
                  {hora ? ` · ${hora}` : ""}
                </span>
              </div>
              <span className="supl-toggle">{done ? "✓" : "○"}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="supl-section">
      {/* Modal de confirmação de delete */}
      {confirmDelete && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-resumo" style={{ maxWidth: 320 }}>
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>
              Remover suplemento?
            </h2>
            <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>
              "{confirmDelete.nome}" será removido permanentemente.
            </p>
            <div className="modal-actions">
              <button
                onClick={() => deletarSupl(confirmDelete.id)}
                style={{
                  background: "#ef4444",
                  border: "none",
                  borderRadius: 10,
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  padding: "12px 20px",
                  cursor: "pointer",
                }}
              >
                Remover
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="btn-cancel-rest"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h2 className="title-divisao" style={{ margin: 0 }}>
          💊 Suplementação
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
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 998,
              }}
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
                💊 Como usar
              </div>
              {[
                {
                  icon: "➕",
                  text: "Cadastre seus suplementos com nome e dose no campo abaixo.",
                },
                {
                  icon: "✅",
                  text: "Toque no suplemento para marcar como tomado. O horário é registrado automaticamente.",
                },
                {
                  icon: "🔄",
                  text: "Os checks resetam automaticamente a meia-noite todo dia.",
                },
                {
                  icon: "🏠",
                  text: "Na Home você vê o progresso do dia no card de Suplementos.",
                },
                {
                  icon: "🗑️",
                  text: "Para remover um suplemento, toque no × ao lado dele.",
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
                    style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}
                  >
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {lista.length > 0 && (
        <div className="supl-prog-card">
          <div className="supl-prog-top">
            <span className="supl-prog-num">
              {concluidosHoje}
              <span>/{lista.length}</span>
            </span>
            <span className="supl-prog-label">suplementos hoje</span>
          </div>
          <div className="supl-prog-bar-bg">
            <div
              className="supl-prog-bar-fill"
              style={{ width: `${(concluidosHoje / lista.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {lista.length > 0 && (
        <div className="supl-card">
          <div className="supl-card-title">HOJE</div>
          {lista.map((s) => {
            const done = !!checks[s.id]?.concluido;
            const hora = checks[s.id]?.hora || null;
            return (
              <div
                key={s.id}
                className={`supl-item-full ${done ? "done" : ""}`}
              >
                <div
                  className="supl-item-left"
                  onClick={() => toggleCheck(s.id)}
                >
                  <span className="supl-check-big">{done ? "✅" : "💊"}</span>
                  <div className="supl-item-info">
                    <span className="supl-nome-full">{s.nome}</span>
                    <span className="supl-dose-full">
                      {s.dose}
                      {hora ? (
                        <span style={{ color: "#6366f1", marginLeft: 6 }}>
                          · {hora}
                        </span>
                      ) : (
                        ""
                      )}
                      {s.estoque_atual !== null &&
                        s.estoque_atual !== undefined && (
                          <span
                            style={{
                              marginLeft: 6,
                              color:
                                s.estoque_atual <= (s.estoque_alerta ?? 5)
                                  ? "#ef4444"
                                  : "#64748b",
                              fontWeight: 700,
                            }}
                          >
                            · restam {s.estoque_atual}
                          </span>
                        )}
                    </span>
                  </div>
                </div>
                <div className="supl-item-right">
                  <span className="supl-toggle-big">{done ? "✓" : "○"}</span>
                  <button
                    className="supl-del-btn"
                    onClick={() => setConfirmDelete(s)}
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="supl-card">
        <div className="supl-card-title">ADICIONAR SUPLEMENTO</div>
        <div className="supl-add-form">
          <input
            type="text"
            placeholder="Nome (ex: Creatina)"
            value={nomeInput}
            onChange={(e) => setNomeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter")
                document.getElementById("dose-input").focus();
            }}
          />
          <input
            id="dose-input"
            type="text"
            placeholder="Dose (ex: 5g, 1 cápsula)"
            value={doseInput}
            onChange={(e) => setDoseInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") adicionarSupl();
            }}
          />
          <input
            type="number"
            placeholder="Estoque atual (opcional, ex: 60)"
            value={estoqueInput}
            onChange={(e) => setEstoqueInput(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setMostrarVitaminas((v) => !v)}
            style={{
              background: "transparent",
              border: "1px dashed #6366f155",
              borderRadius: 8,
              color: "#a5b4fc",
              fontSize: 12,
              fontWeight: 600,
              padding: "8px 0",
              cursor: "pointer",
              width: "100%",
              marginTop: 6,
            }}
          >
            {mostrarVitaminas
              ? "▲ Ocultar vitaminas"
              : "▼ Tem tabela nutricional? Adicionar vitaminas"}
          </button>
          {mostrarVitaminas && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginTop: 8,
              }}
            >
              <input
                type="number"
                placeholder="Vit. C (mg)"
                value={vitCInput}
                onChange={(e) => setVitCInput(e.target.value)}
              />
              <input
                type="number"
                placeholder="Vit. D (mcg)"
                value={vitDInput}
                onChange={(e) => setVitDInput(e.target.value)}
              />
              <input
                type="number"
                placeholder="Cálcio (mg)"
                value={calcioInput}
                onChange={(e) => setCalcioInput(e.target.value)}
              />
              <input
                type="number"
                placeholder="Ferro (mg)"
                value={ferroInput}
                onChange={(e) => setFerroInput(e.target.value)}
              />
              <input
                type="number"
                placeholder="Fibra (g)"
                value={fibraInput}
                onChange={(e) => setFibraInput(e.target.value)}
              />
            </div>
          )}
          <button className="supl-btn-add" onClick={adicionarSupl}>
            + Adicionar
          </button>
        </div>
      </div>

      {lista.length === 0 && (
        <p className="empty-msg" style={{ marginTop: 8, fontSize: 13 }}>
          Nenhum suplemento cadastrado ainda. Adicione acima! 💊
        </p>
      )}
    </div>
  );
}
