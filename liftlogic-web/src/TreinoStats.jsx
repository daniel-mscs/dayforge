import React from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const tooltipStyle = {
  background: "#151a24",
  border: "1px solid #ffffff0d",
  borderRadius: 8,
  color: "#f8fafc",
};

export default function TreinoStats({
  dashData,
  exercicios,
  prs,
  buscarEvolucao,
}) {
  return (
    <div className="dashboard-section">
      {/* Kcal por Treino */}
      <div className="dash-card">
        <h3 className="dash-title">🔥 Kcal por Treino</h3>
        {dashData.historico.length === 0 ? (
          <p className="empty-msg">Nenhum treino ainda.</p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={dashData.historico.slice(-10).map((t) => ({
                name: `${t.treino} ${new Date(t.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`,
                kcal: t.kcal || 0,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="kcal" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Volume por Treino */}
      <div className="dash-card">
        <h3 className="dash-title">📦 Volume por Treino</h3>
        {dashData.historico.length === 0 ? (
          <p className="empty-msg">Nenhum treino ainda.</p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={dashData.historico.slice(-10).map((t) => ({
                name: `${t.treino} ${new Date(t.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`,
                volume: t.volume_total || 0,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="volume" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Evolução de Carga */}
      <div className="dash-card">
        <h3 className="dash-title">📈 Evolução de Carga</h3>
        <select
          className="dash-select"
          onChange={(e) => buscarEvolucao(e.target.value)}
          defaultValue=""
        >
          <option value="" disabled>
            Selecione um exercício
          </option>
          {[...new Set(exercicios.map((ex) => ex.nome))].map((nome) => (
            <option key={nome} value={nome}>
              {nome}
            </option>
          ))}
        </select>
        {dashData.evolucao.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart
              data={dashData.evolucao.map((ex, i) => ({
                name: `#${i + 1}`,
                carga: ex.carga,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="carga"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: "#10b981", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="empty-msg" style={{ marginTop: 16 }}>
            Selecione um exercício acima 👆
          </p>
        )}
      </div>

      {/* Personal Records */}
      <div className="dash-card">
        <h3 className="dash-title">🏆 Personal Records (PR)</h3>
        {(() => {
          const exerciciosUnicos = [
            ...new Set(exercicios.map((ex) => ex.nome)),
          ];
          if (exerciciosUnicos.length === 0)
            return (
              <p className="empty-msg">Nenhum exercício cadastrado ainda.</p>
            );
          return (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginTop: 8,
              }}
            >
              {exerciciosUnicos.map((nome) => {
                const info = prs[nome];
                const exAtual = exercicios.find((e) => e.nome === nome);
                const isPR =
                  info?.pr &&
                  exAtual?.carga &&
                  Number(exAtual.carga) >= Number(info.pr);
                return (
                  <div
                    key={nome}
                    style={{
                      background: "#1f2533",
                      borderRadius: 10,
                      padding: "10px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderLeft: isPR
                        ? "3px solid #f59e0b"
                        : "3px solid transparent",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#f8fafc",
                        }}
                      >
                        {nome}
                      </div>
                      {info?.data && (
                        <div style={{ fontSize: 10, color: "#475569" }}>
                          {new Date(info.data).toLocaleDateString("pt-BR")}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: "#f59e0b",
                        }}
                      >
                        {info?.pr ? `${info.pr} kg` : "—"}
                      </div>
                      <div style={{ fontSize: 10, color: "#475569" }}>
                        recorde
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Tempo por Treino */}
      <div className="dash-card">
        <h3 className="dash-title">⏱️ Tempo por Treino</h3>
        {dashData.historico.length === 0 ? (
          <p className="empty-msg">Nenhum treino ainda.</p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart
              data={dashData.historico.slice(-10).map((t) => ({
                name: `${t.treino} ${new Date(t.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`,
                minutos: Math.round((t.tempo_segundos || 0) / 60),
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => [`${v} min`]}
              />
              <Line
                type="monotone"
                dataKey="minutos"
                stroke="#fbbf24"
                strokeWidth={2}
                dot={{ fill: "#fbbf24", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
