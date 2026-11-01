import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as THREE from "three";

/* ────────────────────────────────────────────────────────────────────────────
   Simulador 3D Vector-X
   - Cena centrada no ponto de análise (observador) e em escala real (1 m = 0,5 u)
   - Prédio extrudado a partir da pegada real (mapa.poligonoXY); sem telhado inclinado
   - Entorno: edificações (volumes) e vegetação (árvores) vindos do perfil de horizonte
   - Obstáculos mudam de cor conforme o que bloqueia na estação / no horário atual
   - Vistas: Perspectiva, Planta e Da fachada (o que a janela enxerga)
   ──────────────────────────────────────────────────────────────────────────── */

const COR_ESTACAO: Record<string, string> = {
  Verao: "#f59e0b",
  Outono: "#dc2626",
  Inverno: "#3b82f6",
  Primavera: "#10b981",
};

const ROTULO_ESTACAO: Record<string, string> = {
  Verao: "Verão",
  Outono: "Outono",
  Inverno: "Inverno",
  Primavera: "Primavera",
};

const COR_STATUS: Record<string, string> = {
  "Pleno Sol": "#fbbf24",
  "Meia Sombra": "#60a5fa",
  Sombra: "#475569",
  "Sombra (obstruída)": "#fb7185",
  "Sombra (obstruida - dado real)": "#fb7185",
  "Sombra (obstruida - estimativa)": "#f43f5e",
  "Sombra (vegetacao provavel)": "#10b981",
};

function obterCorStatus(status?: string): string {
  if (!status) return "#fbbf24";
  if (COR_STATUS[status]) return COR_STATUS[status];
  const s = status.toLowerCase();
  if (s.includes("vegetacao") || s.includes("vegetação")) return "#10b981";
  if (s.includes("obstru")) return "#fb7185";
  if (s.startsWith("sombra")) return "#475569";
  return "#fbbf24";
}

function ehStatusObstruido(status?: string): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return s.includes("obstru") || s.includes("vegetacao") || s.includes("vegetação");
}

// ── Constantes de cena ──
const ESCALA_M = 0.5; // 1 m real = 0,5 unidade
const RAIO_MAPA_M = 60; // mesmo raio do mapa 2D
const RAIO_CENA = RAIO_MAPA_M * ESCALA_M;
const RAIO_TRAJETORIA = 26;
const EMPTY_AZIMUTES: number[] = []; // referência estável (evita recriar a cena a cada render)

const MAPA_AZ: Record<string, number> = {
  norte: 0,
  nordeste: 45,
  leste: 90,
  sudeste: 135,
  sul: 180,
  sudoeste: 225,
  oeste: 270,
  noroeste: 315,
};

const normalizar = (s: string) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const fmt = (n: number, d = 1) => n.toFixed(d).replace(".", ",");

const fmtHora = (h: number) => {
  const total = Math.round(h * 60);
  return `${Math.floor(total / 60)}h${String(total % 60).padStart(2, "0")}`;
};

const css = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

const rnd = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const diffAng = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

// ── Tipos ──
type Telhado = { pitchDegrees?: number; azimuthDegrees?: number };

export type PerfilPonto = {
  azimute: number;
  anguloObstrucaoGraus: number | null;
  anguloConstruidoGraus?: number | null;
  anguloComVegetacaoGraus?: number | null;
  distanciaObstaculoMetros: number | null;
  alturaObstaculoMetros: number | null;
  alturaObstaculoAcimaDoSoloMetros?: number | null;
  referenciaNaoEncontrada?: boolean;
  ponto?: { x: number; y: number; mascara?: number } | null;
};

type EstadoObstaculo = "neutro" | "estacao" | "agora";
type ObstaculoCena = {
  chave: number;
  aplicar: (e: EstadoObstaculo) => void;
};
type Vista = "perspectiva" | "planta" | "fachada";

// ── Parser seguro (n8n / Postgres podem entregar JSON serializado) ──
function parseSeguro<T = any>(valor: any): T | null {
  if (!valor) return null;
  if (typeof valor === "string") {
    try {
      return JSON.parse(valor) as T;
    } catch {
      return null;
    }
  }
  return valor as T;
}

// ── Dados solares ──
function horasDaEstacao(calculoSolar: any, estacao: string): number[] {
  if (!calculoSolar || !calculoSolar[estacao]) return [];
  return Object.keys(calculoSolar[estacao])
    .map((h) => parseFloat(h.replace("h", "")))
    .filter((h) => !Number.isNaN(h))
    .sort((a, b) => a - b);
}

function dadoDaHora(calculoSolar: any, estacao: string, horas: number[], hora: number) {
  if (!horas.length) return { status: "Sem dados" as string | undefined };
  let maisProxima = horas[0];
  for (const h of horas) {
    if (Math.abs(h - hora) < Math.abs(maisProxima - hora)) maisProxima = h;
  }
  return { status: calculoSolar?.[estacao]?.[`${maisProxima}h`]?.status as string | undefined };
}

function indiceContinuoDaHora(horas: number[], horaAlvo: number) {
  if (horas.length === 0) return 0;
  const min = horas[0];
  const max = horas[horas.length - 1];
  const alvo = Math.min(max, Math.max(min, horaAlvo));
  let i0 = 0;
  for (let i = 0; i < horas.length - 1; i++) {
    if (alvo >= horas[i] && alvo <= horas[i + 1]) {
      i0 = i;
      break;
    }
  }
  const h0 = horas[i0];
  const h1 = horas[i0 + 1] ?? h0;
  const frac = h1 === h0 ? 0 : (alvo - h0) / (h1 - h0);
  return i0 + frac;
}

function polarParaCartesiano(azimuteDeg: number, elevacaoDeg: number, raio = RAIO_TRAJETORIA) {
  const elevRad = THREE.MathUtils.degToRad(Math.max(elevacaoDeg, 0.05));
  const azRad = THREE.MathUtils.degToRad(azimuteDeg);
  const horiz = raio * Math.cos(elevRad);
  const alt = raio * Math.sin(elevRad);
  return new THREE.Vector3(Math.sin(azRad) * horiz, Math.max(alt, 0.05), -Math.cos(azRad) * horiz);
}

