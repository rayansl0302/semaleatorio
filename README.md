# SemAleatório

**Pare de cair com aleatório. Jogue com quem sabe jogar.**

Plataforma web para jogadores brasileiros encontrarem parceiros de League of Legends (duo, flex, Clash), com listagem em tempo real, posts LFG, perfil com Riot, reputação, **landing com SEO**, **perfil público compartilhável**, **Asaas** (checkout + webhook), base para **FCM**, seeds anti-lista vazia e **moderação** (denúncias + shadowban).

## Marca (assets)

Arquivos em `src/assets/` usados na UI: `brasao.png`, `logo_completa.png`, `logo_texto.png`. **Copie esses PNG para `public/`** com os mesmos nomes — a UI carrega por URL estática. (`hero.png` e outros extras podem ficar só em `src/assets/` se não forem referenciados no código.) **Comprima os PNG** antes do deploy.

## Stack

- **Frontend:** React 19 + Vite 8 + TypeScript + Tailwind CSS 4 + `react-helmet-async`  
- **Backend:** Firebase (Authentication, Firestore, Cloud Functions, Cloud Messaging Web)  
- **Riot:** Cloud Function `fetchRiotRank`  
- **Pagamentos:** Asaas (PIX nas cobranças geradas pela Function; webhook confirma e atualiza o Firestore)

## Rotas principais (domínio `.gg`)

Em produção o esperado é **`https://seuapp.gg/`** (landing) e **`https://seuapp.gg/app`** (sistema).

| Caminho | Descrição |
|---------|-----------|
| `/` | Landing pública na raiz do domínio (SEO, CTA Google) |
| `/app` | Mural LFG (lista + feed) |
| `/app/perfil`, `/app/mensagens` | Perfil e mensagens |
| `/u/:slug` | Perfil público — `https://seuapp.gg/u/nick-tag` |

Defina **`VITE_PUBLIC_SITE_URL=https://seuapp.gg`** no `.env` de build para canonical, Open Graph e “copiar link” usarem o domínio certo (sem depender só do host atual).

Redirecionamentos: `/perfil` → `/app/perfil`, `/mensagens` → `/app/mensagens`.

## Setup rápido

### 1. Dependências

```bash
npm install
cd functions && npm install && cd ..
```

### 2. Firebase (Console)

