"""Linha de comando: `python -m luzviva_rpa [--simular] [--intervalo [SEGUNDOS]]`."""

from __future__ import annotations

import argparse
import logging
import os
import time
from pathlib import Path

from .cliente import ApiCliente
from .config import INTERVALO_PADRAO_S, Config, ConfiguracaoInvalida
from .execucao import executar
from .registro import NOME_LOGGER, configurar_logs

log = logging.getLogger(NOME_LOGGER)


def criar_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m luzviva_rpa",
        description="Robô de RPA do LuzViva: abre e acompanha chamados de manutenção pela API do app.",
    )
    parser.add_argument("--simular", action="store_true",
                        help="decide e registra no log, mas não faz POST/PATCH na API")
    parser.add_argument("--intervalo", type=int, nargs="?", const=INTERVALO_PADRAO_S,
                        metavar="SEGUNDOS",
                        help=f"repete a execução a cada SEGUNDOS (sem valor: {INTERVALO_PADRAO_S})")
    return parser


def rodar_uma_vez(cliente: ApiCliente, cfg: Config, simular: bool) -> int:
    """Uma execução. Código de saída: 0 tudo certo, 1 houve falha ou erro de fase."""
    try:
        resumo = executar(cliente, cfg.dir_saida, simular=simular)
    except Exception:  # última rede de proteção: o agendador nunca vê o robô cair calado
        log.exception("erro inesperado na execução")
        return 1
    return 1 if resumo["erros"] or resumo["contagem"]["falhas"] else 0


def main(argv: list[str] | None = None) -> int:
    args = criar_parser().parse_args(argv)
    configurar_logs(Path(os.environ.get("LUZVIVA_RPA_DIR_LOGS") or "logs"))
    try:
        cfg = Config.do_ambiente()
    except ConfiguracaoInvalida as exc:
        log.error("configuração inválida: %s", exc)
        return 2
    if args.intervalo is not None and args.intervalo <= 0:
        log.error("--intervalo deve ser maior que zero")
        return 2
    log.info("API=%s token=%s", cfg.api_url, "definido" if cfg.api_token else "não definido")
    cliente = ApiCliente(cfg.api_url, cfg.api_token, espera_base=cfg.espera_base_s)

    if args.intervalo is None:
        return rodar_uma_vez(cliente, cfg, args.simular)
    try:
        while True:
            configurar_logs(cfg.dir_logs)  # troca de arquivo quando vira o dia
            rodar_uma_vez(cliente, cfg, args.simular)
            log.info("próxima execução em %d s", args.intervalo)
            time.sleep(args.intervalo)
    except KeyboardInterrupt:
        log.info("robô interrompido pelo operador")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
