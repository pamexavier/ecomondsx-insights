require("dotenv").config();

const express = require("express");
const GeoTIFF = require("geotiff");
const proj4 = require("proj4");
const { PNG } = require("pngjs");

// Requer Node 18+ (fetch nativo). Não use node-fetch.
const app = express();
app.use(express.json());

const API_KEY = process.env.GOOGLE_SOLAR_API_KEY;
const PORTA = process.env.PORT || 3000;

if (!API_KEY) {
  console.error("ERRO: variável GOOGLE_SOLAR_API_KEY não encontrada.");
  process.exit(1);
}

// ===========================================================================
// NÚCLEO DO CÁLCULO DE HORIZONTE (lógica pura, sem dependências)
// ===========================================================================
// ---------------------------------------------------------------------------
// Núcleo do cálculo de horizonte (sem dependências externas).
//
// Convenção de coordenadas: METROS relativos ao pino. x = leste, y = norte.
// `amostrar(x, y)` devolve { elev, tel } (elevação do DSM em metros e máscara 0/1)
// ou null se estiver fora do mapa / sem dado.
// ---------------------------------------------------------------------------

const PARAMS = {
  PASSO_M: 0.5,            // passo do raio
  DIST_MAX_M: 80,          // alcance do raio
  CONFIRMA_SAIDA: 3,       // amostras consecutivas fora do telhado p/ confirmar saída (filtra ruído da máscara)
  SALTO_PAREDE_M: 2.0,     // salto de elevação entre amostras vizinhas = parede de outro prédio colado
  RAIO_BUSCA_TELHADO_M: 40,// se o pino cair fora do telhado, procura telhado até esta distância
  RAIO_SOLO_M: 8,          // raio p/ estimar a cota do solo ao redor da saída
  PERCENTIL_SOLO: 0.2,
  CRESCIMENTO_TELHADO_M: 3.0, // quanto o telhado próprio pode passar do polígono das paredes (beiral, desalinhamento entre fontes)
  BORDA_M: 1.0,               // faixa em volta do telhado próprio onde pixels baixos são tratados como beiral/parede (não obstáculo)
  BORDA_TOLERANCIA_M: 1.0,    // ...desde que não passem de (cota do telhado vizinho + isto)     // percentil baixo das cotas "não telhado" = solo (evita carros/árvores)
};

const rad = (g) => (g * Math.PI) / 180;

// 1) Telhado mais próximo do pino (o geocoding costuma cair na rua / meio do lote)
function acharTelhadoMaisProximo(amostrar, raioMax = PARAMS.RAIO_BUSCA_TELHADO_M, passo = 0.5) {
  let melhor = null;
  const n = Math.ceil(raioMax / passo);
  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      const x = i * passo, y = j * passo;
      const dist = Math.hypot(x, y);
      if (dist > raioMax || (melhor && dist >= melhor.dist)) continue;
      const p = amostrar(x, y);
      if (p && p.tel > 0) melhor = { x, y, dist, elev: p.elev };
    }
  }
  return melhor;
}

// 2) Cota do solo ao redor de um ponto: percentil baixo das elevações de pixels "não telhado"
function estimarSolo(amostrar, x0, y0, raio = PARAMS.RAIO_SOLO_M) {
  const cotas = [];
  for (let i = -raio; i <= raio; i++) {
    for (let j = -raio; j <= raio; j++) {
      if (Math.hypot(i, j) > raio) continue;
      const p = amostrar(x0 + i, y0 + j);
      if (p && p.tel === 0) cotas.push(p.elev);
    }
  }
  if (cotas.length < 5) return null;
  cotas.sort((a, b) => a - b);
  return cotas[Math.floor((cotas.length - 1) * PARAMS.PERCENTIL_SOLO)];
}

// 3) Caminha pelo telhado "de olhos fechados" até confirmar a saída.
//    Saída = N amostras seguidas com máscara 0  OU  salto brusco de elevação (parede de vizinho colado).
function acharSaida(amostrar, ox, oy, az, distMax = PARAMS.DIST_MAX_M, passo = PARAMS.PASSO_M, ehProprio = null) {
  const dx = Math.sin(rad(az)), dy = Math.cos(rad(az));
  let runFora = 0, inicioRun = null, elevAnterior = null;

  for (let d = 0; d <= distMax; d += passo) {
    const p = amostrar(ox + dx * d, oy + dy * d);
    if (!p) continue;

    const salto = !(ehProprio && ehProprio.autoritativo) && elevAnterior !== null && p.elev - elevAnterior > PARAMS.SALTO_PAREDE_M;
    elevAnterior = p.elev;

    if (salto) return { dSaida: d, dInicio: d, viaSalto: true }; // o próprio pixel do salto já é avaliado como obstáculo

    const dentro = ehProprio ? ehProprio(ox + dx * d, oy + dy * d) : p.tel > 0;
    if (dentro) { runFora = 0; inicioRun = null; continue; }

    if (runFora === 0) inicioRun = d;
    runFora++;
    if (runFora >= PARAMS.CONFIRMA_SAIDA) return { dSaida: inicioRun, dInicio: d + passo };
  }
  return null; // nunca saiu do telhado dentro do alcance
}

// 3b) Telhado do PRÓPRIO imóvel (componente conexa da máscara a partir do pino).
//     Não atravessa degrau > SALTO_PAREDE_M, então vizinho colado e mais alto fica de fora.
//     Em modo fachada, beiral/telhado/paredes do próprio prédio nunca são obstáculo.
//     `limite` (opcional) = bounding box do prédio em metros relativos ao pino: separa vizinho encostado de altura parecida.
function mapearTelhadoProprio(amostrar, origem, passo = PARAMS.PASSO_M, raioMax = 60, limite = null) {
  const chave = (x, y) => Math.round(x / passo) + "," + Math.round(y / passo);
  const i0 = Math.round(origem.x / passo), j0 = Math.round(origem.y / passo);
  const proprio = new Set([i0 + "," + j0]);
  const pilha = [[i0, j0]];
  while (pilha.length) {
    const [i, j] = pilha.pop();
    const a = amostrar(i * passo, j * passo);
    if (!a) continue;
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        if (!di && !dj) continue;
        const ni = i + di, nj = j + dj, k = ni + "," + nj;
        if (proprio.has(k) || Math.hypot(ni * passo, nj * passo) > raioMax) continue;
        if (limite && (ni * passo < limite.xmin || ni * passo > limite.xmax || nj * passo < limite.ymin || nj * passo > limite.ymax)) continue;
        const b = amostrar(ni * passo, nj * passo);
        if (!b || b.tel === 0 || Math.abs(b.elev - a.elev) > PARAMS.SALTO_PAREDE_M) continue;
        proprio.add(k);
        pilha.push([ni, nj]);
      }
    }
  }
  const ehProprio = (x, y) => proprio.has(chave(x, y));
  ehProprio.celulas = proprio;
  return ehProprio;
}

// bounding box do prédio (campo `boundingBox` do buildings:findClosest, em lat/lng) -> metros relativos ao pino
function limiteDoPredio(bb, lat0, lng0, margem = 0.5) {
  const sw = bb?.sw, ne = bb?.ne;
  if (![sw?.latitude, sw?.longitude, ne?.latitude, ne?.longitude, lat0, lng0].every(Number.isFinite)) return null;
  const mLat = 111132, mLng = 111320 * Math.cos((lat0 * Math.PI) / 180);
  return {
    xmin: (sw.longitude - lng0) * mLng - margem, xmax: (ne.longitude - lng0) * mLng + margem,
    ymin: (sw.latitude - lat0) * mLat - margem, ymax: (ne.latitude - lat0) * mLat + margem,
  };
}

