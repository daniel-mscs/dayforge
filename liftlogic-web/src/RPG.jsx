import React, { useState, useEffect, useCallback } from "react";
import { toast } from "./lib/toast";
import { supabase } from "./lib/supabase";
import {
  Swords,
  ListChecks,
  Trophy,
  ScrollText,
  Flame,
  Zap,
  Crown,
  Lock,
  Check,
  Shield,
  Sparkles,
} from "lucide-react";

// Rank ao estilo "sistema" — E é o começo, S é o topo.
const NIVEIS = [
  {
    nivel: 1,
    letra: "E",
    nome: "Despertar",
    xpMin: 0,
    xpMax: 199,
    cor: "#64748b",
  },
  {
    nivel: 2,
    letra: "D",
    nome: "Iniciado",
    xpMin: 200,
    xpMax: 499,
    cor: "#38bdf8",
  },
  {
    nivel: 3,
    letra: "C",
    nome: "Combatente",
    xpMin: 500,
    xpMax: 999,
    cor: "#22d3ee",
  },
  {
    nivel: 4,
    letra: "B",
    nome: "Veterano",
    xpMin: 1000,
    xpMax: 1999,
    cor: "#818cf8",
  },
  {
    nivel: 5,
    letra: "A",
    nome: "Elite",
    xpMin: 2000,
    xpMax: 4999,
    cor: "#a78bfa",
  },
  {
    nivel: 6,
    letra: "S",
    nome: "Monarca",
    xpMin: 5000,
    xpMax: 999999,
    cor: "#fbbf24",
  },
];

const ITENS = [
  { id: "espada", nome: "Lâmina do Caçador", icon: Swords, nivel: 1 },
  { id: "escudo", nome: "Escudo Espectral", icon: Shield, nivel: 2 },
  { id: "capacete", nome: "Elmo de Ferro", icon: Lock, nivel: 3 },
  { id: "capa", nome: "Manto das Sombras", icon: Sparkles, nivel: 3 },
  { id: "coroa", nome: "Coroa do Monarca", icon: Crown, nivel: 4 },
  { id: "asas", nome: "Asas Etéreas", icon: Sparkles, nivel: 5 },
];

const CORES_SISTEMA = [
  "#818cf8",
  "#38bdf8",
  "#a78bfa",
  "#22d3ee",
  "#f472b6",
  "#fbbf24",
  "#34d399",
  "#f87171",
];

function getNivel(xp) {
  return (
    NIVEIS.slice()
      .reverse()
      .find((n) => xp >= n.xpMin) || NIVEIS[0]
  );
}

