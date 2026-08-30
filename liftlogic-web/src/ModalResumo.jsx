import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function ModalResumo({
  modalResumo,
  treinoAtivo,
  tempoTotal,
  exercicios,
  concluidos,
  confirmarFinalizarTreino,
  setModalResumo,
  inicioTreinoRef,
  timerRef,
  setTempoTotal,
  formatarTempo,
}) {
  if (!modalResumo) return null;

  const filtrados = exercicios.filter(
    (ex) => ex.treino === (modalResumo.treinoIniciado || treinoAtivo),
  );

  const dadosGrafico = filtrados.map((ex) => ({
    name: ex.nome.length > 10 ? ex.nome.substring(0, 10) + "…" : ex.nome,
    volume:
      Number(ex.series || 0) *
      Number(ex.repeticoes || 0) *
      Number(ex.carga || 0),
    carga: Number(ex.carga || 0),
    concluido: !!concluidos[ex.id],
  }));

  const volumePorGrupo = {};
  filtrados.forEach((ex) => {
    const grupo = ex.grupo_muscular || "Geral";
    const vol =
      Number(ex.series || 0) *
      Number(ex.repeticoes || 0) *
      Number(ex.carga || 0);
    volumePorGrupo[grupo] = (volumePorGrupo[grupo] || 0) + vol;
  });
  const gruposOrdenados = Object.entries(volumePorGrupo).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <div className="modal-overlay">
      <div
        className="modal-resumo"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
      >
        <h2>
          🏁 Treino {modalResumo.treinoIniciado || treinoAtivo} Concluído!
        </h2>

        {/* Stats principais */}
        <div className="stats-grid" style={{ marginBottom: 16 }}>
          <div className="stat-card">
            <span>TEMPO</span>
            <strong>{formatarTempo(tempoTotal)}</strong>
          </div>
          <div className="stat-card">
            <span>EXERCÍCIOS</span>
            <strong>
              {modalResumo.concluídosCount}/{modalResumo.total}
            </strong>
            <small>concluídos</small>
          </div>
          {modalResumo.kcal > 0 && (
            <div className="stat-card">
              <span>KCAL</span>
              <strong>{modalResumo.kcal}</strong>
              <small>estimado</small>
            </div>
          )}
          {modalResumo.maisHeavy && (
            <div className="stat-card">
              <span>+ PESADO</span>
              <strong>{modalResumo.maisHeavy.carga} kg</strong>
              <small>{modalResumo.maisHeavy.nome}</small>
            </div>
          )}
        </div>

        {/* Volume por grupo muscular */}
        {gruposOrdenados.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 10,
                color: "#64748b",
                fontWeight: 800,
                letterSpacing: "0.08em",
                marginBottom: 10,
              }}
            >
              VOLUME POR GRUPO MUSCULAR
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {gruposOrdenados.map(([grupo, vol]) => {
                const maxVol = gruposOrdenados[0][1] || 1;
                return (
                  <div key={grupo}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        color: "#cbd5e1",
                        marginBottom: 3,
                      }}
                    >
                      <span>{grupo}</span>
                      <span style={{ color: "#818cf8", fontWeight: 700 }}>
                        {vol.toLocaleString("pt-BR")} kg
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        borderRadius: 99,
                        background: "#ffffff0d",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${(vol / maxVol) * 100}%`,
                          background: "#6366f1",
                          borderRadius: 99,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Gráfico de cargas */}
        {filtrados.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 10,
                color: "#64748b",
                fontWeight: 800,
                letterSpacing: "0.08em",
                marginBottom: 10,
              }}
            >
              VOLUME POR EXERCÍCIO (séries × reps × kg)
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={dadosGrafico}
                margin={{ top: 4, right: 4, left: -20, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#64748b", fontSize: 9 }}
                  angle={-35}
                  textAnchor="end"
                />
                <YAxis tick={{ fill: "#64748b", fontSize: 9 }} />
                <Tooltip
                  contentStyle={{
                    background: "#1a1d21",
                    border: "1px solid #ffffff0d",
                    borderRadius: 8,
                    color: "#f8fafc",
                    fontSize: 12,
                  }}
                  formatter={(v, n) => [
                    v,
                    n === "volume" ? "Volume (kg total)" : "Carga (kg)",
                  ]}
                />
                <Bar dataKey="volume" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Lista de exercícios */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 10,
              color: "#64748b",
              fontWeight: 800,
              letterSpacing: "0.08em",
              marginBottom: 10,
            }}
          >
            EXERCÍCIOS DO TREINO
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtrados.map((ex) => (
              <div
                key={ex.id}
                style={{
                  background: "#24282d",
                  borderRadius: 8,
                  padding: "8px 12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderLeft: `3px solid ${concluidos[ex.id] ? "#10b981" : "#475569"}`,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: concluidos[ex.id] ? "#10b981" : "#f8fafc",
                    }}
                  >
                    {concluidos[ex.id] ? "✅" : "⭕"} {ex.nome}
                  </div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>
                    {ex.series}x{ex.repeticoes} · {ex.carga}kg
                  </div>
                </div>
                <div
                  style={{ fontSize: 12, fontWeight: 700, color: "#6366f1" }}
                >
                  {Number(ex.series) * Number(ex.repeticoes) * Number(ex.carga)}{" "}
                  vol
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button
            className="btn-stop-workout"
            onClick={confirmarFinalizarTreino}
          >
            💾 Salvar Treino
          </button>
          <button
            className="btn-cancel-rest"
            onClick={() => {
              setModalResumo(null);
              const agora = inicioTreinoRef.current || Date.now();
              timerRef.current = setInterval(() => {
                const elapsed = Math.floor((Date.now() - agora) / 1000);
                setTempoTotal(elapsed);
              }, 1000);
            }}
          >
            Continuar Treinando
          </button>
        </div>
      </div>
    </div>
  );
}
