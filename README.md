# SemAleatório

**Pare de cair com aleatório. Jogue com quem sabe jogar.**

Plataforma web para jogadores brasileiros encontrarem parceiros de League of Legends (duo, flex, Clash), com listagem em tempo real, posts LFG, perfil e reputação (avaliações no **Firestore**), **landing com SEO**, **perfil público compartilhável**, base para **FCM**, seeds anti-lista vazia e **moderação** (denúncias + shadowban). **Sem Cloud Functions** no repositório: tudo que o app faz passa pelo cliente + Firestore (pagamentos e API Riot com chave secreta ficam para um backend à parte, se quiseres).

## Marca (assets)

Arquivos em `src/assets/` usados na UI: `brasao.png`, `logo_completa.png`, `logo_texto.png`. **Copie esses PNG para `public/`** com os mesmos nomes — a UI carrega por URL estática. (`hero.png` e outros extras podem ficar só em `src/assets/` se não forem referenciados no código.) **Comprima os PNG** antes do deploy.

## Stack

- **Frontend:** React 19 + Vite 8 + TypeScript + Tailwind CSS 4 + `react-helmet-async`  
- **Backend:** Firebase (Authentication, Firestore, Cloud Messaging Web)  
- **Riot / elo:** nick, tag e elo no Firestore (confirmação manual no perfil); integração com a API da Riot só com backend próprio (chave secreta).  
- **Pagamentos:** não incluídos aqui; premium pode ser simulado em dev no perfil (Firestore).

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
```

Coleções extras cobertas pelas regras: `ratings` (criação pelo utilizador autenticado, doc id `fromUid__toUid`), `reports`, `seed_profiles` (leitura pública), `config/app` (leitura pública), `webhook_events` (reservado; sem escritas se não houver backend).

### 5. Rodar o app

```bash
npm run dev
```

## Onboarding (rápido)

- Novo usuário: **status LFG**, tag **BR1**, **região BR** (heurística timezone/idioma), **`profileSlug`** gerado do nick.  
- Usuários antigos ganham `profileSlug` na próxima leitura do perfil se ainda não existir.  
- No perfil: confirmar Riot ID grava nick/tag/slug no Firestore; ajusta o **elo exibido** manualmente.

## Aquisição e retenção

- **Landing** com meta tags (`title`, `description`, Open Graph).  
- **FCM:** com `VITE_FCM_VAPID_KEY`, o app regista o token em `users.fcmTokens`. Para **enviar** notificações precisas de um serviço com credencial admin (não incluído neste repo).  
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
