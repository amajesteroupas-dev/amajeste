#!/usr/bin/env bash
set -euo pipefail

# Deploy seguro ao lado de outros sites
# - Projeto Docker: majeste
# - Porta: 127.0.0.1:3001
# - Não sobe Nginx/Apache próprio

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  echo "Crie .env a partir de .env.example"
  exit 1
fi

docker compose -p majeste build web
docker compose -p majeste up -d postgres redis
sleep 5
docker compose -p majeste run --rm web npx prisma migrate deploy
docker compose -p majeste up -d web
docker compose -p majeste ps

echo ""
echo "Majesté rodando em 127.0.0.1:3001"
echo "Adicione o vhost do domínio apontando para essa porta."
echo "Veja: docs/COEXISTENCIA-KVM.md e nginx/amajeste-vhost.conf"
