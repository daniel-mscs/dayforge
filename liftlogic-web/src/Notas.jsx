import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";
import { toast } from "./lib/toast";
import { askConfirm } from "./lib/confirm";
import { NotebookPen, Search, Trash2, Pencil, X } from "lucide-react";

const HUMORES = ["😞", "😐", "🙂", "😄"];

function dataLocal(d) {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
}

// tira acento e caixa pra busca ("reuniao" acha "Reunião")
const norm = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function tituloDia(data) {
  const hoje = dataLocal(new Date());
  const ontem = dataLocal(new Date(Date.now() - 86400000));
  if (data === hoje) return "Hoje";
  if (data === ontem) return "Ontem";
  const [y, m, d] = data.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: y === new Date().getFullYear() ? undefined : "numeric",
  });
}

function hora(iso) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Destacado({ texto, busca }) {
  const q = norm(busca.trim());
  if (!q) return texto;
  const alvo = norm(texto);
  const partes = [];
  let i = 0;
  while (i < texto.length) {
    const achou = alvo.indexOf(q, i);
    if (achou === -1) {
      partes.push(texto.slice(i));
      break;
    }
    if (achou > i) partes.push(texto.slice(i, achou));
    partes.push(
      <mark
        key={achou}
        style={{ background: "#fbbf2455", color: "#fde68a", borderRadius: 3 }}
      >
        {texto.slice(achou, achou + q.length)}
      </mark>,
    );
    i = achou + q.length;
  }
  return <>{partes}</>;
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
  fontFamily: "inherit",
};