1. Projeto em [Firebase Console](https://console.firebase.google.com/).  
2. **Authentication** → Google.  
3. **Firestore**.  
4. **Cloud Messaging** → certificado **Web Push** (para `VITE_FCM_VAPID_KEY`).  
5. Credenciais do app Web no projeto.

### 3. Variáveis de ambiente (frontend)

Copie `.env.example` para `.env`:

- Variáveis `VITE_FIREBASE_*`  
- `VITE_FCM_VAPID_KEY` (opcional; sem isso o app funciona, só não registra push)

### 4. Regras e índices Firestore

```bash
firebase login
firebase use --add
firebase deploy --only firestore:rules,firestore:indexes

Regras do **Realtime Database** (presença / digitação): arquivo `database.rules.json`. Publicar com:

```bash
firebase deploy --only database
```
```

Coleções extras cobertas pelas regras: `reports`, `seed_profiles` (leitura pública), `config/app` (leitura pública), `webhook_events` (somente servidor).

### 5. Cloud Functions — env e secrets

**Riot (`fetchRiotRank`):** segue o fluxo da [documentação LoL](https://developer.riotgames.com/docs/lol): **Account v1** em `americas.api.riotgames.com` (Riot ID → PUUID) e **League v4** no host de **plataforma** (`br1.api.riotgames.com` por padrão para BR). Defina `RIOT_API_KEY` no `.env` da raiz e/ou `functions/.env`; opcionalmente `RIOT_PLATFORM_ROUTING` (padrão `br1`). **Nunca** use prefixo `VITE_` na chave. No deploy, replique essas variáveis no Cloud se necessário.

```bash
# Asaas (continua via Secret Manager)
firebase functions:secrets:set ASAAS_API_KEY
firebase functions:secrets:set ASAAS_WEBHOOK_TOKEN
```

- **ASAAS_API_KEY:** chave da API (sandbox ou produção).  
- **ASAAS_WEBHOOK_TOKEN:** token que você define no painel do Asaas ao cadastrar o webhook; a Function compara com o header `asaas-access-token`.

Opcional — URL da API (padrão já é sandbox oficial):

```bash
firebase functions:config:set asaas.api_base="https://api.asaas.com/v3"
```

Ou use o parâmetro deploy `ASAAS_API_BASE` conforme a [documentação de params](https://firebase.google.com/docs/functions/config-env) (o código usa `defineString('ASAAS_API_BASE')` com default `https://api-sandbox.asaas.com/v3`).

Deploy:

```bash
cd functions && npm run build && cd ..
firebase deploy --only functions
```

**Webhook Asaas:** aponte para a URL HTTPS da Function **`asaasWebhook`** (ex.: `https://<região>-<projeto>.cloudfunctions.net/asaasWebhook`). Eventos: cobranças; o código aplica benefícios em **`PAYMENT_RECEIVED`**. `externalReference` da cobrança: `SA|<uid>|<produto>` com produto `premium_monthly`, `boost_1h` ou `boost_3h` (definido pela `createAsaasCheckout`).

Funções:

| Nome | Papel |
|------|--------|
| `fetchRiotRank` | Elo BR1 a partir de nick + tag |
| `submitRating` | Avaliação + média + selo |
| `createAsaasCheckout` | Cria cliente (se precisar) + cobrança PIX + retorna `invoiceUrl` |
| `asaasWebhook` | Valida token, idempotência por `payment.id`, atualiza `plan` / `premiumUntil` / `boostUntil` |

### 6. Rodar o app

```bash
npm run dev
```

## Onboarding (rápido)

- Novo usuário: **status LFG**, tag **BR1**, **região BR** (heurística timezone/idioma), **`profileSlug`** gerado do nick.  
- Usuários antigos ganham `profileSlug` na próxima leitura do perfil se ainda não existir.  
- No perfil: salvar nick/tag atualiza o slug; botão **Atualizar elo** chama a Riot.

## Aquisição e retenção

- **Landing** com meta tags (`title`, `description`, Open Graph).  
- **FCM:** com `VITE_FCM_VAPID_KEY`, o layout do app registra token em `users.fcmTokens` (array). Próximo passo: Cloud Function + Admin SDK para enviar notificações (ex.: “jungler gold online”).  
- **Anti-lista vazia:** coleção somente leitura **`seed_profiles`** (documentos com os mesmos campos visuais de `users` + `active: true`); quando não há jogadores reais após os filtros, os seeds aparecem com badge **Exemplo**.  
- **`config/app`:** documento opcional `{ onlineCountFloor: 12 }` para texto de presença no mural.

Exemplo de doc em `seed_profiles`:

```json
{
  "active": true,
  "nickname": "DuelistaExemplo",
  "tag": "BR1",
  "elo": "GOLD II",
  "roles": ["JUNGLE"],
  "status": "LFG",
  "bio": "Perfil ilustrativo — comunidade em crescimento.",
  "ratingAvg": 4.5,
  "ratingCount": 12,
  "plan": "free",
  "semiAleatorio": true,
  "playerTags": ["Sem Tilt"],
  "queueTypes": ["duo", "flex"],
  "favoriteUids": [],
  "boostUntil": null,
  "lastOnline": null
}
```

(`lastOnline` pode ser `null` nos seeds.)

## Moderação

- Botão **Reportar** nos cards (usuário logado): grava em **`reports`**.  
- Campo **`shadowBanned`** em `users`: se `true`, o jogador **não entra na listagem** e o perfil público some. Defina manualmente no Console ou automatize depois (contagem de denúncias, Function, etc.).

## Pagamentos (Asaas)

1. Usuário clica em **Pagar com Asaas** / Boost no perfil.  
2. `createAsaasCheckout` cria cobrança com **PIX** e `externalReference` `SA|uid|produto`.  
3. Asaas envia **POST** para `asaasWebhook` com o body do evento de cobrança.  
4. Em **`PAYMENT_RECEIVED`**, a Function atualiza o documento do usuário (Premium 30 dias ou extensão de `boostUntil`).

## Modelo freemium

| Free | Premium |
|------|---------|
| Perfil, mural, posts, nick, denúncias | Ordenação priorizada, filtros avançados, favoritos ilimitados, stats |
| `premiumUntil` controla expiração após pagamento Asaas | Boost opcional via Asaas |

## Chat

O fluxo principal é **copiar nick** + **abrir Riot Client** (`riotclient://`). O chat Firestore permanece secundário.

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Desenvolvimento Vite |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |
| `cd functions && npm run build` | Compilar Functions |

## Licença e aviso

SemAleatório não é afiliado à Riot Games. League of Legends é marca da Riot Games, Inc.
