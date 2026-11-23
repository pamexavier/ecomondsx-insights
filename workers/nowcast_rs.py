#!/usr/bin/env python3
"""
nowcast_rs.py (v0.3) - Camada 2 do alerta meteorologico RS.

Monitora estacoes a OESTE/NOROESTE de cada cidade e dispara alertas separados
por cidade (ntfy + Telegram). Usa Open-Meteo por padrao e troca automaticamente
para estacoes fisicas do INMET se INMET_TOKEN estiver definido.
"""
import argparse
import json
import math
import os
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

import inmet_alertas as L1

BASE_DIR = Path(__file__).resolve().parent
CFG_PATH = BASE_DIR / "nowcast_config.json"
STATE_PATH = BASE_DIR / "nowcast_state.json"
ESTACOES_CACHE = BASE_DIR / "estacoes_rs.json"

API = "https://apitempo.inmet.gov.br"
UTC = timezone.utc
BRT = timezone(timedelta(hours=-3))

CFG_PADRAO = {
    "cidades": [
        {
            "nome": "Porto Alegre",
            "lat": -30.03,
            "lon": -51.23,
            "ntfy_topic": "",
            "telegram_canal": "",
        },
        {
            "nome": "Tupanciretã",
            "lat": -29.08,
            "lon": -53.84,
            "ntfy_topic": "",
            "telegram_canal": "",
        },
    ],
    "dist_min_km": 15,
    "dist_max_km": 150,
    "azimute_min": 225,   # SW
    "azimute_max": 345,   # NNW
    "max_estacoes_por_cidade": 6,
    "rajada_atencao_kmh": 70,
    "rajada_severa_kmh": 90,
    "queda_pressao_hpa": 3.0,
    "dados_max_idade_min": 150,
    "intervalo_segundos": 300,
    "cooldown_minutos": 90,
    "severidade_gate": "perigo",
}


def carregar_cfg():
    cfg = dict(CFG_PADRAO)
    if CFG_PATH.exists():
        cfg.update(json.loads(CFG_PATH.read_text(encoding="utf-8")))
    return cfg


def get_json(url, timeout=25):
    return json.loads(L1.http_get(url, timeout=timeout))