export default function RPG({ user, xpExterno }) {
  const [rpg, setRpg] = useState(null);
  const [meuNome, setMeuNome] = useState("Caçador");
  const [log, setLog] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [aba, setAba] = useState("status");
  const [corSel, setCorSel] = useState("#818cf8");
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
      setCorSel(rpgData.avatar_cor || "#818cf8");
      setItensSel(rpgData.itens_equipados || []);
    } else {
      const { data: novo } = await supabase
        .from("rpg_perfil")
        .insert([
          {
            user_id: user.id,
            xp: 0,
            nivel: 1,
            avatar_cor: "#818cf8",
            itens_equipados: [],
          },
        ])
        .select()
        .single();
      setRpg(novo);
    }

    const { data: perfilData } = await supabase
      .from("perfil")
      .select("nome")
      .eq("user_id", user.id)
      .maybeSingle();
    if (perfilData?.nome) setMeuNome(perfilData.nome);

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
        itens_equipados: itensSel,
      })
      .eq("user_id", user.id);
    setRpg((prev) => ({
      ...prev,
      avatar_cor: corSel,
      itens_equipados: itensSel,
    }));
    toast("Configuração salva!", "success");
  };

  const toggleItem = (itemId) => {
    setItensSel((prev) =>
      prev.includes(itemId)
        ? prev.filter((i) => i !== itemId)
        : [...prev, itemId],
    );
  };

  if (carregando)
    return (
      <div style={{ textAlign: "center", color: "#64748b", paddingTop: 40 }}>
        Sincronizando com o Sistema...
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

  const sysVars = { "--sl-glow": corSel };

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
        <h2
          className="title-divisao"
          style={{
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Swords
            size={20}
            color="#818cf8"
            style={{ filter: "drop-shadow(0 0 6px rgba(129,140,248,0.6))" }}
          />
          RPG
        </h2>
        <div
          style={{
            background: nivelAtual.cor + "1a",
            border: `1px solid ${nivelAtual.cor}55`,
            borderRadius: 8,
            padding: "4px 12px",
            fontSize: 12,
            fontWeight: 800,
            color: nivelAtual.cor,
            textShadow: `0 0 10px ${nivelAtual.cor}`,
            letterSpacing: "0.05em",
          }}
        >
          RANK {nivelAtual.letra}
        </div>
      </div>

      {/* Abas */}
      <div
        style={{
          display: "flex",
          gap: 6,
          background: "#0b0e1a",
          border: "1px solid #ffffff0d",
          padding: 5,
          borderRadius: 12,
        }}
      >
        {[
          { id: "status", icon: Zap, label: "Status" },
          { id: "missoes", icon: ListChecks, label: "Quests" },
          { id: "ranking", icon: Trophy, label: "Ranking" },
          { id: "log", icon: ScrollText, label: "Log" },
        ].map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              background: aba === a.id ? "#151a2c" : "transparent",
              border:
                aba === a.id ? "1px solid #818cf844" : "1px solid transparent",
              borderRadius: 8,
              color: aba === a.id ? "#a5b4fc" : "#64748b",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.04em",
              padding: "8px 2px",
              cursor: "pointer",
            }}
          >
            <a.icon size={16} strokeWidth={2} />
            {a.label}
          </button>
        ))}
      </div>

      {/* ABA STATUS */}
      {aba === "status" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="sl-panel" style={sysVars}>
            <span className="sl-corner-bl" />
            <span className="sl-corner-br" />
            <div className="sl-title sl-pulse" style={{ marginBottom: 16 }}>
              [ STATUS ]
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 10,
                  flexShrink: 0,
                  background: "#05070d",
                  border: `1px solid ${nivelAtual.cor}`,
                  boxShadow: `0 0 16px -2px ${nivelAtual.cor}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26,
                  fontWeight: 900,
                  color: nivelAtual.cor,
                  textShadow: `0 0 12px ${nivelAtual.cor}`,
                }}
              >
                {nivelAtual.letra}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#f8fafc",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {meuNome}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: nivelAtual.cor,
                    fontWeight: 700,
                    letterSpacing: "0.03em",
                  }}
                >
                  Título: {nivelAtual.nome}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: "#64748b",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                }}
              >
                EXP
              </span>
              <span style={{ fontSize: 12, fontWeight: 800, color: corSel }}>
                {xp.toLocaleString("pt-BR")}
              </span>
            </div>
            <div
              style={{
                height: 8,
                background: "#05070d",
                border: "1px solid #ffffff0d",
                borderRadius: 99,
                overflow: "hidden",
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${pctNivel}%`,
                  background: `linear-gradient(90deg, ${corSel}88, ${corSel})`,
                  boxShadow: `0 0 10px ${corSel}`,
                  borderRadius: 99,
                  transition: "width 0.4s",
                }}
              />
            </div>
            {proximoNivel ? (
              <div style={{ fontSize: 11, color: "#64748b" }}>
                Faltam {xpParaProximo.toLocaleString("pt-BR")} EXP para o RANK{" "}
                {proximoNivel.letra}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: nivelAtual.cor }}>
                Rank máximo alcançado.
              </div>
            )}

            {(rpg?.streak || 0) > 0 && (
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: "1px solid #ffffff0d",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Flame
                  size={16}
                  color="#f97316"
                  style={{
                    filter: "drop-shadow(0 0 6px rgba(249,115,22,0.6))",
                  }}
                />
                <span
                  style={{ fontSize: 12, color: "#f97316", fontWeight: 700 }}
                >
                  Sequência de {rpg.streak} dia{rpg.streak > 1 ? "s" : ""} · +
                  {Math.min(rpg.streak * 5, 50)} EXP/dia
                </span>
              </div>
            )}
          </div>

          <div className="sl-panel" style={sysVars}>
            <span className="sl-corner-bl" />
            <span className="sl-corner-br" />
            <div className="sl-title" style={{ marginBottom: 12 }}>
              [ COR DO SISTEMA ]
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CORES_SISTEMA.map((c) => (
                <button
                  key={c}
                  onClick={() => setCorSel(c)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "#05070d",
                    border:
                      corSel === c ? `2px solid ${c}` : "2px solid #ffffff10",
                    boxShadow: corSel === c ? `0 0 12px -1px ${c}` : "none",
                    cursor: "pointer",
                    position: "relative",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      inset: 6,
                      borderRadius: 4,
                      background: c,
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="sl-panel" style={sysVars}>
            <span className="sl-corner-bl" />
            <span className="sl-corner-br" />
            <div className="sl-title" style={{ marginBottom: 12 }}>
              [ EQUIPAMENTOS ]
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ITENS.map((item) => {
                const desbloqueado = nivelAtual.nivel >= item.nivel;
                const equipado = itensSel.includes(item.id);
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#05070d",
                      border: `1px solid ${equipado ? corSel + "55" : "#ffffff0d"}`,
                      borderRadius: 10,
                      padding: "10px 14px",
                      opacity: desbloqueado ? 1 : 0.4,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <Icon
                        size={18}
                        color={equipado ? corSel : "#64748b"}
                        style={
                          equipado
                            ? { filter: `drop-shadow(0 0 6px ${corSel})` }
                            : undefined
                        }
                      />
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
                          Requer RANK{" "}
                          {NIVEIS.find((n) => n.nivel === item.nivel)?.letra}
                        </div>
                      </div>
                    </div>
                    {desbloqueado ? (
                      <button
                        onClick={() => toggleItem(item.id)}
                        style={{
                          background: equipado ? corSel : "#151a2c",
                          border: `1px solid ${equipado ? corSel : "#ffffff1a"}`,
                          borderRadius: 8,
                          color: equipado ? "#05070d" : "#64748b",
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "4px 12px",
                          cursor: "pointer",
                        }}
                      >
                        {equipado ? "Equipado" : "Equipar"}
                      </button>
                    ) : (
                      <span
                        style={{
                          fontSize: 11,
                          color: "#475569",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Lock size={11} /> Bloqueado
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
              background: corSel,
              border: "none",
              borderRadius: 12,
              color: "#05070d",
              fontSize: 15,
              fontWeight: 800,
              padding: 14,
              cursor: "pointer",
              boxShadow: `0 4px 20px -4px ${corSel}`,
            }}
          >
            Salvar
          </button>
        </div>
      )}

      {/* ABA MISSÕES / DAILY QUEST */}
      {aba === "missoes" &&
        (() => {
          const MISSOES = [
            {
              id: "registrar_peso",
              nome: "Pesar hoje",
              desc: "Registre seu peso do dia",
              xp: 10,
            },
            {
              id: "beber_agua",
              nome: "Meta de água",
              desc: "Atinja sua meta de hidratação",
              xp: 15,
            },
            {
              id: "treino_finalizado",
              nome: "Completar treino",
              desc: "Finalize um treino hoje",
              xp: 30,
            },
            {
              id: "macros_registrado",
              nome: "Registrar refeição",
              desc: "Adicione ao menos uma refeição",
              xp: 10,
            },
            {
              id: "habito_concluido",
              nome: "Completar hábito",
              desc: "Marque ao menos um hábito do dia",
              xp: 10,
            },
            {
              id: "passos_registrado",
              nome: "Registrar passos",
              desc: "Registre seus passos do dia",
              xp: 10,
            },
            {
              id: "cardio_registrado",
              nome: "Fazer cardio",
              desc: "Registre uma atividade de cardio",
              xp: 20,
            },
            {
              id: "medidas_registradas",
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
              <div className="sl-panel" style={sysVars}>
                <span className="sl-corner-bl" />
                <span className="sl-corner-br" />
                <div className="sl-title" style={{ marginBottom: 4 }}>
                  [ DAILY QUEST ]
                </div>
                <div
                  style={{ fontSize: 11, color: "#64748b", marginBottom: 12 }}
                >
                  Complete as tarefas abaixo antes da meia-noite.
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>
                    Progresso
                  </span>
                  <span
                    style={{ fontSize: 13, fontWeight: 800, color: corSel }}
                  >
                    {totalXPMissoes} / {totalPossivel} EXP
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    background: "#05070d",
                    borderRadius: 99,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.round((totalXPMissoes / totalPossivel) * 100)}%`,
                      background: corSel,
                      boxShadow: `0 0 8px ${corSel}`,
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
                      background: concluida ? corSel + "0f" : "#0b0e1a",
                      border: `1px solid ${concluida ? corSel + "44" : "#ffffff0d"}`,
                      borderRadius: 10,
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 6,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: concluida ? corSel : "#151a2c",
                        border: `1px solid ${concluida ? corSel : "#ffffff1a"}`,
                      }}
                    >
                      {concluida && (
                        <Check size={15} color="#05070d" strokeWidth={3} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: concluida ? corSel : "#f8fafc",
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
                        color: concluida ? corSel : "#475569",
                      }}
                    >
                      +{m.xp}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })()}

      {/* ABA RANKING */}
      {aba === "ranking" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="sl-title" style={{ marginBottom: 4 }}>
            [ TOP CAÇADORES ]
          </div>
          {ranking.map((r, i) => {
            const n = getNivel(r.xp);
            const isMe = r.user_id === user.id;
            return (
              <div
                key={r.user_id}
                style={{
                  background: isMe
                    ? (r.avatar_cor || "#818cf8") + "12"
                    : "#0b0e1a",
                  border: `1px solid ${isMe ? (r.avatar_cor || "#818cf8") + "44" : "#ffffff0d"}`,
                  borderRadius: 12,
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color:
                      i === 0
                        ? "#fbbf24"
                        : i === 1
                          ? "#cbd5e1"
                          : i === 2
                            ? "#d97706"
                            : "#64748b",
                    minWidth: 24,
                    textAlign: "center",
                  }}
                >
                  {i < 3 ? (
                    <Crown
                      size={16}
                      style={
                        i === 0
                          ? { filter: "drop-shadow(0 0 6px #fbbf24)" }
                          : undefined
                      }
                    />
                  ) : (
                    `#${i + 1}`
                  )}
                </div>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: "#05070d",
                    border: `1px solid ${n.cor}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 800,
                    color: n.cor,
                  }}
                >
                  {n.letra}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{ fontSize: 14, fontWeight: 600, color: "#f8fafc" }}
                  >
                    {r.nome} {isMe ? "(você)" : ""}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>
                    {n.nome} · {r.xp.toLocaleString("pt-BR")} EXP
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
          <div className="sl-title" style={{ marginBottom: 4 }}>
            [ SYSTEM LOG ]
          </div>
          {log.length === 0 ? (
            <p style={{ textAlign: "center", color: "#475569", fontSize: 13 }}>
              Nenhum registro do sistema ainda.
            </p>
          ) : (
            log.map((l) => (
              <div
                key={l.id}
                style={{
                  background: "#0b0e1a",
                  border: "1px solid #ffffff0d",
                  borderLeft: `3px solid ${corSel}`,
                  borderRadius: 8,
                  padding: "10px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, color: "#e2e8f0" }}>
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
                <span style={{ fontSize: 13, fontWeight: 800, color: corSel }}>
                  +{l.xp} EXP
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
