#!/bin/bash

echo "Deploying to GitHub Pages..."

# Build frontend
cd frontend
npm install
npm run build

# Criar branch gh-pages
if ! git branch -a | grep -q "gh-pages"; then
  git checkout -b gh-pages
else
  git checkout gh-pages
fi

# Copiar arquivos de build
rm -rf *
cp -r dist/* .
cp ../README.md .
cp ../.nojekyll .

# Commit e push
git add .
git commit -m "Deploy to GitHub Pages $(date)"
git push origin gh-pages --force

echo "Deploy concluído!"
