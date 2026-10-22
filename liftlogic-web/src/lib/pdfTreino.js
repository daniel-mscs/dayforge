const PAGE_W = 595;
const PAGE_H = 842;
const MARGEM = 34;
const GAP_COL = 16;
const COL_W = (PAGE_W - MARGEM * 2 - GAP_COL) / 2;
const TOPO_PRIMEIRA = 90;
const TOPO = MARGEM + 6;
const FUNDO = PAGE_H - MARGEM - 10;
const ALT_EX = 27; // altura de cada exercício (2 linhas)

function textoReps(ex) {
  if (ex.reps_variam && ex.reps_por_serie?.length)
    return ex.reps_por_serie.join("/");
  return ex.repeticoes || "-";
}

function textoCarga(ex) {
  if (ex.carga_variam && ex.carga_por_serie?.length)
    return `${ex.carga_por_serie.join("-")}kg`;
  return ex.carga ? `${ex.carga}kg` : "";
}

// Monta o PDF do treino atual: um bloco por treino (A, B, C...), 2 colunas.
export async function gerarPdfTreino({ exercicios, divisao }) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const letras = [
    ...new Set([
      ...(divisao ? divisao.split("") : []),
      ...exercicios.map((e) => e.treino),
    ]),
  ].filter(Boolean);

  let pagina = 1;
  let col = 0;
  let y = TOPO_PRIMEIRA;
  const xCol = () => MARGEM + col * (COL_W + GAP_COL);

  const proximaColuna = () => {
    if (col === 0) col = 1;
    else {
      doc.addPage();
      pagina++;
      col = 0;
    }
    y = pagina === 1 ? TOPO_PRIMEIRA : TOPO;
  };

  // ── título ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30);
  doc.text("DayForge — Meu treino", MARGEM, MARGEM + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  const hoje = new Date().toLocaleDateString("pt-BR");
  doc.text(
    `${divisao ? `Divisão ${divisao} · ` : ""}${exercicios.length} exercícios · gerado em ${hoje}`,
    MARGEM,
    MARGEM + 28,
  );
  doc.setDrawColor(210);
  doc.line(MARGEM, MARGEM + 38, PAGE_W - MARGEM, MARGEM + 38);

  letras.forEach((letra) => {
    const lista = exercicios
      .filter((e) => e.treino === letra)
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
    if (lista.length === 0) return;

    const altBloco = 26 + lista.length * ALT_EX + 10;
    const alturaColuna = FUNDO - (pagina === 1 ? TOPO_PRIMEIRA : TOPO);
    // mantém o treino inteiro junto, se couber numa coluna
    if (altBloco <= alturaColuna && y + altBloco > FUNDO) proximaColuna();
    else if (y + 26 + ALT_EX > FUNDO) proximaColuna();

    const cabecalho = (sufixo = "") => {
      const x = xCol();
      doc.setFillColor(238, 240, 255);
      doc.roundedRect(x, y - 12, COL_W, 18, 3, 3, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 110);
      doc.text(`TREINO ${letra}${sufixo}`, x + 6, y + 1);
      const grupos = [
        ...new Set(lista.map((e) => e.grupo_muscular).filter(Boolean)),
      ].join(" · ");
      if (grupos && !sufixo) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(120);
        const cortado = doc.splitTextToSize(grupos, COL_W - 70)[0];
        doc.text(cortado, x + COL_W - 6, y + 1, { align: "right" });
      }
      y += 20;
    };
    cabecalho();

    lista.forEach((ex, i) => {
      if (y + ALT_EX > FUNDO) {
        proximaColuna();
        cabecalho(" (cont.)");
      }
      const x = xCol() + 6;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(25);
      const nome = doc.splitTextToSize(`${i + 1}. ${ex.nome}`, COL_W - 14)[0];
      doc.text(nome, x, y);

      const partes = [`${ex.series || "-"}x${textoReps(ex)}`];
      const carga = textoCarga(ex);
      if (carga) partes.push(carga);
      if (ex.descanso_segundos) partes.push(`desc ${ex.descanso_segundos}s`);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(110);
      doc.text(partes.join("  ·  "), x + 10, y + 11);

      // caixinhas pra marcar cada série feita
      const nSeries = Math.min(Number(ex.series) || 0, 8);
      doc.setDrawColor(150);
      doc.setLineWidth(0.7);
      for (let s = 0; s < nSeries; s++) {
        doc.rect(xCol() + COL_W - 10 - (nSeries - s) * 11, y + 4, 8, 8);
      }
      y += ALT_EX;
    });
    y += 10;
  });

  const nomeArquivo = `treino-${new Date().toISOString().split("T")[0]}.pdf`;
  return { doc, nomeArquivo };
}
