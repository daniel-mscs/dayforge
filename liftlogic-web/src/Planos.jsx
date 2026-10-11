import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";
import { toast } from "./lib/toast";
import { askConfirm, askPrompt } from "./lib/confirm";
import { MODELOS_PLANO } from "./lib/planosModelos";
import { Interruptor, PainelDinheiro } from "./PlanosUI";
import {
  DndContext,
  closestCenter,
  MouseSensor,
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
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Check,
  Compass,
  PiggyBank,
  GripVertical,
} from "lucide-react";

function fmtBRL(v) {
  return Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dataLocalISO(d) {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
}

function prazoPadrao() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 4);
  return dataLocalISO(d);
}

// "daqui 3 anos e 8 meses", "daqui 5 meses", "prazo vencido"
function textoPrazo(prazo) {
  if (!prazo) return "sem prazo definido";
  const hoje = new Date();
  const [y, m, d] = prazo.split("-").map(Number);
  const alvo = new Date(y, m - 1, d);
  if (alvo < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()))
    return "prazo vencido";
  let meses =
    (alvo.getFullYear() - hoje.getFullYear()) * 12 +
    (alvo.getMonth() - hoje.getMonth());
  if (alvo.getDate() < hoje.getDate()) meses -= 1;
  if (meses < 1) {
    const dias = Math.ceil((alvo - hoje) / 86400000);
    return `daqui ${dias} ${dias === 1 ? "dia" : "dias"}`;
  }
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  const partes = [];
  if (anos) partes.push(`${anos} ${anos === 1 ? "ano" : "anos"}`);
  if (resto) partes.push(`${resto} ${resto === 1 ? "mês" : "meses"}`);
  return `daqui ${partes.join(" e ")}`;
}

function dataBonita(prazo) {
  if (!prazo) return "";
  const [y, m, d] = prazo.split("-");
  return `${d}/${m}/${y}`;
}

const card = {
  background: "linear-gradient(155deg, #1c2026, #17191d)",
  border: "1px solid #ffffff10",
  borderRadius: 16,
  padding: 14,
  boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  background: "#0f1115",
  border: "1px solid #ffffff14",
  borderRadius: 10,
  color: "#f8fafc",
  fontSize: 14,
  padding: "10px 12px",
};

const iconBtn = {
  background: "transparent",
  border: "none",
  color: "#64748b",
  cursor: "pointer",
  padding: 6,
  display: "flex",
  alignItems: "center",
};

// Envolve algo que pode ser arrastado pra reordenar. O `alca` vai no
// ícone de arrastar — só ele inicia o arrasto, então rolar a tela não
// mexe em nada sem querer.
function Ordenavel({ id, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        position: "relative",
        zIndex: isDragging ? 5 : "auto",
      }}
    >
      {children({ alca: { ...attributes, ...listeners } })}
    </div>
  );
}

function Alca({ props, tamanho = 16 }) {
  return (
    <span
      {...props}
      title="Segure e arraste pra mudar a ordem"
      style={{
        display: "flex",
        alignItems: "center",
        padding: "6px 4px",
        color: "#64748b",
        cursor: "grab",
        touchAction: "manipulation",
        userSelect: "none",
        WebkitUserSelect: "none",
        flexShrink: 0,
      }}
    >
      <GripVertical size={tamanho} />
    </span>
  );
}

