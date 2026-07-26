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

## Produção (Hostinger KVM 4)

1. Aponte o DNS de `amajeste.com.br` para o IP do VPS.
2. Clone o repositório no servidor.
3. Crie `.env` na raiz com secrets reais (`NEXTAUTH_SECRET`, Mercado Pago, Melhor Envio).
4. Execute:

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

5. SSL (Let's Encrypt) — gere certificados e copie para `nginx/certs/`, depois:

```bash
docker compose --profile production up -d nginx
```

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
