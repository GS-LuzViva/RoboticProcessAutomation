"""Gera as três views do MVP em data/ a partir das amostras em amostras/.

Imita, em Python puro (só biblioteca padrão), a limpeza da camada Prata e o SQL da camada Ouro do
pipeline de dados (repositório GN0Ber/gs-citizentech-dados), para o app rodar antes de o pipeline
publicar as views reais. Determinístico: mesma entrada, mesma saída. Detalhes em docs/dados_simulados.md.

Uso: python scripts/gerar_views_simuladas.py
"""

import json
import statistics
from datetime import datetime
from math import asin, cos, radians, sin, sqrt
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
AREAS = ("SE", "PINHEIROS", "CAMPO LIMPO")
LIMITES_SP = (-24.01, -23.35, -46.83, -46.36)  # lat mín, lat máx, lon mín, lon máx do município
RAIO_M = 30
CATEGORIAS_FALHA = ("luminaria_apagada", "luminaria_piscando")
ABERTOS = ("aberto", "em_atendimento")


def ler_fonte(amostras: Path, fonte: str) -> list[dict]:
    """Envelopes da fonte em ordem de data (nome do arquivo)."""
    return [json.loads(a.read_text(encoding="utf-8")) for a in sorted((amostras / fonte).glob(f"{fonte}_*.json"))]


def ultimo_por_chave(registros: list[dict], chave: str) -> list[dict]:
    """MERGE pela chave: o último registro visto vence."""
    return list({r[chave]: r for r in registros}.values())


def dentro_de_sp(r: dict) -> bool:
    lat_min, lat_max, lon_min, lon_max = LIMITES_SP
    return r.get("lat") is not None and r.get("lon") is not None and (
        lat_min <= r["lat"] <= lat_max and lon_min <= r["lon"] <= lon_max
    )


def noturna(data_hora: str) -> bool:
    hora = datetime.fromisoformat(data_hora).hour
    return hora >= 18 or hora < 6


