#!/usr/bin/env bash
set -euo pipefail

# Deploy helper for Hostinger KVM 4
# Usage (on the VPS):
#   chmod +x scripts/deploy.sh
#   ./scripts/deploy.sh

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  echo "Crie o arquivo .env na raiz (copie de web/.env.example)"
  exit 1
fi

mkdir -p nginx/certs uploads
docker compose pull || true
docker compose build web
docker compose up -d postgres redis
sleep 5
docker compose run --rm web npx prisma migrate deploy
docker compose up -d web

echo "App no ar em :3000 (ou via nginx com profile production)"
echo "Para SSL: coloque fullchain.pem e privkey.pem em nginx/certs e rode:"
echo "  docker compose --profile production up -d nginx"
