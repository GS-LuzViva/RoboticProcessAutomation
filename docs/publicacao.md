# Publicação: site, API e robô de RPA rodando juntos

O `docker-compose.yml` da raiz sobe dois serviços:

| Serviço | Imagem | O que faz |
|---|---|---|
| `app` | `app/Dockerfile` | API FastAPI + site (porta 8000), estado em volume (`estado-app`) |
| `rpa` | `Dockerfile` | Robô em laço (`--intervalo`), fala com `http://app:8000`, logs no volume `logs-rpa` |

O robô só começa quando o `/health` da API responde. Os dois usam o mesmo `LUZVIVA_API_TOKEN`.

## 1. Antes de publicar

1. Gere um token longo e aleatório e guarde só no `.env` do servidor (nunca no Git):
   `python -c "import secrets; print(secrets.token_urlsafe(32))"`
2. Confira se `static/` está com o build atual do site (`cd app/frontend && npm ci && npm run build`).
3. Rode os testes (`pytest -q` na raiz e em `app/`).

## 2. Opção A: uma VM com Docker (mais simples, roda tudo junto)

Serve para Azure VM, AWS EC2, Oracle Cloud Free Tier ou qualquer VPS com Linux.

```bash
git clone https://github.com/devCaiqueWS/RoboticProcessAutomation.git
cd RoboticProcessAutomation
cp .env.example .env && nano .env          # LUZVIVA_API_TOKEN, LUZVIVA_RPA_INTERVALO
docker compose up -d --build
docker compose ps                          # app: healthy, rpa: running
docker compose logs -f rpa                 # execuções do robô
```

- Abra só as portas 80/443 para a internet; a porta administrativa (SSH) apenas para o seu IP,
  nunca `0.0.0.0/0`.
- HTTPS: coloque um proxy na frente (Caddy é o mais curto:
  `caddy reverse-proxy --from seu-dominio.com --to localhost:8000`) ou use o HTTPS do provedor.
- Atualizar: `git pull && docker compose up -d --build`.

## 3. Opção B: Render (sem servidor para administrar)

1. **Web Service** a partir do repositório, com *Root Directory* `app` e runtime Docker. Variáveis:
   `LUZVIVA_API_TOKEN`. Adicione um *Persistent Disk* montado em `/srv/estado`.
2. **Background Worker** a partir do mesmo repositório, *Root Directory* vazio (usa o `Dockerfile`
   da raiz). Variáveis: `LUZVIVA_API_URL` = URL pública do Web Service, `LUZVIVA_API_TOKEN` igual
   ao do app, `LUZVIVA_RPA_INTERVALO=3600`.
   Alternativa: um *Cron Job* com o comando `python -m luzviva_rpa` e agenda `0 * * * *`.

## 4. Opção C: Azure (a nuvem usada na disciplina de DevOps)

- **App Service for Containers** com a imagem de `app/` (porta 8000) e um compartilhamento do
  Azure Files montado em `/srv/estado`.
- **Container Apps Job** agendado (`0 * * * *`) com a imagem da raiz e o comando
  `python -m luzviva_rpa`, ou um Container App com o `CMD` padrão (laço).
- Segredos (`LUZVIVA_API_TOKEN`) no **Key Vault**, referenciados nas variáveis de ambiente.
- A infraestrutura como código (Terraform), o pipeline com Gitleaks/Semgrep/Trivy e o
  monitoramento (`/metrics`) são da entrega de Secure DevOps do Matheus.

## 5. Depois de publicar

1. Preencha a URL do MVP na Ficha Técnica do `README.md`.
2. Teste em janela anônima: site abre, `/health` responde, a tela Chamados mostra os chamados do robô.
3. Rode uma execução e guarde a evidência: `docker compose exec rpa python -m luzviva_rpa`.

## Escala e limites conhecidos

- A API roda com **um worker**: a trava que impede dois chamados abertos para a mesma placa vale
  dentro de um processo. Para mais de uma instância, troque o SQLite por um banco com índice único
  parcial em `placa` para status aberto.
- O site é estático e servido pela própria API; não precisa de Node no servidor.