// 3c) Orientação real das paredes: retângulo de área mínima em torno do telhado próprio.
//     Devolve { a, extU, extV }: azimute base `a` (0..89); as 4 normais externas são a, a+90, a+180, a+270.
//     Paredes com normal a / a+180 medem extV; as de normal a+90 / a+270 medem extU.
function estimarOrientacaoParedes(celulas, passo = PARAMS.PASSO_M) {
  const pts = [];
  for (const k of celulas) {
    const [i, j] = k.split(",").map(Number);
    pts.push([i * passo, j * passo]);
  }
  if (pts.length < 20) return null;
  let melhor = null;
  for (let a = 0; a < 90; a++) {
    const r = rad(a), ux = Math.sin(r), uy = Math.cos(r), vx = Math.cos(r), vy = -Math.sin(r);
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (const [x, y] of pts) {
      const u = x * ux + y * uy, v = x * vx + y * vy;
      if (u < minU) minU = u; if (u > maxU) maxU = u;
      if (v < minV) minV = v; if (v > maxV) maxV = v;
    }
    const area = (maxU - minU) * (maxV - minV);
    if (!melhor || area < melhor.area) melhor = { a, area, extU: maxU - minU, extV: maxV - minV };
  }
  return melhor; // { a, extU, extV }
}

const difAngular = (a, b) => Math.abs((((a - b) % 360) + 540) % 360 - 180);

// Distância (m) do ponto ao pixel mais próximo do telhado próprio (diagnóstico)
function distanciaAoProprio(ehProprio, x, y, raio = 3, passo = PARAMS.PASSO_M) {
  let melhor = null;
  const n = Math.ceil(raio / passo);
  for (let di = -n; di <= n; di++) {
    for (let dj = -n; dj <= n; dj++) {
      if (!ehProprio(x + di * passo, y + dj * passo)) continue;
      const d = Math.hypot(di, dj) * passo;
      if (melhor === null || d < melhor) melhor = d;
    }
  }
  return melhor === null ? null : Math.round(melhor * 10) / 10;
}

// Diagnóstico: o que o mapa de elevação "vê" em volta da janela (fora do telhado próprio).
//  - terrenoEVegetacao: cotas dos pixels sem telhado (solo, muros, árvores) -> p20 ~ solo, max ~ topo das árvores
//  - telhadosVizinhosMax: maior cota de telhado de outro prédio no raio
function resumoEntorno(amostrar, ehProprio, x0, y0, raio = 20) {
  const livres = [];
  let teto = null;
  for (let i = -raio; i <= raio; i++) {
    for (let j = -raio; j <= raio; j++) {
      if (Math.hypot(i, j) > raio) continue;
      const x = x0 + i, y = y0 + j;
      const p = amostrar(x, y);
      if (!p || (ehProprio && ehProprio(x, y))) continue;
      if (p.tel === 1) { if (teto === null || p.elev > teto) teto = p.elev; }
      else livres.push(p.elev);
    }
  }
  if (!livres.length) return { terrenoEVegetacao: null, telhadosVizinhosMax: teto };
  livres.sort((a, b) => a - b);
  const q = (f) => Math.round(livres[Math.floor((livres.length - 1) * f)] * 10) / 10;
  return {
    raioMetros: raio,
    terrenoEVegetacao: { pixels: livres.length, min: q(0), p20: q(0.2), p50: q(0.5), p90: q(0.9), max: q(1) },
    telhadosVizinhosMax: teto === null ? null : Math.round(teto * 10) / 10,
  };
}

// 4) Um raio completo
//    modoFachada: observador fixo (janela) -> distância = d desde o observador, olho fixo.
//    modo centro: raio sai do pino; distância = d - dSaida, olho = solo local da saída + alturaJanela.
function lancarRaio(amostrar, ox, oy, az, cfg) {
  const { modoFachada, olhoFixo, obterOlho, ehProprio, alturaJanela = 0, distMax = PARAMS.DIST_MAX_M, passo = PARAMS.PASSO_M } = cfg;
  const dx = Math.sin(rad(az)), dy = Math.cos(rad(az));

  const semDado = (aviso) => ({ azimute: az, anguloObstrucaoGraus: null, distanciaObstaculoMetros: null, alturaObstaculoMetros: null, alturaObstaculoAcimaDoSoloMetros: null, aviso });

  let saida;
  if (modoFachada && ehProprio) {
    // Raio que entra no próprio prédio: a janela não enxerga atrás da parede.
    let seguidos = 0;
    for (let d = passo; d <= 6; d += passo) {
      seguidos = ehProprio(ox + dx * d, oy + dy * d) ? seguidos + 1 : 0;
      if (seguidos >= 4) return semDado("direção aponta para dentro do prédio (atrás da fachada)");
    }
    saida = { dSaida: 0, dInicio: 0 };
  } else {
    saida = acharSaida(amostrar, ox, oy, az, distMax, passo, ehProprio);
    if (!saida) return semDado("raio não saiu do telhado");
  }

  const olho = modoFachada ? olhoFixo : obterOlho(ox + dx * saida.dSaida, oy + dy * saida.dSaida);
  if (olho == null) return semDado("cota do solo não estimada para esta direção");

  let maiorAngulo = 0, distMaior = null, alturaMaior = null;
  let pontoMaior = null;
  for (let d = saida.dInicio; d <= distMax; d += passo) {
    const p = amostrar(ox + dx * d, oy + dy * d);
    if (!p) continue;
    if (ehProprio && (ehProprio.comBorda ? ehProprio.comBorda(ox + dx * d, oy + dy * d, p.elev) : ehProprio(ox + dx * d, oy + dy * d))) continue; // próprio prédio nunca é obstáculo

    const dif = p.elev - olho;
    if (dif <= 0) continue;

    const dist = Math.max(modoFachada ? d : d - saida.dSaida, passo);
    const ang = (Math.atan(dif / dist) * 180) / Math.PI;
    if (ang > maiorAngulo) {
      maiorAngulo = ang;
      distMaior = Math.round(dist * 10) / 10;
      alturaMaior = p.elev;
      pontoMaior = { x: ox + dx * d, y: oy + dy * d, tel: p.tel };
    }
  }

  return {
    ponto: pontoMaior
  ? { x: Math.round(pontoMaior.x * 10) / 10, y: Math.round(pontoMaior.y * 10) / 10, mascara: pontoMaior.tel }
  : null,
    azimute: az,
    anguloObstrucaoGraus: Math.round(maiorAngulo * 10) / 10,
    distanciaObstaculoMetros: distMaior,
    alturaObstaculoMetros: alturaMaior !== null ? Math.round(alturaMaior * 10) / 10 : null, // cota absoluta (nível do mar)
    // altura do obstáculo acima do solo local: é ESSA que deve aparecer no card
    alturaObstaculoAcimaDoSoloMetros: alturaMaior !== null ? Math.round((alturaMaior - (olho - alturaJanela)) * 10) / 10 : null,
    // Só com debug:true. x/y = metros a leste/norte do pino; mascara = 1 se o pixel é telhado;
    // distAoProprioM = distância até o telhado do próprio imóvel (perto de 0 => provável vazamento do próprio prédio).
    ...(cfg.debug && pontoMaior
      ? { debug: { x: Math.round(pontoMaior.x * 10) / 10, y: Math.round(pontoMaior.y * 10) / 10, mascara: pontoMaior.tel, distAoProprioM: ehProprio ? distanciaAoProprio(ehProprio, pontoMaior.x, pontoMaior.y) : null } }
      : {}),
  };
}

// ---------------------------------------------------------------------------
// Identificação do imóvel pelo contorno (poligonoPredio).
// A referência é o polígono, não "o telhado mais próximo do pino".
// ---------------------------------------------------------------------------
const M_POR_GRAU_LAT = 111132;
const mPorGrauLng = (lat) => 111320 * Math.cos((lat * Math.PI) / 180);

