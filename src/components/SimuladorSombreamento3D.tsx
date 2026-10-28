import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

const COR_ESTACAO: Record<string, string> = { Verao: "#f59e0b", Outono: "#dc2626", Inverno: "#3b82f6", Primavera: "#10b981" };
const COR_STATUS: Record<string, string> = {
  "Pleno Sol": "#fbbf24",
  "Meia Sombra": "#60a5fa",
  "Sombra": "#475569",
  "Sombra (obstruída)": "#fb7185",
};
const RAIO_TRAJETORIA = 16;

// ── FUNÇÕES AUXILIARES DE DADOS (leitura dos horários reais) ──
function horasDaEstacao(calculoSolar: any, estacao: string) {
  if (!calculoSolar || !calculoSolar[estacao]) return [];
  return Object.keys(calculoSolar[estacao])
    .map((h) => parseFloat(h.replace('h', '')))
    .sort((a, b) => a - b);
}

function interpolar(calculoSolar: any, estacao: string, horaAlvo: number) {
  const horas = horasDaEstacao(calculoSolar, estacao);
  if (horas.length === 0) return { azimute: 0, elevacao: 0, status: "Sem Dados", horas: { min: 0, max: 0 } };

  const min = horas[0], max = horas[horas.length - 1];
  const alvo = Math.min(max, Math.max(min, horaAlvo));
  let h0 = min, h1 = max;
  for (let i = 0; i < horas.length - 1; i++) {
    if (alvo >= horas[i] && alvo <= horas[i + 1]) { h0 = horas[i]; h1 = horas[i + 1]; break; }
  }
  const d0 = calculoSolar[estacao][`${h0}h`];
  const d1 = calculoSolar[estacao][`${h1}h`];
  const f = h1 === h0 ? 0 : (alvo - h0) / (h1 - h0);
  return { status: f < 0.5 ? d0?.status : d1?.status, horas: { min, max } };
}

// ── TRAJETÓRIA SUAVE EM ESPAÇO 3D ──
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

function catmullRom(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number) {
  const t2 = t * t, t3 = t2 * t;
  const calc = (a: number, b: number, c: number, d: number) =>
    0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
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

function indiceContinuoDaHora(horas: number[], horaAlvo: number) {
  if (horas.length === 0) return 0;
  const min = horas[0], max = horas[horas.length - 1];
  const alvo = Math.min(max, Math.max(min, horaAlvo));
  let i0 = 0;
  for (let i = 0; i < horas.length - 1; i++) {
    if (alvo >= horas[i] && alvo <= horas[i + 1]) { i0 = i; break; }
  }
  const h0 = horas[i0], h1 = horas[i0 + 1] ?? h0;
  const frac = h1 === h0 ? 0 : (alvo - h0) / (h1 - h0);
  return i0 + frac;
}

function labelSprite(texto: string, cor: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 128; canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.font = "700 36px sans-serif";
    ctx.fillStyle = cor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(texto, 64, 32);
  }
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.2, 1.1, 1);
  return sprite;
}

function criarGradeJanelas(largura: number, altura: number, cor: number) {
  const grupo = new THREE.Group();
  const cols = 3, rows = 2, margem = 0.7;
  const larguraUtil = largura - margem * 2, alturaUtil = altura - margem * 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const w = (larguraUtil / cols) * 0.6, h = (alturaUtil / rows) * 0.55;
      const geo = new THREE.PlaneGeometry(w, h);
      const linhas = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: cor, transparent: true, opacity: 0.35 }));
      const x = -larguraUtil / 2 + (c + 0.5) * (larguraUtil / cols);
      const y = -alturaUtil / 2 + (r + 0.5) * (alturaUtil / rows);
      linhas.position.set(x, y, 0.01);
      grupo.add(linhas);
    }
  }
  return grupo;
}

type Telhado = { pitchDegrees?: number; azimuthDegrees?: number };

