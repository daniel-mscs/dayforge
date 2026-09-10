import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";
import { toast } from "./lib/toast";
import { askConfirm } from "./lib/confirm";
import { Target, Scale, Dumbbell, ListChecks, Plus } from "lucide-react";

function formatarData(date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().split("T")[0];
}

const TIPOS = [
  { id: "manual", label: "Manual (eu atualizo)", icon: ListChecks },
  { id: "peso", label: "Peso (automático)", icon: Scale },
  { id: "treinos", label: "Nº de treinos (automático)", icon: Dumbbell },
];

export default function MetasPessoais({ user }) {
  const [metas, setMetas] = useState([]);
  const [pesoAtual, setPesoAtual] = useState(null);
  const [treinosPorMeta, setTreinosPorMeta] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [contribuicaoInput, setContribuicaoInput] = useState({});

  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("manual");
  const [valorInicial, setValorInicial] = useState("");
  const [valorAlvo, setValorAlvo] = useState("");
  const [unidade, setUnidade] = useState("");
  const [dataPrazo, setDataPrazo] = useState("");

  const buscarTudo = useCallback(async () => {
    setCarregando(true);
    const [{ data: metasData }, { data: pesoData }] = await Promise.all([
      supabase
        .from("metas_pessoais")
        .select("*")
        .eq("user_id", user.id)
        .order("data_prazo", { ascending: true }),
      supabase
        .from("peso_registro")
        .select("peso")
        .eq("user_id", user.id)
        .order("data", { ascending: false })
        .limit(1),
    ]);
    setMetas(metasData || []);
    setPesoAtual(pesoData?.[0]?.peso ? Number(pesoData[0].peso) : null);

    const metasTreino = (metasData || []).filter((m) => m.tipo === "treinos");
    if (metasTreino.length > 0) {
      const contagens = {};
      await Promise.all(
        metasTreino.map(async (m) => {
          const { count } = await supabase
            .from("treinos_finalizados")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .gte("created_at", m.data_inicio + "T00:00:00");
          contagens[m.id] = count || 0;
        }),
      );
      setTreinosPorMeta(contagens);
    }
    setCarregando(false);
  }, [user.id]);

  useEffect(() => {
    buscarTudo();
  }, [buscarTudo]);

  const adicionarMeta = async () => {
    if (!titulo || !valorAlvo || !dataPrazo) {
      toast("Preencha nome, valor alvo e prazo!", "error");
      return;
    }
    const inicial =
      tipo === "peso"
        ? valorInicial
          ? parseFloat(valorInicial)
          : pesoAtual || 0
        : parseFloat(valorInicial || 0);
    const { data, error } = await supabase
      .from("metas_pessoais")
      .insert([
        {
          user_id: user.id,
          titulo,
          tipo,
          unidade,
          valor_inicial: inicial,
          valor_alvo: parseFloat(valorAlvo),
          valor_atual: inicial,
          data_inicio: formatarData(new Date()),
          data_prazo: dataPrazo,
        },
      ])
      .select();
    if (error) return toast(error.message, "error");
    setMetas((prev) => [...prev, data[0]]);
    setTitulo("");
    setValorInicial("");
    setValorAlvo("");
    setUnidade("");
    setDataPrazo("");
    setMostrarForm(false);
    toast("Meta criada! 🎯", "success");
  };

  const removerMeta = async (id) => {
    const ok = await askConfirm("Remover essa meta?");
    if (!ok) return;
    await supabase.from("metas_pessoais").delete().eq("id", id);
    setMetas((prev) => prev.filter((m) => m.id !== id));
  };

  const contribuirMeta = async (meta) => {
    const val = parseFloat(contribuicaoInput[meta.id]);
    if (!val) return toast("Digite um valor válido!", "error");
    const novoValor = Number(meta.valor_atual) + val;
    const { error } = await supabase
      .from("metas_pessoais")
      .update({ valor_atual: novoValor })
      .eq("id", meta.id);
    if (error) return toast(error.message, "error");
    setMetas((prev) =>
      prev.map((m) => (m.id === meta.id ? { ...m, valor_atual: novoValor } : m)),
    );
    setContribuicaoInput((prev) => ({ ...prev, [meta.id]: "" }));
  };

  if (carregando)
    return (
      <div style={{ textAlign: "center", color: "#64748b", padding: 40 }}>
        Carregando metas...
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {metas.length === 0 && !mostrarForm && (
        <div
          style={{
            background: "#1a1d21",
            border: "1px solid #ffffff0d",
            borderRadius: 16,
            padding: "28px 20px",
            textAlign: "center",
          }}
        >
          <Target size={32} color="#475569" style={{ marginBottom: 10 }} />
          <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>
            Nenhuma meta ainda. Crie uma com um prazo — tipo "perder 5kg até
            dezembro" — e acompanhe se tá no ritmo certo.
          </div>
        </div>
      )}

      {metas.map((m) => {
        const hoje = new Date();
        const inicio = new Date(m.data_inicio + "T00:00:00");
        const prazo = new Date(m.data_prazo + "T00:00:00");
        const diasTotais = Math.max(
          1,
          Math.round((prazo - inicio) / 86400000),
        );
        const diasPassados = Math.max(
          0,
          Math.round((hoje - inicio) / 86400000),
        );
        const diasRestantes = Math.round((prazo - hoje) / 86400000);
        const pctTempo = Math.min(100, (diasPassados / diasTotais) * 100);

        const valorAtualReal =
          m.tipo === "peso"
            ? (pesoAtual ?? m.valor_inicial)
            : m.tipo === "treinos"
              ? (treinosPorMeta[m.id] ?? m.valor_atual)
              : Number(m.valor_atual);

        const distanciaTotal = m.valor_alvo - m.valor_inicial;
        const distanciaFeita = valorAtualReal - m.valor_inicial;
        const pctProgresso =
          distanciaTotal !== 0
            ? Math.min(
                100,
                Math.max(0, (distanciaFeita / distanciaTotal) * 100),
              )
            : 0;

        const concluida = pctProgresso >= 100;
        const prazoVencido = diasRestantes < 0 && !concluida;
        const noRitmo = pctProgresso >= pctTempo - 5;

        const Icon = TIPOS.find((t) => t.id === m.tipo)?.icon || Target;

        return (
          <div
            key={m.id}
            style={{
              background: "linear-gradient(155deg, #1c2026, #17191d)",
              border: `1px solid ${concluida ? "#10b98144" : prazoVencido ? "#ef444444" : "#ffffff10"}`,
              borderRadius: 16,
              padding: 16,
              boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 10,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <Icon size={16} color="#818cf8" />
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#f8fafc",
                  }}
                >
                  {m.titulo}
                </span>
              </div>
              <button
                onClick={() => removerMeta(m.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#ef4444",
                  cursor: "pointer",
                  opacity: 0.4,
                  fontSize: 16,
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                marginBottom: 6,
              }}
            >
              <span style={{ color: "#e2e8f0", fontWeight: 700 }}>
                {valorAtualReal.toFixed(1)} {m.unidade}
              </span>
              <span style={{ color: "#64748b" }}>
                meta: {Number(m.valor_alvo).toFixed(1)} {m.unidade}
              </span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 99,
                background: "#ffffff0d",
                overflow: "hidden",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${pctProgresso}%`,
                  background: concluida
                    ? "#10b981"
                    : prazoVencido
                      ? "#ef4444"
                      : noRitmo
                        ? "#6366f1"
                        : "#f59e0b",
                  borderRadius: 99,
                }}
              />
            </div>

            <div style={{ fontSize: 11, color: "#64748b" }}>
              {concluida
                ? "✅ Meta batida!"
                : prazoVencido
                  ? "⚠️ Prazo vencido"
                  : `${diasRestantes} dia${diasRestantes !== 1 ? "s" : ""} restante${diasRestantes !== 1 ? "s" : ""} · ${
                      noRitmo ? "no ritmo certo 👍" : "atrasado em relação ao prazo"
                    }`}
            </div>

            {m.tipo === "manual" && !concluida && (
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                <input
                  type="number"
                  placeholder={`Adicionar ${m.unidade || "valor"}`}
                  value={contribuicaoInput[m.id] || ""}
                  onChange={(e) =>
                    setContribuicaoInput((prev) => ({
                      ...prev,
                      [m.id]: e.target.value,
                    }))
                  }
                  style={{ flex: 1, marginTop: 0 }}
                  onKeyDown={(e) =>
                    e.key === "Enter" && contribuirMeta(m)
                  }
                />
                <button
                  onClick={() => contribuirMeta(m)}
                  style={{
                    background: "#6366f1",
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "0 14px",
                    cursor: "pointer",
                  }}
                >
                  + Add
                </button>
              </div>
            )}
          </div>
        );
      })}

      {mostrarForm ? (
        <div
          style={{
            background: "linear-gradient(155deg, #1c2026, #17191d)",
            border: "1px solid #ffffff10",
            borderRadius: 16,
            padding: 18,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "#64748b",
              fontWeight: 800,
              letterSpacing: "0.08em",
              marginBottom: 12,
            }}
          >
            NOVA META
          </div>
          <input
            placeholder="Nome (ex: Perder gordura, Treinar mais)"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            style={{ marginTop: 8 }}
          >
            {TIPOS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          {tipo !== "treinos" && (
            <input
              type="number"
              placeholder={
                tipo === "peso"
                  ? `Peso inicial (vazio = usa o atual${pesoAtual ? `: ${pesoAtual}kg` : ""})`
                  : "Valor inicial (ex: 0)"
              }
              value={valorInicial}
              onChange={(e) => setValorInicial(e.target.value)}
              style={{ marginTop: 8 }}
            />
          )}
          <input
            type="number"
            placeholder="Valor alvo (ex: 75 para peso, 48 para nº de treinos)"
            value={valorAlvo}
            onChange={(e) => setValorAlvo(e.target.value)}
            style={{ marginTop: 8 }}
          />
          <input
            placeholder="Unidade (ex: kg, treinos, km)"
            value={unidade}
            onChange={(e) => setUnidade(e.target.value)}
            style={{ marginTop: 8 }}
          />
          <div
            style={{
              marginTop: 8,
              background: "#24282d",
              border: "1px solid #ffffff10",
              borderRadius: 8,
              padding: "10px 12px",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "#64748b",
                fontWeight: 800,
                letterSpacing: "0.08em",
                marginBottom: 4,
              }}
            >
              PRAZO
            </div>
            <input
              type="date"
              value={dataPrazo}
              min={formatarData(new Date())}
              onChange={(e) => setDataPrazo(e.target.value)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                color: "#f8fafc",
                fontSize: 14,
                padding: 0,
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              onClick={() => setMostrarForm(false)}
              style={{
                flex: 1,
                background: "transparent",
                border: "1px solid #ffffff0d",
                color: "#64748b",
                borderRadius: 10,
                padding: "12px 0",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={adicionarMeta}
              style={{
                flex: 2,
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                border: "none",
                borderRadius: 10,
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                padding: "12px 0",
                cursor: "pointer",
              }}
            >
              Criar Meta
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setMostrarForm(true)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.3)",
            borderRadius: 12,
            color: "#a5b4fc",
            fontSize: 14,
            fontWeight: 700,
            padding: 14,
            cursor: "pointer",
          }}
        >
          <Plus size={16} />
          Nova Meta
        </button>
      )}
    </div>
  );
}