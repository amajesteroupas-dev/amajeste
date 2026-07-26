# Majesté — coexistência com outros sites no KVM

A Majesté **não** ocupa as portas 80/443 e **não** substitui o Nginx/Apache do servidor.

## Isolamento

| Recurso | Como |
|---------|------|
| Pasta | `/var/www/majeste` (só este projeto) |
| Docker project | `majeste` (volumes/rede próprios) |
| Banco | Postgres interno (sem porta no host) |
| Redis | Interno (sem porta no host) |
| App | `127.0.0.1:3001` apenas |

O site que já existe continua como está. Só adicionamos um **virtual host** novo apontando `amajeste.com.br` → `127.0.0.1:3001`.

## Nginx (adicionar arquivo, não substituir o principal)

Crie `/etc/nginx/sites-available/amajeste.conf` (ou equivalente no painel):

```nginx
server {
    listen 80;
    server_name amajeste.com.br www.amajeste.com.br;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 25m;
    }
}
```

Depois:

```bash
sudo ln -s /etc/nginx/sites-available/amajeste.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
# SSL sem derrubar outros sites:
sudo certbot --nginx -d amajeste.com.br -d www.amajeste.com.br
```

## Apache (se o servidor usa Apache)

```apache
<VirtualHost *:80>
  ServerName amajeste.com.br
  ServerAlias www.amajeste.com.br
  ProxyPreserveHost On
  ProxyPass / http://127.0.0.1:3001/
  ProxyPassReverse / http://127.0.0.1:3001/
</VirtualHost>
```

## O que NÃO fazer

- Não rodar `docker compose` com profile `production` antigo na 80/443
- Não sobrescrever `/etc/nginx/nginx.conf` global
- Não usar `certbot --standalone` (para a porta 80 de todos os sites)
- Não publicar Postgres na 5432 do host (pode conflitar com outro banco)

## Subir / atualizar só a Majesté

```bash
cd /var/www/majeste
docker compose -p majeste up -d --build
```