// Campo de nota rápida (usado na Home e na aba)
export function NotaRapidaHomeCard({ user, onAbrir, desativado }) {
  const [texto, setTexto] = useState("");
  const [humor, setHumor] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [hojeQtd, setHojeQtd] = useState(0);

  useEffect(() => {
    supabase
      .from("notas_dia")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("data", dataLocal(new Date()))
      .then(({ count }) => setHojeQtd(count || 0));
  }, [user.id]);

  const salvar = async () => {
    if (!texto.trim()) return;
    setSalvando(true);
    const { error } = await supabase.from("notas_dia").insert([
      {
        user_id: user.id,
        texto: texto.trim(),
        humor,
        data: dataLocal(new Date()),
      },
    ]);
    setSalvando(false);
    if (error) return toast(error.message, "error");
    setTexto("");
    setHumor(null);
    setHojeQtd((n) => n + 1);
    toast("Nota salva 📝", "success");
  };

  return (
    <div className="home-card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div className="home-section-title">📝 NOTA RÁPIDA</div>
        <button
          onClick={() => !desativado && onAbrir()}
          style={{
            background: "transparent",
            border: "none",
            color: "#818cf8",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {hojeQtd > 0 ? `${hojeQtd} hoje · ver tudo` : "ver diário"}
        </button>
      </div>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        disabled={desativado}
        rows={2}
        placeholder="O que passou pela cabeça?"
        style={{ ...campo, resize: "none" }}
      />
      <div
        style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}
      >
        {HUMORES.map((h, i) => (
          <button
            key={h}
            onClick={() => setHumor(humor === i ? null : i)}
            style={{
              background: humor === i ? "#6366f133" : "transparent",
              border:
                humor === i ? "1px solid #6366f1" : "1px solid transparent",
              borderRadius: 8,
              fontSize: 18,
              padding: "2px 6px",
              cursor: "pointer",
            }}
          >
            {h}
          </button>
        ))}
        <button
          onClick={salvar}
          disabled={salvando || !texto.trim() || desativado}
          style={{
            marginLeft: "auto",
            background: texto.trim()
              ? "linear-gradient(135deg,#6366f1,#4f46e5)"
              : "#ffffff0d",
            border: "none",
            borderRadius: 10,
            color: texto.trim() ? "#fff" : "#64748b",
            fontWeight: 800,
            fontSize: 13,
            padding: "8px 16px",
            cursor: "pointer",
          }}
        >
          Salvar
        </button>
      </div>
    </div>
  );
}

export default function Notas({ user }) {
  const [notas, setNotas] = useState([]);
  const [busca, setBusca] = useState("");
  const [texto, setTexto] = useState("");
  const [humor, setHumor] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [textoEdit, setTextoEdit] = useState("");

  const buscar = useCallback(async () => {
    const { data, error } = await supabase
      .from("notas_dia")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) toast(error.message, "error");
    setNotas(data || []);
  }, [user.id]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  const adicionar = async () => {
    if (!texto.trim()) return;
    const { data, error } = await supabase
      .from("notas_dia")
      .insert([
        {
          user_id: user.id,
          texto: texto.trim(),
          humor,
          data: dataLocal(new Date()),
        },
      ])
      .select();
    if (error) return toast(error.message, "error");
    setNotas((prev) => [...data, ...prev]);
    setTexto("");
    setHumor(null);
  };

  const salvarEdicao = async (n) => {
    if (!textoEdit.trim()) return;
    const { error } = await supabase
      .from("notas_dia")
      .update({ texto: textoEdit.trim() })
      .eq("id", n.id);
    if (error) return toast(error.message, "error");
    setNotas((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, texto: textoEdit.trim() } : x)),
    );
    setEditandoId(null);
  };

  const apagar = async (n) => {
    const ok = await askConfirm("Apagar essa nota?");
    if (!ok) return;
    await supabase.from("notas_dia").delete().eq("id", n.id);
    setNotas((prev) => prev.filter((x) => x.id !== n.id));
  };

  const q = norm(busca.trim());
  const filtradas = q ? notas.filter((n) => norm(n.texto).includes(q)) : notas;

  const grupos = [];
  filtradas.forEach((n) => {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.data === n.data) ultimo.itens.push(n);
    else grupos.push({ data: n.data, itens: [n] });
  });

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 14,
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
        <NotebookPen size={20} color="#818cf8" />
        Diário
      </h2>

      <div
        style={{ ...card, display: "flex", flexDirection: "column", gap: 10 }}
      >
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={3}
          placeholder="Escreve aí: ideia, desabafo, algo que aprendeu..."
          style={{ ...campo, resize: "vertical" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {HUMORES.map((h, i) => (
            <button
              key={h}
              onClick={() => setHumor(humor === i ? null : i)}
              style={{
                background: humor === i ? "#6366f133" : "transparent",
                border:
                  humor === i ? "1px solid #6366f1" : "1px solid transparent",
                borderRadius: 8,
                fontSize: 20,
                padding: "2px 6px",
                cursor: "pointer",
              }}
            >
              {h}
            </button>
          ))}
          <button
            onClick={adicionar}
            disabled={!texto.trim()}
            style={{
              marginLeft: "auto",
              background: texto.trim()
                ? "linear-gradient(135deg,#10b981,#059669)"
                : "#ffffff0d",
              border: "none",
              borderRadius: 10,
              color: texto.trim() ? "#fff" : "#64748b",
              fontWeight: 800,
              fontSize: 14,
              padding: "10px 20px",
              cursor: "pointer",
            }}
          >
            Salvar
          </button>
        </div>
      </div>

      <div style={{ position: "relative" }}>
        <Search
          size={16}
          color="#64748b"
          style={{ position: "absolute", left: 12, top: 12 }}
        />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar nas notas..."
          style={{ ...campo, paddingLeft: 36, paddingRight: 36 }}
        />
        {busca && (
          <button
            onClick={() => setBusca("")}
            aria-label="Limpar busca"
            style={{
              position: "absolute",
              right: 8,
              top: 8,
              background: "transparent",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>
      {q && (
        <div style={{ fontSize: 12, color: "#64748b" }}>
          {filtradas.length}{" "}
          {filtradas.length === 1 ? "resultado" : "resultados"}
        </div>
      )}

      {grupos.length === 0 && (
        <div
          style={{
            ...card,
            textAlign: "center",
            color: "#64748b",
            fontSize: 13,
          }}
        >
          {q ? "Nada encontrado." : "Nenhuma nota ainda. Escreve a primeira ✍️"}
        </div>
      )}

      {grupos.map((g) => (
        <div key={g.data}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.06em",
              color: "#64748b",
              margin: "0 0 6px 4px",
              textTransform: "uppercase",
            }}
          >
            {tituloDia(g.data)}
          </div>
          <div style={{ ...card, padding: "4px 14px" }}>
            {g.itens.map((n, i) => (
              <div
                key={n.id}
                style={{
                  padding: "10px 0",
                  borderTop: i === 0 ? "none" : "1px solid #ffffff08",
                }}
              >
                {editandoId === n.id ? (
                  <>
                    <textarea
                      value={textoEdit}
                      onChange={(e) => setTextoEdit(e.target.value)}
                      rows={3}
                      style={{ ...campo, resize: "vertical" }}
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <button
                        onClick={() => salvarEdicao(n)}
                        style={{
                          background: "#10b981",
                          border: "none",
                          borderRadius: 8,
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: 12,
                          padding: "6px 14px",
                          cursor: "pointer",
                        }}
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => setEditandoId(null)}
                        style={{
                          background: "transparent",
                          border: "1px solid #ffffff1a",
                          borderRadius: 8,
                          color: "#94a3b8",
                          fontSize: 12,
                          padding: "6px 14px",
                          cursor: "pointer",
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          color: "#e2e8f0",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        <Destacado texto={n.texto} busca={busca} />
                      </div>
                      <div
                        style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}
                      >
                        {hora(n.created_at)}
                        {n.humor != null && ` · ${HUMORES[n.humor]}`}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setEditandoId(n.id);
                        setTextoEdit(n.texto);
                      }}
                      aria-label="Editar"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#64748b",
                        cursor: "pointer",
                        padding: 4,
                      }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => apagar(n)}
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
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
