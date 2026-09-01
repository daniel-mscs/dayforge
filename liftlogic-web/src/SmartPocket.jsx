import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const INVEST_TIPOS = [
  "Caixinha / CDB",
  "Bolsa de Valores",
  "Reserva de Emergência",
];
const CATEGORIAS = [
  "Alimentação",
  "Transporte",
  "Moradia",
  "Lazer",
  "Saúde",
  "Educação",
  "Compras",
  "Assinaturas",
  "Outros",
];
const CORES_CATEGORIA = {
  Alimentação: "#f59e0b",
  Transporte: "#06b6d4",
  Moradia: "#a855f7",
  Lazer: "#ec4899",
  Saúde: "#10b981",
  Educação: "#3b82f6",
  Compras: "#f97316",
  Assinaturas: "#818cf8",
  Outros: "#64748b",
};

function fmtBRL(v) {
  return Number(v).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function gerarUUID() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function SmartPocket({ user }) {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());
  const [aba, setAba] = useState("gastos");
  const [carregando, setCarregando] = useState(true);

  const [gastos, setGastos] = useState([]);
  const [cartao, setCartao] = useState([]);
  const [investimentos, setInvestimentos] = useState([]);
  const [entradas, setEntradas] = useState([]);

  const [gastoNome, setGastoNome] = useState("");
  const [gastoValor, setGastoValor] = useState("");
  const [gastoData, setGastoData] = useState("");
  const [gastoCategoria, setGastoCategoria] = useState(CATEGORIAS[0]);

  const [cartaoItem, setCartaoItem] = useState("");
  const [cartaoValor, setCartaoValor] = useState("");
  const [cartaoCategoria, setCartaoCategoria] = useState(CATEGORIAS[0]);
  const [cartaoParcelado, setCartaoParcelado] = useState(false);
  const [cartaoParcelas, setCartaoParcelas] = useState("2");
  const [cartaoSelecionado, setCartaoSelecionado] = useState("");

  const [cartoes, setCartoes] = useState([]);
  const [novoCartaoNome, setNovoCartaoNome] = useState("");
  const [novoCartaoFechamento, setNovoCartaoFechamento] = useState("5");

  const [limites, setLimites] = useState([]);
  const [recorrentes, setRecorrentes] = useState([]);
  const [config, setConfig] = useState({
    dia_fechamento_cartao: 5,
    meta_investimento_mensal: 0,
  });
  const [gastosMesPassado, setGastosMesPassado] = useState([]);
  const [saldoAcumulado, setSaldoAcumulado] = useState(0);
  const [cartaoFuturo, setCartaoFuturo] = useState([]);
  const [novoLimiteCategoria, setNovoLimiteCategoria] = useState(CATEGORIAS[0]);
  const [novoLimiteValor, setNovoLimiteValor] = useState("");
  const [novoRecorrenteNome, setNovoRecorrenteNome] = useState("");
  const [novoRecorrenteValor, setNovoRecorrenteValor] = useState("");
  const [novoRecorrenteCategoria, setNovoRecorrenteCategoria] = useState(
    CATEGORIAS[0],
  );

  const [investTipo, setInvestTipo] = useState(INVEST_TIPOS[0]);
  const [investValor, setInvestValor] = useState("");

  const [entradaNome, setEntradaNome] = useState("");
  const [entradaValor, setEntradaValor] = useState("");

  const buscarTudo = useCallback(async () => {
    setCarregando(true);
    const mesPassadoData =
      mes === 0 ? { mes: 11, ano: ano - 1 } : { mes: mes - 1, ano };
    const [
      { data: g },
      { data: c },
      { data: i },
      { data: e },
      { data: lim },
      { data: rec },
      { data: cfg },
      { data: gPassado },
      { data: cFuturo },
      { data: cts },
      { data: entradasHist },
      { data: gastosHist },
      { data: investHist },
    ] = await Promise.all([
      supabase
        .from("financeiro_gastos")
        .select("*")
        .eq("user_id", user.id)
        .eq("mes", mes)
        .eq("ano", ano)
        .order("created_at", { ascending: false }),
      supabase
        .from("financeiro_cartao")
        .select("*")
        .eq("user_id", user.id)
        .eq("mes", mes)
        .eq("ano", ano)
        .order("created_at", { ascending: false }),
      supabase
        .from("financeiro_investimentos")
        .select("*")
        .eq("user_id", user.id)
        .eq("mes", mes)
        .eq("ano", ano)
        .order("created_at", { ascending: false }),
      supabase
        .from("financeiro_entradas")
        .select("*")
        .eq("user_id", user.id)
        .eq("mes", mes)
        .eq("ano", ano)
        .order("created_at", { ascending: false }),
      supabase.from("financeiro_limites").select("*").eq("user_id", user.id),
      supabase
        .from("financeiro_recorrentes")
        .select("*")
        .eq("user_id", user.id)
        .eq("ativo", true),
      supabase
        .from("financeiro_config")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("financeiro_gastos")
        .select("valor")
        .eq("user_id", user.id)
        .eq("mes", mesPassadoData.mes)
        .eq("ano", mesPassadoData.ano),
      supabase
        .from("financeiro_cartao")
        .select("*")
        .eq("user_id", user.id)
        .not("grupo_parcela_id", "is", null)
        .or(`ano.gt.${ano},and(ano.eq.${ano},mes.gt.${mes})`)
        .order("ano", { ascending: true })
        .order("mes", { ascending: true }),
      supabase
        .from("financeiro_cartoes")
        .select("*")
        .eq("user_id", user.id)
        .eq("ativo", true)
        .order("created_at", { ascending: true }),
      supabase
        .from("financeiro_entradas")
        .select("valor, mes, ano")
        .eq("user_id", user.id),
      supabase
        .from("financeiro_gastos")
        .select("valor, mes, ano")
        .eq("user_id", user.id),
      supabase
        .from("financeiro_investimentos")
        .select("valor, mes, ano")
        .eq("user_id", user.id),
    ]);

    // Aplica os gastos recorrentes que ainda não foram lançados nesse mês
    const nomesJaLancados = new Set((g || []).map((x) => x.nome));
    const faltando = (rec || []).filter((r) => !nomesJaLancados.has(r.nome));
    if (faltando.length > 0) {
      const { data: inseridos } = await supabase
        .from("financeiro_gastos")
        .insert(
          faltando.map((r) => ({
            user_id: user.id,
            mes,
            ano,
            nome: r.nome,
            valor: r.valor,
            categoria: r.categoria,
          })),
        )
        .select();
      setGastos([...(inseridos || []), ...(g || [])]);
    } else {
      setGastos(g || []);
    }

    setCartao(c || []);
    setInvestimentos(i || []);
    setEntradas(e || []);
    setLimites(lim || []);
    setRecorrentes(rec || []);
    if (cfg) setConfig(cfg);
    setGastosMesPassado(gPassado || []);
    setCartaoFuturo(cFuturo || []);
    setCartoes(cts || []);
    if (cts && cts.length > 0 && !cartaoSelecionado) {
      setCartaoSelecionado(cts[0].id);
    }

    // Saldo acumulado: soma tudo que sobrou (ou faltou) nos meses
    // anteriores ao selecionado — vai empurrando de mês em mês.
    const antesDoMesAtual = (a, m) => a < ano || (a === ano && m < mes);
    const somaAntes = (lista) =>
      (lista || [])
        .filter((r) => antesDoMesAtual(r.ano, r.mes))
        .reduce((s, r) => s + Number(r.valor), 0);
    const acumulado =
      somaAntes(entradasHist) - somaAntes(gastosHist) - somaAntes(investHist);
    setSaldoAcumulado(acumulado);

    setCarregando(false);
  }, [user.id, mes, ano]);

  useEffect(() => {
    buscarTudo();
  }, [buscarTudo]);

  const adicionarGasto = async () => {
    if (!gastoNome || !gastoValor) return alert("Preencha os campos!");
    const { data, error } = await supabase
      .from("financeiro_gastos")
      .insert([
        {
          user_id: user.id,
          mes,
          ano,
          nome: gastoNome,
          valor: parseFloat(gastoValor),
          data: gastoData || null,
          categoria: gastoCategoria,
        },
      ])
      .select();
    if (error) return alert(error.message);
    setGastos((prev) => [data[0], ...prev]);
    setGastoNome("");
    setGastoValor("");
    setGastoData("");
  };

  const adicionarCartao = async () => {
    if (!cartaoItem || !cartaoValor) return alert("Preencha os campos!");
    if (!cartaoSelecionado)
      return alert(
        "Cadastre um cartão antes de lançar (abaixo do formulário).",
      );
    const valorTotal = parseFloat(cartaoValor);
    const numParcelas = cartaoParcelado
      ? Math.max(2, parseInt(cartaoParcelas, 10) || 2)
      : 1;
    const valorParcela = valorTotal / numParcelas;
    const grupoId = cartaoParcelado ? gerarUUID() : null;

    const linhas = Array.from({ length: numParcelas }, (_, idx) => {
      let m = mes + idx;
      let a = ano;
      while (m > 11) {
        m -= 12;
        a += 1;
      }
      return {
        user_id: user.id,
        mes: m,
        ano: a,
        item: cartaoItem,
        valor: valorParcela,
        categoria: cartaoCategoria,
        cartao_id: cartaoSelecionado,
        parcela_atual: cartaoParcelado ? idx + 1 : null,
        total_parcelas: cartaoParcelado ? numParcelas : null,
        grupo_parcela_id: grupoId,
      };
    });

    const { data, error } = await supabase
      .from("financeiro_cartao")
      .insert(linhas)
      .select();
    if (error) return alert(error.message);
    const desseMes = (data || []).filter((d) => d.mes === mes && d.ano === ano);
    setCartao((prev) => [...desseMes, ...prev]);
    setCartaoItem("");
    setCartaoValor("");
    setCartaoParcelado(false);
    setCartaoParcelas("2");
  };

  const adicionarCartaoConta = async () => {
    if (!novoCartaoNome) return alert("Dá um nome pro cartão!");
    const { data, error } = await supabase
      .from("financeiro_cartoes")
      .insert([
        {
          user_id: user.id,
          nome: novoCartaoNome,
          dia_fechamento: parseInt(novoCartaoFechamento, 10) || 5,
        },
      ])
      .select();
    if (error) return alert(error.message);
    setCartoes((prev) => [...prev, data[0]]);
    if (!cartaoSelecionado) setCartaoSelecionado(data[0].id);
    setNovoCartaoNome("");
    setNovoCartaoFechamento("5");
  };

  const removerCartaoConta = async (id) => {
    if (
      !confirm(
        "Remover esse cartão? Os lançamentos já feitos continuam existindo, só ficam sem cartão vinculado.",
      )
    )
      return;
    await supabase.from("financeiro_cartoes").delete().eq("id", id);
    setCartoes((prev) => prev.filter((c) => c.id !== id));
    if (cartaoSelecionado === id) setCartaoSelecionado("");
  };

  const salvarFechamentoCartao = async (id, dia) => {
    setCartoes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, dia_fechamento: dia } : c)),
    );
    await supabase
      .from("financeiro_cartoes")
      .update({ dia_fechamento: dia })
      .eq("id", id);
  };

  const salvarLimite = async () => {
    if (!novoLimiteValor) return alert("Informe o valor do limite!");
    const { data, error } = await supabase
      .from("financeiro_limites")
      .upsert(
        {
          user_id: user.id,
          categoria: novoLimiteCategoria,
          valor_limite: parseFloat(novoLimiteValor),
        },
        { onConflict: "user_id,categoria" },
      )
      .select();
    if (error) return alert(error.message);
    setLimites((prev) => [
      ...prev.filter((l) => l.categoria !== novoLimiteCategoria),
      data[0],
    ]);
    setNovoLimiteValor("");
  };

  const removerLimite = async (id) => {
    await supabase.from("financeiro_limites").delete().eq("id", id);
    setLimites((prev) => prev.filter((l) => l.id !== id));
  };

  const adicionarRecorrente = async () => {
    if (!novoRecorrenteNome || !novoRecorrenteValor)
      return alert("Preencha os campos!");
    const { data, error } = await supabase
      .from("financeiro_recorrentes")
      .insert([
        {
          user_id: user.id,
          nome: novoRecorrenteNome,
          valor: parseFloat(novoRecorrenteValor),
          categoria: novoRecorrenteCategoria,
        },
      ])
      .select();
    if (error) return alert(error.message);
    setRecorrentes((prev) => [...prev, data[0]]);
    setNovoRecorrenteNome("");
    setNovoRecorrenteValor("");
  };

  const removerRecorrente = async (id) => {
    await supabase.from("financeiro_recorrentes").delete().eq("id", id);
    setRecorrentes((prev) => prev.filter((r) => r.id !== id));
  };

  const salvarConfig = async (novaConfig) => {
    const atualizado = { ...config, ...novaConfig };
    setConfig(atualizado);
    await supabase
      .from("financeiro_config")
      .upsert({ user_id: user.id, ...atualizado }, { onConflict: "user_id" });
  };

  const adicionarInvestimento = async () => {
    if (!investValor) return alert("Informe o valor!");
    const { data, error } = await supabase
      .from("financeiro_investimentos")
      .insert([
        {
          user_id: user.id,
          mes,
          ano,
          tipo: investTipo,
          valor: parseFloat(investValor),
        },
      ])
      .select();
    if (error) return alert(error.message);
    setInvestimentos((prev) => [data[0], ...prev]);
    setInvestValor("");
  };

  const adicionarEntrada = async () => {
    if (!entradaNome || !entradaValor) return alert("Preencha os campos!");
    const { data, error } = await supabase
      .from("financeiro_entradas")
      .insert([
        {
          user_id: user.id,
          mes,
          ano,
          nome: entradaNome,
          valor: parseFloat(entradaValor),
        },
      ])
      .select();
    if (error) return alert(error.message);
    setEntradas((prev) => [data[0], ...prev]);
    setEntradaNome("");
    setEntradaValor("");
  };

  const deletar = async (tabela, id, setter) => {
    await supabase.from(tabela).delete().eq("id", id);
    setter((prev) => prev.filter((r) => r.id !== id));
  };

  const totalGastos = gastos.reduce((s, r) => s + Number(r.valor), 0);
  const totalCartao = cartao.reduce((s, r) => s + Number(r.valor), 0);
  const totalInvest = investimentos.reduce((s, r) => s + Number(r.valor), 0);
  const totalEntradas = entradas.reduce((s, r) => s + Number(r.valor), 0);
  const saldo = totalEntradas - (totalGastos + totalInvest);

  // Comparação com o mês passado
  const totalGastosMesPassado = gastosMesPassado.reduce(
    (s, r) => s + Number(r.valor),
    0,
  );
  const variacaoMesPassado =
    totalGastosMesPassado > 0
      ? ((totalGastos - totalGastosMesPassado) / totalGastosMesPassado) * 100
      : null;

  // Projeção de saldo do mês (só faz sentido pro mês atual)
  const ehMesAtual = mes === hoje.getMonth() && ano === hoje.getFullYear();
  const diaAtual = hoje.getDate();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const projecaoGastos = ehMesAtual
    ? (totalGastos / diaAtual) * diasNoMes
    : totalGastos;
  const projecaoSaldo = totalEntradas - projecaoGastos - totalInvest;

  // Gastos por categoria (gráfico de pizza)
  const gastosPorCategoria = {};
  gastos.forEach((g) => {
    const cat = g.categoria || "Outros";
    gastosPorCategoria[cat] = (gastosPorCategoria[cat] || 0) + Number(g.valor);
  });
  const dadosPizza = Object.entries(gastosPorCategoria).map(([nome, val]) => ({
    name: nome,
    value: val,
    fill: CORES_CATEGORIA[nome] || "#64748b",
  }));

  // Fatura fechando — um cálculo por cartão
  const cartoesComResumo = cartoes.map((cta) => {
    const diaFechamento = cta.dia_fechamento || 5;
    const diasParaFechar =
      diaFechamento >= diaAtual
        ? diaFechamento - diaAtual
        : diaFechamento + diasNoMes - diaAtual;
    const totalDoCartao = cartao
      .filter((c) => c.cartao_id === cta.id)
      .reduce((s, c) => s + Number(c.valor), 0);
    return { ...cta, diasParaFechar, totalDoCartao };
  });
  const lancamentosSemCartao = cartao.filter((c) => !c.cartao_id);
  const totalSemCartao = lancamentosSemCartao.reduce(
    (s, c) => s + Number(c.valor),
    0,
  );

  // Parcelas futuras agrupadas por mês
  const parcelasPorMes = {};
  cartaoFuturo.forEach((c) => {
    const chave = `${c.mes}-${c.ano}`;
    if (!parcelasPorMes[chave])
      parcelasPorMes[chave] = { mes: c.mes, ano: c.ano, total: 0 };
    parcelasPorMes[chave].total += Number(c.valor);
  });
  const parcelasFuturasLista = Object.values(parcelasPorMes).sort(
    (a, b) => a.ano - b.ano || a.mes - b.mes,
  );

  const dadosGrafico = [
    { name: "Entradas", valor: totalEntradas, fill: "#10b981" },
    { name: "Gastos", valor: totalGastos, fill: "#ef4444" },
    { name: "Cartão", valor: totalCartao, fill: "#f97316" },
    { name: "Invest.", valor: totalInvest, fill: "#f59e0b" },
  ];

  const s = { color: "#f8fafc", fontSize: 16 };

  if (carregando)
    return (
      <div style={{ textAlign: "center", color: "#64748b", paddingTop: 40 }}>
        Carregando SmartPocket... 💰
      </div>
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
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 className="title-divisao" style={{ margin: 0 }}>
          💰 SmartPocket
        </h2>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "linear-gradient(135deg, #1c2026, #17191d)",
            border: "1px solid #ffffff10",
            borderRadius: 12,
            padding: "4px 6px",
          }}
        >
          <button
            onClick={() => {
              if (mes === 0) {
                setMes(11);
                setAno(ano - 1);
              } else {
                setMes(mes - 1);
              }
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "#818cf8",
              fontSize: 16,
              fontWeight: 800,
              padding: "4px 8px",
              cursor: "pointer",
            }}
          >
            ‹
          </button>
          <button
            onClick={() => {
              setMes(hoje.getMonth());
              setAno(hoje.getFullYear());
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "#f8fafc",
              fontSize: 13,
              fontWeight: 700,
              padding: "4px 10px",
              cursor: "pointer",
              minWidth: 108,
              textAlign: "center",
            }}
          >
            {MESES[mes]} {ano}
          </button>
          <button
            onClick={() => {
              if (mes === 11) {
                setMes(0);
                setAno(ano + 1);
              } else {
                setMes(mes + 1);
              }
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "#818cf8",
              fontSize: 16,
              fontWeight: 800,
              padding: "4px 8px",
              cursor: "pointer",
            }}
          >
            ›
          </button>
        </div>
      </div>

      {saldoAcumulado !== 0 && (
        <div
          style={{
            alignSelf: "flex-start",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background:
              saldoAcumulado >= 0
                ? "rgba(16,185,129,0.1)"
                : "rgba(239,68,68,0.1)",
            border: `1px solid ${saldoAcumulado >= 0 ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
            borderRadius: 99,
            padding: "6px 12px",
          }}
        >
          <span style={{ fontSize: 11, color: "#94a3b8" }}>
            {saldoAcumulado >= 0
              ? "💰 Sobrou de antes:"
              : "⚠️ Faltando de antes:"}
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: saldoAcumulado >= 0 ? "#10b981" : "#ef4444",
            }}
          >
            {fmtBRL(Math.abs(saldoAcumulado))}
          </span>
        </div>
      )}

      {/* Cards resumo */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { label: "ENTRADAS", val: totalEntradas, color: "#10b981" },
          { label: "GASTOS", val: totalGastos, color: "#ef4444" },
          { label: "INVESTIDO", val: totalInvest, color: "#f59e0b" },
          {
            label: "SALDO",
            val: saldo,
            color: saldo >= 0 ? "#10b981" : "#ef4444",
          },
        ].map((c, i) => (
          <div
            key={i}
            style={{
              background: "linear-gradient(155deg, #1c2026, #17191d)",
              border: "1px solid #ffffff10",
              borderRadius: 14,
              padding: 14,
              boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: "#64748b",
                fontWeight: 800,
                letterSpacing: "0.08em",
                marginBottom: 4,
              }}
            >
              {c.label}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: c.color }}>
              {fmtBRL(c.val)}
            </div>
          </div>
        ))}
      </div>

      {/* Gráfico */}
      {(totalEntradas > 0 || totalGastos > 0) && (
        <div
          style={{
            background: "linear-gradient(155deg, #1c2026, #17191d)",
            border: "1px solid #ffffff10",
            borderRadius: 16,
            padding: 16,
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
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
            VISÃO GERAL — {MESES[mes].toUpperCase()}
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 10 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  background: "linear-gradient(155deg, #1c2026, #17191d)",
                  border: "1px solid #ffffff10",
                  borderRadius: 8,
                  color: "#f8fafc",
                  fontSize: 12,
                }}
                formatter={(v) => [fmtBRL(v)]}
              />
              <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                {dadosGrafico.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Abas */}
      <div
        style={{
          display: "flex",
          gap: 6,
          background: "linear-gradient(155deg, #1c2026, #17191d)",
          padding: 5,
          borderRadius: 12,
        }}
      >
        {[
          { id: "gastos", label: "💸 Gastos" },
          { id: "cartao", label: "💳 Cartão" },
          { id: "invest", label: "📈 Invest" },
          { id: "entradas", label: "💰 Entradas" },
          { id: "resumo", label: "📊 Resumo" },
        ].map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            style={{
              flex: 1,
              background:
                aba === a.id
                  ? "linear-gradient(135deg, #6366f1, #4f46e5)"
                  : "transparent",
              border: "none",
              borderRadius: 8,
              color: aba === a.id ? "#fff" : "#64748b",
              fontSize: 10,
              fontWeight: 700,
              padding: "8px 2px",
              cursor: "pointer",
              boxShadow:
                aba === a.id ? "0 3px 12px rgba(99,102,241,0.4)" : "none",
              transition: "all 0.2s",
            }}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* ABA GASTOS */}
      {aba === "gastos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
              ADICIONAR GASTO
            </div>
            <input
              placeholder="Descrição (ex: Aluguel)"
              value={gastoNome}
              onChange={(e) => setGastoNome(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                document.getElementById("gasto-valor")?.focus()
              }
            />
            <input
              id="gasto-valor"
              type="number"
              placeholder="Valor R$"
              value={gastoValor}
              onChange={(e) => setGastoValor(e.target.value)}
              style={{ marginTop: 8 }}
              onKeyDown={(e) => e.key === "Enter" && adicionarGasto()}
            />
            <select
              value={gastoCategoria}
              onChange={(e) => setGastoCategoria(e.target.value)}
              style={{ marginTop: 8 }}
            >
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
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
                DATA DO PAGAMENTO (opcional)
              </div>
              <input
                type="date"
                value={gastoData}
                min={`${ano}-${String(mes + 1).padStart(2, "0")}-01`}
                max={`${ano}-${String(mes + 1).padStart(2, "0")}-${String(new Date(ano, mes + 1, 0).getDate()).padStart(2, "0")}`}
                onChange={(e) => setGastoData(e.target.value)}
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
            <button
              onClick={adicionarGasto}
              style={{
                marginTop: 10,
                width: "100%",
                background: "#ef4444",
                border: "none",
                borderRadius: 10,
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                padding: 12,
                cursor: "pointer",
              }}
            >
              + Adicionar Gasto
            </button>
          </div>
          {gastos.length === 0 ? (
            <p style={{ textAlign: "center", color: "#475569", fontSize: 13 }}>
              Nenhum gasto registrado.
            </p>
          ) : (
            gastos.map((g) => (
              <div
                key={g.id}
                style={{
                  background: "linear-gradient(155deg, #1c2026, #17191d)",
                  border: "1px solid #ffffff10",
                  borderLeft: `3px solid ${CORES_CATEGORIA[g.categoria] || "#ef4444"}`,
                  borderRadius: 12,
                  padding: "12px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div
                    style={{ fontSize: 14, fontWeight: 600, color: "#f8fafc" }}
                  >
                    {g.nome}
                  </div>
                  {g.categoria && (
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: 10,
                        fontWeight: 700,
                        color: CORES_CATEGORIA[g.categoria] || "#94a3b8",
                        marginTop: 3,
                      }}
                    >
                      {g.categoria}
                    </span>
                  )}
                  {g.data && (
                    <div
                      style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}
                    >
                      📅{" "}
                      {new Date(g.data + "T00:00:00").toLocaleDateString(
                        "pt-BR",
                      )}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{ fontSize: 15, fontWeight: 700, color: "#ef4444" }}
                  >
                    {fmtBRL(g.valor)}
                  </span>
                  <button
                    onClick={() =>
                      deletar("financeiro_gastos", g.id, setGastos)
                    }
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
              </div>
            ))
          )}
        </div>
      )}

      {/* ABA CARTÃO */}
      {aba === "cartao" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Meus cartões */}
          <div
            style={{
              background: "linear-gradient(155deg, #1c2026, #17191d)",
              border: "1px solid #ffffff10",
              borderRadius: 16,
              padding: 16,
              boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
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
              MEUS CARTÕES
            </div>
            {cartoesComResumo.length === 0 && (
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
                Nenhum cartão cadastrado ainda. Adiciona um abaixo.
              </div>
            )}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginBottom: 12,
              }}
            >
              {cartoesComResumo.map((cta) => (
                <div
                  key={cta.id}
                  style={{
                    background: "#24282d",
                    border: "1px solid #ffffff10",
                    borderRadius: 10,
                    padding: "10px 12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#f8fafc",
                      }}
                    >
                      💳 {cta.nome}
                    </div>
                    <button
                      onClick={() => removerCartaoConta(cta.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        fontSize: 14,
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 6,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <span style={{ fontSize: 10, color: "#64748b" }}>
                        Fecha dia
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        defaultValue={cta.dia_fechamento}
                        onBlur={(e) =>
                          salvarFechamentoCartao(
                            cta.id,
                            parseInt(e.target.value, 10) || 5,
                          )
                        }
                        style={{
                          width: 36,
                          background: "#1a1d21",
                          border: "1px solid #ffffff10",
                          borderRadius: 6,
                          color: "#f8fafc",
                          fontSize: 11,
                          padding: "2px 4px",
                          textAlign: "center",
                        }}
                      />
                      <span
                        style={{
                          fontSize: 11,
                          color: "#f97316",
                          fontWeight: 700,
                        }}
                      >
                        · {cta.diasParaFechar} dia
                        {cta.diasParaFechar !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#f8fafc",
                      }}
                    >
                      {fmtBRL(cta.totalDoCartao)}
                    </span>
                  </div>
                </div>
              ))}
              {lancamentosSemCartao.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    color: "#64748b",
                    padding: "4px 4px",
                  }}
                >
                  <span>Sem cartão vinculado</span>
                  <span>{fmtBRL(totalSemCartao)}</span>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                placeholder="Nome do cartão (ex: Nubank)"
                value={novoCartaoNome}
                onChange={(e) => setNovoCartaoNome(e.target.value)}
                style={{ flex: 2 }}
              />
              <input
                type="number"
                min="1"
                max="31"
                placeholder="Fecha dia"
                value={novoCartaoFechamento}
                onChange={(e) => setNovoCartaoFechamento(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                onClick={adicionarCartaoConta}
                style={{
                  background: "#6366f1",
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  padding: "0 14px",
                  cursor: "pointer",
                }}
              >
                + Cartão
              </button>
            </div>
          </div>
          <div
            style={{
              background: "linear-gradient(155deg, #1c2026, #17191d)",
              border: "1px solid #ffffff10",
              borderRadius: 16,
              padding: 18,
              boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "#64748b",
                fontWeight: 800,
                letterSpacing: "0.08em",
                marginBottom: 8,
              }}
            >
              LANÇAR NO CARTÃO
            </div>
            <div
              style={{
                background: "#f59e0b15",
                border: "1px solid #f59e0b33",
                borderRadius: 8,
                padding: "8px 12px",
                marginBottom: 12,
                fontSize: 12,
                color: "#f59e0b",
                lineHeight: 1.5,
              }}
            >
              ⚠️ O cartão não é contabilizado no saldo. Quando chegar a fatura,
              registre o total na aba <strong>Gastos</strong>.
            </div>
            <input
              placeholder="O que comprou?"
              value={cartaoItem}
              onChange={(e) => setCartaoItem(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                document.getElementById("cartao-valor")?.focus()
              }
            />
            <input
              id="cartao-valor"
              type="number"
              placeholder="Valor total R$"
              value={cartaoValor}
              onChange={(e) => setCartaoValor(e.target.value)}
              style={{ marginTop: 8 }}
              onKeyDown={(e) => e.key === "Enter" && adicionarCartao()}
            />
            {cartoes.length > 0 && (
              <select
                value={cartaoSelecionado}
                onChange={(e) => setCartaoSelecionado(e.target.value)}
                style={{ marginTop: 8 }}
              >
                {cartoes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            )}
            <select
              value={cartaoCategoria}
              onChange={(e) => setCartaoCategoria(e.target.value)}
              style={{ marginTop: 8 }}
            >
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 10,
                fontSize: 12,
                color: "#cbd5e1",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={cartaoParcelado}
                onChange={(e) => setCartaoParcelado(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              Compra parcelada
            </label>
            {cartaoParcelado && (
              <input
                type="number"
                min="2"
                placeholder="Número de parcelas"
                value={cartaoParcelas}
                onChange={(e) => setCartaoParcelas(e.target.value)}
                style={{ marginTop: 8 }}
              />
            )}
            <button
              onClick={adicionarCartao}
              style={{
                marginTop: 10,
                width: "100%",
                background: "#f97316",
                border: "none",
                borderRadius: 10,
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                padding: 12,
                cursor: "pointer",
              }}
            >
              + Lançar no Cartão
            </button>
          </div>
          {cartao.length === 0 ? (
            <p style={{ textAlign: "center", color: "#475569", fontSize: 13 }}>
              Nenhum lançamento no cartão.
            </p>
          ) : (
            cartao.map((c) => (
              <div
                key={c.id}
                style={{
                  background: "linear-gradient(155deg, #1c2026, #17191d)",
                  border: "1px solid #ffffff10",
                  borderLeft: "3px solid #f97316",
                  borderRadius: 12,
                  padding: "12px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div
                    style={{ fontSize: 14, fontWeight: 600, color: "#f8fafc" }}
                  >
                    {c.item}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    💳{" "}
                    {cartoes.find((cta) => cta.id === c.cartao_id)?.nome ||
                      "Sem cartão"}{" "}
                    · {c.categoria || "Outros"}
                    {c.total_parcelas > 1 &&
                      ` · Parcela ${c.parcela_atual}/${c.total_parcelas}`}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{ fontSize: 15, fontWeight: 700, color: "#f97316" }}
                  >
                    {fmtBRL(c.valor)}
                  </span>
                  <button
                    onClick={() =>
                      deletar("financeiro_cartao", c.id, setCartao)
                    }
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
              </div>
            ))
          )}

          {parcelasFuturasLista.length > 0 && (
            <div
              style={{
                background: "linear-gradient(155deg, #1c2026, #17191d)",
                border: "1px solid #ffffff10",
                borderRadius: 16,
                padding: 16,
                boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: "#64748b",
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  marginBottom: 10,
                }}
              >
                PARCELAS DOS PRÓXIMOS MESES
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {parcelasFuturasLista.map((p) => (
                  <div
                    key={`${p.mes}-${p.ano}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                      color: "#cbd5e1",
                    }}
                  >
                    <span>
                      {MESES[p.mes]}/{p.ano}
                    </span>
                    <span style={{ color: "#f97316", fontWeight: 700 }}>
                      {fmtBRL(p.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA INVEST */}
      {aba === "invest" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
              REGISTRAR INVESTIMENTO
            </div>
            <select
              value={investTipo}
              onChange={(e) => setInvestTipo(e.target.value)}
              style={{
                width: "100%",
                background: "#24282d",
                border: "1px solid #ffffff10",
                borderRadius: 8,
                color: "#f8fafc",
                fontSize: 14,
                padding: "10px 12px",
              }}
            >
              {INVEST_TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Valor R$"
              value={investValor}
              onChange={(e) => setInvestValor(e.target.value)}
              style={{ marginTop: 8 }}
              onKeyDown={(e) => e.key === "Enter" && adicionarInvestimento()}
            />
            <button
              onClick={adicionarInvestimento}
              style={{
                marginTop: 10,
                width: "100%",
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
              + Salvar Investimento
            </button>
          </div>
          {investimentos.length === 0 ? (
            <p style={{ textAlign: "center", color: "#475569", fontSize: 13 }}>
              Nenhum investimento registrado.
            </p>
          ) : (
            investimentos.map((i) => (
              <div
                key={i.id}
                style={{
                  background: "linear-gradient(155deg, #1c2026, #17191d)",
                  border: "1px solid #ffffff10",
                  borderLeft: "3px solid #f59e0b",
                  borderRadius: 12,
                  padding: "12px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div
                  style={{ fontSize: 14, fontWeight: 600, color: "#f8fafc" }}
                >
                  📈 {i.tipo}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{ fontSize: 15, fontWeight: 700, color: "#f59e0b" }}
                  >
                    {fmtBRL(i.valor)}
                  </span>
                  <button
                    onClick={() =>
                      deletar(
                        "financeiro_investimentos",
                        i.id,
                        setInvestimentos,
                      )
                    }
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
              </div>
            ))
          )}
        </div>
      )}

      {/* ABA ENTRADAS */}
      {aba === "entradas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
              REGISTRAR ENTRADA
            </div>
            <input
              placeholder="Origem (ex: Salário)"
              value={entradaNome}
              onChange={(e) => setEntradaNome(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                document.getElementById("entrada-valor")?.focus()
              }
            />
            <input
              id="entrada-valor"
              type="number"
              placeholder="Valor R$"
              value={entradaValor}
              onChange={(e) => setEntradaValor(e.target.value)}
              style={{ marginTop: 8 }}
              onKeyDown={(e) => e.key === "Enter" && adicionarEntrada()}
            />
            <button
              onClick={adicionarEntrada}
              style={{
                marginTop: 10,
                width: "100%",
                background: "#10b981",
                border: "none",
                borderRadius: 10,
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                padding: 12,
                cursor: "pointer",
              }}
            >
              + Adicionar Entrada
            </button>
          </div>
          {entradas.length === 0 ? (
            <p style={{ textAlign: "center", color: "#475569", fontSize: 13 }}>
              Nenhuma entrada registrada.
            </p>
          ) : (
            entradas.map((e) => (
              <div
                key={e.id}
                style={{
                  background: "linear-gradient(155deg, #1c2026, #17191d)",
                  border: "1px solid #ffffff10",
                  borderLeft: "3px solid #10b981",
                  borderRadius: 12,
                  padding: "12px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div
                  style={{ fontSize: 14, fontWeight: 600, color: "#f8fafc" }}
                >
                  💰 {e.nome}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{ fontSize: 15, fontWeight: 700, color: "#10b981" }}
                  >
                    {fmtBRL(e.valor)}
                  </span>
                  <button
                    onClick={() =>
                      deletar("financeiro_entradas", e.id, setEntradas)
                    }
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
              </div>
            ))
          )}
        </div>
      )}

      {/* ABA RESUMO */}
      {aba === "resumo" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              background: "linear-gradient(155deg, #1c2026, #17191d)",
              border: `1px solid ${saldo >= 0 ? "#10b98144" : "#ef444444"}`,
              borderRadius: 16,
              padding: 24,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>
              BALANÇO DE {MESES[mes].toUpperCase()}/{ano}
            </div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: saldo >= 0 ? "#10b981" : "#ef4444",
              }}
            >
              {fmtBRL(saldo)}
            </div>
            <div
              style={{
                fontSize: 12,
                color: saldo >= 0 ? "#10b981" : "#ef4444",
                marginTop: 4,
              }}
            >
              {saldo >= 0
                ? "✅ Você está no positivo!"
                : "⚠️ Você está no negativo!"}
            </div>
          </div>

          {[
            {
              label: "💰 Total de Entradas",
              val: totalEntradas,
              color: "#10b981",
              items: entradas.map((e) => ({ nome: e.nome, val: e.valor })),
            },
            {
              label: "💸 Total de Gastos",
              val: totalGastos,
              color: "#ef4444",
              items: gastos.map((g) => ({
                nome: g.nome,
                val: g.valor,
                data: g.data,
              })),
            },
            {
              label: "💳 Cartão (não contabilizado)",
              val: totalCartao,
              color: "#64748b",
              items: cartao.map((c) => ({ nome: c.item, val: c.valor })),
            },
            {
              label: "📈 Total Investido",
              val: totalInvest,
              color: "#f59e0b",
              items: investimentos.map((i) => ({ nome: i.tipo, val: i.valor })),
            },
          ].map((bloco, idx) => (
            <div
              key={idx}
              style={{
                background: "linear-gradient(155deg, #1c2026, #17191d)",
                border: "1px solid #ffffff10",
                borderRadius: 16,
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: bloco.items.length > 0 ? 12 : 0,
                }}
              >
                <span
                  style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8" }}
                >
                  {bloco.label}
                </span>
                <span
                  style={{ fontSize: 15, fontWeight: 700, color: bloco.color }}
                >
                  {fmtBRL(bloco.val)}
                </span>
              </div>
              {bloco.items.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    borderTop: "1px solid #ffffff08",
                    fontSize: 12,
                    color: "#64748b",
                  }}
                >
                  <span>
                    {item.nome}
                    {item.data
                      ? ` (${new Date(item.data + "T00:00:00").toLocaleDateString("pt-BR")})`
                      : ""}
                  </span>
                  <span style={{ color: "#94a3b8", fontWeight: 600 }}>
                    {fmtBRL(item.val)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
