import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";
import { toast } from "./lib/toast";
import { askConfirm } from "./lib/confirm";
import { GraduationCap, Plus, Trash2, Check } from "lucide-react";

const TIPOS = [
  { id: "trabalho", label: "Trabalho", emoji: "📝" },
  { id: "prova", label: "Prova", emoji: "📚" },
  { id: "pratica", label: "Prática", emoji: "🧪" },
  { id: "outro", label: "Outro", emoji: "📌" },
];

function dataLocal(d) {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
}

export function diasAte(prazo) {
  const [a, m, d] = prazo.split("-").map(Number);
  const alvo = new Date(a, m - 1, d);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((alvo - hoje) / 86400000);
}

export function infoPrazo(prazo) {
  const n = diasAte(prazo);
  if (n < 0)
    return {
      n,
      texto: `Atrasada ${Math.abs(n)}d`,
      cor: "#f87171",
      bg: "rgba(239,68,68,0.12)",
    };
  if (n === 0)
    return { n, texto: "HOJE", cor: "#fbbf24", bg: "rgba(245,158,11,0.15)" };
  if (n === 1)
    return { n, texto: "Amanhã", cor: "#fbbf24", bg: "rgba(245,158,11,0.12)" };
  if (n <= 7)
    return {
      n,
      texto: `Em ${n} dias`,
      cor: "#fb923c",
      bg: "rgba(251,146,60,0.12)",
    };
  return {
    n,
    texto: `Em ${n} dias`,
    cor: "#a5b4fc",
    bg: "rgba(99,102,241,0.12)",
  };
}

function fmtData(prazo) {
  const [, m, d] = prazo.split("-");
  return `${d}/${m}`;
}

const card = {
  background: "linear-gradient(155deg, #1c2026, #17191d)",
  border: "1px solid #ffffff10",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
};

const campo = {
  width: "100%",
  boxSizing: "border-box",
  background: "#0f1115",
  border: "1px solid #ffffff14",
  borderRadius: 10,
  color: "#f8fafc",
  fontSize: 14,
  padding: "10px 12px",
};

const chip = (ativo) => ({
  background: ativo ? "#6366f133" : "#0f1115",
  border: ativo ? "1px solid #6366f1" : "1px solid #ffffff14",
  borderRadius: 999,
  color: ativo ? "#f8fafc" : "#94a3b8",
  fontSize: 12,
  fontWeight: 700,
  padding: "6px 12px",
  cursor: "pointer",
});

// Card compacto pra Home: só aparece se tiver algo pendente nos próximos dias
export function FaculdadeHomeCard({ user, onAbrir, desativado }) {
  const [itens, setItens] = useState([]);

  const buscar = useCallback(async () => {
    const { data } = await supabase
      .from("faculdade_tarefas")
      .select("*")
      .eq("user_id", user.id)
      .eq("feito", false)
      .order("prazo", { ascending: true });
    setItens(data || []);
  }, [user.id]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  const proximas = itens.filter((t) => diasAte(t.prazo) <= 14);
  if (proximas.length === 0) return null;

  const marcar = async (e, t) => {
    e.stopPropagation();
    await supabase
      .from("faculdade_tarefas")
      .update({ feito: true })
      .eq("id", t.id);
    setItens((prev) => prev.filter((x) => x.id !== t.id));
    toast("Boa! Entregue ✅", "success");
  };

  return (
    <div
      className="home-card"
      onClick={() => !desativado && onAbrir()}
      style={{ cursor: "pointer" }}
    >
      <div className="home-section-title">🎓 FACULDADE</div>
      {proximas.slice(0, 4).map((t) => {
        const p = infoPrazo(t.prazo);
        const tipo = TIPOS.find((x) => x.id === t.tipo) || TIPOS[3];
        return (
          <div
            key={t.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 0",
              borderTop: "1px solid #ffffff08",
            }}
          >
            <button
              onClick={(e) => marcar(e, t)}
              aria-label="Marcar como feita"
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                border: "2px solid #475569",
                background: "transparent",
                cursor: "pointer",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  color: "#e2e8f0",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {tipo.emoji} {t.titulo}
              </div>
              {t.materia && (
                <div style={{ fontSize: 10, color: "#64748b" }}>
                  {t.materia}
                </div>
              )}
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: p.cor,
                background: p.bg,
                borderRadius: 999,
                padding: "3px 8px",
                whiteSpace: "nowrap",
              }}
            >
              {p.texto}
            </span>
          </div>
        );
      })}
      {proximas.length > 4 && (
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>
          + {proximas.length - 4} nos próximos dias
        </div>
      )}
    </div>
  );
}

