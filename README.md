# Video Downloader

Interface React/TypeScript para baixar vídeos e extrair MP3. O frontend pode ser hospedado no GitHub Pages; os arquivos são processados por uma API Node.js externa com yt-dlp e FFmpeg.

## Pastas

- `frontend/`: React, Vite e Tailwind; publicação estática no Pages.
- `backend/`: Express, PostgreSQL, Redis e execução de yt-dlp/FFmpeg.
- `worker/`: proxy opcional do Cloudflare para a API. Não executa programas nem converte mídia.

## GitHub Pages

Em Settings → Pages, selecione **GitHub Actions** como origem. O workflow `.github/workflows/deploy.yml` compila a `main`, envia `frontend/dist` como artefato e publica com `actions/deploy-pages`.

Site: https://neyvansantos.github.io/Downloads-Audio-e-Video-/

Em Settings → Secrets and variables → Actions → Variables, configure `VITE_API_BASE_URL` com a URL pública HTTPS da API, incluindo `/api`, por exemplo `https://api.example.com/api`. Execute novamente o workflow após mudar a variável. Sem ela, o site mostra um aviso e desabilita downloads.

O Pages hospeda a interface. Para downloads funcionarem, publique o backend em um servidor ou serviço de containers com armazenamento, PostgreSQL e Redis. Configure `CORS_ORIGIN=https://neyvansantos.github.io` nesse servidor. Credenciais do banco ficam apenas no backend.

## Desenvolvimento local

Requer Node.js 22+, PostgreSQL, Redis, yt-dlp e FFmpeg no PATH.

```powershell
npm run install:all
Copy-Item backend/.env.example backend/.env
# Ajuste os dados de conexão no backend/.env e crie o banco video_downloader.
npm run migration:run --prefix backend
npm run dev:backend
# Em outro terminal:
npm run dev
```

Frontend: http://localhost:3000/Downloads-Audio-e-Video-/
API: http://localhost:3001/api

O frontend usa a API local automaticamente em desenvolvimento. Para outro endereço, copie `frontend/.env.example` para `frontend/.env` e ajuste `VITE_API_BASE_URL`.

## Docker

### API neste computador conectada ao GitHub Pages

Com Docker Desktop em execução, abra o PowerShell na pasta do projeto:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Start-LocalApi.ps1 -ConnectPages
```

O script inicia API, PostgreSQL, Redis e um túnel HTTPS temporário, verifica as conexões e solicita uma nova publicação do Pages com a URL correta. O parâmetro `-ConnectPages` exige o GitHub CLI (`gh`) autenticado com acesso ao repositório. Sem esse parâmetro, apenas os serviços são iniciados e os endereços são exibidos.

API local: `http://localhost:3001/api`. O site público funciona enquanto este computador, o Docker e o túnel estiverem ativos. O túnel gratuito é voltado a testes, não tem garantia de disponibilidade e muda de endereço quando é recriado. Após reiniciar o túnel/computador, execute novamente o comando acima para atualizar a conexão do site. Não é necessário abrir portas no roteador.

Para parar sem apagar os arquivos ou o banco:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Stop-LocalApi.ps1
```

### API sem túnel

```powershell
docker compose up --build
```

Sobe a API em `http://localhost:3001/api`, PostgreSQL e Redis. O frontend continua no Pages ou no Vite local. Os downloads e o banco usam volumes persistentes. Em produção, use HTTPS e uma senha própria de PostgreSQL.

## API

- `GET /api/health`: disponibilidade do processo.
- `GET /api/preview?url=...`: metadados.
- `POST /api/download`: recebe `{url, format, quality}` e retorna `202` com `taskId`.
- `GET /api/status/:taskId`: acompanha o processamento.
- `GET /api/download/:taskId`: entrega o arquivo pronto.

Formatos: `video` e `audio`. Qualidades: `720p`, `1080p`, `4k`, `mp3`.
Cada tarefa tem uma pasta própria. Áudio é convertido uma vez pelo yt-dlp. Arquivos prontos expiram uma hora após o processamento; a limpeza roda periodicamente. Tarefas interrompidas são marcadas como falhas na inicialização. Execute uma única instância da API: o limite de dois downloads e a recuperação de tarefas são locais ao processo.

As URLs iniciais precisam resolver para endereços públicos. Essa verificação não substitui bloqueios de acesso à rede privada no ambiente de hospedagem, pois os extratores podem seguir outros endereços.

## Cloudflare opcional

Em `worker/wrangler.toml`, configure `BACKEND_URL` com a URL HTTPS da API, incluindo `/api`, e `CORS_ORIGIN` com a origem do site. Depois:

```powershell
npm run deploy --prefix worker
```

A variável `VITE_API_BASE_URL` pode apontar diretamente para a API ou para esse proxy. Para arquivos grandes, a conexão direta evita limites adicionais de transferência do proxy.

## Verificações

```powershell
npm run build
npm run lint --prefix frontend
npm test --prefix backend
npm test --prefix worker
```

Os testes de regressão verificam validação de URLs/IDs, argumentos sem shell, isolamento de arquivos e conversão única de áudio. Downloads reais também dependem da disponibilidade e das restrições de cada fonte.

Para repetir a integração real (API, PostgreSQL e Redis precisam estar em execução; requer `ffprobe` no PATH): execute `node backend/test/integration.cjs`. O teste baixa uma amostra pública em vídeo e MP3, verifica os codecs e o limite de tarefas. Use `TEST_API_URL` para apontar para outra API de teste.
