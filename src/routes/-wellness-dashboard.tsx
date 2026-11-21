import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { LIBERAR_ANALISES } from "@/lib/flags";
import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  MapPin,
  CloudRain,
  Thermometer,
  ShieldCheck,
  Cpu,
  Download,
  Target,
  Compass,
  Sun,
  Layers,
  Satellite,
  Ruler,
  Building2,
  ArrowLeft,
  Sparkles,
  X,
  Zap,
  Droplets,
  Play,
  Pause,
  Eye,
  FileText,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import {
  formatarNumero,
  formatarMoeda,
  calcularEconomiaAgua,
  calcularEconomiaSolar,
  normalizarPotencialFotovoltaico,
  obterAreaTelhadoComOrigem,
} from "@/utils/calculosBioclimaticos";
import { gerarPDFPaginado } from "@/utils/geradorPDF";

export const Route = createFileRoute("/wellness-analise-solar")({
  beforeLoad: () => {
    if (!LIBERAR_ANALISES) throw redirect({ to: "/" });
  },
  validateSearch: (search: Record<string, unknown>) => ({
    obraId:
      typeof search.obraId === "string" && search.obraId.trim()
        ? search.obraId.trim()
        : undefined,
  }),
  head: () => ({
    meta: [{ title: "Vector-X · Inteligência de Zoneamento Bioclimático" }],
  }),
  component: VectorZoneamento,
});

const N8N_WEBHOOK_URL =
  import.meta.env.VITE_N8N_WEBHOOK_URL ||
  "http://localhost:5678/webhook-test/analise-solar";
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const TABELA_PROPRIA = "analises_vectorx";

let googleMapsLoadPromise: Promise<any> | null = null;