function pontosCartesianosDaEstacao(calculoSolar: any, estacao: string, horas: number[]) {
  if (!calculoSolar?.[estacao]) return [];
  return horas.map((h) => {
    const d = calculoSolar[estacao][`${h}h`];
    return polarParaCartesiano(Number(d?.azimute) || 0, Number(d?.elevacao) || 0);
  });
}

function catmullRom(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3,
  t: number,
) {
  const t2 = t * t;
  const t3 = t2 * t;
  const calc = (a: number, b: number, c: number, d: number) =>
    0.5 *
    (2 * b +
      (-a + c) * t +
      (2 * a - 5 * b + 4 * c - d) * t2 +
      (-a + 3 * b - 3 * c + d) * t3);
  return new THREE.Vector3(
    calc(p0.x, p1.x, p2.x, p3.x),
    calc(p0.y, p1.y, p2.y, p3.y),
    calc(p0.z, p1.z, p2.z, p3.z),
  );
}

function pontoNaCurva(pontos: THREE.Vector3[], indiceContinuo: number) {
  const n = pontos.length;
  if (n === 0) return new THREE.Vector3();
  if (n === 1) return pontos[0].clone();
  const i1 = Math.max(0, Math.min(n - 2, Math.floor(indiceContinuo)));
  const t = indiceContinuo - i1;
  const i0 = Math.max(0, i1 - 1);
  const i2 = i1 + 1;
  const i3 = Math.min(n - 1, i2 + 1);
  return catmullRom(pontos[i0], pontos[i1], pontos[i2], pontos[i3], t);
}

// Posição do sol no instante: posição 3D suave + azimute/elevação reais (interpolados das amostras)
function posicaoSolar(calculoSolar: any, estacao: string, horas: number[], hora: number) {
  if (!horas.length || !calculoSolar?.[estacao]) return null;
  const pontos = pontosCartesianosDaEstacao(calculoSolar, estacao, horas);
  const idx = indiceContinuoDaHora(horas, hora);
  const pos = pontoNaCurva(pontos, idx);

  const amostras = horas.map((h) => calculoSolar[estacao][`${h}h`]);
  const i0 = Math.min(horas.length - 1, Math.floor(idx));
  const i1 = Math.min(horas.length - 1, i0 + 1);
  const f = idx - i0;
  const e0 = Number(amostras[i0]?.elevacao) || 0;
  const e1 = Number(amostras[i1]?.elevacao) || 0;
  const a0 = Number(amostras[i0]?.azimute) || 0;
  const a1 = Number(amostras[i1]?.azimute) || 0;
  const da = ((a1 - a0 + 540) % 360) - 180;
  return {
    pos,
    elevacao: e0 + (e1 - e0) * f,
    azimute: (a0 + da * f + 360) % 360,
  };
}

// ── Perfil de horizonte ──
function ehPontoVegetacao(p: PerfilPonto): boolean {
  // mascara = 1 → edificação; mascara = 0 → vegetação / outros
  if (p.ponto && typeof p.ponto.mascara === "number") return p.ponto.mascara !== 1;
  if (
    typeof p.anguloComVegetacaoGraus === "number" &&
    typeof p.anguloConstruidoGraus === "number"
  ) {
    return p.anguloComVegetacaoGraus > p.anguloConstruidoGraus + 0.5;
  }
  return false;
}

// Entre os setores próximos da direção do sol, o que mais "levanta" o horizonte
function obstaculoBloqueante(
  perfil: PerfilPonto[],
  azimute: number,
  tolerancia = 12,
): PerfilPonto | null {
  let melhor: PerfilPonto | null = null;
  let melhorAng = 0;
  for (const p of perfil) {
    if (p.referenciaNaoEncontrada) continue;
    const ang = p.anguloObstrucaoGraus ?? 0;
    if (ang <= 0 || diffAng(p.azimute, azimute) > tolerancia) continue;
    if (ang > melhorAng) {
      melhorAng = ang;
      melhor = p;
    }
  }
  return melhor;
}

function amostraBloqueada(d: any): boolean {
  return (
    d?.obstruidoReal === true ||
    d?.obstruidoConstruido === true ||
    d?.obstruidoVegetacao === true ||
    ehStatusObstruido(d?.status)
  );
}

// Quais setores bloqueiam o sol em cada estação
function bloqueantesPorEstacao(calculoSolar: any, perfil: PerfilPonto[]) {
  const saida: Record<string, Set<number>> = {};
  for (const [est, horarios] of Object.entries<any>(calculoSolar || {})) {
    const set = new Set<number>();
    for (const d of Object.values<any>(horarios || {})) {
      if (!amostraBloqueada(d) || typeof d?.azimute !== "number") continue;
      const p = obstaculoBloqueante(perfil, d.azimute);
      if (p) set.add(Math.round(p.azimute));
    }
    saida[est] = set;
  }
  return saida;
}

// ── Utilidades Three ──
function labelSprite(texto: string, cor: string, escala = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.font = "600 40px system-ui, sans-serif";
    ctx.fillStyle = cor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(texto, 96, 48);
  }
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(3 * escala, 1.5 * escala, 1);
  return sprite;
}

function descartar(obj: THREE.Object3D) {
  obj.traverse((o: any) => {
    o.geometry?.dispose?.();
    const m = o.material;
    if (Array.isArray(m)) {
      m.forEach((mm) => {
        mm.map?.dispose?.();
        mm.dispose?.();
      });
    } else if (m) {
      m.map?.dispose?.();
      m.dispose?.();
    }
  });
}

function limparGrupo(g: THREE.Group) {
  [...g.children].forEach((c) => {
    descartar(c);
    g.remove(c);
  });
}

