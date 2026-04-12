"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.riotPrepareOAuth = riotPrepareOAuth;
exports.riotCompleteOAuth = riotCompleteOAuth;
const node_crypto_1 = require("node:crypto");
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const riotRank_js_1 = require("./riotRank.js");
const AUTH_BASE = 'https://auth.riotgames.com';
const TOKEN_URL = `${AUTH_BASE}/token`;
const ACCOUNTS_ME = 'https://americas.api.riotgames.com/riot/account/v1/accounts/me';
const STATE_COLLECTION = 'riot_oauth_states';
const STATE_TTL_MS = 15 * 60 * 1000;
/** Alinhado a `src/lib/profileSlug.ts` */
function profileSlugFromNick(nickname, tag) {
    const n = nickname
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    const t = tag
        .trim()
        .toLowerCase()
        .replace(/^#/, '')
        .replace(/[^a-z0-9]+/g, '');
    const base = [n || 'invocador', t || 'br1'].join('-');
    return base.replace(/-+/g, '-');
}
function buildAuthorizeUrl(opts) {
    const u = new URL(`${AUTH_BASE}/authorize`);
    u.searchParams.set('client_id', opts.clientId);
    u.searchParams.set('redirect_uri', opts.redirectUri);
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('scope', 'openid offline_access cpid');
    u.searchParams.set('state', opts.state);
    return u.toString();
}
async function exchangeAuthorizationCode(code, redirectUri, clientId, clientSecret) {
    const basic = Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64');
    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
    });
    const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
    });
    if (!res.ok) {
        const text = await res.text();
        throw new https_1.HttpsError('permission-denied', `Riot recusou a troca do código (HTTP ${res.status}). Verifique redirect_uri e client. ${text.slice(0, 240)}`);
    }
    const json = (await res.json());
    if (!json.access_token) {
        throw new https_1.HttpsError('internal', 'Resposta da Riot sem access_token.');
    }
    return { access_token: json.access_token };
}
async function fetchAccountMe(accessToken) {
    const res = await fetch(ACCOUNTS_ME, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
        const text = await res.text();
        throw new https_1.HttpsError('internal', `Conta Riot (accounts/me) falhou (HTTP ${res.status}). ${text.slice(0, 200)}`);
    }
    return (await res.json());
}
function requireOAuthEnv() {
    const clientId = (process.env.RIOT_OAUTH_CLIENT_ID ?? '').trim();
    const clientSecret = (process.env.RIOT_OAUTH_CLIENT_SECRET ?? '').trim();
    const redirectUri = (process.env.RIOT_OAUTH_REDIRECT_URI ?? '').trim();
    if (!clientId || !clientSecret || !redirectUri) {
        throw new https_1.HttpsError('failed-precondition', 'Defina RIOT_OAUTH_CLIENT_ID, RIOT_OAUTH_CLIENT_SECRET e RIOT_OAUTH_REDIRECT_URI nas variáveis da função (ou .env).');
    }
    return { clientId, clientSecret, redirectUri };
}
async function riotPrepareOAuth(uid) {
    const { clientId, redirectUri } = requireOAuthEnv();
    const state = (0, node_crypto_1.randomBytes)(24).toString('hex');
    const db = admin.firestore();
    const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + STATE_TTL_MS);
    await db.collection(STATE_COLLECTION).doc(state).set({
        uid,
        expiresAt,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const url = buildAuthorizeUrl({ clientId, redirectUri, state });
    return { url };
}
async function riotCompleteOAuth(uid, code, state) {
    const { clientId, clientSecret, redirectUri } = requireOAuthEnv();
    const trimmedCode = String(code ?? '').trim();
    const trimmedState = String(state ?? '').trim();
    if (!trimmedCode || !trimmedState) {
        throw new https_1.HttpsError('invalid-argument', 'code e state são obrigatórios.');
    }
    const db = admin.firestore();
    const stateRef = db.collection(STATE_COLLECTION).doc(trimmedState);
    const snap = await stateRef.get();
    if (!snap.exists) {
        throw new https_1.HttpsError('permission-denied', 'State inválido ou expirado. Inicie o login de novo.');
    }
    const data = snap.data();
    if (data.uid !== uid) {
        await stateRef.delete().catch(() => { });
        throw new https_1.HttpsError('permission-denied', 'Conta logada não corresponde ao fluxo OAuth.');
    }
    const exp = data.expiresAt?.toMillis() ?? 0;
    if (exp < Date.now()) {
        await stateRef.delete().catch(() => { });
        throw new https_1.HttpsError('deadline-exceeded', 'Login Riot expirou. Tente de novo.');
    }
    await stateRef.delete();
    const { access_token } = await exchangeAuthorizationCode(trimmedCode, redirectUri, clientId, clientSecret);
    const acc = await fetchAccountMe(access_token);
    const puuid = (acc.puuid ?? '').trim();
    const gameName = (acc.gameName ?? '').trim();
    const tagLine = (acc.tagLine ?? '').trim();
    if (!puuid || !gameName || !tagLine) {
        throw new https_1.HttpsError('failed-precondition', 'A Riot não devolveu Riot ID completo (gameName/tag).');
    }
    const userRef = db.doc(`users/${uid}`);
    const slug = profileSlugFromNick(gameName, tagLine);
    const patch = {
        nickname: gameName,
        tag: tagLine,
        riotPuuid: puuid,
        profileSlug: slug,
    };
    let elo;
    const apiKey = (process.env.RIOT_API_KEY ?? '').trim();
    const platform = (process.env.RIOT_PLATFORM_ROUTING ?? 'br1').trim().toLowerCase() || 'br1';
    if (apiKey) {
        try {
            const rank = await (0, riotRank_js_1.fetchRankByRiotId)(apiKey, gameName, tagLine, platform);
            elo = rank.elo;
            patch.elo = rank.elo;
        }
        catch (e) {
            if (e instanceof riotRank_js_1.FetchRankError && e.kind === 'not-found') {
                patch.elo = 'UNRANKED';
                elo = 'UNRANKED';
            }
        }
    }
    await userRef.set(patch, { merge: true });
    return { gameName, tagLine, puuid, elo };
}
