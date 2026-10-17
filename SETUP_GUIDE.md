# Setup da Aplicação

## Requisitos Pré-existentes

Antes de começar, certifique-se de ter instalado:

- **Node.js 18+** (recomendado: 18 ou 20)
- **Python 3.8+** (para yt-dlp)
- **npm** ou **yarn**
- **Git**

### Instalar FFmpeg

**Windows:**
1. Baixe em: https://ffmpeg.org/download.html
2. Adicione ao PATH do sistema

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt update && sudo apt install ffmpeg
```

### Instalar yt-dlp

**Windows:**
1. Baixe em: https://github.com/yt-dlp/yt-dlp/releases
2. Adicione ao PATH ou coloque na pasta do projeto

**macOS/Linux:**
```bash
pip3 install yt-dlp
```

### Instalar PostgreSQL

**Windows:**
1. Baixe em: https://www.postgresql.org/download/windows/
2. Crie usuário `postgres` com senha `postgres`

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

### Instalar Redis

**Windows:**
- Use Memurai ou WSL com Redis

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

---

## Instalação do Projeto

```bash
# Clonar ou acessar o diretório
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

---

## URLs da Aplicação

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
