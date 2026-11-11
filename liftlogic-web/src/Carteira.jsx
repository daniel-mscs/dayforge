import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "./lib/supabase";
import { toast } from "./lib/toast";
import { askConfirm } from "./lib/confirm";

const brl = (v) =>
  Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
const qtd = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { maximumFractionDigits: 4 });
const pct = (v) =>
  `${v >= 0 ? "+" : ""}${Number(v || 0).toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  })}%`;
const num = (s) => {
  const n = parseFloat(String(s ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const hojeLocal = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
};
const dataBR = (iso) => {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
};
const MESES_CURTOS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const card = {
  background: "linear-gradient(155deg, #1c2026, #17191d)",
  border: "1px solid #ffffff10",
  borderRadius: 16,
  padding: 16,
};
const label = {
  fontSize: 10,
  color: "#64748b",
  fontWeight: 800,
  letterSpacing: "0.08em",
};

const FORM_VAZIO = {
  id: null,
  tipo: "fii",
  nome: "",
  cotas: "",
  preco_medio: "",
  preco_atual: "",
  taxa: "",
  vencimento: "",
};

export default function Carteira({ user }) {
  const [ativos, setAtivos] = useState([]);
  const [proventos, setProventos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [aba, setAba] = useState("fii");
  const [form, setForm] = useState(null);
  const [provForm, setProvForm] = useState(null);
  const [aberto, setAberto] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const [a, p] = await Promise.all([
      supabase
        .from("financeiro_ativos")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("financeiro_proventos")
        .select("*")
        .eq("user_id", user.id)
        .order("data", { ascending: false }),
    ]);
    if (a.error) toast(a.error.message, "error");
    setAtivos(a.data || []);
    setProventos(p.data || []);
    setCarregando(false);
  }, [user.id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const hoje = hojeLocal();
  const mesAtual = hoje.slice(0, 7);

  const calc = useMemo(() => {
    const limite12 = new Date();
    limite12.setFullYear(limite12.getFullYear() - 1);
    const lim = new Date(
      limite12.getTime() - limite12.getTimezoneOffset() * 60000,
    )
      .toISOString()
      .split("T")[0];

    const porAtivo = {};
    ativos.forEach((a) => {
      const investido = Number(a.cotas) * Number(a.preco_medio);
      const atual =
        Number(a.cotas) * Number(a.preco_atual || a.preco_medio || 0);
      const provs = proventos.filter((p) => p.ativo_id === a.id);
      const total = provs.reduce((s, p) => s + Number(p.valor), 0);
      const p12 = provs
        .filter((p) => p.data >= lim)
        .reduce((s, p) => s + Number(p.valor), 0);
      porAtivo[a.id] = {
        investido,
        atual,
        res: atual - investido,
        resPct: investido > 0 ? ((atual - investido) / investido) * 100 : 0,
        provs,
        total,
        p12,
        yoc: investido > 0 ? (p12 / investido) * 100 : 0,
      };
    });

    const investido = Object.values(porAtivo).reduce(
      (s, x) => s + x.investido,
      0,
    );
    const atual = Object.values(porAtivo).reduce((s, x) => s + x.atual, 0);
    const prov12 = proventos
      .filter((p) => p.data >= lim)
      .reduce((s, p) => s + Number(p.valor), 0);
    const provMes = proventos
      .filter((p) => p.data.slice(0, 7) === mesAtual)
      .reduce((s, p) => s + Number(p.valor), 0);
    const provTotal = proventos.reduce((s, p) => s + Number(p.valor), 0);

    // média mensal: considera só os meses desde o 1º provento (máx. 12)
    let mediaMes = 0;
    if (proventos.length) {
      const primeiro = proventos[proventos.length - 1].data;
      const [ay, am] = primeiro.split("-").map(Number);
      const [hy, hm] = mesAtual.split("-").map(Number);
      const meses = Math.min(12, Math.max(1, (hy - ay) * 12 + (hm - am) + 1));
      mediaMes = prov12 / meses;
    }

    const meses6 = [];
    const base = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const valor = proventos
        .filter((p) => p.data.slice(0, 7) === chave)
        .reduce((s, p) => s + Number(p.valor), 0);
      meses6.push({ chave, nome: MESES_CURTOS[d.getMonth()], valor });
    }

    return {
      porAtivo,
      investido,
      atual,
      res: atual - investido,
      resPct: investido > 0 ? ((atual - investido) / investido) * 100 : 0,
      prov12,
      provMes,
      provTotal,
      mediaMes,
      yoc: investido > 0 ? (prov12 / investido) * 100 : 0,
      meses6,
      maxMes: Math.max(1, ...meses6.map((m) => m.valor)),
    };
  }, [ativos, proventos, mesAtual]);

  const abrirNovo = () => setForm({ ...FORM_VAZIO, tipo: aba });
  const abrirEditar = (a) =>
    setForm({
      id: a.id,
      tipo: a.tipo,
      nome: a.nome,
      cotas: String(a.cotas).replace(".", ","),
      preco_medio: String(a.preco_medio).replace(".", ","),
      preco_atual:
        a.preco_atual == null ? "" : String(a.preco_atual).replace(".", ","),
      taxa: a.taxa == null ? "" : String(a.taxa).replace(".", ","),
      vencimento: a.vencimento || "",
    });

  const salvarAtivo = async () => {
    const nome = form.nome.trim();
    if (!nome) return toast("Informe o nome/ticker!", "error");
    if (num(form.cotas) <= 0) return toast("Informe a quantidade!", "error");
    if (num(form.preco_medio) <= 0)
      return toast("Informe o preço médio!", "error");
    setSalvando(true);
    const payload = {
      user_id: user.id,
      tipo: form.tipo,
      nome: form.tipo === "fii" ? nome.toUpperCase() : nome,
      cotas: num(form.cotas),
      preco_medio: num(form.preco_medio),
      preco_atual: form.preco_atual === "" ? null : num(form.preco_atual),
      taxa: form.tipo === "ipca" && form.taxa !== "" ? num(form.taxa) : null,
      vencimento:
        form.tipo === "ipca" && form.vencimento ? form.vencimento : null,
    };
    const { error } = form.id
      ? await supabase
          .from("financeiro_ativos")
          .update(payload)
          .eq("id", form.id)
      : await supabase.from("financeiro_ativos").insert([payload]);
    setSalvando(false);
    if (error) return toast(error.message, "error");
    setForm(null);
    toast(form.id ? "Ativo atualizado!" : "Ativo adicionado!", "success");
    carregar();
  };

  const apagarAtivo = async (a) => {
    if (!(await askConfirm(`Apagar ${a.nome} e todos os proventos dele?`)))
      return;
    const { error } = await supabase
      .from("financeiro_ativos")
      .delete()
      .eq("id", a.id);
    if (error) return toast(error.message, "error");
    carregar();
  };

  const salvarProvento = async () => {
    const a = ativos.find((x) => x.id === provForm.ativoId);
    const porCota = num(provForm.porCota);
    if (!a || porCota <= 0) return toast("Informe o valor por cota!", "error");
    const { error } = await supabase.from("financeiro_proventos").insert([
      {
        user_id: user.id,
        ativo_id: a.id,
        data: provForm.data || hoje,
        valor_cota: porCota,
        valor: Math.round(porCota * Number(a.cotas) * 100) / 100,
      },
    ]);
    if (error) return toast(error.message, "error");
    setProvForm(null);
    toast("Provento lançado!", "success");
    carregar();
  };

  const apagarProvento = async (p) => {
    if (!(await askConfirm("Apagar esse provento?"))) return;
    const { error } = await supabase
      .from("financeiro_proventos")
      .delete()
      .eq("id", p.id);
    if (error) return toast(error.message, "error");
    carregar();
  };

  const lista = ativos.filter((a) => a.tipo === aba);
  const corRes = (v) => (v >= 0 ? "#10b981" : "#ef4444");

  if (carregando) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* RESUMO */}
      <div style={card}>
        <div style={label}>MINHA CARTEIRA</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginTop: 12,
          }}
        >
          <Info t="Investido" v={brl(calc.investido)} />
          <Info t="Valor atual" v={brl(calc.atual)} />
          <Info
            t="Resultado"
            v={`${brl(calc.res)} (${pct(calc.resPct)})`}
            cor={corRes(calc.res)}
          />
          <Info t="Dividendos no mês" v={brl(calc.provMes)} cor="#fbbf24" />
          <Info t="Dividendos 12 meses" v={brl(calc.prov12)} cor="#fbbf24" />
          <Info t="Média por mês" v={brl(calc.mediaMes)} cor="#fbbf24" />
          <Info
            t="Yield sobre o investido (12m)"
            v={pct(calc.yoc).replace("+", "")}
          />
          <Info t="Total já recebido" v={brl(calc.provTotal)} />
        </div>

        <div style={{ ...label, marginTop: 16 }}>
          PROVENTOS — ÚLTIMOS 6 MESES
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 8,
            height: 90,
            marginTop: 10,
          }}
        >
          {calc.meses6.map((m) => (
            <div
              key={m.chave}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                height: "100%",
              }}
            >
              <span style={{ fontSize: 9, color: "#94a3b8", marginBottom: 2 }}>
                {m.valor > 0 ? brl(m.valor).replace("R$", "").trim() : ""}
              </span>
              <div
                style={{
                  width: "100%",
                  height: `${Math.max(3, (m.valor / calc.maxMes) * 60)}px`,
                  background: m.valor > 0 ? "#fbbf24" : "#ffffff10",
                  borderRadius: 4,
                }}
              />
              <span style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
                {m.nome}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ABAS */}
      <div style={{ display: "flex", gap: 8 }}>
        {[
          ["fii", "🏢 FIIs"],
          ["ipca", "📈 Tesouro IPCA+"],
        ].map(([id, txt]) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            style={{
              flex: 1,
              padding: "10px 8px",
              borderRadius: 10,
              border: "1px solid #ffffff10",
              background: aba === id ? "#6366f1" : "#24282d",
              color: aba === id ? "#fff" : "#94a3b8",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {txt}
          </button>
        ))}
      </div>

      <button
        onClick={abrirNovo}
        style={{
          background: "#f59e0b",
          border: "none",
          borderRadius: 10,
          color: "#000",
          fontSize: 14,
          fontWeight: 700,
          padding: 12,
          cursor: "pointer",
        }}
      >
        + {aba === "fii" ? "Adicionar FII" : "Adicionar Tesouro IPCA+"}
      </button>

      {/* FORM ATIVO */}
      {form && (
        <div style={card}>
          <div style={label}>
            {form.id ? "EDITAR" : "NOVO"}{" "}
            {form.tipo === "fii" ? "FII" : "TESOURO IPCA+"}
          </div>
          <input
            placeholder={
              form.tipo === "fii"
                ? "Ticker (ex: MXRF11)"
                : "Nome (ex: IPCA+ 2035)"
            }
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            style={{ marginTop: 10 }}
          />
          <input
            inputMode="decimal"
            placeholder={
              form.tipo === "fii"
                ? "Quantidade de cotas"
                : "Quantidade (ex: 0,35)"
            }
            value={form.cotas}
            onChange={(e) => setForm({ ...form, cotas: e.target.value })}
            style={{ marginTop: 8 }}
          />
          <input
            inputMode="decimal"
            placeholder={
              form.tipo === "fii"
                ? "Preço médio pago R$"
                : "Preço médio pago R$ (por unidade)"
            }
            value={form.preco_medio}
            onChange={(e) => setForm({ ...form, preco_medio: e.target.value })}
            style={{ marginTop: 8 }}
          />
          <input
            inputMode="decimal"
            placeholder={
              form.tipo === "fii"
                ? "Cotação atual R$"
                : "Preço atual R$ (por unidade)"
            }
            value={form.preco_atual}
            onChange={(e) => setForm({ ...form, preco_atual: e.target.value })}
            style={{ marginTop: 8 }}
          />
          {form.tipo === "ipca" && (
            <>
              <input
                inputMode="decimal"
                placeholder="Taxa: IPCA + quantos % ao ano (ex: 6,5)"
                value={form.taxa}
                onChange={(e) => setForm({ ...form, taxa: e.target.value })}
                style={{ marginTop: 8 }}
              />
              <div style={{ ...label, marginTop: 10 }}>VENCIMENTO</div>
              <input
                type="date"
                value={form.vencimento}
                onChange={(e) =>
                  setForm({ ...form, vencimento: e.target.value })
                }
                style={{ marginTop: 6 }}
              />
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 8 }}>
                Dica: se não souber a quantidade, coloque 1 e use o valor total
                investido/atual nos preços.
              </div>
            </>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              onClick={() => setForm(null)}
              style={{
                flex: 1,
                background: "#24282d",
                border: "1px solid #ffffff10",
                borderRadius: 10,
                color: "#94a3b8",
                padding: 11,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Cancelar
            </button>
            <button
              onClick={salvarAtivo}
              disabled={salvando}
              style={{
                flex: 2,
                background: "#10b981",
                border: "none",
                borderRadius: 10,
                color: "#000",
                padding: 11,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {/* LISTA */}
      {lista.length === 0 && !form && (
        <p style={{ textAlign: "center", color: "#475569", fontSize: 13 }}>
          {aba === "fii"
            ? "Nenhum FII cadastrado ainda."
            : "Nenhum Tesouro IPCA+ cadastrado ainda."}
        </p>
      )}

      {lista.map((a) => {
        const c = calc.porAtivo[a.id];
        const aberto_ = aberto === a.id;
        return (
          <div
            key={a.id}
            style={{ ...card, borderLeft: "3px solid #fbbf24", padding: 14 }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{ fontSize: 16, fontWeight: 800, color: "#f8fafc" }}
                >
                  {a.nome}
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  {qtd(a.cotas)} {a.tipo === "fii" ? "cotas" : "un."} · PM{" "}
                  {brl(a.preco_medio)}
                  {a.preco_atual ? ` · atual ${brl(a.preco_atual)}` : ""}
                </div>
                {a.tipo === "ipca" && (a.taxa != null || a.vencimento) && (
                  <div style={{ fontSize: 11, color: "#818cf8", marginTop: 2 }}>
                    {a.taxa != null ? `IPCA + ${qtd(a.taxa)}% a.a.` : ""}
                    {a.taxa != null && a.vencimento ? " · " : ""}
                    {a.vencimento ? `vence ${dataBR(a.vencimento)}` : ""}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{ fontSize: 16, fontWeight: 800, color: "#f8fafc" }}
                >
                  {brl(c.atual)}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: corRes(c.res),
                  }}
                >
                  {brl(c.res)} ({pct(c.resPct)})
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 8,
                marginTop: 12,
              }}
            >
              <Info t="Investido" v={brl(c.investido)} pequeno />
              <Info t="Proventos 12m" v={brl(c.p12)} cor="#fbbf24" pequeno />
              <Info
                t="Yield s/ custo"
                v={pct(c.yoc).replace("+", "")}
                pequeno
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 12,
                flexWrap: "wrap",
              }}
            >
              <Btn
                onClick={() =>
                  setProvForm({ ativoId: a.id, porCota: "", data: hoje })
                }
                cor="#fbbf24"
              >
                💰 Lançar provento
              </Btn>
              <Btn onClick={() => setAberto(aberto_ ? null : a.id)}>
                Histórico ({c.provs.length})
              </Btn>
              <Btn onClick={() => abrirEditar(a)}>✏️</Btn>
              <Btn onClick={() => apagarAtivo(a)} cor="#ef4444">
                ✕
              </Btn>
            </div>

            {provForm?.ativoId === a.id && (
              <div style={{ marginTop: 12 }}>
                <input
                  inputMode="decimal"
                  placeholder="Provento por cota R$ (ex: 0,10)"
                  value={provForm.porCota}
                  onChange={(e) =>
                    setProvForm({ ...provForm, porCota: e.target.value })
                  }
                />
                <input
                  type="date"
                  value={provForm.data}
                  onChange={(e) =>
                    setProvForm({ ...provForm, data: e.target.value })
                  }
                  style={{ marginTop: 8 }}
                />
                {num(provForm.porCota) > 0 && (
                  <div style={{ fontSize: 12, color: "#fbbf24", marginTop: 8 }}>
                    Você recebe {brl(num(provForm.porCota) * Number(a.cotas))} (
                    {qtd(a.cotas)} cotas)
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <Btn onClick={() => setProvForm(null)}>Cancelar</Btn>
                  <Btn onClick={salvarProvento} cor="#10b981">
                    Salvar provento
                  </Btn>
                </div>
              </div>
            )}

            {aberto_ && (
              <div style={{ marginTop: 12 }}>
                {c.provs.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#475569" }}>
                    Nenhum provento lançado.
                  </div>
                ) : (
                  c.provs.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "6px 0",
                        borderTop: "1px solid #ffffff08",
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: "#94a3b8" }}>
                        {dataBR(p.data)}
                        {p.valor_cota ? ` · ${brl(p.valor_cota)}/cota` : ""}
                      </span>
                      <span>
                        <b style={{ color: "#fbbf24" }}>{brl(p.valor)}</b>
                        <button
                          onClick={() => apagarProvento(p)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#ef4444",
                            opacity: 0.5,
                            marginLeft: 8,
                            cursor: "pointer",
                          }}
                        >
                          ✕
                        </button>
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Info({ t, v, cor, pequeno }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>{t}</div>
      <div
        style={{
          fontSize: pequeno ? 13 : 15,
          fontWeight: 800,
          color: cor || "#f8fafc",
          marginTop: 2,
        }}
      >
        {v}
      </div>
    </div>
  );
}

function Btn({ children, onClick, cor }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "#24282d",
        border: `1px solid ${cor ? cor + "55" : "#ffffff10"}`,
        borderRadius: 8,
        color: cor || "#94a3b8",
        fontSize: 12,
        fontWeight: 700,
        padding: "8px 10px",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
