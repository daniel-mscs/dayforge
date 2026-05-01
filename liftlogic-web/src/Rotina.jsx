import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";
import { toast } from "./lib/toast";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const PERIODOS = ["Acordar", "Manhã", "Tarde", "Noite"];
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DOW = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function formatarData(date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().split("T")[0];
}

function labelData(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const diff = Math.round((d - hoje) / 86400000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  if (diff === -1) return "Ontem";
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

function DatePicker({ label, value, onChange, minDate }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6, fontWeight: 700, letterSpacing: "0.06em" }}>{label}</div>
      <input
        type="date"
        value={value}
        min={minDate || ""}
        onChange={e => onChange(e.target.value)}
        style={{ width: "100%", colorScheme: "dark" }}
      />
    </div>
  );
}


function TarefaItem({ t, diaId, periodo, editando, setEditando, toggleTarefa, salvarEdicao, deletarTarefa }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: t.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  return (
    <div ref={setNodeRef} style={style} className={`rotina-tarefa ${t.concluida ? "concluida" : ""}`}>
      <span className="rotina-drag-handle" {...attributes} {...listeners}>☰</span>
      <button className="rotina-check" onClick={() => toggleTarefa(diaId, periodo, t)}>
        {t.concluida ? "✅" : "⭕"}
      </button>
      {editando === t.id ? (
        <input
          className="rotina-edit-input"
          defaultValue={t.texto}
          autoFocus
          onBlur={(e) => salvarEdicao(diaId, periodo, t, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") salvarEdicao(diaId, periodo, t, e.target.value);
            if (e.key === "Escape") setEditando(null);
          }}
        />
      ) : (
        <span className="rotina-tarefa-texto" onDoubleClick={() => setEditando(t.id)}>{t.texto}</span>
      )}
      <button className="rotina-del" onClick={() => deletarTarefa(diaId, periodo, t.id)}>×</button>
    </div>
  );
}

