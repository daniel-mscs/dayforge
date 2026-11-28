import React, { useState, useMemo } from "react";
import { supabase } from "./lib/supabase";
import { toast } from "./lib/toast";
import { askConfirm } from "./lib/confirm";
import {
  lerRotinaImportada,
  contarTarefas,
  PERIODOS_IMPORT,
} from "./lib/rotinaImport";

const rotuloDia = (iso) =>
  new Date(iso + "T00:00:00")
    .toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    })
    .replace(".", "");

const EXEMPLO = `Seg 16/11
MANHÃ
7h30 Acordar e café
9h00 Java (2h)
TARDE
14h00 Inglês (30 min)
NOITE
21h30 Alongamento (10 min)

Ter 17/11
MANHÃ
...`;

export default function ImportarRotina({ user, dias, onFechar, onConcluido }) {
  const [texto, setTexto] = useState("");
  const [substituir, setSubstituir] = useState(false);
  const [importando, setImportando] = useState(false);

  const lido = useMemo(() => lerRotinaImportada(texto), [texto]);
  const diasLidos = lido.dias.filter((d) => contarTarefas(d) > 0);
  const total = diasLidos.reduce((s, d) => s + contarTarefas(d), 0);

  const lerArquivo = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setTexto(await f.text());
    e.target.value = "";
  };

  const importar = async () => {
    if (diasLidos.length === 0) return;
    if (
      substituir &&
      !(await askConfirm(
        `Apagar as tarefas atuais de ${diasLidos.length} dia(s) e colocar as novas?`,
      ))
    )
      return;
    setImportando(true);
    try {
      // 1) garante que cada data existe em rotina_dias
      const mapa = {};
      dias.forEach((d) => (mapa[d.data] = d.id));
      const faltando = diasLidos
        .filter((d) => !mapa[d.data])
        .map((d) => d.data);
      if (faltando.length) {
        const { data, error } = await supabase
          .from("rotina_dias")
          .insert(faltando.map((data) => ({ user_id: user.id, data })))
          .select();
        if (error) throw error;
        data.forEach((d) => (mapa[d.data] = d.id));
      }
      const ids = diasLidos.map((d) => mapa[d.data]);

      // 2) tarefas já existentes (pra não duplicar / continuar a ordem)
      if (substituir) {
        const { error } = await supabase
          .from("rotina_tarefas")
          .delete()
          .in("dia_id", ids);
        if (error) throw error;
      }
      const { data: existentes } = substituir
        ? { data: [] }
        : await supabase
            .from("rotina_tarefas")
            .select("dia_id,periodo,texto")
            .in("dia_id", ids);
      const chaves = new Set(
        (existentes || []).map(
          (t) => `${t.dia_id}|${t.periodo}|${t.texto.trim().toLowerCase()}`,
        ),
      );
      const contagem = {};
      (existentes || []).forEach((t) => {
        const k = `${t.dia_id}|${t.periodo}`;
        contagem[k] = (contagem[k] || 0) + 1;
      });

      // 3) monta e insere
      const linhas = [];
      diasLidos.forEach((d) => {
        const diaId = mapa[d.data];
        PERIODOS_IMPORT.forEach((p) => {
          d.periodos[p].forEach((txt) => {
            const chave = `${diaId}|${p}|${txt.trim().toLowerCase()}`;
            if (chaves.has(chave)) return;
            chaves.add(chave);
            const k = `${diaId}|${p}`;
            linhas.push({
              user_id: user.id,
              dia_id: diaId,
              periodo: p,
              texto: txt,
              concluida: false,
              ordem: contagem[k] || 0,
            });
            contagem[k] = (contagem[k] || 0) + 1;
          });
        });
      });
      for (let i = 0; i < linhas.length; i += 400) {
        const { error } = await supabase
          .from("rotina_tarefas")
          .insert(linhas.slice(i, i + 400));
        if (error) throw error;
      }
      const ignoradas = total - linhas.length;
      toast(
        `${linhas.length} tarefas importadas em ${diasLidos.length} dia(s)` +
          (ignoradas > 0 ? ` (${ignoradas} já existiam)` : ""),
        "success",
      );
      onConcluido();
    } catch (err) {
      toast("Erro ao importar: " + (err.message || err), "error");
    }
    setImportando(false);
  };

  return (
    <div className="modal-overlay" onClick={onFechar}>
      <div
        className="modal-resumo"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "90vh", overflowY: "auto" }}
      >
        <h2 style={{ fontSize: "1rem", marginBottom: 6, textAlign: "center" }}>
          📥 Importar semana
        </h2>
        <p style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
          Cole o texto da semana (um dia por bloco, com a data) ou um JSON. Dá
          pra mandar vários dias de uma vez.
        </p>

        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={EXEMPLO}
          rows={9}
          style={{
            width: "100%",
            background: "#1f2533",
            border: "1px solid #ffffff10",
            borderRadius: 10,
            color: "#f8fafc",
            fontSize: 13,
            padding: 10,
            fontFamily: "monospace",
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />

        <label
          style={{
            display: "inline-block",
            marginTop: 8,
            fontSize: 12,
            color: "#818cf8",
            cursor: "pointer",
          }}
        >
          📎 Escolher arquivo (.txt ou .json)
          <input
            type="file"
            accept=".txt,.json,text/plain,application/json"
            onChange={lerArquivo}
            style={{ display: "none" }}
          />
        </label>

        {diasLidos.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#10b981",
                marginBottom: 6,
              }}
            >
              {diasLidos.length} dia(s) · {total} tarefas
            </div>
            {diasLidos.map((d) => (
              <div
                key={d.data}
                style={{
                  fontSize: 12,
                  color: "#94a3b8",
                  padding: "3px 0",
                  borderTop: "1px solid #ffffff08",
                }}
              >
                <b style={{ color: "#f8fafc" }}>{rotuloDia(d.data)}</b> ·{" "}
                {PERIODOS_IMPORT.filter((p) => d.periodos[p].length)
                  .map((p) => `${p} ${d.periodos[p].length}`)
                  .join(" · ")}
              </div>
            ))}
          </div>
        )}

        {lido.avisos.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 11, color: "#fbbf24" }}>
            {lido.avisos.slice(0, 4).map((a, i) => (
              <div key={i}>⚠ {a}</div>
            ))}
          </div>
        )}

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 12,
            fontSize: 12,
            color: "#94a3b8",
          }}
        >
          <input
            type="checkbox"
            checked={substituir}
            onChange={(e) => setSubstituir(e.target.checked)}
          />
          Substituir o que já existe nesses dias
        </label>

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button
            onClick={onFechar}
            style={{
              flex: 1,
              background: "#1f2533",
              border: "1px solid #ffffff10",
              borderRadius: 10,
              color: "#94a3b8",
              padding: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={importar}
            disabled={importando || diasLidos.length === 0}
            style={{
              flex: 2,
              background: diasLidos.length === 0 ? "#334155" : "#10b981",
              border: "none",
              borderRadius: 10,
              color: "#000",
              padding: 11,
              fontWeight: 700,
              cursor: diasLidos.length === 0 ? "default" : "pointer",
            }}
          >
            {importando ? "Importando..." : "Importar"}
          </button>
        </div>
      </div>
    </div>
  );
}
