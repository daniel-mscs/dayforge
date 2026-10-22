import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";

const PAGE_W = 595;
const PAGE_H = 842;
const MARGEM = 34;
const GAP_COL = 16;
const COL_W = (PAGE_W - MARGEM * 2 - GAP_COL) / 2;
const TOPO_PRIMEIRA = 96; // espaço do título na 1ª página
const TOPO = MARGEM + 6;
const FUNDO = PAGE_H - MARGEM;

const LINHA = 11.5;

function fmtCurta(dataISO) {
  const [, m, d] = dataISO.split("-");
  return `${d}/${m}`;
}

// Monta o PDF compacto: 2 colunas por página, vários dias por página.
export async function gerarPdfRotina({
  diasOrdenados,
  tarefas,
  periodos,
  labelData,
}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  let pagina = 1;
  let col = 0;
  let y = TOPO_PRIMEIRA;

  const xCol = () => MARGEM + col * (COL_W + GAP_COL);
  const topoAtual = () => (pagina === 1 ? TOPO_PRIMEIRA : TOPO);

  const proximaColuna = () => {
    if (col === 0) {
      col = 1;
    } else {
      doc.addPage();
      pagina++;
      col = 0;
    }
    y = topoAtual();
  };

  // garante espaço; se não couber, vai pra próxima coluna/página
  const garantir = (altura) => {
    if (y + altura > FUNDO) proximaColuna();
  };

  // ── título (só na 1ª página) ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30);
  doc.text("DayForge — Rotina", MARGEM, MARGEM + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  const primeiro = diasOrdenados[0].data;
  const ultimo = diasOrdenados[diasOrdenados.length - 1].data;
  doc.text(
    diasOrdenados.length === 1
      ? `${fmtCurta(primeiro)} · ${diasOrdenados.length} dia`
      : `${fmtCurta(primeiro)} a ${fmtCurta(ultimo)} · ${diasOrdenados.length} dias`,
    MARGEM,
    MARGEM + 28,
  );
  doc.setDrawColor(210);
  doc.line(MARGEM, MARGEM + 38, PAGE_W - MARGEM, MARGEM + 38);

  diasOrdenados.forEach((dia) => {
    const porPeriodo = periodos
      .map((p) => ({ nome: p, itens: tarefas[dia.id]?.[p] || [] }))
      .filter((p) => p.itens.length > 0);

    // cabeçalho do dia + pelo menos o 1º período/1ª tarefa juntos
    garantir(30 + 14 + LINHA * 2);

    const x = xCol();
    doc.setFillColor(238, 240, 255);
    doc.roundedRect(x, y - 11, COL_W, 17, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(40, 40, 110);
    doc.text(`${labelData(dia.data)} · ${fmtCurta(dia.data)}`, x + 6, y + 1);
    y += 18;

    if (porPeriodo.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text("Sem tarefas.", x + 6, y + 2);
      y += 18;
      return;
    }

    porPeriodo.forEach(({ nome, itens }) => {
      garantir(14 + LINHA);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(120);
      doc.text(nome.toUpperCase(), xCol() + 6, y);
      y += 11;

      itens.forEach((t) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const linhas = doc.splitTextToSize(t.texto, COL_W - 24);
        if (y + LINHA * linhas.length > FUNDO) {
          proximaColuna();
          // repete o rótulo do período ao continuar na nova coluna
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(120);
          doc.text(`${nome.toUpperCase()} (cont.)`, xCol() + 6, y);
          y += 11;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
        }
        const xi = xCol() + 6;
        // caixinha
        doc.setDrawColor(130);
        doc.setLineWidth(0.7);
        doc.rect(xi, y - 7, 7, 7);
        if (t.concluida) {
          doc.setDrawColor(16, 150, 100);
          doc.setLineWidth(1.2);
          doc.line(xi + 1.3, y - 3.3, xi + 3, y - 1.4);
          doc.line(xi + 3, y - 1.4, xi + 6.2, y - 6);
          doc.setLineWidth(0.7);
        }
        doc.setTextColor(t.concluida ? 150 : 25);
        doc.text(linhas, xi + 12, y);
        y += LINHA * linhas.length;
      });
      y += 5;
    });
    y += 8;
  });

  const nomeArquivo =
    diasOrdenados.length === 1
      ? `rotina-${primeiro}.pdf`
      : `rotina-${primeiro}_a_${ultimo}.pdf`;
  return { doc, nomeArquivo };
}

// Salva o PDF (Documentos/DayForge no celular, Downloads no navegador)
// e depois abre o compartilhar. Retorna onde salvou.
export async function salvarECompartilhar(doc, nomeArquivo) {
  const blob = doc.output("blob");
  let salvoEm = null;

  if (Capacitor.isNativePlatform()) {
    try {
      const dataUri = doc.output("datauristring");
      const base64 = dataUri.split(",")[1];
      await Filesystem.writeFile({
        path: `DayForge/${nomeArquivo}`,
        data: base64,
        directory: Directory.Documents,
        recursive: true,
      });
      salvoEm = `Documentos/DayForge/${nomeArquivo}`;
    } catch (e) {
      salvoEm = null;
    }
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeArquivo;
    a.click();
    URL.revokeObjectURL(url);
    salvoEm = `Downloads/${nomeArquivo}`;
  }

  // compartilhar (WhatsApp etc.) — no navegador o download já basta
  if (Capacitor.isNativePlatform() || !salvoEm) {
    const file = new File([blob], nomeArquivo, { type: "application/pdf" });
    try {
      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: "Minha rotina — DayForge",
          files: [file],
        });
      }
    } catch (e) {
      if (e?.name !== "AbortError") throw e;
    }
  }
  return salvoEm;
}