// Aceita: array de {lat,lng}|{latitude,longitude}, array de pares [lat,lng] ou [lng,lat] (decide pelo pino),
// GeoJSON (Polygon/MultiPolygon/Feature, sempre [lng,lat]) e o mesmo em string JSON.
function normalizarPoligono(entrada, lat0, lng0) {
  let e = entrada;
  if (typeof e === "string") {
    try { e = JSON.parse(e); } catch { return { ok: false, erro: "poligonoPredio não é um JSON válido." }; }
  }
  const geo = (g) => {
    if (!g || typeof g !== "object" || Array.isArray(g)) return null;
    if (g.displayPolygon) return geo(g.displayPolygon);
    if (g.type === "Feature") return geo(g.geometry);
    if (g.type === "FeatureCollection") return geo(g.features?.[0]);
    if (g.type === "Polygon") return { pares: g.coordinates?.[0], ordem: "lnglat" };
    if (g.type === "MultiPolygon") return { pares: g.coordinates?.[0]?.[0], ordem: "lnglat" };
    if (Array.isArray(g.coordinates)) return { pares: g.coordinates, ordem: "auto" };
    return null;
  };
  let pares = null, ordem = "auto";
  if (Array.isArray(e)) pares = e;
  else if (e && typeof e === "object") {
    const g = geo(e);
    if (g) { pares = g.pares; ordem = g.ordem; }
    else pares = e.pontos ?? e.vertices ?? e.coordenadas ?? null;
  }
  if (Array.isArray(pares) && Array.isArray(pares[0]) && Array.isArray(pares[0][0])) pares = pares[0]; // anel aninhado
  if (!Array.isArray(pares) || pares.length < 3) return { ok: false, erro: "poligonoPredio sem pelo menos 3 vértices." };

  let latlng;
  if (pares.every((p) => p && typeof p === "object" && !Array.isArray(p))) {
    latlng = pares.map((p) => [Number(p.lat ?? p.latitude), Number(p.lng ?? p.lon ?? p.longitude)]);
  } else {
    const brutos = pares.map((p) => (Array.isArray(p) ? [Number(p[0]), Number(p[1])] : [NaN, NaN]));
    let vLatLng = 0, vLngLat = 0;
    for (const [a, b] of brutos) {
      if (Math.abs(a - lat0) + Math.abs(b - lng0) <= Math.abs(a - lng0) + Math.abs(b - lat0)) vLatLng++; else vLngLat++;
    }
    const lngLat = ordem === "lnglat" || (ordem === "auto" && vLngLat > vLatLng);
    latlng = brutos.map(([a, b]) => (lngLat ? [b, a] : [a, b]));
  }
  if (latlng.some(([la, lo]) => !Number.isFinite(la) || !Number.isFinite(lo))) {
    return { ok: false, erro: "poligonoPredio com vértice inválido (esperado lat/lng numéricos)." };
  }

  const mLng = mPorGrauLng(lat0);
  let anel = latlng.map(([la, lo]) => [(lo - lng0) * mLng, (la - lat0) * M_POR_GRAU_LAT]);
  const a0 = anel[0], an = anel[anel.length - 1];
  if (anel.length > 3 && Math.hypot(a0[0] - an[0], a0[1] - an[1]) < 0.05) anel = anel.slice(0, -1);
  if (anel.some(([x, y]) => Math.hypot(x, y) > 300)) {
    return { ok: false, erro: "poligonoPredio a mais de 300 m do pino (lat/lng trocados ou polígono de outro lugar)." };
  }
  const area = Math.abs(anel.reduce((t, [x, y], i) => { const [x2, y2] = anel[(i + 1) % anel.length]; return t + (x * y2 - x2 * y); }, 0)) / 2;
  if (area < 8) return { ok: false, erro: `poligonoPredio com área de ${area.toFixed(1)} m², pequena demais para um prédio.` };
  return { ok: true, anel, area };
}

function pontoNoAnel(anel, x, y) {
  let dentro = false;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const [xi, yi] = anel[i], [xj, yj] = anel[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

function distAoAnel(anel, x, y) {
  let m = Infinity;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const [ax, ay] = anel[j], [bx, by] = anel[i];
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
    m = Math.min(m, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
  }
  return m;
}

// Valida o polígono contra o pino e a máscara do DSM e delimita o telhado próprio = máscara ∩ polígono (+ margem de beiral).
function identificarPorPoligono(amostrar, anel, { toleranciaPinoM = 3, margemM = 1.0, coberturaMinima = 0.35 } = {}) {
  const passo = PARAMS.PASSO_M;
  const pinoDentro = pontoNoAnel(anel, 0, 0);
  const distPino = pinoDentro ? 0 : distAoAnel(anel, 0, 0);
  if (distPino > toleranciaPinoM) {
    return { ok: false, codigo: "PINO_FORA_DO_POLIGONO", erro: `O pino está a ${distPino.toFixed(1)} m do polígono do prédio (tolerância ${toleranciaPinoM} m): o ponto de referência não corresponde ao imóvel do polígono.` };
  }

  const xs = anel.map((q) => q[0]), ys = anel.map((q) => q[1]);
  const i0 = Math.floor((Math.min(...xs) - margemM) / passo), i1 = Math.ceil((Math.max(...xs) + margemM) / passo);
  const j0 = Math.floor((Math.min(...ys) - margemM) / passo), j1 = Math.ceil((Math.max(...ys) + margemM) / passo);

  const comMargem = new Set(), estrito = new Set();
  let total = 0, cobertos = 0;
  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      const x = i * passo, y = j * passo;
      const dentro = pontoNoAnel(anel, x, y);
      if (!dentro && distAoAnel(anel, x, y) > margemM) continue;
      const q = amostrar(x, y);
      if (!q) continue;
      if (dentro) { total++; if (q.tel) cobertos++; }
      if (q.tel) { comMargem.add(i + "," + j); if (dentro) estrito.add(i + "," + j); }
    }
  }
  if (total === 0) {
    return { ok: false, codigo: "POLIGONO_SEM_DADO", erro: "O polígono do prédio está fora da área coberta pelo mapa de elevação." };
  }
  const cobertura = cobertos / total;
  if (cobertura < coberturaMinima || estrito.size < 20) {
    return { ok: false, codigo: "POLIGONO_SEM_TELHADO", erro: `Só ${(cobertura * 100).toFixed(0)}% do polígono tem telhado no mapa de elevação (mínimo ${(coberturaMinima * 100).toFixed(0)}%): polígono de outro lugar, deslocado, ou prédio inexistente na imagem usada.` };
  }

  let origem = null;
  for (const k of estrito) {
    const [i, j] = k.split(",").map(Number);
    const d = Math.hypot(i * passo, j * passo);
    if (!origem || d < origem.dist) origem = { x: i * passo, y: j * passo, dist: d };
  }
  origem.elev = amostrar(origem.x, origem.y).elev;

  // O polígono (paredes) costuma ser menor que o telhado visto pelo mapa de elevação (beiral, desalinhamento):
  // o telhado próprio cresce pela máscara a partir do polígono, até CRESCIMENTO_TELHADO_M, sem subir degrau de vizinho.
  const proprio = new Set(comMargem), elevProp = new Map(), pilha = [];
  for (const k of comMargem) {
    const [i, j] = k.split(",").map(Number);
    elevProp.set(k, amostrar(i * passo, j * passo).elev);
    pilha.push([i, j]);
  }
  while (pilha.length) {
    const [i, j] = pilha.pop();
    const e0 = elevProp.get(i + "," + j);
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        if (!di && !dj) continue;
        const ni = i + di, nj = j + dj, kk = ni + "," + nj;
        if (proprio.has(kk)) continue;
        const x = ni * passo, y = nj * passo;
        if (!pontoNoAnel(anel, x, y) && distAoAnel(anel, x, y) > PARAMS.CRESCIMENTO_TELHADO_M) continue;
        const q = amostrar(x, y);
        if (!q || !q.tel || Math.abs(q.elev - e0) > PARAMS.SALTO_PAREDE_M + 1) continue;
        proprio.add(kk); elevProp.set(kk, q.elev); pilha.push([ni, nj]);
      }
    }
  }
  // Faixa de borda: pixels sem máscara junto ao telhado próprio e não mais altos que ele (ponta do beiral, parede)
  const borda = new Map(), nb = Math.ceil(PARAMS.BORDA_M / passo);
  for (const k of proprio) {
    const [i, j] = k.split(",").map(Number);
    const lim = elevProp.get(k) + PARAMS.BORDA_TOLERANCIA_M;
    for (let di = -nb; di <= nb; di++) {
      for (let dj = -nb; dj <= nb; dj++) {
        if (Math.hypot(di, dj) * passo > PARAMS.BORDA_M) continue;
        const kk = (i + di) + "," + (j + dj);
        if (proprio.has(kk)) continue;
        if (!(borda.get(kk) >= lim)) borda.set(kk, lim);
      }
    }
  }
  const chave = (x, y) => Math.round(x / passo) + "," + Math.round(y / passo);
  const ehProprio = (x, y) => proprio.has(chave(x, y));
  ehProprio.comBorda = (x, y, elev) => { const k = chave(x, y); return proprio.has(k) || (borda.has(k) && elev <= borda.get(k)); };
  ehProprio.celulas = estrito;      // orientação e comprimentos das paredes usam só o interior do polígono
  ehProprio.autoritativo = true;    // o polígono manda: sem heurística de "salto de elevação"

  const avisos = [];
  if (cobertura < 0.6) avisos.push(`Cobertura baixa do polígono pelo telhado detectado (${(cobertura * 100).toFixed(0)}%): confira se o contorno e a imagem correspondem.`);
  return {
    ok: true, origem, ehProprio, avisos,
    info: {
      metodo: "poligono", coberturaMascara: Math.round(cobertura * 100) / 100, pinoDentroDoPoligono: pinoDentro,
      distanciaPinoAoPoligonoM: Math.round(distPino * 10) / 10, areaPoligonoM2: Math.round((estrito.size * passo * passo) * 10) / 10,
      areaTelhadoDetectadoM2: Math.round(proprio.size * passo * passo * 10) / 10,
    },
  };
}

