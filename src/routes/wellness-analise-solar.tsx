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
  MapPin, CloudRain, Thermometer, Wind,
  ShieldCheck, Cpu, FileText, Download, Target, Compass, Sun,
  Layers, Satellite, Ruler, Building2, ArrowLeft,
  Sparkles, X, Zap, Droplets
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

// ── IMPORTAÇÃO DO NOVO COMPONENTE ISOLADO ──
import SimuladorSombreamento3D from "@/components/SimuladorSombreamento3D";
import CapaLaudo from "./CapaLaudo";
import { ResumoEntorno } from "./ResumoEntorno";

export const Route = createFileRoute("/wellness-analise-solar")({
  beforeLoad: () => {
    if (!LIBERAR_ANALISES) throw redirect({ to: "/" });
  },
  validateSearch: (search: Record<string, unknown>) => ({
    obraId: typeof search.obraId === "string" && search.obraId.trim()
      ? search.obraId.trim()
      : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Vector-X · Inteligência de Zoneamento Bioclimático" },
    ],
  }),
  component: VectorZoneamento,
});

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || "http://localhost:5678/webhook-test/analise-solar";
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const TABELA_PROPRIA = "analises_vectorx";

let googleMapsLoadPromise: Promise<any> | null = null;

function carregarGoogleMaps(apiKey: string) {
  if (!apiKey) return Promise.reject(new Error("Chave do Google Maps ausente. Configure VITE_GOOGLE_MAPS_API_KEY."));
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
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async&libraries=maps,marker,places&callback=${callbackName}`;
      script.async = true;
      script.onerror = () => reject(new Error("Não foi possível carregar o Google Maps."));
      document.head.appendChild(script);
    });
  }
  return googleMapsLoadPromise;
}

type PontoMapa = { lat: number; lng: number };

// ── AUXILIARES DE CARTA SOLAR E SOMBREAMENTO ──
const ROSA_NOME = [
  "Norte", "Norte-nordeste", "Nordeste", "Leste-nordeste",
  "Leste", "Leste-sudeste", "Sudeste", "Sul-sudeste",
  "Sul", "Sul-sudoeste", "Sudoeste", "Oeste-sudoeste",
  "Oeste", "Oeste-noroeste", "Noroeste", "Norte-noroeste",
];
const ROSA_SIGLA = ["N", "NNE", "NE", "ENE", "L", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];

const norm360 = (g: number) => ((g % 360) + 360) % 360;
const diffAngular = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
const semAcento = (s: string) =>
  String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function nomeOrientacao(az: number) {
  const i = Math.round(norm360(az) / 22.5) % 16;
  return { nome: ROSA_NOME[i], sigla: ROSA_SIGLA[i] };
}

const AZ_NOMINAL: Record<string, number> = {
  norte: 0, nordeste: 45, leste: 90, sudeste: 135, sul: 180, sudoeste: 225, oeste: 270, noroeste: 315,
};
const azimuteNominal = (fachada: string) => AZ_NOMINAL[semAcento(fachada)] ?? 180;

const ROTULO_ESTACAO: Record<string, string> = {
  Verao: "Verão", Outono: "Outono", Inverno: "Inverno", Primavera: "Primavera",
};
// CORREÇÃO: a chave estava "Outorno" (typo), o que gerava `undefined` no resumo quando o outono era a estação principal.
const NO_ESTACAO: Record<string, string> = {
  Verao: "no verão", Outono: "no outono", Inverno: "no inverno", Primavera: "na primavera",
};

const anguloParaXY = (cx: number, cy: number, r: number, azimuteDeg: number) => {
  const rad = (azimuteDeg * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
};
const elevacaoParaRaio = (elevacao: number, raioMax: number) => (raioMax * (90 - Math.max(elevacao, 0))) / 90;

function gerarPathSetorFachadaAz(az: number, cx: number, cy: number, raio: number) {
  const p = (g: number) => {
    const r = (g * Math.PI) / 180;
    return { x: cx + raio * Math.sin(r), y: cy - raio * Math.cos(r) };
  };
  const a = p(az - 90);
  const b = p(az + 90);
  return `M ${cx} ${cy} L ${a.x} ${a.y} A ${raio} ${raio} 0 0 1 ${b.x} ${b.y} Z`;
}

function gerarPathMascara(perfil: any[], azReal: number, cx: number, cy: number, raio: number) {
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

  const interno = pts.map((p) => anguloParaXY(cx, cy, elevacaoParaRaio(p.ang, raio), p.az));
  const externo = pts.map((p) => anguloParaXY(cx, cy, raio, p.az)).reverse();
  const f = (q: { x: number; y: number }) => `${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
  
  const pathInterno = interno.slice(1).map((q) => "L " + f(q)).join(" ");
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

function resumoSolarGerado(calculo: any, rotulo: string, percentual: number | null): string {
  const ordem = ["Verao", "Outono", "Inverno", "Primavera"];
  const dados = ordem.map((e) => ({ e, horas: horasComSol(calculo?.[e]) }));
  const total = dados.reduce((s, d) => s + d.horas.length, 0);
  if (!total) return `Fachada voltada para ${rotulo}: nenhum dos horários avaliados recebe sol direto.`;

  const principal = [...dados].sort((a, b) => b.horas.length - a.horas.length)[0];
  const sem = dados.filter((d) => d.horas.length === 0).map((d) => NO_ESTACAO[d.e]);
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
    (percentual != null ? ` No conjunto, ${percentual}% dos horários de luz solar têm sol direto.` : "")
  );
}

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
  onLocalSelecionado: (local: { ponto: PontoMapa; placeId: string; componentes: any[]; endereco: string }) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mapaRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const centroMapaRef = useRef<PontoMapa | null>(null);
  const pontoRef = useRef(ponto);
  const moverPinoRef = useRef<((position: PontoMapa, notificar?: boolean) => void) | null>(null);
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
          fields: ["geometry", "place_id", "address_components", "formatted_address"],
          componentRestrictions: { country: "br" },
        });
        listenerPlace = autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          const location = place.geometry?.location;
          if (!location) {
            setErroMapa("Esse resultado não tem um ponto no mapa. Escolha outra sugestão ou marque o prédio manualmente.");
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
        if (!cancelado) setErroMapa(error instanceof Error ? error.message : "Falha ao carregar o Google Maps.");
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
          center: pontoRef.current || centroMapaRef.current || { lat: -30.0079461, lng: -51.1853043 },
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
              if (posicao) moverPino({
                lat: typeof posicao.lat === "function" ? posicao.lat() : Number(posicao.lat),
                lng: typeof posicao.lng === "function" ? posicao.lng() : Number(posicao.lng),
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
          const textoBusca = `${logradouro}${numero ? ', ' + numero : ''}${cidade ? ' - ' + cidade : ''}${uf ? ' - ' + uf : ''}`;
          new googleMaps.Geocoder().geocode({ address: textoBusca, componentRestrictions: { country: "BR" } }, (resultados: any[], status: string) => {
            if (status === "OK" && resultados?.[0]?.geometry?.location) {
              const location = resultados[0].geometry.location;
              const coordenadas = { lat: location.lat(), lng: location.lng() };
              centroMapaRef.current = coordenadas;
              mapa.panTo(location);
              mapa.setZoom(19);
              moverPino(coordenadas, true);
            }
          });
        } else if (pontoRef.current) {
          moverPino(pontoRef.current, false);
        }

        listenerClique = mapa.addListener("click", (evento: any) => {
          if (evento.latLng) moverPino({ lat: evento.latLng.lat(), lng: evento.latLng.lng() });
        });
      } catch (error) {
        if (!cancelado) setErroMapa(error instanceof Error ? error.message : "Falha ao carregar o Google Maps.");
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
    const texto = `${logradouro}${numero ? ', ' + numero : ''}${cidade ? ' - ' + cidade : ''}${uf ? ' - ' + uf : ''}`.trim();
    const googleMaps = (window as any).google?.maps;
    if (!texto || ponto || !googleMaps) return;
    new googleMaps.Geocoder().geocode({ address: texto, componentRestrictions: { country: "BR" } }, (resultados: any[], status: string) => {
      if (status === "OK" && resultados?.[0]?.geometry?.location) {
        const location = resultados[0].geometry.location;
        centroMapaRef.current = { lat: location.lat(), lng: location.lng() };
        mapInstanceRef.current?.panTo(location);
        mapInstanceRef.current?.setZoom(19);
      }
    });
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="logradouro-maps" className="text-xs font-medium text-ink-soft">Logradouro</Label>
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
      <p id="instrucao-localizacao" className="text-[10px] leading-relaxed text-zinc-400">
        Confirme se o pino está sobre o prédio. Arraste se necessário.
      </p>
      <Button
        type="button"
        variant="outline"
        onClick={() => setMapaAberto(true)}
        className="h-11 w-full justify-start gap-2 rounded-xl border border-brand/30 bg-brand-soft/60 text-brand-strong hover:bg-brand-soft"
      >
        <MapPin className="size-4 text-brand" aria-hidden="true" />
        {ponto ? "Abrir mapa para reposicionar o pino" : "Abrir mapa e marcar o prédio"}
      </Button>
      {ponto && <p className="text-[10px] text-zinc-500">Ponto selecionado: {ponto.lat.toFixed(6)}, {ponto.lng.toFixed(6)}</p>}
      {erroMapa && <p role="alert" className="text-xs text-rose-300">{erroMapa}</p>}
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
                <h2 id="titulo-modal-mapa" className="flex items-center gap-2 text-base font-semibold text-ink sm:text-lg">
                  <MapPin className="size-4 text-brand" aria-hidden="true" /> Ajustar localização do imóvel
                </h2>
                <p className="mt-1 text-xs text-ink-soft">Clique no prédio ou arraste o pino até a posição correta.</p>
              </div>
              <Button type="button" variant="outline" onClick={() => setMapaAberto(false)} className="shrink-0 rounded-full border-line text-ink-soft hover:bg-surface-soft">
                Fechar mapa
              </Button>
            </header>
            <div ref={mapaRef} className="h-[60vh] min-h-[320px] w-full bg-surface-soft sm:h-[68vh] sm:min-h-[420px]" role="region" aria-label="Mapa para marcar o prédio" />
            <footer className="flex flex-col gap-3 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs tabular-nums text-ink-soft" aria-live="polite">
                {ponto ? `Pino: ${ponto.lat.toFixed(6)}, ${ponto.lng.toFixed(6)}` : "Nenhum ponto marcado; clique no prédio para posicionar o pino."}
              </p>
              <Button type="button" onClick={() => setMapaAberto(false)} className="rounded-full bg-brand-strong text-white hover:bg-brand">
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
    "zona", "subzona", "codigo_zona", "municipio", "uf", "caracteristica", "fachada", "endereco",
    "nome_estacao", "temp_bulbo_seco_min", "temp_bulbo_seco_max", "temp_media",
    "umidade_media", "radiacao_media", "distancia_km", "resumo", "classificacao",
    "clima", "potencial_hidrico", "score_bioclimatico", "estrategias_conforto",
    "estrategias_resiliencia", "recomendacoes_conforto", "recomendacoes_resiliencia",
    "resumo_executivo", "leitura_ia", "calculo_solar",
    "sombreamento_real", "potencial_fotovoltaico", "cards_materiais", "material_recomendado",
    "intervalo_nbr15575", "cidade_representativa", "estado_representativo",
    "umidade_relativa_limiar", "umidade_relativa_condicao",
    "resumo_climatico", "criterio_classificacao", "desafio_inverno", "desafio_verao",
    "amplitude_termica", "temp_projeto_inverno_c", "temp_projeto_verao_c",
    "diretrizes_conforto_detalhadas", "diretrizes_resiliencia_detalhadas",
  ];
  const campos = Object.fromEntries(
    colunas
      .filter((coluna) => Object.prototype.hasOwnProperty.call(analiseNormalizada, coluna))
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
    'resumo', 'classificacao', 'clima', 'potencial_hidrico',
    'score_bioclimatico', 'estrategias_conforto', 'estrategias_resiliencia',
    'recomendacoes_conforto', 'recomendacoes_resiliencia', 'calculo_solar',
    'sombreamento_real', 'potencial_fotovoltaico', 'cards_materiais', 'material_recomendado',
    'diretrizes_conforto_detalhadas', 'diretrizes_resiliencia_detalhadas',
  ];
  const normalizado = { ...resposta };
  camposJson.forEach((campo) => {
    if (typeof normalizado[campo] === 'string') {
      try { normalizado[campo] = JSON.parse(normalizado[campo]); } catch {}
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
      setEtapa((valorAtual) => (valorAtual + 1) % ANALISE_LOADING_STEPS.length);
    }, 1400);

    return () => clearInterval(intervalo);
  }, []);

  const textoEtapa = ANALISE_LOADING_STEPS[etapa];

  return (
    <div className="max-w-5xl mx-auto min-h-[60vh] flex items-center justify-center py-12">
      <style>{`
        @keyframes pulse-sun {
          0%, 100% { transform: scale(1); opacity: 0.92; }
          50% { transform: scale(1.18); opacity: 1; }
        }
        @keyframes move-arc {
          0% { transform: translateX(-34px) translateY(8px) scale(0.9); opacity: 0.2; }
          50% { transform: translateX(0) translateY(0) scale(1); opacity: 1; }
          100% { transform: translateX(34px) translateY(-8px) scale(0.9); opacity: 0.2; }
        }
        @keyframes drift-horizon {
          0% { transform: translateX(-18px); opacity: 0.25; }
          50% { transform: translateX(18px); opacity: 0.8; }
          100% { transform: translateX(-18px); opacity: 0.25; }
        }
        @keyframes build-house {
          0%, 100% { transform: translateY(12px) scale(0.94); opacity: 0.25; }
          50% { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>

      <div className="relative w-full max-w-2xl">
        <div className="relative h-72 overflow-hidden rounded-[28px] border border-line bg-surface-soft">
          <div className="absolute left-[16%] top-[18%] h-12 w-12 rounded-full bg-gradient-to-br from-amber-200 via-yellow-400 to-orange-500 shadow-[0_0_15px_rgba(251,191,36,0.4)] animate-[pulse-sun_1.8s_ease-in-out_infinite]" />

          <div className="absolute left-[24%] top-[36%] h-0.5 w-[42%] rotate-[18deg] rounded-full bg-gradient-to-r from-brand/0 via-brand/60 to-brand/0 animate-[move-arc_2.2s_ease-in-out_infinite]" />

          <div className="absolute left-[50%] top-[58%] h-20 w-20 -translate-x-1/2 rounded-full border border-brand/25 bg-brand/5" />

          <div className="absolute left-1/2 bottom-10 h-28 w-44 -translate-x-1/2 rounded-t-[26px] bg-gradient-to-t from-brand/15 to-brand-soft/5 border-t border-brand/20 animate-[build-house_2.2s_ease-in-out_infinite]" />
          <div className="absolute left-1/2 bottom-[92px] h-14 w-24 -translate-x-1/2 rounded-t-[18px] bg-brand/10 border border-brand/20 animate-[build-house_2.2s_ease-in-out_infinite_0.2s]" />
          <div className="absolute left-[42%] bottom-[108px] h-8 w-7 rounded-md border border-brand-soft/30 bg-brand/10" />
          <div className="absolute right-[42%] bottom-[108px] h-8 w-7 rounded-md border border-brand-soft/30 bg-brand/10" />

          <div className="absolute inset-x-8 bottom-5 h-px bg-gradient-to-r from-transparent via-brand/50 to-transparent animate-[drift-horizon_2.8s_ease-in-out_infinite]" />

          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center">
            <span className="rounded-full bg-brand-soft px-3 py-1 text-[9px] font-medium text-brand-strong">{textoEtapa}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const CORES_ESTACAO: Record<string, string> = { Verao: '#F59E0B', Outono: '#DC2626', Inverno: '#3B82F6', Primavera: '#10B981' };

const ESTACOES_RELATORIO = ["Verao", "Outono", "Inverno", "Primavera"];
const DIRECOES_ENTORNO = ["Norte", "Nordeste", "Leste", "Sudeste", "Sul", "Sudoeste", "Oeste", "Noroeste"];
const AZIMUTE_POR_FACHADA: Record<string, number> = {
  norte: 0, nordeste: 45, leste: 90, sudeste: 135,
  sul: 180, sudoeste: 225, oeste: 270, noroeste: 315,
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
  toleranciaElevacao = 3
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
        if (d?.obstruidoReal === true || d?.status === "Sombra (obstruída)") {
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

// CORREÇÃO: o filtro antigo comparava só ângulos e descartava o obstáculo de 72° (21,4° a 14 m)
// por 0,09° de diferença (vizinho 7,4° < 21,4 × 0,35 = 7,49°). Agora um obstáculo próximo e alto
// (distância ≤ 45 m e ≥ 6 m acima do solo) nunca é tratado como ruído, e o limiar caiu de 0,35 para 0,25.
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
      (outro) => outro !== p && diffAngular(p.azimute, outro.azimute) <= 15
    );
    if (vizinhos.length === 0) return true;
    const maiorVizinho = Math.max(...vizinhos.map((v) => Number(v.anguloObstrucaoGraus) || 0));
    return maiorVizinho >= ang * 0.25;
  });

  return consistentes.length > 0 ? consistentes : pontos;
}

// NOVO: fonte única do "obstáculo principal". Mapa, tabela e página 3 usam a mesma regra.
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
        (azimuteFachada === null || diffAngular(p.azimute, azimuteFachada) <= 90) &&
        obstaculoGeraSombraReal(p, calculoSolar),
    )
    .reduce<HorizontePonto | null>(
      (m, p) =>
        !m || (p.anguloObstrucaoGraus as number) > (m.anguloObstrucaoGraus as number) ? p : m,
      null,
    );
}

function calcularBloqueios(calculoSolar: any, perfilHorizonte: HorizontePonto[]) {
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
          item.horas.push(`${hora} (${estacao})`);
          mapa.set(az, item);
        }
      }
    }
  }
  return mapa;
}

// CORREÇÃO: antes o 3º parâmetro recebia o Map de bloqueios, e `obstaculoGeraSombraReal` fazia
// `calculoSolar["Verao"]` num Map (undefined), então nunca marcava sombra real. Agora são dois parâmetros separados.
function resumirEntornoPorSetor(
  perfil: HorizontePonto[] | null | undefined,
  azimuteFachada: number | null,
  calculoSolar: any,
  bloqueios: Map<number, { azimute: number; horas: string[] }>,
) {
  const todos = perfil || [];
  const validosBrutos = todos.filter(
    (p) => !p.referenciaNaoEncontrada && Number.isFinite(p.azimute) && typeof p.anguloObstrucaoGraus === "number",
  );
  const validos = filtrarRuidoPontual(validosBrutos);

  return DIRECOES_ENTORNO.map((direcao, i) => {
    const centro = i * 45;
    const doSetor = validos.filter((p) => diffAngular(p.azimute, centro) <= 22.5);
    const doSetorBruto = validosBrutos.filter((p) => diffAngular(p.azimute, centro) <= 22.5);
    const baseSetor = doSetor.length > 0 ? doSetor : doSetorBruto;

    const candidatosSombraReal = baseSetor.filter(
      (p) =>
        (azimuteFachada === null || diffAngular(p.azimute, azimuteFachada) <= 90) &&
        obstaculoGeraSombraReal(p, calculoSolar)
    );
    const listaParaPico = candidatosSombraReal.length > 0 ? candidatosSombraReal : baseSetor;

    const pico = listaParaPico.reduce<HorizontePonto | null>(
      (m, p) => (!m || (p.anguloObstrucaoGraus as number) > (m.anguloObstrucaoGraus as number) ? p : m),
      null,
    );

    const todosDoSetor = todos.filter((p) => diffAngular(p.azimute, centro) <= 22.5);
    const avisoSetor = !pico ? (todosDoSetor.find((p) => p.aviso)?.aviso || undefined) : undefined;
    const atrasDaFachada =
      !pico && (todosDoSetor.length === 0 || !!avisoSetor?.toLowerCase().includes("dentro do prédio"));

    const naFrente = azimuteFachada !== null && pico !== null && diffAngular(pico.azimute, azimuteFachada) <= 90;
    const geraSombra = pico !== null && obstaculoGeraSombraReal(pico, calculoSolar);
    const afetaFachada = naFrente && geraSombra;

    // CORREÇÃO: soma as horas de todos os azimutes bloqueados do setor (antes pegava só o primeiro).
    const horas: string[] = [];
    if (pico) {
      for (const [az, b] of bloqueios.entries()) {
        if (diffAngular(az, centro) <= 22.5) horas.push(...b.horas);
      }
    }
    const bloqueio = horas.length > 0 ? { horas } : null;

    return { direcao, pico, afetaFachada, avisoSetor, atrasDaFachada, bloqueio };
  });
}

function horariosDaEstacao(horarios: Record<string, { status?: string | null }> | undefined) {
  const entradas = Object.entries(horarios || {})
    .map(([label, d]) => ({ hora: parseInt(label, 10), status: String(d?.status || "") }))
    .filter((e) => Number.isFinite(e.hora))
    .sort((a, b) => a.hora - b.hora);
  return {
    comSol: entradas.filter((e) => e.status === "Pleno Sol" || e.status === "Meia Sombra").map((e) => `${e.hora}h`),
    bloqueados: entradas.filter((e) => e.status.startsWith("Sombra (obstru")).map((e) => `${e.hora}h`),
  };
}

function resumirExposicaoSolar(calculoSolar: any, perfilHorizonte: any[]) {
  const porEstacao = ESTACOES_RELATORIO.map((estacao) => {
    const horarios = calculoSolar?.[estacao] ?? {};
    const amostras = Object.entries(horarios)
      .map(([hora, dado]: [string, any]) => ({ hora: Number.parseFloat(hora), ...dado }))
      .filter((dado) => Number.isFinite(dado.hora))
      .sort((a, b) => a.hora - b.hora);
    const amostrasDiurnas = amostras.filter((dado) => Number(dado.elevacao) > 0);
    const solDireto = amostrasDiurnas.filter((dado) => dado.status === "Pleno Sol" || dado.status === "Meia Sombra");
    const obstruidos = amostrasDiurnas.filter((dado) => 
      dado.iluminado === true && (dado.obstruidoReal === true || dado.status === "Sombra (obstruída)")
    );

    return {
      estacao,
      total: amostrasDiurnas.length,
      solDireto: solDireto.length,
      plenoSol: amostrasDiurnas.filter((dado) => dado.status === "Pleno Sol").length,
      meiaSombra: amostrasDiurnas.filter((dado) => dado.status === "Meia Sombra").length,
      sombra: amostrasDiurnas.filter((dado) => dado.status === "Sombra").length,
      obstruidos: obstruidos.length,
      inicioSol: solDireto[0]?.hora,
      fimSol: solDireto.at(-1)?.hora,
      percentualSol: amostrasDiurnas.length ? Math.round((solDireto.length / amostrasDiurnas.length) * 100) : null,
    };
  });

  const pontosPerfil = Array.isArray(perfilHorizonte) ? perfilHorizonte : [];
  const pontosComDado = pontosPerfil.filter(
    (ponto) => ponto && ponto.referenciaNaoEncontrada !== true && typeof ponto.anguloObstrucaoGraus === "number"
  );
  const picos = pontosComDado
    .filter((ponto) => Number(ponto.anguloObstrucaoGraus) >= 2)
    .sort((a, b) => Number(b.anguloObstrucaoGraus) - Number(a.anguloObstrucaoGraus));

  return {
    porEstacao,
    pontosComDado: pontosComDado.length,
    pontosTotais: pontosPerfil.length,
    picos,
    coberturaHorizonte: pontosPerfil.length ? Math.round((pontosComDado.length / pontosPerfil.length) * 100) : 0,
  };
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
 
  // O mapa continua desenhando todas as linhas (brutos), mas o "principal" vem da função única.
  const pontosBrutos = (perfil || []).filter((p) => p?.ponto && typeof p.anguloObstrucaoGraus === "number");
  const principal: any = escolherObstaculoPrincipal(perfil, azimuteFachada, calculoSolar);
 
  const poli: number[][] = mapa.poligonoXY || [];
 
  const xs = [obs.x, ...poli.map((q) => q[0]), ...pontosBrutos.map((p) => p.ponto?.x).filter(Boolean)];
  const ys = [obs.y, ...poli.map((q) => q[1]), ...pontosBrutos.map((p) => p.ponto?.y).filter(Boolean)];
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
    return `M${obs.x},${-obs.y} L${obs.x + R * Math.sin(a1)},${-obs.y - R * Math.cos(a1)} A${R},${R} 0 0,1 ${obs.x + R * Math.sin(a2)},${-obs.y - R * Math.cos(a2)} Z`;
  };
 
  const aneis = [20, 40, 60].filter((d) => d < R);
  const tam = Math.max(svgWidth, svgHeight);
  const fonte = tam / 70;
 
  return (
    <div className="mt-3">
      <div className="overflow-hidden rounded-xl border border-line bg-surface-soft">
        <svg
          viewBox={`${svgX} ${svgY} ${svgWidth} ${svgHeight}`}
          className="mx-auto block h-auto max-h-[320px] w-full"
          role="img"
          aria-label="Mapa do entorno com obstáculos solares"
        >
          <image href={mapa.imagem} x={-R} y={-R} width={2 * R} height={2 * R} style={{ imageRendering: "pixelated" }} />
          <rect x={-R} y={-R} width={2 * R} height={2 * R} fill="#ffffff" fillOpacity="0.55" />
 
          {azimuteFachada !== null && (
            <path d={conePath()} fill="#3A7D5E" fillOpacity="0.12" stroke="#3A7D5E" strokeWidth={fonte * 0.12} strokeDasharray={`${fonte * 0.5} ${fonte * 0.4}`} />
          )}
 
          {aneis.map((d) => (
            <g key={d}>
              <circle cx={obs.x} cy={-obs.y} r={d} fill="none" stroke="#334155" strokeOpacity="0.45" strokeWidth={fonte * 0.08} strokeDasharray={`${fonte * 0.3} ${fonte * 0.3}`} />
              <text x={obs.x + 0.8} y={-obs.y - d - 0.6} fontSize={fonte * 0.9} fill="#1f2937" stroke="#fff" strokeWidth={fonte * 0.22} paintOrder="stroke">
                {d} m
              </text>
            </g>
          ))}
 
          {poli.length > 2 && (
            <polygon points={poli.map((q) => `${q[0]},${-q[1]}`).join(" ")} fill="#fbbf24" fillOpacity="0.35" stroke="#d97706" strokeWidth={fonte * 0.18} />
          )}
 
          {pontosBrutos.map((p) => {
            const naFrente = azimuteFachada === null || diffAngular(p.azimute, azimuteFachada) <= 90;
            const geraSombra = naFrente && obstaculoGeraSombraReal(p, calculoSolar);
            const ehPrincipal = p === principal;
            return (
              <line
                key={p.azimute}
                x1={obs.x}
                y1={-obs.y}
                x2={p.ponto.x}
                y2={-p.ponto.y}
                stroke={ehPrincipal ? "#e11d48" : geraSombra ? "#0891b2" : "#64748b"}
                strokeWidth={fonte * (ehPrincipal ? 0.28 : geraSombra ? 0.16 : 0.07)}
                opacity={ehPrincipal ? 1 : geraSombra ? 0.9 : 0.35}
                strokeDasharray={!naFrente ? `${fonte * 0.2} ${fonte * 0.4}` : undefined}
              />
            );
          })}
 
          {pontosBrutos
            .filter((p) => p.anguloObstrucaoGraus >= 5 && (azimuteFachada === null || diffAngular(p.azimute, azimuteFachada) <= 90))
            .map((p) => {
              const ehPrincipal = p === principal;
              const geraSombra = obstaculoGeraSombraReal(p, calculoSolar);
              return (
                <circle
                  key={`c${p.azimute}`}
                  cx={p.ponto.x}
                  cy={-p.ponto.y}
                  r={fonte * (ehPrincipal ? 0.55 : geraSombra ? 0.38 : 0.25)}
                  fill={ehPrincipal ? "#e11d48" : geraSombra ? "#0891b2" : "#64748b"}
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
              {`${formatarNumero(principal.anguloObstrucaoGraus, 1)}° a ${formatarNumero(principal.distanciaObstaculoMetros, 0)} m`}
            </text>
          )}
 
          <polygon
            points={`${obs.x},${-obs.y - fonte * 0.9} ${obs.x - fonte * 0.7},${-obs.y + fonte * 0.5} ${obs.x + fonte * 0.7},${-obs.y + fonte * 0.5}`}
            fill="#3A7D5E"
            stroke="#fff"
            strokeWidth={fonte * 0.15}
          />
 
          <g transform={`translate(${svgX + fonte * 2.2}, ${svgY + fonte * 3.2})`}>
            <polygon points={`0,${-fonte * 1.6} ${fonte * 0.6},${fonte * 0.4} 0,${fonte * 0.05} ${-fonte * 0.6},${fonte * 0.4}`} fill="#1f2937" />
            <text x={0} y={fonte * 1.6} fontSize={fonte * 1.1} textAnchor="middle" fontWeight="bold" fill="#1f2937" stroke="#fff" strokeWidth={fonte * 0.25} paintOrder="stroke">N</text>
          </g>
        </svg>
      </div>
 
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-ink-soft">
        <li className="flex items-center gap-1.5"><i className="inline-block h-2 w-3 border border-amber-600 bg-amber-300/60" />Edifício</li>
        <li className="flex items-center gap-1.5"><span className="inline-block size-0 border-x-[4px] border-b-[7px] border-x-transparent border-b-brand-strong" />Fachada analisada</li>
        <li className="flex items-center gap-1.5"><i className="inline-block h-2 w-3 border border-dashed border-brand-strong bg-brand-strong/15" />Campo de visão da fachada</li>
        <li className="flex items-center gap-1.5"><i className="inline-block h-0.5 w-4 bg-cyan-600" />Obstáculo que intercepta o sol</li>
        <li className="flex items-center gap-1.5"><i className="inline-block h-0.5 w-4 bg-rose-600" />Principal obstáculo</li>
      </ul>
      <p className="mt-1 text-[9px] text-ink-soft">Imagem de elevação do satélite esmaecida; anéis a cada 20 m a partir da fachada.</p>
    </div>
  );
}

// ── COMPONENTE DA PÁGINA 3 (CARTA SOLAR) ──
function PaginaCartaSolar({
  fachadaAtual,
  sombreamentoReal,
  calculoSolarAtual,
  percentualReal,
  fonteSombreamentoResumo,
  leituraSolar,
  obstrucaoPrincipal,
}: any) {
  const azNominal = azimuteNominal(fachadaAtual);
  const azUsadoBruto = sombreamentoReal?.azimuteFachadaUsado ?? sombreamentoReal?.azimute_fachada_usado;
  const azReal: number = typeof azUsadoBruto === "number" ? azUsadoBruto : azNominal;
  const orient = nomeOrientacao(azReal);
  const rotuloFachada = `${orient.nome} (${Math.round(azReal)}°)`;
  const divergeDoInformado = diffAngular(azReal, azNominal) >= 5;
  const perfilHorizonte: any[] = sombreamentoReal?.perfil ?? [];
  const resumoSolar = resumoSolarGerado(calculoSolarAtual, rotuloFachada, percentualReal);

  return (
    <>
      <div className="pdf-page bg-white w-full aspect-[210/297] rounded-md shadow-sm border border-line overflow-hidden relative text-ink p-8 flex flex-col">
        <h3 className="text-xs font-black uppercase tracking-[0.15em] text-ink mb-3 flex items-center gap-2">
          <Sun className="size-4 text-brand-strong" /> Incidência Direta e Sombreamento · Fachada voltada para {rotuloFachada}
        </h3>
        {divergeDoInformado && (
          <p className="text-[10px] text-ink-soft -mt-1 mb-3">
            Você informou {fachadaAtual}; o contorno do prédio indica {Math.round(azReal)}°, e a análise usa essa orientação.
          </p>
        )}
        <div className="bg-surface-soft border border-line rounded-xl p-4">
          <p className="text-xs text-ink-soft leading-relaxed mb-3 font-medium">{resumoSolar}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft mb-2">Carta solar e interpretação da fachada</p>
          {calculoSolarAtual?.Verao ? (() => {
            const cx = 190, cy = 150, raio = 108;
            const estacoes = ["Verao", "Outono", "Inverno", "Primavera"];
            const ordemDesenho = ["Verao", "Inverno", "Primavera", "Outono"];
            const pathMascara = gerarPathMascara(perfilHorizonte, azReal, cx, cy, raio);
            const ini = nomeOrientacao(azReal - 90).nome;
            const fim = nomeOrientacao(azReal + 90).nome;
            const pa = anguloParaXY(cx, cy, raio, azReal - 90);
            const pb = anguloParaXY(cx, cy, raio, azReal + 90);
            const pRotulo = anguloParaXY(cx, cy, raio * 0.86, azReal);

            return (
              <div className="grid grid-cols-[1.15fr_0.85fr] gap-4 items-center">
                <div className="bg-white border border-line rounded-xl p-2">
                  <svg viewBox="0 0 380 320" className="w-full h-auto max-h-[245px]">
                    <circle cx={cx} cy={cy} r={raio} fill="#EEF5EF" stroke="#E5E7EB" />
                    <circle cx={cx} cy={cy} r={raio * 0.66} fill="none" stroke="#E5E7EB" strokeDasharray="4 4" />
                    <circle cx={cx} cy={cy} r={raio * 0.33} fill="none" stroke="#E5E7EB" strokeDasharray="4 4" />
                    <line x1={cx} y1={cy - raio} x2={cx} y2={cy + raio} stroke="#E5E7EB" />
                    <line x1={cx - raio} y1={cy} x2={cx + raio} y2={cy} stroke="#E5E7EB" />
                    <text x={cx} y={cy - raio - 10} textAnchor="middle" className="fill-ink-soft text-[11px] font-black">N</text>
                    <text x={cx} y={cy + raio + 17} textAnchor="middle" className="fill-ink-soft text-[11px] font-black">S</text>
                    <text x={cx + raio + 14} y={cy + 4} textAnchor="middle" className="fill-ink-soft text-[11px] font-black">L</text>
                    <text x={cx - raio - 14} y={cy + 4} textAnchor="middle" className="fill-ink-soft text-[11px] font-black">O</text>

                    <path d={gerarPathSetorFachadaAz(azReal, cx, cy, raio)} fill="#4C9A74" fillOpacity="0.14" stroke="#3A7D5E" strokeWidth="1.5" />
                    <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="#3A7D5E" strokeWidth="2.5" />
                    <text x={pRotulo.x} y={pRotulo.y} textAnchor="middle" className="fill-brand-strong text-[9px] font-black">
                      {orient.sigla} · {Math.round(azReal)}°
                    </text>

                    {pathMascara && (
                      <path d={pathMascara} fill="#F43F5E" fillOpacity="0.22" stroke="#F43F5E" strokeOpacity="0.55" strokeWidth="1" />
                    )}

                    {ordemDesenho.map((estacao) => {
                      const horarios = calculoSolarAtual[estacao];
                      if (!horarios) return null;
                      const cor = CORES_ESTACAO[estacao];
                      const equinocioSobreposto = estacao === "Outono";
                      const pontos = Object.entries(horarios).map(([hora, d]: [string, any]) => {
                        const r = elevacaoParaRaio(Number(d.elevacao) || 0, raio);
                        return { hora, estado: estadoDoPonto(d.status), ...anguloParaXY(cx, cy, r, Number(d.azimute) || 0) };
                      });
                      const rp = equinocioSobreposto ? 2.2 : 3.8;
                      return (
                        <g key={estacao}>
                          <polyline
                            points={pontos.map((p) => `${p.x},${p.y}`).join(" ")}
                            fill="none"
                            stroke={cor}
                            strokeWidth={equinocioSobreposto ? 1.5 : 2.5}
                            strokeDasharray={equinocioSobreposto ? "5 4" : undefined}
                          />
                          {pontos.map((p) =>
                            p.estado === "bloqueado" ? (
                              <circle key={p.hora} cx={p.x} cy={p.y} r={rp} fill="#FFFFFF" stroke={cor} strokeWidth="1.6" />
                            ) : (
                              <circle key={p.hora} cx={p.x} cy={p.y} r={rp} fill={cor} fillOpacity={p.estado === "sol" ? 1 : 0.3} />
                            ),
                          )}
                        </g>
                      );
                    })}

                    {calculoSolarAtual.Inverno &&
                      Object.entries(calculoSolarAtual.Inverno).map(([hora, d]: [string, any]) => {
                        const h = parseFloat(hora.replace("h", ""));
                        if (!Number.isInteger(h) || h % 2 !== 0) return null;
                        const r = elevacaoParaRaio(Number(d.elevacao) || 0, raio) + 10;
                        const p = anguloParaXY(cx, cy, r, Number(d.azimute) || 0);
                        return (
                          <text key={hora} x={p.x} y={p.y + 3} textAnchor="middle" className="fill-ink-soft text-[8px] font-bold">
                            {h}h
                          </text>
                        );
                      })}
                  </svg>

                  <div className="flex flex-wrap justify-center gap-3 text-[9px] font-bold uppercase tracking-wider text-ink-soft">
                    {estacoes.map((estacao) => (
                      <span key={estacao} className="flex items-center gap-1">
                        <i className="size-2 rounded-full" style={{ backgroundColor: CORES_ESTACAO[estacao] }} />
                        {ROTULO_ESTACAO[estacao]}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 mt-1.5 text-[8px] font-semibold text-ink-soft">
                    <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-ink-soft" />Sol na fachada</span>
                    <span className="flex items-center gap-1"><i className="size-2 rounded-full border-2 border-ink-soft bg-white" />Bloqueado pelo entorno</span>
                    <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-ink-soft/30" />Sem sol na fachada</span>
                    {pathMascara && <span className="flex items-center gap-1"><i className="size-2 rounded-sm bg-rose-300" />Céu bloqueado</span>}
                  </div>
                  <p className="text-center text-[8px] text-ink-soft/70 mt-1">Outono e primavera têm trajetória quase idêntica: o outono aparece tracejado, por cima.</p>
                </div>

                <div className="space-y-2">
                  <div className="bg-white rounded-xl border border-line p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-ink-soft">O que isso significa</p>
                    <p className="text-xs font-semibold text-ink mt-1">
                      A faixa verde é o que a parede enxerga: do {ini} ao {fim} ({Math.round(norm360(azReal - 90))}° a {Math.round(norm360(azReal + 90))}°), com a fachada voltada para {orient.nome}.{" "}
                      {pathMascara ? "A área rosa é o céu bloqueado pelo entorno. " : ""}
                      Os trajetos mostram por onde o sol passa em cada estação; pontos mais afastados do centro indicam sol mais baixo e sombras mais longas.
                    </p>
                  </div>
                  <div className="bg-white rounded-xl border border-line p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-ink-soft">
                      {fonteSombreamentoResumo === "perfil_real_dsm" ? "Resultado medido" : "Resultado estimado"}
                    </p>
                    <p className="text-xs text-ink-soft mt-1">
                      {percentualReal != null
                        ? `${percentualReal}% de iluminação direta ${fonteSombreamentoResumo === "perfil_real_dsm" ? "real, com correção por satélite" : "estimada pela trajetória solar, sem considerar vizinhos ou árvores"}.`
                        : "Trajetória solar calculada para a fachada."}
                    </p>
                    {leituraSolar.pontosComDado > 0 && (
                      <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-700 mt-1">Horizonte do campo de visão da fachada (DSM)</p>
                    )}
                  </div>
                  {obstrucaoPrincipal && (
                    <div className="bg-rose-50 rounded-xl border border-rose-200 p-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-rose-700">Obstrução solar encontrada ({obstrucaoPrincipal.direcao})</p>
                      <p className="text-xs text-rose-900 mt-1">
                        Obstrução a {formatarNumero(obstrucaoPrincipal.distanciaMetros, 0)}m, com {formatarNumero(obstrucaoPrincipal.alturaMetros, 1)}m de altura, bloqueando o sol abaixo de {formatarNumero(obstrucaoPrincipal.anguloObstrucaoGraus, 1)}°.{" "}
                        {obstrucaoPrincipal.mascara === 0
                          ? "No modelo, esse ponto não tem telhado: possivelmente vegetação."
                          : obstrucaoPrincipal.mascara === 1
                          ? "No modelo, esse ponto é classificado como telhado: provável edificação vizinha."
                          : "Pode ser edificação vizinha ou vegetação."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })() : <p className="text-sm text-ink-soft">Dados solares indisponíveis.</p>}

          <div className="mt-3 grid grid-cols-4 gap-2">
            {["Verao", "Outono", "Inverno", "Primavera"].map((estacao) => {
              const ensolaradas = horasComSol(calculoSolarAtual?.[estacao]).length;
              return (
                <div key={estacao} className="bg-surface-soft rounded-lg p-2">
                  <p className="text-[8px] font-black uppercase tracking-widest text-ink-soft">{ROTULO_ESTACAO[estacao]}</p>
                  <p className="text-base font-black text-ink mt-0.5">
                    {ensolaradas} <span className="text-[10px] font-semibold text-ink-soft">horários com sol</span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-auto shrink-0 pt-2 text-right text-[8px] font-bold uppercase tracking-widest text-ink-soft/70">
          Gerado via Vector-X Intelligence API · {new Date().toLocaleDateString("pt-BR")}
        </div>
      </div>
    </>
  );
}

export default function VectorZoneamento() {
  const { obraId } = Route.useSearch();
  const [form, setForm] = useState({
    cep: "", logradouro: "", numero: "", bairro: "", cidade: "", uf: "",
    andar: "", modalidade: "obra_nova" as "obra_nova" | "reforma",
    finalidadeAnalise: "imovel_existente" as "imovel_existente" | "projeto",
    tipoImovel: "", fachada: "" as string, nomeProjeto: "", espessuraMaterial: "15",
    lat: null as number | null, lng: null as number | null, placeId: "",
  });
  const router = useRouter();
  
  const voltar = () => {
    if (window.history.length > 1) router.history.back();
    else router.navigate({ to: "/" });
  };

  const [loading, setLoading] = useState(false);
  const [buscandoCep, setBuscarCep] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [localConfirmado, setLocalConfirmado] = useState(false);
  const [erroLocalizacao, setErroLocalizacao] = useState("");
  const [formAberto, setFormAberto] = useState(false);
  const [dadosBioclimaticos, setDadosBioclimaticos] = useState<any>(null);
  
  const [celulaSolarHover, setCelulaSolarHover] = useState<{ estacao: string; hora: string; dados: any } | null>(null);
  const [estacaoSim, setEstacaoSim] = useState('Verao');
  const [horaSlider, setHoraSlider] = useState(12);
  const [animando, setAnimando] = useState(false);
  
  const relatorioRef = useRef<HTMLDivElement>(null);

  async function fetchCEP(cep: string) {
    const cleanCEP = cep.replace(/\D/g, "");
    if (cleanCEP.length !== 8) return;
    setBuscarCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data = await res.json();
      if (data.erro) { toast.error("CEP não encontrado."); return; }
      setForm((prev) => ({
        ...prev, logradouro: data.logradouro || prev.logradouro,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade, uf: data.uf || prev.uf,
        lat: null, lng: null, placeId: "",
      }));
      setLocalConfirmado(false);
      setErroLocalizacao("");
      toast.success("Endereço preenchido!");
    } catch (err) {
      toast.error("Erro ao buscar CEP.");
    } finally {
      setBuscarCep(false);
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
    if (!form.logradouro || !form.cidade || !form.uf || !form.fachada || !form.nomeProjeto) {
      toast.error("Preencha os campos obrigatórios (Rua, Cidade, UF, Fachada e Projeto)");
      return;
    }
    if (!localConfirmado || typeof form.lat !== "number" || typeof form.lng !== "number") {
      toast.error("Marque o prédio no mapa e confirme o local antes de continuar.");
      return;
    }
    setConfirmando(true);
  }

  async function executarAnalise() {
    if (!localConfirmado || typeof form.lat !== "number" || typeof form.lng !== "number") {
      setConfirmando(false);
      toast.error("Marque o prédio no mapa e confirme o local antes de continuar.");
      return;
    }
    setConfirmando(false);
    setFormAberto(false);
    const analiseId = obraId || crypto.randomUUID();
    setLoading(true);
    const enderecoCompleto = `${form.logradouro}, ${form.numero}${form.bairro ? ' - ' + form.bairro : ''}, ${form.cidade} - ${form.uf}, Brasil`;

    const payload = {
      obraId: analiseId,
      nome: form.nomeProjeto,
      endereco: enderecoCompleto,
      enderecoCompleto: enderecoCompleto,
      rua: form.logradouro,
      bairro: form.bairro,
      cidade: form.cidade,
      estado: form.uf,
      pais: 'Brasil',
      modalidade: form.finalidadeAnalise === "imovel_existente" ? "reforma" : form.modalidade,
      finalidadeAnalise: form.finalidadeAnalise,
      tipoImovel: form.tipoImovel,
      fachada: form.fachada,
      andar: form.andar ? Number(form.andar) : 0,
      espessuraMaterial: form.espessuraMaterial ? Number(form.espessuraMaterial) : 15,
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
      const respostaBackend = Array.isArray(data) ? data[0] : data?.data || data?.body || data;
      if (respostaBackend?.disponivel === false && respostaBackend?.status === "fachada_nao_localizada") {
        const mensagem = respostaBackend.mensagem || "Não foi possível localizar a fachada nesse ponto. Reposicione o pino e tente novamente.";
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
      console.error('Erro ao processar IA:', err);
      toast.error("Falha ao processar dados com o motor de IA.");
    } finally {
      setLoading(false);
    }
  }

  const fachadaAtual = dadosBioclimaticos?.fachada?.replace(/"/g, '') || form.fachada;
  const sombreamentoReal = dadosBioclimaticos?.sombreamento_real;
  const potencialFotovoltaicoBruto = dadosBioclimaticos?.potencial_fotovoltaico;
  const potencialFotovoltaico = normalizarPotencialFotovoltaico(
    potencialFotovoltaicoBruto && typeof potencialFotovoltaicoBruto === 'object' ? potencialFotovoltaicoBruto as Record<string, number | string | undefined> : null,
  );

  const extrairMm = (texto?: string | null): number | null => {
    const m = String(texto ?? "").match(/(\d+(?:[.,]\d+)?)\s*mm/i);
    return m ? Number(m[1].replace(",", ".")) : null;
  };

  const chuvaMilimetros =
    dadosBioclimaticos?.potencial_hidrico?.precipitacao_mm ??
    extrairMm(dadosBioclimaticos?.potencial_hidrico?.indice_chuvas);

  const areaTelhado = obterAreaTelhadoComOrigem(
    dadosBioclimaticos?.potencial_hidrico && typeof dadosBioclimaticos.potencial_hidrico === "object"
      ? (dadosBioclimaticos.potencial_hidrico as Record<string, unknown>) : null,
    potencialFotovoltaicoBruto && typeof potencialFotovoltaicoBruto === "object"
      ? (potencialFotovoltaicoBruto as Record<string, unknown>) : null,
  );

  const perfilHorizonteReal = dadosBioclimaticos?.horizontePerfil
    ?? sombreamentoReal?.perfil_horizonte
    ?? sombreamentoReal?.perfil
    ?? [];
  
  const economiaAgua = calcularEconomiaAgua(chuvaMilimetros, areaTelhado.areaM2);
  const economiaSolar = potencialFotovoltaico
    ? calcularEconomiaSolar(potencialFotovoltaico.geracaoAnualMaximaKwh)
    : null;
  const exportarPDF = () => {
    gerarPDFPaginado(relatorioRef, `Laudo_Bioclimatico_${form.nomeProjeto.replace(/\s+/g, "_")}`);
  };
  const percentualReal = dadosBioclimaticos?.resumo?.percentualIluminacao;
  const fonteSombreamentoResumo = dadosBioclimaticos?.resumo?.fonteSombreamento;

  const calculoSolarAtual = dadosBioclimaticos?.classificacao || dadosBioclimaticos?.calculo_solar;

  const leituraSolar = useMemo(
    () => resumirExposicaoSolar(calculoSolarAtual, perfilHorizonteReal),
    [calculoSolarAtual, perfilHorizonteReal],
  );

  // CORREÇÃO: lê as duas grafias (snake_case e camelCase) do azimute da fachada.
  // Antes só lia snake_case e caía no azimute nominal (Sul = 180°) em vez de 162°.
  const azimuteFachadaAtual = useMemo(() => {
    const real = Number(
      sombreamentoReal?.azimute_fachada_usado ?? sombreamentoReal?.azimuteFachadaUsado,
    );
    if (Number.isFinite(real)) return real;
    const chave = String(fachadaAtual || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return AZIMUTE_POR_FACHADA[chave] ?? null;
  }, [fachadaAtual, sombreamentoReal?.azimute_fachada_usado, sombreamentoReal?.azimuteFachadaUsado]);

  const bloqueios = useMemo(
    () => calcularBloqueios(calculoSolarAtual, perfilHorizonteReal),
    [calculoSolarAtual, perfilHorizonteReal],
  );

  const azimutesBloqueantes = useMemo(() => [...bloqueios.keys()], [bloqueios]);

  const setoresEntorno = useMemo(
    () => resumirEntornoPorSetor(perfilHorizonteReal, azimuteFachadaAtual, calculoSolarAtual, bloqueios),
    [perfilHorizonteReal, azimuteFachadaAtual, calculoSolarAtual, bloqueios],
  );

  // NOVO: um único "principal" para tabela, mapa e página 3.
  const pontoPrincipal = useMemo(
    () => escolherObstaculoPrincipal(perfilHorizonteReal, azimuteFachadaAtual, calculoSolarAtual),
    [perfilHorizonteReal, azimuteFachadaAtual, calculoSolarAtual],
  );

  const direcaoPrincipal = useMemo(() => {
    if (!pontoPrincipal) return undefined;
    return setoresEntorno.find((s) => s.pico?.azimute === pontoPrincipal.azimute)?.direcao;
  }, [setoresEntorno, pontoPrincipal]);

  const obstrucaoPrincipal = useMemo(() => {
    const p = pontoPrincipal;
    if (!p || !direcaoPrincipal) return null;
    return {
      azimute: p.azimute,
      direcao: direcaoPrincipal,
      anguloObstrucaoGraus: p.anguloObstrucaoGraus,
      distanciaMetros: p.distanciaObstaculoMetros,
      alturaMetros: p.alturaObstaculoAcimaDoSoloMetros ?? p.alturaObstaculoMetros,
      mascara: p.ponto?.mascara ?? null,
    };
  }, [pontoPrincipal, direcaoPrincipal]);

  const horasNumericas: number[] = useMemo(() => {
    const horas = calculoSolarAtual?.[estacaoSim];
    if (!horas) return [];
    return Object.keys(horas).map((h) => parseInt(h)).sort((a, b) => a - b);
  }, [calculoSolarAtual, estacaoSim]);

  useEffect(() => {
    if (horasNumericas.length) {
      setHoraSlider(horasNumericas[Math.floor(horasNumericas.length / 2)]);
    }
  }, [estacaoSim, horasNumericas.length]); 

  useEffect(() => {
    if (!animando || horasNumericas.length < 2) return;
    const min = horasNumericas[0], max = horasNumericas[horasNumericas.length - 1];
    const id = setInterval(() => {
      setHoraSlider((atual) => {
        const proximo = atual + 0.15;
        return proximo > max ? min : proximo;
      });
    }, 60);
    return () => clearInterval(id);
  }, [animando, horasNumericas]);

  useEffect(() => {
    if (!formAberto) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFormAberto(false);
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
            <h3 className="text-sm font-semibold text-ink mb-4">Confirme os dados desta análise</h3>
            <p className="text-sm text-ink mb-1">
              {form.logradouro}{form.numero ? `, ${form.numero}` : ''}{form.bairro ? ` - ${form.bairro}` : ''}
            </p>
            <p className="text-sm text-ink mb-4">{form.cidade} - {form.uf}</p>
            <p className="text-xs text-ink-soft mb-6">
              Finalidade: <strong className="text-ink">{form.finalidadeAnalise === "imovel_existente" ? "Avaliar imóvel existente" : "Projeto ou obra"}</strong>
              {form.tipoImovel && <> · <strong className="text-ink">{form.tipoImovel}</strong></>}
              <br />Fachada: <strong className="text-ink">{form.fachada}</strong>
              {form.andar ? <> · Andar <strong className="text-ink">{form.andar}º</strong></> : null}
            </p>
            <p className="text-xs text-warn-ink bg-warn-soft border border-transparent rounded-xl px-3 py-2 mb-6">
              Após confirmar, esses parâmetros ficam bloqueados — não será possível editar e gerar de novo sem uma nova análise.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setConfirmando(false)} className="flex-1 rounded-full border-line text-ink-soft hover:bg-surface-soft">
                Voltar e corrigir
              </Button>
              <Button onClick={executarAnalise} className="flex-1 rounded-full bg-brand-strong hover:bg-brand text-white font-semibold">
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
          formAberto ? "translate-x-0 scale-100 opacity-100 visible" : "-translate-x-full scale-[0.98] opacity-0 invisible"
        }`}
      >
        <div className="relative overflow-hidden p-6 pb-5 border-b border-line bg-brand-soft/50">
          <div className="absolute -top-12 -right-10 size-40 rounded-full border border-brand/10" />
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
              <h1 className="text-lg font-black tracking-tighter text-ink">VECTOR<span className="text-brand">-X</span></h1>
              <p className="text-xs font-medium text-brand-strong">Inteligência Bioclimática</p>
            </div>
          </div>
          {!dadosBioclimaticos && <>
            <p className="text-xs font-medium text-brand-strong mb-2">Leitura solar do endereço</p>
            <h2 className="text-2xl font-semibold leading-tight text-ink">Descubra como o sol chega a este imóvel.</h2>
            <p className="text-xs leading-relaxed text-ink-soft mt-2">Para uma casa onde você já mora, um imóvel que pensa comprar ou um projeto em desenvolvimento.</p>
          </>}
        </div>

        {!dadosBioclimaticos ? (
          <form onSubmit={submit} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 custom-scrollbar">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Target className="size-4 text-brand-strong" />
                <h2 className="text-xs font-medium text-ink-soft">Comece pelo objetivo</h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-ink-soft">O que você quer avaliar?</Label>
                  <Select value={form.finalidadeAnalise} onValueChange={(v: "imovel_existente" | "projeto") => setForm({ ...form, finalidadeAnalise: v })}>
                    <SelectTrigger className="h-11 rounded-xl border border-brand/30 bg-brand-soft/60 text-ink font-medium focus:ring-brand/40">
                      <SelectValue placeholder="Escolha o objetivo" />
                    </SelectTrigger>
                    <SelectContent className="z-[80] rounded-xl bg-surface border-line text-ink">
                      <SelectItem value="imovel_existente">Imóvel existente: moradia ou compra</SelectItem>
                      <SelectItem value="projeto">Projeto, obra nova ou reforma</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs leading-relaxed text-ink-soft">A análise ajuda a entender insolação e sombras do endereço antes de decidir ou projetar.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-ink-soft">Tipo de imóvel</Label>
                    <Select value={form.tipoImovel} onValueChange={(v) => setForm({ ...form, tipoImovel: v })}>
                      <SelectTrigger className="h-11 rounded-xl border border-line bg-surface-soft text-ink placeholder:text-ink-faint focus:ring-brand/40"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent className="z-[80] rounded-xl bg-surface border-line text-ink">
                        <SelectItem value="Apartamento">Apartamento</SelectItem>
                        <SelectItem value="Casa">Casa</SelectItem>
                        <SelectItem value="Outro imóvel">Outro imóvel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-ink-soft">Nome para identificar</Label>
                    <Input value={form.nomeProjeto} onChange={e => setForm({...form, nomeProjeto: e.target.value})} className="h-11 rounded-xl border-line bg-surface-soft text-ink placeholder:text-ink-faint focus-visible:ring-brand/40" placeholder="Ex: Apartamento que vou comprar" />
                  </div>
                </div>

                <div className="border-t border-line pt-4">
                  <p className="text-xs font-medium text-ink-soft mb-3">Onde fica?</p>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_100px]">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-ink-soft">CEP</Label>
                        <Input value={form.cep} onChange={handleCEPChange} placeholder="00000-000" maxLength={9} className="h-11 rounded-xl border-line bg-surface-soft text-ink placeholder:text-ink-faint focus-visible:ring-brand/40" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-ink-soft">Número</Label>
                        <Input value={form.numero} onChange={e => setForm({...form, numero: e.target.value})} placeholder="123" className="h-11 rounded-xl border-line bg-surface-soft text-ink placeholder:text-ink-faint focus-visible:ring-brand/40" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-ink-soft">Andar</Label>
                        <Input value={form.andar} onChange={e => setForm({...form, andar: e.target.value.replace(/\D/g, '')})} placeholder="0" className="h-11 rounded-xl border-line bg-surface-soft text-ink placeholder:text-ink-faint focus-visible:ring-brand/40" />
                      </div>
                    </div>

                    <SeletorLocalizacao
                      apiKey={GOOGLE_MAPS_API_KEY}
                      logradouro={form.logradouro}
                      numero={form.numero} 
                      cidade={form.cidade} 
                      uf={form.uf}         
                      ponto={form.lat !== null && form.lng !== null ? { lat: form.lat, lng: form.lng } : null}
                      onEnderecoChange={(logradouro) => {
                        setForm((prev) => ({ ...prev, logradouro, lat: null, lng: null, placeId: "" }));
                        setLocalConfirmado(false);
                        setErroLocalizacao("");
                      }}
                      onPontoChange={(ponto) => {
                        setForm((prev) => ({ ...prev, lat: ponto.lat, lng: ponto.lng, placeId: "" }));
                        setLocalConfirmado(false);
                        setErroLocalizacao("");
                      }}
                      onLocalSelecionado={(local) => {
                        const encontrarComponente = (tipo: string) => local.componentes.find((componente: any) => componente.types.includes(tipo));
                        const rua = encontrarComponente("route")?.long_name;
                        const numero = encontrarComponente("street_number")?.long_name;
                        const bairro = encontrarComponente("neighborhood")?.long_name
                          || encontrarComponente("sublocality_level_1")?.long_name
                          || encontrarComponente("sublocality")?.long_name;
                        const cidade = encontrarComponente("locality")?.long_name
                          || encontrarComponente("administrative_area_level_2")?.long_name;
                        const estado = encontrarComponente("administrative_area_level_1")?.short_name;
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
                    <div className="space-y-1.5">
                      <Label htmlFor="bairro-imovel" className="text-xs font-medium text-ink-soft">Bairro</Label>
                      <Input
                        id="bairro-imovel"
                        value={form.bairro}
                        onChange={(e) => setForm((prev) => ({ ...prev, bairro: e.target.value }))}
                        placeholder="Informe o bairro"
                        className="h-11 rounded-xl border-line bg-surface-soft text-ink placeholder:text-ink-faint focus-visible:ring-brand/40"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-soft p-3">
                      <p className="min-w-0 flex-1 text-xs text-ink-soft" aria-live="polite">
                        {form.lat !== null && form.lng !== null
                          ? `Pino: ${form.lat.toFixed(6)}, ${form.lng.toFixed(6)}${localConfirmado ? " · local confirmado" : " · confirme para continuar"}`
                          : "Escolha um resultado ou clique no mapa para marcar o prédio."}
                      </p>
                      <Button
                        type="button"
                        onClick={() => { setLocalConfirmado(true); setErroLocalizacao(""); }}
                        disabled={form.lat === null || form.lng === null}
                        aria-pressed={localConfirmado}
                        className="shrink-0 rounded-full bg-brand-strong text-white hover:bg-brand disabled:opacity-40"
                      >
                        Confirmar local
                      </Button>
                    </div>
                    {erroLocalizacao && <p role="alert" className="rounded-xl border border-danger-ink/20 bg-danger-soft p-3 text-xs leading-relaxed text-danger-ink">{erroLocalizacao}</p>}

                    <div className="grid grid-cols-[1fr_60px] gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-ink-soft">Cidade</Label>
                        <Input value={form.cidade} onChange={e => setForm({...form, cidade: e.target.value})} className="h-11 rounded-xl border-line bg-surface-soft text-ink placeholder:text-ink-faint focus-visible:ring-brand/40" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-ink-soft">UF</Label>
                        <Input value={form.uf} onChange={e => setForm({...form, uf: e.target.value.toUpperCase()})} maxLength={2} className="h-11 rounded-xl border-line bg-surface-soft text-center text-ink placeholder:text-ink-faint focus-visible:ring-brand/40" />
                      </div>
                    </div>
                  </div>
                </div>

                {form.finalidadeAnalise === "projeto" && <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-ink-soft">Etapa do projeto</Label>
                  <Select value={form.modalidade} onValueChange={(v: "obra_nova" | "reforma") => setForm({ ...form, modalidade: v })}>
                    <SelectTrigger className="h-11 rounded-xl border border-line bg-surface-soft text-ink font-medium focus:ring-brand/40">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="z-[80] rounded-xl bg-surface border-line text-ink">
                      <SelectItem value="obra_nova">Planejamento de obra nova</SelectItem>
                      <SelectItem value="reforma">Reforma em imóvel existente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>}

                {form.finalidadeAnalise === "projeto" && form.modalidade === "reforma" && (
                  <section className="rounded-2xl border border-warn-ink/20 bg-warn-soft p-3 text-warn-ink animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-xs font-semibold text-warn-ink">Na reforma, você também poderá explorar</p>
                        <p className="text-xs text-ink-soft mt-1">Recursos em desenvolvimento, além da leitura solar atual.</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-transparent bg-sand px-2 py-1 text-xs font-medium text-sand-ink">Em breve</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-surface/70 p-2.5">
                        <p className="text-xs font-semibold text-ink">Transmitância térmica</p>
                        <p className="text-xs leading-relaxed text-ink-soft mt-1">Desempenho de paredes e cobertura.</p>
                      </div>
                      <div className="rounded-xl bg-surface/70 p-2.5">
                        <p className="text-xs font-semibold text-ink">Materiais recomendados</p>
                        <p className="text-xs leading-relaxed text-ink-soft mt-1">Alternativas adequadas ao clima local.</p>
                      </div>
                      <div className="rounded-xl bg-surface/70 p-2.5">
                        <p className="text-xs font-semibold text-ink">Posicionamento no lote</p>
                        <p className="text-xs leading-relaxed text-ink-soft mt-1">Implantação e orientação do imóvel.</p>
                      </div>
                      <div className="rounded-xl bg-surface/70 p-2.5">
                        <p className="text-xs font-semibold text-ink">Ventilação natural</p>
                        <p className="text-xs leading-relaxed text-ink-soft mt-1">Estratégias para favorecer o conforto.</p>
                      </div>
                    </div>
                  </section>
                )}
                
                <div className="space-y-1.5 pt-2">
                  <Label className="text-xs font-medium text-ink-soft flex items-center gap-1.5">
                    <Compass className="size-3" /> Qual fachada ou orientação quer analisar?
                  </Label>
                  <Select value={form.fachada} onValueChange={(v) => setForm({ ...form, fachada: v })}>
                    <SelectTrigger className="h-11 rounded-xl border border-brand/30 bg-brand-soft/60 text-ink font-medium focus:ring-brand/40">
                      <SelectValue placeholder="Selecione a fachada..." />
                    </SelectTrigger>
                    <SelectContent className="z-[80] rounded-xl bg-surface border-line text-ink">
                      <SelectItem value="Norte">Norte (Maior Insolação)</SelectItem>
                      <SelectItem value="Sul">Sul (Menor Insolação)</SelectItem>
                      <SelectItem value="Leste">Leste (Sol da Manhã)</SelectItem>
                      <SelectItem value="Oeste">Oeste (Sol da Tarde)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.finalidadeAnalise === "projeto" && <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-medium text-ink-soft flex items-center gap-1.5">
                    <Ruler className="size-3" /> Espessura da Envoltória (cm)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={form.espessuraMaterial}
                    onChange={e => setForm({ ...form, espessuraMaterial: e.target.value.replace(/[^\d]/g, '') })}
                    placeholder="15"
                    className="h-11 rounded-xl border-line bg-surface-soft text-ink placeholder:text-ink-faint focus-visible:ring-brand/40"
                  />
                  <p className="text-[9px] text-zinc-600 leading-relaxed">
                    Usada pro cálculo de transmitância (U), capacidade térmica e atraso térmico da parede/cobertura. Se não souber ainda, deixe 15cm (padrão de alvenaria simples).
                  </p>
                </div>}

              </div>
            </div>
          </form>
        ) : (
          <div className="flex-1 p-6 space-y-5 custom-scrollbar overflow-y-auto">
            <div className="flex items-center gap-2 text-xs font-medium text-ink-soft">
              <ShieldCheck className="size-3.5" /> Parâmetros bloqueados
            </div>
            <div className="space-y-3 text-sm text-ink-soft bg-surface-soft border border-line p-4 rounded-2xl">
              <p className="font-semibold text-ink">{form.nomeProjeto}</p>
              <p>{form.logradouro}{form.numero ? `, ${form.numero}` : ''}</p>
              <p>{form.cidade} - {form.uf}</p>
              <p className="text-brand-strong font-semibold text-xs pt-2 border-t border-line mt-2">
                Fachada: {fachadaAtual}
              </p>
            </div>
            <p className="text-xs text-ink-soft leading-relaxed pt-2">
              Essa análise já foi processada e registrada no sistema. Pra avaliar outro terreno ou eixo de fachada, inicie uma nova análise.
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setDadosBioclimaticos(null);
                setForm({
                  cep: "", logradouro: "", numero: "", bairro: "", cidade: "", uf: "",
                  andar: "", modalidade: "obra_nova", finalidadeAnalise: "imovel_existente",
                  tipoImovel: "", fachada: "", nomeProjeto: "", espessuraMaterial: "15",
                  lat: null, lng: null, placeId: "",
                });
                router.navigate({ to: "/wellness-analise-solar", search: { obraId: undefined } });
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
              className="w-full h-12 rounded-full bg-brand-strong text-white font-semibold transition-all hover:bg-brand disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Sparkles className="size-4" /> MAPEANDO CENÁRIO...
                </span>
              ) : (
                "GERAR LEITURA SOLAR"
              )}
            </Button>
          </div>
        )}
      </aside>

      <main className="flex-1 w-full min-w-0 min-h-screen bg-canvas p-4 md:p-8 custom-scrollbar">

        <div className="max-w-6xl mx-auto flex items-center justify-between mb-6">
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
            {dadosBioclimaticos
              ? <><ShieldCheck className="size-3.5 mr-2" /> Parâmetros da análise</>
              : <><Target className="size-3.5 mr-2" /> Analisar um endereço</>}
          </Button>
        </div>

        {!dadosBioclimaticos && !loading && (
          <div className="max-w-6xl mx-auto flex flex-col justify-center min-h-[50vh] md:min-h-full animate-in fade-in zoom-in-95 duration-500 py-8">
            <div className="mb-8 md:mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-soft border border-transparent text-xs font-medium text-brand-strong mb-4">
                <Sparkles className="size-3" /> Motor de Engenharia Bioclimática
              </div>
              <h1 className="max-w-5xl text-3xl md:text-5xl font-semibold text-ink tracking-tight mb-4">
                Incidência Solar <br />
                <span className="text-brand">Descubra como o sol chega ao imóvel.</span>
              </h1>
              <p className="text-ink-soft max-w-2xl text-sm md:text-base leading-relaxed">
                Avalie uma casa ou apartamento existente, confira um endereço antes de comprar ou use os dados para planejar uma obra. Veja horários de sol, orientação da fachada, sombras do entorno e contexto climático em um relatório visual.
              </p>
              <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-xs font-medium text-ink-soft">
                <span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-brand" />Casa onde você mora</span>
                <span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-brand-soft border border-brand" />Imóvel em avaliação de compra</span>
                <span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-sand" />Projeto ou reforma</span>
              </div>
              <Button
                onClick={() => setFormAberto(true)}
                className="mt-6 h-12 px-6 bg-brand-strong text-white rounded-full hover:bg-brand font-semibold shadow-[0_8px_24px_rgba(58,125,94,0.18)] transition-all hover:-translate-y-0.5"
              >
                <Target className="size-4 mr-2" /> Analisar um endereço
              </Button>
            </div>

            <div className="mb-4 flex items-center gap-3">
              <span className="h-px w-8 bg-brand/60" />
              <h2 className="text-xs font-medium text-ink-soft">O que você vai descobrir</h2>
            </div>
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-5 pb-4 md:pb-0 custom-scrollbar-hide items-stretch">
              <div className="min-w-[260px] md:min-w-0 snap-center shrink-0 bg-surface border border-line hover:border-brand/40 rounded-2xl shadow-[0_2px_12px_rgba(46,53,50,0.04)] p-5 flex flex-col transition-colors">
                <div className="size-10 rounded-xl bg-brand-soft border border-transparent flex items-center justify-center mb-5">
                  <Satellite className="size-5 text-brand-strong" />
                </div>
                <h3 className="text-sm font-semibold text-ink mb-2">Sol por horário e estação</h3>
                <p className="text-xs text-ink-soft leading-relaxed">
                  Entenda em quais períodos a fachada recebe sol direto e como a trajetória muda ao longo do ano.
                </p>
              </div>

              <div className="min-w-[260px] md:min-w-0 snap-center shrink-0 bg-surface border border-line hover:border-brand/40 rounded-2xl shadow-[0_2px_12px_rgba(46,53,50,0.04)] p-5 flex flex-col transition-colors">
                <div className="size-10 rounded-xl bg-brand-soft border border-transparent flex items-center justify-center mb-5">
                  <Layers className="size-5 text-brand-strong" />
                </div>
                <h3 className="text-sm font-semibold text-ink mb-2">Sombras do entorno</h3>
                <p className="text-xs text-ink-soft leading-relaxed">
                  Veja obstruções próximas por direção e como elas podem interferir na entrada de sol da fachada.
                </p>
              </div>

              <div className="min-w-[260px] md:min-w-0 snap-center shrink-0 bg-surface border border-line hover:border-brand/40 rounded-2xl shadow-[0_2px_12px_rgba(46,53,50,0.04)] p-5 flex flex-col transition-colors">
                <div className="size-10 rounded-xl bg-brand-soft border border-transparent flex items-center justify-center mb-5">
                  <Thermometer className="size-5 text-brand-strong" />
                </div>
                <h3 className="text-sm font-semibold text-ink mb-2">Clima e localização</h3>
                <p className="text-xs text-ink-soft leading-relaxed">
                  Contextualize a insolação com a zona bioclimática e os dados climáticos disponíveis para a região.
                </p>
              </div>

              <div className="min-w-[260px] md:min-w-0 snap-center shrink-0 bg-surface border border-line hover:border-brand/40 rounded-2xl shadow-[0_2px_12px_rgba(46,53,50,0.04)] p-5 flex flex-col transition-colors">
                <div className="size-10 rounded-xl bg-sand border border-transparent flex items-center justify-center mb-5">
                  <Zap className="size-5 text-sand-ink" />
                </div>
                <h3 className="text-sm font-semibold text-ink mb-2">Potencial fotovoltaico</h3>
                <p className="text-xs text-ink-soft leading-relaxed">
                  Consulte uma estimativa de geração e economia solar do telhado quando houver dados disponíveis para o endereço.
                </p>
              </div>

              <div className="min-w-[260px] md:min-w-0 snap-center shrink-0 bg-surface border border-line hover:border-brand/40 rounded-2xl shadow-[0_2px_12px_rgba(46,53,50,0.04)] p-5 flex flex-col transition-colors">
                <div className="size-10 rounded-xl bg-brand-soft border border-transparent flex items-center justify-center mb-5">
                  <CloudRain className="size-5 text-brand-strong" />
                </div>
                <h3 className="text-sm font-semibold text-ink mb-2">Captação de água da chuva</h3>
                <p className="text-xs text-ink-soft leading-relaxed">
                  Veja uma estimativa de volume captável e economia potencial, baseada na chuva local e em um telhado de referência.
                </p>
              </div>

              <div className="min-w-[260px] md:min-w-0 snap-center shrink-0 bg-surface border border-line hover:border-brand/40 rounded-2xl shadow-[0_2px_12px_rgba(46,53,50,0.04)] p-5 flex flex-col transition-colors">
                <div className="size-10 rounded-xl bg-brand-soft border border-transparent flex items-center justify-center mb-5">
                  <ShieldCheck className="size-5 text-brand-strong" />
                </div>
                <h3 className="text-sm font-semibold text-ink mb-2">Um relatório para decidir</h3>
                <p className="text-xs text-ink-soft leading-relaxed">
                  Baixe a leitura em PDF para comparar endereços ou conversar com seu arquiteto com mais contexto.
                </p>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="h-[60vh] md:h-full flex flex-col items-center justify-center">
            <div className="relative size-24">
              <div className="absolute inset-0 border-t-2 border-brand rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-b-2 border-brand-soft rounded-full animate-spin" style={{ animationDirection: 'reverse' }}></div>
              <Cpu className="absolute inset-0 m-auto size-6 text-brand-strong animate-pulse" />
            </div>
            <p className="mt-6 text-xs font-medium text-brand-strong animate-pulse">Cruzando dados NBR 15220...</p>
          </div>
        )}

        {dadosBioclimaticos && !loading && (
          <div className="max-w-[850px] mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500 pb-20">
            <div className="flex items-center justify-between bg-surface border border-line rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-2 w-2 rounded-full bg-brand animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-strong">Laudo Técnico Executivo Pronto</span>
              </div>
              <Button onClick={exportarPDF} className="bg-brand-strong hover:bg-brand text-white rounded-full h-9 text-xs font-bold uppercase tracking-wider">
                <Download className="size-3 mr-2" /> Baixar Laudo Profissional
              </Button>
            </div>

            <div ref={relatorioRef} className="bg-surface-soft flex flex-col gap-8 p-4 rounded-xl">
              
              <CapaLaudo
                nomeProjeto={form.nomeProjeto || "Projeto Bioclimático"}
                endereco={
                  dadosBioclimaticos.endereco ||
                  `${form.logradouro}${form.numero ? ", " + form.numero : ""}${form.bairro ? " - " + form.bairro : ""}, ${form.cidade} - ${form.uf}`
                }
                fachada={fachadaAtual}
                zona={dadosBioclimaticos.zona}
                subzona={dadosBioclimaticos.subzona}
                nota={dadosBioclimaticos.score_bioclimatico?.nota}
                resumoScore={dadosBioclimaticos.score_bioclimatico?.resumo}
                fonteSolar={fonteSombreamentoResumo === "perfil_real_dsm" ? "Trajetória + DSM" : "Trajetória calculada"}
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

              {/* PÁGINA 2: DIAGNÓSTICO DETALHADO DA ZONA BIOCLIMÁTICA */}
              <div className="pdf-page bg-white w-full aspect-[210/297] rounded-md shadow-sm border border-line overflow-hidden relative text-ink p-8 flex flex-col">
                <div className="flex items-start justify-between border-b-2 border-ink pb-3 mb-3.5 gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.18em] text-brand-strong">
                        Enquadramento Normativo · ABNT NBR 15220-3:2024
                      </span>
                      {dadosBioclimaticos.intervalo_nbr15575 && (
                        <span className="rounded bg-surface-soft border border-line px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-ink-soft">
                          NBR 15575 · Intervalo {dadosBioclimaticos.intervalo_nbr15575}
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl font-black text-ink mt-1">
                      Zona Bioclimática {dadosBioclimaticos.zona}{dadosBioclimaticos.subzona} · {dadosBioclimaticos.caracteristica || "Classificação Oficial"}
                    </h2>
                    <p className="text-[11px] text-ink-soft mt-0.5">
                      Local analisado: <strong className="text-ink">{dadosBioclimaticos.municipio || form.cidade}/{dadosBioclimaticos.uf || form.uf}</strong>
                      {dadosBioclimaticos.cidade_representativa && (
                        <> · Cidade-referência da subzona: <strong className="text-ink">{dadosBioclimaticos.cidade_representativa}/{dadosBioclimaticos.estado_representativo || dadosBioclimaticos.uf}</strong></>
                      )}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="inline-block rounded-full bg-brand-soft border border-brand/30 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-brand-strong">
                      {dadosBioclimaticos.amplitude_termica || `Subzona ${dadosBioclimaticos.zona}${dadosBioclimaticos.subzona}`}
                    </span>
                    {dadosBioclimaticos.nome_estacao && (
                      <p className="text-[8px] text-ink-soft mt-1">
                        Estação INMET: {dadosBioclimaticos.nome_estacao} ({formatarNumero(dadosBioclimaticos.distancia_km, 1)} km)
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-surface-soft border border-line rounded-xl p-3.5 mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-brand-strong flex items-center gap-1.5">
                      <Thermometer className="size-3.5" /> Comportamento Climático da Subzona {dadosBioclimaticos.zona}{dadosBioclimaticos.subzona}
                    </p>
                  </div>
                  <p className="text-[10.5px] text-ink leading-relaxed font-medium">
                    {dadosBioclimaticos.resumo_climatico ||
                      `O município de ${dadosBioclimaticos.municipio || form.cidade} insere-se na Zona Bioclimática ${dadosBioclimaticos.zona}${dadosBioclimaticos.subzona} (${dadosBioclimaticos.caracteristica}), demandando soluções arquitetónicas adaptadas às condições higrotérmicas locais.`}
                  </p>
                  {dadosBioclimaticos.criterio_classificacao && (
                    <p className="text-[9.5px] text-ink-soft mt-1.5 pt-1.5 border-t border-line/80 leading-snug">
                      <strong className="text-ink uppercase tracking-wider text-[8.5px]">Critério da Norma: </strong>
                      {dadosBioclimaticos.criterio_classificacao}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2 mb-3">
                  <div className="rounded-lg border border-line bg-white p-2.5">
                    <p className="text-[8px] font-black uppercase tracking-wider text-ink-soft">Limiar TBSm (Norma)</p>
                    <p className="text-xs font-black text-ink mt-0.5">
                      {dadosBioclimaticos.temp_bulbo_seco_min != null && dadosBioclimaticos.temp_bulbo_seco_max != null
                        ? `${formatarNumero(dadosBioclimaticos.temp_bulbo_seco_min, 1)}°C a ${formatarNumero(dadosBioclimaticos.temp_bulbo_seco_max, 1)}°C`
                        : dadosBioclimaticos.temp_bulbo_seco_max != null
                        ? `≤ ${formatarNumero(dadosBioclimaticos.temp_bulbo_seco_max, 1)}°C`
                        : dadosBioclimaticos.temp_bulbo_seco_min != null
                        ? `> ${formatarNumero(dadosBioclimaticos.temp_bulbo_seco_min, 1)}°C`
                        : "Conforme subzona"}
                    </p>
                    <p className="text-[8px] text-ink-soft mt-0.5">Média anual de bulbo seco</p>
                  </div>

                  <div className="rounded-lg border border-line bg-white p-2.5">
                    <p className="text-[8px] font-black uppercase tracking-wider text-ink-soft">Extremos de Projeto</p>
                    <p className="text-xs font-black text-ink mt-0.5">
                      {dadosBioclimaticos.temp_projeto_inverno_c != null && dadosBioclimaticos.temp_projeto_verao_c != null
                        ? `${formatarNumero(dadosBioclimaticos.temp_projeto_inverno_c, 1)}°C / ${formatarNumero(dadosBioclimaticos.temp_projeto_verao_c, 1)}°C`
                        : `${formatarNumero(dadosBioclimaticos.temp_media, 1)}°C (média)`}
                    </p>
                    <p className="text-[8px] text-ink-soft mt-0.5">Ref. Inverno / Verão na zona</p>
                  </div>

                  <div className="rounded-lg border border-line bg-white p-2.5">
                    <p className="text-[8px] font-black uppercase tracking-wider text-ink-soft">Humidade e Limiar</p>
                    <p className="text-xs font-black text-ink mt-0.5">
                      {dadosBioclimaticos.umidade_media != null ? `${formatarNumero(dadosBioclimaticos.umidade_media, 1)}% real` : "N/D"}
                    </p>
                    <p className="text-[8px] text-ink-soft mt-0.5">
                      {dadosBioclimaticos.umidade_relativa_limiar != null
                        ? `Limiar subzona: ${dadosBioclimaticos.umidade_relativa_condicao === "maior" ? ">" : "≤"} ${formatarNumero(dadosBioclimaticos.umidade_relativa_limiar, 1)}%`
                        : "Subzona definida por inverno (R/M)"}
                    </p>
                  </div>

                  <div className="rounded-lg border border-line bg-white p-2.5">
                    <p className="text-[8px] font-black uppercase tracking-wider text-ink-soft">Radiação e Chuva Local</p>
                    <p className="text-xs font-black text-ink mt-0.5">
                      {dadosBioclimaticos.radiacao_media != null ? `${formatarNumero(dadosBioclimaticos.radiacao_media, 0)} W/m²` : "N/D"}
                    </p>
                    <p className="text-[8px] text-ink-soft mt-0.5">
                      {chuvaMilimetros != null ? `Precipitação: ${formatarNumero(chuvaMilimetros, 0)} mm/ano` : "Média horária insolada"}
                    </p>
                  </div>
                </div>

                {(dadosBioclimaticos.desafio_inverno || dadosBioclimaticos.desafio_verao) && (
                  <div className="grid grid-cols-2 gap-2.5 mb-3.5">
                    <div className="rounded-xl bg-sky-50/70 border border-sky-100 p-3">
                      <p className="text-[8.5px] font-black uppercase tracking-[0.14em] text-sky-800">
                        Solicitação de Inverno na Zona {dadosBioclimaticos.zona}{dadosBioclimaticos.subzona}
                      </p>
                      <p className="text-[9.5px] leading-snug text-ink-soft mt-1">
                        {dadosBioclimaticos.desafio_inverno || "Requer avaliação de estanqueidade e retenção térmica conforme orientação solar."}
                      </p>
                    </div>
                    <div className="rounded-xl bg-amber-50/70 border border-amber-100 p-3">
                      <p className="text-[8.5px] font-black uppercase tracking-[0.14em] text-amber-800">
                        Solicitação de Verão na Zona {dadosBioclimaticos.zona}{dadosBioclimaticos.subzona}
                      </p>
                      <p className="text-[9.5px] leading-snug text-ink-soft mt-1">
                        {dadosBioclimaticos.desafio_verao || "Requer controlo de ganho solar direto nas aberturas e ventilação seletiva."}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-ink flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5 text-brand-strong" /> Diretrizes Construtivas Recomendadas para a Zona {dadosBioclimaticos.zona}{dadosBioclimaticos.subzona}
                    </h3>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-ink-soft">
                      NBR 15220-3:2024 + Guia de Resiliência
                    </span>
                  </div>

                  {(() => {
                    const confortoDetalhado: Array<{ diretriz: string; detalhamento?: string }> =
                      Array.isArray(dadosBioclimaticos.diretrizes_conforto_detalhadas) && dadosBioclimaticos.diretrizes_conforto_detalhadas.length > 0
                        ? dadosBioclimaticos.diretrizes_conforto_detalhadas
                        : (Array.isArray(dadosBioclimaticos.estrategias_conforto) ? dadosBioclimaticos.estrategias_conforto : []).map((d: string) => ({
                            diretriz: d,
                            detalhamento: "Estratégia passiva de desempenho térmico catalogada para esta zona bioclimática.",
                          }));

                    const resilienciaDetalhada: Array<{ diretriz: string; detalhamento?: string }> =
                      Array.isArray(dadosBioclimaticos.diretrizes_resiliencia_detalhadas) && dadosBioclimaticos.diretrizes_resiliencia_detalhadas.length > 0
                        ? dadosBioclimaticos.diretrizes_resiliencia_detalhadas
                        : (Array.isArray(dadosBioclimaticos.estrategias_resiliencia) ? dadosBioclimaticos.estrategias_resiliencia : []).map((d: string) => ({
                            diretriz: d,
                            detalhamento: "Medida de adaptação e resiliência física recomendada para eventos climáticos da região.",
                          }));

                    return (
                      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
                        <div className="rounded-xl border border-line bg-surface-soft/60 p-3 flex flex-col">
                          <p className="text-[8.5px] font-black uppercase tracking-[0.14em] text-brand-strong mb-2">
                            Estratégias de Conforto Térmico ({confortoDetalhado.length})
                          </p>
                          <div className="space-y-2">
                            {confortoDetalhado.slice(0, 4).map((item, idx) => (
                              <div key={idx} className="rounded-lg bg-white border border-line/80 p-2">
                                <p className="text-[9.5px] font-bold text-ink leading-tight">{item.diretriz}</p>
                                {item.detalhamento && (
                                  <p className="text-[8.5px] text-ink-soft leading-snug mt-0.5">{item.detalhamento}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-xl border border-line bg-surface-soft/60 p-3 flex flex-col">
                          <p className="text-[8.5px] font-black uppercase tracking-[0.14em] text-ink mb-2">
                            Resiliência e Adaptação Climática ({resilienciaDetalhada.length})
                          </p>
                          <div className="space-y-2">
                            {resilienciaDetalhada.slice(0, 4).map((item, idx) => (
                              <div key={idx} className="rounded-lg bg-white border border-line/80 p-2">
                                <p className="text-[9.5px] font-bold text-ink leading-tight">{item.diretriz}</p>
                                {item.detalhamento && (
                                  <p className="text-[8.5px] text-ink-soft leading-snug mt-0.5">{item.detalhamento}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="mt-3 shrink-0 flex justify-between border-t border-line pt-2 text-[7px] font-bold uppercase tracking-widest text-ink-soft/70">
                  <span>Diagnóstico de Zoneamento Bioclimático · Base ABNT NBR 15220-3:2024 e INMET</span>
                  <span>Vector-X · {new Date().toLocaleDateString("pt-BR")}</span>
                </div>
              </div>

              {/* PÁGINA 3: CARTA SOLAR E SOMBREAMENTO */}
              <PaginaCartaSolar
                fachadaAtual={fachadaAtual}
                sombreamentoReal={sombreamentoReal}
                calculoSolarAtual={calculoSolarAtual}
                percentualReal={percentualReal}
                fonteSombreamentoResumo={fonteSombreamentoResumo}
                leituraSolar={leituraSolar}
                obstrucaoPrincipal={obstrucaoPrincipal}
              />

              {/* PÁGINA 4: LEITURA APLICADA */}
              <div className="pdf-page bg-white w-full aspect-[210/297] rounded-md shadow-sm border border-line overflow-hidden relative text-ink p-8 flex flex-col">
                <div className="flex items-start justify-between border-b-2 border-ink pb-3 mb-4 gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-brand-strong">Leitura aplicada · Vector-X</p>
                    <h2 className="text-2xl font-black text-ink mt-1">O que a orientação significa</h2>
                    <p className="text-xs text-ink-soft mt-1">Fachada {fachadaAtual} · {form.cidade}/{form.uf} · Zona {dadosBioclimaticos.zona}{dadosBioclimaticos.subzona}</p>
                  </div>
                  <div className="shrink-0 text-right"><p className="text-[9px] uppercase tracking-widest font-bold text-ink-soft">Fonte solar</p><p className="text-sm font-black text-ink mt-1">{fonteSombreamentoResumo === "perfil_real_dsm" ? "Trajetória + DSM" : "Trajetória calculada"}</p></div>
                </div>

                <section className="mb-4">
                  {(() => {
                    const comDados = leituraSolar.porEstacao.filter((item) => item.percentualSol != null);
                    const maiorExposicao = [...comDados].sort((a, b) => (b.percentualSol ?? 0) - (a.percentualSol ?? 0))[0];
                    const menorExposicao = [...comDados].sort((a, b) => (a.percentualSol ?? 0) - (b.percentualSol ?? 0))[0];
                    return comDados.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="rounded-lg bg-brand-soft/60 border border-line p-3"><p className="text-[8px] font-black uppercase tracking-[0.14em] text-brand-strong">Maior exposição observada</p><p className="text-base font-black text-ink mt-0.5">{maiorExposicao.estacao} · {maiorExposicao.percentualSol}%</p><p className="text-[9px] text-ink-soft mt-0.5">{maiorExposicao.solDireto} de {maiorExposicao.total} amostras com sol direto</p></div>
                        <div className="rounded-lg bg-surface-soft border border-line p-3"><p className="text-[8px] font-black uppercase tracking-[0.14em] text-ink-soft">Menor exposição observada</p><p className="text-base font-black text-ink mt-0.5">{menorExposicao.estacao} · {menorExposicao.percentualSol}%</p><p className="text-[9px] text-ink-soft mt-0.5">Menor incidência direta entre as estações avaliadas</p></div>
                      </div>
                    );
                  })()}
                  <div className="flex items-end justify-between mb-2">
                    <div><h3 className="text-xs font-black uppercase tracking-[0.14em] text-ink">Exposição direta ao longo do ano</h3><p className="text-[10px] text-ink-soft mt-1">Cada proporção compara amostras classificadas com o total de horários fornecidos para a estação.</p></div>
                    <span className="text-[9px] uppercase tracking-wider text-ink-soft/70">Amostras, não horas acumuladas</span>
                  </div>
                  <div className="space-y-2">
                    {leituraSolar.porEstacao.map((item) => (
                      <div key={item.estacao} className="grid grid-cols-[68px_1fr_88px] items-center gap-2 rounded-lg border border-line px-2.5 py-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-ink-soft">{item.estacao}</span>
                        <div>
                          <div className="h-2.5 rounded-full bg-surface-soft overflow-hidden"><div className="h-full rounded-full bg-brand-strong" style={{ width: `${item.percentualSol ?? 0}%` }} /></div>
                          {(() => {
                            const { comSol, bloqueados } = horariosDaEstacao(calculoSolarAtual?.[item.estacao]);
                            return (
                              <p className="text-[8px] leading-tight text-ink-soft mt-0.5">
                                {comSol.length > 0 ? `Sol direto às ${comSol.join(", ")}` : "Sem sol direto nesta estação"}
                                {bloqueados.length > 0 && ` · Bloqueado pelo entorno às ${bloqueados.join(", ")}`}
                              </p>
                            );
                          })()}
                        </div>
                        <div className="text-right"><strong className="text-sm text-ink">{item.solDireto}/{item.total}</strong><p className="text-[9px] text-ink-soft">{item.percentualSol ?? 0}%{leituraSolar.pontosComDado > 0 ? ` · ${item.obstruidos} bloqueios` : ''}</p></div>
                      </div>
                    ))}
                  </div>
                </section>

                {leituraSolar.pontosComDado === 0 && (
                  <p className="text-[9px] leading-snug text-amber-800 bg-amber-50 border border-amber-100 rounded-md p-2 mb-3">
                    Sem cobertura de elevação da Google para este endereço: as sombras do entorno (vizinhos e árvores) não foram medidas. O percentual de sol é uma estimativa pela trajetória solar e pelo telhado.
                  </p>
                )}

                <section className="grid grid-cols-2 gap-2 mb-3">
                  <div className="rounded-lg bg-sky-50 border border-sky-100 p-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-sky-800">Luz natural e bem-estar</p>
                    <p className="text-[10px] leading-snug text-ink-soft mt-1.5">Os períodos com incidência direta podem favorecer luz natural e contato com o ciclo do dia. Sol direto também pode causar ofuscamento; a carta indica quando investigar proteção ajustável. A iluminância interna não é calculada: faltam dimensões/orientação das aberturas, vidro e obstruções internas.</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-amber-800">Conforto térmico e energia</p>
                    <p className="text-[10px] leading-snug text-ink-soft mt-1.5">Radiação na fachada representa ganho de calor: pode ser útil em períodos frios e aumentar carga de resfriamento em períodos quentes. A orientação ajuda a localizar horários críticos para brises, vegetação ou sombreamento externo; não substitui simulação térmica e não converte fachada em kWh de economia.</p>
                  </div>
                </section>

                <section className="mt-auto rounded-lg bg-ink text-surface p-3">
                  <p className="text-[8px] font-black uppercase tracking-[0.14em] text-brand-soft">Implicação para o partido arquitetônico</p>
                  <p className="text-[10px] leading-snug text-surface/80 mt-1.5">Use a faixa horária observada para posicionar usos sensíveis ao calor/ofuscamento e dimensionar proteção solar externa. Preserve entrada de luz difusa e ventilação; não bloqueie toda a fachada com base apenas no percentual. Confirme a solução com geometria das aberturas, entorno construído atualizado e simulação térmica do edifício.</p>
                </section>

                <div className="mt-3 shrink-0 flex justify-between border-t border-line pt-2 text-[7px] font-bold uppercase tracking-widest text-ink-soft/70"><span>Interpretação baseada nos horários classificados e no horizonte DSM recebido</span><span>Vector-X · {new Date().toLocaleDateString('pt-BR')}</span></div>
              </div>
              
              {/* PÁGINA 5: O ENTORNO QUE INTERFERE */}
              {leituraSolar.pontosComDado > 0 && (
                <div className="pdf-page bg-white w-full aspect-[210/297] rounded-md shadow-sm border border-line overflow-hidden relative text-ink p-8 flex flex-col">
                  <div className="border-b-2 border-ink pb-3 mb-5">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-brand-strong">Entorno · Vector-X</p>
                    <h2 className="text-2xl font-black text-ink mt-1">O que interfere no sol desta fachada</h2>
                    <p className="text-xs text-ink-soft mt-1">
                      Fachada {fachadaAtual} · Perfil DSM: {leituraSolar.pontosComDado}/{leituraSolar.pontosTotais} direções com dado válido
                    </p>
                  </div>
                  
                  <ResumoEntorno
                    setores={setoresEntorno}
                    direcaoPrincipal={direcaoPrincipal}
                    azimuteFachada={azimuteFachadaAtual}
                  />
                
                  <div className="mt-5 flex-1 min-h-0">
                    <MapaEntorno
                      mapa={sombreamentoReal?.mapa}
                      perfil={perfilHorizonteReal}
                      azimuteFachada={azimuteFachadaAtual}
                      calculoSolar={calculoSolarAtual}
                    />
                  </div>
                  
                  <p className="mt-3 text-[9px] leading-snug text-ink-soft">
                  Só entram na leitura os obstáculos na frente da fachada que cruzam a trajetória solar local.
                  Obstáculos mais baixos que o sol naquela direção não geram alerta de bloqueio.
                  {sombreamentoReal?.aviso_imagery_antiga && (<><br /><span className="font-semibold text-amber-700">Nota sobre o satélite:</span> {sombreamentoReal.aviso_imagery_antiga}</>)}
                   </p>
                  
                  <div className="mt-auto shrink-0 pt-2 text-right text-[8px] font-bold uppercase tracking-widest text-ink-soft/70">Vector-X · {new Date().toLocaleDateString('pt-BR')}</div>
                </div>
              )}

            </div>

            {calculoSolarAtual?.Verao && (
              <section className="rounded-3xl border border-line bg-surface p-4 md:p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-strong">Exploração espacial</p>
                    <h3 className="text-xl font-black text-ink">Simulação 3D da fachada e trajetória solar</h3>
                    <p className="text-xs text-ink-soft mt-1">Arraste para orbitar, use a roda para aproximar e altere estação e horário dentro da cena.</p>
                  </div>
                  <Building2 className="size-6 text-brand shrink-0" />
                </div>
                <SimuladorSombreamento3D
                  calculoSolar={calculoSolarAtual}
                  obstrucao={obstrucaoPrincipal}
                  fachadaAtual={fachadaAtual}
                  telhado={sombreamentoReal?.segmento_usado}
                  mostrarJanelasIlustrativas
                  perfilHorizonte={perfilHorizonteReal}
                  observador={sombreamentoReal?.mapa?.observador ?? null}
                  azimuteFachadaUsado={azimuteFachadaAtual}
                  avisoImageryAntiga={sombreamentoReal?.aviso_imagery_antiga}
                  azimutesBloqueantes={azimutesBloqueantes}
                />
              </section>
            )}
          </div>
        )}
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(76,154,116,0.25); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(76,154,116,0.5); }
        .custom-scrollbar-hide::-webkit-scrollbar { display: none; }
        @keyframes material-scan {
          from { transform: translateX(-140%); }
          to { transform: translateX(320%); }
        }
        .animate-material-scan { animation: material-scan 2.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .animate-material-scan { animation: none; }
        }
      `}</style>
    </div>
  );
}