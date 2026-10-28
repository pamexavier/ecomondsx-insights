import type { RefObject } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

export const gerarPDFPaginado = async (
  containerRef: RefObject<HTMLDivElement | null>,
  nomeArquivo: string,
) => {
  if (!containerRef.current) return;
  const toastId = toast.loading("Renderizando laudo em alta resolução (A4)...");

  try {
    const paginas = containerRef.current.querySelectorAll<HTMLElement>(".pdf-page");
    if (paginas.length === 0) throw new Error("Nenhuma página formatada encontrada.");

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    for (let i = 0; i < paginas.length; i += 1) {
      const dataUrl = await toPng(paginas[i], {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });

      if (i > 0) pdf.addPage();
      pdf.addImage(dataUrl, "PNG", 0, 0, 210, 297);
    }

    pdf.save(`${nomeArquivo}.pdf`);
    toast.success("Laudo exportado com sucesso!", { id: toastId });
  } catch (error) {
    console.error(error);
    toast.error("Erro ao gerar PDF paginado.", { id: toastId });
  }
};