// boundingBox ({sw,ne} em lat/lng) -> retângulo em metros relativos ao pino
function anelDoBoundingBox(bb, lat0, lng0) {
  const sw = bb?.sw, ne = bb?.ne;
  if (![sw?.latitude, sw?.longitude, ne?.latitude, ne?.longitude, lat0, lng0].every(Number.isFinite)) return null;
  const mLng = mPorGrauLng(lat0);
  const x0 = (sw.longitude - lng0) * mLng, x1 = (ne.longitude - lng0) * mLng;
  const y0 = (sw.latitude - lat0) * M_POR_GRAU_LAT, y1 = (ne.latitude - lat0) * M_POR_GRAU_LAT;
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
}

// Decide como o imóvel é identificado: polígono (se enviado) > boundingBox > telhado mais próximo (com aviso)
function resolverPredio(body) {
  const { poligonoPredio, exigirPoligono = false, lat, lng } = body;
  const limitePredio = limiteDoPredio(body.boundingBoxPredio, lat, lng);
  const vazio = poligonoPredio === undefined || poligonoPredio === null || poligonoPredio === "" || (Array.isArray(poligonoPredio) && !poligonoPredio.length);
  if (!vazio) {
    const n = normalizarPoligono(poligonoPredio, lat, lng);
    if (!n.ok) return { erro: { disponivel: false, codigoErro: "POLIGONO_INVALIDO", erro: n.erro } };
    return { poligono: n.anel, metodo: "poligono", limitePredio };
  }
  if (exigirPoligono) {
    return { erro: { disponivel: false, codigoErro: "POLIGONO_AUSENTE", erro: "poligonoPredio é obrigatório (exigirPoligono=true) e não foi enviado." } };
  }
  const anelBB = limitePredio ? anelDoBoundingBox(body.boundingBoxPredio, lat, lng) : null;
  if (anelBB) return { poligono: anelBB, metodo: "boundingBox", limitePredio };
  return { poligono: null, metodo: "telhado_mais_proximo", limitePredio };
}

// 5) Orquestra tudo
function calcularHorizonte(amostrar, { alturaJanela = 1.5, azimuteFachada, azimutes = [], snapFachada = true, debug = false, limitePredio = null, poligono = null, toleranciaPinoM = 3, metodoIdentificacao = "poligono" }) {
  const avisos = [];

  // 1) Identificar o imóvel-alvo
  let origem, ehProprioPoligono = null, identificacao;
  if (poligono) {
    const r = identificarPorPoligono(amostrar, poligono, { toleranciaPinoM });
    if (!r.ok) return r;
    origem = r.origem; ehProprioPoligono = r.ehProprio; identificacao = { ...r.info, metodo: metodoIdentificacao };
    avisos.push(...r.avisos);
    if (metodoIdentificacao === "boundingBox") avisos.push("Imóvel delimitado pelo boundingBox (retângulo), não pelo contorno real: em prédios girados o retângulo inclui cantos de fora.");
  } else {
    origem = acharTelhadoMaisProximo(amostrar);
    if (!origem) {
      return { ok: false, codigo: "TELHADO_NAO_ENCONTRADO", erro: `Nenhum telhado encontrado em ${PARAMS.RAIO_BUSCA_TELHADO_M} m do ponto informado.` };
    }
    identificacao = { metodo: limitePredio ? "boundingBox" : "telhado_mais_proximo" };
    if (!limitePredio) avisos.push("Imóvel identificado apenas pelo telhado mais próximo do pino (sem poligonoPredio): confirme que é o prédio certo.");
    if (origem.dist > 1) avisos.push(`O pino estava a ${origem.dist.toFixed(1)} m do telhado mais próximo; o cálculo partiu desse telhado.`);
  }

  let limite = poligono ? null : limitePredio;
  if (limite && (origem.x < limite.xmin || origem.x > limite.xmax || origem.y < limite.ymin || origem.y > limite.ymax)) {
    avisos.push("O telhado de partida está fora do boundingBoxPredio informado; limite ignorado.");
    limite = null;
  }

  let cfg, meta;
  let ox = origem.x, oy = origem.y;
  let azFachada = azimuteFachada;
  let ehProprio = null;
  let lista = azimutes;

  if (typeof azimuteFachada === "number") {
    ehProprio = ehProprioPoligono ?? mapearTelhadoProprio(amostrar, origem, undefined, undefined, limite);

    // O azimute informado costuma ser aproximado ("Sul" = 180°). Ajusta para a normal de parede mais próxima.
    if (snapFachada) {
      const orient = estimarOrientacaoParedes(ehProprio.celulas);
      if (orient) {
        const base = orient.a;
        const normais = [0, 1, 2, 3].map((k) => (base + 90 * k) % 360);
        const melhor = normais.reduce((m, n) => (difAngular(n, azimuteFachada) < difAngular(m, azimuteFachada) ? n : m));
        const dif = difAngular(melhor, azimuteFachada);
        if (dif > 40) {
          avisos.push(`Orientação ambígua: o azimute informado (${azimuteFachada}°) fica quase na diagonal das paredes (${normais.join("°, ")}°); mantido como informado.`);
        } else if (dif >= 1) {
          azFachada = melhor;
          avisos.push(`Fachada ajustada de ${azimuteFachada}° para ${melhor}° (orientação real da parede, pelo contorno do prédio).`);
        }
      }
    }

    lista = Array.from({ length: 19 }, (_, i) => (((azFachada - 90 + i * 10) % 360) + 360) % 360);

    const s = acharSaida(amostrar, ox, oy, azFachada, undefined, undefined, ehProprio);
    if (s) {
      const dx = Math.sin(rad(azFachada)), dy = Math.cos(rad(azFachada));
      // Saída por parede colada: o observador fica na última amostra ANTES da parede, não em cima do vizinho
      const dObs = s.viaSalto ? Math.max(0, s.dSaida - PARAMS.PASSO_M) : s.dSaida + PARAMS.PASSO_M;
      ox = ox + dx * dObs;
      oy = oy + dy * dObs;
      let solo = estimarSolo(amostrar, ox, oy);
      let baseUsada = "solo_estimado";
      if (solo === null) {
        solo = estimarSolo(amostrar, origem.x, origem.y, 25);
        if (solo !== null) baseUsada = "solo_estimado_raio_maior";
      }
      if (solo === null) {
        return { ok: false, codigo: "SOLO_NAO_ESTIMADO", erro: "Não foi possível estimar a cota do solo ao redor da fachada (sem pixels livres no mapa de elevação)." };
      }
      cfg = { modoFachada: true, olhoFixo: solo + alturaJanela, alturaJanela, ehProprio, debug };
      meta = {
        modo: "fachada",
        azimuteFachadaInformado: azimuteFachada,
        azimuteFachadaUsado: azFachada,
        baseElevacao: baseUsada,
        cotaBaseMetros: Math.round(solo * 10) / 10,
        cotaOlhoMetros: Math.round((solo + alturaJanela) * 10) / 10,
      };
      if (debug) meta.entorno20m = resumoEntorno(amostrar, ehProprio, ox, oy);
    } else {
      if (ehProprioPoligono) {
        return { ok: false, codigo: "FACHADA_NAO_LOCALIZADA", erro: `Não foi possível localizar a fachada na direção ${azFachada}° a partir do contorno do prédio.` };
      }
      avisos.push("Não foi possível localizar a fachada na direção informada; usando modo centro.");
      lista = azimutes.length ? azimutes : Array.from({ length: 24 }, (_, i) => i * 15);
    }
  }

  if (!cfg) {
    cfg = {
      modoFachada: false,
      alturaJanela,
      debug,
      ehProprio: ehProprioPoligono ?? (limite ? mapearTelhadoProprio(amostrar, origem, undefined, undefined, limite) : null),
      obterOlho: (x, y) => {
        const solo = estimarSolo(amostrar, x, y) ?? estimarSolo(amostrar, origem.x, origem.y, 25);
        return solo === null ? null : solo + alturaJanela;
      },
    };
    meta = { modo: "centro", baseElevacao: "solo_local_por_raio" };
  }

  meta.identificacaoPredio = identificacao;
  const perfil = lista.map((az) => lancarRaio(amostrar, ox, oy, az, cfg));
  const dentro = perfil.filter((p) => p.aviso && p.aviso.startsWith("direção aponta")).length;
  if (dentro) {
    avisos.push(`${dentro} direção(ões) apontam para dentro do prédio; ficam sem dado.`);
  }
  return { ok: true, perfil, meta, avisos, observador: { x: ox, y: oy }, origem: { x: origem.x, y: origem.y }, poligonoXY: poligono };
}

