import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  ChevronLeft,
  Check,
  X,
  Dumbbell,
  Salad,
  Droplet,
  Scale,
  Plus,
  Trash2,
  FileText,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import { toast } from "./lib/toast";
import { askConfirm } from "./lib/confirm";
import { useTravado } from "./lib/useTravado";
import {
  meusVinculos,
  aceitarVinculo,
  removerVinculo,
} from "./lib/profissional";
import { parsearTreinoTexto } from "./lib/pdfImportarTreino";
import Dieta from "./Dieta";
import Manequim from "./Manequim";

const card = {
  background: "linear-gradient(180deg, #1a2030 0%, #151a24 100%)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 18,
  padding: 16,
};
const rotulo = {
  fontSize: 11,
  fontWeight: 800,
  color: "#7c879b",
  letterSpacing: "0.08em",
};
const btn = (cor = "#6366f1") => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  background: cor,
  border: "none",
  borderRadius: 12,
  color: "#fff",
  fontWeight: 700,
  fontSize: 13,
  padding: "10px 14px",
  cursor: "pointer",
});

function dataISO(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}
const fmtData = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

// ─────────────────────────── Treino do aluno ───────────────────────────
function TreinoAluno({ alunoId }) {
  const [exercicios, setExercicios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [novo, setNovo] = useState({
    treino: "A",
    nome: "",
    grupo_muscular: "",
    series: "3",
    repeticoes: "12",
    carga: "",
  });
  const [importando, setImportando] = useState(false);
  const [texto, setTexto] = useState("");

  const buscar = useCallback(
    () =>
      supabase
        .from("exercicio")
        .select("*")
        .eq("user_id", alunoId)
        .order("treino", { ascending: true })
        .order("ordem", { ascending: true }),
    [alunoId],
  );
  const aplicar = ({ data, error }) => {
    if (error) toast(error.message, "error");
    setExercicios(data || []);
    setCarregando(false);
  };
  const carregar = () => buscar().then(aplicar);

  useEffect(() => {
    buscar().then(aplicar);
  }, [buscar]);

  const letras = [...new Set(exercicios.map((e) => e.treino))].sort();
  const proximaOrdem = (letra) =>
    exercicios.filter((e) => e.treino === letra).length;

  const [adicionar, adicionando] = useTravado(async () => {
    if (!novo.nome.trim())
      return toast("Digite o nome do exercício", "warning");
    const { error } = await supabase.from("exercicio").insert([
      {
        user_id: alunoId,
        treino: novo.treino,
        nome: novo.nome.trim(),
        grupo_muscular: novo.grupo_muscular.trim(),
        series: Number(novo.series) || 3,
        repeticoes: Number(novo.repeticoes) || 10,
        carga: Number(String(novo.carga).replace(",", ".")) || 0,
        ordem: proximaOrdem(novo.treino),
        equipamento: "maquina",
        descanso_segundos: 90,
      },
    ]);
    if (error) return toast(error.message, "error");
    setNovo((n) => ({ ...n, nome: "", carga: "" }));
    carregar();
  });

  const atualizar = async (ex, campo, valor) => {
    const v = ["series", "repeticoes", "carga"].includes(campo)
      ? Number(String(valor).replace(",", ".")) || 0
      : valor;
    if (String(ex[campo] ?? "") === String(v)) return;
    setExercicios((lista) =>
      lista.map((e) => (e.id === ex.id ? { ...e, [campo]: v } : e)),
    );
    const { error } = await supabase
      .from("exercicio")
      .update({ [campo]: v })
      .eq("id", ex.id);
    if (error) {
      toast(error.message, "error");
      carregar();
    }
  };

  const apagar = async (ex) => {
    if (!(await askConfirm(`Apagar "${ex.nome}" do treino ${ex.treino}?`)))
      return;
    setExercicios((lista) => lista.filter((e) => e.id !== ex.id));
    const { error } = await supabase.from("exercicio").delete().eq("id", ex.id);
    if (error) {
      toast(error.message, "error");
      carregar();
    }
  };

  const lido = parsearTreinoTexto(texto);
  const totalLido = Object.values(lido).reduce((a, l) => a + l.length, 0);
  const [importar, salvandoImport] = useTravado(async () => {
    if (!totalLido) return;
    const linhas = [];
    Object.entries(lido).forEach(([letra, lista]) =>
      lista.forEach((ex, i) =>
        linhas.push({
          user_id: alunoId,
          treino: letra,
          nome: ex.nome,
          grupo_muscular: ex.grupo_muscular,
          series: ex.series,
          repeticoes: ex.repeticoes,
          carga: ex.carga,
          descanso_segundos: ex.descanso_segundos,
          equipamento: ex.equipamento,
          ordem: proximaOrdem(letra) + i,
        }),
      ),
    );
    const { error } = await supabase.from("exercicio").insert(linhas);
    if (error) return toast(error.message, "error");
    toast(`${linhas.length} exercícios adicionados ao aluno`, "success");
    setTexto("");
    setImportando(false);
    carregar();
  });

  if (carregando)
    return (
      <div style={{ color: "#7c879b", fontSize: 13, padding: 12 }}>
        Carregando treino...
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {letras.length === 0 && (
        <div style={{ ...card, color: "#7c879b", fontSize: 13 }}>
          O aluno ainda não tem exercícios. Adicione abaixo ou importe um texto.
        </div>
      )}
      {letras.map((letra) => (
        <div key={letra} style={card}>
          <div style={{ ...rotulo, color: "#818cf8", marginBottom: 10 }}>
            TREINO {letra}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {exercicios
              .filter((e) => e.treino === letra)
              .map((ex) => (
                <div
                  key={ex.id}
                  style={{
                    background: "#1f2533",
                    borderRadius: 12,
                    padding: 10,
                  }}
                >
                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <input
                      defaultValue={ex.nome}
                      onBlur={(e) => atualizar(ex, "nome", e.target.value)}
                      style={{ fontSize: 13, padding: 8, fontWeight: 700 }}
                    />
                    <button
                      onClick={() => apagar(ex)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                      }}
                      aria-label="Apagar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 1fr 1fr",
                      gap: 6,
                      marginTop: 6,
                    }}
                  >
                    <input
                      defaultValue={ex.grupo_muscular}
                      placeholder="Grupo"
                      onBlur={(e) =>
                        atualizar(ex, "grupo_muscular", e.target.value)
                      }
                      style={{ fontSize: 12, padding: 8 }}
                    />
                    <input
                      defaultValue={ex.series}
                      inputMode="numeric"
                      title="Séries"
                      onBlur={(e) => atualizar(ex, "series", e.target.value)}
                      style={{ fontSize: 12, padding: 8 }}
                    />
                    <input
                      defaultValue={ex.repeticoes}
                      inputMode="numeric"
                      title="Reps"
                      onBlur={(e) =>
                        atualizar(ex, "repeticoes", e.target.value)
                      }
                      style={{ fontSize: 12, padding: 8 }}
                    />
                    <input
                      defaultValue={ex.carga}
                      inputMode="decimal"
                      title="Kg"
                      onBlur={(e) => atualizar(ex, "carga", e.target.value)}
                      style={{ fontSize: 12, padding: 8 }}
                    />
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 1fr 1fr",
                      gap: 6,
                      fontSize: 10,
                      color: "#64748b",
                      marginTop: 2,
                      textAlign: "center",
                    }}
                  >
                    <span>grupo</span>
                    <span>séries</span>
                    <span>reps</span>
                    <span>kg</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}

      <div style={card}>
        <div style={{ ...rotulo, marginBottom: 10 }}>ADICIONAR EXERCÍCIO</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {["A", "B", "C", "D", "E"].map((l) => (
            <button
              key={l}
              onClick={() => setNovo((n) => ({ ...n, treino: l }))}
              style={{
                ...btn(novo.treino === l ? "#6366f1" : "#1f2533"),
                flex: 1,
                padding: 8,
              }}
            >
              {l}
            </button>
          ))}
        </div>
        <input
          placeholder="Nome (ex: Supino reto)"
          value={novo.nome}
          onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
          style={{ marginBottom: 6 }}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gap: 6,
          }}
        >
          <input
            placeholder="Grupo"
            value={novo.grupo_muscular}
            onChange={(e) =>
              setNovo({ ...novo, grupo_muscular: e.target.value })
            }
          />
          <input
            placeholder="Séries"
            inputMode="numeric"
            value={novo.series}
            onChange={(e) => setNovo({ ...novo, series: e.target.value })}
          />
          <input
            placeholder="Reps"
            inputMode="numeric"
            value={novo.repeticoes}
            onChange={(e) => setNovo({ ...novo, repeticoes: e.target.value })}
          />
          <input
            placeholder="Kg"
            inputMode="decimal"
            value={novo.carga}
            onChange={(e) => setNovo({ ...novo, carga: e.target.value })}
          />
        </div>
        <button
          onClick={adicionar}
          disabled={adicionando}
          style={{ ...btn(), width: "100%", marginTop: 10 }}
        >
          <Plus size={16} />{" "}
          {adicionando ? "Salvando..." : `Adicionar ao treino ${novo.treino}`}
        </button>
        <button
          onClick={() => setImportando((v) => !v)}
          style={{
            ...btn("#1f2533"),
            width: "100%",
            marginTop: 8,
            color: "#10b981",
          }}
        >
          <FileText size={16} /> Importar treino colando texto
        </button>
        {importando && (
          <div style={{ marginTop: 10 }}>
            <textarea
              rows={7}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={
                "Treino A - Peito e Tríceps\nSupino reto 4x10\nCrucifixo 3x12\n\nTreino B - Costas\nPuxada frontal 4x10"
              }
              style={{
                width: "100%",
                background: "#1f2533",
                border: "1px solid #ffffff14",
                borderRadius: 12,
                color: "#f8fafc",
                fontSize: 13,
                padding: 12,
                fontFamily: "inherit",
              }}
            />
            <div
              style={{
                fontSize: 12,
                color: totalLido ? "#10b981" : "#64748b",
                margin: "6px 0",
              }}
            >
              {totalLido
                ? `✓ ${totalLido} exercício(s) em ${Object.keys(lido)
                    .filter((l) => lido[l].length)
                    .join(", ")}`
                : 'Formato: "Nome 4x12 40kg", com "Treino A", "Treino B"...'}
            </div>
            <button
              onClick={importar}
              disabled={!totalLido || salvandoImport}
              style={{
                ...btn(totalLido ? "#10b981" : "#2a2e34"),
                width: "100%",
              }}
            >
              {salvandoImport ? "Importando..." : "Adicionar ao aluno"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────── Macros e água (leitura) ───────────────────────────
function NutricaoAluno({ alunoId }) {
  const [dados, setDados] = useState(null);

  useEffect(() => {
    let ativo = true;
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - 6);
    const desde = dataISO(inicio);
    Promise.all([
      supabase
        .from("macros_registro")
        .select("data, nome, gramas, refeicao, kcal, prot, carb, gord")
        .eq("user_id", alunoId)
        .gte("data", desde)
        .order("data"),
      supabase
        .from("agua_registro")
        .select("data, ml")
        .eq("user_id", alunoId)
        .gte("data", desde),
      supabase
        .from("macros_meta")
        .select("meta_kcal")
        .eq("user_id", alunoId)
        .maybeSingle(),
      supabase
        .from("agua_meta")
        .select("meta_ml")
        .eq("user_id", alunoId)
        .maybeSingle(),
    ]).then(([m, a, mm, am]) => {
      if (!ativo) return;
      const dias = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return dataISO(d);
      });
      const porDia = dias.map((data) => {
        const regs = (m.data || []).filter((r) => r.data === data);
        const soma = (k) =>
          Math.round(regs.reduce((s, r) => s + Number(r[k] || 0), 0));
        return {
          data,
          kcal: soma("kcal"),
          prot: soma("prot"),
          carb: soma("carb"),
          gord: soma("gord"),
          agua: (a.data || [])
            .filter((r) => r.data === data)
            .reduce((s, r) => s + Number(r.ml || 0), 0),
          regs,
        };
      });
      setDados({
        porDia,
        metaKcal: mm.data?.meta_kcal || 2000,
        metaAgua: am.data?.meta_ml || 2500,
      });
    });
    return () => {
      ativo = false;
    };
  }, [alunoId]);

  if (!dados)
    return (
      <div style={{ color: "#7c879b", fontSize: 13, padding: 12 }}>
        Carregando...
      </div>
    );
  const hoje = dados.porDia[6];
  const barra = (v, meta, cor) => (
    <div
      style={{
        height: 6,
        background: "rgba(255,255,255,0.06)",
        borderRadius: 99,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.min(100, (v / meta) * 100)}%`,
          height: "100%",
          background: cor,
          borderRadius: 99,
        }}
      />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={card}>
        <div style={{ ...rotulo, marginBottom: 10 }}>HOJE</div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#f8fafc" }}>
              {hoje.kcal.toLocaleString("pt-BR")}{" "}
              <small style={{ fontSize: 12, color: "#7c879b" }}>
                / {dados.metaKcal} kcal
              </small>
            </div>
            {barra(hoje.kcal, dados.metaKcal, "#f97316")}
            <div style={{ fontSize: 11, color: "#7c879b", marginTop: 6 }}>
              P {hoje.prot}g · C {hoje.carb}g · G {hoje.gord}g
            </div>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#f8fafc" }}>
              {(hoje.agua / 1000).toLocaleString("pt-BR", {
                maximumFractionDigits: 2,
              })}{" "}
              <small style={{ fontSize: 12, color: "#7c879b" }}>
                / {dados.metaAgua / 1000} L
              </small>
            </div>
            {barra(hoje.agua, dados.metaAgua, "#3b82f6")}
          </div>
        </div>
        {hoje.regs.length > 0 && (
          <div
            style={{
              marginTop: 12,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {hoje.regs.map((r, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: "#cbd5e1",
                }}
              >
                <span>
                  {r.nome}
                  {r.gramas ? ` · ${r.gramas}g` : ""}
                </span>
                <span style={{ color: "#7c879b" }}>{r.kcal} kcal</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={card}>
        <div style={{ ...rotulo, marginBottom: 10 }}>ÚLTIMOS 7 DIAS</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr 1fr",
            gap: "6px 12px",
            fontSize: 12,
            alignItems: "center",
          }}
        >
          <span />
          <span style={{ color: "#7c879b" }}>kcal</span>
          <span style={{ color: "#7c879b" }}>água</span>
          {dados.porDia.map((d) => (
            <React.Fragment key={d.data}>
              <span style={{ color: "#cbd5e1", fontWeight: 700 }}>
                {fmtData(d.data)}
              </span>
              <div>
                <div style={{ color: "#f8fafc", marginBottom: 3 }}>
                  {d.kcal || "—"}
                </div>
                {barra(d.kcal, dados.metaKcal, "#f97316")}
              </div>
              <div>
                <div style={{ color: "#f8fafc", marginBottom: 3 }}>
                  {d.agua
                    ? `${(d.agua / 1000).toLocaleString("pt-BR")} L`
                    : "—"}
                </div>
                {barra(d.agua, dados.metaAgua, "#3b82f6")}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── Peso e medidas (leitura) ───────────────────────────
function CorpoAluno({ alunoId }) {
  const [dados, setDados] = useState(null);

  useEffect(() => {
    let ativo = true;
    Promise.all([
      supabase
        .from("peso_registro")
        .select("data, peso")
        .eq("user_id", alunoId)
        .order("data", { ascending: false })
        .limit(12),
      supabase
        .from("medidas_registro")
        .select("*")
        .eq("user_id", alunoId)
        .order("data", { ascending: false })
        .limit(2),
      supabase
        .from("perfil")
        .select("sexo, altura, peso")
        .eq("user_id", alunoId)
        .maybeSingle(),
    ]).then(([p, m, pf]) => {
      if (ativo)
        setDados({
          pesos: p.data || [],
          medidas: m.data || [],
          perfil: pf.data,
        });
    });
    return () => {
      ativo = false;
    };
  }, [alunoId]);

  if (!dados)
    return (
      <div style={{ color: "#7c879b", fontSize: 13, padding: 12 }}>
        Carregando...
      </div>
    );
  const atual = dados.pesos[0];
  const primeiro = dados.pesos[dados.pesos.length - 1];
  const diff =
    atual && primeiro && atual !== primeiro
      ? Number(atual.peso) - Number(primeiro.peso)
      : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={card}>
        <div style={{ ...rotulo, marginBottom: 8 }}>PESO</div>
        {atual ? (
          <>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#f8fafc" }}>
              {Number(atual.peso).toLocaleString("pt-BR")} kg{" "}
              {diff !== null && (
                <small
                  style={{
                    fontSize: 13,
                    color: diff <= 0 ? "#10b981" : "#f59e0b",
                  }}
                >
                  {diff > 0 ? "+" : ""}
                  {diff.toLocaleString("pt-BR", {
                    maximumFractionDigits: 1,
                  })}{" "}
                  kg desde {fmtData(primeiro.data)}
                </small>
              )}
            </div>
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                marginTop: 10,
              }}
            >
              {dados.pesos.slice(0, 8).map((r) => (
                <span
                  key={r.data}
                  style={{
                    fontSize: 11,
                    background: "#1f2533",
                    borderRadius: 8,
                    padding: "4px 8px",
                    color: "#cbd5e1",
                  }}
                >
                  {fmtData(r.data)} · {Number(r.peso).toLocaleString("pt-BR")}
                </span>
              ))}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: "#7c879b" }}>
            Nenhum peso registrado ainda.
          </div>
        )}
      </div>
      <div style={card}>
        <div style={{ ...rotulo, marginBottom: 4 }}>
          MEDIDAS{" "}
          {dados.medidas[0] ? `· ${fmtData(dados.medidas[0].data)}` : ""}
        </div>
        {dados.medidas[0] ? (
          <Manequim
            sexo={dados.perfil?.sexo}
            alturaCm={dados.perfil?.altura}
            medidas={dados.medidas[0]}
            anterior={dados.medidas[1] || null}
          />
        ) : (
          <div style={{ fontSize: 13, color: "#7c879b" }}>
            Nenhuma medida registrada ainda.
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────── Painel de um aluno ───────────────────────────
const ABAS = [
  ["treino", Dumbbell, "Treino"],
  ["dieta", Salad, "Dieta"],
  ["nutricao", Droplet, "Macros e água"],
  ["corpo", Scale, "Peso e medidas"],
];

function PainelAluno({ aluno, onVoltar }) {
  const [aba, setAba] = useState("treino");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={onVoltar}
          style={{ ...btn("#1f2533"), padding: 10 }}
          aria-label="Voltar"
        >
          <ChevronLeft size={18} />
        </button>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#f8fafc" }}>
            {aluno.outro_nome || "Aluno"}
          </div>
          <div style={{ fontSize: 12, color: "#7c879b" }}>
            Você está vendo e editando os dados deste aluno
          </div>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 6,
        }}
      >
        {ABAS.map((aba_) => {
          const [id, Icone, nome] = aba_;
          return (
            <button
              key={id}
              onClick={() => setAba(id)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "10px 4px",
                borderRadius: 14,
                border: `1px solid ${aba === id ? "#6366f1" : "rgba(255,255,255,0.07)"}`,
                background: aba === id ? "rgba(99,102,241,0.14)" : "#151a24",
                color: aba === id ? "#f8fafc" : "#7c879b",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Icone size={18} />
              {nome}
            </button>
          );
        })}
      </div>
      {aba === "treino" && <TreinoAluno alunoId={aluno.outro_id} />}
      {aba === "dieta" && <Dieta user={{ id: aluno.outro_id }} compact />}
      {aba === "nutricao" && <NutricaoAluno alunoId={aluno.outro_id} />}
      {aba === "corpo" && <CorpoAluno alunoId={aluno.outro_id} />}
    </div>
  );
}

// ─────────────────────────── Lista de alunos ───────────────────────────
export default function Alunos({ perfil, onAbrirPerfil }) {
  const [vinculos, setVinculos] = useState(null);
  const [erro, setErro] = useState("");
  const [aberto, setAberto] = useState(null);

  const carregar = useCallback(
    () =>
      meusVinculos()
        .then((lista) => {
          setVinculos(lista.filter((v) => v.papel === "profissional"));
          setErro("");
        })
        .catch((e) => {
          setErro(e.message);
          setVinculos([]);
        }),
    [],
  );

  useEffect(() => {
    carregar();
  }, [carregar]);

  const aceitar = async (v) => {
    try {
      await aceitarVinculo(v.id);
      toast(`${v.outro_nome || "Aluno"} adicionado! 💪`, "success");
      carregar();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const remover = async (v, pendente) => {
    if (
      !(await askConfirm(
        pendente
          ? `Recusar o pedido de ${v.outro_nome || "este aluno"}?`
          : `Remover ${v.outro_nome || "este aluno"}? Você deixa de ver os dados dele.`,
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

  if (aberto)
    return (
      <div className="home-section">
        <PainelAluno aluno={aberto} onVoltar={() => setAberto(null)} />
      </div>
    );

  const pendentes = (vinculos || []).filter((v) => v.status === "pendente");
  const ativos = (vinculos || []).filter((v) => v.status === "ativo");

  return (
    <div className="home-section">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Users size={22} color="#818cf8" />
        <div style={{ fontSize: 22, fontWeight: 800, color: "#f8fafc" }}>
          Alunos
        </div>
      </div>

      {perfil?.codigo_profissional && (
        <div
          style={{
            ...card,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={rotulo}>SEU CÓDIGO</div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: "0.12em",
                color: "#f8fafc",
              }}
            >
              {perfil.codigo_profissional}
            </div>
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#7c879b",
              maxWidth: 160,
              textAlign: "right",
            }}
          >
            O aluno digita esse código no Perfil dele
          </div>
        </div>
      )}

      {erro && (
        <div style={{ ...card, color: "#f59e0b", fontSize: 13 }}>
          ⚠️ {erro}
          {onAbrirPerfil && (
            <button
              onClick={onAbrirPerfil}
              style={{ ...btn("#1f2533"), marginTop: 10 }}
            >
              Abrir Perfil
            </button>
          )}
        </div>
      )}

      {vinculos === null && (
        <div style={{ color: "#7c879b", fontSize: 13 }}>Carregando...</div>
      )}

      {pendentes.length > 0 && (
        <div style={card}>
          <div style={{ ...rotulo, color: "#f59e0b", marginBottom: 10 }}>
            PEDIDOS ({pendentes.length})
          </div>
          {pendentes.map((v) => (
            <div
              key={v.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 0",
              }}
            >
              <div style={{ flex: 1, fontWeight: 700, color: "#f8fafc" }}>
                {v.outro_nome || "Aluno sem nome"}
              </div>
              <button onClick={() => aceitar(v)} style={btn("#10b981")}>
                <Check size={16} /> Aceitar
              </button>
              <button
                onClick={() => remover(v, true)}
                style={{ ...btn("#1f2533"), color: "#ef4444" }}
                aria-label="Recusar"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {vinculos && ativos.length === 0 && !erro && (
        <div style={{ ...card, color: "#7c879b", fontSize: 13 }}>
          Nenhum aluno ainda. Passe seu código para o aluno digitar em Perfil →
          Meu profissional.
        </div>
      )}

      {ativos.map((v) => (
        <div
          key={v.id}
          style={{
            ...card,
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
          }}
          onClick={() => setAberto(v)}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: "rgba(99,102,241,0.16)",
              display: "grid",
              placeItems: "center",
              color: "#a5b4fc",
              fontWeight: 800,
              fontSize: 16,
            }}
          >
            {(v.outro_nome || "?").trim().charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: "#f8fafc", fontSize: 15 }}>
              {v.outro_nome || "Aluno"}
            </div>
            <div style={{ fontSize: 11, color: "#7c879b" }}>
              Aluno desde {new Date(v.created_at).toLocaleDateString("pt-BR")}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              remover(v, false);
            }}
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
            }}
            aria-label="Remover aluno"
          >
            <X size={18} />
          </button>
        </div>
      ))}
    </div>
  );
}
