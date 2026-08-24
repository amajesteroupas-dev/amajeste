# Publicar Majesté — App Store e Google Play

O app Expo em `mobile/` está configurado para produção apontando para **https://amajeste.com.br**.

## Custos (o que você paga)

| Item | Valor aproximado | Frequência |
|------|------------------|------------|
| [Apple Developer Program](https://developer.apple.com/programs/) | US$ 99 | Anual |
| [Google Play Console](https://play.google.com/console/signup) | US$ 25 | Única |
| Expo EAS (builds na nuvem) | Plano free costuma bastar no início; [preços](https://expo.dev/pricing) | Conforme uso |

Isso **não** é hospedagem do site — o backend continua no servidor atual. As taxas são das **lojas** + builds.

## Antes de pagar / criar contas

Tenha em mãos:

1. E-mail da empresa / Apple ID (pessoa física ou empresa)
2. Dados CNPJ (recomendado para loja comercial) ou CPF
3. Cartão internacional
4. Conta em [expo.dev](https://expo.dev) (grátis) — dono do projeto `amajeste`

## Passo a passo

### 1. Contas

1. Criar / renovar **Apple Developer** → App Store Connect → novo app  
   - Bundle ID: `br.com.amajeste.app`  
   - Nome: Majesté  
2. Criar **Google Play Console** → criar app  
   - Package: `br.com.amajeste.app`  
3. Criar conta **Expo** e rodar na pasta `mobile`:

```bash
npx eas-cli login
npx eas-cli init
```

Isso preenche `extra.eas.projectId` no `app.json`.

### 2. Preencher `eas.json` → submit

- `appleId`, `ascAppId`, `appleTeamId` (App Store Connect)
- Colocar `google-play-service-account.json` na pasta `mobile/` (gerado no Play Console → API access). O arquivo já está no `.gitignore`.

### 3. Ícones / splash

```bash
cd web
node scripts/generate-expo-icons.mjs
```

### 4. Build de produção

```bash
cd mobile
npm run eas:build
```

Ou só uma loja:

```bash
npx eas-cli build --profile production --platform android
npx eas-cli build --profile production --platform ios
```

### 5. Enviar às lojas

```bash
npm run eas:submit
```

### 6. Fichas nas lojas (manual)

Nas duas consoles, preencha:

- Descrição curta / longa  
- Categoria: Shopping / Lifestyle  
- Política de privacidade: https://amajeste.com.br/privacidade  
- Contato: Josianesantosmajeste@gmail.com  
- Classificação etária (sem conteúdo adulto)  
- Screenshots (iPhone 6.7", Android phone) — tire do build de preview ou emulador  

**Apple** costuma pedir login de demonstração (conta cliente de teste na loja).

## Desenvolvimento local (continua igual)

```bash
# .env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

Builds `production` / `preview` usam a API do site ao vivo (definido em `eas.json`).

## Checklist rápido

- [ ] Apple Developer pago  
- [ ] Google Play pago  
- [ ] `eas login` + `eas init`  
- [ ] Ícones gerados  
- [ ] Build Android + iOS ok  
- [ ] Service account Google + IDs Apple no `eas.json`  
- [ ] Privacidade / termos / screenshots na ficha  
- [ ] Submit + revisão das lojas  
