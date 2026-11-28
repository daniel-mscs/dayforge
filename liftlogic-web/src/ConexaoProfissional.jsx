import React, { useState, useEffect, useCallback } from "react";
import { Briefcase, User, Copy, Link2, X, Clock, Check } from "lucide-react";
import { toast } from "./lib/toast";
import { askConfirm } from "./lib/confirm";
import { useTravado } from "./lib/useTravado";
import {
  definirTipoConta,
  meusVinculos,
  conectarComCodigo,
  removerVinculo,
} from "./lib/profissional";

const card = {
  background: "linear-gradient(180deg, #1a2030 0%, #151a24 100%)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 18,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const titulo = {
  fontSize: 11,
  fontWeight: 800,
  color: "#7c879b",
  letterSpacing: "0.08em",
};

// Bloco do Perfil: tipo de conta, código do profissional e conexões
export default function ConexaoProfissional({
  user,
  perfil,
  onPerfilAtualizado,
}) {
  const tipo = perfil?.tipo_conta === "profissional" ? "profissional" : "aluno";
  const [vinculos, setVinculos] = useState([]);
  const [codigo, setCodigo] = useState("");
  const [erroBanco, setErroBanco] = useState("");

  const carregar = useCallback(
    () =>
      meusVinculos()
        .then((lista) => {
          setVinculos(lista);
          setErroBanco("");
        })
        .catch((e) => setErroBanco(e.message)),
    [],
  );

  useEffect(() => {
    carregar();
  }, [carregar]);

  const [trocarTipo, trocando] = useTravado(async (novo) => {
    if (novo === tipo) return;
    try {
      const r = await definirTipoConta(
        user.id,
        novo,
        perfil?.codigo_profissional,
      );
      onPerfilAtualizado?.(r);
      toast(
        novo === "profissional"
          ? "Conta profissional ativada! 💼"
          : "Conta de aluno",
        "success",
      );
    } catch (e) {
      toast(e.message, "error", 6000);
    }
  });

  const [conectar, conectando] = useTravado(async () => {
    if (!codigo.trim()) return;
    try {
      const prof = await conectarComCodigo(user.id, codigo);
      toast(
        `Pedido enviado para ${prof.nome || "o profissional"}! Aguarde ele aceitar.`,
        "success",
        5000,
      );
      setCodigo("");
      carregar();
    } catch (e) {
      toast(e.message, "error", 6000);
    }
  });

  const desconectar = async (v) => {
    if (
      !(await askConfirm(
        `Desconectar de ${v.outro_nome || "este profissional"}? Ele deixa de ver seus dados.`,
      ))
    )
      return;
    try {
      await removerVinculo(v.id);
      carregar();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(perfil.codigo_profissional);
      toast("Código copiado!", "success");
    } catch {
      toast(perfil.codigo_profissional, "info");
    }
  };

  const comoAluno = vinculos.filter((v) => v.papel === "aluno");

  return (
    <div style={card}>
      <div style={titulo}>TIPO DE CONTA</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[
          ["aluno", User, "Aluno", "Uso o app para mim"],
          ["profissional", Briefcase, "Profissional", "Personal / nutri"],
        ].map((op) => {
          const [id, Icone, rotulo, sub] = op;
          return (
            <button
              key={id}
              disabled={trocando}
              onClick={() => trocarTipo(id)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 4,
                padding: 12,
                borderRadius: 14,
                cursor: "pointer",
                textAlign: "left",
                background: tipo === id ? "rgba(99,102,241,0.14)" : "#1f2533",
                border: `1px solid ${tipo === id ? "#6366f1" : "rgba(255,255,255,0.07)"}`,
                color: "#f8fafc",
              }}
            >
              <Icone size={18} color={tipo === id ? "#818cf8" : "#7c879b"} />
              <strong style={{ fontSize: 14 }}>{rotulo}</strong>
              <span style={{ fontSize: 11, color: "#7c879b" }}>{sub}</span>
            </button>
          );
        })}
      </div>

      {erroBanco && (
        <div style={{ fontSize: 12, color: "#f59e0b" }}>⚠️ {erroBanco}</div>
      )}

      {tipo === "profissional" && perfil?.codigo_profissional && (
        <div
          style={{
            background: "#12161e",
            border: "1px dashed #6366f166",
            borderRadius: 14,
            padding: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: "#7c879b", fontWeight: 700 }}>
              SEU CÓDIGO
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: "0.12em",
                color: "#f8fafc",
              }}
            >
              {perfil.codigo_profissional}
            </div>
            <div style={{ fontSize: 11, color: "#7c879b", marginTop: 2 }}>
              Passe para o aluno digitar no Perfil dele. Os pedidos aparecem em
              Mais → Alunos.
            </div>
          </div>
          <button
            onClick={copiar}
            style={{
              background: "#1f2533",
              border: "none",
              borderRadius: 12,
              padding: 10,
              color: "#cbd5e1",
              cursor: "pointer",
            }}
            aria-label="Copiar código"
          >
            <Copy size={18} />
          </button>
        </div>
      )}

      <div style={titulo}>MEU PROFISSIONAL</div>
      {comoAluno.length === 0 && (
        <div style={{ fontSize: 12, color: "#7c879b" }}>
          Tem personal ou nutricionista no DayForge? Digite o código dele para
          ele acompanhar seus treinos, dieta, macros, água, peso e medidas.
        </div>
      )}
      {comoAluno.map((v) => (
        <div
          key={v.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#1f2533",
            borderRadius: 12,
            padding: "10px 12px",
          }}
        >
          {v.status === "ativo" ? (
            <Check size={16} color="#10b981" />
          ) : (
            <Clock size={16} color="#f59e0b" />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f8fafc" }}>
              {v.outro_nome || "Profissional"}
            </div>
            <div
              style={{
                fontSize: 11,
                color: v.status === "ativo" ? "#10b981" : "#f59e0b",
              }}
            >
              {v.status === "ativo"
                ? "Conectado — acompanha seus dados"
                : "Aguardando ele aceitar"}
            </div>
          </div>
          <button
            onClick={() => desconectar(v)}
            style={{
              background: "none",
              border: "none",
              color: "#ef4444",
              cursor: "pointer",
            }}
            aria-label="Desconectar"
          >
            <X size={18} />
          </button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          placeholder="Código do profissional (ex: DF-7K2QX)"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && conectar()}
          autoCapitalize="characters"
        />
        <button
          onClick={conectar}
          disabled={conectando || !codigo.trim()}
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: codigo.trim() ? "#6366f1" : "#2a2e34",
            border: "none",
            borderRadius: 12,
            color: "#fff",
            fontWeight: 700,
            padding: "0 14px",
            cursor: "pointer",
          }}
        >
          <Link2 size={16} /> {conectando ? "..." : "Conectar"}
        </button>
      </div>
    </div>
  );
}