// ---------------------------------------------------------------------------
// Respostas dos endpoints (puras: recebem os dados já carregados; fáceis de testar)
// ---------------------------------------------------------------------------
// ponto {latitude,longitude} | {lat,lng} | {location:{...}} | [lat,lng] -> [x,y] em metros relativos ao pino
function lerPonto(p, lat0, lng0) {
  if (!p) return null;
  if (p.location) p = p.location;
  let la, lo;
  if (Array.isArray(p)) {
    la = Number(p[0]); lo = Number(p[1]);
    if (Math.abs(la - lat0) + Math.abs(lo - lng0) > Math.abs(la - lng0) + Math.abs(lo - lat0)) [la, lo] = [lo, la];
  } else {
    la = Number(p.latitude ?? p.lat); lo = Number(p.longitude ?? p.lng ?? p.lon);
  }
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  return [(lo - lng0) * mPorGrauLng(lat0), (la - lat0) * M_POR_GRAU_LAT];
}

function centroideCelulas(celulas) {
  let sx = 0, sy = 0, n = 0;
  for (const k of celulas) {
    const [i, j] = k.split(",").map(Number);
    sx += i * PARAMS.PASSO_M; sy += j * PARAMS.PASSO_M; n++;
  }
  return n ? [sx / n, sy / n] : null;
}

// Fachada da frente = parede cuja normal aponta mais para o ponto de acesso (rua / navigationPoint)
function frenteDe(celulas, base, acessoXY) {
  const c = centroideCelulas(celulas);
  if (!c) return null;
  const dir = ((Math.atan2(acessoXY[0] - c[0], acessoXY[1] - c[1]) * 180) / Math.PI + 360) % 360;
  const normais = [0, 1, 2, 3].map((k) => (base + 90 * k) % 360);
  const azimute = normais.reduce((m, n) => (difAngular(n, dir) < difAngular(m, dir) ? n : m));
  return {
    azimute, direcaoAoPontoDeAcesso: Math.round(dir), diferencaGraus: Math.round(difAngular(azimute, dir)),
    distanciaAoPontoDeAcessoM: Math.round(Math.hypot(acessoXY[0] - c[0], acessoXY[1] - c[1]) * 10) / 10,
  };
}

// Delimita o prédio (polígono > boundingBox > telhado mais próximo) e devolve o telhado próprio
function delimitarPredio(amostrar, body, predio) {
  if (predio.poligono) {
    const r = identificarPorPoligono(amostrar, predio.poligono, { toleranciaPinoM: body.toleranciaPinoM ?? 3 });
    if (!r.ok) return { erro: { disponivel: false, codigoErro: r.codigo, erro: r.erro } };
    return { origem: r.origem, ehProprio: r.ehProprio, info: { ...r.info, metodo: predio.metodo }, avisos: r.avisos };
  }
  const origem = acharTelhadoMaisProximo(amostrar);
  if (!origem) {
    return { erro: { disponivel: false, codigoErro: "TELHADO_NAO_ENCONTRADO", erro: `Nenhum telhado encontrado em ${PARAMS.RAIO_BUSCA_TELHADO_M} m do ponto informado.` } };
  }
  const avisos = [];
  if (!predio.limitePredio) avisos.push("Imóvel identificado apenas pelo telhado mais próximo do pino (sem poligonoPredio): confirme que é o prédio certo.");
  if (origem.dist > 1) avisos.push(`O pino estava a ${origem.dist.toFixed(1)} m do telhado mais próximo.`);
  return { origem, ehProprio: mapearTelhadoProprio(amostrar, origem, undefined, undefined, predio.limitePredio), info: { metodo: "telhado_mais_proximo" }, avisos };
}

// "frente" -> azimute real da parede voltada para o ponto de acesso
function resolverFrente(amostrar, body, predio) {
  const acesso = lerPonto(body.pontoAcesso ?? body.navigationPoints?.[0], body.lat, body.lng);
  if (!acesso) {
    return { erro: { disponivel: false, codigoErro: "PONTO_ACESSO_AUSENTE", erro: 'Para usar a fachada "frente" envie pontoAcesso (ou navigationPoints) com a localização da rua.' } };
  }
  const d = delimitarPredio(amostrar, body, predio);
  if (d.erro) return d;
  const o = estimarOrientacaoParedes(d.ehProprio.celulas);
  if (!o) return { erro: { disponivel: false, codigoErro: "TELHADO_PEQUENO", erro: "Telhado pequeno demais para medir a orientação das paredes." } };
  const f = frenteDe(d.ehProprio.celulas, o.a, acesso);
  return { ...f, ambigua: f.diferencaGraus > 35 };
}

const ROTULOS = ["N", "NNE", "NE", "ENE", "L", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];
const rotuloDe = (az) => ROTULOS[Math.round(az / 22.5) % 16];

function avisosGeraisDe({ pinoAproximado, imageryDate }) {
  const avisos = [];
  if (pinoAproximado) avisos.push("CRS do GeoTIFF não é UTM; o pino foi aproximado pelo centro da imagem.");
  if (imageryDate?.year) {
    const idade = new Date().getFullYear() - imageryDate.year;
    if (idade >= 5) avisos.push(`Imagem de satélite de ${imageryDate.year} (${idade} anos atrás): construções recentes podem não aparecer.`);
  }
  return avisos;
}

// /paredes: as 4 paredes do prédio (azimute real da normal externa + comprimento) e qual delas é a frente
function montarParedes(dados, body = {}) {
  const { amostrar } = dados;
  const predio = resolverPredio(body);
  if (predio.erro) return predio.erro;
  const d = delimitarPredio(amostrar, body, predio);
  if (d.erro) return d.erro;
  const avisos = [...avisosGeraisDe(dados), ...d.avisos];

  const o = estimarOrientacaoParedes(d.ehProprio.celulas);
  if (!o) return { disponivel: false, codigoErro: "TELHADO_PEQUENO", erro: "Telhado pequeno demais para medir a orientação das paredes." };

  const acesso = lerPonto(body.pontoAcesso ?? body.navigationPoints?.[0], body.lat, body.lng);
  const frente = acesso ? frenteDe(d.ehProprio.celulas, o.a, acesso) : null;
  if (frente && frente.diferencaGraus > 35) avisos.push(`A direção da rua (${frente.direcaoAoPontoDeAcesso}°) fica quase na diagonal das paredes: a fachada da frente é ambígua (prédio de esquina?).`);

  const paredes = [0, 1, 2, 3]
    .map((k) => {
      const azimute = (o.a + 90 * k) % 360;
      return {
        azimute, rotulo: rotuloDe(azimute), comprimentoMetros: Math.round((k % 2 === 0 ? o.extV : o.extU) * 10) / 10,
        ...(frente ? { frente: azimute === frente.azimute } : {}),
      };
    })
    .sort((x, y) => x.azimute - y.azimute);

  avisos.push("Comprimentos valem para prédios aproximadamente retangulares.");
  return { disponivel: true, imageryDate: dados.imageryDate, identificacaoPredio: d.info, ...(frente ? { fachadaFrente: frente } : {}), paredes, avisos };
}

