"""Assistente (IA) e fotos (visão): serviços externos simulados com respx."""

import io
import json

import httpx
import respx
from PIL import Image

INDISPONIVEL = {"resposta": "Assistente indisponível no momento", "fontes": [], "recusou": True, "confianca": 0}
PERGUNTA = {"pergunta": "Por que a IP0723371 está em primeiro na fila?", "placa": "IP0723371"}
FORM = {"categoria": "luminaria_apagada", "lat": "-23.5712", "lon": "-46.6921", "area_piloto": "PINHEIROS"}


def jpeg_com_gps() -> bytes:
    exif = Image.Exif()
    exif[0x010F] = "CameraDeTeste"  # Make
    exif[0x8825] = {1: "S", 2: (23.0, 34.0, 16.0), 3: "W", 4: (46.0, 41.0, 31.0)}  # GPSInfo
    saida = io.BytesIO()
    Image.new("RGB", (8, 8), "black").save(saida, "JPEG", exif=exif)
    assert Image.open(io.BytesIO(saida.getvalue())).getexif()  # o arquivo de teste tem EXIF de verdade
    return saida.getvalue()


def test_assistente_sem_ia_url(cliente):
    resposta = cliente.post("/api/assistente", json=PERGUNTA)
    assert resposta.status_code == 200
    assert resposta.json() == INDISPONIVEL


def test_assistente_repassa_para_ia(novo_cliente, monkeypatch):
    monkeypatch.setenv("IA_URL", "http://ia.teste/")
    cliente = novo_cliente()
    saida = {"resposta": "Apagada e com 2 relatos.", "fontes": [{"titulo": "fila", "trecho": "prioridade 80"}],
             "recusou": False, "confianca": 0.82}
    with respx.mock:
        rota = respx.post("http://ia.teste/perguntar").mock(return_value=httpx.Response(200, json=saida))
        assert cliente.post("/api/assistente", json=PERGUNTA).json() == saida
    assert json.loads(rota.calls[0].request.content) == PERGUNTA


def test_assistente_com_ia_falhando(novo_cliente, monkeypatch):
    monkeypatch.setenv("IA_URL", "http://ia.teste")
    cliente = novo_cliente()
    with respx.mock:
        respx.post("http://ia.teste/perguntar").mock(return_value=httpx.Response(500))
        assert cliente.post("/api/assistente", json=PERGUNTA).json() == INDISPONIVEL
        respx.post("http://ia.teste/perguntar").mock(side_effect=httpx.ConnectTimeout("timeout"))
        assert cliente.post("/api/assistente", json=PERGUNTA).json() == INDISPONIVEL
        respx.post("http://ia.teste/perguntar").mock(return_value=httpx.Response(200, text="não é json"))
        assert cliente.post("/api/assistente", json=PERGUNTA).json() == INDISPONIVEL


def test_foto_sem_visao_remove_exif(cliente, ambiente):
    resposta = cliente.post("/api/fotos", files={"foto": ("poste.jpg", jpeg_com_gps(), "image/jpeg")},
                            data={**FORM, "placa": "IP0723371"})
    assert resposta.status_code == 201
    ocorrencia = resposta.json()
    assert ocorrencia["categoria"] == "luminaria_apagada"
    assert ocorrencia["origem"] == "app_foto_cidadao"
    assert ocorrencia["confianca_visao"] is None and ocorrencia["modelo_visao"] is None
    assert ocorrencia["placa"] == "IP0723371" and ocorrencia["area_piloto"] == "PINHEIROS"
    assert len(ocorrencia["foto_id"]) == 16

    salva = ambiente / "fotos" / f"{ocorrencia['foto_id']}.jpg"
    assert not Image.open(salva).getexif()  # sem EXIF e sem GPS
    exportado = cliente.get("/api/export/ocorrencias_app").json()["dados"]
    assert exportado == [ocorrencia]


def test_foto_png_vira_jpeg(cliente, ambiente):
    png = io.BytesIO()
    Image.new("RGBA", (4, 4)).save(png, "PNG")
    resposta = cliente.post("/api/fotos", files={"foto": ("a.png", png.getvalue(), "image/png")}, data=FORM)
    assert resposta.status_code == 201
    assert Image.open(ambiente / "fotos" / f"{resposta.json()['foto_id']}.jpg").format == "JPEG"


def test_foto_com_visao(novo_cliente, monkeypatch):
    monkeypatch.setenv("VISAO_URL", "http://visao.teste")
    cliente = novo_cliente()
    deteccao = {"categoria": "luminaria_piscando", "confianca_visao": 0.93, "modelo_visao": "yolo11n-luzviva-v1",
                "placa": "IP0000002"}
    with respx.mock:
        rota = respx.post("http://visao.teste/detectar").mock(return_value=httpx.Response(200, json=deteccao))
        ocorrencia = cliente.post("/api/fotos", files={"foto": ("p.jpg", jpeg_com_gps(), "image/jpeg")}, data=FORM).json()
    assert {k: ocorrencia[k] for k in deteccao} == deteccao
    assert b"CameraDeTeste" not in rota.calls[0].request.content  # a visão também recebe a foto sem EXIF


