# App Majesté (Expo) — iOS e Android

App nativo da loja + Academia. Backend: site em **https://amajeste.com.br**.

## Desenvolvimento local

1. Site (`web/`): `npm run dev`
2. App:

```bash
cd mobile
cp .env.example .env
npm install
npm start
```

No celular físico, use o IP da máquina no `.env` (não `localhost`).

## Produção / lojas

Guia completo de custos, contas Apple/Google e comandos EAS: **[STORE.md](./STORE.md)**.

Resumo:

```bash
# ícones da logo marca
cd ../web && node scripts/generate-expo-icons.mjs

cd ../mobile
npx eas-cli login
npx eas-cli init
npm run eas:build    # iOS + Android
npm run eas:submit   # envia às lojas (após preencher eas.json)
```

## O que o app inclui

- Home, busca, categoria, produto, carrinho  
- Login/cadastro (JWT), checkout com frete + Pix  
- Pedidos, favoritos, rastreio  
- Academia (treinos, dietas, progresso, looks)  
- Splash com logo marca + frases de incentivo  
