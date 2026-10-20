import React, { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";

function dataLocal(d) {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
}

function somarDias(base, n) {
  const d = new Date(base + "T12:00:00");
  d.setDate(d.getDate() + n);
  return dataLocal(d);
}

function calcStreak(datas, hoje) {
  const set = new Set(datas);
  let cursor = set.has(hoje) ? hoje : somarDias(hoje, -1);
  let n = 0;
  while (set.has(cursor)) {
    n++;
    cursor = somarDias(cursor, -1);
  }
  return n;
}

const TIPOS = [
  { id: "mobilidade", emoji: "🧘", nome: "Mobilidade", cor: "#6366f1" },
  { id: "alongamento", emoji: "🤸", nome: "Alongamento", cor: "#10b981" },
];

function useLogFlex(user, refreshKey) {
  const [dados, setDados] = useState(null);

  useEffect(() => {
    const desde = new Date();
    desde.setDate(desde.getDate() - 90);
    supabase
      .from("mobilidade_log")
      .select("data, tipo")
      .eq("user_id", user.id)
      .gte("data", dataLocal(desde))
      .then(({ data }) => setDados(data || []));
  }, [user.id, refreshKey]);

  if (!dados) return null;
  const hoje = dataLocal(new Date());
  return TIPOS.map((t) => {
    const datas = dados
      .filter((l) => (l.tipo || "mobilidade") === t.id)
      .map((l) => l.data);
    return {
      ...t,
      feito: datas.includes(hoje),
      streak: calcStreak(datas, hoje),
    };
  });
}

function Tiles({ lista }) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      {lista.map((t) => (
        <div
          key={t.id}
          style={{
            flex: 1,
            borderRadius: 12,
            padding: "10px 12px",
            background: t.feito ? `${t.cor}22` : "#0f1115",
            border: t.feito ? `1px solid ${t.cor}` : "1px solid #ffffff10",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 800, color: "#f8fafc" }}>
            {t.emoji} {t.nome}
          </div>
          <div
            style={{
              fontSize: 11,
              marginTop: 4,
              color: t.feito ? "#34d399" : "#64748b",
              fontWeight: 700,
            }}
          >
            {t.feito ? "✓ feito hoje" : "○ falta hoje"}
          </div>
          <div
            style={{
              fontSize: 11,
              marginTop: 2,
              color: t.streak > 0 ? "#fb923c" : "#475569",
            }}
          >
            🔥 {t.streak} {t.streak === 1 ? "dia" : "dias"}
          </div>
        </div>
      ))}
    </div>
  );
}

// versão que aparece dentro da aba Mobilidade
export function FlexHoje({ user, refreshKey }) {
  const lista = useLogFlex(user, refreshKey);
  if (!lista) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <Tiles lista={lista} />
    </div>
  );
}
