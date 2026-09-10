import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";
import { SkeletonCard, SkeletonStyle } from "./lib/skeleton";
import {
  Moon,
  Dumbbell,
  Droplet,
  Flame,
  Sparkles,
  BarChart3,
} from "lucide-react";

function formatarData(date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().split("T")[0];
}

function horasSono(r) {
  if (!r?.dormiu || !r?.acordou) return null;
  const [hD, mD] = r.dormiu.split(":").map(Number);
  const [hA, mA] = r.acordou.split(":").map(Number);
  let min = hA * 60 + mA - (hD * 60 + mD);
  if (min < 0) min += 24 * 60;
  return min / 60;
}

function dataDoRegistro(createdAt) {
  const offset = new Date().getTimezoneOffset();
  return new Date(new Date(createdAt).getTime() - offset * 60000)
    .toISOString()
    .split("T")[0];
}

function media(lista) {
  if (lista.length === 0) return null;
  return lista.reduce((s, v) => s + v, 0) / lista.length;
}

export default function Insights({ user }) {
  const [carregando, setCarregando] = useState(true);
  const [sono, setSono] = useState([]);
  const [humor, setHumor] = useState([]);
  const [agua, setAgua] = useState([]);
  const [treinos, setTreinos] = useState([]);

  const buscarTudo = useCallback(async () => {
    setCarregando(true);
    const inicio = formatarData(
      new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    );
    const [
      { data: sonoData },
      { data: humorData },
      { data: aguaData },
      { data: treinoData },
    ] = await Promise.all([
      supabase
        .from("sono_registro")
        .select("data, dormiu, acordou, qualidade")
        .eq("user_id", user.id)
        .gte("data", inicio),
      supabase
        .from("humor_registro")
        .select("data, humor, energia")
        .eq("user_id", user.id)
        .gte("data", inicio),
      supabase
        .from("agua_registro")
        .select("data, ml")
        .eq("user_id", user.id)
        .gte("data", inicio),
      supabase
        .from("treinos_finalizados")
        .select("created_at, tempo_segundos, kcal")
        .eq("user_id", user.id)
        .gte("created_at", inicio + "T00:00:00"),
    ]);
    setSono(sonoData || []);
    setHumor(humorData || []);
    setAgua(aguaData || []);
    setTreinos(treinoData || []);
    setCarregando(false);
  }, [user.id]);

  useEffect(() => {
    buscarTudo();
  }, [buscarTudo]);

  if (carregando) {
    return (
      <div className="insights-section">
        <SkeletonStyle />
        <SkeletonCard style={{ height: 90 }} />
        <SkeletonCard style={{ height: 90 }} />
        <SkeletonCard style={{ height: 90 }} />
      </div>
    );
  }

  // Mapas por data
  const mapaHumor = {};
  humor.forEach((h) => {
    mapaHumor[h.data] = h;
  });
  const mapaAgua = {};
  agua.forEach((a) => {
    mapaAgua[a.data] = (mapaAgua[a.data] || 0) + Number(a.ml);
  });
  const diasComTreino = new Set(
    treinos.map((t) => dataDoRegistro(t.created_at)),
  );

  // ═══════ Sono → Humor ═══════
  const gruposSonoHumor = { bom: [], ruim: [] };
  sono.forEach((s) => {
    const h = horasSono(s);
    const hm = mapaHumor[s.data];
    if (h === null || !hm?.humor) return;
    if (h >= 7) gruposSonoHumor.bom.push(hm.humor);
    else if (h < 6) gruposSonoHumor.ruim.push(hm.humor);
  });
  const medHumorSonoBom = media(gruposSonoHumor.bom);
  const medHumorSonoRuim = media(gruposSonoHumor.ruim);

  // ═══════ Sono → Treino ═══════
  const gruposSonoTreino = { bom: [], ruim: [] };
  sono.forEach((s) => {
    const h = horasSono(s);
    if (h === null) return;
    const treinouEssedia = diasComTreino.has(s.data);
    if (h >= 7) gruposSonoTreino.bom.push(treinouEssedia ? 1 : 0);
    else if (h < 6) gruposSonoTreino.ruim.push(treinouEssedia ? 1 : 0);
  });
  const pctTreinoSonoBom =
    gruposSonoTreino.bom.length > 0
      ? Math.round(media(gruposSonoTreino.bom) * 100)
      : null;
  const pctTreinoSonoRuim =
    gruposSonoTreino.ruim.length > 0
      ? Math.round(media(gruposSonoTreino.ruim) * 100)
      : null;

  // ═══════ Água → Humor ═══════
  const mlValores = Object.values(mapaAgua);
  const medianaAgua = mlValores.length > 0 ? media(mlValores) : 0;
  const gruposAguaHumor = { alta: [], baixa: [] };
  Object.entries(mapaAgua).forEach(([data, ml]) => {
    const hm = mapaHumor[data];
    if (!hm?.humor) return;
    if (ml >= medianaAgua) gruposAguaHumor.alta.push(hm.humor);
    else gruposAguaHumor.baixa.push(hm.humor);
  });
  const medHumorAguaAlta = media(gruposAguaHumor.alta);
  const medHumorAguaBaixa = media(gruposAguaHumor.baixa);

  // ═══════ Treino → Humor ═══════
  const gruposTreinoHumor = { treinou: [], descansou: [] };
  Object.entries(mapaHumor).forEach(([data, hm]) => {
    if (!hm?.humor) return;
    if (diasComTreino.has(data)) gruposTreinoHumor.treinou.push(hm.humor);
    else gruposTreinoHumor.descansou.push(hm.humor);
  });
  const medHumorTreino = media(gruposTreinoHumor.treinou);
  const medHumorDescanso = media(gruposTreinoHumor.descansou);

  const MIN_AMOSTRAS = 3;

  const insights = [
    {
      id: "sono-humor",
      icon: Moon,
      titulo: "Sono e humor",
      valido:
        gruposSonoHumor.bom.length >= MIN_AMOSTRAS &&
        gruposSonoHumor.ruim.length >= MIN_AMOSTRAS,
      texto:
        medHumorSonoBom !== null && medHumorSonoRuim !== null
          ? `Nas noites com 7h+ de sono, seu humor médio foi ${medHumorSonoBom.toFixed(1)}/5. Com menos de 6h, caiu para ${medHumorSonoRuim.toFixed(1)}/5.`
          : null,
      amostras: `${gruposSonoHumor.bom.length} noites bem dormidas · ${gruposSonoHumor.ruim.length} mal dormidas`,
    },
    {
      id: "sono-treino",
      icon: Dumbbell,
      titulo: "Sono e treino",
      valido:
        gruposSonoTreino.bom.length >= MIN_AMOSTRAS &&
        gruposSonoTreino.ruim.length >= MIN_AMOSTRAS,
      texto:
        pctTreinoSonoBom !== null && pctTreinoSonoRuim !== null
          ? `Você treinou em ${pctTreinoSonoBom}% dos dias após dormir bem (7h+), contra ${pctTreinoSonoRuim}% após noites mal dormidas.`
          : null,
      amostras: `${gruposSonoTreino.bom.length} noites bem dormidas · ${gruposSonoTreino.ruim.length} mal dormidas`,
    },
    {
      id: "agua-humor",
      icon: Droplet,
      titulo: "Água e humor",
      valido:
        gruposAguaHumor.alta.length >= MIN_AMOSTRAS &&
        gruposAguaHumor.baixa.length >= MIN_AMOSTRAS,
      texto:
        medHumorAguaAlta !== null && medHumorAguaBaixa !== null
          ? `Em dias que bebeu mais água que a sua média, seu humor foi ${medHumorAguaAlta.toFixed(1)}/5 — contra ${medHumorAguaBaixa.toFixed(1)}/5 em dias abaixo da média.`
          : null,
      amostras: `${gruposAguaHumor.alta.length} dias acima da média · ${gruposAguaHumor.baixa.length} abaixo`,
    },
    {
      id: "treino-humor",
      icon: Flame,
      titulo: "Treino e humor",
      valido:
        gruposTreinoHumor.treinou.length >= MIN_AMOSTRAS &&
        gruposTreinoHumor.descansou.length >= MIN_AMOSTRAS,
      texto:
        medHumorTreino !== null && medHumorDescanso !== null
          ? `Nos dias que treinou, seu humor médio foi ${medHumorTreino.toFixed(1)}/5. Nos dias de descanso, ${medHumorDescanso.toFixed(1)}/5.`
          : null,
      amostras: `${gruposTreinoHumor.treinou.length} dias treinados · ${gruposTreinoHumor.descansou.length} de descanso`,
    },
  ];

  const insightsProntos = insights.filter((i) => i.valido && i.texto);
  const insightsFaltando = insights.filter((i) => !i.valido);

  return (
    <div className="insights-section" style={{ paddingBottom: 24 }}>
      <h2
        className="title-divisao"
        style={{
          margin: "0 0 4px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Sparkles
          size={20}
          color="#818cf8"
          style={{ filter: "drop-shadow(0 0 6px rgba(129,140,248,0.5))" }}
        />
        Insights
      </h2>
      <p style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
        Cruzando os últimos 60 dias de sono, humor, água e treino.
      </p>

      {insightsProntos.length === 0 ? (
        <div
          style={{
            background: "#1a1d21",
            border: "1px solid #ffffff0d",
            borderRadius: 16,
            padding: "24px 20px",
            textAlign: "center",
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <BarChart3 size={32} color="#334155" />
          </div>
          <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>
            Ainda não tenho dados suficientes pra cruzar. Continue registrando
            sono, humor, água e treino por mais alguns dias.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {insightsProntos.map((i) => (
            <div
              key={i.id}
              style={{
                background: "linear-gradient(155deg, #1c2026, #17191d)",
                border: "1px solid #ffffff0d",
                borderRadius: 16,
                padding: "16px 18px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <i.icon size={20} color="#818cf8" />
                <span
                  style={{ fontSize: 13, fontWeight: 800, color: "#f8fafc" }}
                >
                  {i.titulo}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.6 }}>
                {i.texto}
              </div>
              <div style={{ fontSize: 10, color: "#475569", marginTop: 8 }}>
                {i.amostras}
              </div>
            </div>
          ))}
        </div>
      )}

      {insightsFaltando.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              fontSize: 10,
              color: "#475569",
              fontWeight: 800,
              letterSpacing: "0.06em",
              marginBottom: 8,
            }}
          >
            AINDA JUNTANDO DADOS
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {insightsFaltando.map((i) => (
              <div
                key={i.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "#1a1d21",
                  border: "1px solid #ffffff0d",
                  borderRadius: 12,
                  padding: "10px 14px",
                  opacity: 0.6,
                }}
              >
                <i.icon size={16} color="#64748b" />
                <span style={{ fontSize: 12, color: "#64748b" }}>
                  {i.titulo} — {i.amostras}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
