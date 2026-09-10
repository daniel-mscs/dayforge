import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";
import { toast } from "./lib/toast";
import { askConfirm } from "./lib/confirm";
import {
  Wallet,
  Banknote,
  CreditCard,
  TrendingUp,
  Receipt,
  Target,
  BarChart3,
  Calendar,
} from "lucide-react";
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
  const [novoCartaoVencimento, setNovoCartaoVencimento] = useState("10");

  const [modalClonarMes, setModalClonarMes] = useState(false);
  const [clonarSelecao, setClonarSelecao] = useState({
    gastos: true,
    cartao: true,
    investimentos: true,
    entradas: true,
  });
  const [clonandoMes, setClonandoMes] = useState(false);

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
  const [categoriaAberta, setCategoriaAberta] = useState(null);
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

  const [contas, setContas] = useState([]);
  const [contaNome, setContaNome] = useState("");
  const [contaPlanejado, setContaPlanejado] = useState("");

  const [metas, setMetas] = useState([]);
  const [metaNome, setMetaNome] = useState("");
  const [metaValorAlvo, setMetaValorAlvo] = useState("");
  const [contribuicaoInput, setContribuicaoInput] = useState({});

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
      { data: saldoIniData },
      { data: contasData },
      { data: metasData },
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
        .order("nome", { ascending: true }),
      supabase
        .from("financeiro_saldo_inicial")
        .select("*")
        .eq("user_id", user.id)
        .eq("mes", mes)
        .eq("ano", ano)
        .maybeSingle(),
      supabase
        .from("financeiro_contas")
        .select("*")
        .eq("user_id", user.id)
        .eq("mes", mes)
        .eq("ano", ano)
        .order("created_at", { ascending: true }),
      supabase
        .from("financeiro_metas")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
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

    setSaldoAcumulado(saldoIniData?.valor ?? 0);
    setContas(contasData || []);
    setMetas(metasData || []);

    setCarregando(false);
  }, [user.id, mes, ano]);

  useEffect(() => {
    buscarTudo();
  }, [buscarTudo]);

  const [gastoEssencial, setGastoEssencial] = useState(true);

  const adicionarGasto = async () => {
    if (!gastoNome || !gastoValor) return toast("Preencha os campos!", "error");
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
          essencial: gastoEssencial,
        },
      ])
      .select();
    if (error) return toast(error.message, "error");
    setGastos((prev) => [data[0], ...prev]);
    setGastoNome("");
    setGastoValor("");
    setGastoData("");
  };

  const adicionarCartao = async () => {
    if (!cartaoItem || !cartaoValor)
      return toast("Preencha os campos!", "error");
    if (!cartaoSelecionado)
      return toast(
        "Cadastre um cartão antes de lançar (abaixo do formulário).",
        "error",
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
    if (error) return toast(error.message, "error");
    const desseMes = (data || []).filter((d) => d.mes === mes && d.ano === ano);
    setCartao((prev) => [...desseMes, ...prev]);
    setCartaoItem("");
    setCartaoValor("");
    setCartaoParcelado(false);
    setCartaoParcelas("2");
  };

  const adicionarCartaoConta = async () => {
    if (!novoCartaoNome) return toast("Dá um nome pro cartão!", "error");
    const { data, error } = await supabase
      .from("financeiro_cartoes")
      .insert([
        {
          user_id: user.id,
          nome: novoCartaoNome,
          dia_vencimento: parseInt(novoCartaoVencimento, 10) || 10,
        },
      ])
      .select();
    if (error) return toast(error.message, "error");
    setCartoes((prev) => [...prev, data[0]]);
    if (!cartaoSelecionado) setCartaoSelecionado(data[0].id);
    setNovoCartaoNome("");
    setNovoCartaoVencimento("10");
  };

  const removerCartaoConta = async (id) => {
    const ok = await askConfirm(
      "Remover esse cartão? Os lançamentos já feitos continuam existindo, só ficam sem cartão vinculado.",
    );
    if (!ok) return;
    await supabase.from("financeiro_cartoes").delete().eq("id", id);
    setCartoes((prev) => prev.filter((c) => c.id !== id));
    if (cartaoSelecionado === id) setCartaoSelecionado("");
  };

  const salvarVencimentoCartao = async (id, dia) => {
    setCartoes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, dia_vencimento: dia } : c)),
    );
    await supabase
      .from("financeiro_cartoes")
      .update({ dia_vencimento: dia })
      .eq("id", id);
  };

  const salvarLimite = async () => {
    if (!novoLimiteValor) return toast("Informe o valor do limite!", "error");
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
    if (error) return toast(error.message, "error");
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
      return toast("Preencha os campos!", "error");
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
    if (error) return toast(error.message, "error");
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

  const salvarSaldoInicial = async (valor) => {
    setSaldoAcumulado(valor);
    await supabase
      .from("financeiro_saldo_inicial")
      .upsert(
        { user_id: user.id, mes, ano, valor },
        { onConflict: "user_id,mes,ano" },
      );
  };

  const adicionarConta = async () => {
    if (!contaNome || !contaPlanejado)
      return toast("Preencha nome e valor planejado!", "error");
    const { data, error } = await supabase
      .from("financeiro_contas")
      .insert([
        {
          user_id: user.id,
          mes,
          ano,
          nome: contaNome,
          planejado: parseFloat(contaPlanejado),
        },
      ])
      .select();
    if (error) return toast(error.message, "error");
    setContas((prev) => [...prev, data[0]]);
    setContaNome("");
    setContaPlanejado("");
  };

  const marcarContaPaga = async (conta, valorPago) => {
    const val = parseFloat(valorPago);
    if (!val) return toast("Informe o valor pago!", "error");
    const hojeStr = new Date().toISOString().split("T")[0];
    const { error } = await supabase
      .from("financeiro_contas")
      .update({ valor_pago: val, data_pago: hojeStr })
      .eq("id", conta.id);
    if (error) return toast(error.message, "error");
    setContas((prev) =>
      prev.map((c) =>
        c.id === conta.id ? { ...c, valor_pago: val, data_pago: hojeStr } : c,
      ),
    );
  };

  const desmarcarContaPaga = async (id) => {
    await supabase
      .from("financeiro_contas")
      .update({ valor_pago: null, data_pago: null })
      .eq("id", id);
    setContas((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, valor_pago: null, data_pago: null } : c,
      ),
    );
  };

  const adicionarMeta = async () => {
    if (!metaNome || !metaValorAlvo)
      return toast("Preencha nome e valor da meta!", "error");
    const { data, error } = await supabase
      .from("financeiro_metas")
      .insert([
        {
          user_id: user.id,
          nome: metaNome,
          valor_meta: parseFloat(metaValorAlvo),
        },
      ])
      .select();
    if (error) return toast(error.message, "error");
    setMetas((prev) => [...prev, data[0]]);
    setMetaNome("");
    setMetaValorAlvo("");
  };

  const contribuirMeta = async (meta) => {
    const val = parseFloat(contribuicaoInput[meta.id]);
    if (!val || val <= 0) return toast("Digite um valor válido!", "error");
    const novoValor = Number(meta.valor_atual) + val;
    const { error } = await supabase
      .from("financeiro_metas")
      .update({ valor_atual: novoValor })
      .eq("id", meta.id);
    if (error) return toast(error.message, "error");
    setMetas((prev) =>
      prev.map((m) =>
        m.id === meta.id ? { ...m, valor_atual: novoValor } : m,
      ),
    );
    setContribuicaoInput((prev) => ({ ...prev, [meta.id]: "" }));
    toast("Contribuição registrada! 🎯", "success");
  };

  const clonarMesPassado = async () => {
    if (clonandoMes) return;
    setClonandoMes(true);
    const mp = mes === 0 ? { mes: 11, ano: ano - 1 } : { mes: mes - 1, ano };
    try {
      if (clonarSelecao.gastos) {
        const { data: ant } = await supabase
          .from("financeiro_gastos")
          .select("nome, valor, categoria")
          .eq("user_id", user.id)
          .eq("mes", mp.mes)
          .eq("ano", mp.ano);
        if (ant?.length)
          await supabase.from("financeiro_gastos").insert(
            ant.map((g) => ({
              user_id: user.id,
              mes,
              ano,
              nome: g.nome,
              valor: g.valor,
              categoria: g.categoria,
            })),
          );
      }
      if (clonarSelecao.cartao) {
        const { data: ant } = await supabase
          .from("financeiro_cartao")
          .select("item, valor, categoria, cartao_id")
          .eq("user_id", user.id)
          .eq("mes", mp.mes)
          .eq("ano", mp.ano)
          .is("grupo_parcela_id", null);
        if (ant?.length)
          await supabase.from("financeiro_cartao").insert(
            ant.map((c) => ({
              user_id: user.id,
              mes,
              ano,
              item: c.item,
              valor: c.valor,
              categoria: c.categoria,
              cartao_id: c.cartao_id,
            })),
          );
      }
      if (clonarSelecao.investimentos) {
        const { data: ant } = await supabase
          .from("financeiro_investimentos")
          .select("tipo, valor")
          .eq("user_id", user.id)
          .eq("mes", mp.mes)
          .eq("ano", mp.ano);
        if (ant?.length)
          await supabase.from("financeiro_investimentos").insert(
            ant.map((i) => ({
              user_id: user.id,
              mes,
              ano,
              tipo: i.tipo,
              valor: i.valor,
            })),
          );
      }
      if (clonarSelecao.entradas) {
        const { data: ant } = await supabase
          .from("financeiro_entradas")
          .select("nome, valor")
          .eq("user_id", user.id)
          .eq("mes", mp.mes)
          .eq("ano", mp.ano);
        if (ant?.length)
          await supabase.from("financeiro_entradas").insert(
            ant.map((e) => ({
              user_id: user.id,
              mes,
              ano,
              nome: e.nome,
              valor: e.valor,
            })),
          );
      }
      setModalClonarMes(false);
      await buscarTudo();
    } catch (err) {
      toast("Erro ao clonar: " + err.message, "error");
    }
    setClonandoMes(false);
  };

  const adicionarInvestimento = async () => {
    if (!investValor) return toast("Informe o valor!", "error");
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
    if (error) return toast(error.message, "error");
    setInvestimentos((prev) => [data[0], ...prev]);
    setInvestValor("");
  };

  const adicionarEntrada = async () => {
    if (!entradaNome || !entradaValor)
      return toast("Preencha os campos!", "error");
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
    if (error) return toast(error.message, "error");
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

  // Gastos por categoria (Gastos + Cartão somados juntos — é assim que faz
  // sentido pra quem separa um valor por categoria tipo "R$300 de lazer")
  const gastosPorCategoria = {};
  const itensPorCategoria = {};
  gastos.forEach((g) => {
    const cat = g.categoria || "Outros";
    gastosPorCategoria[cat] = (gastosPorCategoria[cat] || 0) + Number(g.valor);
    if (!itensPorCategoria[cat]) itensPorCategoria[cat] = [];
    itensPorCategoria[cat].push({
      id: g.id,
      nome: g.nome,
      valor: Number(g.valor),
      origem: "Gasto",
      data: g.data,
    });
  });
  cartao.forEach((c) => {
    const cat = c.categoria || "Outros";
    gastosPorCategoria[cat] = (gastosPorCategoria[cat] || 0) + Number(c.valor);
    if (!itensPorCategoria[cat]) itensPorCategoria[cat] = [];
    itensPorCategoria[cat].push({
      id: c.id,
      nome: c.item,
      valor: Number(c.valor),
      origem: "Cartão",
      data: null,
    });
  });
  const dadosPizza = Object.entries(gastosPorCategoria).map(([nome, val]) => ({
    name: nome,
    value: val,
    fill: CORES_CATEGORIA[nome] || "#64748b",
  }));

  // Fatura fechando — um cálculo por cartão
  const cartoesComResumo = cartoes.map((cta) => {
    const diaVencimento = cta.dia_vencimento || 10;
    let diaFechamento = diaVencimento - 7;
    if (diaFechamento <= 0) diaFechamento += diasNoMes;
    const diasParaFechar =
      diaFechamento >= diaAtual
        ? diaFechamento - diaAtual
        : diaFechamento + diasNoMes - diaAtual;
    const totalDoCartao = cartao
      .filter((c) => c.cartao_id === cta.id)
      .reduce((s, c) => s + Number(c.valor), 0);
    return { ...cta, diaFechamento, diasParaFechar, totalDoCartao };
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
        Carregando Finanças...
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
          flexWrap: "wrap",
          gap: 8,
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
          <Wallet
            size={20}
            color="#818cf8"
            style={{ filter: "drop-shadow(0 0 6px rgba(129,140,248,0.6))" }}
          />
          Finanças
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

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
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
            padding: "6px 10px",
          }}
        >
          <span style={{ fontSize: 11, color: "#94a3b8" }}>
            Trazido do mês passado: R$
          </span>
          <input
            type="number"
            defaultValue={saldoAcumulado}
            onBlur={(e) => salvarSaldoInicial(parseFloat(e.target.value) || 0)}
            style={{
              width: 64,
              background: "transparent",
              border: "none",
              borderBottom: "1px dashed #475569",
              color: saldoAcumulado >= 0 ? "#10b981" : "#ef4444",
              fontSize: 12,
              fontWeight: 800,
              padding: "0 2px",
              textAlign: "right",
            }}
          />
        </div>
        <button
          onClick={() => setModalClonarMes(true)}
          style={{
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.3)",
            borderRadius: 10,
            color: "#a5b4fc",
            fontSize: 11,
            fontWeight: 700,
            padding: "6px 12px",
            cursor: "pointer",
          }}
        >
          📋 Clonar do mês passado
        </button>
      </div>

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
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 6,
          background: "linear-gradient(155deg, #1c2026, #17191d)",
          padding: 6,
          borderRadius: 14,
        }}
      >
        {[
          {
            id: "gastos",
            icon: Banknote,
            label: "Gastos",
            cor: "#ef4444",
            corEscura: "#dc2626",
          },
          {
            id: "cartao",
            icon: CreditCard,
            label: "Cartão",
            cor: "#f97316",
            corEscura: "#ea580c",
          },
          {
            id: "invest",
            icon: TrendingUp,
            label: "Invest",
            cor: "#f59e0b",
            corEscura: "#d97706",
          },
          {
            id: "entradas",
            icon: Wallet,
            label: "Entradas",
            cor: "#10b981",
            corEscura: "#059669",
          },
          {
            id: "contas",
            icon: Receipt,
            label: "Contas",
            cor: "#06b6d4",
            corEscura: "#0891b2",
          },
          {
            id: "metas",
            icon: Target,
            label: "Metas",
            cor: "#14b8a6",
            corEscura: "#0d9488",
          },
          {
            id: "resumo",
            icon: BarChart3,
            label: "Resumo",
            cor: "#6366f1",
            corEscura: "#4f46e5",
          },
        ].map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            style={{
              flex: "0 0 auto",
              width: "22%",
              aspectRatio: "1.3",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              background:
                aba === a.id
                  ? `linear-gradient(135deg, ${a.cor}, ${a.corEscura})`
                  : "#1c2026",
              border: "1px solid #ffffff0d",
              borderRadius: 10,
              color: aba === a.id ? "#fff" : a.cor,
              fontSize: 9,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: aba === a.id ? `0 3px 12px ${a.cor}66` : "none",
              transition: "all 0.2s",
            }}
          >
            <a.icon size={17} strokeWidth={2} />
            <span style={{ color: aba === a.id ? "#fff" : "#94a3b8" }}>
              {a.label}
            </span>
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
                checked={gastoEssencial}
                onChange={(e) => setGastoEssencial(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              Essencial (moradia, contas fixas, mercado...)
            </label>
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
                      {g.essencial === false && (
                        <span style={{ color: "#f59e0b", marginLeft: 6 }}>
                          · extra
                        </span>
                      )}
                    </span>
                  )}
                  {g.data && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                        color: "#64748b",
                        marginTop: 2,
                      }}
                    >
                      <Calendar size={11} />
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
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <CreditCard size={14} color="#f97316" />
                      {cta.nome}
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
                        Vence dia
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        defaultValue={cta.dia_vencimento}
                        onBlur={(e) =>
                          salvarVencimentoCartao(
                            cta.id,
                            parseInt(e.target.value, 10) || 10,
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
                        · fecha em {cta.diasParaFechar} dia
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
                placeholder="Vence dia"
                value={novoCartaoVencimento}
                onChange={(e) => setNovoCartaoVencimento(e.target.value)}
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
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      color: "#64748b",
                      marginTop: 2,
                    }}
                  >
                    <CreditCard size={11} />
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
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#f8fafc",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <TrendingUp size={15} color="#f59e0b" />
                  {i.tipo}
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
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#f8fafc",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Wallet size={15} color="#10b981" />
                  {e.nome}
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

      {/* ABA CONTAS */}
      {aba === "contas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
                marginBottom: 12,
              }}
            >
              ADICIONAR CONTA
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#94a3b8",
                marginBottom: 12,
                lineHeight: 1.5,
              }}
            >
              Diferente de "Gastos": aqui você planeja o valor esperado (ex:
              conta de luz ≈ R$150) e depois confirma quanto pagou de verdade.
            </div>
            <input
              placeholder="Nome (ex: Conta de luz)"
              value={contaNome}
              onChange={(e) => setContaNome(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                document.getElementById("conta-planejado")?.focus()
              }
            />
            <input
              id="conta-planejado"
              type="number"
              placeholder="Valor planejado R$"
              value={contaPlanejado}
              onChange={(e) => setContaPlanejado(e.target.value)}
              style={{ marginTop: 8 }}
              onKeyDown={(e) => e.key === "Enter" && adicionarConta()}
            />
            <button
              onClick={adicionarConta}
              style={{
                marginTop: 10,
                width: "100%",
                background: "#6366f1",
                border: "none",
                borderRadius: 10,
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                padding: 12,
                cursor: "pointer",
              }}
            >
              + Adicionar Conta
            </button>
          </div>
          {contas.length === 0 ? (
            <p style={{ textAlign: "center", color: "#475569", fontSize: 13 }}>
              Nenhuma conta planejada esse mês.
            </p>
          ) : (
            contas.map((c) => {
              const paga = c.valor_pago !== null && c.valor_pago !== undefined;
              return (
                <div
                  key={c.id}
                  style={{
                    background: "linear-gradient(155deg, #1c2026, #17191d)",
                    border: "1px solid #ffffff10",
                    borderLeft: `3px solid ${paga ? "#10b981" : "#f59e0b"}`,
                    borderRadius: 12,
                    padding: "12px 14px",
                  }}
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
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#f8fafc",
                        }}
                      >
                        {c.nome}
                      </div>
                      <div
                        style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}
                      >
                        Planejado: {fmtBRL(c.planejado)}
                        {paga && c.data_pago && (
                          <>
                            {" "}
                            ·{" "}
                            {new Date(
                              c.data_pago + "T00:00:00",
                            ).toLocaleDateString("pt-BR")}
                          </>
                        )}
                      </div>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      {paga ? (
                        <span
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: "#10b981",
                          }}
                        >
                          ✓ {fmtBRL(c.valor_pago)}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: "#f59e0b" }}>
                          Pendente
                        </span>
                      )}
                      <button
                        onClick={() =>
                          deletar("financeiro_contas", c.id, setContas)
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
                  {paga ? (
                    <button
                      onClick={() => desmarcarContaPaga(c.id)}
                      style={{
                        marginTop: 8,
                        background: "none",
                        border: "1px solid #ffffff10",
                        borderRadius: 8,
                        color: "#64748b",
                        fontSize: 11,
                        padding: "5px 10px",
                        cursor: "pointer",
                      }}
                    >
                      Desmarcar
                    </button>
                  ) : (
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <input
                        type="number"
                        placeholder={`Pago (planejado: ${c.planejado})`}
                        defaultValue={c.planejado}
                        id={`pago-${c.id}`}
                        style={{ flex: 1, marginTop: 0 }}
                      />
                      <button
                        onClick={() =>
                          marcarContaPaga(
                            c,
                            document.getElementById(`pago-${c.id}`)?.value,
                          )
                        }
                        style={{
                          background: "#10b981",
                          border: "none",
                          borderRadius: 8,
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 700,
                          padding: "0 14px",
                          cursor: "pointer",
                        }}
                      >
                        ✓ Paguei
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ABA METAS */}
      {aba === "metas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
                marginBottom: 12,
              }}
            >
              NOVA META
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
              Ex: Reserva de emergência, Moto, Viagem — metas continuam entre os
              meses, não zeram.
            </div>
            <input
              placeholder="Nome (ex: Reserva de emergência)"
              value={metaNome}
              onChange={(e) => setMetaNome(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                document.getElementById("meta-valor")?.focus()
              }
            />
            <input
              id="meta-valor"
              type="number"
              placeholder="Valor da meta R$"
              value={metaValorAlvo}
              onChange={(e) => setMetaValorAlvo(e.target.value)}
              style={{ marginTop: 8 }}
              onKeyDown={(e) => e.key === "Enter" && adicionarMeta()}
            />
            <button
              onClick={adicionarMeta}
              style={{
                marginTop: 10,
                width: "100%",
                background: "#6366f1",
                border: "none",
                borderRadius: 10,
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                padding: 12,
                cursor: "pointer",
              }}
            >
              + Criar Meta
            </button>
          </div>
          {metas.length === 0 ? (
            <p style={{ textAlign: "center", color: "#475569", fontSize: 13 }}>
              Nenhuma meta criada ainda.
            </p>
          ) : (
            metas.map((m) => {
              const pct = Math.min(
                100,
                Math.round(
                  (Number(m.valor_atual) / Number(m.valor_meta)) * 100,
                ),
              );
              return (
                <div
                  key={m.id}
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
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#f8fafc",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Target size={15} color="#10b981" />
                      {m.nome}
                    </span>
                    <button
                      onClick={() =>
                        deletar("financeiro_metas", m.id, setMetas)
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
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ color: "#10b981", fontWeight: 700 }}>
                      {fmtBRL(m.valor_atual)}
                    </span>
                    <span style={{ color: "#64748b" }}>
                      de {fmtBRL(m.valor_meta)} · {pct}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      borderRadius: 99,
                      background: "#ffffff0d",
                      overflow: "hidden",
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: "#10b981",
                        borderRadius: 99,
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      type="number"
                      placeholder="Contribuir R$"
                      value={contribuicaoInput[m.id] || ""}
                      onChange={(e) =>
                        setContribuicaoInput((prev) => ({
                          ...prev,
                          [m.id]: e.target.value,
                        }))
                      }
                      style={{ flex: 1, marginTop: 0 }}
                      onKeyDown={(e) => e.key === "Enter" && contribuirMeta(m)}
                    />
                    <button
                      onClick={() => contribuirMeta(m)}
                      style={{
                        background: "#10b981",
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
                </div>
              );
            })
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

          {/* Limites por categoria */}
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
              LIMITES POR CATEGORIA
            </div>
            {limites.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                {limites.map((l) => {
                  const gasto = gastosPorCategoria[l.categoria] || 0;
                  const pct = Math.min(
                    100,
                    (gasto / Number(l.valor_limite)) * 100,
                  );
                  const estourou = gasto > Number(l.valor_limite);
                  return (
                    <div
                      key={l.id}
                      onClick={() => setCategoriaAberta(l.categoria)}
                      style={{ cursor: "pointer" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12,
                          color: "#cbd5e1",
                          marginBottom: 3,
                        }}
                      >
                        <span>
                          {l.categoria}{" "}
                          {estourou && (
                            <span style={{ color: "#ef4444" }}>
                              ⚠️ estourou
                            </span>
                          )}
                        </span>
                        <span style={{ display: "flex", gap: 6 }}>
                          <span
                            style={{
                              color: estourou ? "#ef4444" : "#818cf8",
                              fontWeight: 700,
                            }}
                          >
                            {fmtBRL(gasto)} / {fmtBRL(l.valor_limite)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removerLimite(l.id);
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#475569",
                              cursor: "pointer",
                              padding: 0,
                            }}
                          >
                            ×
                          </button>
                        </span>
                      </div>
                      <div
                        style={{
                          height: 6,
                          borderRadius: 99,
                          background: "#ffffff0d",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${pct}%`,
                            background: estourou ? "#ef4444" : "#6366f1",
                            borderRadius: 99,
                          }}
                        />
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "#475569",
                          marginTop: 3,
                        }}
                      >
                        Restam {fmtBRL(Math.max(0, l.valor_limite - gasto))} ·
                        toque para ver os lançamentos
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ display: "flex", gap: 6 }}>
              <select
                value={novoLimiteCategoria}
                onChange={(e) => setNovoLimiteCategoria(e.target.value)}
                style={{ flex: 1 }}
              >
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="R$"
                value={novoLimiteValor}
                onChange={(e) => setNovoLimiteValor(e.target.value)}
                style={{ width: 90 }}
              />
              <button
                onClick={salvarLimite}
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
                Definir
              </button>
            </div>
          </div>

          {[
            {
              icon: Wallet,
              label: "Total de Entradas",
              val: totalEntradas,
              color: "#10b981",
              items: entradas.map((e) => ({ nome: e.nome, val: e.valor })),
            },
            {
              icon: Banknote,
              label: "Total de Gastos",
              val: totalGastos,
              color: "#ef4444",
              items: gastos.map((g) => ({
                nome: g.nome,
                val: g.valor,
                data: g.data,
              })),
            },
            {
              icon: CreditCard,
              label: "Cartão (não contabilizado)",
              val: totalCartao,
              color: "#64748b",
              items: cartao.map((c) => ({ nome: c.item, val: c.valor })),
            },
            {
              icon: TrendingUp,
              label: "Total Investido",
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
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <bloco.icon size={14} color={bloco.color} />
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

      {modalClonarMes && (
        <div className="modal-overlay" onClick={() => setModalClonarMes(false)}>
          <div className="modal-resumo" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1rem", marginBottom: 4 }}>
              📋 Clonar do mês passado
            </h2>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16 }}>
              Copia os lançamentos do mês anterior pra este mês (sem apagar o
              que já tem aqui).
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginBottom: 16,
              }}
            >
              {[
                { id: "gastos", icon: Banknote, label: "Gastos" },
                {
                  id: "cartao",
                  icon: CreditCard,
                  label: "Lançamentos de cartão (não parcelados)",
                },
                {
                  id: "investimentos",
                  icon: TrendingUp,
                  label: "Investimentos",
                },
                { id: "entradas", icon: Wallet, label: "Entradas" },
              ].map((opt) => (
                <label
                  key={opt.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 13,
                    color: "#e2e8f0",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={clonarSelecao[opt.id]}
                    onChange={() =>
                      setClonarSelecao((prev) => ({
                        ...prev,
                        [opt.id]: !prev[opt.id],
                      }))
                    }
                    style={{ width: 17, height: 17, accentColor: "#6366f1" }}
                  />
                  <opt.icon size={15} color="#94a3b8" />
                  {opt.label}
                </label>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={clonarMesPassado}
                disabled={clonandoMes}
                style={{
                  flex: 1,
                  background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                  border: "none",
                  color: "#fff",
                  borderRadius: 10,
                  padding: "12px 0",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {clonandoMes ? "Clonando..." : "Clonar"}
              </button>
              <button
                onClick={() => setModalClonarMes(false)}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "1px solid #ffffff0d",
                  color: "#64748b",
                  borderRadius: 8,
                  padding: "11px 0",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {categoriaAberta && (
        <div className="modal-overlay" onClick={() => setCategoriaAberta(null)}>
          <div className="modal-resumo" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const itens = itensPorCategoria[categoriaAberta] || [];
              const total = gastosPorCategoria[categoriaAberta] || 0;
              const limite = limites.find(
                (l) => l.categoria === categoriaAberta,
              );
              const restante = limite
                ? Number(limite.valor_limite) - total
                : null;
              return (
                <>
                  <h2 style={{ fontSize: "1rem", marginBottom: 4 }}>
                    {categoriaAberta}
                  </h2>
                  <div
                    style={{
                      textAlign: "center",
                      marginBottom: 16,
                    }}
                  >
                    {limite ? (
                      <>
                        <div
                          style={{
                            fontSize: 28,
                            fontWeight: 700,
                            color: restante >= 0 ? "#10b981" : "#ef4444",
                          }}
                        >
                          {fmtBRL(Math.abs(restante))}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                          {restante >= 0
                            ? `restam de ${fmtBRL(limite.valor_limite)}`
                            : `${fmtBRL(Math.abs(restante))} acima do limite de ${fmtBRL(limite.valor_limite)}`}
                        </div>
                      </>
                    ) : (
                      <>
                        <div
                          style={{
                            fontSize: 28,
                            fontWeight: 700,
                            color: "#f8fafc",
                          }}
                        >
                          {fmtBRL(total)}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                          gastos esse mês · sem limite definido
                        </div>
                      </>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      maxHeight: 280,
                      overflowY: "auto",
                      marginBottom: 16,
                    }}
                  >
                    {itens.length === 0 ? (
                      <p
                        style={{
                          textAlign: "center",
                          color: "#475569",
                          fontSize: 13,
                        }}
                      >
                        Nenhum lançamento nessa categoria esse mês.
                      </p>
                    ) : (
                      itens.map((it) => (
                        <div
                          key={`${it.origem}-${it.id}`}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            background: "#24282d",
                            borderRadius: 10,
                            padding: "10px 12px",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "#f8fafc",
                              }}
                            >
                              {it.nome}
                            </div>
                            <div style={{ fontSize: 10, color: "#64748b" }}>
                              {it.origem}
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: "#f8fafc",
                            }}
                          >
                            {fmtBRL(it.valor)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  <button
                    onClick={() => setCategoriaAberta(null)}
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "1px solid #ffffff0d",
                      color: "#64748b",
                      borderRadius: 8,
                      padding: "11px 0",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Fechar
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