// ── Prédio: pegada real extrudada (ou volume simples se não houver polígono) ──
function construirPredio(
  poligono: [number, number][] | null,
  obs: { x: number; y: number } | null,
  dirF: THREE.Vector2, // direção da fachada (leste, norte)
  alturaM: number,
) {
  const ox = obs?.x ?? 0;
  const oy = obs?.y ?? 0;
  let pts: THREE.Vector2[];

  if (poligono && poligono.length >= 3) {
    pts = poligono.map(([x, y]) => new THREE.Vector2((x - ox) * ESCALA_M, (y - oy) * ESCALA_M));
  } else {
    const t = new THREE.Vector2(dirF.y, -dirF.x);
    const c = dirF.clone().multiplyScalar(-(0.8 + 3));
    pts = (
      [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ] as [number, number][]
    ).map(([a, b]) =>
      c.clone().addScaledVector(t, a * 3).addScaledVector(dirF, b * 3).multiplyScalar(ESCALA_M),
    );
  }

  const H = alturaM * ESCALA_M;
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: H, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2); // (x, y, z) → (leste, altura, -norte)

  const matTopo = new THREE.MeshLambertMaterial({ color: 0x86a794 });
  const matParede = new THREE.MeshLambertMaterial({ color: 0xe4ece6 });
  const corpo = new THREE.Mesh(geo, [matTopo, matParede]);
  corpo.castShadow = true;
  corpo.receiveShadow = true;

  const matLinhas = new THREE.LineBasicMaterial({ color: 0x3a7d5e });
  const linhas = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), matLinhas);

  // Parede analisada = a de normal externa mais alinhada com a direção da fachada
  const area = pts.reduce((s, p, i) => {
    const q = pts[(i + 1) % pts.length];
    return s + (p.x * q.y - q.x * p.y);
  }, 0);
  const ccw = area > 0;
  let melhor: { a: THREE.Vector2; b: THREE.Vector2; n: THREE.Vector2 } | null = null;
  let melhorScore = -Infinity;
  pts.forEach((a, i) => {
    const b = pts[(i + 1) % pts.length];
    const e = b.clone().sub(a);
    const len = e.length();
    if (len < 1e-6) return;
    const n = ccw ? new THREE.Vector2(e.y, -e.x) : new THREE.Vector2(-e.y, e.x);
    n.divideScalar(len);
    const score = n.dot(dirF) * Math.min(len / ESCALA_M, 4);
    if (score > melhorScore) {
      melhorScore = score;
      melhor = { a, b, n };
    }
  });

  const plano = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  if (melhor) {
    const { a, b, n } = melhor as { a: THREE.Vector2; b: THREE.Vector2; n: THREE.Vector2 };
    const off = 0.04;
    const v = (p: THREE.Vector2, y: number) => [p.x + n.x * off, y, -(p.y + n.y * off)];
    plano.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([...v(a, 0), ...v(b, 0), ...v(b, H), ...v(a, H)], 3),
    );
    plano.geometry.setIndex([0, 1, 2, 0, 2, 3]);
  }

  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;

  const grupo = new THREE.Group();
  grupo.add(corpo, linhas, plano);
  return { grupo, plano, linhas: linhas as THREE.LineSegments, centro: new THREE.Vector3(cx, 0, -cy) };
}

// ── Entorno: edificações e vegetação ──
const COR_EDIF: Record<EstadoObstaculo, number> = {
  neutro: 0xc3ccd6,
  estacao: 0xeaa7b0,
  agora: 0xe11d48,
};
const COR_EDIF_LINHA: Record<EstadoObstaculo, number> = {
  neutro: 0x8793a1,
  estacao: 0xd9667a,
  agora: 0x9f1239,
};
const COR_COPA: Record<EstadoObstaculo, number> = {
  neutro: 0x7fb996,
  estacao: 0xe3a4a8,
  agora: 0xf0647a,
};

function construirEntorno(perfil: PerfilPonto[], obs: { x: number; y: number } | null) {
  const grupo = new THREE.Group();
  const obstaculos: ObstaculoCena[] = [];

  perfil.forEach((p) => {
    if (p.referenciaNaoEncontrada) return;
    const altM = p.alturaObstaculoAcimaDoSoloMetros ?? p.alturaObstaculoMetros ?? 0;
    if (altM < 1) return;

    let dxm: number;
    let dym: number;
    if (p.ponto && obs) {
      dxm = p.ponto.x - obs.x;
      dym = p.ponto.y - obs.y;
    } else if (p.distanciaObstaculoMetros && p.distanciaObstaculoMetros > 0) {
      const az = THREE.MathUtils.degToRad(p.azimute);
      dxm = Math.sin(az) * p.distanciaObstaculoMetros;
      dym = Math.cos(az) * p.distanciaObstaculoMetros;
    } else {
      return;
    }

    const distM = Math.hypot(dxm, dym);
    if (distM < 2.5) return; // dentro do próprio prédio
    if (distM > RAIO_MAPA_M) return; // fora da cena: desenhar puxado para dentro daria posição falsa

    const x = dxm * ESCALA_M;
    const z = -dym * ESCALA_M;
    const h = altM * ESCALA_M;
    const chave = Math.round(p.azimute);

    if (!ehPontoVegetacao(p)) {
      const larg = Math.min(12, Math.max(3, distM * 0.175)) * ESCALA_M;
      const geo = new THREE.BoxGeometry(larg, h, larg * 0.75);
      const mat = new THREE.MeshLambertMaterial({ color: COR_EDIF.neutro });
      const corpo = new THREE.Mesh(geo, mat);
      corpo.position.y = h / 2;
      corpo.castShadow = true;
      corpo.receiveShadow = true;
      const lm = new THREE.LineBasicMaterial({ color: COR_EDIF_LINHA.neutro });
      const linhas = new THREE.LineSegments(new THREE.EdgesGeometry(geo), lm);
      linhas.position.y = h / 2;

      const g = new THREE.Group();
      g.add(corpo, linhas);
      g.position.set(x, 0, z);
      g.rotation.y = Math.atan2(x, z); // face voltada para o observador
      grupo.add(g);

      obstaculos.push({
        chave,
        aplicar: (e) => {
          mat.color.setHex(COR_EDIF[e]);
          lm.color.setHex(COR_EDIF_LINHA[e]);
        },
      });
    } else {
      const g = new THREE.Group();
      const hTronco = Math.max(h * 0.4, 0.5);
      const R = Math.max(h * 0.32, 0.7);

      const tronco = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.14, hTronco, 6),
        new THREE.MeshLambertMaterial({ color: 0x8b6b4a }),
      );
      tronco.position.y = hTronco / 2;
      tronco.castShadow = true;
      g.add(tronco);

      const matCopa = new THREE.MeshLambertMaterial({ color: COR_COPA.neutro, flatShading: true });
      const blobs: [number, number, number, number][] = [
        [0, 0, 0, 1],
        [0.55, -0.15, 0.2, 0.72],
        [-0.45, -0.1, -0.35, 0.78],
      ];
      blobs.forEach(([bx, by, bz, k], i) => {
        const r = R * k * (0.9 + rnd(chave + i) * 0.25);
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), matCopa);
        m.position.set(bx * R, hTronco + R * 0.75 + by * R, bz * R);
        m.castShadow = true;
        g.add(m);
      });

      g.position.set(x, 0, z);
      grupo.add(g);

      obstaculos.push({
        chave,
        aplicar: (e) => matCopa.color.setHex(COR_COPA[e]),
      });
    }
  });

  return { grupo, obstaculos };
}