export default function Rotina({ user }) {
  const [dias, setDias] = useState([]);
  const [tarefas, setTarefas] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [gerando, setGerando] = useState(false);
  const [novasTarefas, setNovasTarefas] = useState({});
  const [editando, setEditando] = useState(null);
  const [modalClone, setModalClone] = useState(null);
  const [clonando, setClonando] = useState(false);
  const [diaSelecionado, setDiaSelecionado] = useState(null);
  const [mesAtual, setMesAtual] = useState(() => {
    const h = new Date();
    return { ano: h.getFullYear(), mes: h.getMonth() };
  });

  const hoje = formatarData(new Date());

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const buscarRotina = useCallback(async () => {
    setCarregando(true);
    const { data: diasData } = await supabase
      .from("rotina_dias").select("*").eq("user_id", user.id).order("data", { ascending: true });

    if (!diasData || diasData.length === 0) {
      setDias([]); setTarefas({}); setCarregando(false); return;
    }

    setDias(diasData);
    const ids = diasData.map((d) => d.id);
    const { data: tarefasData } = await supabase
      .from("rotina_tarefas").select("*").in("dia_id", ids).order("ordem", { ascending: true });

    const agrupado = {};
    diasData.forEach((d) => { agrupado[d.id] = {}; });
    (tarefasData || []).forEach((t) => {
      if (!agrupado[t.dia_id]) agrupado[t.dia_id] = {};
      if (!agrupado[t.dia_id][t.periodo]) agrupado[t.dia_id][t.periodo] = [];
      agrupado[t.dia_id][t.periodo].push(t);
    });

    setTarefas(agrupado);

    const diaHoje = diasData.find((d) => d.data === hoje);
    if (diaHoje) {
      setDiaSelecionado(diaHoje.id);
      const h = new Date();
      setMesAtual({ ano: h.getFullYear(), mes: h.getMonth() });
    } else {
      setDiaSelecionado(diasData[0]?.id || null);
      const d = new Date(diasData[0].data + "T00:00:00");
      setMesAtual({ ano: d.getFullYear(), mes: d.getMonth() });
    }

    setCarregando(false);
  }, [user.id]);

  useEffect(() => { buscarRotina(); }, [buscarRotina]);

  // Meses disponíveis na rotina
  const mesesDisponiveis = (() => {
    const set = new Set();
    dias.forEach(d => {
      const dt = new Date(d.data + "T00:00:00");
      set.add(`${dt.getFullYear()}-${dt.getMonth()}`);
    });
    return [...set].map(s => {
      const [ano, mes] = s.split("-").map(Number);
      return { ano, mes };
    }).sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes);
  })();

  // Dias do mês atual visíveis na rotina
  const diasDoMes = dias.filter(d => {
    const dt = new Date(d.data + "T00:00:00");
    return dt.getFullYear() === mesAtual.ano && dt.getMonth() === mesAtual.mes;
  });

  const gerarDias = async () => {
    if (!startDate || !endDate) { toast("Selecione as duas datas!", "warning"); return; }
    if (startDate > endDate) { toast("Data inicial não pode ser maior que a final!", "warning"); return; }

    if (dias.length > 0) {
      const confirmado = window.confirm("Você já tem uma rotina! Deseja apagar tudo e criar uma nova?");
      if (!confirmado) return;
      const ids = dias.map((d) => d.id);
      await supabase.from("rotina_tarefas").delete().in("dia_id", ids);
      await supabase.from("rotina_dias").delete().eq("user_id", user.id);
    }

    setGerando(true);
    const datas = [];
    let cur = new Date(startDate + "T00:00:00");
    const fim = new Date(endDate + "T00:00:00");
    while (cur <= fim) { datas.push(formatarData(cur)); cur.setDate(cur.getDate() + 1); }

    const { error } = await supabase.from("rotina_dias")
      .insert(datas.map((data) => ({ user_id: user.id, data })));
    if (error) { toast("Erro ao gerar rotina: " + error.message, "error"); setGerando(false); return; }
    setGerando(false);
    toast(`Rotina gerada com ${datas.length} dias!`, "success");
    buscarRotina();
  };

  const adicionarTarefa = async (diaId, periodo) => {
    const key = `${diaId}_${periodo}`;
    const texto = (novasTarefas[key] || "").trim();
    if (!texto) return;
    const tarefasDoPeriodo = tarefas[diaId]?.[periodo] || [];
    const { data, error } = await supabase.from("rotina_tarefas")
      .insert([{ user_id: user.id, dia_id: diaId, periodo, texto, concluida: false, ordem: tarefasDoPeriodo.length }])
      .select();
    if (error) { toast("Erro: " + error.message, "error"); return; }
    setTarefas((prev) => ({ ...prev, [diaId]: { ...prev[diaId], [periodo]: [...(prev[diaId]?.[periodo] || []), data[0]] } }));
    setNovasTarefas((prev) => ({ ...prev, [key]: "" }));
  };

  const toggleTarefa = async (diaId, periodo, tarefa) => {
    const nova = !tarefa.concluida;
    await supabase.from("rotina_tarefas").update({ concluida: nova }).eq("id", tarefa.id);
    setTarefas((prev) => ({
      ...prev,
      [diaId]: { ...prev[diaId], [periodo]: prev[diaId][periodo].map((t) => t.id === tarefa.id ? { ...t, concluida: nova } : t) },
    }));
  };

  const deletarTarefa = async (diaId, periodo, tarefaId) => {
    const { error } = await supabase.from("rotina_tarefas").delete().eq("id", tarefaId);
    if (error) { toast("Erro ao deletar: " + error.message, "error"); return; }
    setTarefas((prev) => ({ ...prev, [diaId]: { ...prev[diaId], [periodo]: (prev[diaId]?.[periodo] || []).filter((t) => t.id !== tarefaId) } }));
  };

  const salvarEdicao = async (diaId, periodo, tarefa, novoTexto) => {
    if (!novoTexto.trim()) { deletarTarefa(diaId, periodo, tarefa.id); setEditando(null); return; }
    await supabase.from("rotina_tarefas").update({ texto: novoTexto.trim() }).eq("id", tarefa.id);
    setTarefas((prev) => ({
      ...prev,
      [diaId]: { ...prev[diaId], [periodo]: prev[diaId][periodo].map((t) => t.id === tarefa.id ? { ...t, texto: novoTexto.trim() } : t) },
    }));
    setEditando(null);
  };

  const resetarRotina = async () => {
    if (!window.confirm("Apagar toda a rotina? Isso não pode ser desfeito.")) return;
    const ids = dias.map((d) => d.id);
    await supabase.from("rotina_tarefas").delete().in("dia_id", ids);
    await supabase.from("rotina_dias").delete().eq("user_id", user.id);
    setDias([]); setTarefas({}); setDiaSelecionado(null);
    toast("Rotina resetada!", "info");
  };

  const confirmarClone = async (diaDestinoId) => {
    if (clonando) return;
    setClonando(true);
    const diaOrigemId = modalClone;
    setModalClone(null);
    const tarefasOrigem = PERIODOS.flatMap((p) => (tarefas[diaOrigemId]?.[p] || []).map((t) => ({ ...t, periodo: p })));
    if (tarefasOrigem.length === 0) { toast("Nenhuma tarefa para clonar!", "warning"); setClonando(false); return; }
    const novas = tarefasOrigem.map((t) => ({
      user_id: user.id, dia_id: diaDestinoId, periodo: t.periodo,
      texto: t.texto, concluida: false, ordem: tarefas[diaDestinoId]?.[t.periodo]?.length || 0,
    }));
    const { data, error } = await supabase.from("rotina_tarefas").insert(novas).select();
    if (error) { toast("Erro: " + error.message, "error"); setClonando(false); return; }
    setTarefas((prev) => {
      const novo = { ...prev };
      data.forEach((t) => {
        if (!novo[t.dia_id]) novo[t.dia_id] = {};
        if (!novo[t.dia_id][t.periodo]) novo[t.dia_id][t.periodo] = [];
        novo[t.dia_id][t.periodo].push(t);
      });
      return novo;
    });
    setClonando(false);
    toast(`${data.length} tarefa(s) clonada(s)!`, "success");
  };

  const handleDragEnd = async (diaId, periodo, event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const itens = tarefas[diaId]?.[periodo] || [];
    const oldIndex = itens.findIndex((t) => t.id === active.id);
    const newIndex = itens.findIndex((t) => t.id === over.id);
    const novaOrdem = arrayMove(itens, oldIndex, newIndex);
    setTarefas((prev) => ({ ...prev, [diaId]: { ...prev[diaId], [periodo]: novaOrdem } }));
    await Promise.all(novaOrdem.map((t, i) => supabase.from("rotina_tarefas").update({ ordem: i }).eq("id", t.id)));
  };

  const diaSel = dias.find((d) => d.id === diaSelecionado);

  const mesIdx = mesesDisponiveis.findIndex(m => m.ano === mesAtual.ano && m.mes === mesAtual.mes);
  const podePrev = mesIdx > 0;
  const podeNext = mesIdx < mesesDisponiveis.length - 1;

  if (carregando)
    return (
      <div style={{ textAlign: "center", color: "#64748b", paddingTop: 40 }}>
        Forjando sua rotina... 🧱
      </div>
    );

  return (
    <div className="rotina-section">
      {/* Modal clone */}
      {modalClone && (
        <div className="modal-overlay" onClick={() => setModalClone(null)}>
          <div className="modal-resumo" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1rem", marginBottom: 16 }}>⧉ Clonar tarefas para...</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto" }}>
              {dias.filter((d) => d.id !== modalClone).map((d) => (
                <button key={d.id} onClick={() => { if (!clonando) confirmarClone(d.id); }} style={{
                  background: "#24282d", border: "1px solid #ffffff0d", color: "#f8fafc",
                  borderRadius: 10, padding: "12px 16px", cursor: "pointer", textAlign: "left", fontSize: 14,
                }}>
                  <span style={{ color: "#6366f1", fontWeight: 700, marginRight: 8 }}>{labelData(d.data)}</span>
                  {new Date(d.data + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" })}
                </button>
              ))}
            </div>
            <button onClick={() => setModalClone(null)} style={{ marginTop: 14, background: "transparent", border: "1px solid #ffffff0d", color: "#64748b", borderRadius: 8, padding: "10px", cursor: "pointer", width: "100%" }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Config de datas */}
      <div className="rotina-config">
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 14 }}>
          <DatePicker label="DATA INICIAL" value={startDate} onChange={setStartDate} />
          <DatePicker label="DATA FINAL" value={endDate} onChange={setEndDate} minDate={startDate} />
        </div>
        <div className="rotina-config-btns">
          <button className="rotina-btn-gerar" onClick={gerarDias} disabled={gerando}>
            {gerando ? "Gerando..." : "+ Gerar Rotina"}
          </button>
          {dias.length > 0 && (
            <button className="rotina-btn-reset" onClick={resetarRotina}>Resetar</button>
          )}
        </div>
        {dias.length > 0 && (
          <div style={{ fontSize: 11, color: "#475569", marginTop: 8 }}>
            📋 {dias.length} dias · {new Date(dias[0].data + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} → {new Date(dias[dias.length-1].data + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
          </div>
        )}
      </div>

      {dias.length === 0 ? (
        <p className="empty-msg" style={{ marginTop: 40 }}>Nenhuma rotina gerada ainda. Selecione as datas acima! 📋</p>
      ) : (
        <>
          {/* Navegação de mês */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, background: "#1a1d21", border: "1px solid #ffffff0d", borderRadius: 12, padding: "10px 14px" }}>
            <button
              onClick={() => podePrev && setMesAtual(mesesDisponiveis[mesIdx - 1])}
              disabled={!podePrev}
              style={{ background: "none", border: "none", color: podePrev ? "#6366f1" : "#334155", fontSize: 20, cursor: podePrev ? "pointer" : "default", padding: "0 8px" }}
            >‹</button>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#f8fafc" }}>
                {MESES[mesAtual.mes]}
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{mesAtual.ano}</div>
            </div>
            <button
              onClick={() => podeNext && setMesAtual(mesesDisponiveis[mesIdx + 1])}
              disabled={!podeNext}
              style={{ background: "none", border: "none", color: podeNext ? "#6366f1" : "#334155", fontSize: 20, cursor: podeNext ? "pointer" : "default", padding: "0 8px" }}
            >›</button>
          </div>

          {/* Grade do mês */}
          <div className="rotina-grade">
            <div className="rotina-grade-header">
              {DOW.map((d) => <div key={d} className="rotina-grade-dow">{d}</div>)}
            </div>

            {(() => {
              if (diasDoMes.length === 0) return (
                <div style={{ textAlign: "center", color: "#475569", padding: "20px 0", fontSize: 13 }}>
                  Nenhum dia da rotina neste mês.
                </div>
              );

              // Calcula primeiro dia do mês
              const primeiroDia = new Date(mesAtual.ano, mesAtual.mes, 1);
              const firstDow = primeiroDia.getDay();

              // Monta todas as datas do mês calendário
              const diasNoMes = new Date(mesAtual.ano, mesAtual.mes + 1, 0).getDate();
              const todasDatas = Array.from({ length: diasNoMes }, (_, i) => {
                const d = new Date(mesAtual.ano, mesAtual.mes, i + 1);
                return formatarData(d);
              });

              const cells = [
                ...Array.from({ length: firstDow }, (_, i) => ({ vazio: true, key: `pre-${i}` })),
                ...todasDatas.map(data => {
                  const diaObj = diasDoMes.find(d => d.data === data);
                  return { vazio: false, data, diaObj };
                }),
              ];
              const resto = cells.length % 7;
              if (resto !== 0) for (let i = 0; i < 7 - resto; i++) cells.push({ vazio: true, key: `pos-${i}` });
              const semanasGrid = chunkArray(cells, 7);

              return semanasGrid.map((semana, si) => (
                <div key={si} className="rotina-grade-semana">
                  {semana.map((cell, ci) => {
                    if (cell.vazio) return <div key={cell.key || `${si}-${ci}`} className="rotina-grade-dia vazio" />;
                    const { data, diaObj } = cell;
                    const isHoje = data === hoje;
                    const isSel = diaObj?.id === diaSelecionado;
                    const fora = !diaObj;
                    const dayNum = new Date(data + "T00:00:00").getDate();
                    const totalT = diaObj ? PERIODOS.flatMap((p) => tarefas[diaObj.id]?.[p] || []).length : 0;
                    const concT = diaObj ? PERIODOS.flatMap((p) => tarefas[diaObj.id]?.[p] || []).filter(t => t.concluida).length : 0;

                    return (
                      <button
                        key={data}
                        className={`rotina-grade-dia ${isHoje ? "hoje" : ""} ${isSel ? "selecionado" : ""} ${fora ? "fora" : ""}`}
                        onClick={() => diaObj && setDiaSelecionado(isSel ? null : diaObj.id)}
                        style={{ opacity: fora ? 0.25 : 1, cursor: fora ? "default" : "pointer" }}
                      >
                        <span className="rotina-grade-num">{dayNum}</span>
                        {totalT > 0 && (
                          <div className="rotina-grade-dots">
                            <div className="rotina-grade-dot-bar" style={{ width: `${Math.round((concT / totalT) * 100)}%` }} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ));
            })()}
          </div>

          {/* Detalhe do dia selecionado */}
          {diaSel && (
            <div className={`rotina-dia ${diaSel.data === hoje ? "hoje" : ""}`}>
              <div className="rotina-dia-header">
                <div>
                  <div className="rotina-dia-label">{labelData(diaSel.data)}</div>
                  <div className="rotina-dia-data">
                    {new Date(diaSel.data + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {(() => {
                    const total = PERIODOS.flatMap((p) => tarefas[diaSel.id]?.[p] || []).length;
                    const conc = PERIODOS.flatMap((p) => tarefas[diaSel.id]?.[p] || []).filter((t) => t.concluida).length;
                    return total > 0 ? (
                      <div className="rotina-dia-prog">
                        <span>{conc}/{total}</span>
                        <div className="rotina-dia-prog-bar">
                          <div style={{ width: `${(conc / total) * 100}%` }} />
                        </div>
                      </div>
                    ) : null;
                  })()}
                  <button className="rotina-btn-clonar" onClick={() => setModalClone(diaSel.id)}>⧉</button>
                </div>
              </div>

              {PERIODOS.map((periodo) => {
                const key = `${diaSel.id}_${periodo}`;
                const itens = tarefas[diaSel.id]?.[periodo] || [];
                return (
                  <div key={periodo} className="rotina-periodo">
                    <div className="rotina-periodo-title">{periodo}</div>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(diaSel.id, periodo, e)}>
                      <SortableContext items={itens.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                        {itens.map((t) => (
                          <TarefaItem key={t.id} t={t} diaId={diaSel.id} periodo={periodo} editando={editando} setEditando={setEditando} toggleTarefa={toggleTarefa} salvarEdicao={salvarEdicao} deletarTarefa={deletarTarefa} />
                        ))}
                      </SortableContext>
                    </DndContext>
                    <div className="rotina-add-row">
                      <input
                        type="text"
                        className="rotina-add-input"
                        placeholder="+ Nova tarefa"
                        value={novasTarefas[key] || ""}
                        onChange={(e) => setNovasTarefas((prev) => ({ ...prev, [key]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") adicionarTarefa(diaSel.id, periodo); }}
                      />
                      <button className="rotina-add-btn" onClick={() => adicionarTarefa(diaSel.id, periodo)}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}