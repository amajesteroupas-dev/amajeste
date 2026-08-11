# Hostinger KVM 4 — checklist de go-live

## Deploy automático (recomendado)

Depois do primeiro go-live, use **GitHub Actions**: `git push` na `main` atualiza o VPS sozinho.

Guia dos secrets e chave SSH: [github-actions/README.md](./github-actions/README.md)

## Pré-requisitos no VPS

- Ubuntu 22.04+
- Docker + Docker Compose plugin
- Domínio `amajeste.com.br` apontando para o IP do KVM
- Portas 80 e 443 liberadas no firewall

## Passo a passo

1. Clone o projeto em `/var/www/majeste`
2. Copie `.env.example` para `.env` e preencha secrets
3. `chmod +x scripts/*.sh`
4. Pare o Apache/Nginx da Hostinger se estiver usando a porta 80 (ou ajuste o compose)
5. `./scripts/deploy.sh`
6. Com a porta 80 livre: `./scripts/ssl-setup.sh amajeste.com.br seu@email.com`
7. `docker compose --profile production up -d nginx`
8. Acesse `https://amajeste.com.br` e `/admin/login`
9. Importe produtos Woo: copie o JSON e rode `docker compose exec web npx tsx scripts/import-woocommerce.ts`

## Backup diário do Postgres

Adicione ao crontab:

```
0 3 * * * docker compose -f /var/www/majeste/docker-compose.yml exec -T postgres pg_dump -U majeste majeste | gzip > /var/backups/majeste-$(date +\%F).sql.gz
```

## Troca de DNS

Quando o novo site estiver validado, aponte o DNS do WordPress antigo para este VPS (ou desative o WP).
