// ============================================================================
// TESTE EM LOTE — roda o microserviço de horizonte DSM contra uma lista de
// endereços/andares de uma vez, e imprime um resumo fácil de comparar.
//
// COMO USAR:
//   1. Preencha a lista CASOS_DE_TESTE abaixo com endereços reais de vocês
//      (ou lat/lng direto, se já tiverem geocodificado).
//   2. Suba o microserviço numa aba (npm start).
//   3. Rode: node test-lote.js
//      (ou: npm run test-lote)
//
// O que olhar nos resultados:
//   - "disponivel: false" → sem cobertura de DSM pra esse endereço/raio,
//     ou erro de chave — o sistema vai cair no fallback heurístico
//     automaticamente, então não quebra nada, mas vale investigar o motivo.
//   - Ângulos de obstrução muito diferentes entre andares do MESMO prédio
//     são esperados e bons sinais (telhado enxerga menos obstrução que
//     andares baixos).
//   - Ângulos de obstrução = 0° em todas as direções pra um endereço que
//     vocês SABEM que tem prédio vizinho colado → sinal de que o raio de
//     busca (radiusMeters) ou a resolução do DSM não está pegando o
//     obstáculo; considerar aumentar o raio no microserviço.
// ============================================================================

const fetch = require("node-fetch");

const URL_SERVICO = process.env.URL_SERVICO || "http://localhost:3000/horizonte";

// Preencha com casos reais de vocês. `alturaJanela` = pé-direito × andar
// (mesma lógica que já está no node 3 do n8n). `azimuteFachada`: Norte=0,
// Leste=90, Sul=180, Oeste=270 (uso os intermediários também: 45, 135, 225, 315).
const CASOS_DE_TESTE = [
  { nome: "Exemplo — térreo, fachada Oeste", lat: -29.886, lng: -50.269, alturaJanela: 0, azimuteFachada: 270 },
  { nome: "Exemplo — 4º andar, fachada Oeste (mesmo prédio)", lat: -29.886, lng: -50.269, alturaJanela: 12, azimuteFachada: 270 },
  { nome: "Exemplo — 1º andar, fachada Norte", lat: -29.886, lng: -50.269, alturaJanela: 3, azimuteFachada: 0 },
  // adicione quantos quiserem aqui...
];

async function testarCaso(caso) {
  try {
    const resp = await fetch(URL_SERVICO, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lat: caso.lat,
        lng: caso.lng,
        alturaJanela: caso.alturaJanela,
        azimuteFachada: caso.azimuteFachada,
      }),
    });
    const dados = await resp.json();
    return { caso, dados };
  } catch (erro) {
    return { caso, dados: { disponivel: false, erro: `Falha de conexão: ${erro.message}` } };
  }
}

async function main() {
  console.log(`Testando ${CASOS_DE_TESTE.length} caso(s) contra ${URL_SERVICO}...\n`);

  const resultados = [];
  for (const caso of CASOS_DE_TESTE) {
    process.stdout.write(`  → ${caso.nome}... `);
    const r = await testarCaso(caso);
    resultados.push(r);
    console.log(r.dados.disponivel ? "OK" : `SEM DADO (${r.dados.erro || "motivo desconhecido"})`);
  }

  console.log("\n" + "=".repeat(70));
  console.log("RESUMO");
  console.log("=".repeat(70));

  for (const { caso, dados } of resultados) {
    console.log(`\n${caso.nome}`);
    console.log(`  lat/lng: ${caso.lat}, ${caso.lng} | altura janela: ${caso.alturaJanela}m | azimute fachada: ${caso.azimuteFachada}°`);
    if (!dados.disponivel) {
      console.log(`  ❌ Sem dado: ${dados.erro}`);
      continue;
    }
    console.log(`  ✅ Imagem de: ${dados.imageryDate ? JSON.stringify(dados.imageryDate) : "n/d"}`);
    console.log(`  Perfil de obstrução (azimute → ângulo):`);
    for (const p of dados.perfil) {
      const barra = "█".repeat(Math.round(p.anguloObstrucaoGraus / 2));
      console.log(`    ${String(p.azimute).padStart(3)}°  ${String(p.anguloObstrucaoGraus).padStart(5)}°  ${barra}`);
    }
    const maxAngulo = Math.max(...dados.perfil.map(p => p.anguloObstrucaoGraus));
    console.log(`  Obstrução máxima detectada: ${maxAngulo}°`);
  }

  console.log("\n" + "=".repeat(70));
  const comDado = resultados.filter(r => r.dados.disponivel).length;
  console.log(`${comDado}/${resultados.length} casos com dado disponível.`);
}

main();