def distancia_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine em metros."""
    f1, f2 = radians(lat1), radians(lat2)
    a = sin((f2 - f1) / 2) ** 2 + cos(f1) * cos(f2) * sin(radians(lon2 - lon1) / 2) ** 2
    return 2 * 6_371_000 * asin(sqrt(a))


def ligar(registro: dict, por_placa: dict, luminarias: list[dict]) -> list[dict]:
    """Placa primeiro (todos os pontos com aquela placa, como um JOIN); GPS (mais próxima até 30 m) como reserva."""
    if registro.get("placa") in por_placa:
        return por_placa[registro["placa"]]
    perto = [(distancia_m(registro["lat"], registro["lon"], l["lat"], l["lon"]), l["id_luminaria"], l) for l in luminarias
             if abs(l["lat"] - registro["lat"]) < 0.001 and abs(l["lon"] - registro["lon"]) < 0.001]
    if perto:
        distancia, _, luminaria = min(perto, key=lambda t: t[:2])
        if distancia <= RAIO_M:
            return [luminaria]
    return []


def situacao(lux: float | None) -> str:
    if lux is None:
        return "sem_medicao"
    return "apagada" if lux < 1 else "insuficiente" if lux < 5 else "ok"


def envelope(view: str, gerado_em: str, dados: list[dict]) -> dict:
    return {"view": view, "gerado_em": gerado_em, "linhas": len(dados), "dados": dados}


def gerar(amostras: Path, saida: Path) -> dict[str, dict]:
    # Cadastro ILUME (os dois arquivos diários são o mesmo recorte; a chave é o id)
    envelopes_lum = ler_fonte(amostras, "luminarias")
    pontos_por_area = envelopes_lum[-1]["_coleta"].get("pontos_por_area", {})
    cadastro = ultimo_por_chave([r for e in envelopes_lum for r in e["dados"]], "cd_identificador_iluminacao_publica")
    luminarias = sorted(
        (
            {"id_luminaria": r["cd_identificador_iluminacao_publica"], "placa": r["cd_placa"], "endereco": r["tx_endereco"],
             "subprefeitura": r["area_piloto"], "lat": r["lat"], "lon": r["lon"]}
            for r in cadastro if r.get("lat") is not None and r.get("lon") is not None
        ),
        key=lambda l: l["id_luminaria"],
    )
    por_placa: dict[str, list[dict]] = {}
    for l in luminarias:
        por_placa.setdefault(l["placa"], []).append(l)

    # Prata: limpeza
    medicoes = [
        m for m in ultimo_por_chave([r for e in ler_fonte(amostras, "medicoes_robo") for r in e["dados"]], "id_medicao")
        if m.get("lux") is not None and m["lux"] >= 0 and dentro_de_sp(m) and noturna(m["data_hora"])
    ]
    ocorrencias = [
        o for o in ultimo_por_chave([r for e in ler_fonte(amostras, "ocorrencias_app") for r in e["dados"]], "id_ocorrencia")
        if o.get("categoria") and dentro_de_sp(o)
        and (o.get("confianca_visao") is None or 0 <= o["confianca_visao"] <= 1)
    ]
    chamados = ultimo_por_chave([r for e in ler_fonte(amostras, "chamados_rpa") for r in e["dados"]], "id_chamado")

    # Ligação com a luminária
    ultima_medicao: dict[int, dict] = {}
    for m in medicoes:
        for l in ligar(m, por_placa, luminarias):
            atual = ultima_medicao.get(l["id_luminaria"])
            if atual is None or (m["data_hora"], m["id_medicao"]) > (atual["data_hora"], atual["id_medicao"]):
                ultima_medicao[l["id_luminaria"]] = m
    n_ocorrencias: dict[int, int] = {}
    confianca_max: dict[int, float] = {}
    for o in ocorrencias:
        for l in ligar(o, por_placa, luminarias):
            n_ocorrencias[l["id_luminaria"]] = n_ocorrencias.get(l["id_luminaria"], 0) + 1
            if o["categoria"] in CATEGORIAS_FALHA and o.get("confianca_visao") is not None:
                confianca_max[l["id_luminaria"]] = max(confianca_max.get(l["id_luminaria"], 0), o["confianca_visao"])

    # Ouro: mapa
    mapa = []
    for l in luminarias:
        m = ultima_medicao.get(l["id_luminaria"])
        mapa.append({
            **l,
            "ultima_medicao": m["data_hora"] if m else None,
            "ultimo_lux": m["lux"] if m else None,
            "situacao": situacao(m["lux"] if m else None),
            "ocorrencias_app": n_ocorrencias.get(l["id_luminaria"], 0),
        })

    # Ouro: fila
    chamado_aberto: dict[str, dict] = {}
    for c in sorted((c for c in chamados if c["status"] in ABERTOS), key=lambda c: c["aberto_em"]):
        chamado_aberto[c["placa"]] = c  # o aberto mais recente vence
    fila = []
    for linha in mapa:
        confianca = confianca_max.get(linha["id_luminaria"], 0)
        if linha["situacao"] not in ("apagada", "insuficiente") and confianca < 0.8:
            continue
        base = {"apagada": 60, "insuficiente": 30}.get(linha["situacao"], 0)
        prioridade = min(100, base + min(30, 10 * linha["ocorrencias_app"]) + (10 if confianca >= 0.8 else 0))
        chamado = chamado_aberto.get(linha["placa"])
        fila.append({
            "id_luminaria": linha["id_luminaria"], "placa": linha["placa"], "endereco": linha["endereco"],
            "subprefeitura": linha["subprefeitura"], "lat": linha["lat"], "lon": linha["lon"],
            "situacao": linha["situacao"], "ultimo_lux": linha["ultimo_lux"], "ultima_medicao": linha["ultima_medicao"],
            "ocorrencias_app": linha["ocorrencias_app"],
            "chamado_aberto": chamado["id_chamado"] if chamado else None,
            "status_chamado": chamado["status"] if chamado else None,
            "confianca_visao": confianca, "prioridade": prioridade,
        })
    fila.sort(key=lambda f: (-f["prioridade"], f["id_luminaria"]))

    # Ouro: painel
    painel = []
    for area in AREAS:
        da_area = [l for l in mapa if l["subprefeitura"] == area]
        inspecionadas = sum(1 for l in da_area if l["situacao"] != "sem_medicao")
        apagadas = sum(1 for l in da_area if l["situacao"] == "apagada")
        insuficientes = sum(1 for l in da_area if l["situacao"] == "insuficiente")
        horas = [
            (datetime.fromisoformat(c["concluido_em"]) - datetime.fromisoformat(c["aberto_em"])).total_seconds() / 3600
            for c in chamados if c["area_piloto"] == area and c["status"] == "concluido" and c.get("concluido_em")
        ]
        painel.append({
            "subprefeitura": area,
            "luminarias_cadastradas": pontos_por_area.get(area, len(da_area)),
            "luminarias_inspecionadas": inspecionadas,
            "apagadas": apagadas,
            "insuficientes": insuficientes,
            "pct_com_falha": round(100 * (apagadas + insuficientes) / inspecionadas, 1) if inspecionadas else None,
            "mediana_horas_ate_reparo": round(statistics.median(horas), 1) if horas else None,
            "chamados_em_aberto": sum(1 for c in chamados if c["area_piloto"] == area and c["status"] in ABERTOS),
        })

    # gerado_em = instante do registro mais recente das amostras (não o relógio), para ser determinístico
    gerado_em = max([m["data_hora"] for m in medicoes] + [o["data_hora"] for o in ocorrencias]
                    + [c["atualizado_em"] for c in chamados])
    views = {
        "vw_mvp_mapa_luminarias": envelope("vw_mvp_mapa_luminarias", gerado_em, mapa),
        "vw_mvp_fila_manutencao": envelope("vw_mvp_fila_manutencao", gerado_em, fila),
        "vw_mvp_painel_subprefeitura": envelope("vw_mvp_painel_subprefeitura", gerado_em, painel),
    }
    saida.mkdir(parents=True, exist_ok=True)
    for nome, conteudo in views.items():
        (saida / f"{nome}.json").write_text(json.dumps(conteudo, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return views


if __name__ == "__main__":
    for nome, view in gerar(RAIZ / "amostras", RAIZ / "data").items():
        print(f"{nome}: {view['linhas']} linhas")