export default function Faculdade({ user }) {
  const [itens, setItens] = useState([]);
  const [filtro, setFiltro] = useState("pendentes");
  const [abrindo, setAbrindo] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [materia, setMateria] = useState("");
  const [tipo, setTipo] = useState("trabalho");
  const [prazo, setPrazo] = useState(dataLocal(new Date()));

  const buscar = useCallback(async () => {
    const { data, error } = await supabase
      .from("faculdade_tarefas")
      .select("*")
      .eq("user_id", user.id)
      .order("prazo", { ascending: true });
    if (error) toast(error.message, "error");
    setItens(data || []);
  }, [user.id]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  const adicionar = async () => {
    if (!titulo.trim()) return toast("Dá um nome pra tarefa", "error");
    if (!prazo) return toast("Escolhe o prazo", "error");
    const { data, error } = await supabase
      .from("faculdade_tarefas")
      .insert([
        {
          user_id: user.id,
          titulo: titulo.trim(),
          materia: materia.trim() || null,
          tipo,
          prazo,
          feito: false,
        },
      ])
      .select();
    if (error) return toast(error.message, "error");
    setItens((prev) =>
      [...prev, ...data].sort((a, b) => a.prazo.localeCompare(b.prazo)),
    );
    setTitulo("");
    setAbrindo(false);
    toast("Tarefa adicionada 🎓", "success");
  };

  const alternar = async (t) => {
    const novo = !t.feito;
    setItens((prev) =>
      prev.map((x) => (x.id === t.id ? { ...x, feito: novo } : x)),
    );
    await supabase
      .from("faculdade_tarefas")
      .update({ feito: novo })
      .eq("id", t.id);
  };

  const apagar = async (t) => {
    const ok = await askConfirm(`Apagar "${t.titulo}"?`);
    if (!ok) return;
    await supabase.from("faculdade_tarefas").delete().eq("id", t.id);
    setItens((prev) => prev.filter((x) => x.id !== t.id));
  };

  const pendentes = itens.filter((t) => !t.feito);
  const feitas = itens.filter((t) => t.feito).reverse();
  const lista = filtro === "pendentes" ? pendentes : feitas;
  const materiasUsadas = [
    ...new Set(itens.map((t) => t.materia).filter(Boolean)),
  ];
  const urgentes = pendentes.filter((t) => diasAte(t.prazo) <= 3).length;

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
          alignItems: "center",
          justifyContent: "space-between",
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
          <GraduationCap size={20} color="#818cf8" />
          Faculdade
        </h2>
        <button
          onClick={() => setAbrindo(!abrindo)}
          style={{
            background: "linear-gradient(135deg,#6366f1,#4f46e5)",
            border: "none",
            borderRadius: 10,
            color: "#fff",
            fontWeight: 800,
            fontSize: 13,
            padding: "8px 14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Plus size={15} /> Nova
        </button>
      </div>

      {urgentes > 0 && (
        <div
          style={{
            background: "rgba(245,158,11,0.12)",
            border: "1px solid rgba(245,158,11,0.4)",
            borderRadius: 12,
            padding: "10px 14px",
            color: "#fbbf24",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          ⚠️ {urgentes} {urgentes === 1 ? "item vence" : "itens vencem"} em até
          3 dias (ou já passaram)
        </div>
      )}

      {abrindo && (
        <div
          style={{ ...card, display: "flex", flexDirection: "column", gap: 10 }}
        >
          <input
            style={campo}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Roteiro de aula prática 3"
          />
          <input
            style={campo}
            value={materia}
            onChange={(e) => setMateria(e.target.value)}
            placeholder="Matéria (opcional)"
          />
          {materiasUsadas.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {materiasUsadas.map((m) => (
                <button
                  key={m}
                  style={chip(materia === m)}
                  onClick={() => setMateria(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TIPOS.map((t) => (
              <button
                key={t.id}
                style={chip(tipo === t.id)}
                onClick={() => setTipo(t.id)}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                color: "#64748b",
                fontWeight: 700,
                marginBottom: 4,
              }}
            >
              PRAZO
            </div>
            <input
              type="date"
              style={campo}
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
            />
          </div>
          <button
            onClick={adicionar}
            style={{
              background: "linear-gradient(135deg,#10b981,#059669)",
              border: "none",
              borderRadius: 10,
              color: "#fff",
              fontWeight: 800,
              fontSize: 14,
              padding: "12px 0",
              cursor: "pointer",
            }}
          >
            Salvar
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          style={chip(filtro === "pendentes")}
          onClick={() => setFiltro("pendentes")}
        >
          Pendentes ({pendentes.length})
        </button>
        <button
          style={chip(filtro === "feitas")}
          onClick={() => setFiltro("feitas")}
        >
          Entregues ({feitas.length})
        </button>
      </div>

      <div style={card}>
        {lista.length === 0 && (
          <div
            style={{
              color: "#64748b",
              fontSize: 13,
              textAlign: "center",
              padding: 12,
            }}
          >
            {filtro === "pendentes"
              ? "Nada pendente. Respira 😮‍💨"
              : "Nada entregue ainda."}
          </div>
        )}
        {lista.map((t, i) => {
          const p = infoPrazo(t.prazo);
          const tp = TIPOS.find((x) => x.id === t.tipo) || TIPOS[3];
          return (
            <div
              key={t.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 0",
                borderTop: i === 0 ? "none" : "1px solid #ffffff08",
              }}
            >
              <button
                onClick={() => alternar(t)}
                aria-label="Alternar entrega"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 7,
                  border: t.feito ? "2px solid #10b981" : "2px solid #475569",
                  background: t.feito ? "#10b981" : "transparent",
                  cursor: "pointer",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
              >
                {t.feito && <Check size={14} color="#fff" />}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    color: t.feito ? "#64748b" : "#e2e8f0",
                    textDecoration: t.feito ? "line-through" : "none",
                  }}
                >
                  {tp.emoji} {t.titulo}
                </div>
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  {t.materia ? `${t.materia} · ` : ""}
                  {fmtData(t.prazo)}
                </div>
              </div>
              {!t.feito && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: p.cor,
                    background: p.bg,
                    borderRadius: 999,
                    padding: "3px 8px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.texto}
                </span>
              )}
              <button
                onClick={() => apagar(t)}
                aria-label="Apagar"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#7f1d1d",
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
