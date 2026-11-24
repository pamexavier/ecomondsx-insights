import municipiosRsData from "@/data/municipios-rs.json";

export interface AlertaInmet {
  id: string;
  evento: string;
  severidade: string;
  nivel: number;
  inicio: string | null;
  fim: string | null;
  descricao: string;
  areas: string[];
  link: string | null;
  payload_bruto: {
    titulo: string;
    link: string;
    guid: string;
    descricao: string;
    status: string;
  };
  atualizado_em?: string;
}

interface MunicipioRs {
  nome: string;
  mesorregiao: string;
}

interface CamposAviso {
  titulo: string;
  link: string;
  guid: string;
  descricao: string;
}

const MUNICIPIOS_RS = municipiosRsData as MunicipioRs[];

const TODAS_MESORREGIOES_RS = [
  "Noroeste Rio-grandense",
  "Nordeste Rio-grandense",
  "Centro Ocidental Rio-grandense",
  "Centro Oriental Rio-grandense",
  "Metropolitana de Porto Alegre",
  "Sudoeste Rio-grandense",
  "Sudeste Rio-grandense",
];

const MESORREGIOES_RS = new Set([
  "noroeste rio grandense",
  "nordeste rio grandense",
  "centro ocidental rio grandense",
  "centro oriental rio grandense",
  "metropolitana de porto alegre",
  "sudoeste rio grandense",
  "sudeste rio grandense",
]);

const NIVEIS: Record<string, number> = {
  "perigo potencial": 1,
  perigo: 2,
  "grande perigo": 3,
};

export function chaveArea(texto: string): string {
  return texto
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function mesorregiaoDaArea(area: string): boolean {
  return MESORREGIOES_RS.has(chaveArea(area));
}

function decodificarEntidades(texto: string): string {
  const entidades: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
    aacute: "á",
    agrave: "à",
    acirc: "â",
    atilde: "ã",
    eacute: "é",
    ecirc: "ê",
    iacute: "í",
    oacute: "ó",
    ocirc: "ô",
    otilde: "õ",
    uacute: "ú",
    ccedil: "ç",
    Aacute: "Á",
    Acirc: "Â",
    Atilde: "Ã",
    Eacute: "É",
    Ecirc: "Ê",
    Iacute: "Í",
    Oacute: "Ó",
    Ocirc: "Ô",
    Otilde: "Õ",
    Uacute: "Ú",
    Ccedil: "Ç",
  };

  return texto.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entidade, codigo: string) => {
    if (codigo[0] === "#") {
      const hexadecimal = codigo[1]?.toLowerCase() === "x";
      const ponto = Number.parseInt(codigo.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      return Number.isFinite(ponto) ? String.fromCodePoint(ponto) : entidade;
    }

    return entidades[codigo] ?? entidades[codigo.toLowerCase()] ?? entidade;
  });
}

function textoHtml(html: string): string {
  return decodificarEntidades(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]*>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function campoXml(xml: string, nome: string): string {
  const elemento = new RegExp(`<${nome}\\b[^>]*>([\\s\\S]*?)<\\/${nome}\\s*>`, "i").exec(xml);
  if (!elemento) return "";

  const conteudo = elemento[1].trim();
  const cdata = /^<!\[CDATA\[([\s\S]*)\]\]>$/.exec(conteudo);
  return cdata ? cdata[1].trim() : decodificarEntidades(conteudo);
}

function parsearTabela(html: string): Record<string, string> {
  const campos: Record<string, string> = {};

  for (const linha of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi)) {
    const rotulo = /<th\b[^>]*>([\s\S]*?)<\/th\s*>/i.exec(linha[1]);
    const valor = /<td\b[^>]*>([\s\S]*?)<\/td\s*>/i.exec(linha[1]);
    if (!rotulo || !valor) continue;

    const chave = chaveArea(textoHtml(rotulo[1]));
    campos[chave] = `${campos[chave] ?? ""}${textoHtml(valor[1])}`.trim();
  }

  return campos;
}

