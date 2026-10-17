# Video Downloader - GitHub Pages + Cloudflare Workers

Plataforma de download de vídeos e músicas hospedada no GitHub Pages com backend serverless no Cloudflare Workers.

## 🚀 Funcionamento

- **Frontend:** Site estático hospedado no GitHub Pages
- **Backend:** Cloudflare Workers (serverless) para processamento de vídeos
- **Processamento:** yt-dlp + ffmpeg no servidor edge

## 📋 Requisitos

- Conta no GitHub
- Conta no Cloudflare (grátis)
- yt-dlp e ffmpeg instalados localmente para testes

## 🛠️ Setup Rápido

### 1. Frontend (GitHub Pages)

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/video-downloader.git
cd video-downloader

# Instalar dependências
npm install
cd frontend
npm install

# Executar localmente
npm run dev
```

### 2. Backend (Cloudflare Workers)

```bash
# Instalar Wrangler
npm install -g wrangler

# Fazer login no Cloudflare
wrangler login

# Configurar variáveis
cd worker
npm install

# Testar localmente
wrangler dev

# Deploy
wrangler deploy
```

### 3. Atualizar configuração do frontend

No arquivo `frontend/src/services/api.ts`, atualize a URL do backend:

```typescript
const API_BASE_URL = 'https://seu-worker.workers.dev';
```

### 4. Deploy para GitHub Pages

```bash
# Criar branch gh-pages
git checkout -b gh-pages

# Build e commit
npm run build

# Fazer push
git push origin gh-pages
```

## 🔧 URLs

- **Frontend:** `https://seu-usuario.github.io/video-downloader/`
- **Backend:** `https://video-downloader-seu-worker.workers.dev`

## 📄 Licença

MIT
