#!/usr/bin/env python3
"""
Prototipo de alerta meteorologico para o RS (v0.3).
Camada 1: Monitoramento 24/7 do feed do INMET com fuso UTC-3, protecao no loop,
envio via Telegram e suporte opcional a alerta prioritario via ntfy.
"""
import argparse
import json
import os
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path

FEED_URL = "https://apiprevmet3.inmet.gov.br/avisos/rss"
IBGE_URL = "https://servicodados.ibge.gov.br/api/v1/localidades/estados/43/municipios"
BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "config.json"
STATE_PATH = BASE_DIR / "state.json"
MAPA_PATH = BASE_DIR / "municipios_rs.json"

BRT = timezone(timedelta(hours=-3))

NIVEIS = {"perigo potencial": 1, "perigo": 2, "grande perigo": 3}
COR = {1: "AMARELO", 2: "LARANJA", 3: "VERMELHO"}
MARCA = {1: "[!]", 2: "[!!]", 3: "[!!!]"}

MESOS_RS = [
    "Noroeste Rio-grandense", "Nordeste Rio-grandense",
    "Centro Ocidental Rio-grandense", "Centro Oriental Rio-grandense",
    "Metropolitana de Porto Alegre", "Sudoeste Rio-grandense", "Sudeste Rio-grandense",
]

CONFIG_PADRAO = {
    "municipios": ["Porto Alegre", "Tupanciretã"],
    "areas_extra": [],
    "avisar_todo_rs": False,
    "severidade_minima": "perigo",
    "intervalo_segundos": 300,
    "antecedencia_max_horas": 24,
    "publicar_canais": True,
    "canais": {},
}

ORIENTACAO = (
    "Procure abrigo em construcao solida, longe de janelas e vidros. "
    "Evite arvores, postes e areas alagaveis. "
    "Nao deixe animais acorrentados ou presos ao ar livre: solte-os e abrigue-os. "
    "Emergencia: Defesa Civil 199, Bombeiros 193."
)


