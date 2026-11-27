import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "./lib/supabase";
import { toast } from "./lib/toast";
import {
  Plus,
  X,
  Droplet,
  Scale,
  Banknote,
  CreditCard,
  Utensils,
} from "lucide-react";

function formatarData(date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().split("T")[0];
}

// Mesma regra da aba Cartão: compra depois do fechamento cai na fatura
// do mês seguinte.
function calcularMesFatura(dataCompraStr, diaFechamento) {
  const d = new Date(dataCompraStr + "T00:00:00");
  let mesFatura = d.getMonth();
  let anoFatura = d.getFullYear();
  if (d.getDate() > diaFechamento) {
    mesFatura += 1;
    if (mesFatura > 11) {
      mesFatura = 0;
      anoFatura += 1;
    }
  }
  return { mes: mesFatura, ano: anoFatura };
}

// Aceita "78,5" e "78.5"
function numero(v) {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// Mesma regra de sugestão da aba Macros
function refeicaoPorHorario() {
  const h = new Date().getHours();
  if (h >= 5 && h <= 9) return "cafe";
  if (h >= 10 && h <= 11) return "lanche1";
  if (h >= 12 && h <= 13) return "almoco";
  if (h >= 14 && h <= 17) return "cafetarde";
  if (h >= 18 && h <= 22) return "janta";
  return "outro";
}

const OPCOES = [
  { id: "agua", icon: Droplet, label: "Água", cor: "#3b82f6" },
  { id: "peso", icon: Scale, label: "Peso", cor: "#6366f1" },
  { id: "refeicao", icon: Utensils, label: "Refeição", cor: "#f59e0b" },
  { id: "gasto", icon: Banknote, label: "Gasto", cor: "#ef4444" },
];

const CATEGORIAS_GASTO = [
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
const CORES_CATEGORIA_GASTO = {
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

// Fecha na hora e avisa a Home (onRegistrado) para o card mudar na hora;
// o Supabase grava em segundo plano. Se falhar, onFalha recarrega a Home.
export default function RegistroRapido({ user, onRegistrado, onFalha }) {
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState(null);
  const [valor, setValor] = useState("");
  const [nome, setNome] = useState("");
  const [macros, setMacros] = useState({ prot: "", carb: "", gord: "" });
  const [categoriaGasto, setCategoriaGasto] = useState("Outros");
  const [ehCartao, setEhCartao] = useState(false);
  const [cartoes, setCartoes] = useState([]);
  const [cartaoSelecionado, setCartaoSelecionado] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("financeiro_cartoes")
      .select("*")
      .eq("user_id", user.id)
      .eq("ativo", true)
      .order("nome", { ascending: true })
      .then(({ data }) => {
        setCartoes(data || []);
        if (data && data.length > 0) setCartaoSelecionado(data[0].id);
      });
  }, [user?.id]);

  const fechar = () => {
    setAberto(false);
    setTipo(null);
    setValor("");
    setNome("");
    setMacros({ prot: "", carb: "", gord: "" });
    setCategoriaGasto("Outros");
    setEhCartao(false);
  };

  const falhou = (error) => {
    toast("Não foi possível salvar: " + error.message, "error");
    onFalha?.();
  };

  const registrarAgua = async (ml) => {
    const agora = new Date();
    const hoje = formatarData(agora);
    const hora = agora.toTimeString().slice(0, 5);
    fechar();
    onRegistrado?.("agua", ml);
    toast(`+${ml}ml`, "success");
    const { error } = await supabase
      .from("agua_registro")
      .insert([{ user_id: user.id, data: hoje, ml, hora }]);
    if (error) falhou(error);
  };

  const registrarPeso = async () => {
    const peso = numero(valor);
    if (!peso) return toast("Digite o peso!", "error");
    const hoje = formatarData(new Date());
    fechar();
    onRegistrado?.("peso", peso);
    toast(`${peso.toLocaleString("pt-BR")} kg`, "success");
    const { error } = await supabase
      .from("peso_registro")
      .upsert(
        { user_id: user.id, data: hoje, peso },
        { onConflict: "user_id,data" },
      );
    if (error) falhou(error);
  };

  const kcalCalculada = Math.round(
    numero(macros.prot) * 4 + numero(macros.carb) * 4 + numero(macros.gord) * 9,
  );

  const registrarRefeicao = async () => {
    const kcal = Math.round(numero(valor)) || kcalCalculada;
    if (!kcal) return toast("Digite as calorias ou os macros!", "error");
    const registro = {
      user_id: user.id,
      data: formatarData(new Date()),
      nome: nome.trim() || "Registro rápido",
      gramas: 0,
      refeicao: refeicaoPorHorario(),
      kcal,
      prot: numero(macros.prot),
      carb: numero(macros.carb),
      gord: numero(macros.gord),
    };
    fechar();
    onRegistrado?.("kcal", kcal);
    toast(`+${kcal.toLocaleString("pt-BR")} kcal`, "success");
    const { error } = await supabase.from("macros_registro").insert([registro]);
    if (error) falhou(error);
  };

  const registrarGasto = async () => {
    if (!nome || !numero(valor))
      return toast("Preencha nome e valor!", "error");
    const valorNum = numero(valor);
    const nomeGasto = nome;
    const categoria = categoriaGasto;
    fechar();
    const agora = new Date();
    const hoje = formatarData(agora);

    if (ehCartao && cartaoSelecionado) {
      const cartaoObj = cartoes.find((c) => c.id === cartaoSelecionado);
      const diaVencimento = cartaoObj?.dia_vencimento || 10;
      const diaFechamento = cartaoObj?.dia_fechamento || diaVencimento - 7;
      const { mes, ano } = calcularMesFatura(hoje, diaFechamento);
      toast("Lançado no cartão!", "success");
      const { error } = await supabase.from("financeiro_cartao").insert([
        {
          user_id: user.id,
          mes,
          ano,
          item: nomeGasto,
          valor: valorNum,
          categoria,
          cartao_id: cartaoSelecionado,
        },
      ]);
      if (error) toast(error.message, "error");
      return;
    }

    toast("Gasto registrado!", "success");
    const { error } = await supabase.from("financeiro_gastos").insert([
      {
        user_id: user.id,
        mes: agora.getMonth(),
        ano: agora.getFullYear(),
        nome: nomeGasto,
        valor: valorNum,
        categoria,
        data: hoje,
      },
    ]);
    if (error) toast(error.message, "error");
  };

  return createPortal(
    <>
      <button
        onClick={() => setAberto(true)}
        style={{
          position: "fixed",
          right: 18,
          bottom: 84,
          width: 54,
          height: 54,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #6366f1, #4f46e5)",
          border: "none",
          boxShadow: "0 4px 20px rgba(99,102,241,0.5)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 150,
        }}
      >
        <Plus size={26} />
      </button>

      {aberto && (
        <div
          onClick={fechar}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 200,
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              background: "linear-gradient(155deg, #1c2026, #17191d)",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: "20px 18px 28px",
              animation: "fadeInUp 0.2s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 800, color: "#f8fafc" }}>
                {!tipo
                  ? "Registro rápido"
                  : tipo === "agua"
                    ? "Quanto de água?"
                    : tipo === "peso"
                      ? "Peso de hoje"
                      : tipo === "refeicao"
                        ? "Refeição"
                        : "Novo gasto"}
              </div>
              <button
                onClick={fechar}
                style={{
                  background: "none",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {!tipo && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 8,
                }}
              >
                {OPCOES.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setTipo(o.id)}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                      background: "#24282d",
                      border: "1px solid #ffffff0d",
                      borderRadius: 14,
                      padding: "18px 8px",
                      cursor: "pointer",
                    }}
                  >
                    <o.icon size={26} color={o.cor} />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#e2e8f0",
                      }}
                    >
                      {o.label}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {tipo === "agua" && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 8,
                }}
              >
                {[180, 300, 500, 1000].map((ml) => (
                  <button
                    key={ml}
                    onClick={() => registrarAgua(ml)}
                    style={{
                      background: "#24282d",
                      border: "1px solid #3b82f633",
                      borderRadius: 12,
                      color: "#3b82f6",
                      fontSize: 13,
                      fontWeight: 700,
                      padding: "16px 4px",
                      cursor: "pointer",
                    }}
                  >
                    {ml}ml
                  </button>
                ))}
              </div>
            )}

            {tipo === "peso" && (
              <div>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Peso em kg (ex: 78,5)"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && registrarPeso()}
                />
                <button
                  onClick={registrarPeso}
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
                  Salvar
                </button>
              </div>
            )}

            {tipo === "refeicao" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  registrarRefeicao();
                }}
              >
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={
                    kcalCalculada
                      ? `Calorias: ${kcalCalculada} (pelos macros)`
                      : "Calorias (kcal)"
                  }
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  autoFocus
                />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  {[
                    ["prot", "Prot (g)"],
                    ["carb", "Carbo (g)"],
                    ["gord", "Gord (g)"],
                  ].map(([campo, rotulo]) => (
                    <input
                      key={campo}
                      type="text"
                      inputMode="decimal"
                      placeholder={rotulo}
                      value={macros[campo]}
                      onChange={(e) =>
                        setMacros((m) => ({ ...m, [campo]: e.target.value }))
                      }
                    />
                  ))}
                </div>
                <input
                  placeholder="O que comeu? (opcional)"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  style={{ marginTop: 8 }}
                />
                <button
                  type="submit"
                  style={{
                    marginTop: 10,
                    width: "100%",
                    background: "#f59e0b",
                    border: "none",
                    borderRadius: 10,
                    color: "#0a0a0a",
                    fontSize: 14,
                    fontWeight: 800,
                    padding: 12,
                    cursor: "pointer",
                  }}
                >
                  Salvar
                </button>
              </form>
            )}

            {tipo === "gasto" && (
              <div>
                <input
                  placeholder="Nome (ex: Uber)"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  autoFocus
                />
                <input
                  type="number"
                  placeholder="Valor R$"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  style={{ marginTop: 8 }}
                  onKeyDown={(e) => e.key === "Enter" && registrarGasto()}
                />

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    marginTop: 10,
                  }}
                >
                  {CATEGORIAS_GASTO.map((cat) => {
                    const ativa = categoriaGasto === cat;
                    const cor = CORES_CATEGORIA_GASTO[cat];
                    return (
                      <button
                        key={cat}
                        onClick={() => setCategoriaGasto(cat)}
                        style={{
                          background: ativa ? cor : "#24282d",
                          border: `1px solid ${ativa ? cor : "#ffffff10"}`,
                          borderRadius: 99,
                          color: ativa ? "#0a0a0a" : "#94a3b8",
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "5px 10px",
                          cursor: "pointer",
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>

                {cartoes.length > 0 && (
                  <>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 12,
                        fontSize: 12,
                        color: "#cbd5e1",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={ehCartao}
                        onChange={(e) => setEhCartao(e.target.checked)}
                        style={{ width: 16, height: 16 }}
                      />
                      <CreditCard size={14} color="#f97316" />
                      Foi no cartão de crédito
                    </label>
                    {ehCartao && cartoes.length > 1 && (
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
                    {ehCartao && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#f97316",
                          marginTop: 6,
                        }}
                      >
                        Vai cair na fatura certa automaticamente, igual lançando
                        pela aba Cartão.
                      </div>
                    )}
                  </>
                )}

                <button
                  onClick={registrarGasto}
                  style={{
                    marginTop: 10,
                    width: "100%",
                    background: ehCartao ? "#f97316" : "#ef4444",
                    border: "none",
                    borderRadius: 10,
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 700,
                    padding: 12,
                    cursor: "pointer",
                  }}
                >
                  Salvar
                </button>
              </div>
            )}

            {tipo && (
              <button
                onClick={() => setTipo(null)}
                style={{
                  marginTop: 12,
                  width: "100%",
                  background: "transparent",
                  border: "1px solid #ffffff0d",
                  borderRadius: 10,
                  color: "#64748b",
                  fontSize: 13,
                  padding: 10,
                  cursor: "pointer",
                }}
              >
                ← Voltar
              </button>
            )}
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