def test_foto_com_visao_falhando_usa_dados_do_cidadao(novo_cliente, monkeypatch):
    monkeypatch.setenv("VISAO_URL", "http://visao.teste")
    cliente = novo_cliente()
    with respx.mock:
        respx.post("http://visao.teste/detectar").mock(return_value=httpx.Response(503))
        resposta = cliente.post("/api/fotos", files={"foto": ("p.jpg", jpeg_com_gps(), "image/jpeg")}, data=FORM)
    assert resposta.status_code == 201
    assert resposta.json()["categoria"] == "luminaria_apagada" and resposta.json()["confianca_visao"] is None


def test_foto_415_413_422(cliente, ambiente):
    texto = cliente.post("/api/fotos", files={"foto": ("a.jpg", b"isto nao e imagem", "image/jpeg")}, data=FORM)
    assert texto.status_code == 415
    gif = io.BytesIO()
    Image.new("RGB", (2, 2)).save(gif, "GIF")
    assert cliente.post("/api/fotos", files={"foto": ("a.gif", gif.getvalue(), "image/gif")}, data=FORM).status_code == 415

    grande = b"\xff\xd8" + b"0" * (5 * 1024 * 1024)
    assert cliente.post("/api/fotos", files={"foto": ("g.jpg", grande, "image/jpeg")}, data=FORM).status_code == 413

    sem_local = {"categoria": "luminaria_apagada"}
    resposta = cliente.post("/api/fotos", files={"foto": ("p.jpg", jpeg_com_gps(), "image/jpeg")}, data=sem_local)
    assert resposta.status_code == 422
    assert not (ambiente / "fotos").exists() or not any((ambiente / "fotos").iterdir())  # nada gravado


def test_foto_sem_localizacao_usa_cadastro_pela_placa(cliente):
    # O site só manda lat/lon se o cidadão compartilhar; a placa basta para achar o poste.
    form = {"categoria": "luminaria_apagada", "placa": "ip0000002"}
    resposta = cliente.post("/api/fotos", files={"foto": ("p.jpg", jpeg_com_gps(), "image/jpeg")}, data=form)
    assert resposta.status_code == 201, resposta.text
    ocorrencia = resposta.json()
    assert (ocorrencia["placa"], ocorrencia["lat"], ocorrencia["lon"], ocorrencia["area_piloto"]) == (
        "IP0000002", -23.56, -46.69, "PINHEIROS")


def test_foto_bomba_de_descompressao_recusada(cliente, ambiente):
    png = io.BytesIO()
    Image.new("1", (8000, 6000)).save(png, "PNG")  # 48 MP em poucos KB
    resposta = cliente.post("/api/fotos", files={"foto": ("b.png", png.getvalue(), "image/png")}, data=FORM)
    assert resposta.status_code == 413
    assert not (ambiente / "fotos").exists() or not any((ambiente / "fotos").iterdir())


def test_foto_visao_com_campos_invalidos_mantem_relato_do_cidadao(novo_cliente, monkeypatch):
    monkeypatch.setenv("VISAO_URL", "http://visao.teste")
    cliente = novo_cliente()
    lixo = {"categoria": "gato", "confianca_visao": 91, "modelo_visao": "yolo", "placa": 723371}
    form = {**FORM, "placa": "IP0000002"}
    with respx.mock:
        respx.post("http://visao.teste/detectar").mock(return_value=httpx.Response(200, json=lixo))
        resposta = cliente.post("/api/fotos", files={"foto": ("p.jpg", jpeg_com_gps(), "image/jpeg")}, data=form)
    assert resposta.status_code == 201, resposta.text
    ocorrencia = resposta.json()
    assert (ocorrencia["categoria"], ocorrencia["confianca_visao"], ocorrencia["modelo_visao"], ocorrencia["placa"]) == (
        "luminaria_apagada", None, "yolo", "IP0000002")


def test_foto_area_vem_do_cadastro_e_nao_do_seletor(cliente):
    form = {**FORM, "placa": "IP0000002", "area_piloto": "SE"}  # poste de PINHEIROS, seletor ficou em SE
    ocorrencia = cliente.post("/api/fotos", files={"foto": ("p.jpg", jpeg_com_gps(), "image/jpeg")}, data=form).json()
    assert ocorrencia["area_piloto"] == "PINHEIROS"
    assert (ocorrencia["lat"], ocorrencia["lon"]) == (-23.5712, -46.6921)  # localização do cidadão é mantida
