import { MapPin, Zap, Droplets, Sun, Home, Layers } from "lucide-react";
import { formatarNumero, formatarMoeda } from "@/utils/calculosBioclimaticos";

function extrairNumeroObjeto(obj: any, chaves: string[], regexFallback?: RegExp): number | null {
  if (!obj || typeof obj !== "object") return null;
  for (const k of chaves) {
    const val = Number(obj[k]);
    if (Number.isFinite(val) && val > 0) return val;
  }
  if (regexFallback) {
    for (const [k, v] of Object.entries(obj)) {
      if (regexFallback.test(k)) {
        const val = Number(v);
        if (Number.isFinite(val) && val > 0) return val;
      }
    }
  }
  return null;
}

function guiaRapidoFachada(fachada?: string) {
  const f = String(fachada || "Sul").toLowerCase();
  if (f.includes("norte")) {
    return {
      insolacao: "Sol constante no inverno e alto no verão",
      comodos: "Sala de Estar, Living, Varanda Gourmet e Dormitórios",
      material: "Brise horizontal fixo + Alvenaria com isolamento leve",
    };
  }
  if (f.includes("leste") || f.includes("nascente")) {
    return {
      insolacao: "Sol ameno e saudável no período da manhã",
      comodos: "Dormitórios, Suíte Master, Copa e Home Office",
      material: "Veneziana integrada ou brise móvel + Vidro incolor/laminado",
    };
  }
  if (f.includes("oeste") || f.includes("poente")) {
    return {
      insolacao: "Sol intenso à tarde com alto ganho térmico",
      comodos: "Áreas de serviço, Circulação, Banheiros ou Sala com brise",
      material: "Brise vertical + Parede de alta inércia/EPS + Vidro controle solar",
    };
  }
  return {
    insolacao: "Luz natural difusa estável; pouco sol direto no inverno",
    comodos: "Home Office / Estúdio (sem reflexo), Cozinha, Closet e Lavabo",
    material: "Parede com baixa transmitância (EPS/Bloco celular) + Esquadria estanque",
  };
}

