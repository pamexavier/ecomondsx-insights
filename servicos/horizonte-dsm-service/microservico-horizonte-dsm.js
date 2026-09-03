// ============================================================================
// MICROSERVIÇO: calcula o horizonte de obstrução real (prédios vizinhos,
// relevo) a partir do DSM (Digital Surface Model) da Google Solar API.
//
// Por que isso é um serviço separado, e não um Code node do n8n:
// o n8n Code node roda em sandbox isolado, sem acesso a pacotes npm
// externos na maioria das instalações (inclusive n8n cloud). Decodificar
// um GeoTIFF requer uma lib real (aqui: `geotiff`), então esse processamento
// precisa rodar fora do n8n. O n8n só faz uma chamada HTTP simples pra cá.
//
// COMO RODAR:
//   npm install
//   crie um arquivo .env nesta pasta com: GOOGLE_SOLAR_API_KEY=sua_chave
//   node microservico-horizonte-dsm.js
//
// COMO O N8N CHAMA:
//   HTTP Request node, POST http://seu-servico:3000/horizonte
//   body: { lat, lng, alturaJanela, azimuteFachada }
//   resposta: { disponivel, perfil: [{azimute, anguloObstrucaoGraus, ...}] }
//
// Esse "perfil" (array de ângulos por direção) é o que o node 6 do workflow
// n8n já sabe consumir como `horizontePerfil` (ver seção correspondente do
// workflow) — ele escolhe o ângulo do azimute mais próximo do sol em cada
// horário, em vez de assumir um único obstáculo "de frente" só.
// ============================================================================

require("dotenv").config(); // carrega o .env automaticamente, se existir

const express = require("express");
const fetch = require("node-fetch"); // node-fetch@2 se o projeto usar CommonJS
const GeoTIFF = require("geotiff");

const app = express();
app.use(express.json());

const API_KEY = process.env.GOOGLE_SOLAR_API_KEY;
const PORTA = process.env.PORT || 3000;

