import React from "react";

// Manequim que muda de forma conforme as medidas (circunferências em cm).
// A largura de frente vem da circunferência: tronco ≈ elipse mais larga que
// funda (largura ≈ C/π × 1,17); braços e pernas ≈ cilindros (largura ≈ C/π).
// Tudo na escala da altura do perfil, para manter a proporção real.

const CORES = {
  biceps: "#f59e0b",
  peito: "#6366f1",
  cintura: "#10b981",
  quadril: "#ec4899",
  coxa: "#f97316",
  panturrilha: "#38bdf8",
};

const LABELS = {
  biceps: "Bíceps",
  peito: "Peito",
  cintura: "Cintura",
  quadril: "Quadril",
  coxa: "Coxa",
  panturrilha: "Panturrilha",
};

const PADRAO = {
  M: { peito: 100, cintura: 86, quadril: 98, biceps: 33, coxa: 56, panturrilha: 37 },
  F: { peito: 90, cintura: 72, quadril: 100, biceps: 28, coxa: 56, panturrilha: 35 },
};

const TOPO = 40; // y do topo da cabeça
const ALTURA_PX = 540; // da cabeça aos pés
const CX = 200; // centro do corpo

// Curva suave passando pelos pontos (Catmull-Rom → Bézier)
function curva(pts) {
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

// Contorno fechado: lado esquerdo de cima pra baixo + lado direito espelhado de baixo pra cima
function contornoSimetrico(ladoEsq) {
  const dir = [...ladoEsq].reverse().map(([x, y]) => [2 * CX - x, y]);
  return curva([...ladoEsq, ...dir]) + " Z";
}

function geometria(m, sexo, alturaCm) {
  const s = ALTURA_PX / alturaCm; // px por cm
  const y = (f) => TOPO + f * ALTURA_PX;
  const larg = (c, fator = 1) => (c / Math.PI) * fator * s; // largura de frente em px
  const fem = sexo === "F";

  const wPeito = larg(m.peito, 1.17);
  const wCintura = larg(m.cintura, 1.15);
  const wQuadril = larg(m.quadril, 1.15);
  const wOmbro = wPeito * (fem ? 1.02 : 1.14);
  const wPescoco = (fem ? 10 : 12.5) * s;
  const wBraco = larg(m.biceps);
  const wCoxa = larg(m.coxa);
  const wPant = larg(m.panturrilha);
  const wJoelho = Math.min(wCoxa, wPant) * 0.92;
  const wTornozelo = 7 * s;

  const yQuadril = y(0.5);
  const yCintura = y(fem ? 0.385 : 0.4);

  // Tronco + pescoço (lado esquerdo)
  const tronco = contornoSimetrico([
    [CX - wPescoco / 2, y(0.125)],
    [CX - wPescoco / 2, y(0.155)],
    [CX - wOmbro / 2, y(0.185)],
    [CX - wOmbro / 2 + 2, y(0.215)],
    [CX - wPeito / 2, y(0.275)],
    [CX - wCintura / 2, yCintura],
    [CX - wQuadril / 2, yQuadril],
    [CX - wQuadril / 2 + 1, y(0.535)],
    [CX - 3, y(0.535)],
  ]);

  // Pernas: centro de cada perna a 1/4 do quadril
  const perna = (lado) => {
    const c = CX + lado * (wQuadril / 4 + 1);
    const ext = (w) => c + lado * (w / 2); // borda de fora
    const int = (w) => c - lado * (w / 2); // borda de dentro
    const fora = [
      [ext(wQuadril / 2), y(0.52)],
      [ext(wCoxa), y(0.6)],
      [ext(wJoelho), y(0.72)],
      [ext(wPant), y(0.8)],
      [ext(wTornozelo), y(0.95)],
      [ext(wTornozelo) + lado * 4 * s, y(1)],
    ];
    const dentro = [
      [int(wTornozelo), y(1)],
      [int(wTornozelo), y(0.95)],
      [int(wPant * 0.9), y(0.8)],
      [int(wJoelho), y(0.72)],
      [int(wCoxa * 0.95), y(0.6)],
      [c - lado * (wQuadril / 4 - 1), y(0.53)],
    ];
    return curva([...fora, ...dentro]) + " Z";
  };

  // Braços pendurados ao lado do tronco
  const braco = (lado) => {
    const xOmbro = CX + lado * (wOmbro / 2);
    const c = xOmbro + lado * (wBraco / 2 - 3 * s);
    const ext = (w, dx = 0) => c + dx * lado + lado * (w / 2);
    const int = (w, dx = 0) => c + dx * lado - lado * (w / 2);
    const desloc = Math.max(0, (wQuadril - wOmbro) / 2) + 2 * s; // afasta se o quadril for mais largo
    const fora = [
      [xOmbro - lado * 2 * s, y(0.18)],
      [ext(wBraco * 1.05), y(0.215)],
      [ext(wBraco), y(0.29)],
      [ext(wBraco * 0.78, desloc * 0.5), y(0.38)],
      [ext(wBraco * 0.62, desloc), y(0.47)],
      [ext(wBraco * 0.66, desloc), y(0.53)],
    ];
    const dentro = [
      [int(wBraco * 0.5, desloc), y(0.555)],
      [int(wBraco * 0.55, desloc), y(0.47)],
      [int(wBraco * 0.72, desloc * 0.5), y(0.38)],
      [int(wBraco * 0.92), y(0.29)],
      [int(wBraco * 0.9), y(0.23)],
    ];
    return curva([...fora, ...dentro]) + " Z";
  };

  const cabeca = { cx: CX, cy: y(0.065), rx: 9.5 * s, ry: 12 * s };

  // Onde ficam as marcações de cada medida (ponto no corpo)
  const marcas = {
    peito: [CX + wPeito / 2, y(0.275)],
    cintura: [CX + wCintura / 2, yCintura],
    quadril: [CX + wQuadril / 2, yQuadril],
    biceps: [CX - wOmbro / 2 - wBraco / 2, y(0.29)],
    coxa: [CX - wQuadril / 4 - 1 - wCoxa / 2, y(0.6)],
    panturrilha: [CX - wQuadril / 4 - 1 - wPant / 2, y(0.8)],
  };

  return {
    // ordem de desenho: braços e pernas atrás, tronco na frente
    corpo: [braco(-1), braco(1), perna(-1), perna(1), tronco],
    cabeca,
    marcas,
  };
}

export default function Manequim({ sexo, alturaCm, medidas, anterior, projetando }) {
  const sx = sexo === "F" ? "F" : "M";
  const altura = Number(alturaCm) > 120 ? Number(alturaCm) : sx === "F" ? 163 : 175;

  const completar = (m) => {
    const r = { ...PADRAO[sx] };
    for (const k of Object.keys(r)) if (Number(m?.[k]) > 0) r[k] = Number(m[k]);
    return r;
  };

  const atual = geometria(completar(medidas), sx, altura);
  const fantasma = anterior ? geometria(completar(anterior), sx, altura) : null;

  const lados = { peito: 1, cintura: 1, quadril: 1, biceps: -1, coxa: -1, panturrilha: -1 };
  const linhaY = { peito: 0, cintura: 0, quadril: 0, biceps: 0, coxa: 0, panturrilha: 0 };

  return (
    <div style={{ position: "relative", width: "100%", display: "flex", justifyContent: "center" }}>
      <svg viewBox="0 0 400 600" width="100%" style={{ maxWidth: 360, display: "block" }}>
        <defs>
          <linearGradient id="mq-corpo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4c4a9e" />
            <stop offset="0.55" stopColor="#2f3277" />
            <stop offset="1" stopColor="#13504c" />
          </linearGradient>
          <pattern id="mq-grade" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="1" />
          </pattern>
          <filter id="mq-brilho" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x="0" y="0" width="400" height="600" fill="url(#mq-grade)" />

        {/* Silhueta da medição anterior (tracejada) */}
        {fantasma && (
          <g fill="none" stroke="#94a3b8" strokeOpacity="0.45" strokeWidth="1.2" strokeDasharray="4 3">
            {fantasma.corpo.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
        )}

        {/* Corpo atual */}
        <g filter="url(#mq-brilho)">
          {atual.corpo.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="url(#mq-corpo)"
              stroke="#a5b4fc"
              strokeWidth="1.4"
              strokeLinejoin="round"
              style={{ transition: "d 0.5s ease" }}
            />
          ))}
          <ellipse {...atual.cabeca} fill="url(#mq-corpo)" stroke="#a5b4fc" strokeWidth="1.4" />
        </g>

        {/* Marcações */}
        {Object.entries(atual.marcas).map(([k, [x, yy]]) => {
          const lado = lados[k];
          const val = Number(medidas?.[k]) > 0 ? Number(medidas[k]) : null;
          const cor = CORES[k];
          const xFim = lado === 1 ? 392 : 8;
          const yTxt = yy + linhaY[k];
          return (
            <g key={k}>
              <line x1={x} y1={yy} x2={xFim + (lado === 1 ? -78 : 78)} y2={yTxt} stroke={cor} strokeWidth="1" strokeDasharray="3 2" opacity="0.8" />
              <circle cx={x} cy={yy} r="4.5" fill={cor} />
              <circle cx={x} cy={yy} r="1.8" fill="#fff" />
              <text x={xFim} y={yTxt - 4} fill={cor} fontSize="9" fontWeight="800" textAnchor={lado === 1 ? "end" : "start"} letterSpacing="0.06em">
                {LABELS[k].toUpperCase()}
              </text>
              <text x={xFim} y={yTxt + 10} fill={val ? "#f8fafc" : "#475569"} fontSize="12" fontWeight="800" textAnchor={lado === 1 ? "end" : "start"}>
                {val ? `${val} cm` : "— cm"}
              </text>
            </g>
          );
        })}

        {projetando && (
          <g>
            <rect x="130" y="6" width="140" height="22" rx="11" fill="#f59e0b22" stroke="#f59e0b66" />
            <text x="200" y="21" textAnchor="middle" fill="#fbbf24" fontSize="10.5" fontWeight="800" letterSpacing="0.05em">
              PROJEÇÃO AO VIVO
            </text>
          </g>
        )}
      </svg>
      {fantasma && (
        <div style={{ position: "absolute", bottom: 6, left: 0, right: 0, textAlign: "center", fontSize: 11, color: "#7c879b" }}>
          <span style={{ borderBottom: "1px dashed #94a3b8", marginRight: 6, display: "inline-block", width: 18, verticalAlign: 3 }} />
          medição anterior
        </div>
      )}
    </div>
  );
}
