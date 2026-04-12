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
exports.createAsaasCheckout = exports.asaasWebhook = exports.submitRating = exports.fetchRiotRank = exports.completeRiotOAuth = exports.prepareRiotOAuth = void 0;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const dotenv_1 = require("dotenv");
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const riotRank_js_1 = require("./riotRank.js");
const riotOAuth_js_1 = require("./riotOAuth.js");
/** Gen2: preflight CORS do browser exige invoker público; auth continua via token no corpo. */
const callableOpts = {
    region: 'us-central1',
    invoker: 'public',
    cors: true,
};
/** Carrega .env da raiz do repo e/ou functions/ (emulador e deploy local). */
function loadEnvFromDotenv() {
    const cwd = process.cwd();
    const files = (0, node_path_1.basename)(cwd) === 'functions'
        ? [(0, node_path_1.join)(cwd, '..', '.env'), (0, node_path_1.join)(cwd, '.env')]
        : [(0, node_path_1.join)(cwd, '.env'), (0, node_path_1.join)(cwd, 'functions', '.env')];
    for (const file of files) {
        if ((0, node_fs_1.existsSync)(file)) {
            (0, dotenv_1.config)({ path: file, override: true });
        }
    }
}
loadEnvFromDotenv();
admin.initializeApp();
const db = admin.firestore();
/** Inicia OAuth RSO: devolve URL para abrir em nova aba (state guardado no Firestore). */
exports.prepareRiotOAuth = (0, https_1.onCall)(callableOpts, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Faça login.');
    }
    try {
        return await (0, riotOAuth_js_1.riotPrepareOAuth)(request.auth.uid);
    }
    catch (e) {
        if (e instanceof https_1.HttpsError)
            throw e;
        console.error('[prepareRiotOAuth]', e);
        throw new https_1.HttpsError('internal', 'Erro ao preparar login Riot.');
    }
});
/** Troca code+state por dados da conta e atualiza o perfil no Firestore. */
exports.completeRiotOAuth = (0, https_1.onCall)(callableOpts, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Faça login.');
    }
    const code = String(request.data?.code ?? '');
    const state = String(request.data?.state ?? '');
    try {
        return await (0, riotOAuth_js_1.riotCompleteOAuth)(request.auth.uid, code, state);
    }
    catch (e) {
        if (e instanceof https_1.HttpsError)
            throw e;
        console.error('[completeRiotOAuth]', e);
        throw new https_1.HttpsError('internal', 'Erro ao concluir login Riot.');
    }
});
exports.fetchRiotRank = (0, https_1.onCall)(callableOpts, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Faça login.');
    }
    const gameName = String(request.data?.gameName ?? '').trim();
    const tagLine = String(request.data?.tagLine ?? '').trim().replace(/^#/, '');
    if (!gameName || !tagLine) {
        throw new https_1.HttpsError('invalid-argument', 'Nick e tag obrigatórios.');
    }
    const key = (process.env.RIOT_API_KEY ?? '').trim();
    if (!key) {
        throw new https_1.HttpsError('failed-precondition', 'Defina RIOT_API_KEY no .env (raiz ou functions/) ou nas variáveis de ambiente da função no Google Cloud.');
    }
    const platform = (process.env.RIOT_PLATFORM_ROUTING ?? 'br1').trim().toLowerCase() || 'br1';
    try {
        const { elo, puuid } = await (0, riotRank_js_1.fetchRankByRiotId)(key, gameName, tagLine, platform);
        return { elo, puuid };
    }
    catch (e) {
        if (e instanceof riotRank_js_1.FetchRankError) {
            throw new https_1.HttpsError(e.kind, e.message);
        }
        throw e;
    }
});
exports.submitRating = (0, https_1.onCall)(callableOpts, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Faça login.');
    }
    const fromUid = request.auth.uid;
    const toUid = String(request.data?.toUid ?? '');
    const communication = Number(request.data?.communication);
    const skill = Number(request.data?.skill);
    const toxicity = Number(request.data?.toxicity);
    if (!toUid || fromUid === toUid) {
        throw new https_1.HttpsError('invalid-argument', 'Alvo inválido.');
    }
    if (![communication, skill, toxicity].every((n) => Number.isInteger(n) && n >= 1 && n <= 5)) {
        throw new https_1.HttpsError('invalid-argument', 'Notas entre 1 e 5.');
    }
    const overall = (communication + skill + (6 - toxicity)) / 3;
    const userRef = db.doc(`users/${toUid}`);
    const ratingRef = db.collection('ratings').doc();
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        if (!snap.exists) {
            throw new https_1.HttpsError('not-found', 'Usuário não encontrado.');
        }
        const cur = snap.data();
        const prevN = cur.ratingCount ?? 0;
        const prevAvg = cur.ratingAvg ?? 0;
        const count = prevN + 1;
        const newAvg = prevN === 0 ? overall : (prevAvg * prevN + overall) / count;
        const semiAleatorio = count >= 5 && newAvg >= 4.2;
        tx.set(ratingRef, {
            fromUid,
            toUid,
            communication,
            skill,
            toxicity,
            overall,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        tx.update(userRef, {
            ratingAvg: newAvg,
            ratingCount: count,
            semiAleatorio,
        });
    });
    return { ok: true };
});
var asaas_js_1 = require("./asaas.js");
Object.defineProperty(exports, "asaasWebhook", { enumerable: true, get: function () { return asaas_js_1.asaasWebhook; } });
Object.defineProperty(exports, "createAsaasCheckout", { enumerable: true, get: function () { return asaas_js_1.createAsaasCheckout; } });
