"""Chamados de manutenção: SQLite guarda o estado atual e cada mudança é espelhada no arquivo do dia."""

import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path

from fastapi import HTTPException

from app import armazenamento
from app.modelos import agora

COLUNAS = (
    "id_chamado", "placa", "area_piloto", "prioridade", "situacao_detectada", "status",
    "aberto_em", "atualizado_em", "concluido_em", "equipe", "origem",
)
ABERTOS = ("aberto", "em_atendimento")
TRANSICOES = {
    "aberto": {"em_atendimento", "concluido", "cancelado"},
    "em_atendimento": {"concluido", "cancelado"},
    "concluido": set(),
    "cancelado": set(),
}

_trava = threading.Lock()  # verificação + escrita sem corrida (um chamado aberto por placa)


class Repositorio:
    def __init__(self, db: Path, dia: Path):
        self.db = db
        self.dia = dia
        db.parent.mkdir(parents=True, exist_ok=True)
        with self._conexao() as con:
            con.execute(
                """CREATE TABLE IF NOT EXISTS chamados (
                    id_chamado TEXT PRIMARY KEY, placa TEXT NOT NULL, area_piloto TEXT NOT NULL,
                    prioridade INTEGER NOT NULL, situacao_detectada TEXT NOT NULL, status TEXT NOT NULL,
                    aberto_em TEXT NOT NULL, atualizado_em TEXT NOT NULL, concluido_em TEXT,
                    equipe TEXT, origem TEXT NOT NULL)"""
            )

    @contextmanager
    def _conexao(self):
        con = sqlite3.connect(self.db)
        con.row_factory = sqlite3.Row
        try:
            with con:
                yield con
        finally:
            con.close()

    def listar(self, status: list[str] | None = None, placa: str | None = None, area: str | None = None) -> list[dict]:
        filtros, valores = [], []
        if status:
            filtros.append(f"status IN ({','.join('?' * len(status))})")
            valores += status
        if placa:
            filtros.append("placa = ?")
            valores.append(placa.upper())
        if area:
            filtros.append("area_piloto = ?")
            valores.append(area.upper())
        onde = f"WHERE {' AND '.join(filtros)}" if filtros else ""
        with self._conexao() as con:
            linhas = con.execute(f"SELECT * FROM chamados {onde} ORDER BY prioridade DESC, aberto_em", valores)
            return [dict(linha) for linha in linhas]

    def obter(self, id_chamado: str) -> dict | None:
        with self._conexao() as con:
            linha = con.execute("SELECT * FROM chamados WHERE id_chamado = ?", (id_chamado,)).fetchone()
        return dict(linha) if linha else None

    def abertos_por_placa(self) -> dict[str, dict]:
        """placa -> chamado aberto/em_atendimento mais recente."""
        abertos = self.listar(status=list(ABERTOS))
        return {c["placa"]: c for c in sorted(abertos, key=lambda c: c["aberto_em"])}

    def abrir(self, chamado: dict) -> dict:
        with _trava:
            if chamado["status"] in ABERTOS:
                existente = self.abertos_por_placa().get(chamado["placa"])
                if existente:
                    raise HTTPException(409, {
                        "erro": "já existe chamado aberto ou em atendimento para a placa",
                        "id_chamado": existente["id_chamado"],
                    })
            if self.obter(chamado["id_chamado"]):
                raise HTTPException(409, {"erro": "id_chamado já existe", "id_chamado": chamado["id_chamado"]})
            with self._conexao() as con:
                con.execute(
                    f"INSERT INTO chamados ({','.join(COLUNAS)}) VALUES ({','.join('?' * len(COLUNAS))})",
                    [chamado[c] for c in COLUNAS],
                )
            armazenamento.substituir(self.dia, "chamados_rpa", "id_chamado", chamado)
        return chamado

    def alterar(self, id_chamado: str, mudancas: dict) -> dict:
        with _trava:
            chamado = self.obter(id_chamado)
            if not chamado:
                raise HTTPException(404, "chamado não encontrado")
            atual, novo = chamado["status"], mudancas.get("status") or chamado["status"]
            if novo != atual and novo not in TRANSICOES[atual]:
                raise HTTPException(409, f"transição inválida: {atual} -> {novo}")
            momento = agora().isoformat(timespec="seconds")
            chamado["status"] = novo
            if mudancas.get("equipe"):
                chamado["equipe"] = mudancas["equipe"]
            if mudancas.get("concluido_em"):
                if novo != "concluido":
                    raise HTTPException(422, "concluido_em só vale para chamado concluído")
                chamado["concluido_em"] = mudancas["concluido_em"]
            elif novo == "concluido" and not chamado["concluido_em"]:
                chamado["concluido_em"] = momento
            if chamado["concluido_em"] and (
                datetime.fromisoformat(chamado["concluido_em"]) < datetime.fromisoformat(chamado["aberto_em"])
            ):
                raise HTTPException(422, "concluido_em não pode ser anterior a aberto_em")
            chamado["atualizado_em"] = momento
            with self._conexao() as con:
                con.execute(
                    "UPDATE chamados SET status = ?, equipe = ?, concluido_em = ?, atualizado_em = ? WHERE id_chamado = ?",
                    (chamado["status"], chamado["equipe"], chamado["concluido_em"], chamado["atualizado_em"], id_chamado),
                )
            armazenamento.substituir(self.dia, "chamados_rpa", "id_chamado", chamado)
        return chamado