// ── COMPONENTE PRINCIPAL ──
export default function SimuladorSombreamento3D({
  calculoSolar: calculoSolarProp,
  obstrucao: obstrucaoProp,
  fachadaAtual,
  perfilHorizonte: perfilHorizonteProp,
  avisoImageryAntiga: avisoImageryAntigaProp,
  observador: observadorProp,
  azimuteFachadaUsado: azimuteFachadaUsadoProp,
  azimutesBloqueantes = EMPTY_AZIMUTES,
  sombreamentoReal: sombreamentoRealProp,
  poligonoPredio: poligonoPredioProp,
  alturaJanelaMetros: alturaJanelaProp,
  alturaPredioMetros: alturaPredioProp,
}: {
  calculoSolar: any;
  obstrucao?: any;
  fachadaAtual: string;
  telhado?: Telhado; // mantido por compatibilidade; o telhado inclinado foi removido
  mostrarJanelasIlustrativas?: boolean; // mantido por compatibilidade
  observador?: { x: number; y: number } | null;
  azimuteFachadaUsado?: number | null;
  perfilHorizonte?: PerfilPonto[];
  avisoImageryAntiga?: string | null;
  azimutesBloqueantes?: number[];
  sombreamentoReal?: any; // objeto completo do microserviço (perfil, mapa, azimuteFachadaUsado…)
  poligonoPredio?: [number, number][] | null; // mapa.poligonoXY
  alturaJanelaMetros?: number | null; // alturaJanelaUsada
  alturaPredioMetros?: number | null; // se souber; senão estima
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<any>({});

  // Desempacota dados serializados (aceita objeto, string JSON ou array de 1 item)
  const calculoSolar = useMemo(() => parseSeguro(calculoSolarProp) || {}, [calculoSolarProp]);
  const sombreamentoReal = useMemo(() => {
    const raw = parseSeguro(sombreamentoRealProp);
    return (Array.isArray(raw) ? raw[0] : raw) || {};
  }, [sombreamentoRealProp]);

  const perfilHorizonte: PerfilPonto[] = useMemo(
    () => perfilHorizonteProp ?? sombreamentoReal?.perfil ?? [],
    [perfilHorizonteProp, sombreamentoReal],
  );

  const obstrucao = useMemo(
    () => obstrucaoProp ?? sombreamentoReal?.obstrucao_principal ?? sombreamentoReal?.obstrucaoPrincipal ?? null,
    [obstrucaoProp, sombreamentoReal],
  );

  const observador = useMemo(
    () =>
      observadorProp ??
      sombreamentoReal?.mapa?.observador ??
      sombreamentoReal?.mapa?.centro ??
      null,
    [observadorProp, sombreamentoReal],
  );

  const azimuteFachadaUsado = useMemo(
    () =>
      azimuteFachadaUsadoProp ??
      sombreamentoReal?.azimuteFachadaUsado ??
      sombreamentoReal?.azimute_fachada_usado ??
      null,
    [azimuteFachadaUsadoProp, sombreamentoReal],
  );

  const avisoImageryAntiga = useMemo(
    () =>
      avisoImageryAntigaProp ??
      sombreamentoReal?.aviso_imagery_antiga ??
      sombreamentoReal?.avisos?.find?.((a: string) => /sat[eé]lite|imagem/i.test(a)) ??
      null,
    [avisoImageryAntigaProp, sombreamentoReal],
  );

  const poligono: [number, number][] | null = useMemo(
    () => poligonoPredioProp ?? sombreamentoReal?.mapa?.poligonoXY ?? null,
    [poligonoPredioProp, sombreamentoReal],
  );

  const alturaJanela: number = useMemo(
    () =>
      alturaJanelaProp ??
      sombreamentoReal?.alturaJanelaUsada ??
      sombreamentoReal?.altura_janela_usada ??
      4.5,
    [alturaJanelaProp, sombreamentoReal],
  );

  const alturaPredio: number = useMemo(
    () => alturaPredioProp ?? Math.max(alturaJanela + 2.5, 6),
    [alturaPredioProp, alturaJanela],
  );

  const azFachada: number = useMemo(
    () => azimuteFachadaUsado ?? MAPA_AZ[normalizar(fachadaAtual)] ?? 180,
    [azimuteFachadaUsado, fachadaAtual],
  );

  // Perfil efetivo: se não houver perfil, usa a obstrução principal como único obstáculo
  const perfilEfetivo: PerfilPonto[] = useMemo(() => {
    if (perfilHorizonte.length) return perfilHorizonte;
    if (!obstrucao) return [];
    const az =
      typeof obstrucao.azimute === "number"
        ? obstrucao.azimute
        : (MAPA_AZ[normalizar(obstrucao.direcao ?? "sul")] ?? 180);
    return [
      {
        azimute: az,
        anguloObstrucaoGraus: obstrucao.anguloObstrucaoGraus ?? null,
        distanciaObstaculoMetros: obstrucao.distanciaMetros ?? 15,
        alturaObstaculoMetros: obstrucao.alturaMetros ?? 6,
        alturaObstaculoAcimaDoSoloMetros: obstrucao.alturaMetros ?? 6,
      },
    ];
  }, [perfilHorizonte, obstrucao]);

  const perfilValidos = useMemo(
    () => perfilEfetivo.filter((p) => !p.referenciaNaoEncontrada),
    [perfilEfetivo],
  );

  const bloqueantesEst = useMemo(() => {
    const por = bloqueantesPorEstacao(calculoSolar, perfilValidos);
    // azimutes informados por prop / obstrução principal valem para todas as estações
    const extras = new Set<number>(azimutesBloqueantes.map((a) => Math.round(a)));
    if (typeof obstrucao?.azimute === "number") extras.add(Math.round(obstrucao.azimute));
    Object.keys(por).forEach((k) => extras.forEach((a) => por[k].add(a)));
    return por;
  }, [calculoSolar, perfilValidos, azimutesBloqueantes, obstrucao]);

  // ── Estado de UI ──
  const estacoesKeys = useMemo(() => Object.keys(calculoSolar || {}), [calculoSolar]);
  const [estacaoSel, setEstacao] = useState<string>("Verao");
  const estacao = estacoesKeys.includes(estacaoSel) ? estacaoSel : (estacoesKeys[0] ?? estacaoSel);

  const horasDisp = useMemo(() => horasDaEstacao(calculoSolar, estacao), [calculoSolar, estacao]);
  const [hora, setHora] = useState<number>(() => {
    const hs = horasDaEstacao(calculoSolar, "Verao");
    return hs.length ? hs[Math.floor(hs.length / 2)] : 12;
  });

  const [animando, setAnimando] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [progressoGravacao, setProgressoGravacao] = useState(0);
  const [vista, setVista] = useState<Vista>("perspectiva");
  const [sombras, setSombras] = useState(false);
  const [cenaVersao, setCenaVersao] = useState(0);

  const dadoAtual = dadoDaHora(calculoSolar, estacao, horasDisp, hora);
  const solAtual = useMemo(
    () => posicaoSolar(calculoSolar, estacao, horasDisp, hora),
    [calculoSolar, estacao, horasDisp, hora],
  );
  const obstruido = ehStatusObstruido(dadoAtual.status);

  const bloqueador = useMemo(() => {
    if (!obstruido || !solAtual || solAtual.elevacao <= 0) return null;
    return obstaculoBloqueante(perfilValidos, solAtual.azimute);
  }, [obstruido, solAtual, perfilValidos]);
  const chaveAgora = bloqueador ? Math.round(bloqueador.azimute) : null;

  // ── CENA (recriada só quando os dados geométricos mudam) ──
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const S = ESCALA_M;
    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 600;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeef5ef);
    scene.fog = new THREE.Fog(0xeef5ef, 95, 200);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 400);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    mount.style.touchAction = "none";

    // Luzes
    scene.add(new THREE.HemisphereLight(0xffffff, 0xcfdcd2, 0.9));
    const luzSol = new THREE.DirectionalLight(0xfff4dc, 0.75);
    luzSol.castShadow = false;
    luzSol.shadow.mapSize.set(2048, 2048);
    luzSol.shadow.camera.left = -40;
    luzSol.shadow.camera.right = 40;
    luzSol.shadow.camera.top = 40;
    luzSol.shadow.camera.bottom = -40;
    luzSol.shadow.camera.near = 1;
    luzSol.shadow.camera.far = 160;
    luzSol.shadow.bias = -0.0006;
    scene.add(luzSol);

    // Chão
    const chao = new THREE.Mesh(
      new THREE.CircleGeometry(RAIO_CENA * 1.5, 96),
      new THREE.MeshLambertMaterial({ color: 0xe8efe9 }),
    );
    chao.rotation.x = -Math.PI / 2;
    chao.receiveShadow = true;
    scene.add(chao);

    // Anéis de distância (20/40/60 m), como no mapa 2D
    [20, 40, 60].forEach((m) => {
      const R = m * S;
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.sin(a) * R, 0.03, -Math.cos(a) * R));
      }
      scene.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({ color: 0xaab9ae, transparent: true, opacity: 0.85 }),
        ),
      );
      const rot = labelSprite(`${m} m`, "#7b8b80", 0.55);
      const aRot = THREE.MathUtils.degToRad(215);
      rot.position.set(Math.sin(aRot) * R, 0.2, -Math.cos(aRot) * R);
      scene.add(rot);
    });

    // Eixos N–S e L–O
    const eixos = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.03, -RAIO_CENA),
        new THREE.Vector3(0, 0.03, RAIO_CENA),
        new THREE.Vector3(-RAIO_CENA, 0.03, 0),
        new THREE.Vector3(RAIO_CENA, 0.03, 0),
      ]),
      new THREE.LineBasicMaterial({ color: 0xc4d0c8, transparent: true, opacity: 0.8 }),
    );
    scene.add(eixos);

    ([
      ["N", 0],
      ["L", 90],
      ["S", 180],
      ["O", 270],
    ] as [string, number][]).forEach(([txt, ang]) => {
      const rad = THREE.MathUtils.degToRad(ang);
      const sp = labelSprite(txt, "#64748B", 1);
      sp.position.set(Math.sin(rad) * (RAIO_CENA + 3), 0.6, -Math.cos(rad) * (RAIO_CENA + 3));
      scene.add(sp);
    });

    // Campo de visão da fachada (±90° ao redor da normal)
    const azRadF = THREE.MathUtils.degToRad(azFachada);
    const dirF = new THREE.Vector2(Math.sin(azRadF), Math.cos(azRadF)); // (leste, norte)
    {
      const nSeg = 36;
      const verts: number[] = [0, 0.025, 0];
      const idx: number[] = [];
      for (let i = 0; i <= nSeg; i++) {
        const a = azRadF - Math.PI / 2 + (i / nSeg) * Math.PI;
        verts.push(Math.sin(a) * RAIO_CENA, 0.025, -Math.cos(a) * RAIO_CENA);
      }
      for (let i = 1; i <= nSeg; i++) idx.push(0, i, i + 1);
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
      g.setIndex(idx);
      scene.add(
        new THREE.Mesh(
          g,
          new THREE.MeshBasicMaterial({
            color: 0xf59e0b,
            transparent: true,
            opacity: 0.07,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        ),
      );
      const limites = new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0.035, 0),
          new THREE.Vector3(verts[3], 0.035, verts[5]),
          new THREE.Vector3(0, 0.035, 0),
          new THREE.Vector3(verts[verts.length - 3], 0.035, verts[verts.length - 1]),
        ]),
        new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.4 }),
      );
      scene.add(limites);
    }

    // Prédio
    const predio = construirPredio(poligono, observador, dirF, alturaPredio);
    scene.add(predio.grupo);

    // Ponto de análise (janela) + linha vertical
    const alvoRaio = new THREE.Vector3(0, alturaJanela * S, 0);
    const marcador = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b }),
    );
    marcador.position.copy(alvoRaio);
    scene.add(marcador);
    scene.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), alvoRaio]),
        new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.5 }),
      ),
    );

    // Entorno
    const entorno = construirEntorno(perfilEfetivo, observador);
    scene.add(entorno.grupo);

    // Trajetórias de todas as estações (a selecionada é destacada em outro efeito)
    const arcos: Record<string, THREE.Line> = {};
    Object.keys(calculoSolar || {}).forEach((est) => {
      const horas = horasDaEstacao(calculoSolar, est);
      if (horas.length < 2) return;
      const reais = pontosCartesianosDaEstacao(calculoSolar, est, horas);
      const passos = Math.max(48, horas.length * 12);
      const suaves: THREE.Vector3[] = [];
      for (let i = 0; i <= passos; i++) {
        suaves.push(pontoNaCurva(reais, (i / passos) * (reais.length - 1)));
      }
      const linha = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(suaves),
        new THREE.LineBasicMaterial({
          color: COR_ESTACAO[est] ?? "#f59e0b",
          transparent: true,
          opacity: 0.25,
        }),
      );
      arcos[est] = linha;
      scene.add(linha);
    });

    const grupoHoras = new THREE.Group();
    scene.add(grupoHoras);

    // Sol + raio
    const sol = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 }),
    );
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(1.3, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.25 }),
    );
    sol.add(halo);
    scene.add(sol);

    const raioSol = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), alvoRaio]),
      new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.6 }),
    );
    scene.add(raioSol);

    // ── Câmera: órbita ou "olho" (da fachada) ──
    const olho = alvoRaio.clone();
    const alvoPredio = new THREE.Vector3(predio.centro.x, 2, predio.centro.z);
    const cam = {
      modo: "orbita" as "orbita" | "olho",
      theta: Math.PI - azRadF + 0.55,
      phi: 1.0,
      radius: 42,
      alvo: alvoPredio.clone(),
      yaw: azRadF,
      pitch: 0.12,
      fov: 72,
    };

    const atualizarCamera = () => {
      if (cam.modo === "orbita") {
        camera.fov = 42;
        camera.position.set(
          cam.alvo.x + cam.radius * Math.sin(cam.phi) * Math.sin(cam.theta),
          cam.alvo.y + cam.radius * Math.cos(cam.phi),
          cam.alvo.z + cam.radius * Math.sin(cam.phi) * Math.cos(cam.theta),
        );
        camera.lookAt(cam.alvo);
      } else {
        camera.fov = cam.fov;
        camera.position.copy(olho);
        const dir = new THREE.Vector3(
          Math.sin(cam.yaw) * Math.cos(cam.pitch),
          Math.sin(cam.pitch),
          -Math.cos(cam.yaw) * Math.cos(cam.pitch),
        );
        camera.lookAt(olho.clone().add(dir));
      }
      camera.updateProjectionMatrix();
    };

    const aplicarVista = (v: Vista) => {
      if (v === "fachada") {
        cam.modo = "olho";
        cam.yaw = azRadF;
        cam.pitch = 0.12;
        cam.fov = 72;
      } else if (v === "planta") {
        cam.modo = "orbita";
        cam.alvo.set(0, 0, 0);
        cam.theta = 0;
        cam.phi = 0.02;
        cam.radius = 82;
      } else {
        cam.modo = "orbita";
        cam.alvo.copy(alvoPredio);
        cam.theta = Math.PI - azRadF + 0.55;
        cam.phi = 1.0;
        cam.radius = 42;
      }
      atualizarCamera();
    };
    atualizarCamera();

    let arrastando = false;
    let lastX = 0;
    let lastY = 0;
    const onDown = (e: PointerEvent) => {
      arrastando = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onUp = () => {
      arrastando = false;
    };
    const onMove = (e: PointerEvent) => {
      if (!arrastando) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      if (cam.modo === "orbita") {
        cam.theta -= dx * 0.006;
        cam.phi = Math.min(Math.PI * 0.49, Math.max(0.02, cam.phi - dy * 0.006));
      } else {
        cam.yaw -= dx * 0.004;
        cam.pitch = Math.min(0.9, Math.max(-0.5, cam.pitch + dy * 0.004));
      }
      atualizarCamera();
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (cam.modo === "orbita") {
        cam.radius = Math.min(120, Math.max(12, cam.radius + e.deltaY * 0.03));
      } else {
        cam.fov = Math.min(95, Math.max(28, cam.fov + e.deltaY * 0.03));
      }
      atualizarCamera();
    };
    mount.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointermove", onMove);
    mount.addEventListener("wheel", onWheel, { passive: false });

    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(mount);

    let rafId = 0;
    const loop = () => {
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(loop);
    };
    loop();

    stateRef.current = {
      scene,
      renderer,
      sol,
      halo,
      raioSol,
      luzSol,
      arcos,
      grupoHoras,
      alvoRaio,
      obstaculos: entorno.obstaculos,
      planoFachada: predio.plano,
      linhasPredio: predio.linhas,
      aplicarVista,
    };
    setCenaVersao((v) => v + 1);

    return () => {
      cancelAnimationFrame(rafId);
      mount.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointermove", onMove);
      mount.removeEventListener("wheel", onWheel);
      ro.disconnect();
      descartar(scene);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      stateRef.current = {};
    };
  }, [perfilEfetivo, observador, poligono, azFachada, alturaJanela, alturaPredio, calculoSolar]);

  // ── Vista da câmera ──
  useEffect(() => {
    stateRef.current.aplicarVista?.(vista);
  }, [vista, cenaVersao]);

  // ── Sombras ilustrativas ──
  useEffect(() => {
    const { luzSol } = stateRef.current;
    if (luzSol) luzSol.castShadow = sombras;
  }, [sombras, cenaVersao]);

  // ── Estação: destaca trajetória e marca as amostras horárias ──
  useEffect(() => {
    const { arcos, grupoHoras } = stateRef.current;
    if (!arcos || !grupoHoras) return;

    Object.entries<THREE.Line>(arcos).forEach(([est, linha]) => {
      const mat = linha.material as THREE.LineBasicMaterial;
      mat.opacity = est === estacao ? 0.95 : 0.22;
    });

    limparGrupo(grupoHoras);
    horasDisp.forEach((h) => {
      const d = calculoSolar?.[estacao]?.[`${h}h`];
      const p = polarParaCartesiano(Number(d?.azimute) || 0, Number(d?.elevacao) || 0);
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 12, 12),
        new THREE.MeshBasicMaterial({ color: obterCorStatus(d?.status) }),
      );
      dot.position.copy(p);
      const lab = labelSprite(fmtHora(h).replace("h00", "h"), "#64748B", 0.5);
      lab.position.set(p.x, p.y + 1.1, p.z);
      grupoHoras.add(dot, lab);
    });
  }, [estacao, horasDisp, calculoSolar, cenaVersao]);

  // ── Obstáculos: neutro / bloqueia nesta estação / bloqueia agora ──
  useEffect(() => {
    const { obstaculos } = stateRef.current;
    if (!obstaculos) return;
    const daEstacao = bloqueantesEst[estacao];
    (obstaculos as ObstaculoCena[]).forEach((o) => {
      o.aplicar(o.chave === chaveAgora ? "agora" : daEstacao?.has(o.chave) ? "estacao" : "neutro");
    });
  }, [estacao, chaveAgora, bloqueantesEst, cenaVersao]);

  // ── Sol, raio, luz e fachada no instante atual ──
  useEffect(() => {
    const s = stateRef.current;
    if (!s.sol || !solAtual) return;
    const cor = obterCorStatus(dadoAtual.status);
    const visivel = solAtual.elevacao > 0.2;

    s.sol.position.copy(solAtual.pos);
    s.sol.visible = visivel;
    s.sol.material.color.set(cor);
    s.halo.material.color.set(cor);

    s.raioSol.geometry.setFromPoints([solAtual.pos, s.alvoRaio]);
    s.raioSol.visible = visivel;
    s.raioSol.material.color.set(cor);

    s.luzSol.position.copy(solAtual.pos).normalize().multiplyScalar(70);
    s.luzSol.intensity = visivel ? 0.8 : 0;

    s.planoFachada.material.color.set(cor);
    s.planoFachada.material.opacity =
      dadoAtual.status === "Pleno Sol" ? 0.32 : dadoAtual.status === "Meia Sombra" ? 0.2 : 0.14;
    s.linhasPredio.material.color.set(obstruido ? 0xfb7185 : 0x3a7d5e);
  }, [solAtual, dadoAtual.status, obstruido, cenaVersao]);

  // ── Animação do dia ──
  useEffect(() => {
    if (!animando || !horasDisp.length) return;
    const min = horasDisp[0];
    const max = horasDisp[horasDisp.length - 1];
    const id = setInterval(() => {
      setHora((h) => (h + 0.1 > max ? min : h + 0.1));
    }, 60);
    return () => clearInterval(id);
  }, [animando, horasDisp]);

  const gravarVideo = useCallback(async () => {
    const { renderer } = stateRef.current;
    if (!renderer || gravando || !horasDisp.length) return;
    setGravando(true);
    setProgressoGravacao(0);
    setAnimando(false);

    const min = horasDisp[0];
    const max = horasDisp[horasDisp.length - 1];
    setHora(min);

    const stream = renderer.domElement.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size) chunks.push(e.data);
    };

    const finalizar = () =>
      new Promise<void>((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `VectorX_Simulacao_${fachadaAtual}_${estacao}.webm`;
          a.click();
          URL.revokeObjectURL(url);
          resolve();
        };
        recorder.stop();
      });

    recorder.start();
    const duracaoMs = 5000;
    const inicio = performance.now();
    await new Promise<void>((resolve) => {
      const tick = () => {
        const t = (performance.now() - inicio) / duracaoMs;
        if (t >= 1) {
          setHora(max);
          setProgressoGravacao(100);
          resolve();
          return;
        }
        setHora(min + (max - min) * t);
        setProgressoGravacao(Math.round(t * 100));
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await finalizar();
    setGravando(false);
  }, [estacao, horasDisp, gravando, fachadaAtual]);

  const escolherEstacao = (e: string) => {
    setAnimando(false);
    setEstacao(e);
    const hs = horasDaEstacao(calculoSolar, e);
    if (hs.length) setHora((h) => Math.min(hs[hs.length - 1], Math.max(hs[0], h)));
  };

  const VISTAS: { id: Vista; rotulo: string }[] = [
    { id: "perspectiva", rotulo: "Perspectiva" },
    { id: "planta", rotulo: "Planta" },
    { id: "fachada", rotulo: "Da fachada" },
  ];

  const tipoBloqueador = bloqueador ? (ehPontoVegetacao(bloqueador) ? "vegetação" : "edificação") : "";
  const altBloqueador =
    bloqueador?.alturaObstaculoAcimaDoSoloMetros ?? bloqueador?.alturaObstaculoMetros ?? null;

  return (
    <div className="relative w-full h-[600px] rounded-3xl overflow-hidden border border-line bg-surface">
      <div ref={mountRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* Esquerda: leitura do instante + aviso */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 w-[260px] max-w-[calc(100%-2rem)]">
        <div className="bg-surface/90 backdrop-blur-md border border-line p-3.5 rounded-2xl shadow-sm">
          <div className="flex items-baseline justify-between">
            <span style={{ color: COR_ESTACAO[estacao] }} className="font-bold text-sm">
              {ROTULO_ESTACAO[estacao] ?? estacao}
            </span>
            <span className="text-xl font-bold text-ink">{fmtHora(hora)}</span>
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-xs font-medium text-ink">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ background: obterCorStatus(dadoAtual.status) }}
            />
            {dadoAtual.status}
          </div>
          {solAtual && (
            <div className="mt-1.5 text-[11px] text-ink-soft">
              Sol a {Math.round(solAtual.azimute)}° de azimute,{" "}
              {solAtual.elevacao > 0 ? `${Math.round(solAtual.elevacao)}° de altura` : "abaixo do horizonte"}
            </div>
          )}
          {bloqueador && (
            <div className="mt-2 pt-2 border-t border-line text-[11px] text-ink-soft leading-relaxed">
              Bloqueado por {tipoBloqueador} a{" "}
              {fmt(bloqueador.distanciaObstaculoMetros ?? 0)} m
              {altBloqueador != null ? `, com ${fmt(altBloqueador)} m acima do solo` : ""}. Cobre{" "}
              {fmt(bloqueador.anguloObstrucaoGraus ?? 0)}° do céu nessa direção.
            </div>
          )}
        </div>

        {avisoImageryAntiga && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[11px] px-3 py-2 rounded-xl leading-relaxed shadow-sm">
            {avisoImageryAntiga}
          </div>
        )}
      </div>

      {/* Direita: legenda e entorno */}
      <div className="absolute top-4 right-4 w-[210px] bg-surface/90 backdrop-blur-md border border-line p-3.5 rounded-2xl shadow-sm">
        {perfilEfetivo.length > 0 && (
          <div className="text-xs font-bold text-brand-strong mb-2">
            Entorno mapeado ({perfilEfetivo.length} setores)
          </div>
        )}
        <ul className="space-y-1 text-[11px] text-ink-soft">
          {[
            ["Edificação", css(COR_EDIF.neutro)],
            ["Vegetação", css(COR_COPA.neutro)],
            ["Bloqueia nesta estação", css(COR_EDIF.estacao)],
            ["Bloqueia agora", css(COR_EDIF.agora)],
            ["Fachada analisada", "#fbbf24"],
          ].map(([rotulo, cor]) => (
            <li key={rotulo} className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: cor }} />
              {rotulo}
            </li>
          ))}
        </ul>
        <div className="mt-2 pt-2 border-t border-line text-[11px] text-ink-soft">
          Fachada voltada a {Math.round(azFachada)}°
        </div>
        {obstrucao && (
          <div className="mt-2 pt-2 border-t border-line text-[11px] text-ink-soft">
            <div className="font-bold text-rose-500">Obstrução crítica</div>
            {obstrucao.direcao}
            {typeof obstrucao.anguloObstrucaoGraus === "number"
              ? ` (${fmt(obstrucao.anguloObstrucaoGraus)}°)`
              : ""}
            <br />
            {obstrucao.distanciaMetros} m de distância, {obstrucao.alturaMetros} m de altura
          </div>
        )}
        <div className="text-[10px] text-ink-soft/70 mt-2">
          {vista === "fachada" ? "Arraste: olhar ao redor · Scroll: zoom" : "Arraste: girar · Scroll: zoom"}
        </div>
      </div>

      {/* Controles */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-surface via-surface/90 to-transparent pt-12 pb-4 px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap gap-2">
            {estacoesKeys.map((e) => (
              <button
                key={e}
                onClick={() => escolherEstacao(e)}
                disabled={gravando}
                aria-pressed={estacao === e}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  gravando ? "cursor-default" : "cursor-pointer"
                }`}
                style={{
                  border: `1px solid ${estacao === e ? COR_ESTACAO[e] : "#E5E7EB"}`,
                  backgroundColor: estacao === e ? COR_ESTACAO[e] : "#FFFFFF",
                  color: estacao === e ? "#FFFFFF" : "#64748B",
                }}
              >
                {ROTULO_ESTACAO[e] ?? e}
              </button>
            ))}
          </div>

          <div className="flex rounded-full border border-line bg-surface overflow-hidden">
            {VISTAS.map((v) => (
              <button
                key={v.id}
                onClick={() => setVista(v.id)}
                aria-pressed={vista === v.id}
                className={`px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  vista === v.id ? "bg-brand-strong text-white" : "text-ink-soft hover:bg-brand-soft/50"
                }`}
              >
                {v.rotulo}
              </button>
            ))}
          </div>
        </div>

        {horasDisp.length > 0 && (
          <input
            type="range"
            aria-label="Horário do dia"
            min={horasDisp[0]}
            max={horasDisp[horasDisp.length - 1]}
            step={0.1}
            value={hora}
            disabled={gravando}
            onChange={(e) => {
              setAnimando(false);
              setHora(parseFloat(e.target.value));
            }}
            className="w-full accent-brand-strong cursor-pointer"
          />
        )}

        <div className="flex justify-between items-center mt-3 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAnimando((a) => !a)}
              disabled={gravando}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-colors border ${
                animando
                  ? "bg-brand-strong border-brand-strong text-white"
                  : "bg-surface border-brand-strong text-brand-strong hover:bg-brand-soft/50"
              } ${gravando ? "opacity-50 cursor-default" : "cursor-pointer"}`}
            >
              {animando ? "Pausar" : "Animar dia"}
            </button>

            <button
              onClick={() => setSombras((v) => !v)}
              aria-pressed={sombras}
              title="Sombras ilustrativas: os volumes do entorno são simplificados"
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors border cursor-pointer ${
                sombras
                  ? "bg-slate-700 border-slate-700 text-white"
                  : "bg-surface border-line text-ink-soft hover:bg-brand-soft/50"
              }`}
            >
              Sombras
            </button>
          </div>

          <button
            onClick={gravarVideo}
            disabled={gravando}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-colors border ${
              gravando
                ? "bg-amber-100 border-amber-500 text-amber-700 cursor-default"
                : "bg-surface border-amber-500 text-amber-600 hover:bg-amber-50 cursor-pointer"
            }`}
          >
            {gravando ? `Gravando ${progressoGravacao}%` : "Baixar vídeo (.webm)"}
          </button>
        </div>
      </div>
    </div>
  );
}