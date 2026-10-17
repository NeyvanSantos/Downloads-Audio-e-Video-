# Backend
cd backend
npm install

# Criar banco de dados
createdb video_downloader

# Executar migrations
psql -U postgres -d video_downloader -f src/database/migrations/001_create_downloads_table.sql

# Iniciar backend
npm run dev
