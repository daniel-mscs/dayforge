import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";

const NIVEIS = [
  {
    nivel: 1,
    nome: "Iniciante",
    xpMin: 0,
    xpMax: 199,
    cor: "#94a3b8",
    emoji: "🥉",
  },
  {
    nivel: 2,
    nome: "Aprendiz",
    xpMin: 200,
    xpMax: 499,
    cor: "#10b981",
    emoji: "🥈",
  },
  {
    nivel: 3,
    nome: "Guerreiro",
    xpMin: 500,
    xpMax: 999,
    cor: "#6366f1",
    emoji: "⚔️",
  },
  {
    nivel: 4,
    nome: "Campeão",
    xpMin: 1000,
    xpMax: 1999,
    cor: "#f59e0b",
    emoji: "🏆",
  },
  {
    nivel: 5,
    nome: "Lenda",
    xpMin: 2000,
    xpMax: 9999,
    cor: "#ef4444",
    emoji: "👑",
  },
];

const ITENS = [
  { id: "espada", nome: "Espada", emoji: "⚔️", nivel: 1 },
  { id: "escudo", nome: "Escudo", emoji: "🛡️", nivel: 2 },
  { id: "capacete", nome: "Capacete", emoji: "⛑️", nivel: 3 },
  { id: "capa", nome: "Capa", emoji: "🧣", nivel: 3 },
  { id: "coroa", nome: "Coroa", emoji: "👑", nivel: 4 },
  { id: "asas", nome: "Asas", emoji: "🪽", nivel: 5 },
];

const CORES = [
  "#6366f1",
  "#10b981",
  "#ef4444",
  "#f59e0b",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
  "#f97316",
];

function getNivel(xp) {
  return (
    NIVEIS.slice()
      .reverse()
      .find((n) => xp >= n.xpMin) || NIVEIS[0]
  );
}

const CORES_PELE = [
  "#FFDBB4",
  "#F5CBA7",
  "#E8A87C",
  "#C68642",
  "#8D5524",
  "#4A2912",
  "#FFE0BD",
  "#D4A574",
];