function parsearData(valor: string): string | null {
  if (!valor) return null;

  const texto = valor.trim().slice(0, 19);
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(texto)) return null;

  const [data, horario] = texto.split(" ");
  const [ano, mes, dia] = data.split("-").map(Number);
  const [hora, minuto, segundo] = horario.split(":").map(Number);
  const dataLocal = new Date(Date.UTC(ano, mes - 1, dia, hora, minuto, segundo));
  if (
    dataLocal.getUTCFullYear() !== ano ||
    dataLocal.getUTCMonth() !== mes - 1 ||
    dataLocal.getUTCDate() !== dia ||
    dataLocal.getUTCHours() !== hora ||
    dataLocal.getUTCMinutes() !== minuto ||
    dataLocal.getUTCSeconds() !== segundo
  ) {
    return null;
  }

  return new Date(dataLocal.getTime() + 3 * 60 * 60 * 1000).toISOString();
}

function parsearItem(campos: CamposAviso): (AlertaInmet & { status: string }) | null {
  const tabela = parsearTabela(campos.descricao);
  const status = tabela.status ?? "";
  const titulo = textoHtml(campos.titulo);
  const severidadeRaw =
    tabela.severidade ??
    /(Grande Perigo|Perigo Potencial|Perigo)\s*$/i.exec(titulo)?.[1] ??
    "";
  const severidadeNormalizada = chaveArea(severidadeRaw);
  const severidade =
    Object.keys(NIVEIS).find((nome) => nome === severidadeNormalizada)
      ?.replace(/\b\w/g, (letra) => letra.toUpperCase()) ?? severidadeRaw.trim();
  const evento =
    tabela.evento ??
    /Aviso de (.+?)\.\s*Severidade/i.exec(titulo)?.[1]?.trim() ??
    titulo;
  const areaBruta = (tabela.area ?? "").replace(
    /^\s*aviso\s+para\s+(?:as|a)\s+[áa]reas?:?\s*/i,
    "",
  );
  const areas = areaBruta
    .split(",")
    .map((area) => area.trim())
    .filter(Boolean);
  const linkGrafico = tabela["link grafico"] || campos.link;
  const nivel = NIVEIS[severidadeNormalizada] ?? 0;

  return {
    id: campos.guid || campos.link || titulo,
    evento,
    severidade,
    nivel,
    inicio: parsearData(tabela.inicio ?? ""),
    fim: parsearData(tabela.fim ?? ""),
    descricao: tabela.descricao ?? "",
    areas,
    link: /^https?:\/\//i.test(linkGrafico) ? linkGrafico : campos.link || null,
    payload_bruto: {
      titulo,
      link: campos.link,
      guid: campos.guid,
      descricao: campos.descricao,
      status,
    },
    status,
  };
}

export function parsearFeedInmet(xml: string, agora = new Date()): AlertaInmet[] {
  if (!/<rss\b/i.test(xml) || !/<channel\b/i.test(xml)) {
    throw new Error("A resposta do Inmet não contém um feed RSS válido.");
  }

  const alertas: AlertaInmet[] = [];
  const totalItens = [...xml.matchAll(/<item\b/gi)].length;
  const itens = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item\s*>/gi)];
  if (itens.length !== totalItens) {
    throw new Error("O feed do Inmet contém um item incompleto.");
  }

  for (const item of itens) {
    const itemXml = item[1];
    const alerta = parsearItem({
      titulo: campoXml(itemXml, "title"),
      link: campoXml(itemXml, "link"),
      guid: campoXml(itemXml, "guid"),
      descricao: campoXml(itemXml, "description"),
    });

    if (!alerta || chaveArea(alerta.status).includes("cancel")) continue;
    if (alerta.fim && new Date(alerta.fim).getTime() < agora.getTime()) continue;
    if (!alerta.areas.some(mesorregiaoDaArea)) continue;

    const { status: _status, ...alertaValido } = alerta;
    alertas.push(alertaValido);
  }

  return alertas;
}

function detectarMunicipiosNoTexto(texto: string): MunicipioRs[] {
  const norm = ` ${chaveArea(texto).replace(/[^a-z0-9\s]/g, " ")} `;
  return MUNICIPIOS_RS.filter((m) => {
    const alvo = ` ${chaveArea(m.nome).replace(/[^a-z0-9\s]/g, " ")} `;
    return alvo.length > 4 && norm.includes(alvo);
  });
}