# ---------- geometria ----------
def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def azimute(lat1, lon1, lat2, lon2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dl = math.radians(lon2 - lon1)
    y = math.sin(dl) * math.cos(p2)
    x = math.cos(p1) * math.sin(p2) - math.sin(p1) * math.cos(p2) * math.cos(dl)
    return (math.degrees(math.atan2(y, x)) + 360) % 360


# ---------- estacoes ----------
def carregar_estacoes():
    if ESTACOES_CACHE.exists():
        return json.loads(ESTACOES_CACHE.read_text(encoding="utf-8"))
    dados = get_json(f"{API}/estacoes/T")
    est = []
    for e in dados:
        if e.get("SG_ESTADO") != "RS":
            continue
        try:
            est.append({
                "codigo": e["CD_ESTACAO"],
                "nome": e.get("DC_NOME", e["CD_ESTACAO"]),
                "lat": float(e["VL_LATITUDE"]),
                "lon": float(e["VL_LONGITUDE"]),
            })
        except (KeyError, TypeError, ValueError):
            continue
    ESTACOES_CACHE.write_text(json.dumps(est, ensure_ascii=False), encoding="utf-8")
    return est


def estacoes_a_montante(cidade, estacoes, cfg):
    achadas = []
    for e in estacoes:
        d = haversine_km(cidade["lat"], cidade["lon"], e["lat"], e["lon"])
        if not (cfg["dist_min_km"] <= d <= cfg["dist_max_km"]):
            continue
        az = azimute(cidade["lat"], cidade["lon"], e["lat"], e["lon"])
        if cfg["azimute_min"] <= az <= cfg["azimute_max"]:
            achadas.append({**e, "dist_km": round(d), "azim": round(az)})
    achadas.sort(key=lambda x: x["dist_km"])
    return achadas[: cfg["max_estacoes_por_cidade"]]


# ---------- leituras ----------
def _num(v):
    try:
        return float(str(v).replace(",", "."))
    except (TypeError, ValueError):
        return None


def leituras(est, agora_utc):
    token = os.environ.get("INMET_TOKEN")
    out = []

    if token:
        ini = (agora_utc - timedelta(days=1)).strftime("%Y-%m-%d")
        fim = agora_utc.strftime("%Y-%m-%d")
        dados = get_json(f"{API}/token/estacao/{ini}/{fim}/{est['codigo']}/{token}")
        for d in dados or []:
            try:
                dt = datetime.strptime(f"{d['DT_MEDICAO']} {str(d['HR_MEDICAO']).zfill(4)}", "%Y-%m-%d %H%M")
            except (KeyError, ValueError):
                continue
            out.append({
                "dt": dt.replace(tzinfo=UTC),
                "rajada_ms": _num(d.get("VEN_RAJ")),
                "pressao": _num(d.get("PRE_INS")),
                "chuva": _num(d.get("CHUVA")),
            })
    else:
        url = (
            "https://api.open-meteo.com/v1/forecast"
            f"?latitude={est['lat']}&longitude={est['lon']}"
            "&hourly=wind_gusts_10m,surface_pressure"
            "&wind_speed_unit=ms&past_hours=6&forecast_hours=1&timezone=GMT"
        )
        h = get_json(url).get("hourly", {})
        for t, raj, pres in zip(
            h.get("time", []),
            h.get("wind_gusts_10m", []),
            h.get("surface_pressure", []),
        ):
            dt = datetime.strptime(t, "%Y-%m-%dT%H:%M").replace(tzinfo=UTC)
            if dt <= agora_utc:
                out.append({
                    "dt": dt,
                    "rajada_ms": _num(raj),
                    "pressao": _num(pres),
                    "chuva": None,
                })

    out.sort(key=lambda x: x["dt"])
    return out


def avaliar(est, agora_utc, cfg):
    lt = leituras(est, agora_utc)
    lt = [r for r in lt if r["rajada_ms"] is not None or r["pressao"] is not None]
    if not lt:
        return None
    ult = lt[-1]
    idade = (agora_utc - ult["dt"]).total_seconds() / 60
    if idade > cfg["dados_max_idade_min"]:
        return None

    motivos, severo = [], False
    rajadas = [
        r["rajada_ms"] for r in lt
        if r["rajada_ms"] is not None
        and (agora_utc - r["dt"]).total_seconds() / 60 <= cfg["dados_max_idade_min"]
    ]
    if rajadas:
        kmh = max(rajadas) * 3.6
        if kmh >= cfg["rajada_atencao_kmh"]:
            motivos.append(f"rajada de {kmh:.0f} km/h")
            if kmh >= cfg["rajada_severa_kmh"]:
                severo = True

    lp = [
        r for r in lt
        if r["pressao"] is not None
        and (agora_utc - r["dt"]).total_seconds() / 60 <= cfg["dados_max_idade_min"] + 120
    ]
    if len(lp) >= 2:
        idade_lp = (agora_utc - lp[-1]["dt"]).total_seconds() / 60
        gap_h = (lp[-1]["dt"] - lp[-2]["dt"]).total_seconds() / 3600
        if idade_lp <= cfg["dados_max_idade_min"] and 0 < gap_h <= 2:
            queda = lp[-2]["pressao"] - lp[-1]["pressao"]
            if queda >= cfg["queda_pressao_hpa"]:
                motivos.append(f"queda de pressao de {queda:.1f} hPa em {gap_h:.0f}h")

    if not motivos:
        return None
    return {
        "motivos": motivos,
        "severo": severo,
        "idade_min": round(idade),
        "hora_brt": ult["dt"].astimezone(BRT).strftime("%H:%M"),
    }


# ---------- gate (Camada 1) ----------
def aviso_inmet_vigente(cidade, cfg, agora_brt, itens, mapa):
    cfg1 = {
        **L1.CONFIG_PADRAO,
        "municipios": [cidade["nome"]],
        "severidade_minima": cfg["severidade_gate"],
        "antecedencia_max_horas": 24,
    }
    for aviso in itens:
        ini = aviso["inicio"]
        if ini and ini.tzinfo is None:
            ini = ini.replace(tzinfo=BRT)
        if ini and ini > agora_brt:
            continue
        if L1.deve_avisar(aviso, cfg1, agora_brt if (ini and ini.tzinfo) else agora_brt.replace(tzinfo=None)) and L1.local_afetado(aviso, cfg1, mapa):
            return aviso
    return None


# ---------- notificacao ----------
def enviar_ntfy(titulo, msg, prioridade, tags, topico=None):
    topico = topico or os.environ.get("NTFY_TOPIC")
    if not topico:
        return False
    base_url = os.environ.get("NTFY_URL", "https://ntfy.sh").rstrip("/")
    headers = {
        "Title": titulo.encode("latin-1", "ignore").decode("latin-1"),
        "Priority": prioridade,
        "Tags": tags,
    }
    token = os.environ.get("NTFY_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(
        f"{base_url}/{urllib.parse.quote(topico)}",
        data=msg.encode("utf-8"),
        headers=headers,
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.status == 200


def montar(cidade, est, res, aviso, urgente):
    if urgente:
        cab = f"ABRIGUE-SE AGORA: tempestade severa se aproximando de {cidade['nome']}"
    else:
        cab = f"ATENCAO: ventos fortes detectados a oeste de {cidade['nome']}"
    linhas = [
        cab, "",
        f"Estacao {est['nome']} ({est['dist_km']} km a montante, leitura das {res['hora_brt']} BRT): "
        + "; ".join(res["motivos"]) + ".",
    ]
    if aviso:
        linhas.append(f"Aviso INMET em vigor: {aviso['evento']} ({aviso['severidade']}).")
    else:
        linhas.append("Ainda sem aviso INMET Laranja/Vermelho em vigor para a regiao.")
    linhas += [
        "",
        "Se estiver na rua, entre em construcao solida. Afaste-se de janelas, arvores e postes.",
        "ANIMAIS: se houver animais acorrentados ou presos ao ar livre, e não puder levar com você, solte-os e coloque-os em abrigo seguro.",
        "Defesa Civil 199 | Bombeiros 193",
        "Servico informativo e experimental: nao substitui a Defesa Civil (SMS 40199).",
    ]
    return "\n".join(linhas)


def checar(cfg, estado, simular=False):
    agora_utc = datetime.now(UTC)
    agora_brt = agora_utc.astimezone(BRT)
    estacoes = carregar_estacoes()

    itens, mapa = [], {}
    try:
        itens = L1.parse_feed(L1.http_get(L1.FEED_URL))
        mapa = L1.carregar_mapa_municipios()
    except Exception as e:
        print(f"[{agora_brt:%H:%M}] Aviso: Camada 1 indisponivel ({e}); seguindo so com sensores.", file=sys.stderr)

    disparos = 0
    cache = {}
    for cidade in cfg["cidades"]:
        for est in estacoes_a_montante(cidade, estacoes, cfg):
            if simular:
                res = {
                    "motivos": ["TESTE: rajada de 95 km/h"],
                    "severo": True,
                    "idade_min": 0,
                    "hora_brt": agora_brt.strftime("%H:%M"),
                }
            else:
                if est["codigo"] not in cache:
                    try:
                        cache[est["codigo"]] = avaliar(est, agora_utc, cfg)
                    except Exception as e:
                        print(f"  (falha na estacao {est['codigo']}: {e})", file=sys.stderr)
                        cache[est["codigo"]] = None
                res = cache[est["codigo"]]
            if not res:
                continue

            chave = f"{cidade['nome']}@{est['codigo']}"
            ultimo = estado.get(chave)
            if ultimo and not simular:
                if agora_utc - datetime.fromisoformat(ultimo) < timedelta(minutes=cfg["cooldown_minutos"]):
                    continue

            aviso = None if simular else aviso_inmet_vigente(cidade, cfg, agora_brt, itens, mapa)
            urgente = simular or bool(aviso) or res["severo"]
            msg = montar(cidade, est, res, aviso, urgente)
            if simular:
                msg = "[TESTE] " + msg

            print("=" * 60)
            print(f"CIDADE: {cidade['nome']}")
            print(msg)

            enviou_algum = False
            titulo = ("ALERTA URGENTE: " if urgente else "ATENCAO: ") + cidade["nome"]
            prioridade = "urgent" if urgente else "high"
            tags = "rotating_light,warning" if urgente else "warning"

            try:
                if enviar_ntfy(titulo, msg, prioridade, tags, topico=cidade.get("ntfy_topic")):
                    print(f"(enviado ao ntfy: {cidade.get('ntfy_topic') or 'NTFY_TOPIC'})")
                    enviou_algum = True
            except Exception as e:
                print(f"(falha no ntfy: {e})", file=sys.stderr)

            canal_tg = cidade.get("telegram_canal")
            if canal_tg and not simular:
                try:
                    if L1.enviar_telegram(msg, canal_tg):
                        print(f"(enviado ao Telegram: {canal_tg})")
                        enviou_algum = True
                except Exception as e:
                    print(f"(falha no Telegram {canal_tg}: {e})", file=sys.stderr)

            if enviou_algum:
                if not simular:
                    estado[chave] = agora_utc.isoformat()
                disparos += 1
            if simular:
                return disparos
    return disparos


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--listar-estacoes", action="store_true")
    ap.add_argument("--montante", action="store_true")
    ap.add_argument("--uma-vez", action="store_true")
    ap.add_argument("--loop", action="store_true")
    ap.add_argument("--simular", action="store_true")
    a = ap.parse_args()
    cfg = carregar_cfg()

    if a.listar_estacoes:
        for e in carregar_estacoes():
            print(f"{e['codigo']}  {e['nome']:<30} {e['lat']:.3f} {e['lon']:.3f}")
        return
    if a.montante:
        est = carregar_estacoes()
        for c in cfg["cidades"]:
            print(f"\n{c['nome']} (ntfy: {c.get('ntfy_topic') or 'global'} | tg: {c.get('telegram_canal') or '-'}):")
            for e in estacoes_a_montante(c, est, cfg):
                print(f"  {e['codigo']}  {e['nome']:<28} {e['dist_km']} km, azimute {e['azim']}")
        return

    estado = json.loads(STATE_PATH.read_text(encoding="utf-8")) if STATE_PATH.exists() else {}
    if a.simular:
        checar(cfg, estado, simular=True)
        return
    if not (a.uma_vez or a.loop):
        ap.print_help()
        return
    while True:
        try:
            n = checar(cfg, estado)
            print(f"[{datetime.now(BRT):%H:%M:%S}] {n} alerta(s) disparado(s)")
            STATE_PATH.write_text(json.dumps(estado), encoding="utf-8")
        except Exception as e:
            print(f"[{datetime.now(BRT):%H:%M:%S}] Erro no ciclo: {e}", file=sys.stderr)
        if not a.loop:
            return
        time.sleep(cfg["intervalo_segundos"])


if __name__ == "__main__":
    main()