// ── HORIZONTE 360° E ENTORNO REAL ──
type PerfilPonto = {
  azimute: number;
  anguloObstrucaoGraus: number | null;
  distanciaObstaculoMetros: number | null;
  alturaObstaculoMetros: number | null;
  alturaObstaculoAcimaDoSoloMetros?: number | null;
  ponto?: { x: number; y: number; mascara: number } | null;
};

const ESCALA_M = 0.6;   // 1 m real = 0,6 unidade na cena
const DIST_MAX_CENA = 26;

function construirEntornoReal(perfil: PerfilPonto[], obsMapa: { x: number; y: number }, normal: THREE.Vector3, bloqueantes: number[]) {
  const grupo = new THREE.Group();
  const base = normal.clone().multiplyScalar(3); // observador = face do prédio
  
  const validos = perfil.filter(
    (p) => p.ponto && bloqueantes.includes(p.azimute) && (p.alturaObstaculoAcimaDoSoloMetros ?? 0) > 1,
  );
  
  const principal = validos.reduce<PerfilPonto | null>((m, p) => {
    if (!m) return p;
    return (p.anguloObstrucaoGraus ?? 0) > (m.anguloObstrucaoGraus ?? 0) ? p : m;
  }, null);

  validos.forEach((p) => {
    const dx = (p.ponto!.x - obsMapa.x) * ESCALA_M;
    const dz = -(p.ponto!.y - obsMapa.y) * ESCALA_M;
    const dist = Math.hypot(dx, dz);
    const f = dist > DIST_MAX_CENA ? DIST_MAX_CENA / dist : 1;
    const x = base.x + dx * f, z = base.z + dz * f;
    const h = Math.max(p.alturaObstaculoAcimaDoSoloMetros as number, 1) * ESCALA_M;
    const ehPrincipal = p === principal;

    if (p.ponto!.mascara === 1) {
      const larg = Math.min(5, Math.max(1.6, dist * 0.17));
      const geo = new THREE.BoxGeometry(larg, h, larg);
      const cor = ehPrincipal ? 0xfb7185 : 0x94a3b8;
      const fill = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.25 }));
      const linhas = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: cor }));
      [fill, linhas].forEach((o) => { o.position.set(x, h / 2, z); grupo.add(o); });
    } else {
      const r = Math.min(h * 0.45, Math.max(0.9, h * 0.3));
      const alturaTronco = Math.max(h - 2 * r, 0.3);
      const cor = ehPrincipal ? 0xfb7185 : 0x4c9a74;
      const tronco = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.16, alturaTronco, 6),
        new THREE.MeshBasicMaterial({ color: 0x8b6b4a }));
      tronco.position.set(x, alturaTronco / 2, z);
      const copa = new THREE.Mesh(
        new THREE.SphereGeometry(r, 10, 8),
        new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.6 }));
      copa.position.set(x, alturaTronco + r * 0.8, z);
      grupo.add(tronco, copa);
    }
  });

  const anel = new THREE.Mesh(
    new THREE.RingGeometry(10, 45, 64),
    new THREE.MeshBasicMaterial({ color: 0xcbd5e1, transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
  anel.rotation.x = -Math.PI / 2; anel.position.y = 0.01;
  grupo.add(anel);
  return grupo;
}

function construirHorizonte(perfil: PerfilPonto[]) {
  const grupo = new THREE.Group();
  if (!perfil?.length) return grupo;

  const porAzimute = new Map(perfil.map((p) => [Math.round(p.azimute), p]));
  const DIST_CEU_ABERTO = 45;

  const amostras: Array<{ azimute: number; alturaM: number; distanciaM: number }> = [];
  for (let az = 0; az < 360; az += 10) {
    const p = porAzimute.get(az);
    amostras.push({
      azimute: az,
      alturaM: p ? Math.max(p.alturaObstaculoMetros || 0, 0) : 0,
      distanciaM: p?.distanciaObstaculoMetros || DIST_CEU_ABERTO,
    });
  }

  const amostrasSuavizadas = amostras.map((amostra, indice) => {
    const anterior = amostras[(indice - 1 + amostras.length) % amostras.length];
    const proxima = amostras[(indice + 1) % amostras.length];
    return {
      ...amostra,
      alturaM: (anterior.alturaM + amostra.alturaM * 2 + proxima.alturaM) / 4,
    };
  });

  const distVis = (m: number) => 4 + Math.sqrt(Math.min(m, 80)) * 3.2;
  const altVis = (m: number) => m / 2.2;

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  boxGeo.translate(0, 0.5, 0);
  const material = new THREE.MeshBasicMaterial({ color: 0x94A3B8, transparent: true, opacity: 0.85 });
  const instancedMesh = new THREE.InstancedMesh(boxGeo, material, amostrasSuavizadas.length * 3);
  const dummy = new THREE.Object3D();
  let instanceIndex = 0;

  amostrasSuavizadas.forEach(({ azimute, alturaM, distanciaM }) => {
    if (alturaM < 2) return;
    const raioBase = distVis(distanciaM);
    const alturaBase = altVis(alturaM);
    const blocosNoSetor = 2 + Math.floor(Math.random() * 2);

    for (let bloco = 0; bloco < blocosNoSetor && instanceIndex < instancedMesh.count; bloco += 1) {
      const azimuteBloco = azimute + (Math.random() - 0.5) * 12;
      const raioBloco = raioBase + Math.random() * 4;
      const alturaBloco = alturaBase * (0.6 + Math.random() * 0.5);
      const azimuteRad = THREE.MathUtils.degToRad(azimuteBloco);

      dummy.position.set(
        Math.sin(azimuteRad) * raioBloco,
        0,
        -Math.cos(azimuteRad) * raioBloco,
      );
      dummy.rotation.y = -azimuteRad + (Math.random() - 0.5) * 0.5;
      dummy.scale.set(1.5 + Math.random() * 2, alturaBloco, 1.5 + Math.random() * 2);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(instanceIndex, dummy.matrix);
      const tom = 0.55 + Math.random() * 0.15;
      instancedMesh.setColorAt(instanceIndex, new THREE.Color(tom, tom + 0.02, tom + 0.05));
      instanceIndex += 1;
    }
  });

  instancedMesh.count = instanceIndex;
  instancedMesh.instanceMatrix.needsUpdate = true;
  if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
  grupo.add(instancedMesh);

  const groundRing = new THREE.Mesh(
    new THREE.RingGeometry(10, 45, 64),
    new THREE.MeshBasicMaterial({ color: 0xCBD5E1, transparent: true, opacity: 0.4, side: THREE.DoubleSide }),
  );
  groundRing.rotation.x = -Math.PI / 2;
  groundRing.position.y = 0.01;
  grupo.add(groundRing);

  return grupo;
}

// ── COMPONENTE PRINCIPAL ──
export default function SimuladorSombreamento3D({
  calculoSolar,
  obstrucao,
  fachadaAtual,
  telhado,
  mostrarJanelasIlustrativas = false,
  perfilHorizonte,
  avisoImageryAntiga,
  observador,
  azimuteFachadaUsado,
  azimutesBloqueantes = [],
}: {
  calculoSolar: any;
  obstrucao: any;
  fachadaAtual: string;
  telhado?: Telhado;
  mostrarJanelasIlustrativas?: boolean;
  observador?: { x: number; y: number } | null;
  azimuteFachadaUsado?: number | null;
  perfilHorizonte?: PerfilPonto[];
  avisoImageryAntiga?: string | null;
  azimutesBloqueantes?: number[];
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<any>({});

  const [estacao, setEstacao] = useState("Verao");
  const horasDispIniciais = horasDaEstacao(calculoSolar, "Verao");
  const [hora, setHora] = useState(horasDispIniciais.length ? horasDispIniciais[Math.floor(horasDispIniciais.length / 2)] : 12);

  const [animando, setAnimando] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [progressoGravacao, setProgressoGravacao] = useState(0);

  const horasDisp = horasDaEstacao(calculoSolar, estacao);
  const dadoAtual = interpolar(calculoSolar, estacao, hora);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const width = mount.clientWidth, height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xEEF5EF);
    scene.fog = new THREE.Fog(0xEEF5EF, 30, 70);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 200);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const grid = new THREE.GridHelper(60, 30, 0xCBD5E1, 0xCBD5E1);
    grid.material.opacity = 0.5;
    grid.material.transparent = true;
    scene.add(grid);

    const chao = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshBasicMaterial({ color: 0xEEF5EF })
    );
    chao.rotation.x = -Math.PI / 2;
    chao.position.y = -0.01;
    scene.add(chao);

    // ── CONFIGURAÇÃO DE AZIMUTE E ROTAÇÃO DO PRÉDIO ──
    const MAPA_AZ: Record<string, number> = { norte: 0, nordeste: 45, leste: 90, sudeste: 135, sul: 180, sudoeste: 225, oeste: 270, noroeste: 315 };
    const azFachada = azimuteFachadaUsado ?? MAPA_AZ[String(fachadaAtual).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")] ?? 180;
    const azRadF = THREE.MathUtils.degToRad(azFachada);
    const normal = new THREE.Vector3(Math.sin(azRadF), 0, -Math.cos(azRadF));
    
    const predio = new THREE.Group();
    predio.rotation.y = Math.PI - azRadF;
    scene.add(predio);

    const alturaParedes = telhado ? 7 : 8;
    const centroFace = normal.clone().multiplyScalar(3).setY(alturaParedes / 2);

    // Paredes
    const edificioGeo = new THREE.BoxGeometry(6, alturaParedes, 6);
    const edificioFill = new THREE.Mesh(
      edificioGeo,
      new THREE.MeshBasicMaterial({ color: 0x4C9A74, transparent: true, opacity: 0.1 })
    );
    edificioFill.position.y = alturaParedes / 2;
    predio.add(edificioFill);

    const edificioLinhas = new THREE.LineSegments(
      new THREE.EdgesGeometry(edificioGeo),
      new THREE.LineBasicMaterial({ color: 0x3A7D5E, transparent: true, opacity: 0.6 })
    );
    edificioLinhas.position.y = alturaParedes / 2;
    predio.add(edificioLinhas);

    // ── TELHADO REAL ──
    if (telhado) {
      const roofGroup = new THREE.Group();
      const roofGeo = new THREE.BoxGeometry(6.8, 0.16, 6.8);
      const roofFill = new THREE.Mesh(roofGeo, new THREE.MeshBasicMaterial({ color: 0x4C9A74, transparent: true, opacity: 0.2 }));
      const roofLinhas = new THREE.LineSegments(
        new THREE.EdgesGeometry(roofGeo),
        new THREE.LineBasicMaterial({ color: 0x3A7D5E, transparent: true, opacity: 0.8 })
      );
      roofGroup.add(roofFill, roofLinhas);
      roofGroup.position.y = alturaParedes;
      roofGroup.rotation.y = THREE.MathUtils.degToRad(telhado.azimuthDegrees || 0);
      roofGroup.rotation.x = THREE.MathUtils.degToRad(-(telhado.pitchDegrees || 0));
      scene.add(roofGroup);
    }

    const facePlano = new THREE.Mesh(
      new THREE.PlaneGeometry(6, alturaParedes),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
    );
    facePlano.position.set(0, alturaParedes / 2, 3.02);
    predio.add(facePlano);

    // ── JANELAS ──
    if (mostrarJanelasIlustrativas) {
      const janelas = criarGradeJanelas(6, alturaParedes, 0x9CA3AF);
      janelas.position.set(0, alturaParedes / 2, 3.05);
      predio.add(janelas);
    }

    // ── ADIÇÃO DO ENTORNO/HORIZONTE ──
    const temReal = observador && perfilHorizonte?.some((p) => p.ponto);
    if (temReal) {
      scene.add(construirEntornoReal(perfilHorizonte!, observador!, normal, azimutesBloqueantes ?? []));
    } else if (perfilHorizonte?.length) {
      scene.add(construirHorizonte(perfilHorizonte));
    } else if (obstrucao) {
      const obsAltura = obstrucao.alturaMetros / 2.2;
      const obsGeo = new THREE.BoxGeometry(5, obsAltura, 5);
      const obsLinhas = new THREE.LineSegments(
        new THREE.EdgesGeometry(obsGeo),
        new THREE.LineBasicMaterial({ color: 0x94A3B8, transparent: true, opacity: 0.8 })
      );

      const direcaoUpper = obstrucao.direcao?.toUpperCase() || 'SUL';
      let anguloReal = 180;
      if (direcaoUpper.includes('NORT')) anguloReal = 0;
      else if (direcaoUpper.includes('LEST')) anguloReal = 90;
      else if (direcaoUpper.includes('OEST')) anguloReal = 270;

      const obsRad = THREE.MathUtils.degToRad(anguloReal);
      const obsDist = Math.max(obstrucao.distanciaMetros / 1.6, 4);
      obsLinhas.position.set(Math.sin(obsRad) * obsDist, obsAltura / 2, -Math.cos(obsRad) * obsDist);
      scene.add(obsLinhas);

      const obsFill = new THREE.Mesh(obsGeo, new THREE.MeshBasicMaterial({ color: 0x94A3B8, transparent: true, opacity: 0.15 }));
      obsFill.position.copy(obsLinhas.position);
      scene.add(obsFill);
    }

    // Sombra
    const sombraGeo = new THREE.PlaneGeometry(1, 1);
    const sombraMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12 });
    const sombra = new THREE.Mesh(sombraGeo, sombraMat);
    sombra.rotation.x = -Math.PI / 2;
    sombra.position.y = 0.02;
    scene.add(sombra);

    const sol = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    scene.add(sol);

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.25 })
    );
    sol.add(halo);

    const raioSol = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.5 })
    );
    scene.add(raioSol);

    const arco = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.5 })
    );
    scene.add(arco);

    const raioEixo = 22;
    [["N", 0], ["L", 90], ["S", 180], ["O", 270]].forEach(([txt, ang]) => {
      const rad = THREE.MathUtils.degToRad(ang as number);
      const sprite = labelSprite(txt as string, "#64748B");
      sprite.position.set(Math.sin(rad) * raioEixo, 0.6, -Math.cos(rad) * raioEixo);
      scene.add(sprite);
    });

    let theta = Math.PI * 0.28, phi = Math.PI * 0.32, radius = 34;
    const alvo = new THREE.Vector3(0, 3, 0);
    const atualizarCamera = () => {
      const x = alvo.x + radius * Math.sin(phi) * Math.sin(theta);
      const y = alvo.y + radius * Math.cos(phi);
      const z = alvo.z + radius * Math.sin(phi) * Math.cos(theta);
      camera.position.set(x, y, z);
      camera.lookAt(alvo);
    };
    atualizarCamera();

    let arrastando = false, lastX = 0, lastY = 0;
    const onDown = (e: any) => { arrastando = true; lastX = e.clientX; lastY = e.clientY; };
    const onUp = () => { arrastando = false; };
    const onMove = (e: any) => {
      if (!arrastando) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      theta -= dx * 0.006;
      phi = Math.min(Math.PI * 0.49, Math.max(0.15, phi - dy * 0.006));
      atualizarCamera();
    };
    const onWheel = (e: any) => {
      e.preventDefault();
      radius = Math.min(60, Math.max(14, radius + e.deltaY * 0.02));
      atualizarCamera();
    };

    mount.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointermove", onMove);
    mount.addEventListener("wheel", onWheel, { passive: false });

    const onResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth, h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    let rafId: number;
    const loop = () => {
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(loop);
    };
    loop();

    stateRef.current = { scene, camera, renderer, sol, raioSol, sombra, arco, facePlano, edificioLinhas, alturaParedes, centroFace };

    return () => {
      cancelAnimationFrame(rafId);
      mount.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointermove", onMove);
      mount.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [obstrucao, telhado, mostrarJanelasIlustrativas, perfilHorizonte, observador, azimuteFachadaUsado, fachadaAtual, azimutesBloqueantes]);

  // ── ARCO DO DIA ──
  useEffect(() => {
    const { arco } = stateRef.current;
    if (!arco || !horasDisp.length) return;
    const pontosReais = pontosCartesianosDaEstacao(calculoSolar, estacao, horasDisp);
    const pontosSuaves: THREE.Vector3[] = [];
    const passos = Math.max(40, horasDisp.length * 12);
    for (let i = 0; i <= passos; i++) {
      const indice = (i / passos) * (pontosReais.length - 1);
      pontosSuaves.push(pontoNaCurva(pontosReais, indice));
    }
    arco.geometry.dispose();
    arco.geometry = new THREE.BufferGeometry().setFromPoints(pontosSuaves);
    arco.material.color.set(COR_ESTACAO[estacao]);
  }, [estacao, horasDisp, calculoSolar]);

  // ── POSIÇÃO DO SOL ──
  useEffect(() => {
    const { sol, raioSol, sombra, facePlano, edificioLinhas, centroFace } = stateRef.current;
    if (!sol || !horasDisp.length || !centroFace) return;

    const pontosReais = pontosCartesianosDaEstacao(calculoSolar, estacao, horasDisp);
    const indice = indiceContinuoDaHora(horasDisp, hora);
    const sunPos = pontoNaCurva(pontosReais, indice);

    const elevacaoEfetiva = THREE.MathUtils.radToDeg(Math.asin(Math.min(1, Math.max(-1, sunPos.y / RAIO_TRAJETORIA))));
    const azimuteEfetivo = (THREE.MathUtils.radToDeg(Math.atan2(sunPos.x, -sunPos.z)) + 360) % 360;
    const status = dadoAtual.status;

    sol.position.copy(sunPos);
    sol.visible = elevacaoEfetiva > 0;
    sol.material.color.set(COR_STATUS[status] ?? "#fbbf24");

    raioSol.geometry.setFromPoints([sunPos, centroFace]);
    raioSol.visible = elevacaoEfetiva > 0;

    const elevRad = THREE.MathUtils.degToRad(Math.max(elevacaoEfetiva, 0.5));
    const azRad = THREE.MathUtils.degToRad(azimuteEfetivo);
    const compSombra = Math.min(18, 8 / Math.max(Math.tan(elevRad), 0.06));
    const dirSombraX = -Math.sin(azRad), dirSombraZ = Math.cos(azRad);
    sombra.scale.set(3.6, compSombra, 1);
    sombra.rotation.z = -Math.atan2(dirSombraX, dirSombraZ) + Math.PI / 2;
    sombra.position.set(dirSombraX * compSombra * 0.5, 0.02, 4 + dirSombraZ * compSombra * 0.5);

    facePlano.material.color.set(COR_STATUS[status] ?? "#fbbf24");
    facePlano.material.opacity = status === "Pleno Sol" ? 0.3 : status === "Meia Sombra" ? 0.18 : 0.08;
    edificioLinhas.material.color.set(status === "Sombra (obstruída)" ? 0xfb7185 : 0x3A7D5E);
  }, [estacao, hora, dadoAtual.status, calculoSolar, horasDisp]);

  useEffect(() => {
    if (!animando || !horasDisp.length) return;
    const min = horasDisp[0], max = horasDisp[horasDisp.length - 1];
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

    const min = horasDisp[0], max = horasDisp[horasDisp.length - 1];
    setHora(min);

    const stream = renderer.domElement.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 });
    const chunks: any[] = [];
    recorder.ondataavailable = (e: any) => { if (e.data.size) chunks.push(e.data); };

    const finalizar = () => new Promise<void>((resolve) => {
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
    const passoInicio = performance.now();
    await new Promise<void>((resolve) => {
      const tick = () => {
        const t = (performance.now() - passoInicio) / duracaoMs;
        if (t >= 1) { setHora(max); setProgressoGravacao(100); resolve(); return; }
        setHora(min + (max - min) * t);
        setProgressoGravacao(Math.round(t * 100));
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await finalizar();
    setGravando(false);
  }, [estacao, horasDisp, gravando, fachadaAtual]);

  const estacoesKeys = Object.keys(calculoSolar || {});

  return (
    <div className="relative w-full h-[600px] rounded-3xl overflow-hidden border border-line bg-surface">
      <div ref={mountRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* Caixa de Status (Topo Esquerda) */}
      <div className="absolute top-4 left-4 min-w-[210px] bg-surface/85 backdrop-blur-md border border-line p-3.5 rounded-2xl shadow-sm">
        <div style={{ color: COR_ESTACAO[estacao] }} className="font-bold text-sm mb-1.5">{estacao}</div>
        <div className="text-xl font-bold text-ink mb-1">
          {Math.floor(hora)}h{Math.round((hora % 1) * 60).toString().padStart(2, "0")}
        </div>
        <div className="text-xs font-medium" style={{ color: COR_STATUS[dadoAtual.status] || "#64748B" }}>
          {dadoAtual.status}
        </div>
      </div>

      {/* Caixa de Informações de Horizonte (Topo Direita) */}
      {(perfilHorizonte?.length || obstrucao) && (
        <div className="absolute top-4 right-4 max-w-[240px] text-right bg-surface/85 backdrop-blur-md border border-line p-3.5 rounded-2xl shadow-sm">
          {perfilHorizonte?.length ? (
            <div className="text-xs font-bold text-brand-strong">Horizonte 360° mapeado</div>
          ) : (
            <>
              <div className="text-xs font-bold text-rose-500 mb-1">Obstrução Mapeada</div>
              <div className="text-[11px] text-ink-soft">Direção: {obstrucao.direcao}</div>
              <div className="text-[11px] text-ink-soft">{obstrucao.distanciaMetros}m dist · {obstrucao.alturaMetros}m alt</div>
            </>
          )}
          <div className="text-[10px] text-ink-soft/70 mt-2 font-medium">Arraste: girar · Scroll: zoom</div>
        </div>
      )}

      {/* Aviso */}
      {avisoImageryAntiga && (
        <div className="absolute bottom-28 left-4 max-w-[320px] bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-xl leading-relaxed shadow-sm">
          ⚠ {avisoImageryAntiga}
        </div>
      )}

      {/* Controles Base (Rodapé) */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-surface via-surface/90 to-transparent pt-12 pb-4 px-4 sm:px-6">
        
        {/* Seletores de Estação */}
        <div className="flex flex-wrap gap-2 mb-4">
          {estacoesKeys.map((e) => (
            <button
              key={e}
              onClick={() => { setAnimando(false); setEstacao(e); }}
              disabled={gravando}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${gravando ? "cursor-default" : "cursor-pointer"}`}
              style={{
                border: `1px solid ${estacao === e ? COR_ESTACAO[e] : "#E5E7EB"}`,
                backgroundColor: estacao === e ? COR_ESTACAO[e] : "#FFFFFF",
                color: estacao === e ? "#FFFFFF" : "#64748B",
              }}
            >
              {e}
            </button>
          ))}
        </div>

        {/* Timeline Slider */}
        {horasDisp.length > 0 && (
          <input
            type="range" min={horasDisp[0]} max={horasDisp[horasDisp.length - 1]} step={0.1}
            value={hora} disabled={gravando}
            onChange={(e) => { setAnimando(false); setHora(parseFloat(e.target.value)); }}
            className="w-full accent-brand-strong cursor-pointer"
          />
        )}

        {/* Botões de Ação */}
        <div className="flex justify-between items-center mt-4 flex-wrap gap-3">
          <button
            onClick={() => setAnimando((a) => !a)}
            disabled={gravando}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all border ${
              animando 
                ? "bg-brand-strong border-brand-strong text-white" 
                : "bg-surface border-brand-strong text-brand-strong hover:bg-brand-soft/50"
            } ${gravando ? "opacity-50 cursor-default" : "cursor-pointer"}`}
          >
            {animando ? "Pausar" : "Animar dia"}
          </button>

          <button
            onClick={gravarVideo}
            disabled={gravando}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all border ${
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