function Personagem2D({ cor, pele, itens }) {
  const temEspada = itens.includes("espada");
  const temEscudo = itens.includes("escudo");
  const temCapacete = itens.includes("capacete");
  const temCapa = itens.includes("capa");
  const temCoroa = itens.includes("coroa");
  const temAsas = itens.includes("asas");
  const corRoupa = cor;
  const corRoupaDark = cor + "bb";
  const corPele = pele || "#FFDBB4";
  const corPeleDark = pele ? pele + "cc" : "#E8A87C";

  return (
    <svg viewBox="0 0 300 360" width="100%" style={{ maxHeight: 360 }}>
      <ellipse cx="150" cy="350" rx="65" ry="9" fill="#00000033" />

      {/* ASAS de anjo — abertas com penas caindo */}
      {temAsas && (
        <>
          {/* Asa esquerda — corpo principal */}
          <path
            d="M105 185 Q80 175 40 140 Q20 120 15 160 Q20 195 60 205 Q85 210 105 200Z"
            fill="#f8fafc"
            opacity="0.95"
            stroke="#e2e8f0"
            strokeWidth="1"
          />
          <path
            d="M105 185 Q75 170 45 120 Q30 100 22 140 Q28 175 65 192 Q88 200 105 195Z"
            fill="#f1f5f9"
            opacity="0.8"
          />
          <path
            d="M105 185 Q82 168 58 108 Q46 88 38 128 Q45 162 75 182 Q92 192 105 190Z"
            fill="#e2e8f0"
            opacity="0.6"
          />
          {/* Penas caindo para baixo esquerda */}
          <path
            d="M45 198 Q28 222 22 265 Q38 242 48 210Z"
            fill="#f8fafc"
            opacity="0.95"
          />
          <path
            d="M58 205 Q42 232 38 278 Q54 252 62 218Z"
            fill="#f8fafc"
            opacity="0.9"
          />
          <path
            d="M70 210 Q56 240 54 285 Q68 258 76 222Z"
            fill="#f1f5f9"
            opacity="0.9"
          />
          <path
            d="M82 213 Q70 245 70 290 Q82 262 88 224Z"
            fill="#f1f5f9"
            opacity="0.85"
          />
          <path
            d="M94 214 Q84 248 86 292 Q96 265 100 226Z"
            fill="#e2e8f0"
            opacity="0.8"
          />
          <path
            d="M63 208 Q48 235 45 275 Q60 252 67 220Z"
            fill="#ffffff"
            opacity="0.4"
          />
          <path
            d="M78 212 Q65 240 63 282 Q76 258 82 224Z"
            fill="#ffffff"
            opacity="0.4"
          />

          {/* Asa direita — corpo principal */}
          <path
            d="M195 185 Q220 175 260 140 Q280 120 285 160 Q280 195 240 205 Q215 210 195 200Z"
            fill="#f8fafc"
            opacity="0.95"
            stroke="#e2e8f0"
            strokeWidth="1"
          />
          <path
            d="M195 185 Q225 170 255 120 Q270 100 278 140 Q272 175 235 192 Q212 200 195 195Z"
            fill="#f1f5f9"
            opacity="0.8"
          />
          <path
            d="M195 185 Q218 168 242 108 Q254 88 262 128 Q255 162 225 182 Q208 192 195 190Z"
            fill="#e2e8f0"
            opacity="0.6"
          />
          {/* Penas caindo para baixo direita */}
          <path
            d="M255 198 Q272 222 278 265 Q262 242 252 210Z"
            fill="#f8fafc"
            opacity="0.95"
          />
          <path
            d="M242 205 Q258 232 262 278 Q246 252 238 218Z"
            fill="#f8fafc"
            opacity="0.9"
          />
          <path
            d="M230 210 Q244 240 246 285 Q232 258 224 222Z"
            fill="#f1f5f9"
            opacity="0.9"
          />
          <path
            d="M218 213 Q230 245 230 290 Q218 262 212 224Z"
            fill="#f1f5f9"
            opacity="0.85"
          />
          <path
            d="M206 214 Q216 248 214 292 Q204 265 200 226Z"
            fill="#e2e8f0"
            opacity="0.8"
          />
          <path
            d="M237 208 Q252 235 255 275 Q240 252 233 220Z"
            fill="#ffffff"
            opacity="0.4"
          />
          <path
            d="M222 212 Q235 240 237 282 Q224 258 218 224Z"
            fill="#ffffff"
            opacity="0.4"
          />
        </>
      )}

      {/* CAPA — atrás, apenas atrás do corpo */}
      {temCapa && (
        <path
          d="M115 168 L90 310 Q150 325 210 310 L185 168 Q150 180 115 168Z"
          fill={corRoupaDark}
        />
      )}

      {/* PERNAS */}
      <rect x="116" y="255" width="28" height="68" rx="9" fill={corRoupaDark} />
      <rect x="156" y="255" width="28" height="68" rx="9" fill={corRoupaDark} />
      <rect x="109" y="314" width="37" height="14" rx="7" fill="#1e293b" />
      <rect x="153" y="314" width="37" height="14" rx="7" fill="#1e293b" />

      {/* CORPO / ARMADURA */}
      <rect x="106" y="162" width="88" height="98" rx="16" fill={corRoupa} />
      {/* Placa da armadura */}
      <rect
        x="118"
        y="168"
        width="64"
        height="86"
        rx="10"
        fill={corRoupaDark}
      />
      {/* Detalhes armadura */}
      <rect x="126" y="176" width="48" height="6" rx="3" fill={corRoupa} />
      <rect
        x="130"
        y="188"
        width="40"
        height="4"
        rx="2"
        fill={corRoupa}
        opacity="0.6"
      />
      <rect
        x="130"
        y="198"
        width="40"
        height="4"
        rx="2"
        fill={corRoupa}
        opacity="0.6"
      />
      <rect
        x="130"
        y="208"
        width="40"
        height="4"
        rx="2"
        fill={corRoupa}
        opacity="0.6"
      />
      {/* Divisor central armadura */}
      <rect
        x="148"
        y="176"
        width="4"
        height="78"
        rx="2"
        fill={corRoupa}
        opacity="0.4"
      />
      {/* Ombros */}
      <ellipse cx="106" cy="175" rx="16" ry="12" fill={corRoupaDark} />
      <ellipse cx="194" cy="175" rx="16" ry="12" fill={corRoupaDark} />

      {/* BRAÇO ESQUERDO */}
      <rect x="72" y="170" width="34" height="72" rx="12" fill={corRoupa} />
      <rect x="74" y="234" width="30" height="20" rx="10" fill={corPele} />

      {/* ESCUDO — colado na mão esquerda */}
      {temEscudo && (
        <g transform="translate(46, 236)">
          <path
            d="M18 0 Q2 0 0 15 L0 48 Q0 66 18 75 Q36 66 36 48 L36 15 Q34 0 18 0Z"
            fill="#1d4ed8"
            stroke="#3b82f6"
            strokeWidth="2"
          />
          <path
            d="M18 8 Q8 8 6 20 L6 46 Q6 60 18 68 Q30 60 30 46 L30 20 Q28 8 18 8Z"
            fill="#2563eb"
            opacity="0.5"
          />
          <path d="M18 18 L22 30 L18 26 L14 30Z" fill="#93c5fd" />
        </g>
      )}

      {/* BRAÇO DIREITO */}
      <rect x="194" y="170" width="34" height="72" rx="12" fill={corRoupa} />
      <rect x="196" y="234" width="30" height="20" rx="10" fill={corPele} />

      {/* ESPADA — na mão direita */}
      {temEspada && (
        <>
          <rect x="207" y="222" width="10" height="22" rx="4" fill="#92400e" />
          <rect x="197" y="219" width="30" height="6" rx="3" fill="#fbbf24" />
          <rect x="209" y="115" width="7" height="107" rx="3" fill="#d1d5db" />
          <rect x="211" y="118" width="2" height="94" rx="1" fill="#ffffff88" />
          <polygon points="212.5,109 208,122 217,122" fill="#f1f5f9" />
        </>
      )}

      {/* PESCOÇO */}
      <rect x="133" y="148" width="34" height="20" rx="5" fill={corPele} />

      {/* CABEÇA */}
      <rect x="108" y="76" width="84" height="76" rx="20" fill={corPele} />

      {/* ORELHAS */}
      {!temCapacete && (
        <>
          <rect x="100" y="104" width="12" height="22" rx="7" fill={corPele} />
          <rect
            x="188"
            y="104"
            width="12"
            height="22"
            rx="7"
            fill={corPeleDark}
          />
        </>
      )}

      {/* CAPACETE */}
      {temCapacete && (
        <>
          <path
            d="M108 154 L108 108 Q108 70 150 66 Q192 70 192 108 L192 154 Q175 150 150 150 Q125 150 108 154Z"
            fill="#475569"
          />
          <rect x="108" y="116" width="84" height="12" rx="3" fill="#1e293b" />
          <rect x="108" y="128" width="32" height="30" rx="6" fill="#475569" />
          <rect x="160" y="128" width="32" height="30" rx="6" fill="#475569" />
          <rect x="140" y="128" width="20" height="30" rx="3" fill="#334155" />
          <rect x="146" y="62" width="8" height="20" rx="3" fill="#94a3b8" />
          <rect x="127" y="80" width="3" height="26" rx="2" fill="#ffffff22" />
          <rect x="170" y="80" width="3" height="26" rx="2" fill="#ffffff22" />
        </>
      )}

      {/* COROA */}
      {temCoroa && (
        <g transform={temCapacete ? "translate(0, 46)" : "translate(0, 0)"}>
          <rect x="115" y="76" width="70" height="8" rx="3" fill="#f59e0b" />
          <path
            d="M115 76 L125 56 L138 72 L150 50 L162 72 L175 56 L185 76Z"
            fill="#ffd700"
            stroke="#f59e0b"
            strokeWidth="1.5"
          />
          <circle cx="125" cy="56" r="4" fill="#ef4444" />
          <circle cx="150" cy="50" r="4" fill="#3b82f6" />
          <circle cx="175" cy="56" r="4" fill="#10b981" />
        </g>
      )}

      {/* OLHOS */}
      <rect x="122" y="104" width="17" height="13" rx="7" fill="#1e293b" />
      <rect x="161" y="104" width="17" height="13" rx="7" fill="#1e293b" />
      <circle cx="129" cy="110" r="4" fill="#fff" />
      <circle cx="169" cy="110" r="4" fill="#fff" />
      <circle cx="130" cy="109" r="2" fill="#1e293b" />
      <circle cx="170" cy="109" r="2" fill="#1e293b" />

      {/* SOBRANCELHAS */}
      <path
        d="M119 101 Q130 96 139 101"
        stroke="#78350f"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M161 101 Q170 96 181 101"
        stroke="#78350f"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* SORRISO */}
      <path
        d="M133 130 Q150 142 167 130"
        stroke="#78350f"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function RPG({ user, xpExterno }) {
  const [rpg, setRpg] = useState(null);
  const [log, setLog] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [aba, setAba] = useState("personagem");
  const [corSel, setCorSel] = useState("#6366f1");
  const [peleSel, setPeleSel] = useState("#fbbf24");
  const [itensSel, setItensSel] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [missoesConcluidas, setMissoesConcluidas] = useState([]);

  const buscarTudo = useCallback(async () => {
    setCarregando(true);
    const { data: rpgData } = await supabase
      .from("rpg_perfil")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (rpgData) {
      setRpg(rpgData);
      setCorSel(rpgData.avatar_cor || "#6366f1");
      setPeleSel(rpgData.avatar_pele || "#fbbf24");
      setItensSel(rpgData.itens_equipados || []);
    } else {
      const { data: novo } = await supabase
        .from("rpg_perfil")
        .insert([
          {
            user_id: user.id,
            xp: 0,
            nivel: 1,
            avatar_cor: "#6366f1",
            itens_equipados: [],
          },
        ])
        .select()
        .single();
      setRpg(novo);
    }

    const { data: logData } = await supabase
      .from("rpg_xp_log")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setLog(logData || []);

    const { data: rankData } = await supabase
      .from("rpg_perfil")
      .select("user_id, xp, nivel, avatar_cor")
      .order("xp", { ascending: false })
      .limit(10);

    const rankComPerfil = await Promise.all(
      (rankData || []).map(async (r) => {
        const { data: p } = await supabase
          .from("perfil")
          .select("nome")
          .eq("user_id", r.user_id)
          .single();
        return { ...r, nome: p?.nome || "Anônimo" };
      }),
    );
    setRanking(rankComPerfil);
    const hoje = new Date();
    const offset = hoje.getTimezoneOffset();
    const hojeStr = new Date(hoje.getTime() - offset * 60000)
      .toISOString()
      .split("T")[0];
    const { data: missoesData } = await supabase
      .from("rpg_missoes_log")
      .select("missao_id")
      .eq("user_id", user.id)
      .eq("data", hojeStr);
    setMissoesConcluidas((missoesData || []).map((m) => m.missao_id));
    setCarregando(false);
  }, [user.id]);

  useEffect(() => {
    buscarTudo();
  }, [buscarTudo]);

  const salvarPersonagem = async () => {
    await supabase
      .from("rpg_perfil")
      .update({
        avatar_cor: corSel,
        avatar_pele: peleSel,
        itens_equipados: itensSel,
      })
      .eq("user_id", user.id);
    setRpg((prev) => ({
      ...prev,
      avatar_cor: corSel,
      avatar_pele: peleSel,
      itens_equipados: itensSel,
    }));
    alert("Personagem salvo! ✅");
  };

  const toggleItem = (itemId) => {
    setItensSel((prev) => {
      if (prev.includes(itemId)) return prev.filter((i) => i !== itemId);
      // coroa e capacete se excluem
      if (itemId === "coroa")
        return [...prev.filter((i) => i !== "capacete"), itemId];
      if (itemId === "capacete")
        return [...prev.filter((i) => i !== "coroa"), itemId];
      return [...prev, itemId];
    });
  };

  if (carregando)
    return (
      <div style={{ textAlign: "center", color: "#64748b", paddingTop: 40 }}>
        Carregando RPG... ⚔️
      </div>
    );

  const xp = rpg?.xp || 0;
  const nivelAtual = getNivel(xp);
  const proximoNivel = NIVEIS.find((n) => n.nivel === nivelAtual.nivel + 1);
  const xpParaProximo = proximoNivel ? proximoNivel.xpMin - xp : 0;
  const pctNivel = proximoNivel
    ? Math.round(
        ((xp - nivelAtual.xpMin) / (proximoNivel.xpMin - nivelAtual.xpMin)) *
          100,
      )
    : 100;

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
          ⚔️ RPG
        </h2>
        <div
          style={{
            background: nivelAtual.cor + "22",
            border: `1px solid ${nivelAtual.cor}44`,
            borderRadius: 20,
            padding: "4px 12px",
            fontSize: 12,
            fontWeight: 700,
            color: nivelAtual.cor,
          }}
        >
          {nivelAtual.emoji} Nível {nivelAtual.nivel} — {nivelAtual.nome}
        </div>
      </div>

      {/* XP Card */}
      <div
        style={{
          background: "#1a1d21",
          border: "1px solid #ffffff0d",
          borderRadius: 16,
          padding: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 13, color: "#94a3b8" }}>XP Total</span>
          <span
            style={{ fontSize: 13, fontWeight: 700, color: nivelAtual.cor }}
          >
            {xp.toLocaleString("pt-BR")} XP
          </span>
        </div>
        <div
          style={{
            height: 8,
            background: "#ffffff0d",
            borderRadius: 99,
            overflow: "hidden",
            marginBottom: 6,
          }}
        >
          <div
            style={{
              height: 8,
              width: `${pctNivel}%`,
              background: nivelAtual.cor,
              borderRadius: 99,
              transition: "width 0.4s",
            }}
          />
        </div>
        {proximoNivel && (
          <div style={{ fontSize: 11, color: "#64748b" }}>
            Faltam {xpParaProximo} XP para {proximoNivel.emoji}{" "}
            {proximoNivel.nome}
          </div>
        )}
        {(rpg?.streak || 0) > 0 && (
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              color: "#f97316",
              fontWeight: 700,
            }}
          >
            🔥 Streak: {rpg.streak} dia{rpg.streak > 1 ? "s" : ""} consecutivo
            {rpg.streak > 1 ? "s" : ""} · +{Math.min(rpg.streak * 5, 50)} XP/dia
          </div>
        )}
      </div>

      {/* Abas */}
      <div
        style={{
          display: "flex",
          gap: 6,
          background: "#1a1d21",
          padding: 5,
          borderRadius: 12,
        }}
      >
        {[
          { id: "personagem", label: "🧙 Personagem" },
          { id: "missoes", label: "🎯 Missões" },
          { id: "ranking", label: "🏆 Ranking" },
          { id: "log", label: "📜 Histórico XP" },
        ].map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            style={{
              flex: 1,
              background: aba === a.id ? "#24282d" : "transparent",
              border: "none",
              borderRadius: 8,
              color: aba === a.id ? "#f8fafc" : "#64748b",
              fontSize: 11,
              fontWeight: 600,
              padding: "8px 2px",
              cursor: "pointer",
            }}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* ABA PERSONAGEM */}
      {aba === "personagem" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              background: "#1a1d21",
              border: "1px solid #ffffff0d",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            <Personagem2D
              cor={corSel}
              pele={peleSel}
              itens={itensSel}
              nivel={nivelAtual.nivel}
            />
          </div>

          <div
            style={{
              background: "#1a1d21",
              border: "1px solid #ffffff0d",
              borderRadius: 16,
              padding: 16,
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
              COR DA ROUPA
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 16,
              }}
            >
              {CORES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCorSel(c)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: c,
                    border:
                      corSel === c ? "3px solid #fff" : "3px solid transparent",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "#64748b",
                fontWeight: 800,
                letterSpacing: "0.08em",
                marginBottom: 12,
              }}
            >
              COR DE PELE
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CORES_PELE.map((c) => (
                <button
                  key={c}
                  onClick={() => setPeleSel(c)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: c,
                    border:
                      peleSel === c
                        ? "3px solid #fff"
                        : "3px solid transparent",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          </div>

          <div
            style={{
              background: "#1a1d21",
              border: "1px solid #ffffff0d",
              borderRadius: 16,
              padding: 16,
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
              ITENS DESBLOQUEADOS
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ITENS.map((item) => {
                const desbloqueado = nivelAtual.nivel >= item.nivel;
                const equipado = itensSel.includes(item.id);
                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#24282d",
                      borderRadius: 10,
                      padding: "10px 14px",
                      opacity: desbloqueado ? 1 : 0.4,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <span style={{ fontSize: 20 }}>{item.emoji}</span>
                      <div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#f8fafc",
                          }}
                        >
                          {item.nome}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>
                          Nível {item.nivel} necessário
                        </div>
                      </div>
                    </div>
                    {desbloqueado ? (
                      <button
                        onClick={() => toggleItem(item.id)}
                        style={{
                          background: equipado ? "#6366f1" : "#24282d",
                          border: `1px solid ${equipado ? "#6366f1" : "#ffffff1a"}`,
                          borderRadius: 8,
                          color: equipado ? "#fff" : "#64748b",
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "4px 12px",
                          cursor: "pointer",
                        }}
                      >
                        {equipado ? "Equipado" : "Equipar"}
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: "#475569" }}>
                        🔒 Bloqueado
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={salvarPersonagem}
            style={{
              background: "#6366f1",
              border: "none",
              borderRadius: 12,
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              padding: 14,
              cursor: "pointer",
            }}
          >
            💾 Salvar Personagem
          </button>
        </div>
      )}

      {/* ABA MISSÕES */}
      {aba === "missoes" &&
        (() => {
          const hoje = new Date();
          const offset = hoje.getTimezoneOffset();
          const hojeStr = new Date(hoje.getTime() - offset * 60000)
            .toISOString()
            .split("T")[0];

          const MISSOES = [
            {
              id: "registrar_peso",
              emoji: "⚖️",
              nome: "Pesar hoje",
              desc: "Registre seu peso do dia",
              xp: 10,
            },
            {
              id: "beber_agua",
              emoji: "💧",
              nome: "Meta de água",
              desc: "Atinja sua meta de hidratação",
              xp: 15,
            },
            {
              id: "treino_finalizado",
              emoji: "🏋️",
              nome: "Completar treino",
              desc: "Finalize um treino hoje",
              xp: 30,
            },
            {
              id: "macros_registrado",
              emoji: "🍽️",
              nome: "Registrar refeição",
              desc: "Adicione ao menos uma refeição",
              xp: 10,
            },
            {
              id: "habito_concluido",
              emoji: "✅",
              nome: "Completar hábito",
              desc: "Marque ao menos um hábito do dia",
              xp: 10,
            },
            {
              id: "passos_registrado",
              emoji: "👟",
              nome: "Registrar passos",
              desc: "Registre seus passos do dia",
              xp: 10,
            },
            {
              id: "cardio_registrado",
              emoji: "🏃",
              nome: "Fazer cardio",
              desc: "Registre uma atividade de cardio",
              xp: 20,
            },
            {
              id: "medidas_registradas",
              emoji: "📏",
              nome: "Medir corpo",
              desc: "Registre suas medidas corporais",
              xp: 15,
            },
          ];

          const totalXPMissoes = MISSOES.reduce(
            (s, m) => s + (missoesConcluidas.includes(m.id) ? m.xp : 0),
            0,
          );
          const totalPossivel = MISSOES.reduce((s, m) => s + m.xp, 0);

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  background: "#1a1d21",
                  border: "1px solid #ffffff0d",
                  borderRadius: 14,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>
                    XP de missões hoje
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: nivelAtual.cor,
                    }}
                  >
                    {totalXPMissoes} / {totalPossivel} XP
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    background: "#ffffff0d",
                    borderRadius: 99,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: 6,
                      width: `${Math.round((totalXPMissoes / totalPossivel) * 100)}%`,
                      background: nivelAtual.cor,
                      borderRadius: 99,
                      transition: "width 0.4s",
                    }}
                  />
                </div>
              </div>

              {MISSOES.map((m) => {
                const concluida = missoesConcluidas.includes(m.id);
                return (
                  <div
                    key={m.id}
                    style={{
                      background: concluida ? "#10b98110" : "#1a1d21",
                      border: `1px solid ${concluida ? "#10b98133" : "#ffffff0d"}`,
                      borderRadius: 12,
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <span style={{ fontSize: 24 }}>
                      {concluida ? "✅" : m.emoji}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: concluida ? "#10b981" : "#f8fafc",
                        }}
                      >
                        {m.nome}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>
                        {m.desc}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: concluida ? "#10b981" : "#475569",
                      }}
                    >
                      +{m.xp} XP
                    </span>
                  </div>
                );
              })}
              <p
                style={{
                  textAlign: "center",
                  color: "#475569",
                  fontSize: 11,
                  marginTop: 4,
                }}
              >
                As missões são concluídas automaticamente ao realizar as ações
                no app. Resetam à meia-noite.
              </p>
            </div>
          );
        })()}

      {/* ABA RANKING */}
      {aba === "ranking" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              fontSize: 10,
              color: "#64748b",
              fontWeight: 800,
              letterSpacing: "0.08em",
              marginBottom: 4,
            }}
          >
            TOP 10 — GLOBAL
          </div>
          {ranking.map((r, i) => {
            const n = getNivel(r.xp);
            const isMe = r.user_id === user.id;
            return (
              <div
                key={r.user_id}
                style={{
                  background: isMe ? "#6366f115" : "#1a1d21",
                  border: `1px solid ${isMe ? "#6366f144" : "#ffffff0d"}`,
                  borderRadius: 12,
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color:
                      i === 0
                        ? "#ffd700"
                        : i === 1
                          ? "#c0c0c0"
                          : i === 2
                            ? "#cd7f32"
                            : "#64748b",
                    minWidth: 28,
                  }}
                >
                  {i === 0
                    ? "🥇"
                    : i === 1
                      ? "🥈"
                      : i === 2
                        ? "🥉"
                        : `#${i + 1}`}
                </div>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: r.avatar_cor || "#6366f1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                  }}
                >
                  {n.emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{ fontSize: 14, fontWeight: 600, color: "#f8fafc" }}
                  >
                    {r.nome} {isMe ? "(você)" : ""}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>
                    {n.nome} • {r.xp.toLocaleString("pt-BR")} XP
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ABA LOG */}
      {aba === "log" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              fontSize: 10,
              color: "#64748b",
              fontWeight: 800,
              letterSpacing: "0.08em",
              marginBottom: 4,
            }}
          >
            ÚLTIMAS AÇÕES
          </div>
          {log.length === 0 ? (
            <p style={{ textAlign: "center", color: "#475569", fontSize: 13 }}>
              Nenhum XP ganho ainda. Bora treinar! 💪
            </p>
          ) : (
            log.map((l) => (
              <div
                key={l.id}
                style={{
                  background: "#1a1d21",
                  border: "1px solid #ffffff0d",
                  borderRadius: 10,
                  padding: "10px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, color: "#f8fafc" }}>
                    {l.motivo}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>
                    {new Date(l.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <span
                  style={{ fontSize: 14, fontWeight: 700, color: "#10b981" }}
                >
                  +{l.xp} XP
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
