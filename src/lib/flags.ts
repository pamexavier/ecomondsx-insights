// Só libera a geração de laudo se VITE_LIBERAR_ANALISES === "true" no build.
export const LIBERAR_ANALISES = import.meta.env.VITE_LIBERAR_ANALISES === "true";