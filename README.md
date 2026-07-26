# Majesté — E-commerce + CRM/ERP

Loja de moda fitness feminina com vitrine rápida (Next.js), imagens otimizadas (Sharp → WebP/AVIF), checkout Mercado Pago + Melhor Envio, e painel admin completo (estoque, pedidos, CRM, reclamações, financeiro).

## Stack

- Next.js 15 (App Router)
- PostgreSQL 16 + Prisma
- NextAuth (admin)
- Mercado Pago (Pix / cartão)
- Melhor Envio (frete)
- Docker Compose + Nginx (Hostinger KVM 4)

## Desenvolvimento local

### 1. Subir banco

```bash
docker compose up -d postgres redis
```

### 2. App

```bash
cd web
cp .env.example .env   # já existe .env de desenvolvimento
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

- Loja: http://localhost:3000  
- Admin: http://localhost:3000/admin/login  
- Login padrão: `admin@amajeste.com.br` / `admin123`

## Produção (Hostinger KVM 4) — ao lado de outros sites

A Majesté roda **isolada** e **não** ocupa as portas 80/443 do servidor:

1. App em `127.0.0.1:3001` (Docker project `majeste`)
2. Pasta exclusiva `/var/www/majeste`
3. Você só adiciona um virtual host no Nginx/Apache **já existente** apontando o domínio para a porta 3001

Guia completo: [docs/COEXISTENCIA-KVM.md](docs/COEXISTENCIA-KVM.md)

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

Não use `certbot --standalone` nem substitua o `nginx.conf` global.

## Importar produtos do WooCommerce

Exporte produtos via WooCommerce REST API para um JSON e rode:

```bash
cd web
WOO_JSON=./woo-products.json npx tsx scripts/import-woocommerce.ts
```

## Módulos do admin

| Rota | Função |
|------|--------|
| `/admin` | Dashboard (vendas, ticket, estoque baixo) |
| `/admin/produtos` | CRUD produtos + upload de imagens |
| `/admin/estoque` | Entradas/saídas e histórico |
| `/admin/pedidos` | Status, rastreio |
| `/admin/clientes` | CRM + timeline WhatsApp/telefone |
| `/admin/reclamacoes` | Trocas e reclamações |
| `/admin/financeiro` | Receitas, despesas, lucro bruto, fluxo de caixa |

## Imagens

No admin, o upload passa pelo Sharp e gera variantes AVIF/WebP (400/800/1200/1600). Originais ficam salvos; a vitrine usa apenas os derivados.