// /horizonte: uma fachada (formato anterior), várias fachadas (azimutesFachada) ou 360° (sem azimute).
// Em qualquer azimute, o texto "frente" usa o pontoAcesso para achar a fachada voltada para a rua.
const FAIXAS_MAPA = [[0.5,[30,60,120]],[3,[60,150,80]],[6,[220,200,60]],[10,[235,140,40]],[15,[220,60,50]],[1e9,[170,40,170]]];
const corFaixa = (h) => (FAIXAS_MAPA.find((f) => h < f[0]) || FAIXAS_MAPA[FAIXAS_MAPA.length - 1])[1];

function gerarImagemMapa(amostrar, base, R = 60, STEP = 0.5) {
  const N = Math.round((2 * R) / STEP);
  const png = new PNG({ width: N, height: N });
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const p = amostrar(-R + (c + 0.5) * STEP, R - (r + 0.5) * STEP);
      let cor = [60, 60, 60];
      if (p) {
        cor = corFaixa(p.elev - base);
        if (p.tel) cor = cor.map((v) => Math.min(255, v + 80));
      }
      const i = (r * N + c) * 4;
      png.data[i] = cor[0]; png.data[i + 1] = cor[1]; png.data[i + 2] = cor[2]; png.data[i + 3] = 255;
    }
  }
  return "data:image/png;base64," + PNG.sync.write(png).toString("base64");
}

function montarResposta(body, dados) {
  const { alturaJanela = 1.5, azimuteFachada, azimutesFachada, snapFachada = true, debug = false, toleranciaPinoM = 3 } = body;
  const { amostrar, resolucaoMetros, imageryDate } = dados;
  const base = { disponivel: true, tecnologia: "Mask-Aware Ray-Casting v3 (Vector-X)", imageryDate, resolucaoMetros };
  const gerais = avisosGeraisDe(dados);

  const predio = resolverPredio(body);
  if (predio.erro) return predio.erro;
  const comum = { snapFachada, debug, limitePredio: predio.limitePredio, poligono: predio.poligono, toleranciaPinoM, metodoIdentificacao: predio.metodo };

  const ehFrente = (v) => v === "frente" || v?.azimute === "frente";
  let frente = null;
  if (ehFrente(azimuteFachada) || (Array.isArray(azimutesFachada) && azimutesFachada.some(ehFrente))) {
    const fr = resolverFrente(amostrar, body, predio);
    if (fr.erro) return fr.erro;
    frente = fr;
    if (fr.ambigua) gerais.push(`A direção da rua (${fr.direcaoAoPontoDeAcesso}°) fica quase na diagonal das paredes: a fachada da frente é ambígua.`);
  }
  const resolver = (v) => (ehFrente(v) ? frente.azimute : typeof v === "number" ? v : v?.azimute);

  if (Array.isArray(azimutesFachada) && azimutesFachada.length) {
    let fatal = null;
    const fachadas = azimutesFachada.map((f) => {
      const az = resolver(f);
      if (typeof az !== "number") return { erro: "azimute de fachada inválido" };
      const altura = typeof f?.alturaJanela === "number" ? f.alturaJanela : alturaJanela;
      const r = calcularHorizonte(amostrar, { ...comum, alturaJanela: altura, azimuteFachada: az });
      if (!r.ok) {
        if (!["FACHADA_NAO_LOCALIZADA", "SOLO_NAO_ESTIMADO"].includes(r.codigo)) fatal = fatal ?? r;
        return { azimuteFachadaInformado: az, codigoErro: r.codigo, erro: r.erro };
      }
      return { ...(ehFrente(f) ? { fachadaFrente: true } : {}), alturaJanelaUsada: altura, ...r.meta, avisos: r.avisos, perfil: r.perfil };
    });
    if (fatal) return { disponivel: false, codigoErro: fatal.codigo, erro: fatal.erro };
    return { ...base, avisos: gerais, fachadas };
  }

  const azSolo = ehFrente(azimuteFachada) ? frente.azimute : azimuteFachada;
  const azimutes = [];
  if (typeof azSolo !== "number") for (let a = 0; a < 360; a += 15) azimutes.push(a);

    const r = calcularHorizonte(amostrar, { ...comum, alturaJanela, azimuteFachada: azSolo, azimutes });
  if (!r.ok) return { disponivel: false, codigoErro: r.codigo, erro: r.erro };
  return {
    ...base,
    alturaJanelaUsada: alturaJanela,
    ...(frente ? { fachadaFrente: frente } : {}),
    ...r.meta,
    avisos: [...r.avisos, ...gerais],
    perfil: r.perfil,
    ...(body.incluirMapa ? { mapa: {
      imagem: gerarImagemMapa(amostrar, r.meta.cotaBaseMetros ?? 0),
      imagemAno: imageryDate?.year ?? null,
      raioMetros: 60,
      observador: r.observador, origem: r.origem, poligonoXY: r.poligonoXY,
    } } : {}),
  };
}

