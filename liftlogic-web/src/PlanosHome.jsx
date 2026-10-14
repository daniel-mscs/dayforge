import React, { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";

const brl = (v) =>
  Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

function textoPrazo(prazo) {
  if (!prazo) return null;
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
    return `faltam ${dias} ${dias === 1 ? "dia" : "dias"}`;
  }
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  const partes = [];
  if (anos) partes.push(`${anos} ${anos === 1 ? "ano" : "anos"}`);
  if (resto) partes.push(`${resto} ${resto === 1 ? "mês" : "meses"}`);
  return `faltam ${partes.join(" e ")}`;
}

export function PlanosHomeCard({ user, onAbrir, desativado }) {
  const [dados, setDados] = useState(null);

  useEffect(() => {
    Promise.all([
      supabase.from("planos").select("*").eq("user_id", user.id),
      supabase.from("plano_itens").select("*").eq("user_id", user.id),
      supabase.from("plano_aportes").select("*").eq("user_id", user.id),
    ]).then(([p, i, a]) =>
      setDados({
        planos: p.data || [],
        itens: i.data || [],
        aportes: a.data || [],
      }),
    );
  }, [user.id]);

  if (!dados || dados.planos.length === 0) return null;

  const hoje = new Date();
  const mes = hoje.getMonth();
  const ano = hoje.getFullYear();

  const ordenados = [...dados.planos].sort((a, b) => {
    if (!a.prazo && !b.prazo) return 0;
    if (!a.prazo) return 1;
    if (!b.prazo) return -1;
    return a.prazo.localeCompare(b.prazo);
  });

  const resumo = ordenados.slice(0, 2).map((pl) => {
    const its = dados.itens.filter((i) => i.plano_id === pl.id);
    const feitos = its.filter((i) => i.feito).length;
    const comAporte = its.filter((i) => Number(i.aporte_mensal) > 0);
    const meta = comAporte.reduce((s, i) => s + Number(i.aporte_mensal), 0);
    const faltaTotal = comAporte.reduce((s, i) => {
      const doMes = dados.aportes
        .filter((a) => a.item_id === i.id && a.mes === mes && a.ano === ano)
        .reduce((t, a) => t + Number(a.valor || 0), 0);
      return s + Math.max(0, Number(i.aporte_mensal) - doMes);
    }, 0);
    return {
      pl,
      total: its.length,
      feitos,
      pct: its.length ? (feitos / its.length) * 100 : 0,
      meta,
      faltaTotal,
    };
  });

  return (
    <div
      className="home-card"
      onClick={() => !desativado && onAbrir()}
      style={{ cursor: "pointer" }}
    >
      <div className="home-section-title">🧭 PLANOS</div>
      {resumo.map(({ pl, total, feitos, pct, meta, faltaTotal }, idx) => (
        <div
          key={pl.id}
          style={{
            padding: "8px 0",
            borderTop: idx === 0 ? "none" : "1px solid #ffffff08",
          }}
        >
          <div
            style={{ display: "flex", justifyContent: "space-between", gap: 8 }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>
              {pl.emoji} {pl.titulo}
            </div>
            {textoPrazo(pl.prazo) && (
              <div
                style={{
                  fontSize: 11,
                  color: "#a5b4fc",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                ⏳ {textoPrazo(pl.prazo)}
              </div>
            )}
          </div>
          {total > 0 && (
            <>
              <div
                style={{
                  height: 5,
                  background: "#ffffff0d",
                  borderRadius: 999,
                  margin: "6px 0 3px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: "#6366f1",
                    borderRadius: 999,
                  }}
                />
              </div>
              <div style={{ fontSize: 10, color: "#64748b" }}>
                {feitos}/{total} itens concluídos
              </div>
            </>
          )}
          {meta > 0 && (
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                fontWeight: 700,
                color: faltaTotal > 0 ? "#fbbf24" : "#34d399",
              }}
            >
              {faltaTotal > 0
                ? `💰 Faltam ${brl(faltaTotal)} da meta de ${brl(meta)} deste mês`
                : `✅ Meta do mês batida (${brl(meta)})`}
            </div>
          )}
        </div>
      ))}
      {dados.planos.length > 2 && (
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
          + {dados.planos.length - 2}{" "}
          {dados.planos.length - 2 === 1 ? "plano" : "planos"}
        </div>
      )}
    </div>
  );
}