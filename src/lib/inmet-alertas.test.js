import { describe, expect, test } from "bun:test";
import {
  listarMunicipiosRs,
  mesorregiaoDoMunicipio,
  parsearFeedInmet,
} from "./inmet-alertas.ts";
import {
  alertasElegiveisParaPublicacao,
  CANAIS_TELEGRAM_RS,
  enviarTelegram,
  publicarAlertasElegiveis,
} from "./alertas-rs-telegram.ts";

const agora = new Date("2026-11-21T15:00:00.000Z");

function item({
  id,
  evento = "Tempestade",
  severidade = "Perigo",
  inicio = "2026-11-21 11:00:00",
  fim = "2026-11-21 18:00:00",
  status = "Alert",
  area = "Aviso para as Áreas: Metropolitana de Porto Alegre",
  descricao = "Ventos intensos e possibilidade de granizo.",
}) {
  return `<item>
    <title>Aviso de ${evento}. Severidade Grau: ${severidade}</title>
    <link>https://apiprevmet3.inmet.gov.br/avisos/rss/${id}</link>
    <guid>${id}</guid>
    <description><![CDATA[<table>
      <tr><th>Status</th><td>${status}</td></tr>
      <tr><th>Evento</th><td>${evento}</td></tr>
      <tr><th>Severidade</th><td>${severidade}</td></tr>
      <tr><th>Início</th><td>${inicio}</td></tr>
      <tr><th>Fim</th><td>${fim}</td></tr>
      <tr><th>Descrição</th><td>${descricao}</td></tr>
      <tr><th>Área</th><td>${area}</td></tr>
      <tr><th>Link Gráfico</th><td><a href="https://avisos.inmet.gov.br/${id}">https://avisos.inmet.gov.br/${id}</a></td></tr>
    </table>]]></description>
  </item>`;
}

function alertaParaPublicacao(overrides = {}) {
  return {
    id: "inmet-1001",
    evento: "Tempestade",
    severidade: "Perigo",
    nivel: 2,
    inicio: "2026-11-22T14:00:00.000Z",
    fim: "2026-11-22T18:00:00.000Z",
    descricao: "Chuva intensa.",
    areas: ["Metropolitana de Porto Alegre", "Sudoeste Rio-grandense"],
    link: "https://avisos.inmet.gov.br/1001",
    payload_bruto: { titulo: "", link: "", guid: "", descricao: "", status: "Alert" },
    ...overrides,
  };
}