function classificarSeveridadeDefesaCivil(texto: string): { severidade: string; nivel: number } {
  const norm = chaveArea(texto);
  if (/\b(muito alto|extremo|severo|vermelho)\b/.test(norm)) {
    return { severidade: "Grande Perigo", nivel: 3 };
  }
  if (/\b(alto|laranja|chuva pontualmente forte|granizo|vendaval)\b/.test(norm)) {
    return { severidade: "Perigo", nivel: 2 };
  }
  return { severidade: "Perigo Potencial", nivel: 1 };
}

export function parsearAlertasDefesaCivilRs(html: string, agora = new Date()): AlertaInmet[] {
  const alertas: AlertaInmet[] = [];
  const base = "https://www.defesacivil.rs.gov.br";
  const fimPadrao = new Date(agora.getTime() + 12 * 60 * 60 * 1000).toISOString();

  const tituloDestaque = /<h1[^>]*class="[^"]*artigo__titulo[^"]*"[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1];
  const descDestaque = /<meta\s+name="description"\s+content="([^"]*)"/i.exec(html)?.[1];
  if (tituloDestaque) {
    const titulo = textoHtml(tituloDestaque);
    const descricao = textoHtml(descDestaque ?? titulo);
    const encontrados = detectarMunicipiosNoTexto(`${titulo} ${descricao}`);
    const areas = encontrados.length
      ? [...new Set(encontrados.map((m) => m.mesorregiao))]
      : TODAS_MESORREGIOES_RS;
    const { severidade, nivel } = classificarSeveridadeDefesaCivil(`${titulo} ${descricao}`);
    const idSlug = chaveArea(titulo).replace(/\s+/g, "-").slice(0, 70);

    alertas.push({
      id: `dcrs-destaque-${idSlug}`,
      evento: `[Defesa Civil RS] ${titulo}`,
      severidade,
      nivel,
      inicio: agora.toISOString(),
      fim: fimPadrao,
      descricao,
      areas,
      link: `${base}/alertas`,
      payload_bruto: {
        titulo,
        link: `${base}/alertas`,
        guid: `dcrs-destaque-${idSlug}`,
        descricao,
        status: "Ativo",
      },
    });
  }

  for (const bloco of html.matchAll(/<h3[^>]*class="[^"]*media-heading[^"]*"[^>]*>([\s\S]*?)<\/h3>/gi)) {
    const linkMatch = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i.exec(bloco[1]);
    if (!linkMatch) continue;

    const href = linkMatch[1].startsWith("http") ? linkMatch[1] : `${base}${linkMatch[1]}`;
    const titulo = textoHtml(linkMatch[2]);
    if (!titulo) continue;

    const encontrados = detectarMunicipiosNoTexto(titulo);
    const areas = encontrados.length
      ? [...new Set(encontrados.map((m) => m.mesorregiao))]
      : TODAS_MESORREGIOES_RS;
    const { severidade, nivel } = classificarSeveridadeDefesaCivil(titulo);
    const slug = linkMatch[1].replace(/^\/+/, "").slice(0, 90);

    alertas.push({
      id: `dcrs-${slug}`,
      evento: `[Defesa Civil RS] ${titulo}`,
      severidade,
      nivel,
      inicio: agora.toISOString(),
      fim: fimPadrao,
      descricao: `${titulo}. Fonte: Defesa Civil Estadual do RS. Emergência ligue 199 ou 193.`,
      areas,
      link: href,
      payload_bruto: {
        titulo,
        link: href,
        guid: `dcrs-${slug}`,
        descricao: titulo,
        status: "Ativo",
      },
    });
  }

  return alertas;
}

export function mesorregiaoDoMunicipio(nome: string): string | null {
  const procurado = chaveArea(nome);
  return MUNICIPIOS_RS.find((municipio) => chaveArea(municipio.nome) === procurado)
    ?.mesorregiao ?? null;
}

export function listarMunicipiosRs(): MunicipioRs[] {
  return MUNICIPIOS_RS;
}
