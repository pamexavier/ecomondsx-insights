import { useState, useEffect, useRef, useMemo } from "react";
import { Play, Pause, Eye, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { formatarNumero } from "@/utils/calculosBioclimaticos";

const CORES_ESTACAO: Record<string, string> = {
  Verao: "#F59E0B",
  Outono: "#DC2626",
  Inverno: "#3B82F6",
  Primavera: "#10B981",
};

const ROTULO_ESTACAO: Record<string, string> = {
  Verao: "Verão",
  Outono: "Outono",
  Inverno: "Inverno",
  Primavera: "Primavera",
};

const ROSA_NOME = [
  "Norte", "Norte-nordeste", "Nordeste", "Leste-nordeste",
  "Leste", "Leste-sudeste", "Sudeste", "Sul-sudeste",
  "Sul", "Sul-sudoeste", "Sudoeste", "Oeste-sudoeste",
  "Oeste", "Oeste-noroeste", "Noroeste", "Norte-noroeste",
];

const AZ_NOMINAL: Record<string, number> = {
  norte: 0, nordeste: 45, leste: 90, sudeste: 135,
  sul: 180, sudoeste: 225, oeste: 270, noroeste: 315,
};

const norm360 = (g: number) => ((g % 360) + 360) % 360;
const diffAngular = (a: number, b: number) =>
  Math.abs(((a - b + 540) % 360) - 180);

function nomeOrientacao(az: number) {
  const i = Math.round(norm360(az) / 22.5) % 16;
  return ROSA_NOME[i];
}

type EstadoPonto = "sol" | "bloqueado" | "sem";
function estadoDoPonto(status?: string): EstadoPonto {
  if (status === "Pleno Sol" || status === "Meia Sombra") return "sol";
  const s = (status || "").toLowerCase();
  if (s.includes("obstru") || s.includes("vegeta")) return "bloqueado";
  return "sem";
}

export default function SimuladorSombreamento3D({
  calculoSolar,
  obstrucao,
  fachadaAtual,
  perfilHorizonte,
  azimuteFachadaUsado,
}: any) {
  const [estacao, setEstacao] = useState<
    "Verao" | "Outono" | "Inverno" | "Primavera"
  >("Verao");
  const [horaSlider, setHoraSlider] = useState<number>(9);
  const [reproduzindo, setReproduzindo] = useState(false);
  const [mostrarVizinhos, setMostrarVizinhos] = useState(true);

  // Estado da Câmera 3D (Rotação 360° + Elevação + Zoom)
  const [camera, setCamera] = useState({
    rotY: -0.65,
    rotX: 0.48,
    zoom: 1.15,
  });
  const dragRef = useRef<{
    ativo: boolean;
    x: number;
    y: number;
    rotY0: number;
    rotX0: number;
  }>({ ativo: false, x: 0, y: 0, rotY0: 0, rotX0: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const chaveFachada = String(fachadaAtual ?? "sul")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const azReal =
    typeof azimuteFachadaUsado === "number"
      ? azimuteFachadaUsado
      : AZ_NOMINAL[chaveFachada] ?? 180;
  const nomeOrient = nomeOrientacao(azReal);

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
    if (!amostrasEstacao.some((a) => a.hora === Math.round(horaSlider))) {
      setHoraSlider(amostrasEstacao[0].hora);
    }
  }, [amostrasEstacao]);

  useEffect(() => {
    if (!reproduzindo || amostrasEstacao.length < 2) return;
    const minH = amostrasEstacao[0].hora;
    const maxH = amostrasEstacao[amostrasEstacao.length - 1].hora;
    const timer = setInterval(() => {
      setHoraSlider((h) => (h + 0.25 > maxH ? minH : Number((h + 0.25).toFixed(2))));
    }, 80);
    return () => clearInterval(timer);
  }, [reproduzindo, amostrasEstacao]);

  const pontoAtual = useMemo(() => {
    if (!amostrasEstacao.length) return null;
    return amostrasEstacao.reduce((prev, curr) =>
      Math.abs(curr.hora - horaSlider) < Math.abs(prev.hora - horaSlider)
        ? curr
        : prev,
    );
  }, [amostrasEstacao, horaSlider]);

  const obstaculos3D = useMemo(() => {
    const lista = Array.isArray(perfilHorizonte) ? perfilHorizonte : [];
    const filtrados = lista
      .filter(
        (p) =>
          !p?.referenciaNaoEncontrada &&
          Number(p?.anguloObstrucaoGraus) >= 6 &&
          Number(p?.distanciaObstaculoMetros) > 4,
      )
      .slice(0, 8);
    if (filtrados.length > 0) return filtrados;
    if (obstrucao) {
      return [
        {
          azimute: obstrucao.azimute ?? azReal,
          distanciaObstaculoMetros: obstrucao.distanciaMetros ?? 18,
          alturaObstaculoAcimaDoSoloMetros: obstrucao.alturaMetros ?? 12,
          anguloObstrucaoGraus: obstrucao.anguloObstrucaoGraus ?? 20,
          ponto: { mascara: obstrucao.mascara ?? 1 },
        },
      ];
    }
    return [];
  }, [perfilHorizonte, obstrucao, azReal]);

  const estadoHorario = useMemo(() => {
    if (!pontoAtual) return "sem" as EstadoPonto;
    const bloqueado =
      mostrarVizinhos &&
      (pontoAtual.obstruidoReal === true ||
        String(pontoAtual.status || "").includes("obstru"));
    if (bloqueado) return "bloqueado";
    if (
      pontoAtual.status === "Pleno Sol" ||
      pontoAtual.status === "Meia Sombra" ||
      diffAngular(Number(pontoAtual.azimute), azReal) < 88
    ) {
      return "sol";
    }
    return "sem";
  }, [pontoAtual, mostrarVizinhos, azReal]);

  // Renderização 3D no Canvas (com suporte a Órbita 360° e Zoom)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Fundo Atmosférico
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, "#0F172A");
    bgGrad.addColorStop(0.6, "#1E293B");
    bgGrad.addColorStop(1, "#0F172A");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    const cosY = Math.cos(camera.rotY);
    const sinY = Math.sin(camera.rotY);
    const cosX = Math.cos(camera.rotX);
    const sinX = Math.sin(camera.rotX);
    const scale = 4.6 * camera.zoom;

    const project = (x: number, y: number, z: number) => {
      const rx = x * cosY - z * sinY;
      const rz = x * sinY + z * cosY;
      const ry = y * cosX - rz * sinX;
      const depth = y * sinX + rz * cosX + 180;
      const f = (210 / Math.max(40, depth)) * scale;
      return {
        sx: W / 2 + rx * f,
        sy: H * 0.62 - ry * f,
        depth,
      };
    };

    // Anéis do solo (20m, 40m, 60m) e Rosa dos Ventos 3D
    [20, 40, 60].forEach((raio) => {
      ctx.beginPath();
      for (let ang = 0; ang <= 360; ang += 6) {
        const rad = (ang * Math.PI) / 180;
        const p = project(Math.sin(rad) * raio, 0, -Math.cos(rad) * raio);
        if (ang === 0) ctx.moveTo(p.sx, p.sy);
        else ctx.lineTo(p.sx, p.sy);
      }
      ctx.strokeStyle = "rgba(148, 163, 184, 0.22)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Eixos Cardeais N / S / L / O
    const cardeais = [
      { l: "N", az: 0, cor: "#F87171" },
      { l: "L", az: 90, cor: "#94A3B8" },
      { l: "S", az: 180, cor: "#94A3B8" },
      { l: "O", az: 270, cor: "#94A3B8" },
    ];
    cardeais.forEach((c) => {
      const rad = (c.az * Math.PI) / 180;
      const p1 = project(0, 0, 0);
      const p2 = project(Math.sin(rad) * 64, 0, -Math.cos(rad) * 64);
      ctx.beginPath();
      ctx.moveTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
      ctx.stroke();

      ctx.fillStyle = c.cor;
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(c.l, p2.sx, p2.sy + 4);
    });

    // Setor da fachada analisada no solo
    ctx.beginPath();
    const pCenter = project(0, 0, 0);
    ctx.moveTo(pCenter.sx, pCenter.sy);
    for (let a = azReal - 90; a <= azReal + 90; a += 5) {
      const rad = (a * Math.PI) / 180;
      const p = project(Math.sin(rad) * 52, 0, -Math.cos(rad) * 52);
      ctx.lineTo(p.sx, p.sy);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(76, 154, 116, 0.16)";
    ctx.fill();

    // Função para desenhar prisma 3D (prédio ou obstáculo)
    const drawBox = (
      cx: number,
      cz: number,
      w: number,
      d: number,
      h: number,
      corTopo: string,
      corLado: string,
      corFachadaAtiva?: string,
      azFachada?: number,
    ) => {
      const hw = w / 2;
      const hd = d / 2;
      const v = [
        project(cx - hw, 0, cz - hd),
        project(cx + hw, 0, cz - hd),
        project(cx + hw, 0, cz + hd),
        project(cx - hw, 0, cz + hd),
        project(cx - hw, h, cz - hd),
        project(cx + hw, h, cz - hd),
        project(cx + hw, h, cz + hd),
        project(cx - hw, h, cz + hd),
      ];

      const faces = [
        { idx: [0, 1, 5, 4], az: 0 }, // Norte (-Z)
        { idx: [1, 2, 6, 5], az: 90 }, // Leste (+X)
        { idx: [2, 3, 7, 6], az: 180 }, // Sul (+Z)
        { idx: [3, 0, 4, 7], az: 270 }, // Oeste (-X)
        { idx: [4, 5, 6, 7], az: -1 }, // Topo
      ];

      faces
        .map((f) => ({
          ...f,
          depth:
            f.idx.reduce((acc, i) => acc + v[i].depth, 0) / f.idx.length,
        }))
        .sort((a, b) => b.depth - a.depth)
        .forEach((f) => {
          ctx.beginPath();
          f.idx.forEach((vi, i) => {
            if (i === 0) ctx.moveTo(v[vi].sx, v[vi].sy);
            else ctx.lineTo(v[vi].sx, v[vi].sy);
          });
          ctx.closePath();
          const ehAtiva =
            f.az >= 0 &&
            azFachada !== undefined &&
            diffAngular(f.az, azFachada) <= 45;
          ctx.fillStyle =
            f.az === -1
              ? corTopo
              : ehAtiva && corFachadaAtiva
                ? corFachadaAtiva
                : corLado;
          ctx.fill();
          ctx.strokeStyle = ehAtiva ? "#FBBF24" : "rgba(255,255,255,0.22)";
          ctx.lineWidth = ehAtiva ? 2 : 1;
          ctx.stroke();
        });
    };

    // Obstáculos do Entorno (DSM)
    if (mostrarVizinhos) {
      obstaculos3D.forEach((obs) => {
        const dist = Math.min(54, Math.max(14, Number(obs.distanciaObstaculoMetros) || 22));
        const alt = Math.min(36, Math.max(6, Number(obs.alturaObstaculoAcimaDoSoloMetros) || 12));
        const rad = ((Number(obs.azimute) || 0) * Math.PI) / 180;
        const ox = Math.sin(rad) * dist;
        const oz = -Math.cos(rad) * dist;
        drawBox(
          ox,
          oz,
          8,
          8,
          alt,
          "rgba(244, 63, 94, 0.55)",
          "rgba(159, 18, 57, 0.55)",
        );
      });
    }

    // Edifício Principal
    const corFachada =
      estadoHorario === "sol"
        ? "rgba(253, 224, 71, 0.88)"
        : estadoHorario === "bloqueado"
          ? "rgba(251, 113, 133, 0.75)"
          : "rgba(71, 85, 105, 0.9)";

    drawBox(0, 0, 14, 14, 18, "#3A7D5E", "#334155", corFachada, azReal);

    // Arco Solar 3D da Estação Selecionada
    if (amostrasEstacao.length > 1) {
      ctx.beginPath();
      amostrasEstacao.forEach((am, i) => {
        const azRad = ((Number(am.azimute) || 0) * Math.PI) / 180;
        const elRad = ((Number(am.elevacao) || 0) * Math.PI) / 180;
        const R = 52;
        const sx = R * Math.cos(elRad) * Math.sin(azRad);
        const sy = R * Math.sin(elRad);
        const sz = -R * Math.cos(elRad) * Math.cos(azRad);
        const p = project(sx, sy, sz);
        if (i === 0) ctx.moveTo(p.sx, p.sy);
        else ctx.lineTo(p.sx, p.sy);
      });
      ctx.strokeStyle = CORES_ESTACAO[estacao];
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Pontos das Horas e Sol Atual
      amostrasEstacao.forEach((am) => {
        const azRad = ((Number(am.azimute) || 0) * Math.PI) / 180;
        const elRad = ((Number(am.elevacao) || 0) * Math.PI) / 180;
        const R = 52;
        const sx = R * Math.cos(elRad) * Math.sin(azRad);
        const sy = R * Math.sin(elRad);
        const sz = -R * Math.cos(elRad) * Math.cos(azRad);
        const p = project(sx, sy, sz);

        ctx.beginPath();
        ctx.arc(p.sx, p.sy, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = CORES_ESTACAO[estacao];
        ctx.fill();
      });
    }

    // Esfera do Sol no Horário Atual + Raio de Luz
    if (pontoAtual) {
      const azRad = ((Number(pontoAtual.azimute) || 0) * Math.PI) / 180;
      const elRad = ((Number(pontoAtual.elevacao) || 0) * Math.PI) / 180;
      const R = 52;
      const sx = R * Math.cos(elRad) * Math.sin(azRad);
      const sy = R * Math.sin(elRad);
      const sz = -R * Math.cos(elRad) * Math.cos(azRad);
      const pSol = project(sx, sy, sz);
      const pAlvo = project(0, 10, 0);

      // Raio solar
      ctx.beginPath();
      ctx.moveTo(pSol.sx, pSol.sy);
      ctx.lineTo(pAlvo.sx, pAlvo.sy);
      ctx.strokeStyle =
        estadoHorario === "sol"
          ? "#FDE047"
          : estadoHorario === "bloqueado"
            ? "#FB7185"
            : "rgba(148,163,184,0.35)";
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);

      // Brilho do Sol
      const glow = ctx.createRadialGradient(
        pSol.sx,
        pSol.sy,
        2,
        pSol.sx,
        pSol.sy,
        22,
      );
      glow.addColorStop(0, "#FEF08A");
      glow.addColorStop(1, "rgba(250, 204, 21, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(pSol.sx, pSol.sy, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pSol.sx, pSol.sy, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#FACC15";
      ctx.fill();
    }
  }, [
    camera,
    estacao,
    amostrasEstacao,
    pontoAtual,
    estadoHorario,
    mostrarVizinhos,
    obstaculos3D,
    azReal,
  ]);

  return (
    <div className="rounded-2xl border border-[#DCE4DF] bg-[#F7FAF8] overflow-hidden">
      {/* Barra Superior */}
      <div className="bg-white border-b border-[#DCE4DF] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(["Verao", "Outono", "Inverno", "Primavera"] as const).map((est) => (
            <button
              key={est}
              type="button"
              onClick={() => setEstacao(est)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                estacao === est
                  ? "bg-[#255841] text-white"
                  : "bg-[#F7FAF8] text-[#52605B] border border-[#DCE4DF]"
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

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              setCamera((c) => ({ ...c, zoom: Math.min(2.4, c.zoom + 0.2) }))
            }
            className="p-1.5 rounded-lg border border-[#DCE4DF] bg-white text-[#18221F] hover:bg-[#F7FAF8]"
            title="Aumentar Zoom"
          >
            <ZoomIn className="size-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              setCamera((c) => ({ ...c, zoom: Math.max(0.6, c.zoom - 0.2) }))
            }
            className="p-1.5 rounded-lg border border-[#DCE4DF] bg-white text-[#18221F] hover:bg-[#F7FAF8]"
            title="Diminuir Zoom"
          >
            <ZoomOut className="size-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              setCamera({ rotY: -0.65, rotX: 0.48, zoom: 1.15 })
            }
            className="p-1.5 rounded-lg border border-[#DCE4DF] bg-white text-[#18221F] hover:bg-[#F7FAF8]"
            title="Resetar Câmera 3D"
          >
            <RotateCcw className="size-4" />
          </button>

          <button
            type="button"
            onClick={() => setMostrarVizinhos((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
              mostrarVizinhos
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-white border-[#DCE4DF] text-[#52605B]"
            }`}
          >
            <Eye className="size-3.5" />
            {mostrarVizinhos ? "Vizinhos DSM: ON" : "Vizinhos DSM: OFF"}
          </button>

          <button
            type="button"
            onClick={() => setReproduzindo((r) => !r)}
            className="px-3.5 py-1.5 rounded-lg bg-[#255841] text-white text-xs font-bold flex items-center gap-1.5"
          >
            {reproduzindo ? (
              <>
                <Pause className="size-3.5" /> Pausar
              </>
            ) : (
              <>
                <Play className="size-3.5" /> Animar Dia
              </>
            )}
          </button>
        </div>
      </div>

      {/* Palco 3D Interativo + Explicação */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4">
        <div className="lg:col-span-8 relative rounded-xl overflow-hidden border border-[#DCE4DF] bg-slate-950">
          <canvas
            ref={canvasRef}
            width={680}
            height={380}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              dragRef.current = {
                ativo: true,
                x: e.clientX,
                y: e.clientY,
                rotY0: camera.rotY,
                rotX0: camera.rotX,
              };
            }}
            onPointerMove={(e) => {
              if (!dragRef.current.ativo) return;
              const dx = e.clientX - dragRef.current.x;
              const dy = e.clientY - dragRef.current.y;
              setCamera((c) => ({
                ...c,
                rotY: dragRef.current.rotY0 + dx * 0.01,
                rotX: Math.max(
                  0.12,
                  Math.min(1.45, dragRef.current.rotX0 + dy * 0.008),
                ),
              }));
            }}
            onPointerUp={() => {
              dragRef.current.ativo = false;
            }}
            onWheel={(e) => {
              e.preventDefault();
              const delta = e.deltaY < 0 ? 0.12 : -0.12;
              setCamera((c) => ({
                ...c,
                zoom: Math.max(0.6, Math.min(2.5, c.zoom + delta)),
              }));
            }}
            className="w-full h-[340px] sm:h-[380px] block cursor-grab active:cursor-grabbing touch-none"
          />

          <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs pointer-events-none">
            <span className="text-[10px] font-mono uppercase text-emerald-300 block">
              ARRASTE PARA GIRAR 360° · SCROLL PARA ZOOM
            </span>
            <strong>
              Fachada {nomeOrient} ({Math.round(azReal)}°) ·{" "}
              {pontoAtual ? `${pontoAtual.hora}h00` : "—"}
            </strong>
          </div>

          <div className="bg-slate-900 px-4 py-2.5 border-t border-slate-800 flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-amber-300 shrink-0">
              {pontoAtual ? `${pontoAtual.hora}:00h` : "—"}
            </span>
            <input
              type="range"
              min={amostrasEstacao[0]?.hora ?? 6}
              max={amostrasEstacao[amostrasEstacao.length - 1]?.hora ?? 18}
              step={0.25}
              value={horaSlider}
              onChange={(e) => {
                setReproduzindo(false);
                setHoraSlider(Number(e.target.value));
              }}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Tradutor para o Cliente / Investidor */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-3">
          <div className="rounded-xl border border-[#DCE4DF] bg-white p-4 space-y-2.5">
            <span className="inline-block rounded-full bg-[#EBF3EE] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#255841]">
              VISÃO DO CLIENTE · {ROTULO_ESTACAO[estacao].toUpperCase()}
            </span>
            <h4 className="text-sm font-black text-[#18221F]">
              {estadoHorario === "sol"
                ? "☀️ Fachada recebendo Sol Direto"
                : estadoHorario === "bloqueado"
                  ? "🏢 Sombra causada por vizinho/entorno"
                  : "🌥️ Sombra própria (Sol atrás da fachada)"}
            </h4>
            <p className="text-xs text-[#52605B] leading-relaxed">
              {estadoHorario === "sol"
                ? `Às ${pontoAtual?.hora}h, a fachada amarela no modelo 3D recebe insolação direta (altura solar de ${formatarNumero(
                    pontoAtual?.elevacao,
                    0,
                  )}°). Excelente para iluminação natural e aquecimento passivo.`
                : estadoHorario === "bloqueado"
                  ? `Às ${pontoAtual?.hora}h, o sol estaria de frente para a fachada, mas um obstáculo vizinho (bloco vermelho no 3D) intercepta o raio solar.`
                  : `Às ${pontoAtual?.hora}h, o sol está atrás do alinhamento desta fachada (${formatarNumero(
                      pontoAtual?.azimute,
                      0,
                    )}°), mantendo o ambiente protegido de calor direto.`}
            </p>
          </div>

          <div className="rounded-xl border border-[#CFE0D6] bg-[#EBF3EE] p-4 space-y-1.5">
            <p className="text-[9.5px] font-black uppercase tracking-wider text-[#255841]">
              COMO APRESENTAR AO INVESTIDOR
            </p>
            <p className="text-xs text-[#18221F] leading-relaxed">
              Gire o modelo 3D em 360° para mostrar de onde o sol nasce (Leste) e
              se põe (Oeste), e clique em <strong>Vizinhos DSM: ON/OFF</strong>{" "}
              para provar visualmente a interferência dos prédios ao redor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}