function carregarGoogleMaps(apiKey: string) {
  if (!apiKey)
    return Promise.reject(
      new Error(
        "Chave do Google Maps ausente. Configure VITE_GOOGLE_MAPS_API_KEY.",
      ),
    );
  const googleMaps = (window as any).google?.maps;
  if (googleMaps?.importLibrary) return Promise.resolve(googleMaps);
  if (!googleMapsLoadPromise) {
    googleMapsLoadPromise = new Promise((resolve, reject) => {
      const callbackName = `__vectorMapsReady${Date.now()}`;
      const script = document.createElement("script");
      (window as any)[callbackName] = () => {
        resolve((window as any).google.maps);
        delete (window as any)[callbackName];
      };
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
        apiKey,
      )}&v=weekly&loading=async&libraries=maps,marker,places&callback=${callbackName}`;
      script.async = true;
      script.onerror = () =>
        reject(new Error("Não foi possível carregar o Google Maps."));
      document.head.appendChild(script);
    });
  }
  return googleMapsLoadPromise;
}

type PontoMapa = { lat: number; lng: number };

// ── AUXILIARES DE CARTA SOLAR E SOMBREAMENTO ──
const ROSA_NOME = [
  "Norte",
  "Norte-nordeste",
  "Nordeste",
  "Leste-nordeste",
  "Leste",
  "Leste-sudeste",
  "Sudeste",
  "Sul-sudeste",
  "Sul",
  "Sul-sudoeste",
  "Sudoeste",
  "Oeste-sudoeste",
  "Oeste",
  "Oeste-noroeste",
  "Noroeste",
  "Norte-noroeste",
];
const ROSA_SIGLA = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "L",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSO",
  "SO",
  "OSO",
  "O",
  "ONO",
  "NO",
  "NNO",
];

const norm360 = (g: number) => ((g % 360) + 360) % 360;
const diffAngular = (a: number, b: number) =>
  Math.abs(((a - b + 540) % 360) - 180);
const semAcento = (s: string) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

function nomeOrientacao(az: number) {
  const i = Math.round(norm360(az) / 22.5) % 16;
  return { nome: ROSA_NOME[i], sigla: ROSA_SIGLA[i] };
}

const AZ_NOMINAL: Record<string, number> = {
  norte: 0,
  nordeste: 45,
  leste: 90,
  sudeste: 135,
  sul: 180,
  sudoeste: 225,
  oeste: 270,
  noroeste: 315,
};
const azimuteNominal = (fachada: string) => AZ_NOMINAL[semAcento(fachada)] ?? 180;

const ROTULO_ESTACAO: Record<string, string> = {
  Verao: "Verão",
  Outono: "Outono",
  Inverno: "Inverno",
  Primavera: "Primavera",
};

const NO_ESTACAO: Record<string, string> = {
  Verao: "no verão",
  Outono: "no outono",
  Inverno: "no inverno",
  Primavera: "na primavera",
};

const anguloParaXY = (cx: number, cy: number, r: number, azimuteDeg: number) => {
  const rad = (azimuteDeg * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
};
const elevacaoParaRaio = (elevacao: number, raioMax: number) =>
  (raioMax * (90 - Math.max(elevacao, 0))) / 90;

function gerarPathSetorFachadaAz(
  az: number,
  cx: number,
  cy: number,
  raio: number,
) {
  const p = (g: number) => {
    const r = (g * Math.PI) / 180;
    return { x: cx + raio * Math.sin(r), y: cy - raio * Math.cos(r) };
  };
  const a = p(az - 90);
  const b = p(az + 90);
  return `M ${cx} ${cy} L ${a.x} ${a.y} A ${raio} ${raio} 0 0 1 ${b.x} ${b.y} Z`;
}

function gerarPathMascara(
  perfil: any[],
  azReal: number,
  cx: number,
  cy: number,
  raio: number,
) {
  const pts = (perfil || [])
    .filter((p) => !p?.referenciaNaoEncontrada && typeof p?.azimute === "number")
    .map((p) => ({
      az: p.azimute as number,
      off: ((p.azimute - azReal + 540) % 360) - 180,
      ang: Math.max(0, Number(p.anguloObstrucaoGraus) || 0),
    }))
    .filter((p) => Math.abs(p.off) <= 91)
    .sort((a, b) => a.off - b.off);
  if (pts.length < 2 || pts.every((p) => p.ang <= 0)) return "";

  const interno = pts.map((p) =>
    anguloParaXY(cx, cy, elevacaoParaRaio(p.ang, raio), p.az),
  );
  const externo = pts.map((p) => anguloParaXY(cx, cy, raio, p.az)).reverse();
  const f = (q: { x: number; y: number }) =>
    `${q.x.toFixed(1)} ${q.y.toFixed(1)}`;

  const pathInterno = interno
    .slice(1)
    .map((q) => "L " + f(q))
    .join(" ");
  const pathExterno = externo.map((q) => "L " + f(q)).join(" ");
  return `M ${f(interno[0])} ${pathInterno} ${pathExterno} Z`;
}

type EstadoPonto = "sol" | "bloqueado" | "sem";
function estadoDoPonto(status?: string): EstadoPonto {
  if (status === "Pleno Sol" || status === "Meia Sombra") return "sol";
  const s = (status || "").toLowerCase();
  if (s.includes("obstru") || s.includes("vegeta")) return "bloqueado";
  return "sem";
}

function horasComSol(horarios: any): number[] {
  return Object.entries(horarios || {})
    .filter(([, d]: [string, any]) => estadoDoPonto(d?.status) === "sol")
    .map(([h]) => parseFloat(h.replace("h", "")))
    .filter((h) => !Number.isNaN(h))
    .sort((a, b) => a - b);
}

function resumoSolarGerado(
  calculo: any,
  rotulo: string,
  percentual: number | null,
): string {
  const ordem = ["Verao", "Outono", "Inverno", "Primavera"];
  const dados = ordem.map((e) => ({ e, horas: horasComSol(calculo?.[e]) }));
  const total = dados.reduce((s, d) => s + d.horas.length, 0);
  if (!total)
    return `Fachada voltada para ${rotulo}: nenhum dos horários avaliados recebe sol direto.`;

  const principal = [...dados].sort(
    (a, b) => b.horas.length - a.horas.length,
  )[0];
  const sem = dados
    .filter((d) => d.horas.length === 0)
    .map((d) => NO_ESTACAO[d.e]);
  const hs = principal.horas;
  const manha = hs.some((h) => h <= 9);
  const tarde = hs.some((h) => h >= 15);
  const meio = hs.some((h) => h > 9 && h < 15);
  const periodo = meio
    ? "incluindo o meio do dia"
    : manha && tarde
      ? "nas primeiras e últimas horas do dia"
      : manha
        ? "pela manhã"
        : "à tarde";

  return (
    `Fachada voltada para ${rotulo}: o sol direto chega sobretudo ${NO_ESTACAO[principal.e]} ` +
    `(${hs.length} ${hs.length === 1 ? "horário" : "horários"}, ${periodo})` +
    (sem.length ? ` e não aparece ${sem.join(" nem ")}` : "") +
    "." +
    (percentual != null
      ? ` No conjunto, ${percentual}% dos horários de luz solar têm sol direto.`
      : "")
  );
}

/* ────────────────────────────────────────────────────────────────────────
   CABEÇALHO E RODAPÉ TÉCNICO PADRONIZADOS PARA TODAS AS PÁGINAS A4
──────────────────────────────────────────────────────────────────────── */

function RunningHeader({
  projeto,
  secao,
  pagina,
  total = 5,
}: {
  projeto: string;
  secao: string;
  pagina: number;
  total?: number;
}) {
  return (
    <header className="flex items-center justify-between border-b border-[#DCE4DF] pb-2.5 mb-4 shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="size-6 rounded-md bg-[#255841] flex items-center justify-center text-white font-black text-[10px] tracking-tighter">
          VX
        </div>
        <div>
          <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#3A7D5E] leading-none">
            VECTOR-X · ENGENHARIA BIOCLIMÁTICA
          </p>
          <p className="text-[10px] font-semibold text-[#18221F] mt-0.5 truncate max-w-[300px]">
            {projeto || "Diagnóstico Bioclimático"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-right">
        <div>
          <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#52605B]">
            {secao}
          </p>
          <p className="text-[8px] font-mono text-[#7A8883]">
            ABNT NBR 15220-3 · NBR 15575
          </p>
        </div>
        <span className="rounded-md bg-[#EBF3EE] border border-[#3A7D5E]/25 px-2 py-1 text-[9px] font-mono font-bold text-[#255841]">
          PÁG. 0{pagina} / 0{total}
        </span>
      </div>
    </header>
  );
}

function RunningFooter({ nota }: { nota?: string }) {
  return (
    <footer className="mt-auto pt-2.5 border-t border-[#DCE4DF] flex items-center justify-between text-[8px] text-[#7A8883] shrink-0">
      <span className="font-medium truncate max-w-[440px]">
        {nota ||
          "Laudo Técnico Gerado via Motor Bioclimático Vector-X · Base INMET + Satélite DSM"}
      </span>
      <span className="font-mono font-semibold text-[#52605B]">
        EMISSÃO: {new Date().toLocaleDateString("pt-BR")}
      </span>
    </footer>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   SELETOR DE LOCALIZAÇÃO (GOOGLE MAPS)
──────────────────────────────────────────────────────────────────────── */

function SeletorLocalizacao({
  apiKey,
  logradouro,
  numero,
  cidade,
  uf,
  ponto,
  onEnderecoChange,
  onPontoChange,
  onLocalSelecionado,
}: {
  apiKey: string;
  logradouro: string;
  numero: string;
  cidade: string;
  uf: string;
  ponto: PontoMapa | null;
  onEnderecoChange: (value: string) => void;
  onPontoChange: (point: PontoMapa) => void;
  onLocalSelecionado: (local: {
    ponto: PontoMapa;
    placeId: string;
    componentes: any[];
    endereco: string;
  }) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mapaRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const centroMapaRef = useRef<PontoMapa | null>(null);
  const pontoRef = useRef(ponto);
  const moverPinoRef = useRef<
    ((position: PontoMapa, notificar?: boolean) => void) | null
  >(null);
  const callbacksRef = useRef({ onPontoChange, onLocalSelecionado });
  const [mapaAberto, setMapaAberto] = useState(false);
  const [erroMapa, setErroMapa] = useState("");

  pontoRef.current = ponto;

  useEffect(() => {
    callbacksRef.current = { onPontoChange, onLocalSelecionado };
  }, [onPontoChange, onLocalSelecionado]);

  useEffect(() => {
    let cancelado = false;
    let listenerPlace: any;

    async function inicializarAutocomplete() {
      try {
        const googleMaps = await carregarGoogleMaps(apiKey);
        const placesLibrary = await googleMaps.importLibrary("places");
        if (cancelado || !inputRef.current) return;
        const autocomplete = new placesLibrary.Autocomplete(inputRef.current, {
          fields: [
            "geometry",
            "place_id",
            "address_components",
            "formatted_address",
          ],
          componentRestrictions: { country: "br" },
        });
        listenerPlace = autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          const location = place.geometry?.location;
          if (!location) {
            setErroMapa(
              "Esse resultado não tem um ponto no mapa. Escolha outra sugestão ou marque o prédio manualmente.",
            );
            return;
          }
          setErroMapa("");
          const coordenadas = { lat: location.lat(), lng: location.lng() };
          centroMapaRef.current = coordenadas;
          callbacksRef.current.onLocalSelecionado({
            ponto: coordenadas,
            placeId: place.place_id || "",
            componentes: place.address_components || [],
            endereco: place.formatted_address || inputRef.current?.value || "",
          });
          setMapaAberto(true);
        });
      } catch (error) {
        if (!cancelado)
          setErroMapa(
            error instanceof Error
              ? error.message
              : "Falha ao carregar o Google Maps.",
          );
      }
    }

    void inicializarAutocomplete();
    return () => {
      cancelado = true;
      listenerPlace?.remove();
    };
  }, [apiKey]);

  useEffect(() => {
    if (!mapaAberto) return;
    let cancelado = false;
    let listenerClique: any;
    let listenerArraste: any;

    async function inicializarMapa() {
      try {
        const googleMaps = await carregarGoogleMaps(apiKey);
        const [mapsLibrary, markerLibrary] = await Promise.all([
          googleMaps.importLibrary("maps"),
          googleMaps.importLibrary("marker"),
        ]);
        if (cancelado || !mapaRef.current) return;

        const mapa = new mapsLibrary.Map(mapaRef.current, {
          center: pontoRef.current ||
            centroMapaRef.current || { lat: -30.0079461, lng: -51.1853043 },
          zoom: 19,
          mapTypeId: "hybrid",
          mapId: "DEMO_MAP_ID",
          streetViewControl: false,
          mapTypeControl: true,
          fullscreenControl: true,
        });
        mapInstanceRef.current = mapa;

        const moverPino = (position: PontoMapa, notificar = true) => {
          const coordenadas = {
            lat: Number(position.lat.toFixed(7)),
            lng: Number(position.lng.toFixed(7)),
          };
          centroMapaRef.current = coordenadas;
          if (!markerRef.current) {
            markerRef.current = new markerLibrary.AdvancedMarkerElement({
              map: mapa,
              position: coordenadas,
              gmpDraggable: true,
              title: "Local do imóvel; arraste para ajustar",
            });
            listenerArraste = markerRef.current.addListener("dragend", () => {
              const posicao = markerRef.current.position;
              if (posicao)
                moverPino({
                  lat:
                    typeof posicao.lat === "function"
                      ? posicao.lat()
                      : Number(posicao.lat),
                  lng:
                    typeof posicao.lng === "function"
                      ? posicao.lng()
                      : Number(posicao.lng),
                });
            });
          } else {
            markerRef.current.position = coordenadas;
            markerRef.current.map = mapa;
          }
          mapa.panTo(coordenadas);
          if (notificar) callbacksRef.current.onPontoChange(coordenadas);
        };
        moverPinoRef.current = moverPino;

        if (!pontoRef.current && logradouro) {
          const textoBusca = `${logradouro}${numero ? ", " + numero : ""}${
            cidade ? " - " + cidade : ""
          }${uf ? " - " + uf : ""}`;
          new googleMaps.Geocoder().geocode(
            { address: textoBusca, componentRestrictions: { country: "BR" } },
            (resultados: any[], status: string) => {
              if (status === "OK" && resultados?.[0]?.geometry?.location) {
                const location = resultados[0].geometry.location;
                const coordenadas = {
                  lat: location.lat(),
                  lng: location.lng(),
                };
                centroMapaRef.current = coordenadas;
                mapa.panTo(location);
                mapa.setZoom(19);
                moverPino(coordenadas, true);
              }
            },
          );
        } else if (pontoRef.current) {
          moverPino(pontoRef.current, false);
        }

        listenerClique = mapa.addListener("click", (evento: any) => {
          if (evento.latLng)
            moverPino({
              lat: evento.latLng.lat(),
              lng: evento.latLng.lng(),
            });
        });
      } catch (error) {
        if (!cancelado)
          setErroMapa(
            error instanceof Error
              ? error.message
              : "Falha ao carregar o Google Maps.",
          );
      }
    }

    void inicializarMapa();
    return () => {
      cancelado = true;
      listenerClique?.remove();
      listenerArraste?.remove();
      if (markerRef.current) markerRef.current.map = null;
      markerRef.current = null;
      mapInstanceRef.current = null;
      moverPinoRef.current = null;
    };
  }, [apiKey, mapaAberto]);

  useEffect(() => {
    const mapa = mapInstanceRef.current;
    if (!mapa) return;
    if (ponto) {
      centroMapaRef.current = { lat: ponto.lat, lng: ponto.lng };
      moverPinoRef.current?.(ponto, false);
    } else {
      if (markerRef.current) markerRef.current.map = null;
      markerRef.current = null;
    }
  }, [ponto?.lat, ponto?.lng, mapaAberto]);

  useEffect(() => {
    if (!ponto) centroMapaRef.current = null;
  }, [logradouro, ponto?.lat, ponto?.lng]);

  const centralizarEnderecoDigitado = () => {
    const texto = `${logradouro}${numero ? ", " + numero : ""}${
      cidade ? " - " + cidade : ""
    }${uf ? " - " + uf : ""}`.trim();
    const googleMaps = (window as any).google?.maps;
    if (!texto || ponto || !googleMaps) return;
    new googleMaps.Geocoder().geocode(
      { address: texto, componentRestrictions: { country: "BR" } },
      (resultados: any[], status: string) => {
        if (status === "OK" && resultados?.[0]?.geometry?.location) {
          const location = resultados[0].geometry.location;
          centroMapaRef.current = { lat: location.lat(), lng: location.lng() };
          mapInstanceRef.current?.panTo(location);
          mapInstanceRef.current?.setZoom(19);
        }
      },
    );
  };

  return (
    <div className="space-y-2">
      <Label
        htmlFor="logradouro-maps"
        className="text-xs font-medium text-ink-soft"
      >
        Logradouro
      </Label>
      <input
        id="logradouro-maps"
        ref={inputRef}
        value={logradouro}
        onChange={(event) => onEnderecoChange(event.target.value)}
        onBlur={centralizarEnderecoDigitado}
        autoComplete="off"
        className="flex h-11 w-full rounded-xl border border-line bg-surface-soft px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand/40"
        aria-describedby="instrucao-localizacao"
      />
      <p
        id="instrucao-localizacao"
        className="text-[10px] leading-relaxed text-zinc-400"
      >
        Confirme se o pino está sobre o prédio. Arraste se necessário.
      </p>
      <Button
        type="button"
        variant="outline"
        onClick={() => setMapaAberto(true)}
        className="h-11 w-full justify-start gap-2 rounded-xl border border-brand/30 bg-brand-soft/60 text-brand-strong hover:bg-brand-soft"
      >
        <MapPin className="size-4 text-brand" aria-hidden="true" />
        {ponto
          ? "Abrir mapa para reposicionar o pino"
          : "Abrir mapa e marcar o prédio"}
      </Button>
      {ponto && (
        <p className="text-[10px] text-zinc-500">
          Ponto selecionado: {ponto.lat.toFixed(6)}, {ponto.lng.toFixed(6)}
        </p>
      )}
      {erroMapa && (
        <p role="alert" className="text-xs text-rose-500">
          {erroMapa}
        </p>
      )}
      {mapaAberto && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-ink/40 p-3 backdrop-blur-sm sm:p-6">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-mapa"
            className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_24px_80px_rgba(46,53,50,0.18)]"
          >
            <header className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 sm:px-6 sm:py-4">
              <div>
                <h2
                  id="titulo-modal-mapa"
                  className="flex items-center gap-2 text-base font-semibold text-ink sm:text-lg"
                >
                  <MapPin className="size-4 text-brand" aria-hidden="true" />{" "}
                  Ajustar localização do imóvel
                </h2>
                <p className="mt-1 text-xs text-ink-soft">
                  Clique no prédio ou arraste o pino até a posição correta.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setMapaAberto(false)}
                className="shrink-0 rounded-full border-line text-ink-soft hover:bg-surface-soft"
              >
                Fechar mapa
              </Button>
            </header>
            <div
              ref={mapaRef}
              className="h-[60vh] min-h-[320px] w-full bg-surface-soft sm:h-[68vh] sm:min-h-[420px]"
              role="region"
              aria-label="Mapa para marcar o prédio"
            />
            <footer className="flex flex-col gap-3 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p
                className="text-xs tabular-nums text-ink-soft"
                aria-live="polite"
              >
                {ponto
                  ? `Pino: ${ponto.lat.toFixed(6)}, ${ponto.lng.toFixed(6)}`
                  : "Nenhum ponto marcado; clique no prédio para posicionar o pino."}
              </p>
              <Button
                type="button"
                onClick={() => setMapaAberto(false)}
                className="rounded-full bg-brand-strong text-white hover:bg-brand"
              >
                Usar este ponto
              </Button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

async function persistirAnaliseVectorX(obraId: string, analiseNormalizada: any) {
  const colunas = [
    "zona",
    "subzona",
    "codigo_zona",
    "municipio",
    "uf",
    "caracteristica",
    "fachada",
    "endereco",
    "nome_estacao",
    "temp_bulbo_seco_min",
    "temp_bulbo_seco_max",
    "temp_media",
    "umidade_media",
    "radiacao_media",
    "distancia_km",
    "resumo",
    "classificacao",
    "clima",
    "potencial_hidrico",
    "score_bioclimatico",
    "estrategias_conforto",
    "estrategias_resiliencia",
    "recomendacoes_conforto",
    "recomendacoes_resiliencia",
    "resumo_executivo",
    "leitura_ia",
    "calculo_solar",
    "sombreamento_real",
    "potencial_fotovoltaico",
    "cards_materiais",
    "material_recomendado",
    "intervalo_nbr15575",
    "cidade_representativa",
    "estado_representativo",
    "umidade_relativa_limiar",
    "umidade_relativa_condicao",
    "resumo_climatico",
    "criterio_classificacao",
    "desafio_inverno",
    "desafio_verao",
    "amplitude_termica",
    "temp_projeto_inverno_c",
    "temp_projeto_verao_c",
    "diretrizes_conforto_detalhadas",
    "diretrizes_resiliencia_detalhadas",
  ];
  const campos = Object.fromEntries(
    colunas
      .filter((coluna) =>
        Object.prototype.hasOwnProperty.call(analiseNormalizada, coluna),
      )
      .map((coluna) => [coluna, analiseNormalizada[coluna]]),
  );
  const payload = { ...campos, obra_id: obraId };

  const { data: existente, error: buscaError } = await supabase
    .from(TABELA_PROPRIA)
    .select("id")
    .eq("obra_id", obraId)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (buscaError) throw buscaError;

  if (existente?.id) {
    const { error } = await supabase
      .from(TABELA_PROPRIA)
      .update(payload)
      .eq("id", existente.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from(TABELA_PROPRIA).insert(payload);
  if (error) throw error;
}

const normalizarAnalise = (raw: any) => {
  if (!raw) return raw;
  const resposta = Array.isArray(raw) ? raw[0] : raw.data || raw.body || raw;
  const camposJson = [
    "resumo",
    "classificacao",
    "clima",
    "potencial_hidrico",
    "score_bioclimatico",
    "estrategias_conforto",
    "estrategias_resiliencia",
    "recomendacoes_conforto",
    "recomendacoes_resiliencia",
    "calculo_solar",
    "sombreamento_real",
    "potencial_fotovoltaico",
    "cards_materiais",
    "material_recomendado",
    "diretrizes_conforto_detalhadas",
    "diretrizes_resiliencia_detalhadas",
  ];
  const normalizado = { ...resposta };
  camposJson.forEach((campo) => {
    if (typeof normalizado[campo] === "string") {
      try {
        normalizado[campo] = JSON.parse(normalizado[campo]);
      } catch {}
    }
  });
  return normalizado;
};

const ANALISE_LOADING_STEPS = [
  "Mapeando terreno",
  "Calculando azimute",
  "Detectando sombras",
  "Gerando relatório",
];

function AnaliseLoadingState() {
  const [etapa, setEtapa] = useState(0);

  useEffect(() => {
    const intervalo = setInterval(() => {
      setEtapa(
        (valorAtual) => (valorAtual + 1) % ANALISE_LOADING_STEPS.length,
      );
    }, 1400);

    return () => clearInterval(intervalo);
  }, []);

  const textoEtapa = ANALISE_LOADING_STEPS[etapa];

  return (
    <div className="max-w-5xl mx-auto min-h-[60vh] flex items-center justify-center py-12">
      <div className="relative w-full max-w-2xl">
        <div className="relative h-72 overflow-hidden rounded-[28px] border border-line bg-surface-soft flex flex-col items-center justify-center p-6">
          <div className="size-14 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-orange-500 shadow-[0_0_24px_rgba(251,191,36,0.5)] animate-pulse mb-4" />
          <p className="text-sm font-bold text-ink">
            Processando Diagnóstico Bioclimático
          </p>
          <span className="mt-2 rounded-full bg-brand-soft px-3.5 py-1 text-xs font-semibold text-brand-strong">
            {textoEtapa}...
          </span>
        </div>
      </div>
    </div>
  );
}

const CORES_ESTACAO: Record<string, string> = {
  Verao: "#F59E0B",
  Outono: "#DC2626",
  Inverno: "#3B82F6",
  Primavera: "#10B981",
};

const ESTACOES_RELATORIO = ["Verao", "Outono", "Inverno", "Primavera"];
const DIRECOES_ENTORNO = [
  "Norte",
  "Nordeste",
  "Leste",
  "Sudeste",
  "Sul",
  "Sudoeste",
  "Oeste",
  "Noroeste",
];
const AZIMUTE_POR_FACHADA: Record<string, number> = {
  norte: 0,
  nordeste: 45,
  leste: 90,
  sudeste: 135,
  sul: 180,
  sudoeste: 225,
  oeste: 270,
  noroeste: 315,
};

type HorizontePonto = {
  ponto?: { x: number; y: number; mascara: number } | null;
  referenciaNaoEncontrada?: boolean;
  azimute: number;
  anguloObstrucaoGraus: number | null;
  distanciaObstaculoMetros?: number | null;
  alturaObstaculoMetros?: number | null;
  alturaObstaculoAcimaDoSoloMetros?: number | null;
  aviso?: string | null;
};

function obstaculoGeraSombraReal(
  ponto: HorizontePonto,
  calculoSolar: any,
  margemAzimute = 15,
  toleranciaElevacao = 3,
): boolean {
  const anguloObs = Number(ponto?.anguloObstrucaoGraus);
  if (!Number.isFinite(anguloObs) || anguloObs < 3) return false;
  if (!calculoSolar) return true;

  for (const estacao of ESTACOES_RELATORIO) {
    const horarios = calculoSolar[estacao];
    if (!horarios) continue;
    for (const d of Object.values(horarios) as any[]) {
      const azSol = Number(d?.azimute);
      const elevSol = Number(d?.elevacao);
      if (!Number.isFinite(azSol) || elevSol <= 0) continue;

      if (diffAngular(ponto.azimute, azSol) <= margemAzimute) {
        if (
          d?.obstruidoReal === true ||
          d?.status === "Sombra (obstruída)"
        ) {
          return true;
        }
        if (anguloObs + toleranciaElevacao >= elevSol) {
          return true;
        }
      }
    }
  }
  return false;
}

function filtrarRuidoPontual(pontos: HorizontePonto[]): HorizontePonto[] {
  if (pontos.length <= 2) return pontos;

  const consistentes = pontos.filter((p) => {
    const ang = Number(p.anguloObstrucaoGraus) || 0;
    if (ang < 8) return true;

    const proximoEAlto =
      (p.distanciaObstaculoMetros ?? Infinity) <= 45 &&
      (p.alturaObstaculoAcimaDoSoloMetros ?? 0) >= 6;
    if (proximoEAlto) return true;

    const vizinhos = pontos.filter(
      (outro) => outro !== p && diffAngular(p.azimute, outro.azimute) <= 15,
    );
    if (vizinhos.length === 0) return true;
    const maiorVizinho = Math.max(
      ...vizinhos.map((v) => Number(v.anguloObstrucaoGraus) || 0),
    );
    return maiorVizinho >= ang * 0.25;
  });

  return consistentes.length > 0 ? consistentes : pontos;
}

function escolherObstaculoPrincipal(
  perfil: HorizontePonto[] | null | undefined,
  azimuteFachada: number | null,
  calculoSolar: any,
): HorizontePonto | null {
  const brutos = (perfil || []).filter(
    (p) =>
      p?.ponto &&
      !p.referenciaNaoEncontrada &&
      Number.isFinite(p.azimute) &&
      typeof p.anguloObstrucaoGraus === "number",
  );
  const limpos = filtrarRuidoPontual(brutos);

  return limpos
    .filter(
      (p) =>
        (azimuteFachada === null ||
          diffAngular(p.azimute, azimuteFachada) <= 90) &&
        obstaculoGeraSombraReal(p, calculoSolar),
    )
    .reduce<HorizontePonto | null>(
      (m, p) =>
        !m ||
        (p.anguloObstrucaoGraus as number) > (m.anguloObstrucaoGraus as number)
          ? p
          : m,
      null,
    );
}

function calcularBloqueios(calculoSolar: any, _perfilHorizonte: HorizontePonto[]) {
  const mapa = new Map<number, { azimute: number; horas: string[] }>();
  if (!calculoSolar) return mapa;

  for (const estacao of ESTACOES_RELATORIO) {
    const horarios = calculoSolar[estacao];
    if (!horarios) continue;
    for (const [hora, d] of Object.entries(horarios) as [string, any][]) {
      if (d?.status === "Sombra (obstruída)" || d?.obstruidoReal === true) {
        const az = Math.round(Number(d.azimute));
        if (Number.isFinite(az)) {
          const item = mapa.get(az) || { azimute: az, horas: [] };
          item.horas.push(`${hora} (${ROTULO_ESTACAO[estacao] || estacao})`);
          mapa.set(az, item);
        }
      }
    }
  }
  return mapa;
}

function resumirEntornoPorSetor(
  perfil: HorizontePonto[] | null | undefined,
  azimuteFachada: number | null,
  calculoSolar: any,
  bloqueios: Map<number, { azimute: number; horas: string[] }>,
) {
  const todos = perfil || [];
  const validosBrutos = todos.filter(
    (p) =>
      !p.referenciaNaoEncontrada &&
      Number.isFinite(p.azimute) &&
      typeof p.anguloObstrucaoGraus === "number",
  );
  const validos = filtrarRuidoPontual(validosBrutos);

  return DIRECOES_ENTORNO.map((direcao, i) => {
    const centro = i * 45;
    const doSetor = validos.filter((p) => diffAngular(p.azimute, centro) <= 22.5);
    const doSetorBruto = validosBrutos.filter(
      (p) => diffAngular(p.azimute, centro) <= 22.5,
    );
    const baseSetor = doSetor.length > 0 ? doSetor : doSetorBruto;

    const candidatosSombraReal = baseSetor.filter(
      (p) =>
        (azimuteFachada === null ||
          diffAngular(p.azimute, azimuteFachada) <= 90) &&
        obstaculoGeraSombraReal(p, calculoSolar),
    );
    const listaParaPico =
      candidatosSombraReal.length > 0 ? candidatosSombraReal : baseSetor;

    const pico = listaParaPico.reduce<HorizontePonto | null>(
      (m, p) =>
        !m ||
        (p.anguloObstrucaoGraus as number) > (m.anguloObstrucaoGraus as number)
          ? p
          : m,
      null,
    );

    const todosDoSetor = todos.filter(
      (p) => diffAngular(p.azimute, centro) <= 22.5,
    );
    const avisoSetor = !pico
      ? todosDoSetor.find((p) => p.aviso)?.aviso || undefined
      : undefined;
    const atrasDaFachada =
      !pico &&
      (todosDoSetor.length === 0 ||
        !!avisoSetor?.toLowerCase().includes("dentro do prédio"));

    const naFrente =
      azimuteFachada !== null &&
      pico !== null &&
      diffAngular(pico.azimute, azimuteFachada) <= 90;
    const geraSombra =
      pico !== null && obstaculoGeraSombraReal(pico, calculoSolar);
    const afetaFachada = naFrente && geraSombra;

    const horas: string[] = [];
    if (pico) {
      for (const [az, b] of bloqueios.entries()) {
        if (diffAngular(az, centro) <= 22.5) horas.push(...b.horas);
      }
    }
    const bloqueio = horas.length > 0 ? { horas } : null;

    return {
      direcao,
      pico,
      afetaFachada,
      avisoSetor,
      atrasDaFachada,
      bloqueio,
    };
  });
}

function horariosDaEstacao(
  horarios: Record<string, { status?: string | null }> | undefined,
) {
  const entradas = Object.entries(horarios || {})
    .map(([label, d]) => ({
      hora: parseInt(label, 10),
      status: String(d?.status || ""),
    }))
    .filter((e) => Number.isFinite(e.hora))
    .sort((a, b) => a.hora - b.hora);
  return {
    comSol: entradas
      .filter((e) => e.status === "Pleno Sol" || e.status === "Meia Sombra")
      .map((e) => `${e.hora}h`),
    bloqueados: entradas
      .filter((e) => e.status.startsWith("Sombra (obstru"))
      .map((e) => `${e.hora}h`),
  };
}

function resumirExposicaoSolar(calculoSolar: any, perfilHorizonte: any[]) {
  const porEstacao = ESTACOES_RELATORIO.map((estacao) => {
    const horarios = calculoSolar?.[estacao] ?? {};
    const amostras = Object.entries(horarios)
      .map(([hora, dado]: [string, any]) => ({
        hora: Number.parseFloat(hora),
        ...dado,
      }))
      .filter((dado) => Number.isFinite(dado.hora))
      .sort((a, b) => a.hora - b.hora);
    const amostrasDiurnas = amostras.filter(
      (dado) => Number(dado.elevacao) > 0,
    );
    const solDireto = amostrasDiurnas.filter(
      (dado) => dado.status === "Pleno Sol" || dado.status === "Meia Sombra",
    );
    const obstruidos = amostrasDiurnas.filter(
      (dado) =>
        dado.iluminado === true &&
        (dado.obstruidoReal === true || dado.status === "Sombra (obstruída)"),
    );

    return {
      estacao,
      total: amostrasDiurnas.length,
      solDireto: solDireto.length,
      plenoSol: amostrasDiurnas.filter((dado) => dado.status === "Pleno Sol")
        .length,
      meiaSombra: amostrasDiurnas.filter(
        (dado) => dado.status === "Meia Sombra",
      ).length,
      sombra: amostrasDiurnas.filter((dado) => dado.status === "Sombra").length,
      obstruidos: obstruidos.length,
      inicioSol: solDireto[0]?.hora,
      fimSol: solDireto.at(-1)?.hora,
      percentualSol: amostrasDiurnas.length
        ? Math.round((solDireto.length / amostrasDiurnas.length) * 100)
        : null,
    };
  });

  const pontosPerfil = Array.isArray(perfilHorizonte) ? perfilHorizonte : [];
  const pontosComDado = pontosPerfil.filter(
    (ponto) =>
      ponto &&
      ponto.referenciaNaoEncontrada !== true &&
      typeof ponto.anguloObstrucaoGraus === "number",
  );
  const picos = pontosComDado
    .filter((ponto) => Number(ponto.anguloObstrucaoGraus) >= 2)
    .sort(
      (a, b) =>
        Number(b.anguloObstrucaoGraus) - Number(a.anguloObstrucaoGraus),
    );

  return {
    porEstacao,
    pontosComDado: pontosComDado.length,
    pontosTotais: pontosPerfil.length,
    picos,
    coberturaHorizonte: pontosPerfil.length
      ? Math.round((pontosComDado.length / pontosPerfil.length) * 100)
      : 0,
  };
}

/* ────────────────────────────────────────────────────────────────────────
   PÁGINA 1: CAPA EXECUTIVA DO LAUDO (INLINE)
──────────────────────────────────────────────────────────────────────── */

function PaginaCapaExecutiva({
  nomeProjeto,
  endereco,
  fachada,
  azimuteReal,
  zona,
  subzona,
  caracteristicaZona,
  nota,
  resumoScore,
  fonteSolar,
  clima,
  economiaAgua,
  economiaSolar,
  potencialFotovoltaico,
}: any) {
  const scoreNum = typeof nota === "number" ? Math.max(0, Math.min(100, nota)) : 76;
  const r = 34;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ - (scoreNum / 100) * circ;
  const orient = nomeOrientacao(azimuteReal ?? azimuteNominal(fachada));

  return (
    <div
      id="pdf-page-1"
      className="pdf-page bg-white w-full aspect-[210/297] rounded-md shadow-sm border border-[#DCE4DF] overflow-hidden relative text-[#18221F] p-8 flex flex-col"
    >
      <RunningHeader
        projeto={nomeProjeto}
        secao="SUMÁRIO EXECUTIVO & TELEMETRIA"
        pagina={1}
      />

      {/* Bloco Principal de Identificação */}
      <div className="rounded-2xl border border-[#DCE4DF] bg-gradient-to-br from-[#F7FAF8] via-white to-[#EBF3EE]/60 p-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#255841] px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.18em] text-white">
              LAUDO TÉCNICO DE DESEMPENHO BIOCLIMÁTICO
            </span>
            <h1 className="text-2xl font-black tracking-tight text-[#18221F] mt-2 leading-tight">
              {nomeProjeto || "Imóvel Analisado"}
            </h1>
            <p className="text-xs text-[#52605B] mt-1 flex items-center gap-1.5">
              <MapPin className="size-3.5 text-[#3A7D5E] shrink-0" />
              <span className="truncate">{endereco}</span>
            </p>
          </div>

          <div className="shrink-0 text-right bg-white border border-[#DCE4DF] rounded-xl px-3.5 py-2.5 shadow-2xs">
            <p className="text-[8px] font-bold uppercase tracking-widest text-[#7A8883]">
              ZONA BIOCLIMÁTICA
            </p>
            <p className="text-2xl font-black text-[#255841] leading-none mt-1">
              ZB {zona}
              {subzona}
            </p>
            <p className="text-[8px] font-semibold text-[#52605B] mt-1">
              {caracteristicaZona || "NBR 15220-3"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 mt-4 pt-3.5 border-t border-[#DCE4DF]">
          <div>
            <p className="text-[8px] font-bold uppercase tracking-wider text-[#7A8883]">
              FACHADA ANALISADA
            </p>
            <p className="text-xs font-extrabold text-[#18221F] mt-0.5">
              {orient.nome} ({Math.round(azimuteReal ?? azimuteNominal(fachada))}°)
            </p>
          </div>
          <div>
            <p className="text-[8px] font-bold uppercase tracking-wider text-[#7A8883]">
              MODELAGEM DE SOMBRAS
            </p>
            <p className="text-xs font-extrabold text-[#255841] mt-0.5">
              {fonteSolar}
            </p>
          </div>
          <div>
            <p className="text-[8px] font-bold uppercase tracking-wider text-[#7A8883]">
              NORMA DE REFERÊNCIA
            </p>
            <p className="text-xs font-extrabold text-[#18221F] mt-0.5">
              ABNT NBR 15220-3 / 15575
            </p>
          </div>
        </div>
      </div>

      {/* Score Bioclimático + Síntese */}
      <div className="grid grid-cols-[185px_1fr] gap-3.5 mb-4">
        <div className="rounded-xl border border-[#DCE4DF] bg-[#F7FAF8] p-3.5 flex flex-col items-center justify-center text-center">
          <div className="relative size-20 flex items-center justify-center">
            <svg className="size-20 -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r={r}
                stroke="#DCE4DF"
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="40"
                cy="40"
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
              <span className="text-xl font-black text-[#18221F] tabular-nums leading-none">
                {scoreNum}
              </span>
              <span className="text-[8px] font-mono uppercase text-[#7A8883]">
                / 100
              </span>
            </div>
          </div>
          <p className="text-[9px] font-black uppercase tracking-wider text-[#255841] mt-1.5">
            SCORE BIOCLIMÁTICO
          </p>
        </div>

        <div className="rounded-xl border border-[#DCE4DF] bg-white p-4 flex flex-col justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#3A7D5E] mb-1">
              SÍNTESE DO DESEMPENHO AMBIENTAL
            </p>
            <p className="text-[11px] text-[#18221F] leading-relaxed font-medium">
              {resumoScore ||
                `Imóvel inserido na Zona Bioclimática ${zona}${subzona}, com fachada principal orientada a ${orient.nome} (${Math.round(
                  azimuteReal ?? azimuteNominal(fachada),
                )}°). A leitura cruza a trajetória solar anual com o modelo digital de superfície (DSM) e as normais climatológicas oficiais.`}
            </p>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#DCE4DF] flex items-center justify-between text-[9px] text-[#52605B]">
            <span>Metodologia: Geometria Solar + Ray Casting DSM 60m</span>
            <span className="font-mono font-bold text-[#255841]">
              VERIFICADO
            </span>
          </div>
        </div>
      </div>

      {/* Fita de Telemetria Climática (4 colunas) */}
      <div className="mb-4">
        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#52605B] mb-2">
          TELEMETRIA CLIMÁTICA REGIONAL (BASE INMET)
        </p>
        <div className="grid grid-cols-4 gap-2.5">
          <div className="rounded-xl border border-[#DCE4DF] bg-[#F7FAF8] p-3">
            <p className="text-[8px] font-bold uppercase tracking-wider text-[#7A8883]">
              TEMP. MÉDIA ANUAL
            </p>
            <p className="text-base font-black text-[#18221F] mt-0.5 tabular-nums">
              {clima?.tempMedia != null
                ? `${formatarNumero(clima.tempMedia, 1)} °C`
                : "N/D"}
            </p>
            <p className="text-[8px] text-[#52605B] mt-0.5">
              Bulbo seco (TBSm)
            </p>
          </div>

          <div className="rounded-xl border border-[#DCE4DF] bg-[#F7FAF8] p-3">
            <p className="text-[8px] font-bold uppercase tracking-wider text-[#7A8883]">
              FAIXA NORMATIVA
            </p>
            <p className="text-base font-black text-[#18221F] mt-0.5 tabular-nums">
              {clima?.tempMin != null && clima?.tempMax != null
                ? `${formatarNumero(clima.tempMin, 0)}° a ${formatarNumero(
                    clima.tempMax,
                    0,
                  )}°C`
                : "Conforme ZB"}
            </p>
            <p className="text-[8px] text-[#52605B] mt-0.5">
              Limiar da subzona
            </p>
          </div>

          <div className="rounded-xl border border-[#DCE4DF] bg-[#F7FAF8] p-3">
            <p className="text-[8px] font-bold uppercase tracking-wider text-[#7A8883]">
              UMIDADE RELATIVA
            </p>
            <p className="text-base font-black text-[#18221F] mt-0.5 tabular-nums">
              {clima?.umidade != null
                ? `${formatarNumero(clima.umidade, 1)}%`
                : "N/D"}
            </p>
            <p className="text-[8px] text-[#52605B] mt-0.5">Média anual local</p>
          </div>

          <div className="rounded-xl border border-[#DCE4DF] bg-[#F7FAF8] p-3">
            <p className="text-[8px] font-bold uppercase tracking-wider text-[#7A8883]">
              RADIAÇÃO SOLAR
            </p>
            <p className="text-base font-black text-[#18221F] mt-0.5 tabular-nums">
              {clima?.radiacao != null
                ? `${formatarNumero(clima.radiacao, 0)} W/m²`
                : "N/D"}
            </p>
            <p className="text-[8px] text-[#52605B] mt-0.5">
              Média horária diurna
            </p>
          </div>
        </div>
      </div>

      {/* Potencial Fotovoltaico e Captação Pluvial */}
      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        <div className="rounded-xl border border-[#E5DEC9] bg-[#FBF9F3] p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black uppercase tracking-[0.14em] text-[#9A6B16] flex items-center gap-1.5">
                <Zap className="size-3.5" /> POTENCIAL FOTOVOLTAICO DO TELHADO
              </span>
              <span className="text-[8px] font-mono font-bold uppercase bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">
                SOLAR API
              </span>
            </div>
            {potencialFotovoltaico ? (
              <div className="space-y-1.5 mt-2">
                <p className="text-xl font-black text-[#18221F] tabular-nums">
                  {formatarNumero(
                    potencialFotovoltaico.geracaoAnualMaximaKwh,
                    0,
                  )}{" "}
                  <span className="text-xs font-bold text-[#52605B]">
                    kWh/ano
                  </span>
                </p>
                <p className="text-[10px] text-[#52605B]">
                  Capacidade até{" "}
                  <strong className="text-[#18221F]">
                    {potencialFotovoltaico.maximoPaineis ?? "—"} painéis
                  </strong>{" "}
                  ({formatarNumero(potencialFotovoltaico.areaMaximaM2, 0)} m² de
                  área útil solar).
                </p>
              </div>
            ) : (
              <p className="text-[10px] text-[#52605B] mt-2">
                Estimativa baseada na irradiação média local da cobertura.
              </p>
            )}
          </div>

          <div className="pt-2.5 border-t border-[#E5DEC9] flex items-center justify-between text-[10px]">
            <span className="text-[#52605B]">Economia elétrica estimada:</span>
            <strong className="font-mono font-bold text-[#255841]">
              {economiaSolar?.economiaAnualReais
                ? `${formatarMoeda(economiaSolar.economiaAnualReais)}/ano`
                : "Sob dimensionamento"}
            </strong>
          </div>
        </div>

        <div className="rounded-xl border border-[#CFE0D6] bg-[#F3F8F5] p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black uppercase tracking-[0.14em] text-[#255841] flex items-center gap-1.5">
                <Droplets className="size-3.5" /> CAPTAÇÃO PLUVIAL ESTIMADA
              </span>
              <span className="text-[8px] font-mono font-bold uppercase bg-[#EBF3EE] text-[#255841] px-1.5 py-0.5 rounded">
                HIDROLOGIA
              </span>
            </div>
            {economiaAgua ? (
              <div className="space-y-1.5 mt-2">
                <p className="text-xl font-black text-[#18221F] tabular-nums">
                  {formatarNumero(economiaAgua.volumeAnualLitros / 1000, 1)}{" "}
                  <span className="text-xs font-bold text-[#52605B]">
                    m³/ano ({formatarNumero(economiaAgua.volumeAnualLitros, 0)} L)
                  </span>
                </p>
                <p className="text-[10px] text-[#52605B]">
                  Cálculo considerando aproveitamento de cobertura para usos não
                  potáveis (irrigação, limpeza e bacias).
                </p>
              </div>
            ) : (
              <p className="text-[10px] text-[#52605B] mt-2">
                Potencial de captação pluvial conforme índice pluviométrico da
                bacia regional.
              </p>
            )}
          </div>

          <div className="pt-2.5 border-t border-[#CFE0D6] flex items-center justify-between text-[10px]">
            <span className="text-[#52605B]">Redução hídrica potencial:</span>
            <strong className="font-mono font-bold text-[#255841]">
              {economiaAgua?.economiaAnualReais
                ? `${formatarMoeda(economiaAgua.economiaAnualReais)}/ano`
                : "Ativo de resiliência"}
            </strong>
          </div>
        </div>
      </div>

      <RunningFooter />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   MAPA DO ENTORNO (DSM POLAR SVG) E TABELA DE SETORES
──────────────────────────────────────────────────────────────────────── */

function TabelaSetoresEntorno({
  setores,
  direcaoPrincipal,
}: {
  setores: any[];
  direcaoPrincipal?: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#DCE4DF]">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-[#F7FAF8] border-b border-[#DCE4DF] text-[8px] font-black uppercase tracking-wider text-[#52605B]">
            <th className="py-1.5 px-2.5">Setor Cardeal</th>
            <th className="py-1.5 px-2.5">Ângulo Máx.</th>
            <th className="py-1.5 px-2.5">Distância</th>
            <th className="py-1.5 px-2.5">Altura Est.</th>
            <th className="py-1.5 px-2.5">Interferência na Fachada</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#DCE4DF] text-[9.5px]">
          {setores.map((s) => {
            const ehPrincipal =
              direcaoPrincipal && s.direcao === direcaoPrincipal;
            const ang = s.pico?.anguloObstrucaoGraus;
            const dist = s.pico?.distanciaObstaculoMetros;
            const alt =
              s.pico?.alturaObstaculoAcimaDoSoloMetros ??
              s.pico?.alturaObstaculoMetros;

            return (
              <tr
                key={s.direcao}
                className={
                  ehPrincipal
                    ? "bg-rose-50/80 font-semibold"
                    : s.afetaFachada
                      ? "bg-cyan-50/40"
                      : "bg-white"
                }
              >
                <td className="py-1.5 px-2.5 font-bold text-[#18221F]">
                  {s.direcao}
                </td>
                <td className="py-1.5 px-2.5 font-mono tabular-nums">
                  {ang != null ? `${formatarNumero(ang, 1)}°` : "—"}
                </td>
                <td className="py-1.5 px-2.5 font-mono tabular-nums">
                  {dist != null ? `${formatarNumero(dist, 0)} m` : "—"}
                </td>
                <td className="py-1.5 px-2.5 font-mono tabular-nums">
                  {alt != null ? `${formatarNumero(alt, 1)} m` : "—"}
                </td>
                <td className="py-1.5 px-2.5">
                  {ehPrincipal ? (
                    <span className="inline-flex items-center rounded bg-rose-100 px-1.5 py-0.5 text-[8px] font-bold uppercase text-rose-800">
                      Obstáculo Principal{" "}
                      {s.bloqueio?.horas?.length
                        ? `(${s.bloqueio.horas.slice(0, 2).join(", ")})`
                        : ""}
                    </span>
                  ) : s.afetaFachada ? (
                    <span className="inline-flex items-center rounded bg-cyan-100 px-1.5 py-0.5 text-[8px] font-bold uppercase text-cyan-800">
                      Intercepta trajetória solar
                    </span>
                  ) : s.atrasDaFachada ? (
                    <span className="text-[8.5px] text-[#7A8883]">
                      Atrás do plano da fachada
                    </span>
                  ) : (
                    <span className="text-[8.5px] text-[#255841] font-medium">
                      Livre / abaixo da trajetória
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MapaEntorno({
  mapa,
  perfil,
  azimuteFachada,
  calculoSolar,
}: {
  mapa: any;
  perfil: any[];
  azimuteFachada: number | null;
  calculoSolar?: any;
}) {
  if (!mapa?.imagem || !mapa?.observador) return null;
  const R: number = mapa.raioMetros ?? 60;
  const obs = mapa.observador;

  const pontosBrutos = (perfil || []).filter(
    (p) => p?.ponto && typeof p.anguloObstrucaoGraus === "number",
  );
  const principal: any = escolherObstaculoPrincipal(
    perfil,
    azimuteFachada,
    calculoSolar,
  );

  const poli: number[][] = mapa.poligonoXY || [];

  const xs = [
    obs.x,
    ...poli.map((q) => q[0]),
    ...pontosBrutos.map((p) => p.ponto?.x).filter(Boolean),
  ];
  const ys = [
    obs.y,
    ...poli.map((q) => q[1]),
    ...pontosBrutos.map((p) => p.ponto?.y).filter(Boolean),
  ];
  const padding = 12;
  const x0 = Math.max(-R, Math.min(...xs) - padding);
  const x1 = Math.min(R, Math.max(...xs) + padding);
  const yMax = Math.min(R, Math.max(...ys) + padding);
  const yMin = Math.max(-R, Math.min(...ys) - padding);

  const svgX = x0;
  const svgY = -yMax;
  const svgWidth = x1 - x0;
  const svgHeight = yMax - yMin;

  const conePath = () => {
    if (azimuteFachada === null) return "";
    const a1 = ((azimuteFachada - 90) * Math.PI) / 180;
    const a2 = ((azimuteFachada + 90) * Math.PI) / 180;
    return `M${obs.x},${-obs.y} L${obs.x + R * Math.sin(a1)},${
      -obs.y - R * Math.cos(a1)
    } A${R},${R} 0 0,1 ${obs.x + R * Math.sin(a2)},${
      -obs.y - R * Math.cos(a2)
    } Z`;
  };

  const aneis = [20, 40, 60].filter((d) => d < R);
  const tam = Math.max(svgWidth, svgHeight);
  const fonte = tam / 70;

  return (
    <div className="mt-2">
      <div className="overflow-hidden rounded-xl border border-[#DCE4DF] bg-[#F7FAF8]">
        <svg
          viewBox={`${svgX} ${svgY} ${svgWidth} ${svgHeight}`}
          className="mx-auto block h-auto max-h-[250px] w-full"
          role="img"
          aria-label="Mapa do entorno com obstáculos solares"
        >
          <image
            href={mapa.imagem}
            x={-R}
            y={-R}
            width={2 * R}
            height={2 * R}
            style={{ imageRendering: "pixelated" }}
          />
          <rect
            x={-R}
            y={-R}
            width={2 * R}
            height={2 * R}
            fill="#ffffff"
            fillOpacity="0.55"
          />

          {azimuteFachada !== null && (
            <path
              d={conePath()}
              fill="#3A7D5E"
              fillOpacity="0.12"
              stroke="#3A7D5E"
              strokeWidth={fonte * 0.12}
              strokeDasharray={`${fonte * 0.5} ${fonte * 0.4}`}
            />
          )}

          {aneis.map((d) => (
            <g key={d}>
              <circle
                cx={obs.x}
                cy={-obs.y}
                r={d}
                fill="none"
                stroke="#334155"
                strokeOpacity="0.45"
                strokeWidth={fonte * 0.08}
                strokeDasharray={`${fonte * 0.3} ${fonte * 0.3}`}
              />
              <text
                x={obs.x + 0.8}
                y={-obs.y - d - 0.6}
                fontSize={fonte * 0.9}
                fill="#1f2937"
                stroke="#fff"
                strokeWidth={fonte * 0.22}
                paintOrder="stroke"
              >
                {d} m
              </text>
            </g>
          ))}

          {poli.length > 2 && (
            <polygon
              points={poli.map((q) => `${q[0]},${-q[1]}`).join(" ")}
              fill="#fbbf24"
              fillOpacity="0.35"
              stroke="#d97706"
              strokeWidth={fonte * 0.18}
            />
          )}

          {pontosBrutos.map((p) => {
            const naFrente =
              azimuteFachada === null ||
              diffAngular(p.azimute, azimuteFachada) <= 90;
            const geraSombra =
              naFrente && obstaculoGeraSombraReal(p, calculoSolar);
            const ehPrincipal = p === principal;
            return (
              <line
                key={p.azimute}
                x1={obs.x}
                y1={-obs.y}
                x2={p.ponto.x}
                y2={-p.ponto.y}
                stroke={
                  ehPrincipal ? "#e11d48" : geraSombra ? "#0891b2" : "#64748b"
                }
                strokeWidth={
                  fonte * (ehPrincipal ? 0.28 : geraSombra ? 0.16 : 0.07)
                }
                opacity={ehPrincipal ? 1 : geraSombra ? 0.9 : 0.35}
                strokeDasharray={
                  !naFrente ? `${fonte * 0.2} ${fonte * 0.4}` : undefined
                }
              />
            );
          })}

          {pontosBrutos
            .filter(
              (p) =>
                p.anguloObstrucaoGraus >= 5 &&
                (azimuteFachada === null ||
                  diffAngular(p.azimute, azimuteFachada) <= 90),
            )
            .map((p) => {
              const ehPrincipal = p === principal;
              const geraSombra = obstaculoGeraSombraReal(p, calculoSolar);
              return (
                <circle
                  key={`c${p.azimute}`}
                  cx={p.ponto.x}
                  cy={-p.ponto.y}
                  r={fonte * (ehPrincipal ? 0.55 : geraSombra ? 0.38 : 0.25)}
                  fill={
                    ehPrincipal
                      ? "#e11d48"
                      : geraSombra
                        ? "#0891b2"
                        : "#64748b"
                  }
                  stroke="#fff"
                  strokeWidth={fonte * 0.12}
                />
              );
            })}

          {principal && (
            <text
              x={principal.ponto.x + fonte * 0.9}
              y={-principal.ponto.y - fonte * 0.7}
              fontSize={fonte * 1.15}
              fontWeight="bold"
              fill="#9f1239"
              stroke="#fff"
              strokeWidth={fonte * 0.3}
              paintOrder="stroke"
            >
              {`${formatarNumero(
                principal.anguloObstrucaoGraus,
                1,
              )}° a ${formatarNumero(principal.distanciaObstaculoMetros, 0)} m`}
            </text>
          )}

          <polygon
            points={`${obs.x},${-obs.y - fonte * 0.9} ${
              obs.x - fonte * 0.7
            },${-obs.y + fonte * 0.5} ${obs.x + fonte * 0.7},${
              -obs.y + fonte * 0.5
            }`}
            fill="#3A7D5E"
            stroke="#fff"
            strokeWidth={fonte * 0.15}
          />

          <g
            transform={`translate(${svgX + fonte * 2.2}, ${
              svgY + fonte * 3.2
            })`}
          >
            <polygon
              points={`0,${-fonte * 1.6} ${fonte * 0.6},${
                fonte * 0.4
              } 0,${fonte * 0.05} ${-fonte * 0.6},${fonte * 0.4}`}
              fill="#1f2937"
            />
            <text
              x={0}
              y={fonte * 1.6}
              fontSize={fonte * 1.1}
              textAnchor="middle"
              fontWeight="bold"
              fill="#1f2937"
              stroke="#fff"
              strokeWidth={fonte * 0.25}
              paintOrder="stroke"
            >
              N
            </text>
          </g>
        </svg>
      </div>

      <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[8.5px] text-[#52605B]">
        <li className="flex items-center gap-1.5">
          <i className="inline-block h-2 w-3 border border-amber-600 bg-amber-300/60" />
          Edifício
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-0 border-x-[4px] border-b-[7px] border-x-transparent border-b-[#255841]" />
          Fachada analisada
        </li>
        <li className="flex items-center gap-1.5">
          <i className="inline-block h-2 w-3 border border-dashed border-[#255841] bg-[#255841]/15" />
          Campo de visão
        </li>
        <li className="flex items-center gap-1.5">
          <i className="inline-block h-0.5 w-4 bg-cyan-600" />
          Intercepta o sol
        </li>
        <li className="flex items-center gap-1.5">
          <i className="inline-block h-0.5 w-4 bg-rose-600" />
          Principal obstáculo
        </li>
      </ul>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   PÁGINA 3: CARTA SOLAR ESTEREOGRÁFICA E INTERPRETAÇÃO
──────────────────────────────────────────────────────────────────────── */

function PaginaCartaSolar({
  nomeProjeto,
  fachadaAtual,
  sombreamentoReal,
  calculoSolarAtual,
  percentualReal,
  fonteSombreamentoResumo,
  leituraSolar,
  obstrucaoPrincipal,
}: any) {
  const azNominal = azimuteNominal(fachadaAtual);
  const azUsadoBruto =
    sombreamentoReal?.azimuteFachadaUsado ??
    sombreamentoReal?.azimute_fachada_usado;
  const azReal: number =
    typeof azUsadoBruto === "number" ? azUsadoBruto : azNominal;
  const orient = nomeOrientacao(azReal);
  const rotuloFachada = `${orient.nome} (${Math.round(azReal)}°)`;
  const divergeDoInformado = diffAngular(azReal, azNominal) >= 5;
  const perfilHorizonte: any[] =
    sombreamentoReal?.perfil ?? sombreamentoReal?.perfil_horizonte ?? [];
  const resumoSolar = resumoSolarGerado(
    calculoSolarAtual,
    rotuloFachada,
    percentualReal,
  );

  return (
    <div
      id="pdf-page-3"
      className="pdf-page bg-white w-full aspect-[210/297] rounded-md shadow-sm border border-[#DCE4DF] overflow-hidden relative text-[#18221F] p-8 flex flex-col"
    >
      <RunningHeader
        projeto={nomeProjeto}
        secao="GEOMETRIA SOLAR & MÁSCARA DE OBSTRUÇÃO"
        pagina={3}
      />

      <div className="mb-3">
        <h2 className="text-lg font-black text-[#18221F] flex items-center gap-2">
          <Sun className="size-4 text-[#255841]" /> Carta Solar Estereográfica ·
          Fachada {rotuloFachada}
        </h2>
        {divergeDoInformado && (
          <p className="text-[9.5px] text-[#52605B] mt-0.5">
            Orientação nominal informada: {fachadaAtual}; azimute real medido no
            contorno predial: <strong>{Math.round(azReal)}°</strong>.
          </p>
        )}
      </div>

      <div className="bg-[#F7FAF8] border border-[#DCE4DF] rounded-xl p-4 flex-1 flex flex-col justify-between">
        <p className="text-[11px] text-[#18221F] leading-relaxed font-medium mb-2">
          {resumoSolar}
        </p>

        {calculoSolarAtual?.Verao ? (
          (() => {
            const cx = 190,
              cy = 150,
              raio = 108;
            const estacoes = ["Verao", "Outono", "Inverno", "Primavera"];
            const ordemDesenho = ["Verao", "Inverno", "Primavera", "Outono"];
            const pathMascara = gerarPathMascara(
              perfilHorizonte,
              azReal,
              cx,
              cy,
              raio,
            );
            const ini = nomeOrientacao(azReal - 90).nome;
            const fim = nomeOrientacao(azReal + 90).nome;
            const pa = anguloParaXY(cx, cy, raio, azReal - 90);
            const pb = anguloParaXY(cx, cy, raio, azReal + 90);
            const pRotulo = anguloParaXY(cx, cy, raio * 0.86, azReal);

            return (
              <div className="grid grid-cols-[1.15fr_0.85fr] gap-4 items-center my-auto">
                <div className="bg-white border border-[#DCE4DF] rounded-xl p-2.5">
                  <svg
                    viewBox="0 0 380 320"
                    className="w-full h-auto max-h-[250px]"
                  >
                    <circle
                      cx={cx}
                      cy={cy}
                      r={raio}
                      fill="#EEF5EF"
                      stroke="#DCE4DF"
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={raio * 0.66}
                      fill="none"
                      stroke="#DCE4DF"
                      strokeDasharray="4 4"
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={raio * 0.33}
                      fill="none"
                      stroke="#DCE4DF"
                      strokeDasharray="4 4"
                    />
                    <line
                      x1={cx}
                      y1={cy - raio}
                      x2={cx}
                      y2={cy + raio}
                      stroke="#DCE4DF"
                    />
                    <line
                      x1={cx - raio}
                      y1={cy}
                      x2={cx + raio}
                      y2={cy}
                      stroke="#DCE4DF"
                    />
                    <text
                      x={cx}
                      y={cy - raio - 10}
                      textAnchor="middle"
                      className="fill-[#52605B] text-[11px] font-black"
                    >
                      N
                    </text>
                    <text
                      x={cx}
                      y={cy + raio + 17}
                      textAnchor="middle"
                      className="fill-[#52605B] text-[11px] font-black"
                    >
                      S
                    </text>
                    <text
                      x={cx + raio + 14}
                      y={cy + 4}
                      textAnchor="middle"
                      className="fill-[#52605B] text-[11px] font-black"
                    >
                      L
                    </text>
                    <text
                      x={cx - raio - 14}
                      y={cy + 4}
                      textAnchor="middle"
                      className="fill-[#52605B] text-[11px] font-black"
                    >
                      O
                    </text>

                    <path
                      d={gerarPathSetorFachadaAz(azReal, cx, cy, raio)}
                      fill="#4C9A74"
                      fillOpacity="0.14"
                      stroke="#3A7D5E"
                      strokeWidth="1.5"
                    />
                    <line
                      x1={pa.x}
                      y1={pa.y}
                      x2={pb.x}
                      y2={pb.y}
                      stroke="#3A7D5E"
                      strokeWidth="2.5"
                    />
                    <text
                      x={pRotulo.x}
                      y={pRotulo.y}
                      textAnchor="middle"
                      className="fill-[#255841] text-[9px] font-black"
                    >
                      {orient.sigla} · {Math.round(azReal)}°
                    </text>

                    {pathMascara && (
                      <path
                        d={pathMascara}
                        fill="#F43F5E"
                        fillOpacity="0.22"
                        stroke="#F43F5E"
                        strokeOpacity="0.55"
                        strokeWidth="1"
                      />
                    )}

                    {ordemDesenho.map((estacao) => {
                      const horarios = calculoSolarAtual[estacao];
                      if (!horarios) return null;
                      const cor = CORES_ESTACAO[estacao];
                      const equinocioSobreposto = estacao === "Outono";
                      const pontos = Object.entries(horarios).map(
                        ([hora, d]: [string, any]) => {
                          const r = elevacaoParaRaio(
                            Number(d.elevacao) || 0,
                            raio,
                          );
                          return {
                            hora,
                            estado: estadoDoPonto(d.status),
                            ...anguloParaXY(
                              cx,
                              cy,
                              r,
                              Number(d.azimute) || 0,
                            ),
                          };
                        },
                      );
                      const rp = equinocioSobreposto ? 2.2 : 3.8;
                      return (
                        <g key={estacao}>
                          <polyline
                            points={pontos.map((p) => `${p.x},${p.y}`).join(" ")}
                            fill="none"
                            stroke={cor}
                            strokeWidth={equinocioSobreposto ? 1.5 : 2.5}
                            strokeDasharray={
                              equinocioSobreposto ? "5 4" : undefined
                            }
                          />
                          {pontos.map((p) =>
                            p.estado === "bloqueado" ? (
                              <circle
                                key={p.hora}
                                cx={p.x}
                                cy={p.y}
                                r={rp}
                                fill="#FFFFFF"
                                stroke={cor}
                                strokeWidth="1.6"
                              />
                            ) : (
                              <circle
                                key={p.hora}
                                cx={p.x}
                                cy={p.y}
                                r={rp}
                                fill={cor}
                                fillOpacity={p.estado === "sol" ? 1 : 0.3}
                              />
                            ),
                          )}
                        </g>
                      );
                    })}

                    {calculoSolarAtual.Inverno &&
                      Object.entries(calculoSolarAtual.Inverno).map(
                        ([hora, d]: [string, any]) => {
                          const h = parseFloat(hora.replace("h", ""));
                          if (!Number.isInteger(h) || h % 2 !== 0) return null;
                          const r =
                            elevacaoParaRaio(Number(d.elevacao) || 0, raio) +
                            10;
                          const p = anguloParaXY(
                            cx,
                            cy,
                            r,
                            Number(d.azimute) || 0,
                          );
                          return (
                            <text
                              key={hora}
                              x={p.x}
                              y={p.y + 3}
                              textAnchor="middle"
                              className="fill-[#52605B] text-[8px] font-bold"
                            >
                              {h}h
                            </text>
                          );
                        },
                      )}
                  </svg>

                  <div className="flex flex-wrap justify-center gap-3 text-[8.5px] font-bold uppercase tracking-wider text-[#52605B]">
                    {estacoes.map((estacao) => (
                      <span key={estacao} className="flex items-center gap-1">
                        <i
                          className="size-2 rounded-full"
                          style={{ backgroundColor: CORES_ESTACAO[estacao] }}
                        />
                        {ROTULO_ESTACAO[estacao]}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 mt-1 text-[8px] font-semibold text-[#52605B]">
                    <span className="flex items-center gap-1">
                      <i className="size-2 rounded-full bg-[#52605B]" />
                      Sol direto
                    </span>
                    <span className="flex items-center gap-1">
                      <i className="size-2 rounded-full border-2 border-[#52605B] bg-white" />
                      Bloqueado (DSM)
                    </span>
                    {pathMascara && (
                      <span className="flex items-center gap-1">
                        <i className="size-2 rounded-xs bg-rose-300" />
                        Céu obstruído
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="bg-white rounded-xl border border-[#DCE4DF] p-3">
                    <p className="text-[8.5px] font-black uppercase tracking-widest text-[#255841]">
                      CAMPO HEMISFÉRICO DA FACHADA
                    </p>
                    <p className="text-[10.5px] font-medium text-[#18221F] mt-1 leading-snug">
                      A área verde representa o hemisfério visível pela fachada:
                      do <strong>{ini}</strong> ao <strong>{fim}</strong> (
                      {Math.round(norm360(azReal - 90))}° a{" "}
                      {Math.round(norm360(azReal + 90))}°).{" "}
                      {pathMascara
                        ? "A mancha rosa projeta a máscara de obstrução medida por satélite."
                        : ""}
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-[#DCE4DF] p-3">
                    <p className="text-[8.5px] font-black uppercase tracking-widest text-[#52605B]">
                      {fonteSombreamentoResumo === "perfil_real_dsm"
                        ? "INSOLAÇÃO EFETIVA (COM DSM)"
                        : "INSOLAÇÃO GEOMÉTRICA"}
                    </p>
                    <p className="text-lg font-black text-[#255841] mt-0.5 tabular-nums">
                      {percentualReal != null ? `${percentualReal}%` : "—"}{" "}
                      <span className="text-[10px] font-semibold text-[#52605B]">
                        dos horários diurnos com sol direto
                      </span>
                    </p>
                  </div>

                  {obstrucaoPrincipal && (
                    <div className="bg-rose-50 rounded-xl border border-rose-200 p-3">
                      <p className="text-[8.5px] font-black uppercase tracking-widest text-rose-700">
                        OBSTRUÇÃO CRÍTICA ({obstrucaoPrincipal.direcao})
                      </p>
                      <p className="text-[10px] text-rose-900 mt-1 leading-snug">
                        Obstáculo a{" "}
                        <strong>
                          {formatarNumero(
                            obstrucaoPrincipal.distanciaMetros,
                            0,
                          )}{" "}
                          m
                        </strong>{" "}
                        com{" "}
                        <strong>
                          {formatarNumero(obstrucaoPrincipal.alturaMetros, 1)} m
                        </strong>{" "}
                        de elevação, bloqueando o sol abaixo de{" "}
                        <strong>
                          {formatarNumero(
                            obstrucaoPrincipal.anguloObstrucaoGraus,
                            1,
                          )}
                          °
                        </strong>
                        .
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()
        ) : (
          <p className="text-sm text-[#52605B]">Dados solares indisponíveis.</p>
        )}

        <div className="mt-3 grid grid-cols-4 gap-2.5">
          {["Verao", "Outono", "Inverno", "Primavera"].map((estacao) => {
            const ensolaradas = horasComSol(calculoSolarAtual?.[estacao]).length;
            return (
              <div
                key={estacao}
                className="bg-white border border-[#DCE4DF] rounded-lg p-2.5"
              >
                <p className="text-[8px] font-black uppercase tracking-widest text-[#52605B]">
                  {ROTULO_ESTACAO[estacao]}
                </p>
                <p className="text-base font-black text-[#18221F] mt-0.5 tabular-nums">
                  {ensolaradas}{" "}
                  <span className="text-[9.5px] font-semibold text-[#52605B]">
                    horários de sol
                  </span>
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <RunningFooter />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   NOVO SIMULADOR INTERATIVO PARA CLIENTE / INVESTIDOR (EMBUTIDO)
──────────────────────────────────────────────────────────────────────── */

function SimuladorSolarExecutivo({
  calculoSolar,
  fachadaAtual,
  azimuteFachada,
  obstrucaoPrincipal,
  perfilHorizonte,
}: {
  calculoSolar: any;
  fachadaAtual: string;
  azimuteFachada: number | null;
  obstrucaoPrincipal: any;
  perfilHorizonte: any[];
}) {
  const [estacao, setEstacao] = useState<
    "Verao" | "Outono" | "Inverno" | "Primavera"
  >("Inverno");
  const [horaSelecionada, setHoraSelecionada] = useState<number>(10);
  const [reproduzindo, setReproduzindo] = useState(false);
  const [considerarVizinhos, setConsiderarVizinhos] = useState(true);

  const azReal = azimuteFachada ?? azimuteNominal(fachadaAtual);
  const orient = nomeOrientacao(azReal);

  const amostrasEstacao = useMemo(() => {
    const bruto = calculoSolar?.[estacao] || {};
    return Object.entries(bruto)
      .map(([k, v]: [string, any]) => ({
        hora: parseInt(k.replace("h", ""), 10),
        ...v,
      }))
      .filter((d) => Number.isFinite(d.hora) && Number(d.elevacao) > 0)
      .sort((a, b) => a.hora - b.hora);
  }, [calculoSolar, estacao]);

  useEffect(() => {
    if (!amostrasEstacao.length) return;
    if (!amostrasEstacao.some((a) => a.hora === horaSelecionada)) {
      setHoraSelecionada(
        amostrasEstacao[Math.floor(amostrasEstacao.length / 2)].hora,
      );
    }
  }, [amostrasEstacao, horaSelecionada]);

  useEffect(() => {
    if (!reproduzindo || amostrasEstacao.length < 2) return;
    const timer = setInterval(() => {
      setHoraSelecionada((atual) => {
        const idx = amostrasEstacao.findIndex((a) => a.hora === atual);
        const prox = idx >= 0 && idx < amostrasEstacao.length - 1 ? idx + 1 : 0;
        return amostrasEstacao[prox].hora;
      });
    }, 950);
    return () => clearInterval(timer);
  }, [reproduzindo, amostrasEstacao]);

  const pontoAtual = useMemo(() => {
    return (
      amostrasEstacao.find((a) => a.hora === horaSelecionada) ||
      amostrasEstacao[0] ||
      null
    );
  }, [amostrasEstacao, horaSelecionada]);

  // Verifica se o horário atual recebe sol com ou sem vizinhos DSM
  const analiseHorario = useMemo(() => {
    if (!pontoAtual) {
      return {
        estado: "sem" as EstadoPonto,
        rotulo: "Sem dados horários",
        explicacaoCliente:
          "Selecione uma estação com dados solares disponíveis.",
        corBadge: "bg-slate-200 text-slate-700",
      };
    }

    const iluminadoGeometricamente =
      diffAngular(Number(pontoAtual.azimute), azReal) < 88 &&
      Number(pontoAtual.elevacao) > 0;

    const bloqueadoDSM =
      considerarVizinhos &&
      (pontoAtual.obstruidoReal === true ||
        String(pontoAtual.status || "").includes("obstru"));

    if (bloqueadoDSM) {
      return {
        estado: "bloqueado" as EstadoPonto,
        rotulo: "Sombra Projetada pelo Entorno (DSM)",
        explicacaoCliente: `Às ${pontoAtual.hora}h (${ROTULO_ESTACAO[estacao]}), o sol estaria de frente para a janela (elevação ${formatarNumero(
          pontoAtual.elevacao,
          0,
        )}°), mas um obstáculo vizinho intercepta os raios solares. Na prática: o ambiente recebe luz natural difusa, sem sol direto no piso.`,
        corBadge: "bg-rose-100 text-rose-800 border-rose-300",
      };
    }

    if (
      iluminadoGeometricamente ||
      pontoAtual.status === "Pleno Sol" ||
      pontoAtual.status === "Meia Sombra"
    ) {
      return {
        estado: "sol" as EstadoPonto,
        rotulo: "Incidência Solar Direta na Fachada",
        explicacaoCliente: `Às ${pontoAtual.hora}h (${ROTULO_ESTACAO[estacao]}), os raios solares atingem diretamente as janelas desta fachada (altura solar de ${formatarNumero(
          pontoAtual.elevacao,
          0,
        )}°). Na prática: excelente iluminação natural, aquecimento passivo no inverno e valorização visual do ambiente.`,
        corBadge: "bg-amber-100 text-amber-900 border-amber-300",
      };
    }

    return {
      estado: "sem" as EstadoPonto,
      rotulo: "Sombra Própria (Sol atrás da Fachada)",
      explicacaoCliente: `Às ${pontoAtual.hora}h (${ROTULO_ESTACAO[estacao]}), o sol está na direção ${
        nomeOrientacao(Number(pontoAtual.azimute)).nome
      } (${formatarNumero(
        pontoAtual.azimute,
        0,
      )}°), atrás do alinhamento desta parede. Na prática: fachada protegida de superaquecimento direto neste horário.`,
      corBadge: "bg-slate-200 text-slate-800 border-slate-300",
    };
  }, [pontoAtual, azReal, considerarVizinhos, estacao]);

  return (
    <div className="rounded-2xl border border-[#DCE4DF] bg-[#F7FAF8] overflow-hidden">
      {/* Barra de Controles do Simulador */}
      <div className="bg-white border-b border-[#DCE4DF] px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(["Verao", "Outono", "Inverno", "Primavera"] as const).map((est) => (
            <button
              key={est}
              type="button"
              onClick={() => setEstacao(est)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                estacao === est
                  ? "bg-[#255841] text-white shadow-xs"
                  : "bg-[#F7FAF8] text-[#52605B] hover:text-[#18221F] border border-[#DCE4DF]"
              }`}
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: CORES_ESTACAO[est] }}
              />
              {ROTULO_ESTACAO[est]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setConsiderarVizinhos((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
              considerarVizinhos
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-white border-[#DCE4DF] text-[#52605B]"
            }`}
          >
            <Eye className="size-3.5" />
            {considerarVizinhos
              ? "Vizinhos DSM: Ativos"
              : "Vizinhos DSM: Ocultos"}
          </button>

          <button
            type="button"
            onClick={() => setReproduzindo((r) => !r)}
            className="px-3.5 py-1.5 rounded-lg bg-[#255841] hover:bg-[#1D4633] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
          >
            {reproduzindo ? (
              <>
                <Pause className="size-3.5" /> Pausar
              </>
            ) : (
              <>
                <Play className="size-3.5" /> Simular Dia
              </>
            )}
          </button>
        </div>
      </div>

      {/* Palco Visual 2.5D + Painel Tradutor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-5 items-stretch">
        {/* Cena Arquitetônica Interativa (7 colunas) */}
        <div className="lg:col-span-7 rounded-xl border border-[#DCE4DF] bg-gradient-to-b from-sky-950 via-slate-900 to-slate-950 p-4 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-xs z-10">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-300 block">
                FACHADA {orient.nome.toUpperCase()} ({Math.round(azReal)}°)
              </span>
              <strong className="text-lg font-black">
                {pontoAtual ? `${pontoAtual.hora}:00h` : "—"} ·{" "}
                {ROTULO_ESTACAO[estacao]}
              </strong>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${analiseHorario.corBadge}`}
            >
              {analiseHorario.rotulo}
            </span>
          </div>

          {/* SVG Perspectiva Solar + Edifício + Obstáculo DSM */}
          <svg
            viewBox="0 0 520 260"
            className="w-full h-auto my-2 select-none"
          >
            <defs>
              <radialGradient id="sunGlowSim" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FDE047" stopOpacity="1" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Solo e Anéis de Distância */}
            <ellipse
              cx="260"
              cy="210"
              rx="220"
              ry="34"
              fill="#0F172A"
              stroke="#334155"
              strokeDasharray="4 4"
            />
            <ellipse
              cx="260"
              cy="210"
              rx="145"
              ry="22"
              fill="none"
              stroke="#475569"
              strokeDasharray="3 3"
            />

            {/* Arco da Trajetória Solar */}
            <path
              d="M 55 200 Q 260 25 465 200"
              fill="none"
              stroke={CORES_ESTACAO[estacao]}
              strokeWidth="2"
              strokeDasharray="5 4"
              opacity="0.75"
            />

            {/* Pontos Horários no Arco */}
            {amostrasEstacao.map((am, idx) => {
              const frac =
                amostrasEstacao.length > 1
                  ? idx / (amostrasEstacao.length - 1)
                  : 0.5;
              const x = 65 + frac * 390;
              const y =
                200 -
                Math.sin(frac * Math.PI) *
                  (80 + (Number(am.elevacao) || 20) * 0.9);
              const selecionado = am.hora === pontoAtual?.hora;
              return (
                <g
                  key={am.hora}
                  className="cursor-pointer"
                  onClick={() => {
                    setReproduzindo(false);
                    setHoraSelecionada(am.hora);
                  }}
                >
                  {selecionado && (
                    <circle
                      cx={x}
                      cy={y}
                      r="20"
                      fill="url(#sunGlowSim)"
                    />
                  )}
                  <circle
                    cx={x}
                    cy={y}
                    r={selecionado ? 8 : 4}
                    fill={
                      selecionado ? "#FDE047" : CORES_ESTACAO[estacao]
                    }
                    stroke="#0F172A"
                    strokeWidth="1.5"
                  />
                  {(selecionado || idx % 2 === 0) && (
                    <text
                      x={x}
                      y={y - 11}
                      textAnchor="middle"
                      fontSize="9"
                      fill={selecionado ? "#FDE047" : "#CBD5E1"}
                      fontWeight="bold"
                    >
                      {am.hora}h
                    </text>
                  )}
                </g>
              );
            })}

            {/* Posição do Sol Selecionado e Raio Solar */}
            {(() => {
              const idx = Math.max(
                0,
                amostrasEstacao.findIndex((a) => a.hora === pontoAtual?.hora),
              );
              const frac =
                amostrasEstacao.length > 1
                  ? idx / (amostrasEstacao.length - 1)
                  : 0.5;
              const sunX = 65 + frac * 390;
              const sunY =
                200 -
                Math.sin(frac * Math.PI) *
                  (80 + (Number(pontoAtual?.elevacao) || 20) * 0.9);

              const alvoX = 240;
              const alvoY = 155;
              const midX = (sunX + alvoX) / 2;
              const midY = (sunY + alvoY) / 2;

              return (
                <>
                  {analiseHorario.estado === "sol" && (
                    <line
                      x1={sunX}
                      y1={sunY}
                      x2={alvoX}
                      y2={alvoY}
                      stroke="#FDE047"
                      strokeWidth="2.5"
                      strokeDasharray="6 4"
                    />
                  )}
                  {analiseHorario.estado === "bloqueado" && (
                    <>
                      <line
                        x1={sunX}
                        y1={sunY}
                        x2={midX}
                        y2={midY}
                        stroke="#FB7185"
                        strokeWidth="2.5"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={midX}
                        y={midY}
                        textAnchor="middle"
                        fontSize="14"
                        fill="#FB7185"
                        fontWeight="bold"
                      >
                        ✕
                      </text>
                    </>
                  )}
                </>
              );
            })()}

            {/* Edifício Principal Analisado */}
            <g transform="translate(205, 108)">
              {/* Lateral 3D */}
              <polygon
                points="70,10 96,0 96,88 70,98"
                fill="#1E293B"
                stroke="#475569"
              />
              {/* Topo */}
              <polygon
                points="0,10 26,0 96,0 70,10"
                fill="#334155"
                stroke="#64748B"
              />
              {/* Fachada Analisada */}
              <rect
                x="0"
                y="10"
                width="70"
                height="88"
                fill={
                  analiseHorario.estado === "sol"
                    ? "#FEF3C7"
                    : analiseHorario.estado === "bloqueado"
                      ? "#FFE4E6"
                      : "#1E293B"
                }
                fillOpacity={analiseHorario.estado === "sem" ? 0.9 : 0.25}
                stroke={
                  analiseHorario.estado === "sol"
                    ? "#F59E0B"
                    : analiseHorario.estado === "bloqueado"
                      ? "#FB7185"
                      : "#64748B"
                }
                strokeWidth="2"
              />
              {/* Janelas da Fachada */}
              {[0, 1, 2].map((row) =>
                [0, 1].map((col) => (
                  <rect
                    key={`${row}-${col}`}
                    x={12 + col * 28}
                    y={22 + row * 24}
                    width="18"
                    height="14"
                    rx="2"
                    fill={
                      analiseHorario.estado === "sol"
                        ? "#FDE047"
                        : analiseHorario.estado === "bloqueado"
                          ? "#FDA4AF"
                          : "#334155"
                    }
                  />
                )),
              )}
            </g>

            {/* Obstáculo Vizinho (DSM) */}
            {considerarVizinhos && obstrucaoPrincipal && (
              <g transform="translate(345, 118)">
                <rect
                  x="0"
                  y="0"
                  width="54"
                  height="86"
                  fill="#881337"
                  fillOpacity="0.55"
                  stroke="#FB7185"
                  strokeWidth="1.5"
                  strokeDasharray="3 2"
                />
                <text
                  x="27"
                  y="-6"
                  textAnchor="middle"
                  fontSize="8.5"
                  fill="#FDA4AF"
                  fontWeight="bold"
                >
                  Vizinho DSM (
                  {formatarNumero(obstrucaoPrincipal.anguloObstrucaoGraus, 0)}°)
                </text>
              </g>
            )}
          </svg>

          {/* Slider Horário */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1.5">
              <span>Arraste para testar cada horário do dia:</span>
              <span className="font-mono font-bold text-amber-300">
                Elevação:{" "}
                {pontoAtual
                  ? `${formatarNumero(pontoAtual.elevacao, 1)}°`
                  : "—"}{" "}
                · Azimute:{" "}
                {pontoAtual
                  ? `${formatarNumero(pontoAtual.azimute, 0)}°`
                  : "—"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {amostrasEstacao.map((am) => {
                const st = estadoDoPonto(am.status);
                const ativo = am.hora === pontoAtual?.hora;
                return (
                  <button
                    key={am.hora}
                    type="button"
                    onClick={() => {
                      setReproduzindo(false);
                      setHoraSelecionada(am.hora);
                    }}
                    className={`flex-1 min-w-[38px] py-1.5 rounded-md text-[10px] font-mono font-bold transition-all border ${
                      ativo
                        ? "ring-2 ring-white scale-105"
                        : "opacity-80 hover:opacity-100"
                    } ${
                      st === "sol"
                        ? "bg-amber-400 text-slate-950 border-amber-300"
                        : st === "bloqueado"
                          ? "bg-rose-500 text-white border-rose-400"
                          : "bg-slate-800 text-slate-300 border-slate-700"
                    }`}
                  >
                    {am.hora}h
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Painel Tradutor para Cliente / Investidor (5 colunas) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4">
          <div className="rounded-xl border border-[#DCE4DF] bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#255841]">
                TRADUÇÃO PARA O CLIENTE / INVESTIDOR
              </span>
              <span className="text-[10px] font-mono text-[#7A8883]">
                {pontoAtual ? `${pontoAtual.hora}h00` : ""}
              </span>
            </div>

            <p className="text-xs text-[#18221F] leading-relaxed font-medium">
              {analiseHorario.explicacaoCliente}
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[#DCE4DF]">
              <div className="rounded-lg bg-[#F7FAF8] p-2.5">
                <span className="block text-[9px] font-bold uppercase text-[#7A8883]">
                  Horários com Sol ({ROTULO_ESTACAO[estacao]})
                </span>
                <strong className="text-base font-black text-[#255841]">
                  {
                    amostrasEstacao.filter(
                      (a) => estadoDoPonto(a.status) === "sol",
                    ).length
                  }{" "}
                  de {amostrasEstacao.length}h
                </strong>
              </div>
              <div className="rounded-lg bg-[#F7FAF8] p-2.5">
                <span className="block text-[9px] font-bold uppercase text-[#7A8883]">
                  Bloqueios do Entorno
                </span>
                <strong className="text-base font-black text-rose-700">
                  {
                    amostrasEstacao.filter(
                      (a) => estadoDoPonto(a.status) === "bloqueado",
                    ).length
                  }{" "}
                  horários
                </strong>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#CFE0D6] bg-[#EBF3EE] p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#255841] mb-1">
              ARGUMENTO COMERCIAL & TÉCNICO
            </p>
            <p className="text-xs text-[#18221F] leading-relaxed">
              Use o botão <strong>"Vizinhos DSM: Ativos / Ocultos"</strong> acima
              durante a reunião para demonstrar ao cliente como os prédios e
              árvores do entorno alteram a insolação real do imóvel em relação a
              uma bússola comum.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   COMPONENTE PRINCIPAL DA ROTA
──────────────────────────────────────────────────────────────────────── */

export default function VectorZoneamento() {
  const { obraId } = Route.useSearch();
  const [form, setForm] = useState({
    cep: "",
    logradouro: "",
    numero: "",
    bairro: "",
    cidade: "",
    uf: "",
    andar: "",
    modalidade: "obra_nova" as "obra_nova" | "reforma",
    finalidadeAnalise: "imovel_existente" as "imovel_existente" | "projeto",
    tipoImovel: "",
    fachada: "" as string,
    nomeProjeto: "",
    espessuraMaterial: "15",
    lat: null as number | null,
    lng: null as number | null,
    placeId: "",
  });
  const router = useRouter();

  const voltar = () => {
    if (window.history.length > 1) router.history.back();
    else router.navigate({ to: "/" });
  };

  const [loading, setLoading] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [localConfirmado, setLocalConfirmado] = useState(false);
  const [erroLocalizacao, setErroLocalizacao] = useState("");
  const [formAberto, setFormAberto] = useState(false);
  const [dadosBioclimaticos, setDadosBioclimaticos] = useState<any>(null);
  const [modoVisualizacao, setModoVisualizacao] = useState<
    "completo" | "simulador" | "laudo"
  >("completo");

  const relatorioRef = useRef<HTMLDivElement>(null);
  const simuladorRef = useRef<HTMLElement>(null);

  const irParaElemento = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  async function fetchCEP(cep: string) {
    const cleanCEP = cep.replace(/\D/g, "");
    if (cleanCEP.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast.error("CEP não encontrado.");
        return;
      }
      setForm((prev) => ({
        ...prev,
        logradouro: data.logradouro || prev.logradouro,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        uf: data.uf || prev.uf,
        lat: null,
        lng: null,
        placeId: "",
      }));
      setLocalConfirmado(false);
      setErroLocalizacao("");
      toast.success("Endereço preenchido!");
    } catch {
      toast.error("Erro ao buscar CEP.");
    }
  }

  const handleCEPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 5) val = val.replace(/^(\d{5})(\d)/, "$1-$2");
    setForm({ ...form, cep: val });
    if (val.replace("-", "").length === 8) fetchCEP(val);
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !form.logradouro ||
      !form.cidade ||
      !form.uf ||
      !form.fachada ||
      !form.nomeProjeto
    ) {
      toast.error(
        "Preencha os campos obrigatórios (Rua, Cidade, UF, Fachada e Projeto)",
      );
      return;
    }
    if (
      !localConfirmado ||
      typeof form.lat !== "number" ||
      typeof form.lng !== "number"
    ) {
      toast.error(
        "Marque o prédio no mapa e confirme o local antes de continuar.",
      );
      return;
    }
    setConfirmando(true);
  }

  async function executarAnalise() {
    if (
      !localConfirmado ||
      typeof form.lat !== "number" ||
      typeof form.lng !== "number"
    ) {
      setConfirmando(false);
      toast.error(
        "Marque o prédio no mapa e confirme o local antes de continuar.",
      );
      return;
    }
    setConfirmando(false);
    setFormAberto(false);
    const analiseId = obraId || crypto.randomUUID();
    setLoading(true);
    const enderecoCompleto = `${form.logradouro}, ${form.numero}${
      form.bairro ? " - " + form.bairro : ""
    }, ${form.cidade} - ${form.uf}, Brasil`;

    const payload = {
      obraId: analiseId,
      nome: form.nomeProjeto,
      endereco: enderecoCompleto,
      enderecoCompleto: enderecoCompleto,
      rua: form.logradouro,
      bairro: form.bairro,
      cidade: form.cidade,
      estado: form.uf,
      pais: "Brasil",
      modalidade:
        form.finalidadeAnalise === "imovel_existente"
          ? "reforma"
          : form.modalidade,
      finalidadeAnalise: form.finalidadeAnalise,
      tipoImovel: form.tipoImovel,
      fachada: form.fachada,
      andar: form.andar ? Number(form.andar) : 0,
      espessuraMaterial: form.espessuraMaterial
        ? Number(form.espessuraMaterial)
        : 15,
      lat: Number(form.lat.toFixed(7)),
      lng: Number(form.lng.toFixed(7)),
      ...(form.placeId ? { placeId: form.placeId } : {}),
    };
    try {
      const res = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Falha de comunicação com o webhook n8n");

      const data = await res.json();
      const respostaBackend = Array.isArray(data)
        ? data[0]
        : data?.data || data?.body || data;
      if (
        respostaBackend?.disponivel === false &&
        respostaBackend?.status === "fachada_nao_localizada"
      ) {
        const mensagem =
          respostaBackend.mensagem ||
          "Não foi possível localizar a fachada nesse ponto. Reposicione o pino e tente novamente.";
        setErroLocalizacao(mensagem);
        setLocalConfirmado(false);
        setFormAberto(true);
        toast.error(mensagem);
        return;
      }
      const analiseNormalizada = normalizarAnalise(data);

      setDadosBioclimaticos(analiseNormalizada);
      await persistirAnaliseVectorX(analiseId, analiseNormalizada);
      toast.success("Mapeamento concluído!");
    } catch (err) {
      console.error("Erro ao processar IA:", err);
      toast.error("Falha ao processar dados com o motor de IA.");
    } finally {
      setLoading(false);
    }
  }

  const fachadaAtual =
    dadosBioclimaticos?.fachada?.replace(/"/g, "") || form.fachada;
  const sombreamentoReal = dadosBioclimaticos?.sombreamento_real;
  const potencialFotovoltaicoBruto = dadosBioclimaticos?.potencial_fotovoltaico;
  const potencialFotovoltaico = normalizarPotencialFotovoltaico(
    potencialFotovoltaicoBruto &&
      typeof potencialFotovoltaicoBruto === "object"
      ? (potencialFotovoltaicoBruto as Record<
          string,
          number | string | undefined
        >)
      : null,
  );

  const extrairMm = (texto?: string | null): number | null => {
    const m = String(texto ?? "").match(/(\d+(?:[.,]\d+)?)\s*mm/i);
    return m ? Number(m[1].replace(",", ".")) : null;
  };

  const chuvaMilimetros =
    dadosBioclimaticos?.potencial_hidrico?.precipitacao_mm ??
    extrairMm(dadosBioclimaticos?.potencial_hidrico?.indice_chuvas);

  const areaTelhado = obterAreaTelhadoComOrigem(
    dadosBioclimaticos?.potencial_hidrico &&
      typeof dadosBioclimaticos.potencial_hidrico === "object"
      ? (dadosBioclimaticos.potencial_hidrico as Record<string, unknown>)
      : null,
    potencialFotovoltaicoBruto &&
      typeof potencialFotovoltaicoBruto === "object"
      ? (potencialFotovoltaicoBruto as Record<string, unknown>)
      : null,
  );

  const perfilHorizonteReal =
    dadosBioclimaticos?.horizontePerfil ??
    sombreamentoReal?.perfil_horizonte ??
    sombreamentoReal?.perfil ??
    [];

  const economiaAgua = calcularEconomiaAgua(
    chuvaMilimetros,
    areaTelhado.areaM2,
  );
  const economiaSolar = potencialFotovoltaico
    ? calcularEconomiaSolar(potencialFotovoltaico.geracaoAnualMaximaKwh)
    : null;

  const exportarPDF = async () => {
    if (modoVisualizacao === "simulador") {
      setModoVisualizacao("completo");
      await new Promise((r) => setTimeout(r, 150));
    }
    gerarPDFPaginado(
      relatorioRef,
      `Laudo_Bioclimatico_${(form.nomeProjeto || "VectorX").replace(
        /\s+/g,
        "_",
      )}`,
    );
  };

  const percentualReal = dadosBioclimaticos?.resumo?.percentualIluminacao;
  const fonteSombreamentoResumo =
    dadosBioclimaticos?.resumo?.fonteSombreamento;
  const calculoSolarAtual =
    dadosBioclimaticos?.classificacao || dadosBioclimaticos?.calculo_solar;

  const leituraSolar = useMemo(
    () => resumirExposicaoSolar(calculoSolarAtual, perfilHorizonteReal),
    [calculoSolarAtual, perfilHorizonteReal],
  );

  const azimuteFachadaAtual = useMemo(() => {
    const real = Number(
      sombreamentoReal?.azimute_fachada_usado ??
        sombreamentoReal?.azimuteFachadaUsado,
    );
    if (Number.isFinite(real)) return real;
    const chave = String(fachadaAtual || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return AZIMUTE_POR_FACHADA[chave] ?? null;
  }, [
    fachadaAtual,
    sombreamentoReal?.azimute_fachada_usado,
    sombreamentoReal?.azimuteFachadaUsado,
  ]);

  const bloqueios = useMemo(
    () => calcularBloqueios(calculoSolarAtual, perfilHorizonteReal),
    [calculoSolarAtual, perfilHorizonteReal],
  );

  const setoresEntorno = useMemo(
    () =>
      resumirEntornoPorSetor(
        perfilHorizonteReal,
        azimuteFachadaAtual,
        calculoSolarAtual,
        bloqueios,
      ),
    [perfilHorizonteReal, azimuteFachadaAtual, calculoSolarAtual, bloqueios],
  );

  const pontoPrincipal = useMemo(
    () =>
      escolherObstaculoPrincipal(
        perfilHorizonteReal,
        azimuteFachadaAtual,
        calculoSolarAtual,
      ),
    [perfilHorizonteReal, azimuteFachadaAtual, calculoSolarAtual],
  );

  const direcaoPrincipal = useMemo(() => {
    if (!pontoPrincipal) return undefined;
    return setoresEntorno.find((s) => s.pico?.azimute === pontoPrincipal.azimute)
      ?.direcao;
  }, [setoresEntorno, pontoPrincipal]);

  const obstrucaoPrincipal = useMemo(() => {
    const p = pontoPrincipal;
    if (!p || !direcaoPrincipal) return null;
    return {
      azimute: p.azimute,
      direcao: direcaoPrincipal,
      anguloObstrucaoGraus: p.anguloObstrucaoGraus,
      distanciaMetros: p.distanciaObstaculoMetros,
      alturaMetros:
        p.alturaObstaculoAcimaDoSoloMetros ?? p.alturaObstaculoMetros,
      mascara: p.ponto?.mascara ?? null,
    };
  }, [pontoPrincipal, direcaoPrincipal]);

  useEffect(() => {
    if (!formAberto) return;
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setFormAberto(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formAberto]);

  return (
    <div className="min-h-screen bg-canvas text-ink-soft font-sans selection:bg-brand-soft selection:text-ink flex flex-col md:flex-row relative">
      <Toaster theme="light" position="top-center" />

      {loading && !dadosBioclimaticos && (
        <div className="fixed inset-0 z-[100] bg-canvas/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl">
            <AnaliseLoadingState />
          </div>
        </div>
      )}

      {confirmando && (
        <div className="fixed inset-0 z-[70] bg-ink/40 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-surface border border-line rounded-3xl p-8 max-w-md w-full shadow-[0_24px_80px_rgba(46,53,50,0.18)]">
            <h3 className="text-sm font-semibold text-ink mb-4">
              Confirme os dados desta análise
            </h3>
            <p className="text-sm text-ink mb-1">
              {form.logradouro}
              {form.numero ? `, ${form.numero}` : ""}
              {form.bairro ? ` - ${form.bairro}` : ""}
            </p>
            <p className="text-sm text-ink mb-4">
              {form.cidade} - {form.uf}
            </p>
            <p className="text-xs text-ink-soft mb-6">
              Finalidade:{" "}
              <strong className="text-ink">
                {form.finalidadeAnalise === "imovel_existente"
                  ? "Avaliar imóvel existente"
                  : "Projeto ou obra"}
              </strong>
              {form.tipoImovel && (
                <>
                  {" "}
                  · <strong className="text-ink">{form.tipoImovel}</strong>
                </>
              )}
              <br />
              Fachada: <strong className="text-ink">{form.fachada}</strong>
              {form.andar ? (
                <>
                  {" "}
                  · Andar <strong className="text-ink">{form.andar}º</strong>
                </>
              ) : null}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setConfirmando(false)}
                className="flex-1 rounded-full border-line text-ink-soft hover:bg-surface-soft"
              >
                Voltar e corrigir
              </Button>
              <Button
                onClick={executarAnalise}
                className="flex-1 rounded-full bg-brand-strong hover:bg-brand text-white font-semibold"
              >
                Confirmar e gerar leitura
              </Button>
            </div>
          </div>
        </div>
      )}

      {formAberto && (
        <div
          className="fixed inset-0 z-[60] bg-ink/30 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setFormAberto(false)}
        />
      )}

      <aside
        aria-hidden={!formAberto}
        className={`fixed inset-y-0 left-0 z-[65] w-full sm:w-[560px] xl:w-[640px] bg-surface border-r border-line flex flex-col shadow-[8px_0_32px_rgba(46,53,50,0.08)] transition-[transform,opacity,visibility] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          formAberto
            ? "translate-x-0 scale-100 opacity-100 visible"
            : "-translate-x-full scale-[0.98] opacity-0 invisible"
        }`}
      >
        <div className="relative overflow-hidden p-6 pb-5 border-b border-line bg-brand-soft/50">
          <button
            onClick={() => setFormAberto(false)}
            className="flex items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-brand-strong transition-colors mb-4"
          >
            <X className="size-3.5" /> Fechar
          </button>
          <div className="flex items-center gap-3 mb-5">
            <div className="size-8 rounded-xl bg-brand-soft border border-line flex items-center justify-center">
              <Cpu className="size-4 text-brand-strong" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter text-ink">
                VECTOR<span className="text-brand">-X</span>
              </h1>
              <p className="text-xs font-medium text-brand-strong">
                Inteligência Bioclimática
              </p>
            </div>
          </div>
          {!dadosBioclimaticos && (
            <>
              <p className="text-xs font-medium text-brand-strong mb-2">
                Leitura solar do endereço
              </p>
              <h2 className="text-2xl font-semibold leading-tight text-ink">
                Descubra como o sol chega a este imóvel.
              </h2>
            </>
          )}
        </div>

        {!dadosBioclimaticos ? (
          <form
            onSubmit={submit}
            className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 custom-scrollbar"
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-ink-soft">
                  O que você quer avaliar?
                </Label>
                <Select
                  value={form.finalidadeAnalise}
                  onValueChange={(v: "imovel_existente" | "projeto") =>
                    setForm({ ...form, finalidadeAnalise: v })
                  }
                >
                  <SelectTrigger className="h-11 rounded-xl border border-brand/30 bg-brand-soft/60 text-ink font-medium">
                    <SelectValue placeholder="Escolha o objetivo" />
                  </SelectTrigger>
                  <SelectContent className="z-[80] rounded-xl bg-surface border-line text-ink">
                    <SelectItem value="imovel_existente">
                      Imóvel existente: moradia ou compra
                    </SelectItem>
                    <SelectItem value="projeto">
                      Projeto, obra nova ou reforma
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-ink-soft">
                    Tipo de imóvel
                  </Label>
                  <Select
                    value={form.tipoImovel}
                    onValueChange={(v) => setForm({ ...form, tipoImovel: v })}
                  >
                    <SelectTrigger className="h-11 rounded-xl border border-line bg-surface-soft text-ink">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="z-[80] rounded-xl bg-surface border-line text-ink">
                      <SelectItem value="Apartamento">Apartamento</SelectItem>
                      <SelectItem value="Casa">Casa</SelectItem>
                      <SelectItem value="Outro imóvel">Outro imóvel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-ink-soft">
                    Nome para identificar
                  </Label>
                  <Input
                    value={form.nomeProjeto}
                    onChange={(e) =>
                      setForm({ ...form, nomeProjeto: e.target.value })
                    }
                    className="h-11 rounded-xl border-line bg-surface-soft text-ink"
                    placeholder="Ex: Edifício Aurora"
                  />
                </div>
              </div>

              <div className="border-t border-line pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_100px]">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-ink-soft">
                      CEP
                    </Label>
                    <Input
                      value={form.cep}
                      onChange={handleCEPChange}
                      placeholder="00000-000"
                      maxLength={9}
                      className="h-11 rounded-xl border-line bg-surface-soft text-ink"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-ink-soft">
                      Número
                    </Label>
                    <Input
                      value={form.numero}
                      onChange={(e) =>
                        setForm({ ...form, numero: e.target.value })
                      }
                      placeholder="123"
                      className="h-11 rounded-xl border-line bg-surface-soft text-ink"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-ink-soft">
                      Andar
                    </Label>
                    <Input
                      value={form.andar}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          andar: e.target.value.replace(/\D/g, ""),
                        })
                      }
                      placeholder="0"
                      className="h-11 rounded-xl border-line bg-surface-soft text-ink"
                    />
                  </div>
                </div>

                <SeletorLocalizacao
                  apiKey={GOOGLE_MAPS_API_KEY}
                  logradouro={form.logradouro}
                  numero={form.numero}
                  cidade={form.cidade}
                  uf={form.uf}
                  ponto={
                    form.lat !== null && form.lng !== null
                      ? { lat: form.lat, lng: form.lng }
                      : null
                  }
                  onEnderecoChange={(logradouro) => {
                    setForm((prev) => ({
                      ...prev,
                      logradouro,
                      lat: null,
                      lng: null,
                      placeId: "",
                    }));
                    setLocalConfirmado(false);
                    setErroLocalizacao("");
                  }}
                  onPontoChange={(ponto) => {
                    setForm((prev) => ({
                      ...prev,
                      lat: ponto.lat,
                      lng: ponto.lng,
                      placeId: "",
                    }));
                    setLocalConfirmado(false);
                    setErroLocalizacao("");
                  }}
                  onLocalSelecionado={(local) => {
                    const encontrarComponente = (tipo: string) =>
                      local.componentes.find((c: any) =>
                        c.types.includes(tipo),
                      );
                    const rua = encontrarComponente("route")?.long_name;
                    const numero =
                      encontrarComponente("street_number")?.long_name;
                    const bairro =
                      encontrarComponente("neighborhood")?.long_name ||
                      encontrarComponente("sublocality_level_1")?.long_name ||
                      encontrarComponente("sublocality")?.long_name;
                    const cidade =
                      encontrarComponente("locality")?.long_name ||
                      encontrarComponente("administrative_area_level_2")
                        ?.long_name;
                    const estado = encontrarComponente(
                      "administrative_area_level_1",
                    )?.short_name;
                    const cep = encontrarComponente("postal_code")?.long_name;
                    setForm((prev) => ({
                      ...prev,
                      logradouro: rua || local.endereco || prev.logradouro,
                      numero: numero || prev.numero,
                      bairro: bairro || prev.bairro,
                      cidade: cidade || prev.cidade,
                      uf: estado || prev.uf,
                      cep: cep || prev.cep,
                      lat: Number(local.ponto.lat.toFixed(7)),
                      lng: Number(local.ponto.lng.toFixed(7)),
                      placeId: local.placeId,
                    }));
                    setLocalConfirmado(false);
                    setErroLocalizacao("");
                  }}
                />

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-soft p-3">
                  <p className="min-w-0 flex-1 text-xs text-ink-soft">
                    {form.lat !== null && form.lng !== null
                      ? `Pino: ${form.lat.toFixed(6)}, ${form.lng.toFixed(6)}${
                          localConfirmado
                            ? " · local confirmado"
                            : " · confirme para continuar"
                        }`
                      : "Escolha um resultado ou clique no mapa para marcar o prédio."}
                  </p>
                  <Button
                    type="button"
                    onClick={() => {
                      setLocalConfirmado(true);
                      setErroLocalizacao("");
                    }}
                    disabled={form.lat === null || form.lng === null}
                    className="shrink-0 rounded-full bg-brand-strong text-white hover:bg-brand disabled:opacity-40"
                  >
                    Confirmar local
                  </Button>
                </div>

                {erroLocalizacao && (
                  <p className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800">
                    {erroLocalizacao}
                  </p>
                )}

                <div className="grid grid-cols-[1fr_60px] gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-ink-soft">
                      Cidade
                    </Label>
                    <Input
                      value={form.cidade}
                      onChange={(e) =>
                        setForm({ ...form, cidade: e.target.value })
                      }
                      className="h-11 rounded-xl border-line bg-surface-soft text-ink"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-ink-soft">
                      UF
                    </Label>
                    <Input
                      value={form.uf}
                      onChange={(e) =>
                        setForm({ ...form, uf: e.target.value.toUpperCase() })
                      }
                      maxLength={2}
                      className="h-11 rounded-xl border-line bg-surface-soft text-center text-ink"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <Label className="text-xs font-medium text-ink-soft flex items-center gap-1.5">
                  <Compass className="size-3" /> Qual fachada ou orientação quer
                  analisar?
                </Label>
                <Select
                  value={form.fachada}
                  onValueChange={(v) => setForm({ ...form, fachada: v })}
                >
                  <SelectTrigger className="h-11 rounded-xl border border-brand/30 bg-brand-soft/60 text-ink font-medium">
                    <SelectValue placeholder="Selecione a fachada..." />
                  </SelectTrigger>
                  <SelectContent className="z-[80] rounded-xl bg-surface border-line text-ink">
                    <SelectItem value="Norte">
                      Norte (Maior Insolação)
                    </SelectItem>
                    <SelectItem value="Sul">Sul (Menor Insolação)</SelectItem>
                    <SelectItem value="Leste">Leste (Sol da Manhã)</SelectItem>
                    <SelectItem value="Oeste">Oeste (Sol da Tarde)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </form>
        ) : (
          <div className="flex-1 p-6 space-y-5 overflow-y-auto">
            <div className="flex items-center gap-2 text-xs font-medium text-ink-soft">
              <ShieldCheck className="size-3.5" /> Parâmetros consolidados
            </div>
            <div className="space-y-2 text-sm text-ink-soft bg-surface-soft border border-line p-4 rounded-2xl">
              <p className="font-semibold text-ink">{form.nomeProjeto}</p>
              <p>
                {form.logradouro}
                {form.numero ? `, ${form.numero}` : ""}
              </p>
              <p>
                {form.cidade} - {form.uf}
              </p>
              <p className="text-brand-strong font-semibold text-xs pt-2 border-t border-line mt-2">
                Fachada: {fachadaAtual}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setDadosBioclimaticos(null);
                setForm({
                  cep: "",
                  logradouro: "",
                  numero: "",
                  bairro: "",
                  cidade: "",
                  uf: "",
                  andar: "",
                  modalidade: "obra_nova",
                  finalidadeAnalise: "imovel_existente",
                  tipoImovel: "",
                  fachada: "",
                  nomeProjeto: "",
                  espessuraMaterial: "15",
                  lat: null,
                  lng: null,
                  placeId: "",
                });
                router.navigate({
                  to: "/wellness-analise-solar",
                  search: { obraId: undefined },
                });
              }}
              className="w-full mt-4 rounded-full border-line bg-surface text-brand-strong hover:bg-brand-soft"
            >
              Iniciar nova análise
            </Button>
          </div>
        )}

        {!dadosBioclimaticos && (
          <div className="p-6 border-t border-line bg-surface">
            <Button
              onClick={submit}
              disabled={loading}
              className="w-full h-12 rounded-full bg-brand-strong text-white font-semibold hover:bg-brand"
            >
              GERAR LEITURA SOLAR
            </Button>
          </div>
        )}
      </aside>

      <main className="flex-1 w-full min-w-0 min-h-screen bg-canvas p-4 md:p-8 custom-scrollbar">
        <div className="max-w-5xl mx-auto flex items-center justify-between mb-6">
          <button
            onClick={voltar}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-ink-soft hover:text-brand-strong transition-colors"
          >
            <ArrowLeft className="size-3.5" /> Voltar
          </button>

          <Button
            onClick={() => setFormAberto(true)}
            variant="outline"
            className="h-9 rounded-full border-line bg-surface text-brand-strong hover:bg-brand-soft text-xs font-bold uppercase tracking-wider"
          >
            {dadosBioclimaticos ? (
              <>
                <ShieldCheck className="size-3.5 mr-2" /> Parâmetros da análise
              </>
            ) : (
              <>
                <Target className="size-3.5 mr-2" /> Analisar um endereço
              </>
            )}
          </Button>
        </div>

        {!dadosBioclimaticos && !loading && (
          <div className="max-w-5xl mx-auto py-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-soft text-xs font-medium text-brand-strong mb-4">
              <Sparkles className="size-3" /> Motor de Engenharia Bioclimática
            </div>
            <h1 className="max-w-4xl text-3xl md:text-5xl font-semibold text-ink tracking-tight mb-4">
              Incidência Solar <br />
              <span className="text-brand">
                Descubra como o sol chega ao imóvel.
              </span>
            </h1>
            <p className="text-ink-soft max-w-2xl text-sm md:text-base leading-relaxed">
              Avalie uma casa ou apartamento existente, confira um endereço
              antes de comprar ou use os dados para planejar uma obra com laudo
              executivo A4 e simulador interativo.
            </p>
            <Button
              onClick={() => setFormAberto(true)}
              className="mt-6 h-12 px-6 bg-brand-strong text-white rounded-full hover:bg-brand font-semibold"
            >
              <Target className="size-4 mr-2" /> Analisar um endereço
            </Button>
          </div>
        )}

        {dadosBioclimaticos && !loading && (
          <div className="max-w-[850px] mx-auto space-y-6 pb-20">
            {/* ── BARRA DE COMANDO FIXA (SALTO RÁPIDO + MODO CLIENTE + EXPORTAR PDF) ── */}
            <div className="sticky top-3 z-30 bg-white/95 backdrop-blur-md border border-[#DCE4DF] rounded-2xl p-3 shadow-md space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 bg-[#F7FAF8] p-1 rounded-xl border border-[#DCE4DF]">
                  <button
                    type="button"
                    onClick={() => setModoVisualizacao("completo")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      modoVisualizacao === "completo"
                        ? "bg-[#255841] text-white"
                        : "text-[#52605B] hover:text-[#18221F]"
                    }`}
                  >
                    Laudo + Simulador
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoVisualizacao("simulador")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      modoVisualizacao === "simulador"
                        ? "bg-[#255841] text-white"
                        : "text-[#52605B] hover:text-[#18221F]"
                    }`}
                  >
                    Modo Cliente (3D)
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoVisualizacao("laudo")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      modoVisualizacao === "laudo"
                        ? "bg-[#255841] text-white"
                        : "text-[#52605B] hover:text-[#18221F]"
                    }`}
                  >
                    Apenas Laudo A4
                  </button>
                </div>

                <Button
                  onClick={exportarPDF}
                  className="bg-[#255841] hover:bg-[#1D4633] text-white rounded-full h-9 px-4 text-xs font-bold uppercase tracking-wider"
                >
                  <Download className="size-3.5 mr-1.5" /> Baixar Laudo PDF (A4)
                </Button>
              </div>

              {/* Atalhos diretos para cada página e para o Simulador no final */}
              {modoVisualizacao !== "simulador" && (
                <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-[#DCE4DF] text-[11px]">
                  <span className="text-[10px] font-mono uppercase text-[#7A8883] mr-1 shrink-0">
                    Ir para:
                  </span>
                  {[
                    { id: "pdf-page-1", label: "01. Capa" },
                    { id: "pdf-page-2", label: "02. NBR 15220" },
                    { id: "pdf-page-3", label: "03. Carta Solar" },
                    { id: "pdf-page-4", label: "04. Matriz Horária" },
                    { id: "pdf-page-5", label: "05. Entorno DSM" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => irParaElemento(p.id)}
                      className="px-2.5 py-1 rounded-md bg-[#F7FAF8] hover:bg-[#EBF3EE] text-[#18221F] font-semibold border border-[#DCE4DF] shrink-0"
                    >
                      {p.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      simuladorRef.current?.scrollIntoView({
                        behavior: "smooth",
                      })
                    }
                    className="ml-auto px-3 py-1 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold border border-amber-300 shrink-0"
                  >
                    ★ Ir para Simulador 3D ↓
                  </button>
                </div>
              )}
            </div>

            {/* ── CONTAINER DE PÁGINAS A4 PARA EXPORTAÇÃO PDF ── */}
            {modoVisualizacao !== "simulador" && (
              <div
                ref={relatorioRef}
                className="bg-surface-soft flex flex-col gap-8 p-2 sm:p-4 rounded-xl"
              >
                {/* PÁGINA 1: CAPA EXECUTIVA */}
                <PaginaCapaExecutiva
                  nomeProjeto={form.nomeProjeto || "Projeto Bioclimático"}
                  endereco={
                    dadosBioclimaticos.endereco ||
                    `${form.logradouro}${
                      form.numero ? ", " + form.numero : ""
                    }${form.bairro ? " - " + form.bairro : ""}, ${
                      form.cidade
                    } - ${form.uf}`
                  }
                  fachada={fachadaAtual}
                  azimuteReal={azimuteFachadaAtual}
                  zona={dadosBioclimaticos.zona}
                  subzona={dadosBioclimaticos.subzona}
                  caracteristicaZona={dadosBioclimaticos.caracteristica}
                  nota={dadosBioclimaticos.score_bioclimatico?.nota}
                  resumoScore={dadosBioclimaticos.score_bioclimatico?.resumo}
                  fonteSolar={
                    fonteSombreamentoResumo === "perfil_real_dsm"
                      ? "Trajetória + Satélite DSM"
                      : "Trajetória Calculada"
                  }
                  clima={{
                    tempMedia: dadosBioclimaticos.temp_media,
                    tempMin: dadosBioclimaticos.temp_bulbo_seco_min,
                    tempMax: dadosBioclimaticos.temp_bulbo_seco_max,
                    umidade: dadosBioclimaticos.umidade_media,
                    radiacao: dadosBioclimaticos.radiacao_media,
                  }}
                  economiaAgua={economiaAgua}
                  economiaSolar={economiaSolar}
                  potencialFotovoltaico={potencialFotovoltaico}
                />

                {/* PÁGINA 2: DIAGNÓSTICO NORMATIVO DA ZONA BIOCLIMÁTICA */}
                <div
                  id="pdf-page-2"
                  className="pdf-page bg-white w-full aspect-[210/297] rounded-md shadow-sm border border-[#DCE4DF] overflow-hidden relative text-[#18221F] p-8 flex flex-col"
                >
                  <RunningHeader
                    projeto={form.nomeProjeto}
                    secao="ENQUADRAMENTO NORMATIVO · ABNT NBR 15220-3"
                    pagina={2}
                  />

                  <div className="flex items-start justify-between border-b border-[#DCE4DF] pb-3 mb-3.5 gap-4">
                    <div>
                      <h2 className="text-xl font-black text-[#18221F]">
                        Zona Bioclimática {dadosBioclimaticos.zona}
                        {dadosBioclimaticos.subzona} ·{" "}
                        {dadosBioclimaticos.caracteristica ||
                          "Classificação Oficial"}
                      </h2>
                      <p className="text-[10.5px] text-[#52605B] mt-0.5">
                        Município:{" "}
                        <strong className="text-[#18221F]">
                          {dadosBioclimaticos.municipio || form.cidade}/
                          {dadosBioclimaticos.uf || form.uf}
                        </strong>
                        {dadosBioclimaticos.nome_estacao && (
                          <>
                            {" "}
                            · Estação INMET: {
                              dadosBioclimaticos.nome_estacao
                            } (
                            {formatarNumero(
                              dadosBioclimaticos.distancia_km,
                              1,
                            )}{" "}
                            km)
                          </>
                        )}
                      </p>
                    </div>
                    {dadosBioclimaticos.intervalo_nbr15575 && (
                      <span className="rounded-lg bg-[#EBF3EE] border border-[#3A7D5E]/30 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#255841]">
                        NBR 15575 · {dadosBioclimaticos.intervalo_nbr15575}
                      </span>
                    )}
                  </div>

                  <div className="bg-[#F7FAF8] border border-[#DCE4DF] rounded-xl p-3.5 mb-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#255841] mb-1">
                      COMPORTAMENTO HIGROTÉRMICO REGIONAL
                    </p>
                    <p className="text-[10.5px] text-[#18221F] leading-relaxed font-medium">
                      {dadosBioclimaticos.resumo_climatico ||
                        `O município de ${
                          dadosBioclimaticos.municipio || form.cidade
                        } insere-se na Zona Bioclimática ${
                          dadosBioclimaticos.zona
                        }${dadosBioclimaticos.subzona}, demandando estratégias construtivas adaptadas às condições térmicas e de umidade locais.`}
                    </p>
                  </div>

                  {(dadosBioclimaticos.desafio_inverno ||
                    dadosBioclimaticos.desafio_verao) && (
                    <div className="grid grid-cols-2 gap-3 mb-3.5">
                      <div className="rounded-xl bg-sky-50/80 border border-sky-200 p-3">
                        <p className="text-[8.5px] font-black uppercase tracking-[0.14em] text-sky-900">
                          SOLICITAÇÃO DE INVERNO
                        </p>
                        <p className="text-[10px] leading-snug text-[#18221F] mt-1">
                          {dadosBioclimaticos.desafio_inverno ||
                            "Exige controle de perda térmica e aproveitamento de insolação direta nos ambientes de permanência."}
                        </p>
                      </div>
                      <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-3">
                        <p className="text-[8.5px] font-black uppercase tracking-[0.14em] text-amber-900">
                          SOLICITAÇÃO DE VERÃO
                        </p>
                        <p className="text-[10px] leading-snug text-[#18221F] mt-1">
                          {dadosBioclimaticos.desafio_verao ||
                            "Exige sombreamento seletivo das aberturas e ventilação cruzada para dissipação térmica."}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex-1 min-h-0 flex flex-col">
                    <h3 className="text-[9.5px] font-black uppercase tracking-[0.14em] text-[#18221F] mb-2">
                      DIRETRIZES CONSTRUTIVAS RECOMENDADAS
                    </h3>
                    {(() => {
                      const confortoDetalhado: Array<{
                        diretriz: string;
                        detalhamento?: string;
                      }> =
                        Array.isArray(
                          dadosBioclimaticos.diretrizes_conforto_detalhadas,
                        ) &&
                        dadosBioclimaticos.diretrizes_conforto_detalhadas
                          .length > 0
                          ? dadosBioclimaticos.diretrizes_conforto_detalhadas
                          : (Array.isArray(
                              dadosBioclimaticos.estrategias_conforto,
                            )
                              ? dadosBioclimaticos.estrategias_conforto
                              : []
                            ).map((d: string) => ({
                              diretriz: d,
                              detalhamento:
                                "Estratégia passiva catalogada para esta subzona bioclimática.",
                            }));

                      const resilienciaDetalhada: Array<{
                        diretriz: string;
                        detalhamento?: string;
                      }> =
                        Array.isArray(
                          dadosBioclimaticos.diretrizes_resiliencia_detalhadas,
                        ) &&
                        dadosBioclimaticos.diretrizes_resiliencia_detalhadas
                          .length > 0
                          ? dadosBioclimaticos.diretrizes_resiliencia_detalhadas
                          : (Array.isArray(
                              dadosBioclimaticos.estrategias_resiliencia,
                            )
                              ? dadosBioclimaticos.estrategias_resiliencia
                              : []
                            ).map((d: string) => ({
                              diretriz: d,
                              detalhamento:
                                "Medida de adaptação física para eventos climáticos extremos locais.",
                            }));

                      return (
                        <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
                          <div className="rounded-xl border border-[#DCE4DF] bg-[#F7FAF8] p-3 space-y-2">
                            <p className="text-[8.5px] font-black uppercase tracking-wider text-[#255841]">
                              Conforto Térmico ({confortoDetalhado.length})
                            </p>
                            {confortoDetalhado.slice(0, 4).map((item, idx) => (
                              <div
                                key={idx}
                                className="rounded-lg bg-white border border-[#DCE4DF] p-2.5"
                              >
                                <p className="text-[10px] font-bold text-[#18221F] leading-tight">
                                  {item.diretriz}
                                </p>
                                {item.detalhamento && (
                                  <p className="text-[9px] text-[#52605B] leading-snug mt-0.5">
                                    {item.detalhamento}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="rounded-xl border border-[#DCE4DF] bg-[#F7FAF8] p-3 space-y-2">
                            <p className="text-[8.5px] font-black uppercase tracking-wider text-[#18221F]">
                              Resiliência Climática ({resilienciaDetalhada.length})
                            </p>
                            {resilienciaDetalhada
                              .slice(0, 4)
                              .map((item, idx) => (
                                <div
                                  key={idx}
                                  className="rounded-lg bg-white border border-[#DCE4DF] p-2.5"
                                >
                                  <p className="text-[10px] font-bold text-[#18221F] leading-tight">
                                    {item.diretriz}
                                  </p>
                                  {item.detalhamento && (
                                    <p className="text-[9px] text-[#52605B] leading-snug mt-0.5">
                                      {item.detalhamento}
                                    </p>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <RunningFooter />
                </div>

                {/* PÁGINA 3: CARTA SOLAR */}
                <PaginaCartaSolar
                  nomeProjeto={form.nomeProjeto}
                  fachadaAtual={fachadaAtual}
                  sombreamentoReal={sombreamentoReal}
                  calculoSolarAtual={calculoSolarAtual}
                  percentualReal={percentualReal}
                  fonteSombreamentoResumo={fonteSombreamentoResumo}
                  leituraSolar={leituraSolar}
                  obstrucaoPrincipal={obstrucaoPrincipal}
                />

                {/* PÁGINA 4: MATRIZ HORÁRIA SAZONAL (06h–18h) & LEITURA APLICADA */}
                <div
                  id="pdf-page-4"
                  className="pdf-page bg-white w-full aspect-[210/297] rounded-md shadow-sm border border-[#DCE4DF] overflow-hidden relative text-[#18221F] p-8 flex flex-col"
                >
                  <RunningHeader
                    projeto={form.nomeProjeto}
                    secao="CRONOGRAMA HORÁRIO SAZONAL & CONFORTO"
                    pagina={4}
                  />

                  <div className="mb-3">
                    <h2 className="text-lg font-black text-[#18221F]">
                      Matriz Horária de Insolação Sazonal · Fachada{" "}
                      {fachadaAtual}
                    </h2>
                    <p className="text-[10px] text-[#52605B]">
                      Comportamento hora a hora da incidência solar direta e dos
                      bloqueios de entorno ao longo das 4 estações.
                    </p>
                  </div>

                  {/* Matriz Visual Hora a Hora */}
                  <div className="rounded-xl border border-[#DCE4DF] bg-[#F7FAF8] p-3.5 mb-3.5 space-y-2.5">
                    {leituraSolar.porEstacao.map((item) => {
                      const horariosObj =
                        calculoSolarAtual?.[item.estacao] || {};
                      const entradas = Object.entries(horariosObj)
                        .map(([h, d]: [string, any]) => ({
                          hora: parseInt(h.replace("h", ""), 10),
                          ...d,
                        }))
                        .filter((d) => Number.isFinite(d.hora))
                        .sort((a, b) => a.hora - b.hora);

                      return (
                        <div
                          key={item.estacao}
                          className="bg-white rounded-lg border border-[#DCE4DF] p-2.5"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#18221F]">
                              {ROTULO_ESTACAO[item.estacao]}
                            </span>
                            <span className="text-[9.5px] font-mono font-bold text-[#255841]">
                              {item.solDireto}/{item.total} horários com sol (
                              {item.percentualSol ?? 0}%)
                            </span>
                          </div>
                          <div className="grid grid-cols-11 gap-1">
                            {entradas.map((e) => {
                              const st = estadoDoPonto(e.status);
                              return (
                                <div
                                  key={e.hora}
                                  className={`rounded py-1 text-center text-[8px] font-mono font-bold border ${
                                    st === "sol"
                                      ? "bg-amber-300/90 text-amber-950 border-amber-400"
                                      : st === "bloqueado"
                                        ? "bg-rose-100 text-rose-900 border-rose-300"
                                        : "bg-slate-100 text-slate-500 border-slate-200"
                                  }`}
                                >
                                  {e.hora}h
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    <div className="flex items-center justify-end gap-4 text-[8.5px] font-semibold text-[#52605B] pt-1">
                      <span className="flex items-center gap-1">
                        <i className="size-2.5 rounded-xs bg-amber-300 border border-amber-400" />
                        Sol Direto na Fachada
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="size-2.5 rounded-xs bg-rose-100 border border-rose-300" />
                        Bloqueado pelo Entorno (DSM)
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="size-2.5 rounded-xs bg-slate-100 border border-slate-300" />
                        Sombra Própria
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="rounded-xl bg-sky-50 border border-sky-200 p-3.5">
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-sky-900">
                        LUZ NATURAL & SAÚDE CIRCADIANA
                      </p>
                      <p className="text-[10px] leading-relaxed text-[#18221F] mt-1">
                        Os períodos de incidência direta favorecem a iluminação
                        natural e a salubridade do ambiente. Para evitar
                        ofuscamento visual em telas de trabalho, recomenda-se
                        proteção solar móvel ou cortinas translúcidas nos
                        horários assinalados em amarelo.
                      </p>
                    </div>
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5">
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-amber-900">
                        GANHO TÉRMICO & EFICIÊNCIA ENERGÉTICA
                      </p>
                      <p className="text-[10px] leading-relaxed text-[#18221F] mt-1">
                        A radiação direta na fachada representa aporte passivo
                        de calor: benéfico nos meses de inverno e ponto de
                        atenção para climatização nos meses quentes. Utilize a
                        matriz horária acima para especificar brises ou vidros
                        de controle solar.
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto rounded-xl bg-[#18221F] text-white p-3.5 mb-2">
                    <p className="text-[8.5px] font-black uppercase tracking-[0.14em] text-[#86EFAC]">
                      DIRETRIZ EXECUTIVA PARA O PARTIDO ARQUITETÔNICO
                    </p>
                    <p className="text-[10px] leading-snug text-white/90 mt-1">
                      Priorize ambientes de longa permanência conforme a janela
                      de insolação observada e preserve a entrada de luz difusa
                      e ventilação natural mesmo nos horários de sombreamento.
                    </p>
                  </div>

                  <RunningFooter />
                </div>

                {/* PÁGINA 5: O ENTORNO QUE INTERFERE (TABELA 8 SETORES + MAPA DSM) */}
                {leituraSolar.pontosComDado > 0 && (
                  <div
                    id="pdf-page-5"
                    className="pdf-page bg-white w-full aspect-[210/297] rounded-md shadow-sm border border-[#DCE4DF] overflow-hidden relative text-[#18221F] p-8 flex flex-col"
                  >
                    <RunningHeader
                      projeto={form.nomeProjeto}
                      secao="ANÁLISE TOPOGRÁFICA DE OBSTRUÇÕES · SATÉLITE DSM"
                      pagina={5}
                    />

                    <div className="mb-2.5">
                      <h2 className="text-lg font-black text-[#18221F]">
                        Mapeamento 360° de Obstáculos do Entorno · Raio 60 m
                      </h2>
                      <p className="text-[10px] text-[#52605B]">
                        Fachada {fachadaAtual} · Cobertura DSM:{" "}
                        {leituraSolar.pontosComDado}/
                        {leituraSolar.pontosTotais} direções válidas analisadas
                      </p>
                    </div>

                    <TabelaSetoresEntorno
                      setores={setoresEntorno}
                      direcaoPrincipal={direcaoPrincipal}
                    />

                    <div className="mt-3 flex-1 min-h-0">
                      <MapaEntorno
                        mapa={sombreamentoReal?.mapa}
                        perfil={perfilHorizonteReal}
                        azimuteFachada={azimuteFachadaAtual}
                        calculoSolar={calculoSolarAtual}
                      />
                    </div>

                    <RunningFooter />
                  </div>
                )}
              </div>
            )}

            {/* ── SIMULADOR INTERATIVO (ABAIXO DO LAUDO OU ISOLADO NA ABA) ── */}
            {calculoSolarAtual?.Verao && modoVisualizacao !== "laudo" && (
              <section
                ref={simuladorRef}
                id="secao-simulador-3d"
                className="rounded-3xl border border-[#DCE4DF] bg-white p-5 md:p-6 shadow-sm"
              >
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#255841]">
                      APRESENTAÇÃO INTERATIVA PARA CLIENTE & INVESTIDOR
                    </p>
                    <h3 className="text-xl font-black text-[#18221F]">
                      Simulador de Incidência Solar e Sombreamento Real (DSM)
                    </h3>
                    <p className="text-xs text-[#52605B] mt-0.5">
                      Alterne entre as estações, clique nos horários ou ative/desative
                      os prédios vizinhos para visualizar o impacto na prática.
                    </p>
                  </div>
                  <Building2 className="size-6 text-[#255841] shrink-0" />
                </div>

                <SimuladorSolarExecutivo
                  calculoSolar={calculoSolarAtual}
                  fachadaAtual={fachadaAtual}
                  azimuteFachada={azimuteFachadaAtual}
                  obstrucaoPrincipal={obstrucaoPrincipal}
                  perfilHorizonte={perfilHorizonteReal}
                />
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}