export default function CapaLaudo({
  nomeProjeto,
  endereco,
  fachada,
  zona,
  subzona,
  nota,
  resumoScore,
  fonteSolar,
  clima,
  economiaAgua,
  economiaSolar,
  potencialFotovoltaico,
}: any) {
  const valorBruto =
    typeof nota === "number" ? nota : Number(String(nota ?? "").replace(",", "."));
  const temNota = Number.isFinite(valorBruto) && valorBruto > 0;
  const escala10 = temNota && valorBruto <= 10;
  const percentualRadial = temNota
    ? Math.max(0, Math.min(100, escala10 ? valorBruto * 10 : valorBruto))
    : 70;

  const r = 32;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ - (percentualRadial / 100) * circ;

  // Extração inteligente (compatível com qualquer nome de chave do calculosBioclimaticos.ts)
  const kwhAno = extrairNumeroObjeto(
    potencialFotovoltaico,
    ["geracaoAnualMaximaKwh", "geracaoAnualKwh", "kwhAno", "energiaAnualKwh"],
    /kwh|geracao/i,
  );
  const qtdPaineis = extrairNumeroObjeto(
    potencialFotovoltaico,
    [
      "quantidadeMaximaPaineis",
      "maximoPaineis",
      "paineisMaximos",
      "quantidadePaineis",
      "paineis",
      "numPaineis",
      "maxArrayPanelsCount",
    ],
    /paine|panel/i,
  );
  const areaSolarM2 = extrairNumeroObjeto(
    potencialFotovoltaico,
    ["areaMaximaM2", "areaTelhadoM2", "areaUtilM2", "areaM2", "maxArrayAreaMeters2"],
    /area/i,
  );
  const reaisSolarAno = extrairNumeroObjeto(
    economiaSolar,
    ["economiaAnualReais", "economiaAnual", "valorAnual", "economiaReais"],
    /econom|reais|valor|anual/i,
  );

  const aguaAproveitavelM3 =
    extrairNumeroObjeto(
      economiaAgua,
      [
        "volumeAproveitavelM3",
        "m3Aproveitaveis",
        "aproveitavelM3",
        "volumeUtilM3",
        "volumeAnualM3",
        "m3Ano",
      ],
      /aproveit|util|m3/i,
    ) ??
    (() => {
      const litros = extrairNumeroObjeto(
        economiaAgua,
        ["volumeAnualLitros", "litrosAproveitaveis", "litrosAno"],
        /litro/i,
      );
      return litros ? litros / 1000 : null;
    })();

  const aguaCaptadaM3 = extrairNumeroObjeto(
    economiaAgua,
    ["volumeCaptadoM3", "m3Captados", "captadoM3", "volumeTotalM3", "totalCaptadoM3"],
    /captad|total|bruto/i,
  );

  const reaisAguaAno = extrairNumeroObjeto(
    economiaAgua,
    ["economiaAnualReais", "economiaAnual", "valorAnual", "economiaReais"],
    /econom|reais|valor/i,
  );

  const guia = guiaRapidoFachada(fachada);

  return (
    <div
      id="pdf-page-1"
      className="pdf-page bg-white w-full aspect-[210/297] rounded-md shadow-sm border border-[#DCE4DF] overflow-hidden relative text-[#18221F] p-8 flex flex-col justify-between"
    >
      <div>
        {/* Cabeçalho */}
        <header className="flex items-center justify-between border-b border-[#DCE4DF] pb-2.5 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="size-6 rounded-md bg-[#255841] flex items-center justify-center text-white font-black text-[10px]">
              VX
            </div>
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#3A7D5E] leading-none">
                VECTOR-X · DIAGNÓSTICO BIOCLIMÁTICO
              </p>
              <p className="text-[10px] font-semibold text-[#18221F] mt-0.5">
                {nomeProjeto || "Laudo de Viabilidade"}
              </p>
            </div>
          </div>
          <span className="rounded-md bg-[#EBF3EE] border border-[#3A7D5E]/25 px-2.5 py-1 text-[9px] font-mono font-bold text-[#255841]">
            PÁG. 01 / 05
          </span>
        </header>

        {/* Identificação + Score Radial */}
        <div className="rounded-2xl border border-[#DCE4DF] bg-[#F7FAF8] p-5 mb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <span className="inline-block rounded-full bg-[#255841] px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-white">
                LAUDO DE VIABILIDADE BIOCLIMÁTICA
              </span>
              <h1 className="text-2xl font-black tracking-tight text-[#18221F] mt-1.5">
                {nomeProjeto || "Imóvel Analisado"}
              </h1>
              <p className="text-xs text-[#52605B] mt-1 flex items-center gap-1.5">
                <MapPin className="size-3.5 text-[#3A7D5E] shrink-0" />
                <span className="truncate">{endereco}</span>
              </p>
            </div>

            <div className="flex items-center gap-3 bg-white border border-[#DCE4DF] rounded-2xl px-4 py-2.5 shrink-0">
              <div className="relative size-16 flex items-center justify-center">
                <svg className="size-16 -rotate-90" viewBox="0 0 76 76">
                  <circle
                    cx="38"
                    cy="38"
                    r={r}
                    stroke="#E2E8F0"
                    strokeWidth="6"
                    fill="none"
                  />
                  <circle
                    cx="38"
                    cy="38"
                    r={r}
                    stroke="#255841"
                    strokeWidth="6"
                    strokeDasharray={circ}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-black text-[#18221F] leading-none">
                    {temNota ? formatarNumero(valorBruto, escala10 ? 1 : 0) : "—"}
                  </span>
                  <span className="text-[7px] font-mono text-[#7A8883]">
                    {escala10 ? "/10" : "/100"}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[8px] font-bold uppercase tracking-wider text-[#7A8883]">
                  SCORE BIOCLIMÁTICO
                </p>
                <p className="text-sm font-black text-[#255841] mt-0.5">
                  Zona {zona}
                  {subzona}
                </p>
                <p className="text-[9px] text-[#52605B]">Fachada {fachada}</p>
              </div>
            </div>
          </div>

          <div className="mt-3.5 pt-3 border-t border-[#DCE4DF]">
            <p className="text-xs text-[#18221F] leading-relaxed font-medium">
              {resumoScore ||
                `Imóvel localizado na Zona Bioclimática ${zona}${subzona}, com fachada analisada voltada para ${fachada}.`}
            </p>
          </div>
        </div>

        {/* Clima Local (4 Colunas Limpas) */}
        <div className="mb-4">
          <p className="text-[9px] font-black uppercase tracking-wider text-[#52605B] mb-2">
            CLIMA LOCAL · ZONA BIOCLIMÁTICA {zona}
            {subzona}
          </p>
          <div className="grid grid-cols-4 gap-2.5">
            <div className="rounded-xl border border-[#DCE4DF] bg-white p-3">
              <p className="text-[8px] font-bold uppercase text-[#7A8883]">
                Temperatura média
              </p>
              <p className="text-base font-black text-[#18221F] mt-0.5">
                {clima?.tempMedia != null
                  ? `${formatarNumero(clima.tempMedia, 1)} °C`
                  : "N/D"}
              </p>
            </div>
            <div className="rounded-xl border border-[#DCE4DF] bg-white p-3">
              <p className="text-[8px] font-bold uppercase text-[#7A8883]">
                Mínima e máxima
              </p>
              <p className="text-base font-black text-[#18221F] mt-0.5">
                {clima?.tempMin != null && clima?.tempMax != null
                  ? `${formatarNumero(clima.tempMin, 0)} a ${formatarNumero(
                      clima.tempMax,
                      0,
                    )} °C`
                  : "Conforme ZB"}
              </p>
            </div>
            <div className="rounded-xl border border-[#DCE4DF] bg-white p-3">
              <p className="text-[8px] font-bold uppercase text-[#7A8883]">
                Umidade média
              </p>
              <p className="text-base font-black text-[#18221F] mt-0.5">
                {clima?.umidade != null
                  ? `${formatarNumero(clima.umidade, 0)} %`
                  : "N/D"}
              </p>
            </div>
            <div className="rounded-xl border border-[#DCE4DF] bg-white p-3">
              <p className="text-[8px] font-bold uppercase text-[#7A8883]">
                Radiação global
              </p>
              <p className="text-base font-black text-[#18221F] mt-0.5">
                {clima?.radiacao != null
                  ? `${formatarNumero(clima.radiacao, 0)} W/m²`
                  : "N/D"}
              </p>
            </div>
          </div>
        </div>

        {/* Síntese Prática da Fachada (Sol + Cômodos + Materiais) */}
        <div className="mb-4">
          <p className="text-[9px] font-black uppercase tracking-wider text-[#52605B] mb-2">
            LEITURA RÁPIDA DA FACHADA {String(fachada || "").toUpperCase()}
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-xl border border-[#DCE4DF] bg-[#F7FAF8] p-3">
              <p className="text-[8.5px] font-black uppercase text-[#255841] flex items-center gap-1">
                <Sun className="size-3" /> Perfil de Sol
              </p>
              <p className="text-[10.5px] font-semibold text-[#18221F] mt-1 leading-snug">
                {guia.insolacao}
              </p>
            </div>
            <div className="rounded-xl border border-[#DCE4DF] bg-[#F7FAF8] p-3">
              <p className="text-[8.5px] font-black uppercase text-[#255841] flex items-center gap-1">
                <Home className="size-3" /> Cômodos Ideais
              </p>
              <p className="text-[10.5px] font-semibold text-[#18221F] mt-1 leading-snug">
                {guia.comodos}
              </p>
            </div>
            <div className="rounded-xl border border-[#DCE4DF] bg-[#F7FAF8] p-3">
              <p className="text-[8.5px] font-black uppercase text-[#255841] flex items-center gap-1">
                <Layers className="size-3" /> Envoltória Sugerida
              </p>
              <p className="text-[10.5px] font-semibold text-[#18221F] mt-1 leading-snug">
                {guia.material}
              </p>
            </div>
          </div>
        </div>

        {/* Recursos do Imóvel: Fotovoltaico e Água da Chuva (Compactos, sem espaço vazio) */}
        <div>
          <p className="text-[9px] font-black uppercase tracking-wider text-[#52605B] mb-2">
            POTENCIAL DE RECURSOS DO IMÓVEL (TELHADO)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border-t-4 border-t-amber-500 border border-[#DCE4DF] bg-[#FBF9F3] p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9.5px] font-black uppercase text-amber-900 flex items-center gap-1.5">
                  <Zap className="size-3.5 text-amber-600" /> Energia Solar
                  Fotovoltaica
                </span>
              </div>
              <p className="text-2xl font-black text-[#C25E00] tabular-nums">
                {kwhAno ? formatarNumero(kwhAno, 0) : "—"}{" "}
                <span className="text-xs font-bold text-[#52605B]">
                  kWh/ano
                </span>
              </p>
              <p className="text-[10px] text-[#52605B] mt-1">
                {qtdPaineis ? `${qtdPaineis} painéis solares` : "Geração solar estimada"}
                {areaSolarM2 ? ` · ${formatarNumero(areaSolarM2, 0)} m² úteis` : ""}
              </p>
              {reaisSolarAno && (
                <p className="text-[10px] font-bold text-[#255841] mt-2 pt-2 border-t border-amber-200/70">
                  Economia estimada: {formatarMoeda(reaisSolarAno)}/ano
                </p>
              )}
            </div>

            <div className="rounded-xl border-t-4 border-t-sky-600 border border-[#DCE4DF] bg-[#F3F8FA] p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9.5px] font-black uppercase text-sky-900 flex items-center gap-1.5">
                  <Droplets className="size-3.5 text-sky-600" /> Captação de Água
                  da Chuva
                </span>
              </div>
              <p className="text-2xl font-black text-[#026AA2] tabular-nums">
                {aguaAproveitavelM3
                  ? formatarNumero(aguaAproveitavelM3, 0)
                  : aguaCaptadaM3
                    ? formatarNumero(aguaCaptadaM3, 0)
                    : "—"}{" "}
                <span className="text-xs font-bold text-[#52605B]">
                  m³/ano aproveitáveis
                </span>
              </p>
              <p className="text-[10px] text-[#52605B] mt-1">
                {aguaCaptadaM3
                  ? `O telhado capta ${formatarNumero(aguaCaptadaM3, 0)} m³/ano; o excedente escoa`
                  : "Aproveitamento pluvial para usos não potáveis"}
              </p>
              {reaisAguaAno && (
                <p className="text-[10px] font-bold text-[#255841] mt-2 pt-2 border-t border-sky-200/70">
                  Economia estimada: {formatarMoeda(reaisAguaAno)}/ano
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="pt-2.5 border-t border-[#DCE4DF] flex items-center justify-between text-[8px] text-[#7A8883]">
        <span>
          Vector-X · Fonte solar: {fonteSolar || "Trajetória + DSM"}
        </span>
        <span className="font-mono font-semibold">
          {new Date().toLocaleDateString("pt-BR")}
        </span>
      </footer>
    </div>
  );
}