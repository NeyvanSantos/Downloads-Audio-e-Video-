# Video Downloader

Plataforma completa para download de vídeos e músicas do YouTube e outras plataformas, com suporte a resoluções até 4K e exportação para MP3.

## 🚀 Recursos

- Download de vídeos do YouTube
- Download de vídeos diretos (URLs)
- Vídeo em múltiplas resoluções (4K/1080p/720p)
- Extração de áudio para MP3
- Interface moderna e responsiva
- Processamento rápido e eficiente

## 🛠️ Stack Tecnológica

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS
- Axios

### Backend
- Node.js + TypeScript
- Express.js
- PostgreSQL
- Redis
- yt-dlp/ffmpeg

## 📋 Requisitos

- Node.js 18+
- Python 3+
- FFmpeg
- yt-dlp
- PostgreSQL 15+
- Redis

## 🚀 Instalação e Execução

### Opção 1: Instalação Local

```bash
# Instalar dependências
npm run install:all

# Configurar variáveis de ambiente
cp backend/.env.example backend/.env
# Edite o arquivo .env com suas configurações

# Criar banco de dados
createdb video_downloader

# Executar migrations
psql -U postgres -d video_downloader -f backend/src/database/migrations/001_create_downloads_table.sql

# Iniciar aplicação
npm run dev
```

### Opção 2: Docker

```bash
# Construir e iniciar containers
docker-compose up --build

# Iniciar containers (se já construídos)
docker-compose up
```

## 🔌 API Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/health` | Status do servidor |
| GET | `/api/preview?url=` | Metadados do vídeo |
| POST | `/api/download` | Iniciar download |
| GET | `/api/status/:taskId` | Status do download |
| GET | `/api/download/:taskId` | Baixar arquivo |

## 📝 Variáveis de Ambiente

```
NODE_ENV=development
PORT=3001

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=video_downloader
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

REDIS_HOST=localhost
REDIS_PORT=6379

YT_DLP_PATH=yt-dlp
FFMPEG_PATH=ffmpeg

CORS_ORIGIN=http://localhost:3000
```

## 📁 Estrutura do Projeto

```
video-downloader/
├── backend/              # API e lógica de servidor
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── database/
│   │   ├── types/
│   │   └── app.ts
│   └── package.json
│
├── frontend/            # Interface do usuário
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── App.tsx
│   └── package.json
│
├── docker-compose.yml
└── package.json
```

## 🔧 Setup Completo

### Requisitos Pré-existentes

Antes de começar, certifique-se de ter instalado:

- **Node.js 18+** (recomendado: 18 ou 20)
- **Python 3.8+** (para yt-dlp)
- **npm** ou **yarn**
- **Git**

#### Instalar FFmpeg

**Windows:** https://ffmpeg.org/download.html

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt update && sudo apt install ffmpeg
```

#### Instalar yt-dlp

**Windows:** https://github.com/yt-dlp/yt-dlp/releases

**macOS/Linux:**
```bash
pip3 install yt-dlp
```

#### Instalar PostgreSQL

**Windows:** https://www.postgresql.org/download/windows/

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux:**
```bash
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

#### Instalar Redis

**Windows:** Use Memurai ou WSL com Redis

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt install redis-server
sudo systemctl start redis
```

### Instalação do Projeto

```bash
cd "G:\Download de Audio e Video\video-downloader"

# Instalar todas as dependências
npm run install:all

# Configurar variáveis de ambiente
cp backend/.env.example backend/.env
# Edite backend/.env com suas configurações

# Criar banco de dados
createdb video_downloader

# Executar migrations
psql -U postgres -d video_downloader -f backend/src/database/migrations/001_create_downloads_table.sql

# Iniciar aplicação
npm run dev
```

## 📖 URLs da Aplicação

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001

## 📄 Licença

MIT