// ---------------------------------------------------------------------------
// /debug-mapa: desenha o DSM REAL em volta do pino (cor = altura acima da base), o contorno de telhado,
// o pino, o observador e os raios com o obstáculo de cada direção. Serve para comparar com o satélite.
// ---------------------------------------------------------------------------
const PAGINA_DEBUG = `<!doctype html><html lang="pt-br"><head><meta charset="utf-8"><title>Debug horizonte</title>
<style>body{font-family:system-ui,sans-serif;margin:12px;background:#111;color:#eee}#info{font:13px monospace;height:20px;margin:6px 0}
canvas{max-width:100%;border:1px solid #444;cursor:crosshair}.lg span{display:inline-block;padding:2px 8px;margin-right:4px;color:#000;font-size:12px}
pre{white-space:pre-wrap;font-size:12px;color:#bbb}</style></head><body>
<div id="topo"></div><div class="lg" id="lg"></div><div id="info">passe o mouse no mapa</div><canvas id="c"></canvas><pre id="av"></pre>
<script>
const D = /*DATA*/;
const W = 960, R = D.R, N = D.N;
const cv = document.getElementById("c"); cv.width = W; cv.height = W;
const ctx = cv.getContext("2d");
function dec(s){ const t = atob(s), u = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) u[i] = t.charCodeAt(i); return u; }
const elev = new Uint16Array(dec(D.elev).buffer);
const mask = dec(D.mask);
const BASE = D.base;
const FAIXAS = [[0.5,[30,60,120],"< 0,5 m (chão)"],[3,[60,150,80],"0,5-3 m"],[6,[220,200,60],"3-6 m"],[10,[235,140,40],"6-10 m"],[15,[220,60,50],"10-15 m"],[1e9,[170,40,170],"> 15 m"]];
function cor(h){ for (const f of FAIXAS) if (h < f[0]) return f[1]; return FAIXAS[FAIXAS.length-1][1]; }
const off = document.createElement("canvas"); off.width = N; off.height = N;
const octx = off.getContext("2d"); const img = octx.createImageData(N, N);
for (let i = 0; i < N*N; i++) {
  const e = elev[i]; let c = e ? cor(e/10 - BASE) : [60,60,60];
  if (mask[i]) c = [Math.min(255,c[0]+80), Math.min(255,c[1]+80), Math.min(255,c[2]+80)];
  img.data[4*i] = c[0]; img.data[4*i+1] = c[1]; img.data[4*i+2] = c[2]; img.data[4*i+3] = 255;
}
octx.putImageData(img, 0, 0);
ctx.imageSmoothingEnabled = false; ctx.drawImage(off, 0, 0, W, W);
const px = (x) => (x + R) / (2*R) * W, py = (y) => (R - y) / (2*R) * W;
ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = "11px monospace"; ctx.lineWidth = 1;
for (let m = -R + 10; m < R; m += 10) {
  ctx.beginPath(); ctx.moveTo(px(m), 0); ctx.lineTo(px(m), W); ctx.moveTo(0, py(m)); ctx.lineTo(W, py(m)); ctx.stroke();
  ctx.fillText(m + "", px(m) + 2, W - 3); ctx.fillText(m + "", 2, py(m) - 2);
}
ctx.fillStyle = "#fff"; ctx.font = "bold 16px sans-serif"; ctx.fillText("N ↑", W - 40, 20);
const obs = D.observador;
D.rays.forEach((r) => {
  const rad = r.az * Math.PI / 180, L = r.dist != null ? r.dist + 0 : 12;
  ctx.strokeStyle = r.ang > 0 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)"; ctx.lineWidth = r.ang > 0 ? 2 : 1;
  ctx.beginPath(); ctx.moveTo(px(obs.x), py(obs.y)); ctx.lineTo(px(obs.x + Math.sin(rad)*L), py(obs.y + Math.cos(rad)*L)); ctx.stroke();
});
D.rays.filter((r) => r.ang > 0 && r.x != null).sort((a, b) => b.ang - a.ang).forEach((r, k) => {
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(px(r.x), py(r.y), 5, 0, 6.283); ctx.fill();
  ctx.strokeStyle = "#000"; ctx.lineWidth = 1; ctx.stroke();
  if (k < 10) { ctx.fillStyle = "#fff"; ctx.font = "bold 12px sans-serif"; ctx.fillText(r.az + "°: " + r.ang + "° @" + r.dist + "m (" + r.cota + ")", px(r.x) + 7, py(r.y) - 5); }
});
if (D.poligono) { ctx.strokeStyle = "#ffee00"; ctx.lineWidth = 3; ctx.beginPath(); D.poligono.forEach((q, i) => { if (i) ctx.lineTo(px(q[0]), py(q[1])); else ctx.moveTo(px(q[0]), py(q[1])); }); ctx.closePath(); ctx.stroke(); }
ctx.lineWidth = 2; ctx.strokeStyle = "#ff2020"; ctx.beginPath(); ctx.moveTo(px(-5), py(0)); ctx.lineTo(px(5), py(0)); ctx.moveTo(px(0), py(-5)); ctx.lineTo(px(0), py(5)); ctx.stroke();
ctx.fillStyle = "#ff2020"; ctx.font = "bold 13px sans-serif"; ctx.fillText("PINO", px(0) + 8, py(0) - 8);
ctx.strokeStyle = "#00e5ff"; ctx.beginPath(); ctx.arc(px(D.origem.x), py(D.origem.y), 7, 0, 6.283); ctx.stroke();
ctx.fillStyle = "#7CFC00"; ctx.beginPath(); ctx.moveTo(px(obs.x), py(obs.y) - 9); ctx.lineTo(px(obs.x) - 8, py(obs.y) + 7); ctx.lineTo(px(obs.x) + 8, py(obs.y) + 7); ctx.closePath(); ctx.fill();
document.getElementById("topo").innerHTML = "<b>" + D.titulo + "</b><br>modo: " + D.modo + " | azimute usado: " + D.azUsado + " | base (solo): " + D.base + " m | olho: " + (D.olho != null ? D.olho + " m" : "variável por raio") + " | imagem: " + D.imagem + " | célula: " + D.passo + " m<br>imóvel: " + JSON.stringify(D.ident) + "<br>vermelho = pino · amarelo = poligonoPredio · círculo ciano = telhado de partida · triângulo verde = observador (janela) · tons mais claros = telhado (máscara) · cores = altura acima da base";
document.getElementById("lg").innerHTML = FAIXAS.map((f) => '<span style="background:rgb(' + f[1].join(",") + ')">' + f[2] + "</span>").join("");
document.getElementById("av").textContent = D.avisos.join("\\n");
const info = document.getElementById("info");
cv.addEventListener("mousemove", (ev) => {
  const b = cv.getBoundingClientRect(), sx = (ev.clientX - b.left) / b.width, sy = (ev.clientY - b.top) / b.height;
  const col = Math.floor(sx * N), row = Math.floor(sy * N);
  if (col < 0 || col >= N || row < 0 || row >= N) return;
  const i = row * N + col, e = elev[i] / 10;
  info.textContent = "x=" + ((sx*2-1)*R).toFixed(1) + " m, y=" + ((1-sy*2)*R).toFixed(1) + " m | cota " + (e ? e.toFixed(1) : "sem dado") + " m | acima da base " + (e ? (e - BASE).toFixed(1) : "-") + " m | " + (mask[i] ? "TELHADO" : "não-telhado") + (D.olho != null && e ? " | vs olho " + (e - D.olho).toFixed(1) + " m" : "");
});
</script></body></html>`;

function paginaDebugMapa(dados, { lat, lng, alturaJanela = 1.5, azimute, poligonoPredio }) {
  const { amostrar } = dados;
  const R = 60, STEP = 0.25, N = Math.round((2 * R) / STEP);
  const elev = new Uint16Array(N * N), mask = new Uint8Array(N * N), livres = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const p = amostrar(-R + (c + 0.5) * STEP, R - (r + 0.5) * STEP);
      if (!p) continue;
      elev[r * N + c] = Math.round(p.elev * 10);
      mask[r * N + c] = p.tel ? 1 : 0;
      if (!p.tel && r % 4 === 0 && c % 4 === 0) livres.push(p.elev);
    }
  }
  const predio = resolverPredio({ lat, lng, poligonoPredio });
  if (predio.erro) return `<!doctype html><meta charset="utf-8"><body style="font-family:sans-serif"><h3>${predio.erro.codigoErro}</h3><p>${predio.erro.erro}</p>`;
  const h = calcularHorizonte(amostrar, {
    poligono: predio.poligono, alturaJanela, azimuteFachada: azimute,
    azimutes: Array.from({ length: 24 }, (_, i) => i * 15), debug: true,
  });
  if (!h.ok) return `<!doctype html><meta charset="utf-8"><body style="font-family:sans-serif"><h3>${h.codigo ?? "Sem resultado"}</h3><p>${h.erro}</p>`;

  livres.sort((a, b) => a - b);
  const baseGrade = livres.length ? livres[Math.floor((livres.length - 1) * 0.2)] : 0;
  const base = h.meta.cotaBaseMetros ?? Math.round(baseGrade * 10) / 10;
  const dado = {
    R, N, passo: STEP,
    elev: Buffer.from(elev.buffer).toString("base64"),
    mask: Buffer.from(mask.buffer).toString("base64"),
    base, olho: h.meta.cotaOlhoMetros ?? null,
    modo: h.meta.modo, azUsado: h.meta.azimuteFachadaUsado ?? "—",
    imagem: dados.imageryDate?.year ?? "?", titulo: `Pino ${lat}, ${lng} · janela ${alturaJanela} m`,
    observador: h.observador, origem: h.origem, avisos: h.avisos, poligono: h.poligonoXY ?? null, ident: h.meta.identificacaoPredio,
    rays: h.perfil.map((p) => ({
      az: p.azimute, ang: p.anguloObstrucaoGraus, dist: p.distanciaObstaculoMetros, cota: p.alturaObstaculoMetros,
      x: p.debug?.x, y: p.debug?.y,
    })),
  };
  return PAGINA_DEBUG.replace("/*DATA*/", () => JSON.stringify(dado).replace(/</g, "\\u003c"));
}

// ===========================================================================
// SERVIDOR
// ===========================================================================
// ---------------------------------------------------------------------------
// 1. URLs do DSM e da Mask
//    IMAGERY_LAYERS já inclui dsmUrl e maskUrl (sem as camadas de fluxo solar).
// ---------------------------------------------------------------------------
async function buscarUrls(lat, lng, radiusMeters, pixelSizeMeters) {
  const url = new URL("https://solar.googleapis.com/v1/dataLayers:get");
  url.searchParams.set("location.latitude", lat);
  url.searchParams.set("location.longitude", lng);
  url.searchParams.set("radiusMeters", radiusMeters);
  url.searchParams.set("view", "IMAGERY_LAYERS");
  url.searchParams.set("pixelSizeMeters", pixelSizeMeters); // 0.1 | 0.25 | 0.5 | 1.0
  url.searchParams.set("key", API_KEY);

  const resp = await fetch(url, { signal: AbortSignal.timeout(30000) });
  const dados = await resp.json();
  if (!resp.ok) {
  const e = new Error(`Solar API dataLayers falhou: ${dados?.error?.message || resp.status}`);
  if (resp.status === 404) e.codigoErro = "SEM_DSM";
  throw e;
}
  if (!dados.dsmUrl || !dados.maskUrl) throw new Error("Resposta da Solar API sem dsmUrl/maskUrl.");
  return dados;
}

