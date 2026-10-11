import React from "react";
import { PiggyBank } from "lucide-react";

function fmtBRL(v) {
  return Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function Interruptor({ ligado, onChange, titulo, sub }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      onClick={() => onChange(!ligado)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        color: "inherit",
        background: ligado
          ? "linear-gradient(135deg, rgba(16,185,129,0.16), rgba(16,185,129,0.04))"
          : "#14171c",
        border: ligado
          ? "1px solid rgba(16,185,129,0.5)"
          : "1px solid #ffffff14",
        boxShadow: ligado ? "0 0 18px rgba(16,185,129,0.18)" : "none",
        borderRadius: 14,
        padding: "10px 12px",
        transition: "all 0.25s",
      }}
    >
      <span
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: ligado ? "rgba(16,185,129,0.2)" : "#ffffff0a",
          color: ligado ? "#34d399" : "#64748b",
          transition: "all 0.25s",
        }}
      >
        <PiggyBank size={18} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 700,
            color: ligado ? "#f8fafc" : "#cbd5e1",
          }}
        >
          {titulo}
        </span>
        <span style={{ display: "block", fontSize: 11, color: "#64748b" }}>
          {sub}
        </span>
      </span>
      <span
        style={{
          position: "relative",
          width: 44,
          height: 26,
          borderRadius: 999,
          flexShrink: 0,
          background: ligado
            ? "linear-gradient(135deg,#10b981,#059669)"
            : "#2a2f37",
          transition: "background 0.25s",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: ligado ? 21 : 3,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
            transition: "left 0.25s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        />
      </span>
    </button>
  );
}

function CampoDinheiro({ rotulo, value, onChange, cor }) {
  return (
    <label style={{ flex: 1, minWidth: 0, display: "block" }}>
      <span
        style={{
          display: "block",
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.08em",
          color: "#64748b",
          marginBottom: 4,
        }}
      >
        {rotulo}
      </span>
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "#0f1115",
          border: `1px solid ${cor}55`,
          borderRadius: 10,
          padding: "0 10px",
        }}
      >
        <span style={{ color: cor, fontWeight: 800, fontSize: 13 }}>R$</span>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1,
            minWidth: 0,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#f8fafc",
            fontSize: 15,
            fontWeight: 700,
            padding: "10px 0",
          }}
        />
      </span>
    </label>
  );
}

// Campos de meta + quanto já juntou, com barra de preview
export function PainelDinheiro({ editando, setEditando }) {
  const alvo = Number(editando.alvo) || 0;
  const atual = Number(editando.atual) || 0;
  const pct = alvo > 0 ? Math.min(100, (atual / alvo) * 100) : 0;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        animation: "planosAbrir 0.3s ease",
      }}
    >
      <style>
        {
          "@keyframes planosAbrir{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}"
        }
      </style>
      <div style={{ display: "flex", gap: 8 }}>
        <CampoDinheiro
          rotulo="META"
          cor="#818cf8"
          value={editando.alvo}
          onChange={(v) => setEditando({ ...editando, alvo: v })}
        />
        <CampoDinheiro
          rotulo="JÁ JUNTEI"
          cor="#34d399"
          value={editando.atual}
          onChange={(v) => setEditando({ ...editando, atual: v })}
        />
      </div>
      <CampoDinheiro
        rotulo="APORTE MENSAL (OPCIONAL)"
        cor="#fbbf24"
        value={editando.mensal}
        onChange={(v) => setEditando({ ...editando, mensal: v })}
      />
      {alvo > 0 && (
        <div>
          <div
            style={{
              height: 6,
              background: "#ffffff0d",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                background: "#10b981",
                borderRadius: 999,
                transition: "width 0.3s",
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
            {Math.round(pct)}% da meta · faltam{" "}
            {fmtBRL(Math.max(0, alvo - atual))}
          </div>
        </div>
      )}
    </div>
  );
}
const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

// Meta mensal de aporte: quanto já guardou neste mês + projeção até o prazo
export function ResumoMensal({ item, aportes, prazo, onAportar }) {
  const hoje = new Date();
  const mes = hoje.getMonth();
  const ano = hoje.getFullYear();
  const mensal = Number(item.aporte_mensal) || 0;
  const doMes = aportes
    .filter((a) => a.item_id === item.id && a.mes === mes && a.ano === ano)
    .reduce((s, a) => s + Number(a.valor || 0), 0);
  const pct = mensal > 0 ? Math.min(100, (doMes / mensal) * 100) : 0;
  const batida = mensal > 0 && doMes >= mensal;

  const alvo = Number(item.valor_alvo) || 0;
  const atual = Number(item.valor_atual) || 0;
  let projecao = null;
  if (prazo && alvo > 0) {
    const [y, m, d] = prazo.split("-").map(Number);
    const fim = new Date(y, m - 1, d);
    let meses = (fim.getFullYear() - ano) * 12 + (fim.getMonth() - mes);
    if (meses < 1) meses = 1;
    const previsto = atual + mensal * meses;
    const faltam = Math.max(0, alvo - atual);
    projecao = {
      meses,
      previsto,
      noRitmo: previsto >= alvo,
      precisaPorMes: faltam / meses,
    };
  }

  return (
    <div
      style={{
        marginTop: 8,
        background: batida
          ? "linear-gradient(135deg, rgba(16,185,129,0.14), rgba(16,185,129,0.03))"
          : "linear-gradient(135deg, rgba(251,191,36,0.10), rgba(251,191,36,0.02))",
        border: batida
          ? "1px solid rgba(16,185,129,0.4)"
          : "1px solid rgba(251,191,36,0.3)",
        borderRadius: 12,
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.08em",
            color: batida ? "#34d399" : "#fbbf24",
          }}
        >
          {batida ? "✅ META DE" : "📅 APORTE DE"} {MESES[mes].toUpperCase()}
        </span>
        <button
          type="button"
          onClick={onAportar}
          style={{
            background: "rgba(251,191,36,0.14)",
            border: "1px solid rgba(251,191,36,0.4)",
            borderRadius: 8,
            color: "#fbbf24",
            fontSize: 11,
            fontWeight: 700,
            padding: "4px 10px",
            cursor: "pointer",
          }}
        >
          + Aportar
        </button>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: "#e2e8f0",
          marginBottom: 4,
        }}
      >
        <strong>{fmtBRL(doMes)}</strong>
        <span style={{ color: "#94a3b8" }}>de {fmtBRL(mensal)}</span>
      </div>
      <div
        style={{
          height: 6,
          background: "#ffffff0d",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: batida
              ? "linear-gradient(90deg,#10b981,#34d399)"
              : "linear-gradient(90deg,#f59e0b,#fbbf24)",
            borderRadius: 999,
            transition: "width 0.3s",
          }}
        />
      </div>
      {projecao && (
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
          {projecao.noRitmo
            ? `🎯 No ritmo de ${fmtBRL(mensal)}/mês você chega na meta antes do prazo (${fmtBRL(projecao.previsto)} em ${projecao.meses} ${projecao.meses === 1 ? "mês" : "meses"}).`
            : `⚠️ Nesse ritmo você chega a ${fmtBRL(projecao.previsto)} até o prazo. Pra bater a meta precisa de ~${fmtBRL(projecao.precisaPorMes)}/mês.`}
        </div>
      )}
    </div>
  );
}