def norm(texto):
    texto = unicodedata.normalize("NFKD", texto or "")
    texto = "".join(c for c in texto if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", texto).strip().lower()


def chave_area(nome):
    return norm(nome).replace("-", " ")


class _Tabela(HTMLParser):
    def __init__(self):
        super().__init__()
        self.campos = {}
        self._modo = None
        self._rotulo = None

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self._rotulo = None
        elif tag == "th":
            self._modo, self._rotulo = "th", ""
        elif tag == "td":
            self._modo = "td"

    def handle_endtag(self, tag):
        if tag in ("th", "td"):
            self._modo = None

    def handle_data(self, data):
        if self._modo == "th":
            self._rotulo += data
        elif self._modo == "td" and self._rotulo:
            chave = norm(self._rotulo)
            self.campos[chave] = (self.campos.get(chave, "") + data).strip()


def campos_da_tabela(conteudo):
    p = _Tabela()
    p.feed(conteudo or "")
    return p.campos


def parse_data(valor):
    if not valor:
        return None
    try:
        dt = datetime.strptime(valor.strip()[:19], "%Y-%m-%d %H:%M:%S")
        return dt.replace(tzinfo=BRT)
    except ValueError:
        return None


def http_get(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": "alerta-rs-prototipo/0.3"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def parse_item(titulo, link, guid, descricao_html):
    c = campos_da_tabela(descricao_html)

    severidade = c.get("severidade", "")
    if not severidade:
        m = re.search(r"(Grande Perigo|Perigo Potencial|Perigo)\s*$", titulo, re.I)
        severidade = m.group(1) if m else ""
    severidade = severidade.strip().title()

    evento = c.get("evento", "")
    if not evento:
        m = re.search(r"Aviso de (.+?)\.\s*Severidade", titulo)
        evento = m.group(1).strip() if m else titulo

    bruto_area = re.sub(r"^\s*Aviso para (?:as|a) [Áá]reas?:?\s*", "", c.get("area", ""), flags=re.I)
    areas = [a.strip() for a in bruto_area.split(",") if a.strip()]

    return {
        "id": guid or link or titulo,
        "titulo": titulo,
        "link": c.get("link grafico") or link,
        "status": c.get("status", ""),
        "evento": evento,
        "severidade": severidade,
        "nivel": NIVEIS.get(severidade.lower(), 0),
        "inicio": parse_data(c.get("inicio")),
        "fim": parse_data(c.get("fim")),
        "descricao": c.get("descricao", ""),
        "areas": areas,
    }


def parse_feed(xml_bytes):
    raiz = ET.fromstring(xml_bytes)
    itens = []
    for it in raiz.iter("item"):
        def campo(nome):
            el = it.find(nome)
            return (el.text or "").strip() if el is not None else ""
        itens.append(parse_item(campo("title"), campo("link"), campo("guid"), campo("description")))
    return itens


def carregar_mapa_municipios():
    if MAPA_PATH.exists():
        return json.loads(MAPA_PATH.read_text(encoding="utf-8"))
    dados = json.loads(http_get(IBGE_URL))
    mapa = {}
    for m in dados:
        try:
            meso = m["microrregiao"]["mesorregiao"]["nome"]
        except (KeyError, TypeError):
            continue
        mapa[norm(m["nome"])] = {"nome": m["nome"], "meso": meso}
    MAPA_PATH.write_text(json.dumps(mapa, ensure_ascii=False), encoding="utf-8")
    return mapa


def local_afetado(aviso, cfg, mapa):
    regioes_aviso = {chave_area(a) for a in aviso["areas"]}
    achados = []

    for mun in cfg["municipios"]:
        info = mapa.get(norm(mun))
        if info is None:
            print(f"  (municipio nao encontrado no IBGE: {mun})", file=sys.stderr)
            continue
        if chave_area(info["meso"]) in regioes_aviso:
            achados.append((info["nome"], info["meso"]))

    for area in cfg["areas_extra"]:
        if chave_area(area) in regioes_aviso:
            achados.append((area, area))

    if not achados and cfg["avisar_todo_rs"]:
        for area in MESOS_RS:
            if chave_area(area) in regioes_aviso:
                achados.append((area, area))
    return achados


def deve_avisar(aviso, cfg, agora):
    if "cancel" in aviso["status"].lower():
        return False
    if aviso["nivel"] < NIVEIS.get(cfg["severidade_minima"].lower(), 2):
        return False
    if aviso["fim"] and aviso["fim"] < agora:
        return False
    limite = agora + timedelta(hours=cfg["antecedencia_max_horas"])
    if aviso["inicio"] and aviso["inicio"] > limite:
        return False
    return True


def formatar(aviso, achados, agora):
    nivel = aviso["nivel"]
    fmt = "%d/%m %H:%M"
    ini = aviso["inicio"].strftime(fmt) if aviso["inicio"] else "?"
    fim = aviso["fim"].strftime(fmt) if aviso["fim"] else "?"
    previsto = aviso["inicio"] and aviso["inicio"] > agora
    linhas = [
        f"{MARCA.get(nivel, '[!]')} ALERTA {COR.get(nivel, '')} ({aviso['severidade']})"
        + ("  [PREVISTO]" if previsto else "  [EM VIGOR]"),
        aviso["evento"],
        f"Vigencia: {ini} ate {fim} (BRT)",
    ]
    for rotulo, regiao in achados:
        if rotulo == regiao:
            linhas.append(f"Regiao: {regiao}")
        else:
            linhas.append(f"Local: {rotulo} (regiao {regiao})")
    linhas.append("Obs: o Inmet emite o aviso para a regiao toda, nao para um ponto exato.")
    linhas += ["", aviso["descricao"][:400], "", ORIENTACAO]
    if aviso["link"]:
        linhas += ["", aviso["link"]]
    return "\n".join(linhas)


def enviar_telegram(mensagem, chat=None):
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat = chat or os.environ.get("TELEGRAM_CHAT_ID")
    if not token or not chat:
        return False
    dados = urllib.parse.urlencode({"chat_id": chat, "text": mensagem}).encode()
    req = urllib.request.Request(f"https://api.telegram.org/bot{token}/sendMessage", data=dados)
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.status == 200


def enviar_ntfy(titulo, mensagem, nivel=2):
    """Dispara notificacao prioritaria via ntfy.sh se NTFY_TOPIC estiver definido."""
    topico = os.environ.get("NTFY_TOPIC")
    if not topico:
        return False
    prioridade = "urgent" if nivel >= 3 else "high"
    req = urllib.request.Request(
        f"https://ntfy.sh/{urllib.parse.quote(topico)}",
        data=mensagem.encode("utf-8"),
        headers={
            "Title": titulo.encode("latin-1", "ignore").decode("latin-1"),
            "Priority": prioridade,
            "Tags": "rotating_light,warning" if nivel >= 3 else "warning",
        },
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.status == 200


def carregar_json(caminho, padrao):
    if caminho.exists():
        return json.loads(caminho.read_text(encoding="utf-8"))
    return padrao


def publicar_canais(aviso, cfg, vistos, agora, notificar):
    feitas = 0
    regioes = {chave_area(a) for a in aviso["areas"]}
    for regiao, canal in cfg["canais"].items():
        if chave_area(regiao) not in regioes:
            continue
        chave = f"{aviso['id']}@{chave_area(regiao)}"
        if chave in vistos:
            continue
        msg = formatar(aviso, [(regiao, regiao)], agora)
        print("=" * 60)
        print(f"CANAL {canal}")
        print(msg)
        if notificar:
            try:
                if enviar_telegram(msg, canal):
                    vistos.append(chave)
                else:
                    print("(token do Telegram nao configurado)")
            except Exception as e:
                print(f"(falha ao publicar em {canal}: {e})")
        feitas += 1
    return feitas


def processar(itens, cfg, mapa, vistos, agora, notificar=True):
    novos = 0
    for aviso in itens:
        if not deve_avisar(aviso, cfg, agora):
            continue
        if cfg["publicar_canais"]:
            novos += publicar_canais(aviso, cfg, vistos, agora, notificar)
        if aviso["id"] in vistos:
            continue
        achados = local_afetado(aviso, cfg, mapa)
        if not achados:
            continue
        msg = formatar(aviso, achados, agora)
        print("=" * 60)
        print(msg)
        if notificar:
            enviado_algum = False
            try:
                if enviar_telegram(msg):
                    print("(enviado ao Telegram)")
                    enviado_algum = True
                else:
                    print("(Telegram nao configurado)")
            except Exception as e:
                print(f"(falha no Telegram: {e})")

            try:
                titulo_ntfy = f"ALERTA {COR.get(aviso['nivel'], '')}: {aviso['evento']}"
                if enviar_ntfy(titulo_ntfy, msg, aviso["nivel"]):
                    print("(enviado ao ntfy)")
                    enviado_algum = True
            except Exception as e:
                print(f"(falha no ntfy: {e})")

            if enviado_algum:
                vistos.append(aviso["id"])
        novos += 1
    return novos


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dump", action="store_true", help="mostra o XML cru do primeiro aviso e sai")
    ap.add_argument("--loop", action="store_true", help="repete a consulta continuamente")
    ap.add_argument("--reset", action="store_true", help="esquece avisos ja notificados")
    ap.add_argument("--teste-canais", action="store_true", help="envia uma mensagem de teste a cada canal")
    args = ap.parse_args()

    cfg = {**CONFIG_PADRAO, **carregar_json(CONFIG_PATH, {})}

    if args.teste_canais:
        if not cfg["canais"]:
            print("Nenhum canal em config.json (campo 'canais').")
            return
        for regiao, canal in cfg["canais"].items():
            texto = (
                f"Teste do canal Alertas RS ({regiao}). Se voce leu esta mensagem, a publicacao "
                "automatica esta funcionando. Servico informativo, nao substitui a Defesa Civil."
            )
            try:
                ok = enviar_telegram(texto, canal)
                print(f"{canal}: {'ok' if ok else 'token nao configurado'}")
            except Exception as e:
                print(f"{canal}: FALHOU ({e})")
        return

    if args.reset and STATE_PATH.exists():
        STATE_PATH.unlink()
    vistos = carregar_json(STATE_PATH, [])

    mapa = {}
    if not args.dump:
        try:
            mapa = carregar_mapa_municipios()
        except Exception as e:
            print(f"Nao consegui obter a lista de municipios do IBGE: {e}", file=sys.stderr)
            print("Use 'areas_extra' no config.json para monitorar regioes pelo nome.", file=sys.stderr)

    while True:
        agora = datetime.now(BRT)
        try:
            xml = http_get(FEED_URL)
            if args.dump:
                primeiro = re.search(rb"<item.*?</item>", xml, re.S)
                print((primeiro.group(0) if primeiro else xml[:2000]).decode("utf-8", "replace"))
                return
            itens = parse_feed(xml)
        except Exception as e:
            print(f"[{agora:%H:%M:%S}] Erro ao baixar/ler o feed: {e}", file=sys.stderr)
            if not args.loop:
                sys.exit(1)
            time.sleep(cfg["intervalo_segundos"])
            continue

        print(f"[{agora:%H:%M:%S}] {len(itens)} avisos no feed")
        novos = processar(itens, cfg, mapa, vistos, agora, notificar=True)
        print(f"[{agora:%H:%M:%S}] {novos} aviso(s) relevante(s)")
        STATE_PATH.write_text(json.dumps(vistos[-500:]), encoding="utf-8")
        if not args.loop:
            return
        time.sleep(cfg["intervalo_segundos"])


if __name__ == "__main__":
    main()