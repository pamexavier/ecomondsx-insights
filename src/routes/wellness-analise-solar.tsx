import { createFileRoute, useRouter } from "@tanstack/react-router";
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
  MapPin, Loader2, CloudRain, Thermometer, Wind,
  ShieldCheck, Cpu, FileText, Download, Target, Compass, Sun,
  Layers, Award, Satellite, Ruler, Play, Pause, Building2, ArrowLeft,
  Eye
} from "lucide-react";

// Bibliotecas para geração do PDF
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { supabase } from "@/lib/supabase";
import { BrazilZonesMap } from "@/components/BrazilZonesMap";

export const Route = createFileRoute("/wellness-analise-solar")({
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

const N8N_WEBHOOK_URL = "http://localhost:5678/webhook-test/analise-solar";
const TABELA_PROPRIA = "analises_vectorx";

async function persistirAnaliseVectorX(obraId: string, analiseNormalizada: any) {
  const colunas = [
    "zona", "subzona", "municipio", "uf", "caracteristica", "fachada", "endereco",
    "nome_estacao", "temp_bulbo_seco_min", "temp_bulbo_seco_max", "temp_media",
    "umidade_media", "radiacao_media", "distancia_km", "resumo", "classificacao",
    "clima", "potencial_hidrico", "score_bioclimatico", "estrategias_conforto",
    "estrategias_resiliencia", "recomendacoes_conforto", "recomendacoes_resiliencia",
    "resumo_executivo", "leitura_ia", "calculo_solar",
    "sombreamento_real", "cards_materiais", "material_recomendado",
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
    'sombreamento_real', 'cards_materiais', 'material_recomendado',
  ];
  const normalizado = { ...resposta };
  camposJson.forEach((campo) => {
    if (typeof normalizado[campo] === 'string') {
      try { normalizado[campo] = JSON.parse(normalizado[campo]); } catch {}
    }
  });
  return normalizado;
};

const categorizarEstrategias = (estrategias: any[] = [], tipo: 'conforto' | 'resiliencia') => {
  const categorias = tipo === 'conforto'
    ? [
        { nome: 'Brises e Sombreamento', termos: ['brise', 'sombra', 'sombreamento', 'persiana', 'beiral', 'proteção'] },
        { nome: 'Ventilação e Térmica', termos: ['ventila', 'conforto', 'resfri', 'abertura', 'ar', 'cruzada'] },
        { nome: 'Materiais e Envoltória', termos: ['isolamento', 'parede', 'cobertura', 'material', 'inércia', 'fachada', 'vidro'] },
      ]
    : [
        { nome: 'Água e Drenagem', termos: ['água', 'chuva', 'reservatório', 'reaproveitamento', 'drenagem', 'cisterna'] },
        { nome: 'Estrutura e Ventos', termos: ['estrutura', 'vento', 'ancor', 'cobertura', 'carga', 'resistência'] },
        { nome: 'Operação e Contingência', termos: ['emergência', 'contingência', 'fechamento', 'reserva', 'manutenção'] },
      ];

  const agrupadas = categorias.map((categoria) => ({ ...categoria, itens: [] as string[] }));
  const outras: string[] = [];

  estrategias.forEach((estrategia) => {
    if (estrategia && typeof estrategia === 'object' && estrategia.categoria && estrategia.texto) {
      const categoria = agrupadas.find((c) => c.nome === estrategia.categoria);
      if (categoria) categoria.itens.push(estrategia.texto);
      else outras.push(estrategia.texto);
      return;
    }
    const texto = typeof estrategia === 'string' ? estrategia : estrategia?.descricao || String(estrategia);
    const categoria = agrupadas.find(({ termos }) => termos.some((termo) => texto.toLowerCase().includes(termo)));
    if (categoria) categoria.itens.push(texto);
    else outras.push(texto);
  });

  if (outras.length) agrupadas.push({ nome: 'Recomendações Gerais', termos: [], itens: outras });
  return agrupadas.filter((c) => c.itens.length > 0);
};

// ── LÓGICA DA CARTA SOLAR SVG ──
const FAIXAS_FACHADA: Record<string, { min: number; max: number }> = {
  Norte: { min: 270, max: 90 }, Nordeste: { min: 315, max: 135 },
  Leste: { min: 0, max: 180 }, Sudeste: { min: 45, max: 225 },
  Sul: { min: 90, max: 270 }, Sudoeste: { min: 135, max: 315 },
  Oeste: { min: 180, max: 360 }, Noroeste: { min: 225, max: 45 },
};

// ── HELPER DE VERIFICAÇÃO ANGULAR ──
const anguloPertenceAFaixa = (azimuteDeg: number, fachadaNome: string) => {
  const fLimpa = (fachadaNome || 'Norte').trim();
  const formatada = fLimpa.charAt(0).toUpperCase() + fLimpa.slice(1).toLowerCase();
  const faixa = FAIXAS_FACHADA[formatada] || FAIXAS_FACHADA['Norte'];
  const az = ((azimuteDeg % 360) + 360) % 360;

  if (faixa.min > faixa.max) {
    // Caso de setor que cruza 0° (ex: Norte 270° a 90°)
    return az >= faixa.min || az <= faixa.max;
  }
  return az >= faixa.min && az <= faixa.max;
};

const CORES_ESTACAO: Record<string, string> = { Verao: '#F59E0B', Outono: '#DC2626', Inverno: '#3B82F6', Primavera: '#10B981' };

// Estilo de cada ponto conforme o status real (geometria + sombreamento da API).
// Adicionamos anéis de contraste marcantes para diferenciar claramente a sombra real.
const ESTILO_STATUS: Record<string, { opacidade: number; raio: number; anel?: string }> = {
  'Pleno Sol': { opacidade: 1, raio: 5 },
  'Meia Sombra': { opacidade: 0.65, raio: 4.5, anel: '#38bdf8' }, // Anel azul claro para meia sombra
  'Sombra': { opacidade: 0.3, raio: 3.5, anel: '#64748b' },        // Anel cinza/ardósia para sombra pura
  'Sombra (obstruída)': { opacidade: 0.5, raio: 5, anel: '#fb7185' }, // Anel rosa/vermelho para obstrução real da API
};
const estiloDoStatus = (status?: string) => ESTILO_STATUS[status ?? ''] ?? { opacidade: 0.8, raio: 4.5 };

const CORES_STATUS_SIM: Record<string, string> = {
  'Pleno Sol': '#fbbf24',
  'Meia Sombra': '#60a5fa',
  'Sombra': '#475569',
  'Sombra (obstruída)': '#fb7185',
};

const anguloParaXY = (cx: number, cy: number, r: number, azimuteDeg: number) => {
  const rad = (azimuteDeg * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
};
const elevacaoParaRaio = (elevacao: number, raioMax: number) => (raioMax * (90 - Math.max(elevacao, 0))) / 90;

const gerarPathSetorFachada = (fachada: string, cx: number, cy: number, raioMax: number) => {
  const fachadaLimpa = (fachada || 'Norte').trim();
  const nomeFormatado = fachadaLimpa.charAt(0).toUpperCase() + fachadaLimpa.slice(1).toLowerCase();
  
  const faixa = FAIXAS_FACHADA[nomeFormatado] || FAIXAS_FACHADA['Norte'];
  const wraps = faixa.min > faixa.max;
  const anguloFim = wraps ? faixa.max + 360 : faixa.max;
  const p1 = anguloParaXY(cx, cy, raioMax, faixa.min);
  const p2 = anguloParaXY(cx, cy, raioMax, anguloFim);
  const largeArc = anguloFim - faixa.min > 180 ? 1 : 0;
  return `M${cx},${cy} L${p1.x.toFixed(1)},${p1.y.toFixed(1)} A${raioMax},${raioMax} 0 ${largeArc},1 ${p2.x.toFixed(1)},${p2.y.toFixed(1)} Z`;
};

export default function VectorZoneamento() {
  const { obraId } = Route.useSearch();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [form, setForm] = useState({
    cep: "", logradouro: "", numero: "", bairro: "", cidade: "", uf: "",
    andar: "", modalidade: "obra_nova" as "obra_nova" | "reforma",
    fachada: "" as string, nomeProjeto: "",
  });
  const router = useRouter();
  const voltar = () => {
    if (window.history.length > 1) router.history.back();
    else router.navigate({ to: "/" });
  };
  const [loading, setLoading] = useState(false);
  const [buscandoCep, setBuscarCep] = useState(false);
  const [dadosBioclimaticos, setDadosBioclimaticos] = useState<any>(null);
  const [celulaSolarHover, setCelulaSolarHover] = useState<{ estacao: string; hora: string; dados: any } | null>(null);
  
  // Estados do Simulador 3D
  const [mostrarSimulador, setMostrarSimulador] = useState(false);
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
      }));
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.logradouro || !form.cidade || !form.uf || !form.fachada || !form.nomeProjeto) {
      toast.error("Preencha os campos obrigatórios (Rua, Cidade, UF, Fachada e Projeto)");
      return;
    }

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
      modalidade: form.modalidade,
      fachada: form.fachada,
      andar: form.andar ? Number(form.andar) : 0
    };
    try {
      const res = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Falha de comunicação com o webhook n8n");

      const data = await res.json();
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

  const gerarPDF = async () => {
    if (!relatorioRef.current) return;
    const toastId = toast.loading("Gerando laudo técnico...");
    try {
      const element = relatorioRef.current;
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      const dataUrl = await toPng(element, { quality: 1, pixelRatio: 2, backgroundColor: "#0a0a0a" });
      const pdf = new jsPDF({ orientation: height > width ? "portrait" : "landscape", unit: "px", format: [width, height] });
      pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
      pdf.save(`VectorX_Bioclimatica_${form.nomeProjeto.replace(/\s+/g, "_")}.pdf`);
      toast.success("Laudo baixado com sucesso!", { id: toastId });
    } catch (error) {
      toast.error("Erro ao gerar PDF.", { id: toastId });
    }
  };

  const fachadaAtual = dadosBioclimaticos?.fachada?.replace(/"/g, '') || form.fachada;
  const sombreamentoReal = dadosBioclimaticos?.sombreamento_real;
  const temSombreamentoReal = Boolean(sombreamentoReal?.disponivel);
  const percentualReal = dadosBioclimaticos?.resumo?.percentualIluminacao;
  const percentualGeometrico = dadosBioclimaticos?.resumo?.percentualIluminacaoGeometrico ?? percentualReal;
  const deltaSombreamento = (percentualGeometrico != null && percentualReal != null)
    ? Math.round((percentualGeometrico - percentualReal) * 10) / 10
    : null;

  const cardsMateriais: any[] = Array.isArray(dadosBioclimaticos?.cards_materiais) ? dadosBioclimaticos.cards_materiais : [];
  const materialIA = dadosBioclimaticos?.material_recomendado;
  const justificativaIA = typeof materialIA?.justificativa === 'string' ? materialIA.justificativa : null;
  const melhorMaterial = cardsMateriais[0] ?? (
    materialIA?.aplicacao ? {
      aplicacao: materialIA.aplicacao,
      grupo: materialIA.grupo ?? null,
      transmitancia_termica_U_Wm2K: materialIA.transmitancia_termica_U_Wm2K ?? null,
      capacidade_termica_kJm2K: materialIA.capacidade_termica_kJm2K ?? null,
      atraso_termico_estimado_h: materialIA.atraso_termico_estimado_h ?? null,
      norma_referencia: materialIA.norma_referencia ?? null,
      observacao: null,
    } : null
  );
  const outrosMateriais = cardsMateriais.slice(1);

  const calculoSolarAtual = dadosBioclimaticos?.classificacao || dadosBioclimaticos?.calculo_solar;
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

  const desembrulharAzimute = (hora: number, azimute: number) =>
    (hora > 12 && azimute > 180) ? azimute - 360 : azimute;

  const dadosHoraSim = useMemo(() => {
    const horarios = calculoSolarAtual?.[estacaoSim];
    if (!horarios || !horasNumericas.length) return null;
    const min = horasNumericas[0], max = horasNumericas[horasNumericas.length - 1];
    const alvo = Math.min(max, Math.max(min, horaSlider));
    let h0 = min, h1 = max;
    for (let i = 0; i < horasNumericas.length - 1; i++) {
      if (alvo >= horasNumericas[i] && alvo <= horasNumericas[i + 1]) { h0 = horasNumericas[i]; h1 = horasNumericas[i + 1]; break; }
    }
    const d0 = horarios[`${h0}h`], d1 = horarios[`${h1}h`];
    const f = h1 === h0 ? 0 : (alvo - h0) / (h1 - h0);
    const az0 = desembrulharAzimute(h0, Number(d0?.azimute) || 0);
    const az1 = desembrulharAzimute(h1, Number(d1?.azimute) || 0);
    const azimuteUnwrap = az0 + (az1 - az0) * f;
    const elevacao = (Number(d0?.elevacao) || 0) + ((Number(d1?.elevacao) || 0) - (Number(d0?.elevacao) || 0)) * f;
    return {
      elevacao: Math.round(elevacao * 10) / 10,
      azimute: Math.round((((azimuteUnwrap % 360) + 360) % 360) * 10) / 10,
      azimuteUnwrap,
      status: f < 0.5 ? d0?.status : d1?.status,
      horaProximaLabel: f < 0.5 ? `${h0}h` : `${h1}h`,
    };
  }, [calculoSolarAtual, estacaoSim, horaSlider, horasNumericas]);

  const azExtremosSim = useMemo(() => {
    const horarios = calculoSolarAtual?.[estacaoSim];
    if (!horarios || !horasNumericas.length) return { min: -1, max: 1 };
    const vals = horasNumericas.map((h) => desembrulharAzimute(h, Number(horarios[`${h}h`]?.azimute) || 0));
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [calculoSolarAtual, estacaoSim, horasNumericas]);

  if (!mostrarFormulario) {
    return <IntroDiagnosticoBioclimatico />;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans selection:bg-cyan-900 selection:text-cyan-100 flex flex-col md:flex-row">
      <Toaster theme="dark" position="top-center" />

      {/* ── SIDEBAR (CONTROLES VECTOR-X) ── */}
      <aside className="w-full md:w-[380px] bg-[#0a0a0a] border-r border-white/5 flex flex-col h-auto md:h-screen sticky top-0 z-20">
        <div className="p-6 border-b border-white/5 bg-gradient-to-b from-cyan-950/20 to-transparent">
            <button
            onClick={voltar}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-cyan-400 transition-colors mb-4"
          >
            <ArrowLeft className="size-3.5" /> Voltar
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="size-8 rounded bg-cyan-950 border border-cyan-500/30 flex items-center justify-center">
              <Cpu className="size-4 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter text-white">VECTOR<span className="text-cyan-500">-X</span></h1>
              <p className="text-[9px] font-bold tracking-widest uppercase text-cyan-500/70">Inteligência Bioclimática</p>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Target className="size-4 text-zinc-500" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Parâmetros do Terreno</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-zinc-500">Nome do Projeto</Label>
                <Input value={form.nomeProjeto} onChange={e => setForm({...form, nomeProjeto: e.target.value})} className="bg-white/5 border-white/10 text-white h-10" placeholder="Ex: Galpão Logístico" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-zinc-500">CEP</Label>
                  <Input value={form.cep} onChange={handleCEPChange} placeholder="00000-000" maxLength={9} className="bg-white/5 border-white/10 text-white h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-zinc-500">Número</Label>
                  <Input value={form.numero} onChange={e => setForm({...form, numero: e.target.value})} placeholder="123" className="bg-white/5 border-white/10 text-white h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-zinc-500">Andar</Label>
                  <Input value={form.andar} onChange={e => setForm({...form, andar: e.target.value.replace(/\D/g, '')})} placeholder="0" className="bg-white/5 border-white/10 text-white h-10" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-zinc-500">Logradouro</Label>
                <Input value={form.logradouro} onChange={e => setForm({...form, logradouro: e.target.value})} className="bg-white/5 border-white/10 text-white h-10" />
              </div>

              <div className="grid grid-cols-[1fr_60px] gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-zinc-500">Cidade</Label>
                  <Input value={form.cidade} onChange={e => setForm({...form, cidade: e.target.value})} className="bg-white/5 border-white/10 text-white h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-zinc-500">UF</Label>
                  <Input value={form.uf} onChange={e => setForm({...form, uf: e.target.value.toUpperCase()})} maxLength={2} className="bg-white/5 border-white/10 text-white h-10 text-center uppercase" />
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-zinc-500">Tipo de Projeto</Label>
                <Select value={form.modalidade} onValueChange={(v: "obra_nova" | "reforma") => setForm({ ...form, modalidade: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white h-11 font-semibold">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    <SelectItem value="obra_nova">Obra Nova (do zero)</SelectItem>
                    <SelectItem value="reforma">Reforma (fachada existente)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-cyan-500 font-bold flex items-center gap-1.5">
                  <Compass className="size-3" /> Orientação Principal
                </Label>
                <Select value={form.fachada} onValueChange={(v) => setForm({ ...form, fachada: v })}>
                  <SelectTrigger className="bg-cyan-950/20 border-cyan-500/30 text-cyan-100 h-11 font-semibold">
                    <SelectValue placeholder="Selecione a fachada..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    <SelectItem value="Norte">Norte (Maior Insolação)</SelectItem>
                    <SelectItem value="Sul">Sul (Menor Insolação)</SelectItem>
                    <SelectItem value="Leste">Leste (Sol da Manhã)</SelectItem>
                    <SelectItem value="Oeste">Oeste (Sol da Tarde)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-white/5 bg-[#0a0a0a]">
          <Button
            onClick={submit}
            disabled
            className="w-full h-12 cursor-not-allowed bg-zinc-800 text-zinc-500 font-black tracking-widest uppercase transition-all"
          >
            EM BREVE · PROCESSAR ZONEAMENTO
          </Button>
        </div>
      </aside>

      {/* ── ÁREA PRINCIPAL (CANVAS DO LAUDO) ── */}
      <main className="flex-1 h-screen overflow-y-auto bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-900/10 via-[#050505] to-[#050505] p-4 md:p-8 custom-scrollbar">

        {!dadosBioclimaticos && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600 border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
            <Cpu className="size-16 mb-4 opacity-20" />
            <p className="text-sm font-mono uppercase tracking-widest">Aguardando parâmetros de entrada</p>
          </div>
        )}

        {loading && (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="relative size-24">
              <div className="absolute inset-0 border-t-2 border-cyan-500 rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-b-2 border-teal-500 rounded-full animate-spin" style={{ animationDirection: 'reverse' }}></div>
              <Cpu className="absolute inset-0 m-auto size-6 text-cyan-400 animate-pulse" />
            </div>
            <p className="mt-6 text-xs font-mono uppercase tracking-[0.2em] text-cyan-500 animate-pulse">Cruzando dados NBR 15220...</p>
          </div>
        )}

        {dadosBioclimaticos && !loading && (
          <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500 pb-20">

            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <span className="flex h-2 w-2 rounded-full bg-cyan-500 animate-pulse"></span>
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Laudo Gerado com Sucesso</span>
              </div>
              <Button onClick={gerarPDF} variant="outline" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-950/50 hover:text-cyan-300 h-9 text-xs font-bold uppercase tracking-wider">
                <Download className="size-3 mr-2" /> Exportar Laudo PDF
              </Button>
            </div>

            <div ref={relatorioRef} className="bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">

              {/* HERO DO LAUDO */}
              <div className="p-8 md:p-12 border-b border-white/5 relative overflow-hidden bg-gradient-to-br from-zinc-900 to-[#0a0a0a]">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/50 border border-cyan-500/30 text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-4">
                      Zona Bioclimática {dadosBioclimaticos.zona}{dadosBioclimaticos.subzona}
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-2">
                      {form.nomeProjeto || "Projeto Bioclimático"}
                    </h2>
                    <p className="text-sm text-zinc-300 flex items-center gap-2 font-medium">
                      <MapPin className="size-4 text-cyan-500 shrink-0" />
                      {dadosBioclimaticos.endereco || `${form.logradouro}${form.numero ? ', ' + form.numero : ''}${form.bairro ? ' - ' + form.bairro : ''}, ${dadosBioclimaticos.municipio} - ${dadosBioclimaticos.uf}, Brasil`}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1.5">
                      Fachada Avaliada: <strong className="text-white">{fachadaAtual}</strong>
                      {form.andar ? <> · Andar <strong className="text-white">{form.andar}º</strong></> : null}
                    </p>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Score Bioclimático</p>
                    <div className="flex items-center md:justify-end gap-4">
                      <span className="text-6xl font-black text-cyan-400 tabular-nums tracking-tighter leading-none">
                        {dadosBioclimaticos.score_bioclimatico?.nota?.toFixed(1) ?? '-'}
                      </span>
                      <div className="text-left">
                        <span className="block text-xs font-bold uppercase text-white bg-white/10 px-2 py-1 rounded">
                          {dadosBioclimaticos.score_bioclimatico?.classificacao || 'Calculado'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="mt-8 pt-6 border-t border-white/5 text-sm text-zinc-300 leading-relaxed max-w-3xl relative z-10">
                  {dadosBioclimaticos.score_bioclimatico?.resumo}
                </p>
              </div>

              <div className="p-8 md:p-12 space-y-8">
                {/* DADOS CLIMÁTICOS & HÍDRICOS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* CLIMA */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <Thermometer className="size-4 text-orange-500" />
                      <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Clima Local</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Temp. Média</p>
                        <p className="text-2xl font-black text-white">{dadosBioclimaticos.temp_media}°C</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Projetada (Min-Max)</p>
                        <p className="text-sm font-bold text-zinc-300 mt-2">{dadosBioclimaticos.temp_bulbo_seco_min}° a {dadosBioclimaticos.temp_bulbo_seco_max}°C</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Umidade</p>
                        <p className="text-2xl font-black text-white">{dadosBioclimaticos.umidade_media}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Radiação</p>
                        <p className="text-xl font-black text-white mt-1">{dadosBioclimaticos.radiacao_media} <span className="text-xs text-zinc-500">W/m²</span></p>
                      </div>
                    </div>
                  </div>

                  {/* HÍDRICO */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                      <CloudRain className="size-4 text-blue-400" />
                      <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Potencial Hídrico</h3>
                    </div>
                    <p className="text-sm text-zinc-300 font-medium leading-relaxed flex-1">
                      {dadosBioclimaticos.potencial_hidrico?.reaproveitamento || "Dados de precipitação não processados pela IA."}
                    </p>
                    <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Índice de Chuvas</span>
                      <span className="text-sm font-black text-blue-400 bg-blue-950/30 px-3 py-1 rounded-lg">
                        {dadosBioclimaticos.potencial_hidrico?.indice_chuvas || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── CARTA SOLAR & COBERTURA (NOVO LAYOUT) ── */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 md:p-8">
                  {/* Cabeçalho da Seção Solar */}
                  <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 mb-1 flex items-center gap-2">
                        <Sun className="size-4" /> Análise de Sombreamento (Carta Solar)
                      </h3>
                      <p className="text-sm text-zinc-400">Fachada Orientada ao {fachadaAtual}</p>
                    </div>
                    {/* Hover Info */}
                    <div className="min-h-10 min-w-[280px] bg-cyan-950/20 border border-cyan-500/20 rounded-xl px-4 py-2 flex flex-col justify-center">
                      {celulaSolarHover ? (
                        <>
                          <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
                            {celulaSolarHover.estacao} · {celulaSolarHover.hora}
                          </span>
                          <span className="text-xs font-medium text-zinc-300">
                            {celulaSolarHover.dados.status} (Az: {celulaSolarHover.dados.azimute}° | El: {celulaSolarHover.dados.elevacao}°)
                          </span>
                          {celulaSolarHover.dados.status === 'Sombra (obstruída)' && (
                            <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest mt-0.5">
                              Obstrução real detectada (Google Solar)
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold text-center">Passe o mouse nas linhas solares</span>
                      )}
                    </div>
                  </div>

                  {/* Topo: Gráfico SVG (Esquerda) e Métricas da Fachada (Direita) */}
                  <div className="flex flex-col md:flex-row items-center gap-10">
                    <div className="w-full max-w-sm shrink-0 relative">
                      {(() => {
                        const cx = 200, cy = 200, raioMax = 160;
                        const setorPath = gerarPathSetorFachada(fachadaAtual, cx, cy, raioMax);
                        const estacoes = ['Verao', 'Outono', 'Inverno', 'Primavera'];
                        const calculoSolar = dadosBioclimaticos.classificacao || dadosBioclimaticos.calculo_solar;

                        if (!calculoSolar || !calculoSolar['Verao']) return <div className="text-zinc-600 text-center text-sm py-10">Dados solares ausentes</div>;

                        return (
                          <svg viewBox="0 0 400 420" className="w-full h-auto drop-shadow-2xl">
                            <defs>
                              <radialGradient id="skyGrad" cx="50%" cy="50%" r="65%">
                                <stop offset="0%" stopColor="#083344" stopOpacity="0.55" />
                                <stop offset="100%" stopColor="#083344" stopOpacity="0" />
                              </radialGradient>
                              <filter id="glowPonto" x="-80%" y="-80%" width="260%" height="260%">
                                <feGaussianBlur stdDeviation="4" result="blur" />
                                <feMerge>
                                  <feMergeNode in="blur" />
                                  <feMergeNode in="SourceGraphic" />
                                </feMerge>
                              </filter>
                            </defs>

                            <circle cx={cx} cy={cy} r={raioMax} fill="url(#skyGrad)" />
                            {setorPath && <path d={setorPath} fill="rgba(8,145,178,0.18)" stroke="rgba(34,211,238,0.35)" strokeWidth={1} />}
                            <circle cx={cx} cy={cy} r={raioMax} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
                            <circle cx={cx} cy={cy} r={(raioMax * 60) / 90} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} strokeDasharray="4 4" />
                            <circle cx={cx} cy={cy} r={(raioMax * 30) / 90} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} strokeDasharray="4 4" />
                            <text x={cx + 4} y={cy - (raioMax * 60) / 90 - 4} className="fill-zinc-600 text-[9px] font-bold">30°</text>
                            <text x={cx + 4} y={cy - (raioMax * 30) / 90 - 4} className="fill-zinc-600 text-[9px] font-bold">60°</text>
                            <line x1={cx} y1={cy - raioMax} x2={cx} y2={cy + raioMax} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
                            <line x1={cx - raioMax} y1={cy} x2={cx + raioMax} y2={cy} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />

                            <text x={cx} y={cy - raioMax - 12} textAnchor="middle" className="fill-zinc-500 text-xs font-black">N</text>
                            <text x={cx} y={cy + raioMax + 20} textAnchor="middle" className="fill-zinc-500 text-xs font-black">S</text>
                            <text x={cx + raioMax + 16} y={cy + 4} textAnchor="middle" className="fill-zinc-500 text-xs font-black">L</text>
                            <text x={cx - raioMax - 16} y={cy + 4} textAnchor="middle" className="fill-zinc-500 text-xs font-black">O</text>

                            {estacoes.map((estacao) => {
                              const horarios = calculoSolar[estacao];
                              if (!horarios) return null;
                              const cor = CORES_ESTACAO[estacao];
                              
                              const pontosArray = Object.entries(horarios).map(([hora, d]: [string, any]) => {
                                const r = elevacaoParaRaio(Number(d.elevacao) || 0, raioMax);
                                const { x, y } = anguloParaXY(cx, cy, r, Number(d.azimute) || 0);
                                return { hora, x, y, dados: d };
                              });

                              const linha = pontosArray.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
                              const areaD = pontosArray.length
                                ? `M${cx},${cy} L${pontosArray.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L')} Z`
                                : '';

                              return (
                                <g key={estacao}>
                                  {areaD && <path d={areaD} fill={cor} opacity={0.06} />}
                                  <polyline
                                    points={linha} fill="none" stroke={cor} strokeWidth={2} opacity={0.55}
                                    strokeDasharray={estacao === 'Outono' ? '5 4' : undefined}
                                  />
                                  {pontosArray.map((p) => {
  const ativo = celulaSolarHover?.estacao === estacao && celulaSolarHover?.hora === p.hora;
  const noSetor = anguloPertenceAFaixa(Number(p.dados.azimute) || 0, fachadaAtual);
  const estilo = estiloDoStatus(p.dados.status);

  // Se estiver fora do setor da fachada avaliada, fica "apagado" em tom bem neutro
  const opacidadeEfetiva = ativo ? 1 : noSetor ? estilo.opacidade : 0.08;
  const corPonto = noSetor ? cor : '#52525b';

  return (
    <g key={p.hora} opacity={noSetor ? 1 : 0.25}>
      {/* Anel de destaque só renderiza forte se pertencer à fachada contratada */}
      {noSetor && (
        <circle
          cx={p.x} cy={p.y} r={estilo.raio + (estacao === 'Outono' ? 5.5 : 2.5)}
          fill="none" stroke={cor} strokeWidth={1.5} opacity={0.85}
          strokeDasharray={estacao === 'Outono' ? '2 2' : undefined}
        />
      )}

      {noSetor && estilo.anel && (
        <circle
          cx={p.x} cy={p.y} r={estilo.raio + 5}
          fill="none" stroke={estilo.anel} strokeWidth={1.5} strokeDasharray="2 2" opacity={0.85}
        />
      )}

      {/* Bolinha principal */}
      <circle
        cx={p.x} cy={p.y} r={ativo ? estilo.raio + 3 : estilo.raio} fill={corPonto}
        opacity={opacidadeEfetiva}
        stroke="#0a0a0a" strokeWidth={2}
        filter={ativo && noSetor ? 'url(#glowPonto)' : undefined}
        className="transition-all duration-200 pointer-events-none"
      />

      {/* Hitbox: só ativa interação com hover nos pontos da fachada avaliada */}
      <circle
        cx={p.x} cy={p.y} r={14}
        fill="transparent"
        className={noSetor ? "cursor-pointer" : "cursor-default"}
        onMouseEnter={() => {
          if (noSetor) setCelulaSolarHover({ estacao, hora: p.hora, dados: p.dados });
        }}
        onMouseLeave={() => setCelulaSolarHover(null)}
      />
    </g>
  );
})}
                                </g>
                              );
                            })}
                          </svg>
                        );
                      })()}

                      {/* Legenda de status */}
                      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 justify-center">
                        {Object.entries(ESTILO_STATUS).map(([status, estilo]) => (
                          <div key={status} className="flex items-center gap-1.5">
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400"
                              style={{ opacity: estilo.opacidade, boxShadow: estilo.anel ? `0 0 0 2px ${estilo.anel}` : undefined }}
                            />
                            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">{status}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex-1 space-y-6">
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2">Diagnóstico da Fachada</p>
                        <p className="text-lg font-medium text-white">{dadosBioclimaticos.resumo?.avaliacao || "Avaliação de insolação concluída."}</p>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] font-bold tracking-widest uppercase mb-2">
                          <span className="text-zinc-500">Índice de Iluminação Direta (real)</span>
                          <span className="text-cyan-400">{percentualReal ?? 0}%</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full" style={{ width: `${percentualReal ?? 0}%` }} />
                        </div>
                        {deltaSombreamento !== null && deltaSombreamento !== 0 && (
                          <p className="text-[10px] text-zinc-500 mt-1.5">
                            Cálculo geométrico puro seria <strong className="text-zinc-300">{percentualGeometrico}%</strong> — o sombreamento real reduziu em <strong className="text-rose-400">{Math.abs(deltaSombreamento)} p.p.</strong>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── CARD GOOGLE SOLAR (AGORA HORIZONTAL ABAIXO) ── */}
                  {temSombreamentoReal ? (
                    <div className="mt-10 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-[#0a0a0a] to-[#0a0a0a] p-6 relative overflow-hidden shadow-[0_0_30px_rgba(99,102,241,0.05)] flex flex-col md:flex-row items-center justify-between gap-8">
                      {/* Efeito visual de brilho no fundo */}
                      <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/4 pointer-events-none" />

                      <div className="relative z-10 flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <Satellite className="size-4 text-indigo-400" />
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                            Análise da Cobertura (Google Solar API)
                          </h4>
                        </div>
                        <p className="text-sm text-zinc-300 leading-relaxed mb-4 max-w-lg">
                          O plano principal do telhado avaliado via satélite possui fator de exposição solar útil de <strong className="text-indigo-300 bg-indigo-950/50 border border-indigo-500/20 px-1.5 py-0.5 rounded">{Math.round((sombreamentoReal.fator ?? 0) * 100)}%</strong>.
                        </p>
                        
                        {sombreamentoReal.qualidade_imagem && (
                          <p className="text-[9px] text-zinc-600 uppercase tracking-widest">
                            Qualidade da captura: {sombreamentoReal.qualidade_imagem}
                          </p>
                        )}
                      </div>

                      {sombreamentoReal.segmento_usado && (
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 shrink-0">
                          <div className="grid grid-cols-2 gap-3 text-center">
                            <div className="bg-indigo-950/20 border border-indigo-500/10 rounded-xl px-4 py-2">
                              <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Inclinação</p>
                              <p className="text-lg font-black text-white">{sombreamentoReal.segmento_usado.pitchDegrees?.toFixed(1)}°</p>
                            </div>
                            <div className="bg-indigo-950/20 border border-indigo-500/10 rounded-xl px-4 py-2">
                              <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Azimute</p>
                              <p className="text-lg font-black text-white">{sombreamentoReal.segmento_usado.azimuthDegrees?.toFixed(1)}°</p>
                            </div>
                          </div>

                          <div className="relative size-32 flex items-center justify-center bg-indigo-950/30 rounded-full border border-indigo-500/20 shadow-[inset_0_0_40px_rgba(99,102,241,0.1)]">
                            <svg viewBox="0 0 100 100" className="w-24 h-24 drop-shadow-xl">
                              <defs>
                                <linearGradient id="roofGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor="#818cf8" stopOpacity="0.95" />
                                  <stop offset="100%" stopColor="#312e81" stopOpacity="0.95" />
                                </linearGradient>
                              </defs>
                              
                              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(99, 102, 241, 0.25)" strokeWidth="1" strokeDasharray="2 2" />
                              <text x="50" y="13" textAnchor="middle" className="fill-indigo-400/80 text-[8px] font-bold">N</text>
                              <text x="50" y="92" textAnchor="middle" className="fill-indigo-400/80 text-[8px] font-bold">S</text>
                              <text x="91" y="53" textAnchor="middle" className="fill-indigo-400/80 text-[8px] font-bold">L</text>
                              <text x="9" y="53" textAnchor="middle" className="fill-indigo-400/80 text-[8px] font-bold">O</text>

                              <g transform={`rotate(${sombreamentoReal.segmento_usado.azimuthDegrees || 0}, 50, 50)`}>
                                <line x1="50" y1="50" x2="50" y2="16" stroke="#c7d2fe" strokeWidth="1.5" strokeDasharray="3 2" />
                                <polygon points="50,11 54,18 46,18" fill="#c7d2fe" />
                                <path d="M 30 35 L 70 35 L 80 65 L 20 65 Z" fill="url(#roofGrad)" stroke="#6366f1" strokeWidth="1.5" strokeLinejoin="round" />
                                <line x1="43" y1="35" x2="38" y2="65" stroke="#4f46e5" strokeWidth="1.5" opacity="0.5" />
                                <line x1="57" y1="35" x2="62" y2="65" stroke="#4f46e5" strokeWidth="1.5" opacity="0.5" />
                                <line x1="50" y1="35" x2="50" y2="65" stroke="#4f46e5" strokeWidth="1.5" opacity="0.5" />
                                <line x1="27" y1="50" x2="73" y2="50" stroke="#4f46e5" strokeWidth="1.5" opacity="0.5" />
                              </g>
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Satellite className="size-3 text-zinc-500" />
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Cobertura (Satélite)</h4>
                      </div>
                      <p className="text-xs text-zinc-500">
                        Dados de telhado indisponíveis pra este endereço{sombreamentoReal?.erro ? ` (${sombreamentoReal.erro})` : ''}. Avaliação baseada puramente na geometria da fachada.
                      </p>
                    </div>
                  )}

                  {/* ── BOTÃO PARA ABRIR SIMULADOR 3D ── */}
                  {calculoSolarAtual && (
                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                      {!mostrarSimulador ? (
                        <Button 
                          onClick={() => setMostrarSimulador(true)}
                          variant="outline" 
                          className="bg-transparent border-cyan-500/30 text-cyan-400 hover:bg-cyan-950/30 hover:text-cyan-300 font-bold tracking-widest uppercase text-[10px]"
                        >
                          <Eye className="size-3.5 mr-2" />
                          Abrir Simulador 3D de Sombreamento da Fachada
                        </Button>
                      ) : (
                        <div className="animate-in fade-in zoom-in-95 duration-300 bg-black/40 border border-white/5 rounded-2xl p-6">
                          <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                            <div className="text-left">
                              <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 mb-1 flex items-center gap-2">
                                <Building2 className="size-4" /> Simulador de Sombreamento 3D
                              </h3>
                              <p className="text-sm text-zinc-400">Como o sol se move sobre a fachada {fachadaAtual} ao longo do dia</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setAnimando((a) => !a)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${animando ? 'bg-cyan-600 text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
                              >
                                {animando ? <Pause className="size-3" /> : <Play className="size-3" />}
                                {animando ? 'Pausar' : 'Animar dia'}
                              </button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setMostrarSimulador(false)}
                                className="text-zinc-500 hover:text-white"
                              >
                                Esconder
                              </Button>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mb-3 justify-start">
                            {['Verao', 'Outono', 'Inverno', 'Primavera'].map((estacao) => (
                              <button
                                key={estacao}
                                onClick={() => { setAnimando(false); setEstacaoSim(estacao); }}
                                className="px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors border"
                                style={estacaoSim === estacao
                                  ? { backgroundColor: CORES_ESTACAO[estacao], borderColor: CORES_ESTACAO[estacao], color: '#0a0a0a' }
                                  : { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.1)', color: '#a1a1aa' }}
                              >
                                {estacao}
                              </button>
                            ))}
                          </div>

                          {(() => {
                            const spread = azExtremosSim.max - azExtremosSim.min;
                            const t = spread > 0
                              ? Math.min(1, Math.max(0, (azExtremosSim.max - (dadosHoraSim?.azimuteUnwrap ?? 0)) / spread))
                              : 0.5;
                            const elevacao = Math.max(0, Number(dadosHoraSim?.elevacao) || 0);
                            const elevPercent = Math.min(1, elevacao / 90);
                            const sunX = 60 + t * 360;
                            const sunY = 195 - elevPercent * 165;
                            const noturno = (Number(dadosHoraSim?.elevacao) ?? 0) <= 0;

                            const status = dadosHoraSim?.status;
                            const corFace = noturno ? '#1e293b' : (CORES_STATUS_SIM[status] ?? '#334155');
                            const opacidadeFace = noturno ? 0.9 : (status === 'Pleno Sol' ? 0.92 : status === 'Meia Sombra' ? 0.65 : 0.35);

                            const dirX = t < 0.5 ? 1 : -1;
                            const shadowLen = noturno ? 150 : 20 + (1 - elevPercent) * 130;
                            const shadowCx = 260 + dirX * shadowLen * 0.55;
                            const shadowOpacidade = noturno ? 0.35 : (status === 'Sombra (obstruída)' ? 0.55 : status === 'Sombra' ? 0.4 : status === 'Meia Sombra' ? 0.25 : 0.15);
                            const shadowCor = status === 'Sombra (obstruída)' ? '#fb7185' : '#020617';

                  
                              return (
                              <svg viewBox="0 0 480 250" className="w-full h-auto rounded-xl bg-gradient-to-b from-[#080d1a] to-[#04060a] border border-white/5">
                                <defs>
                                  <filter id="glowSol" x="-100%" y="-100%" width="300%" height="300%">
                                    <feGaussianBlur stdDeviation="6" result="blur" />
                                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                                  </filter>
                                  <linearGradient id="wallGradLeft" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#1e293b" />
                                    <stop offset="100%" stopColor="#0f172a" />
                                  </linearGradient>
                                  {/* Grid isométrico do chão */}
                                  <pattern id="isoGrid" width="40" height="20" patternUnits="userSpaceOnUse">
                                    <path d="M0,10 L20,0 L40,10 L20,20 Z" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/>
                                  </pattern>
                                </defs>

                                {/* Chão Isométrico */}
                                <rect x="0" y="150" width="480" height="100" fill="url(#isoGrid)" />

                                {/* ── BLOCOS DO ENTORNO ("MINECRAFT") ── */}
                                {(() => {
                                  // Calcula o fator de obstrução com base no dado real do Google (se houver)
                                  const fatorExp = sombreamentoReal?.fator ?? 0.85;
                                  const obstruido = fatorExp < 0.8; // Se exp abaixo de 80%, gera barreiras vizinhas
                                  
                                  if (!obstruido) return null;

                                  // Altura dos blocos vizinhos proporcional ao nível de sombreamento
                                  const alturaBloco = Math.round((1 - fatorExp) * 120);

                                  return (
                                    <g opacity="0.75">
                                      {/* Prédio Vizinho Esquerda (Fundo) */}
                                      <polygon points={`120,${180 - alturaBloco} 120,165 170,140 170,${155 - alturaBloco}`} fill="#0f172a" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                                      <polygon points={`170,${155 - alturaBloco} 170,140 200,155 200,${170 - alturaBloco}`} fill="#1e293b" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                                      <polygon points={`120,${180 - alturaBloco} 170,${155 - alturaBloco} 200,${170 - alturaBloco} 150,195`} fill="#334155" opacity="0.4" />

                                      {/* Prédio Vizinho Direta (Fundo) */}
                                      <polygon points={`310,${160 - alturaBloco} 310,145 350,125 350,${140 - alturaBloco}`} fill="#0b0f19" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                                      <polygon points={`350,${140 - alturaBloco} 350,125 390,145 390,${160 - alturaBloco}`} fill="#161e2e" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                                    </g>
                                  );
                                })()}

                                <path d="M60,195 Q260,20 460,195" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={1} strokeDasharray="3 4" />
                                <line x1={0} y1={195} x2={480} y2={195} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
                                <ellipse cx={shadowCx} cy={200} rx={Math.max(28, shadowLen * 0.65)} ry={13} fill={shadowCor} opacity={shadowOpacidade} />

                                {!noturno && (
                                  <circle cx={sunX} cy={sunY} r={9 + elevPercent * 5} fill="#fbbf24" filter="url(#glowSol)" />
                                )}
                                {noturno && (
                                  <circle cx={sunX} cy={190} r={7} fill="#334155" opacity={0.7} />
                                )}

                                {/* Prédio Principal Isométrico */}
                                <polygon points="205,167 205,77 260,49 260,105" fill="#1e293b" opacity={0.95} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                                <polygon points="260,195 205,167 205,77 260,105" fill="url(#wallGradLeft)" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                                
                                <g>
                                  <polygon points="260,195 315,167 315,77 260,105" fill={corFace} opacity={opacidadeFace} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                                  {!noturno && status !== 'Sombra' && status !== 'Sombra (obstruída)' && (
                                    <polygon points="260,195 285,181 315,100 290,114" fill="#ffffff" opacity={0.05} />
                                  )}
                                </g>

                                <text x={287} y={135} textAnchor="middle" className="fill-white text-[9px] font-black uppercase tracking-wider" style={{ paintOrder: 'stroke', stroke: '#0a0a0a', strokeWidth: 3 }}>
                                  {fachadaAtual}
                                </text>
                              </svg>
                            );
                          })()}

                          {horasNumericas.length > 1 && (
                            <div className="mt-5 px-1">
                              <input
                                type="range"
                                min={horasNumericas[0]}
                                max={horasNumericas[horasNumericas.length - 1]}
                                step={0.1}
                                value={horaSlider}
                                onChange={(e) => { setAnimando(false); setHoraSlider(parseFloat(e.target.value)); }}
                                className="w-full accent-cyan-500 cursor-pointer"
                              />
                              <div className="flex justify-between mt-1">
                                {horasNumericas.map((h) => (
                                  <span key={h} className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">{h}h</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {dadosHoraSim && (
                            <p className="text-center text-xs text-zinc-400 mt-3">
                              <strong className="text-white">{dadosHoraSim.status}</strong> às {Math.floor(horaSlider)}h{Math.round((horaSlider % 1) * 60).toString().padStart(2, '0')}
                              {' '}(mais próximo do dado real: {dadosHoraSim.horaProximaLabel}) · Elevação {dadosHoraSim.elevacao}° · Azimute {dadosHoraSim.azimute}°
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* MATERIAIS RECOMENDADOS */}
                {(melhorMaterial || outrosMateriais.length > 0) && (
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 md:p-8">
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="size-4 text-emerald-400" />
                      <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Materiais Recomendados · Envoltória</h3>
                    </div>
                    {dadosBioclimaticos.espessura_considerada_cm && (
                      <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-6 flex items-center gap-1">
                        <Ruler className="size-3" /> Espessura considerada: {dadosBioclimaticos.espessura_considerada_cm}cm
                      </p>
                    )}

                    {melhorMaterial && (
                      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 to-transparent p-6 mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Award className="size-4 text-emerald-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Melhor Escolha pra Este Cenário</span>
                        </div>
                        <p className="text-xl font-black text-white mb-1">{melhorMaterial.aplicacao}</p>
                        {melhorMaterial.grupo && (
                          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">{melhorMaterial.grupo}</p>
                        )}

                        {(melhorMaterial.transmitancia_termica_U_Wm2K != null || melhorMaterial.capacidade_termica_kJm2K != null || melhorMaterial.atraso_termico_estimado_h != null) && (
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div>
                              <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Transmitância (U)</p>
                              <p className="text-lg font-black text-white">{melhorMaterial.transmitancia_termica_U_Wm2K ?? '—'} <span className="text-[10px] text-zinc-500">W/m²K</span></p>
                            </div>
                            <div>
                              <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Capacidade Térmica</p>
                              <p className="text-lg font-black text-white">{melhorMaterial.capacidade_termica_kJm2K ?? '—'} <span className="text-[10px] text-zinc-500">kJ/m²K</span></p>
                            </div>
                            <div>
                              <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Atraso Térmico</p>
                              <p className="text-lg font-black text-white">{melhorMaterial.atraso_termico_estimado_h ?? '—'} <span className="text-[10px] text-zinc-500">h</span></p>
                            </div>
                          </div>
                        )}

                        {(melhorMaterial.ganho_termico_verao_Wm2 > 0 || melhorMaterial.perda_termica_inverno_Wm2 > 0) && (
                          <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-emerald-900/30">
                            <div>
                              <p className="text-[10px] text-orange-400 uppercase font-bold mb-1">Ganho Térmico (Verão)</p>
                              <p className="text-lg font-black text-white">{melhorMaterial.ganho_termico_verao_Wm2} <span className="text-[10px] text-zinc-500">W/m²</span></p>
                              <p className="text-[9px] text-zinc-600">a remover, ΔT vs {dadosBioclimaticos.referencia_conforto?.verao_C ?? 24}°C</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-blue-400 uppercase font-bold mb-1">Perda Térmica (Inverno)</p>
                              <p className="text-lg font-black text-white">{melhorMaterial.perda_termica_inverno_Wm2} <span className="text-[10px] text-zinc-500">W/m²</span></p>
                              <p className="text-[9px] text-zinc-600">a repor, ΔT vs {dadosBioclimaticos.referencia_conforto?.inverno_C ?? 18}°C</p>
                            </div>
                          </div>
                        )}

                        <p className="text-sm text-zinc-300 leading-relaxed">
                          {justificativaIA || melhorMaterial.observacao || 'Melhor pontuação entre os materiais candidatos pra essa zona bioclimática e orientação.'}
                        </p>
                        {melhorMaterial.norma_referencia && (
                          <p className="text-[9px] text-zinc-600 uppercase tracking-widest mt-3">Ref: {melhorMaterial.norma_referencia}</p>
                        )}
                      </div>
                    )}

                    {outrosMateriais.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Outros Candidatos Avaliados</p>
                        {outrosMateriais.map((m, i) => (
                          <div key={i} className="flex items-center gap-4 rounded-xl px-4 py-3 border border-white/5 bg-white/[0.02]">
                            <div className="flex-1">
                              <p className="text-sm font-bold text-white">{m.aplicacao}</p>
                              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{m.grupo}</p>
                            </div>
                            <div className="flex gap-4 text-xs text-zinc-400">
                              <span>U <strong className="text-white">{m.transmitancia_termica_U_Wm2K}</strong></span>
                              <span>CT <strong className="text-white">{m.capacidade_termica_kJm2K}</strong></span>
                            </div>
                            <div className="w-20 shrink-0">
                              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-emerald-700 to-emerald-400 rounded-full" style={{ width: `${Math.round((m.score ?? 0) * 100)}%` }} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ESTRATÉGIAS CONSTRUTIVAS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* CONFORTO */}
                  <div className="bg-gradient-to-br from-teal-950/20 to-transparent border border-teal-900/50 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <Wind className="size-5 text-teal-400" />
                      <h3 className="text-sm font-black uppercase tracking-widest text-teal-400">Estratégias de Conforto</h3>
                    </div>
                    <div className="space-y-4">
                      {categorizarEstrategias(dadosBioclimaticos.recomendacoes_conforto ?? dadosBioclimaticos.estrategias_conforto, 'conforto').map((categoria) => (
                        <div key={categoria.nome}>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-teal-500/70 mb-2">{categoria.nome}</p>
                          <ul className="space-y-2">
                            {categoria.itens.map((item, i) => (
                              <li key={i} className="text-sm font-medium text-zinc-300 bg-teal-950/10 border border-teal-900/30 px-3 py-2 rounded-lg leading-snug">
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* RESILIÊNCIA */}
                  <div className="bg-gradient-to-br from-orange-950/20 to-transparent border border-orange-900/50 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <ShieldCheck className="size-5 text-orange-400" />
                      <h3 className="text-sm font-black uppercase tracking-widest text-orange-400">Estratégias de Resiliência</h3>
                    </div>
                    <div className="space-y-4">
                      {categorizarEstrategias(dadosBioclimaticos.recomendacoes_resiliencia ?? dadosBioclimaticos.estrategias_resiliencia, 'resiliencia').map((categoria) => (
                        <div key={categoria.nome}>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-orange-500/70 mb-2">{categoria.nome}</p>
                          <ul className="space-y-2">
                            {categoria.itens.map((item, i) => (
                              <li key={i} className="text-sm font-medium text-zinc-300 bg-orange-950/10 border border-orange-900/30 px-3 py-2 rounded-lg leading-snug">
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* LAUDO TÉCNICO */}
                <div className="bg-white/[0.02] border border-white/5 border-l-2 border-l-cyan-500 rounded-2xl p-6 md:p-8">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="size-4 text-cyan-500" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Parecer Técnico (NBR 15220)</h3>
                  </div>
                  <div className="prose prose-invert prose-sm max-w-none text-zinc-300 leading-loose">
                    <p className="whitespace-pre-wrap">{dadosBioclimaticos.resumo_executivo || dadosBioclimaticos.leitura_ia || 'Nenhuma consideração adicional processada.'}</p>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5 flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-zinc-600">
                  <span>Gerado via Vector-X Intelligence API</span>
                  <span>{new Date().toLocaleDateString('pt-BR')}</span>
                </div>

              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(8, 145, 178, 0.5); }
      `}</style>
    </div>
  );
}

function IntroDiagnosticoBioclimatico() {
  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans">
      <header data-local-nav className="sticky top-0 z-40 border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <a href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <div className="flex size-8 items-center justify-center rounded border border-cyan-500/30 bg-cyan-950">
              <Cpu className="size-4 text-cyan-400" />
            </div>
            <div className="flex flex-col justify-center leading-none">
              <span className="text-base font-bold tracking-tight text-white">Vector-X</span>
              <span className="mt-0.5 text-[9px] uppercase tracking-[0.15em] text-cyan-500/70">By EcomindsX</span>
            </div>
          </a>
          <nav className="flex items-center gap-4 sm:gap-6">
            <a href="/noticias" className="text-sm text-zinc-400 transition-colors hover:text-white">Notícias</a>
            <button disabled className="cursor-not-allowed rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-1.5 text-sm font-semibold text-zinc-500 sm:px-4">
              <span className="hidden sm:inline">EM BREVE · Diagnóstico</span><span className="sm:hidden">EM BREVE</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="mb-5 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-cyan-400">
          <span className="relative flex size-1.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-cyan-400 opacity-60" /><span className="relative inline-flex size-1.5 rounded-full bg-cyan-400" /></span>
          Diagnóstico Bioclimático
        </div>
        <h1 className="mb-5 max-w-2xl text-3xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-4xl">
          Radiação, azimute e zoneamento,<br /><span className="text-cyan-400">calculados para um endereço exato.</span>
        </h1>
        <p className="mb-10 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          Um dado a mais na sua prancheta: zona bioclimática (NBR 15220-3:2024), clima horário histórico (INMET) e posicionamento solar do terreno, prontos antes da primeira decisão de projeto para embasar a especificação de material, ventilação e orientação.
        </p>

        <div className="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
          <BrazilZonesMap />

          <div className="flex flex-col rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 to-transparent p-6">
            <div className="mb-4 flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Exemplo ilustrativo</p><span className="rounded bg-white/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-zinc-300">Demo</span></div>
            <div className="mb-1 flex items-baseline gap-4"><span className="text-3xl font-black text-cyan-400">ZB 03</span><span className="text-2xl font-black text-white">34° NE</span></div>
            <div className="mb-6 flex items-center gap-4 text-[9px] font-bold uppercase tracking-widest text-zinc-500"><span>NBR 15220-3 · Mista</span><span>Azimute da Fachada</span></div>
            <ul className="space-y-2.5 text-sm text-zinc-300">
              {['Radiação média: 4,8 kWh/m²/dia (estação INMET mais próxima)', 'Amplitude térmica: moderada', 'Inércia recomendada: alta'].map((item) => <li key={item} className="flex items-center gap-2"><span className="size-1 rounded-full bg-cyan-400" />{item}</li>)}
            </ul>
          </div>
        </div>
        <button disabled className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-8 py-4 text-sm font-black uppercase tracking-widest text-zinc-500">
          EM BREVE · Diagnóstico Bioclimático
        </button>
      </main>
    </div>
  );
}