function Barra({ pct, cor = "#6366f1", altura = 8 }) {
  return (
    <div
      style={{
        height: altura,
        background: "#ffffff0d",
        borderRadius: 999,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.max(0, Math.min(100, pct))}%`,
          height: "100%",
          background: cor,
          borderRadius: 999,
          transition: "width 0.3s",
        }}
      />
    </div>
  );
}

export default function Planos({ user }) {
  const [planos, setPlanos] = useState([]);
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [abertoId, setAbertoId] = useState(null);

  // criar plano
  const [criando, setCriando] = useState(false);
  const [modeloId, setModeloId] = useState("viagem");
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novoPrazo, setNovoPrazo] = useState(prazoPadrao());
  const [salvando, setSalvando] = useState(false);

  // edição de item
  const [editando, setEditando] = useState(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 300, tolerance: 6 },
    }),
  );

  const buscar = useCallback(async () => {
    const [{ data: p, error: e1 }, { data: i, error: e2 }] = await Promise.all([
      supabase
        .from("planos")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("plano_itens")
        .select("*")
        .eq("user_id", user.id)
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);
    if (e1 || e2) toast((e1 || e2).message, "error");
    setPlanos(p || []);
    setItens(i || []);
    setCarregando(false);
  }, [user.id]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  const escolherModelo = (id) => {
    setModeloId(id);
    const m = MODELOS_PLANO.find((x) => x.id === id);
    setNovoTitulo(m?.tituloSugerido || "");
  };

  const abrirCriar = () => {
    escolherModelo("viagem");
    setNovoPrazo(prazoPadrao());
    setCriando(true);
  };

  const criarPlano = async () => {
    if (!novoTitulo.trim()) return toast("Dê um nome pro plano!", "error");
    setSalvando(true);
    const modelo = MODELOS_PLANO.find((m) => m.id === modeloId);
    const { data, error } = await supabase
      .from("planos")
      .insert([
        {
          user_id: user.id,
          titulo: novoTitulo.trim(),
          emoji: modelo.emoji,
          prazo: novoPrazo || null,
        },
      ])
      .select();
    if (error) {
      setSalvando(false);
      return toast(error.message, "error");
    }
    const plano = data[0];
    let ordem = 0;
    const linhas = [];
    Object.entries(modelo.grupos).forEach(([grupo, lista]) => {
      lista.forEach((it) => {
        linhas.push({
          plano_id: plano.id,
          user_id: user.id,
          grupo,
          texto: it.texto,
          valor_alvo: it.valor ? 0 : null,
          valor_atual: 0,
          ordem: ordem++,
        });
      });
    });
    let novosItens = [];
    if (linhas.length > 0) {
      const { data: ins, error: err2 } = await supabase
        .from("plano_itens")
        .insert(linhas)
        .select();
      if (err2) toast(err2.message, "error");
      novosItens = ins || [];
    }
    setPlanos((prev) => [...prev, plano]);
    setItens((prev) => [...prev, ...novosItens]);
    setCriando(false);
    setSalvando(false);
    setAbertoId(plano.id);
    toast("Plano criado! 🎯", "success");
  };

  const plano = planos.find((p) => p.id === abertoId);
  const itensDoPlano = itens
    .filter((i) => i.plano_id === abertoId)
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  // Grava a nova ordem (lista completa do plano, já na ordem desejada).
  const salvarOrdem = async (listaNova) => {
    const mudancas = [];
    const mapaOrdem = {};
    listaNova.forEach((it, idx) => {
      mapaOrdem[it.id] = idx;
      if ((it.ordem || 0) !== idx) mudancas.push({ id: it.id, ordem: idx });
    });
    if (mudancas.length === 0) return;
    setItens((prev) =>
      prev.map((i) =>
        mapaOrdem[i.id] !== undefined ? { ...i, ordem: mapaOrdem[i.id] } : i,
      ),
    );
    const resultados = await Promise.all(
      mudancas.map((m) =>
        supabase.from("plano_itens").update({ ordem: m.ordem }).eq("id", m.id),
      ),
    );
    if (resultados.some((r) => r.error)) {
      toast("Não consegui salvar a nova ordem", "error");
      buscar();
    }
  };

  const reordenarGrupos = (event, grupos) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = grupos.map((g) => "g:" + g);
    const de = ids.indexOf(active.id);
    const para = ids.indexOf(over.id);
    if (de < 0 || para < 0) return;
    const novaOrdemGrupos = arrayMove(grupos, de, para);
    salvarOrdem(
      novaOrdemGrupos.flatMap((g) => itensDoPlano.filter((i) => i.grupo === g)),
    );
  };

  const reordenarItens = (event, grupo, grupos) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const lista = itensDoPlano.filter((i) => i.grupo === grupo);
    const de = lista.findIndex((i) => i.id === active.id);
    const para = lista.findIndex((i) => i.id === over.id);
    if (de < 0 || para < 0) return;
    const listaNova = arrayMove(lista, de, para);
    salvarOrdem(
      grupos.flatMap((g) =>
        g === grupo ? listaNova : itensDoPlano.filter((i) => i.grupo === g),
      ),
    );
  };

  const progresso = (lista) => {
    const total = lista.length;
    const feitos = lista.filter((i) => i.feito).length;
    return { total, feitos, pct: total ? (feitos / total) * 100 : 0 };
  };

  // ── ações do plano ──
  const renomearPlano = async () => {
    const t = await askPrompt("Novo nome do plano:", plano.titulo);
    if (!t || !t.trim()) return;
    await supabase
      .from("planos")
      .update({ titulo: t.trim() })
      .eq("id", plano.id);
    setPlanos((prev) =>
      prev.map((p) => (p.id === plano.id ? { ...p, titulo: t.trim() } : p)),
    );
  };

  const mudarPrazo = async (valor) => {
    await supabase
      .from("planos")
      .update({ prazo: valor || null })
      .eq("id", plano.id);
    setPlanos((prev) =>
      prev.map((p) => (p.id === plano.id ? { ...p, prazo: valor || null } : p)),
    );
  };

  const apagarPlano = async () => {
    const ok = await askConfirm(
      `Apagar o plano "${plano.titulo}" e todos os itens dele?`,
    );
    if (!ok) return;
    await supabase.from("planos").delete().eq("id", plano.id);
    setPlanos((prev) => prev.filter((p) => p.id !== plano.id));
    setItens((prev) => prev.filter((i) => i.plano_id !== plano.id));
    setAbertoId(null);
  };

  // ── ações dos itens ──
  const alternarFeito = async (item) => {
    const novo = !item.feito;
    setItens((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, feito: novo } : i)),
    );
    const { error } = await supabase
      .from("plano_itens")
      .update({ feito: novo })
      .eq("id", item.id);
    if (error) {
      toast(error.message, "error");
      setItens((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, feito: item.feito } : i)),
      );
    }
  };

  const adicionarItem = async (grupo) => {
    const texto = await askPrompt(`Novo item em "${grupo}":`, "");
    if (!texto || !texto.trim()) return;
    const ordem = itens.length
      ? Math.max(...itens.map((i) => i.ordem || 0)) + 1
      : 0;
    const { data, error } = await supabase
      .from("plano_itens")
      .insert([
        {
          plano_id: plano.id,
          user_id: user.id,
          grupo,
          texto: texto.trim(),
          valor_atual: 0,
          ordem,
        },
      ])
      .select();
    if (error) return toast(error.message, "error");
    setItens((prev) => [...prev, data[0]]);
  };

  const novoGrupo = async () => {
    const nome = await askPrompt("Nome do novo grupo (ex: Documentos):", "");
    if (!nome || !nome.trim()) return;
    await adicionarItem(nome.trim());
  };

  const renomearGrupo = async (grupo) => {
    const nome = await askPrompt("Novo nome do grupo:", grupo);
    if (!nome || !nome.trim() || nome.trim() === grupo) return;
    const { error } = await supabase
      .from("plano_itens")
      .update({ grupo: nome.trim() })
      .eq("plano_id", plano.id)
      .eq("grupo", grupo);
    if (error) return toast(error.message, "error");
    setItens((prev) =>
      prev.map((i) =>
        i.plano_id === plano.id && i.grupo === grupo
          ? { ...i, grupo: nome.trim() }
          : i,
      ),
    );
  };

  const apagarGrupo = async (grupo) => {
    const ok = await askConfirm(`Apagar o grupo "${grupo}" e os itens dele?`);
    if (!ok) return;
    await supabase
      .from("plano_itens")
      .delete()
      .eq("plano_id", plano.id)
      .eq("grupo", grupo);
    setItens((prev) =>
      prev.filter((i) => !(i.plano_id === plano.id && i.grupo === grupo)),
    );
  };

  const apagarItem = async (item) => {
    await supabase.from("plano_itens").delete().eq("id", item.id);
    setItens((prev) => prev.filter((i) => i.id !== item.id));
    setEditando(null);
  };

  const abrirEdicao = (item) =>
    setEditando({
      id: item.id,
      texto: item.texto,
      grupo: item.grupo,
      usaValor: item.valor_alvo !== null && item.valor_alvo !== undefined,
      alvo: item.valor_alvo ?? "",
      atual: item.valor_atual ?? 0,
    });

  const salvarEdicao = async () => {
    if (!editando.texto.trim())
      return toast("O item precisa de um texto!", "error");
    const payload = {
      texto: editando.texto.trim(),
      grupo: (editando.grupo || "Geral").trim() || "Geral",
      valor_alvo: editando.usaValor ? parseFloat(editando.alvo) || 0 : null,
      valor_atual: editando.usaValor ? parseFloat(editando.atual) || 0 : 0,
    };
    const { error } = await supabase
      .from("plano_itens")
      .update(payload)
      .eq("id", editando.id);
    if (error) return toast(error.message, "error");
    setItens((prev) =>
      prev.map((i) => (i.id === editando.id ? { ...i, ...payload } : i)),
    );
    setEditando(null);
  };

  const guardarValor = async (item) => {
    const v = await askPrompt(
      `Quanto você guardou agora para "${item.texto}"? (R$)`,
      "",
    );
    const n = parseFloat(String(v || "").replace(",", "."));
    if (!n || n <= 0) return;
    const novo = Number(item.valor_atual || 0) + n;
    const { error } = await supabase
      .from("plano_itens")
      .update({ valor_atual: novo })
      .eq("id", item.id);
    if (error) return toast(error.message, "error");
    setItens((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, valor_atual: novo } : i)),
    );
    toast("Valor somado! 💰", "success");
  };

  if (carregando)
    return (
      <div style={{ textAlign: "center", color: "#64748b", padding: 40 }}>
        Carregando planos...
      </div>
    );

  // ───────────────────────── DETALHE DO PLANO ─────────────────────────
  if (plano) {
    const prog = progresso(itensDoPlano);
    const grupos = [];
    itensDoPlano.forEach((i) => {
      if (!grupos.includes(i.grupo)) grupos.push(i.grupo);
    });
    const comValor = itensDoPlano.filter(
      (i) => i.valor_alvo !== null && i.valor_alvo !== undefined,
    );
    const totalAlvo = comValor.reduce(
      (s, i) => s + Number(i.valor_alvo || 0),
      0,
    );
    const totalAtual = comValor.reduce(
      (s, i) => s + Number(i.valor_atual || 0),
      0,
    );

    return (
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button style={iconBtn} onClick={() => setAbertoId(null)}>
            <ArrowLeft size={20} />
          </button>
          <h2
            style={{
              margin: 0,
              fontSize: "1.1rem",
              color: "#f8fafc",
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {plano.emoji} {plano.titulo}
          </h2>
          <button style={iconBtn} onClick={renomearPlano} title="Renomear">
            <Pencil size={16} />
          </button>
          <button
            style={{ ...iconBtn, color: "#ef4444" }}
            onClick={apagarPlano}
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div style={card}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 8,
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: "#a5b4fc" }}>
              {textoPrazo(plano.prazo)}
            </span>
            <label style={{ fontSize: 11, color: "#64748b" }}>
              Prazo:{" "}
              <input
                type="date"
                value={plano.prazo || ""}
                onChange={(e) => mudarPrazo(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px dashed #475569",
                  color: "#f8fafc",
                  fontSize: 12,
                }}
              />
            </label>
          </div>
          <Barra pct={prog.pct} />
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
            {prog.feitos} de {prog.total} itens concluídos (
            {Math.round(prog.pct)}%)
          </div>
          {comValor.length > 0 && totalAlvo > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                💰 Juntado: {fmtBRL(totalAtual)} de {fmtBRL(totalAlvo)}
              </div>
              <Barra
                pct={(totalAtual / totalAlvo) * 100}
                cor="#10b981"
                altura={6}
              />
            </div>
          )}
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e) => reordenarGrupos(e, grupos)}
        >
          <SortableContext
            items={grupos.map((g) => "g:" + g)}
            strategy={verticalListSortingStrategy}
          >
            {grupos.map((grupo) => {
              const lista = itensDoPlano.filter((i) => i.grupo === grupo);
              const p = progresso(lista);
              return (
                <Ordenavel key={grupo} id={"g:" + grupo}>
                  {({ alca: alcaGrupo }) => (
                    <div style={card}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: 10,
                        }}
                      >
                        <Alca props={alcaGrupo} tamanho={18} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              letterSpacing: "0.08em",
                              color: "#64748b",
                              textTransform: "uppercase",
                            }}
                          >
                            {grupo}
                          </div>
                          <div style={{ fontSize: 10, color: "#475569" }}>
                            {p.feitos}/{p.total}
                          </div>
                        </div>
                        <button
                          style={iconBtn}
                          onClick={() => renomearGrupo(grupo)}
                          title="Renomear grupo"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          style={{ ...iconBtn, color: "#7f1d1d" }}
                          onClick={() => apagarGrupo(grupo)}
                          title="Apagar grupo"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(e) => reordenarItens(e, grupo, grupos)}
                      >
                        <SortableContext
                          items={lista.map((i) => i.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {lista.map((item) => {
                            const temValor =
                              item.valor_alvo !== null &&
                              item.valor_alvo !== undefined;
                            const pctValor =
                              temValor && Number(item.valor_alvo) > 0
                                ? (Number(item.valor_atual || 0) /
                                    Number(item.valor_alvo)) *
                                  100
                                : 0;
                            const emEdicao = editando?.id === item.id;
                            return (
                              <Ordenavel key={item.id} id={item.id}>
                                {({ alca: alcaItem }) => (
                                  <div
                                    style={{
                                      borderTop: "1px solid #ffffff08",
                                      padding: "10px 0",
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: 10,
                                      }}
                                    >
                                      <button
                                        onClick={() => alternarFeito(item)}
                                        aria-label={
                                          item.feito
                                            ? "Desmarcar"
                                            : "Marcar como feito"
                                        }
                                        style={{
                                          flexShrink: 0,
                                          width: 24,
                                          height: 24,
                                          marginTop: 1,
                                          borderRadius: 7,
                                          border: item.feito
                                            ? "1px solid #10b981"
                                            : "1px solid #475569",
                                          background: item.feito
                                            ? "#10b981"
                                            : "transparent",
                                          color: "#fff",
                                          cursor: "pointer",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          padding: 0,
                                        }}
                                      >
                                        {item.feito && (
                                          <Check size={15} strokeWidth={3} />
                                        )}
                                      </button>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                          style={{
                                            fontSize: 14,
                                            color: item.feito
                                              ? "#64748b"
                                              : "#f8fafc",
                                            textDecoration: item.feito
                                              ? "line-through"
                                              : "none",
                                            lineHeight: 1.35,
                                          }}
                                        >
                                          {item.texto}
                                        </div>
                                        {temValor && (
                                          <div style={{ marginTop: 6 }}>
                                            <div
                                              style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                fontSize: 11,
                                                color: "#94a3b8",
                                                marginBottom: 3,
                                              }}
                                            >
                                              <span>
                                                {fmtBRL(item.valor_atual)}
                                              </span>
                                              <span>
                                                {Number(item.valor_alvo) > 0
                                                  ? `meta ${fmtBRL(item.valor_alvo)}`
                                                  : "defina a meta em ✎"}
                                              </span>
                                            </div>
                                            <Barra
                                              pct={pctValor}
                                              cor="#10b981"
                                              altura={5}
                                            />
                                            <button
                                              onClick={() => guardarValor(item)}
                                              style={{
                                                marginTop: 6,
                                                background:
                                                  "rgba(16,185,129,0.1)",
                                                border:
                                                  "1px solid rgba(16,185,129,0.3)",
                                                borderRadius: 8,
                                                color: "#34d399",
                                                fontSize: 11,
                                                fontWeight: 700,
                                                padding: "5px 10px",
                                                cursor: "pointer",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 5,
                                              }}
                                            >
                                              <PiggyBank size={12} /> Guardei
                                              mais
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                      <Alca props={alcaItem} />
                                      <button
                                        style={iconBtn}
                                        onClick={() =>
                                          emEdicao
                                            ? setEditando(null)
                                            : abrirEdicao(item)
                                        }
                                        title="Editar"
                                      >
                                        <Pencil size={14} />
                                      </button>
                                    </div>

                                    {emEdicao && (
                                      <div
                                        style={{
                                          marginTop: 10,
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: 8,
                                          background: "#0f1115",
                                          border: "1px solid #ffffff10",
                                          borderRadius: 12,
                                          padding: 10,
                                        }}
                                      >
                                        <input
                                          style={inputStyle}
                                          value={editando.texto}
                                          onChange={(e) =>
                                            setEditando({
                                              ...editando,
                                              texto: e.target.value,
                                            })
                                          }
                                          placeholder="O que precisa ser feito"
                                        />
                                        <input
                                          style={inputStyle}
                                          list="planos-grupos"
                                          value={editando.grupo}
                                          onChange={(e) =>
                                            setEditando({
                                              ...editando,
                                              grupo: e.target.value,
                                            })
                                          }
                                          placeholder="Grupo (ex: Dinheiro)"
                                        />
                                        <datalist id="planos-grupos">
                                          {grupos.map((g) => (
                                            <option key={g} value={g} />
                                          ))}
                                        </datalist>
                                        <Interruptor
                                          ligado={editando.usaValor}
                                          onChange={(v) => setEditando({ ...editando, usaValor: v })}
                                          titulo="Juntar dinheiro"
                                          sub="Acompanhe meta e quanto já guardou"
                                        />
                                        {editando.usaValor && (
                                          <PainelDinheiro editando={editando} setEditando={setEditando} />
                                        )}
                                        <div
                                          style={{ display: "flex", gap: 8 }}
                                        >
                                          <button
                                            onClick={salvarEdicao}
                                            style={{
                                              flex: 1,
                                              background:
                                                "linear-gradient(135deg,#6366f1,#4f46e5)",
                                              border: "none",
                                              borderRadius: 10,
                                              color: "#fff",
                                              fontWeight: 700,
                                              fontSize: 13,
                                              padding: "10px 0",
                                              cursor: "pointer",
                                            }}
                                          >
                                            Salvar
                                          </button>
                                          <button
                                            onClick={() => setEditando(null)}
                                            style={{
                                              flex: 1,
                                              background: "transparent",
                                              border: "1px solid #ffffff14",
                                              borderRadius: 10,
                                              color: "#94a3b8",
                                              fontSize: 13,
                                              padding: "10px 0",
                                              cursor: "pointer",
                                            }}
                                          >
                                            Cancelar
                                          </button>
                                          <button
                                            onClick={() => apagarItem(item)}
                                            style={{
                                              background: "transparent",
                                              border: "1px solid #7f1d1d",
                                              borderRadius: 10,
                                              color: "#ef4444",
                                              padding: "10px 14px",
                                              cursor: "pointer",
                                            }}
                                            aria-label="Apagar item"
                                          >
                                            <Trash2 size={15} />
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Ordenavel>
                            );
                          })}
                        </SortableContext>
                      </DndContext>

                      <button
                        onClick={() => adicionarItem(grupo)}
                        style={{
                          marginTop: 6,
                          width: "100%",
                          background: "transparent",
                          border: "1px dashed #ffffff1a",
                          borderRadius: 10,
                          color: "#818cf8",
                          fontSize: 12,
                          fontWeight: 700,
                          padding: "9px 0",
                          cursor: "pointer",
                        }}
                      >
                        + Adicionar item
                      </button>
                    </div>
                  )}
                </Ordenavel>
              );
            })}
          </SortableContext>
        </DndContext>

        <button
          onClick={novoGrupo}
          style={{
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.3)",
            borderRadius: 12,
            color: "#a5b4fc",
            fontSize: 13,
            fontWeight: 700,
            padding: "12px 0",
            cursor: "pointer",
          }}
        >
          + Novo grupo
        </button>
      </div>
    );
  }

  // ───────────────────────── LISTA DE PLANOS ─────────────────────────
  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2
          className="title-divisao"
          style={{
            margin: 0,
            fontSize: "1.2rem",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Compass size={20} color="#818cf8" />
          Planos
        </h2>
        {!criando && (
          <button
            onClick={abrirCriar}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: "linear-gradient(135deg,#6366f1,#4f46e5)",
              border: "none",
              borderRadius: 10,
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            <Plus size={14} /> Novo plano
          </button>
        )}
      </div>

      {criando && (
        <div
          style={{ ...card, display: "flex", flexDirection: "column", gap: 10 }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "#64748b",
            }}
          >
            COMEÇAR DE UM MODELO
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {MODELOS_PLANO.map((m) => (
              <button
                key={m.id}
                onClick={() => escolherModelo(m.id)}
                style={{
                  flex: "1 1 30%",
                  background:
                    modeloId === m.id ? "rgba(99,102,241,0.2)" : "#0f1115",
                  border:
                    modeloId === m.id
                      ? "1px solid #6366f1"
                      : "1px solid #ffffff14",
                  borderRadius: 12,
                  color: "#f8fafc",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "12px 6px",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 22 }}>{m.emoji}</div>
                {m.nome}
              </button>
            ))}
          </div>
          <input
            style={inputStyle}
            value={novoTitulo}
            onChange={(e) => setNovoTitulo(e.target.value)}
            placeholder="Nome do plano"
          />
          <label style={{ fontSize: 12, color: "#94a3b8" }}>
            Prazo (padrão: 4 anos):
            <input
              style={{ ...inputStyle, marginTop: 4 }}
              type="date"
              value={novoPrazo}
              onChange={(e) => setNovoPrazo(e.target.value)}
            />
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={criarPlano}
              disabled={salvando}
              style={{
                flex: 1,
                background: "linear-gradient(135deg,#10b981,#059669)",
                border: "none",
                borderRadius: 10,
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                padding: "11px 0",
                cursor: "pointer",
              }}
            >
              {salvando ? "Criando..." : "Criar plano"}
            </button>
            <button
              onClick={() => setCriando(false)}
              style={{
                flex: 1,
                background: "transparent",
                border: "1px solid #ffffff14",
                borderRadius: 10,
                color: "#94a3b8",
                fontSize: 13,
                padding: "11px 0",
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
          </div>
          <div style={{ fontSize: 11, color: "#64748b" }}>
            Os itens do modelo são só um ponto de partida: depois você edita,
            apaga ou adiciona o que quiser.
          </div>
        </div>
      )}

      {planos.length === 0 && !criando && (
        <div
          style={{
            ...card,
            textAlign: "center",
            color: "#94a3b8",
            fontSize: 14,
          }}
        >
          Nenhum plano ainda. Crie um para uma viagem, para morar fora ou para
          qualquer objetivo de longo prazo, com checklist do que precisa juntar,
          ter e resolver.
        </div>
      )}

      {planos.map((p) => {
        const lista = itens.filter((i) => i.plano_id === p.id);
        const prog = progresso(lista);
        return (
          <button
            key={p.id}
            onClick={() => setAbertoId(p.id)}
            style={{
              ...card,
              textAlign: "left",
              cursor: "pointer",
              color: "inherit",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <span style={{ fontSize: 26 }}>{p.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{ fontSize: 15, fontWeight: 700, color: "#f8fafc" }}
                >
                  {p.titulo}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>
                  {textoPrazo(p.prazo)}
                  {p.prazo ? ` · ${dataBonita(p.prazo)}` : ""}
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#a5b4fc" }}>
                {Math.round(prog.pct)}%
              </span>
            </div>
            <Barra pct={prog.pct} />
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>
              {prog.feitos} de {prog.total} itens
            </div>
          </button>
        );
      })}
    </div>
  );
}
