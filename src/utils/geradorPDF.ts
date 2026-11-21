import type { RefObject } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

export const gerarPDFPaginado = async (
  containerRef: RefObject<HTMLDivElement | null>,
  nomeArquivo: string,
) => {
  if (!containerRef.current) return;
  const toastId = toast.loading(
    "Renderizando laudo executivo em alta resolução (A4)...",
  );

  try {
    if ("fonts" in document) {
      await (document as Document & { fonts: FontFaceSet }).fonts.ready;
    }

    const paginas =
      containerRef.current.querySelectorAll<HTMLElement>(".pdf-page");
    if (paginas.length === 0) {
      throw new Error("Nenhuma página formatada (.pdf-page) encontrada.");
    }

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    for (let i = 0; i < paginas.length; i += 1) {
      const pagina = paginas[i];
      const larguraReal = pagina.offsetWidth || 794;
      const alturaReal = pagina.offsetHeight || Math.round(larguraReal * (297 / 210));

      const dataUrl = await toPng(pagina, {
        quality: 1,
        pixelRatio: 2.5,
        cacheBust: true,
        backgroundColor: "#ffffff",
        width: larguraReal,
        height: alturaReal,
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
          borderRadius: "0px",
          boxShadow: "none",
        },
      });

      if (i > 0) pdf.addPage();
      pdf.addImage(dataUrl, "PNG", 0, 0, 210, 297, undefined, "FAST");
    }

    pdf.save(`${nomeArquivo}.pdf`);
    toast.success("Laudo técnico exportado com sucesso!", { id: toastId });
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    toast.error("Erro ao gerar PDF paginado.", { id: toastId });
  }
};