if (!API_KEY) {
  console.error("ERRO: variável GOOGLE_SOLAR_API_KEY não encontrada.");
  console.error("Crie um arquivo .env nesta pasta com a linha:");
  console.error("  GOOGLE_SOLAR_API_KEY=sua_chave_aqui");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 1. Busca a URL do DSM na Solar API pro local pedido
// ---------------------------------------------------------------------------
async function buscarDsmUrl(lat, lng, radiusMeters = 100) {
  const url = new URL("https://solar.googleapis.com/v1/dataLayers:get");
  url.searchParams.set("location.latitude", lat);
  url.searchParams.set("location.longitude", lng);
  url.searchParams.set("radiusMeters", radiusMeters);
  url.searchParams.set("view", "IMAGERY_AND_ANNUAL_FLUX_LAYERS"); // inclui dsmUrl
  url.searchParams.set("key", API_KEY);

  const resp = await fetch(url.toString());
  const dados = await resp.json();
  if (!resp.ok) {
    throw new Error(`Solar API dataLayers falhou: ${dados?.error?.message || resp.status}`);
  }
  if (!dados.dsmUrl) {
    throw new Error("Resposta da Solar API não trouxe dsmUrl (sem cobertura pra esse endereço/raio).");
  }
  return { dsmUrl: dados.dsmUrl, imageryDate: dados.imageryDate };
}

// ---------------------------------------------------------------------------
// 2. Baixa e decodifica o GeoTIFF do DSM, devolvendo uma função
//    getElevacao(xMetros, yMetros) que consulta o pixel correspondente
// ---------------------------------------------------------------------------
async function carregarDsmComoFuncaoElevacao(dsmUrl) {
  const urlComChave = `${dsmUrl}&key=${API_KEY}`;
  const resp = await fetch(urlComChave);
  const buffer = await resp.arrayBuffer();

  const tiff = await GeoTIFF.fromArrayBuffer(buffer);
  const image = await tiff.getImage();
  const raster = (await image.readRasters())[0]; // banda única de elevação (m)

  const largura = image.getWidth();
  const altura = image.getHeight();
  const bbox = image.getBoundingBox(); // [oesteLng, sulLat, lesteLng, norteLat] em graus, ou já em metros dependendo da projeção — a Solar API retorna em CRS local métrico (verificar image.geoKeys)
  const [minX, minY, maxX, maxY] = bbox;
  const pixelSizeX = (maxX - minX) / largura;
  const pixelSizeY = (maxY - minY) / altura;

  // Assume que o centro do raster ~= ponto de origem solicitado (a Solar API
  // centraliza o raster na location pedida). x/y aqui já em metros (CRS local).
  const centroX = (minX + maxX) / 2;
  const centroY = (minY + maxY) / 2;

  return function getElevacao(xMetros, yMetros) {
    const xAbs = centroX + xMetros;
    const yAbs = centroY + yMetros; // atenção: eixo Y do raster geralmente decresce pra baixo
    const col = Math.round((xAbs - minX) / pixelSizeX);
    const row = Math.round((maxY - yAbs) / pixelSizeY);
    if (col < 0 || col >= largura || row < 0 || row >= altura) return null;
    const valor = raster[row * largura + col];
    // DSM da Solar API usa um valor sentinela pra "sem dado" — checar na doc
    // (costuma ser um número muito negativo tipo -9999); filtrar aqui:
    if (valor < -1000) return null;
    return valor;
  };
}

// ---------------------------------------------------------------------------
// 3. Ray-casting: mesmo algoritmo já testado isoladamente em horizon_core.js
// ---------------------------------------------------------------------------
function calcularHorizonte(getElevacao, alturaJanela, azimutes, distanciaMaxima = 80, passo = 1, distanciaMinima = 6) {
  // CORREÇÃO: sem um "distanciaMinima", o raio começa a varrer bem em cima
  // da origem — e como a origem normalmente É o próprio prédio (centro
  // geocodificado ou centroide do telhado vindo da Building Insights), os
  // primeiros metros do raio acabam batendo no TELHADO DO PRÓPRIO PRÉDIO,
  // não num vizinho. Isso gera ângulos de obstrução gigantes e falsos
  // (tipo 88°) que não são obstrução real nenhuma, é auto-detecção.
  // distanciaMinima=6m é uma estimativa grosseira do "raio" médio até a
  // borda do próprio prédio — ajustável, e o ideal (próxima melhoria) é
  // usar a camada de máscara (maskUrl) da Solar API pra excluir com
  // precisão os pixels que pertencem ao prédio da própria análise, em vez
  // de um raio fixo.
  const perfil = [];
  for (const az of azimutes) {
    const azRad = (az * Math.PI) / 180;
    const dx = Math.sin(azRad);
    const dy = Math.cos(azRad);

    let maiorAngulo = 0;
    let distanciaDoMaior = null;
    let alturaDoMaior = null;

    for (let d = Math.max(passo, distanciaMinima); d <= distanciaMaxima; d += passo) {
      const elevacaoTerreno = getElevacao(dx * d, dy * d);
      if (elevacaoTerreno === null || elevacaoTerreno === undefined) continue;
      const diferencaAltura = elevacaoTerreno - alturaJanela;
      if (diferencaAltura <= 0) continue;
      const anguloElevacao = (Math.atan(diferencaAltura / d) * 180) / Math.PI;
      if (anguloElevacao > maiorAngulo) {
        maiorAngulo = anguloElevacao;
        distanciaDoMaior = d;
        alturaDoMaior = elevacaoTerreno;
      }
    }

    perfil.push({
      azimute: az,
      anguloObstrucaoGraus: Math.round(maiorAngulo * 10) / 10,
      distanciaObstaculoMetros: distanciaDoMaior,
      alturaObstaculoMetros: alturaDoMaior !== null ? Math.round(alturaDoMaior * 10) / 10 : null,
    });
  }
  return perfil;
}

// ---------------------------------------------------------------------------
// 4. Endpoint HTTP que o n8n chama
// ---------------------------------------------------------------------------
app.post("/horizonte", async (req, res) => {
  try {
    const { lat, lng, alturaJanela = 0, azimuteFachada } = req.body;
    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ disponivel: false, erro: "lat/lng obrigatórios (number)" });
    }

    const { dsmUrl, imageryDate } = await buscarDsmUrl(lat, lng);
    const getElevacao = await carregarDsmComoFuncaoElevacao(dsmUrl);

    // Só varre o leque de ~180° na frente da fachada (economiza processamento);
    // se azimuteFachada não vier, varre tudo (360°, passo maior).
    const azimutes = [];
    if (typeof azimuteFachada === "number") {
      for (let a = -90; a <= 90; a += 10) azimutes.push(((azimuteFachada + a) % 360 + 360) % 360);
    } else {
      for (let a = 0; a < 360; a += 15) azimutes.push(a);
    }

    const perfil = calcularHorizonte(getElevacao, alturaJanela, azimutes);

    // Avisa quando a imagem usada é antiga o suficiente pra ter perdido
    // construções novas nas redondezas — não corrige o dado, só torna
    // visível a limitação, em vez de deixar passar batido.
    let avisoImageryAntiga = null;
    if (imageryDate) {
      const anoImagem = imageryDate.year;
      const anoAtual = new Date().getFullYear();
      if (anoImagem && anoAtual - anoImagem >= 5) {
        avisoImageryAntiga = `Imagem de satélite usada é de ${anoImagem} (${anoAtual - anoImagem} anos atrás) — construções mais novas nas redondezas podem não estar refletidas neste horizonte, o que tende a SUBESTIMAR obstrução real.`;
      }
    }

    res.json({
      disponivel: true,
      imageryDate,
      avisoImageryAntiga,
      alturaJanelaUsada: alturaJanela,
      perfil,
    });
  } catch (erro) {
    // Se der qualquer erro (sem cobertura, DSM indisponível, etc), devolve
    // disponivel:false — o node 6 do n8n já sabe cair pro fallback heurístico
    // nesse caso, então o fluxo principal não quebra.
    res.json({ disponivel: false, erro: erro.message });
  }
});

app.listen(PORTA, () => console.log(`Serviço de horizonte DSM rodando na porta ${PORTA}`));

module.exports = { calcularHorizonte, carregarDsmComoFuncaoElevacao, buscarDsmUrl };
