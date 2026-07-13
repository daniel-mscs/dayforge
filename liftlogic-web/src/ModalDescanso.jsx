import React from "react";

export default function ModalDescanso({
  modalDescanso,
  descanso,
  seriesFeitas,
  exerciciosFiltrados,
  formatarTempo,
  adicionarDescanso,
  cancelarDescanso,
  iniciarTimerDescanso,
  iniciarDescansoManual,
  inputDescanso,
  setInputDescanso,
  setModalDescanso,
  setSeriesFeitas,
  setConcluidos,
}) {
  if (!modalDescanso) return null;

  const supersetExs = modalDescanso.supersetExs || null;
  const supersetIdx = modalDescanso.supersetIdx ?? 0;
  const emSuperset = supersetExs && supersetExs.length > 1;
  const exAtual = emSuperset ? supersetExs[supersetIdx] : null;
  const ultimoDoSuperset = emSuperset && supersetIdx === supersetExs.length - 1;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9990,
        background: "rgba(0,0,0,0.88)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <style>{`
        @keyframes modalSlideUp { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes timerPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
      `}</style>
      <div
        style={{
          background: "#1a1d21",
          borderRadius: 24,
          padding: "28px 22px 22px",
          width: "92%",
          maxWidth: 380,
          textAlign: "center",
          border: "1px solid #ffffff0d",
          boxShadow: "0 24px 60px rgba(0,0,0,0.8)",
          animation: "modalSlideUp 0.3s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: emSuperset
              ? "rgba(249,115,22,0.12)"
              : "rgba(99,102,241,0.12)",
            border: `1px solid ${emSuperset ? "rgba(249,115,22,0.25)" : "rgba(99,102,241,0.25)"}`,
            borderRadius: 99,
            padding: "4px 14px",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.12em",
            color: emSuperset ? "#f97316" : "#818cf8",
            marginBottom: 10,
            textTransform: "uppercase",
          }}
        >
          {emSuperset
            ? `🔗 Superset ${supersetIdx + 1}/${supersetExs.length}`
            : "Exercício em andamento"}
        </div>

        {emSuperset && (
          <div
            style={{
              display: "flex",
              gap: 6,
              justifyContent: "center",
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            {supersetExs.map((e, i) => (
              <div
                key={e.id}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: 8,
                  background:
                    i === supersetIdx
                      ? "#f97316"
                      : i < supersetIdx
                        ? "#f9731633"
                        : "#1e293b",
                  color:
                    i === supersetIdx
                      ? "#fff"
                      : i < supersetIdx
                        ? "#f97316"
                        : "#475569",
                  border: `1px solid ${i === supersetIdx ? "#f97316" : "#ffffff0d"}`,
                }}
              >
                {e.nome}
              </div>
            ))}
          </div>
        )}
        <div
          style={{
            fontSize: 20,
            fontWeight: 900,
            color: "#f1f5f9",
            marginBottom: 4,
            lineHeight: 1.2,
          }}
        >
          {modalDescanso.nomeEx}
        </div>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
          <span style={{ color: "#94a3b8", fontWeight: 600 }}>
            {modalDescanso.carga}kg
          </span>
          <span style={{ margin: "0 8px", color: "#334155" }}>·</span>
          <span style={{ color: "#94a3b8", fontWeight: 600 }}>
            {modalDescanso.repeticoes} reps
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 10,
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          {Array.from({ length: modalDescanso.totalSeries }).map((_, i) => {
            const feita = i < modalDescanso.serieAtual;
            return (
              <div
                key={i}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: feita
                    ? "linear-gradient(135deg,#6366f1,#4f46e5)"
                    : "rgba(255,255,255,0.04)",
                  border: `2px solid ${feita ? "#6366f1" : "rgba(255,255,255,0.12)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 800,
                  color: feita ? "#fff" : "#64748b",
                  boxShadow: feita
                    ? "0 4px 14px rgba(99,102,241,0.45)"
                    : "none",
                  transition: "all 0.3s",
                }}
              >
                {feita ? "✓" : i + 1}
              </div>
            );
          })}
        </div>

        {descanso > 0 ? (
          <>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.14em",
                color: "#334155",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Descanso
            </div>
            <div
              style={{
                fontSize: 72,
                fontWeight: 900,
                lineHeight: 1,
                marginBottom: 4,
                color: descanso <= 10 ? "#ef4444" : "#6366f1",
                fontVariantNumeric: "tabular-nums",
                animation:
                  descanso <= 10 ? "timerPulse 0.8s ease infinite" : "none",
                transition: "color 0.3s",
              }}
            >
              {formatarTempo(descanso)}
            </div>
            {descanso <= 10 && (
              <div
                style={{
                  fontSize: 12,
                  color: "#ef444488",
                  marginBottom: 10,
                  fontWeight: 600,
                }}
              >
                Prepare-se! ⚡
              </div>
            )}
            <div
              style={{
                display: "flex",
                gap: 6,
                justifyContent: "center",
                marginBottom: 14,
              }}
            >
              {[30, 60, 90].map((s) => (
                <button
                  key={s}
                  onClick={() => adicionarDescanso(s)}
                  style={{
                    background: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: 10,
                    color: "#94a3b8",
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "7px 14px",
                    cursor: "pointer",
                  }}
                >
                  +{s}s
                </button>
              ))}
              <button
                onClick={cancelarDescanso}
                style={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: 10,
                  color: "#ef4444",
                  fontSize: 12,
                  padding: "7px 12px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          </>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.14em",
                color: "#334155",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              Iniciar descanso
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "center",
                marginBottom: 10,
              }}
            >
              {[30, 60, 90].map((s) => (
                <button
                  key={s}
                  onClick={() => iniciarTimerDescanso(s)}
                  style={{
                    background: "rgba(99,102,241,0.12)",
                    border: "1px solid rgba(99,102,241,0.35)",
                    borderRadius: 12,
                    color: "#a5b4fc",
                    fontSize: 15,
                    fontWeight: 800,
                    padding: "12px 20px",
                    cursor: "pointer",
                  }}
                >
                  {s}s
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="number"
                inputMode="numeric"
                placeholder="Outro (seg)"
                value={inputDescanso}
                onChange={(e) => setInputDescanso(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") iniciarDescansoManual();
                }}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10,
                  color: "#f1f5f9",
                  padding: "11px 14px",
                  fontSize: 14,
                  outline: "none",
                }}
              />
              <button
                onClick={iniciarDescansoManual}
                style={{
                  background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                  border: "none",
                  borderRadius: 10,
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: 800,
                  padding: "11px 20px",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(99,102,241,0.4)",
                }}
              >
                ▶
              </button>
            </div>
          </div>
        )}

        {modalDescanso.serieAtual < modalDescanso.totalSeries && (
          <button
            onClick={() => {
              const novasSeries = modalDescanso.serieAtual + 1;
              setSeriesFeitas((prev) => ({
                ...prev,
                [modalDescanso.exId]: novasSeries,
              }));
              if (novasSeries >= modalDescanso.totalSeries)
                setConcluidos((prev) => ({
                  ...prev,
                  [modalDescanso.exId]: true,
                }));

              if (emSuperset && !ultimoDoSuperset) {
                const proximo = supersetExs[supersetIdx + 1];
                setModalDescanso((prev) => ({
                  ...prev,
                  exId: proximo.id,
                  nomeEx: proximo.nome,
                  carga: proximo.carga,
                  repeticoes: proximo.repeticoes,
                  totalSeries: Number(proximo.series),
                  serieAtual: seriesFeitas[proximo.id] || 0,
                  supersetIdx: supersetIdx + 1,
                }));
              } else {
                cancelarDescanso();
                setModalDescanso((prev) => ({
                  ...prev,
                  serieAtual: novasSeries,
                  ...(emSuperset && {
                    exId: supersetExs[0].id,
                    nomeEx: supersetExs[0].nome,
                    carga: supersetExs[0].carga,
                    repeticoes: supersetExs[0].repeticoes,
                    totalSeries: Number(supersetExs[0].series),
                    serieAtual: novasSeries,
                    supersetIdx: 0,
                  }),
                }));
              }
            }}
            style={{
              width: "100%",
              background: "linear-gradient(135deg,#10b981,#059669)",
              border: "none",
              borderRadius: 14,
              color: "#fff",
              fontSize: 15,
              fontWeight: 800,
              padding: "15px 0",
              cursor: "pointer",
              marginBottom: 10,
              boxShadow: "0 4px 20px rgba(16,185,129,0.35)",
            }}
          >
            ✅ Série feita
          </button>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => {
              cancelarDescanso();
              setModalDescanso(null);
            }}
            style={{
              flex: 1,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              color: "#475569",
              fontSize: 13,
              fontWeight: 600,
              padding: "13px 0",
              cursor: "pointer",
            }}
          >
            ← Fechar
          </button>
          <button
            onClick={() => {
              const idx = exerciciosFiltrados.findIndex(
                (e) => e.id === modalDescanso.exId,
              );
              const proximo = exerciciosFiltrados[idx + 1];
              cancelarDescanso();
              if (proximo) {
                setModalDescanso({
                  exId: proximo.id,
                  nomeEx: proximo.nome,
                  serieAtual: seriesFeitas[proximo.id] || 0,
                  totalSeries: Number(proximo.series),
                  descansoSeg: Number(proximo.descanso_segundos) || 90,
                  carga: proximo.carga,
                  repeticoes: proximo.repeticoes,
                });
              } else {
                setModalDescanso(null);
              }
            }}
            style={{
              flex: 1,
              background: "rgba(99,102,241,0.1)",
              border: "1px solid rgba(99,102,241,0.25)",
              borderRadius: 12,
              color: "#818cf8",
              fontSize: 13,
              fontWeight: 700,
              padding: "13px 0",
              cursor: "pointer",
            }}
          >
            Próximo →
          </button>
        </div>
      </div>
    </div>
  );
}
