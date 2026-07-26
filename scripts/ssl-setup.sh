#!/usr/bin/env bash
# Gera certificados Let's Encrypt no KVM (rode como root)
# Uso: ./scripts/ssl-setup.sh amajeste.com.br admin@amajeste.com.br

set -euo pipefail
DOMAIN="${1:-amajeste.com.br}"
EMAIL="${2:-admin@amajeste.com.br}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

apt-get update
apt-get install -y certbot

certbot certonly --standalone -d "$DOMAIN" -d "www.$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive

mkdir -p "$ROOT/nginx/certs"
cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$ROOT/nginx/certs/fullchain.pem"
cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$ROOT/nginx/certs/privkey.pem"

echo "Certificados copiados para nginx/certs"
echo "Suba o nginx: docker compose --profile production up -d nginx"