describe("parser do feed do Inmet", () => {
  test("extrai severidade, vigência, descrição, áreas e link gráfico", () => {
    const xml = `<rss><channel>${item({
      id: "aviso-1",
      severidade: "Grande Perigo",
      area: "Aviso para as Áreas: Metropolitana de Porto Alegre, Sudoeste Rio-grandense",
    })}</channel></rss>`;

    const [alerta] = parsearFeedInmet(xml, agora);

    expect(alerta).toMatchObject({
      id: "aviso-1",
      evento: "Tempestade",
      severidade: "Grande Perigo",
      nivel: 3,
      inicio: "2026-11-21T14:00:00.000Z",
      fim: "2026-11-21T21:00:00.000Z",
      descricao: "Ventos intensos e possibilidade de granizo.",
      areas: ["Metropolitana de Porto Alegre", "Sudoeste Rio-grandense"],
      link: "https://avisos.inmet.gov.br/aviso-1",
    });
  });

  describe("publicação dos alertas regionais no Telegram", () => {
    test("seleciona níveis 2 e 3 até 24 horas antes e direciona uma vez por região", () => {
      const alertas = [
        alertaParaPublicacao(),
        alertaParaPublicacao({
          id: "limite-24h",
          inicio: "2026-11-22T15:00:00.000Z",
        }),
        alertaParaPublicacao({ id: "amarelo", nivel: 1 }),
        alertaParaPublicacao({
          id: "fora-do-limite",
          inicio: "2026-11-22T15:00:01.000Z",
        }),
        alertaParaPublicacao({
          id: "fora-do-rs",
          areas: ["Oeste Catarinense"],
        }),
      ];

      const elegiveis = alertasElegiveisParaPublicacao(alertas, agora);

      expect(elegiveis.map(({ alerta, regiao, canal }) => [alerta.id, regiao, canal])).toEqual([
        [
          "inmet-1001",
          "Metropolitana de Porto Alegre",
          "@alertasrs_metropoa",
        ],
        ["inmet-1001", "Sudoeste Rio-grandense", "@alertasrs_sudoeste"],
        ["limite-24h", "Metropolitana de Porto Alegre", "@alertasrs_metropoa"],
        ["limite-24h", "Sudoeste Rio-grandense", "@alertasrs_sudoeste"],
      ]);
      expect(CANAIS_TELEGRAM_RS["Noroeste Rio-grandense"]).toBe(
        "https://t.me/alertas_rs_noroeste",
      );
      expect(CANAIS_TELEGRAM_RS["Sudeste Rio-grandense"]).toBe(
        "https://t.me/alertasrs_sudeste",
      );
      expect(CANAIS_TELEGRAM_RS).toEqual({
        "Noroeste Rio-grandense": "https://t.me/alertas_rs_noroeste",
        "Nordeste Rio-grandense": "https://t.me/alertasrs_nordeste",
        "Centro Ocidental Rio-grandense": "https://t.me/alertasrs_centroocidental",
        "Centro Oriental Rio-grandense": "https://t.me/alertasrs_centrooriental",
        "Metropolitana de Porto Alegre": "https://t.me/alertasrs_metropoa",
        "Sudoeste Rio-grandense": "https://t.me/alertasrs_sudoeste",
        "Sudeste Rio-grandense": "https://t.me/alertasrs_sudeste",
      });
    });

    test("considera o envio concluído somente quando a API do Telegram confirma sucesso", async () => {
      let payload;
      await enviarTelegram("bot-token-de-teste", "@canal-teste", "aviso", async (url, init) => {
        expect(url).toBe("https://api.telegram.org/botbot-token-de-teste/sendMessage");
        payload = JSON.parse(init.body);
        return Response.json({ ok: true, result: { message_id: 1 } });
      });
      expect(payload).toMatchObject({
        chat_id: "@canal-teste",
        text: "aviso",
        parse_mode: "HTML",
      });

      await expect(
        enviarTelegram("bot-token-de-teste", "@canal-teste", "aviso", async () =>
          Response.json({ ok: false, description: "chat not found" }, { status: 400 }),
        ),
      ).rejects.toThrow("HTTP 400");
    });

    test("marca o par alerta-região somente após o envio bem-sucedido", async () => {
      const publicadas = new Set();
      const reservas = new Set();
      const armazenamento = {
        async reservar(alertaId, regiao) {
          const chave = `${alertaId}@${regiao}`;
          if (publicadas.has(chave) || reservas.has(chave)) return false;
          reservas.add(chave);
          return true;
        },
        async marcarPublicado(alertaId, regiao) {
          const chave = `${alertaId}@${regiao}`;
          reservas.delete(chave);
          publicadas.add(chave);
        },
        async liberarReserva(alertaId, regiao) {
          reservas.delete(`${alertaId}@${regiao}`);
        },
      };
      const enviar = async () => {};
      const primeira = await publicarAlertasElegiveis(
        [alertaParaPublicacao()],
        agora,
        armazenamento,
        enviar,
      );
      const segunda = await publicarAlertasElegiveis(
        [alertaParaPublicacao()],
        agora,
        armazenamento,
        enviar,
      );

      expect(primeira).toEqual({ publicados: 2, falhas: 0 });
      expect(segunda).toEqual({ publicados: 0, falhas: 0 });
      expect(publicadas.size).toBe(2);
    });

    test("libera a reserva e não marca como publicado quando Telegram falha", async () => {
      const publicadas = new Set();
      let liberadas = 0;
      const armazenamento = {
        async reservar() {
          return true;
        },
        async marcarPublicado(alertaId, regiao) {
          publicadas.add(`${alertaId}@${regiao}`);
        },
        async liberarReserva() {
          liberadas += 1;
        },
      };
      const logOriginal = console.error;
      console.error = () => {};
      try {
        const resultado = await publicarAlertasElegiveis(
          [alertaParaPublicacao()],
          agora,
          armazenamento,
          async () => {
            throw new Error("Telegram indisponível");
          },
        );

        expect(resultado).toEqual({ publicados: 0, falhas: 2 });
        expect(liberadas).toBe(2);
        expect(publicadas.size).toBe(0);
      } finally {
        console.error = logOriginal;
      }
    });
  });

  test("mantém somente alertas ativos, não cancelados e de regiões do RS", () => {
    const xml = `<rss><channel>
      ${item({ id: "ativo" })}
      ${item({ id: "cancelado", status: "Cancelado" })}
      ${item({ id: "expirado", fim: "2026-11-21 10:00:00" })}
      ${item({ id: "fora-do-rs", area: "Aviso para as Áreas: Oeste Catarinense" })}
      ${item({
        id: "acentos",
        area: "AVISO PARA A ÁREA: Metropolitana de Porto Alegre",
      })}
    </channel></rss>`;

    expect(parsearFeedInmet(xml, agora).map((alerta) => alerta.id)).toEqual([
      "ativo",
      "acentos",
    ]);
  });

  test("usa severidade e evento do título quando os campos da tabela faltam", () => {
    const xml = `<rss><channel><item>
      <title>Aviso de Vendaval. Severidade Grau: Perigo Potencial</title>
      <link>https://apiprevmet3.inmet.gov.br/avisos/rss/aviso-3</link>
      <guid>aviso-3</guid>
      <description><![CDATA[<table>
        <tr><th>Status</th><td>Alert</td></tr>
        <tr><th>Área</th><td>Aviso para as Áreas: Nordeste Rio-grandense</td></tr>
      </table>]]></description>
    </item></channel></rss>`;

    expect(parsearFeedInmet(xml, agora)[0]).toMatchObject({
      evento: "Vendaval",
      severidade: "Perigo Potencial",
      nivel: 1,
      inicio: null,
      fim: null,
    });
  });

  test("rejeita uma resposta que não seja RSS", () => {
    expect(() => parsearFeedInmet("<html>indisponível</html>", agora)).toThrow(
      "feed RSS válido",
    );
    expect(() => parsearFeedInmet("<rss><channel><item></channel></rss>", agora)).toThrow(
      "item incompleto",
    );
  });

  test("resolve municípios sem diferenciar caixa e acentos", () => {
    expect(mesorregiaoDoMunicipio("SAO BORJA")).toBe("Sudoeste Rio-grandense");
    expect(mesorregiaoDoMunicipio("Porto Alegre")).toBe("Metropolitana de Porto Alegre");
    expect(mesorregiaoDoMunicipio("Município inexistente")).toBeNull();
    expect(listarMunicipiosRs()).toHaveLength(497);
  });
});