async function lerTiff(url) {
  const resp = await fetch(`${url}&key=${API_KEY}`, { signal: AbortSignal.timeout(60000) });
  if (!resp.ok) throw new Error(`Download do GeoTIFF falhou (HTTP ${resp.status}).`);
  const tiff = await GeoTIFF.fromArrayBuffer(await resp.arrayBuffer());
  const image = await tiff.getImage();
  const raster = (await image.readRasters())[0];
  return { image, raster };
}

// ---------------------------------------------------------------------------
// 2. Projeção lat/lng -> CRS do TIFF (a Solar API entrega em UTM, em metros)
// ---------------------------------------------------------------------------
function projetarParaCrsDoTiff(image, lat, lng, bbox) {
  const epsg = image.getGeoKeys()?.ProjectedCSTypeGeoKey;
  let def = null;
  if (epsg >= 32601 && epsg <= 32660) def = `+proj=utm +zone=${epsg - 32600} +datum=WGS84 +units=m +no_defs`;
  if (epsg >= 32701 && epsg <= 32760) def = `+proj=utm +zone=${epsg - 32700} +south +datum=WGS84 +units=m +no_defs`;

  if (!def) {
    const [minX, minY, maxX, maxY] = bbox;
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, aproximado: true, epsg };
  }
  const [x, y] = proj4("EPSG:4326", def, [lng, lat]);
  return { x, y, aproximado: false, epsg };
}

// ---------------------------------------------------------------------------
// 3. Carrega DSM + Mask e devolve amostrar(x, y) em metros relativos ao pino
// ---------------------------------------------------------------------------
async function carregarAmostrador(dsmUrl, maskUrl, lat, lng) {
  const [dsm, mask] = await Promise.all([lerTiff(dsmUrl), lerTiff(maskUrl)]);

  const W = dsm.image.getWidth(), H = dsm.image.getHeight();
  if (W !== mask.image.getWidth() || H !== mask.image.getHeight()) {
    throw new Error("DSM e Mask com dimensões diferentes; não dá para cruzar pixel a pixel.");
  }
  const bbox = dsm.image.getBoundingBox();
  const bboxMask = mask.image.getBoundingBox();
  if (bbox.some((v, i) => Math.abs(v - bboxMask[i]) > 1e-3)) {
    throw new Error("DSM e Mask com bounding boxes diferentes.");
  }

  const [minX, , , maxY] = bbox;
  const resX = (bbox[2] - bbox[0]) / W;
  const resY = (bbox[3] - bbox[1]) / H;
  const pino = projetarParaCrsDoTiff(dsm.image, lat, lng, bbox);

  const amostrar = (xm, ym) => {
    const col = Math.floor((pino.x + xm - minX) / resX);
    const row = Math.floor((maxY - (pino.y + ym)) / resY);
    if (col < 0 || col >= W || row < 0 || row >= H) return null;
    const i = row * W + col;
    const elev = dsm.raster[i];
    if (!(elev > -1000)) return null; // nodata (-9999) ou NaN
    return { elev, tel: mask.raster[i] > 0 ? 1 : 0 };
  };

  return { amostrar, pinoAproximado: pino.aproximado, resolucaoMetros: resX };
}

// ---------------------------------------------------------------------------
// 4. Cache simples (evita baixar 2 TIFFs a cada chamada do n8n para o mesmo ponto)
//    As URLs da Google expiram, então o TTL é curto.
// ---------------------------------------------------------------------------
const CACHE = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_MAX = 5;

async function obterDados(lat, lng, radiusMeters, pixelSizeMeters) {
  const chave = `${lat.toFixed(5)},${lng.toFixed(5)},${radiusMeters},${pixelSizeMeters}`;
  const hit = CACHE.get(chave);
  if (hit && hit.expira > Date.now()) return hit.dados;

  const urls = await buscarUrls(lat, lng, radiusMeters, pixelSizeMeters);
  const base = await carregarAmostrador(urls.dsmUrl, urls.maskUrl, lat, lng);
  const dados = { ...base, imageryDate: urls.imageryDate };

  if (CACHE.size >= CACHE_MAX) CACHE.delete(CACHE.keys().next().value);
  CACHE.set(chave, { expira: Date.now() + CACHE_TTL_MS, dados });
  return dados;
}

// ---------------------------------------------------------------------------
// 5. Endpoint para o n8n
//    Body: { lat, lng, alturaJanela?, azimuteFachada?, radiusMeters?, pixelSizeMeters? }
//    alturaJanela = altura do olho/janela ACIMA DO SOLO (metros). Padrão 1.5.
// ---------------------------------------------------------------------------
function validarPonto(body, res) {
  const { lat, lng, radiusMeters = 100, pixelSizeMeters = 0.25 } = body;
  if (typeof lat !== "number" || typeof lng !== "number") {
    res.status(400).json({ disponivel: false, erro: "lat/lng obrigatórios (number)" });
    return null;
  }
  return { lat, lng, radiusMeters, pixelSizeMeters };
}

// Body: { lat, lng, alturaJanela?, azimuteFachada? | azimutesFachada?, snapFachada?, boundingBoxPredio?, radiusMeters?, pixelSizeMeters? }
//   boundingBoxPredio = o campo `boundingBox` ({sw,ne}) do buildings:findClosest: separa o prédio de vizinhos encostados.
//   alturaJanela = altura do olho/janela ACIMA DO SOLO (metros). Padrão 1.5.
//   azimutesFachada = [180, 0]  ou  [{ azimute: 180, alturaJanela: 4 }, { azimute: 0, alturaJanela: 1.5 }]
app.post("/horizonte", async (req, res) => {
  try {
    const ponto = validarPonto(req.body, res);
    if (!ponto) return;

    const { alturaJanela = 1.5, azimutesFachada } = req.body;
    if (typeof alturaJanela !== "number" || alturaJanela < 0) {
      return res.status(400).json({ disponivel: false, erro: "alturaJanela deve ser número >= 0 (metros acima do solo)" });
    }
    if (azimutesFachada !== undefined && (!Array.isArray(azimutesFachada) || azimutesFachada.length > 8)) {
      return res.status(400).json({ disponivel: false, erro: "azimutesFachada deve ser um array com até 8 itens" });
    }

    const dados = await obterDados(ponto.lat, ponto.lng, ponto.radiusMeters, ponto.pixelSizeMeters);
    const resposta = montarResposta(req.body, dados);
    if (req.body.debug) console.log("[horizonte debug]", JSON.stringify(resposta)); // cole esta linha para análise
    res.json(resposta);
  } catch (erro) {
  res.json({ disponivel: false, codigoErro: erro.codigoErro, erro: erro.message });
}
});

// Body: { lat, lng }  ->  as paredes do prédio para a pessoa escolher a(s) fachada(s)
app.post("/paredes", async (req, res) => {
  try {
    const ponto = validarPonto(req.body, res);
    if (!ponto) return;
    const dados = await obterDados(ponto.lat, ponto.lng, ponto.radiusMeters, ponto.pixelSizeMeters);
    res.json(montarParedes(dados, req.body));
  } catch (erro) {
  res.json({ disponivel: false, codigoErro: erro.codigoErro, erro: erro.message });
}
});

// Abra no navegador: /debug-mapa?lat=-30.0179&lng=-51.1748&alturaJanela=6&azimute=160   (azimute opcional)
app.get("/debug-mapa", async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat), lng = parseFloat(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).send("use /debug-mapa?lat=..&lng=..&alturaJanela=1.5&azimute=160");
    }
    const alturaJanela = req.query.alturaJanela !== undefined ? parseFloat(req.query.alturaJanela) : 1.5;
    const azimute = req.query.azimute !== undefined ? parseFloat(req.query.azimute) : undefined;
    const poligonoPredio = req.query.poligono; // JSON na URL (opcional)
    const pixel = req.query.pixel !== undefined ? parseFloat(req.query.pixel) : 0.25;
const dados = await obterDados(lat, lng, 100, pixel);
    res.type("html").send(paginaDebugMapa(dados, { lat, lng, alturaJanela, azimute, poligonoPredio }));
  } catch (erro) {
    res.status(500).send("Erro: " + erro.message);
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORTA, () => console.log(`Serviço de horizonte Vector-X rodando na porta ${PORTA}`));