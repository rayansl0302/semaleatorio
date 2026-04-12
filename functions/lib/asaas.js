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
exports.asaasWebhook = exports.createAsaasCheckout = void 0;
const admin = __importStar(require("firebase-admin"));
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
const asaasApiKey = (0, params_1.defineSecret)('ASAAS_API_KEY');
const asaasWebhookToken = (0, params_1.defineSecret)('ASAAS_WEBHOOK_TOKEN');
const asaasApiBase = (0, params_1.defineString)('ASAAS_API_BASE', {
    default: 'https://api-sandbox.asaas.com/v3',
});
const PRICES_BRL = {
    premium_monthly: 29.9,
    boost_1h: 2.9,
    boost_3h: 5.9,
};
function asaasHeaders() {
    return {
        access_token: asaasApiKey.value(),
        'Content-Type': 'application/json',
        'User-Agent': 'SemAleatorio/1.0 (Firebase)',
    };
}
function dueDateStr(daysAhead) {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().slice(0, 10);
}
function parseExternalRef(ref) {
    if (!ref || !ref.startsWith('SA|'))
        return null;
    const parts = ref.split('|');
    if (parts.length < 3)
        return null;
    return { uid: parts[1], product: parts[2] };
}
async function ensureAsaasCustomer(uid, email, name) {
    const db = admin.firestore();
    const userRef = db.doc(`users/${uid}`);
    const snap = await userRef.get();
    const existing = snap.data()?.asaasCustomerId;
    if (existing)
        return existing;
    const base = asaasApiBase.value().replace(/\/$/, '');
    const res = await fetch(`${base}/customers`, {
        method: 'POST',
        headers: asaasHeaders(),
        body: JSON.stringify({
            name: name || 'Invocador',
            email: email || `user-${uid}@semaleatorio.local`,
            externalReference: `SA_USER|${uid}`,
        }),
    });
    if (!res.ok) {
        const t = await res.text();
        throw new Error(`Asaas customer: ${res.status} ${t}`);
    }
    const data = (await res.json());
    await userRef.update({ asaasCustomerId: data.id });
    return data.id;
}
exports.createAsaasCheckout = (0, https_1.onCall)({
    region: 'us-central1',
    invoker: 'public',
    cors: true,
    secrets: [asaasApiKey],
}, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Login necessário.');
    }
    const uid = request.auth.uid;
    const product = String(request.data?.product ?? '');
    if (!PRICES_BRL[product]) {
        throw new https_1.HttpsError('invalid-argument', 'Produto inválido.');
    }
    const key = asaasApiKey.value()?.trim();
    if (!key) {
        throw new https_1.HttpsError('failed-precondition', 'Configure o secret ASAAS_API_KEY.');
    }
    const email = request.auth.token.email ?? '';
    const name = String(request.auth.token.name ?? request.auth.token.email ?? 'Invocador');
    const customerId = await ensureAsaasCustomer(uid, email, name);
    const value = PRICES_BRL[product];
    const base = asaasApiBase.value().replace(/\/$/, '');
    const externalReference = `SA|${uid}|${product}`;
    const payRes = await fetch(`${base}/payments`, {
        method: 'POST',
        headers: asaasHeaders(),
        body: JSON.stringify({
            customer: customerId,
            billingType: 'PIX',
            value,
            dueDate: dueDateStr(3),
            description: product === 'premium_monthly'
                ? 'SemAleatório Premium (30 dias)'
                : product === 'boost_1h'
                    ? 'SemAleatório Boost 1h'
                    : 'SemAleatório Boost 3h',
            externalReference,
        }),
    });
    if (!payRes.ok) {
        const t = await payRes.text();
        throw new https_1.HttpsError('internal', `Asaas cobrança: ${payRes.status} ${t}`);
    }
    const pay = (await payRes.json());
    return {
        paymentId: pay.id,
        invoiceUrl: pay.invoiceUrl ?? pay.bankSlipUrl ?? null,
    };
});
exports.asaasWebhook = (0, https_1.onRequest)({ secrets: [asaasWebhookToken], cors: false }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const token = String(req.headers['asaas-access-token'] ?? '');
    if (token !== asaasWebhookToken.value()) {
        res.status(401).send('Unauthorized');
        return;
    }
    const body = req.body;
    const db = admin.firestore();
    try {
        const event = body.event ?? '';
        const payment = body.payment;
        const payId = payment?.id ?? body.id ?? 'unknown';
        if (event !== 'PAYMENT_RECEIVED') {
            res.status(200).json({ ok: true, ignored: event });
            return;
        }
        const idemId = `asaas_${payId}`;
        const idemRef = db.doc(`webhook_events/${idemId}`);
        const idemSnap = await idemRef.get();
        if (idemSnap.exists) {
            res.status(200).json({ ok: true, duplicate: true });
            return;
        }
        const ext = parseExternalRef(String(payment?.externalReference ?? ''));
        if (!ext || !ext.uid) {
            await idemRef.set({
                receivedAt: admin.firestore.FieldValue.serverTimestamp(),
                event,
                note: 'no_external_ref',
            });
            res.status(200).json({ ok: true, skip: true });
            return;
        }
        const userRef = db.doc(`users/${ext.uid}`);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
            await idemRef.set({
                receivedAt: admin.firestore.FieldValue.serverTimestamp(),
                event,
                note: 'user_missing',
            });
            res.status(200).json({ ok: true, skip: true });
            return;
        }
        const updates = {};
        if (ext.product === 'premium_monthly') {
            const days = 30;
            updates.plan = 'premium';
            updates.premiumUntil = admin.firestore.Timestamp.fromMillis(Date.now() + days * 86400000);
        }
        else if (ext.product === 'boost_1h' || ext.product === 'boost_3h') {
            const hours = ext.product === 'boost_1h' ? 1 : 3;
            const cur = userSnap.data()?.boostUntil;
            const now = Date.now();
            const base = cur && typeof cur.toMillis === 'function'
                ? Math.max(now, cur.toMillis())
                : now;
            updates.boostUntil = admin.firestore.Timestamp.fromMillis(base + hours * 3600000);
        }
        if (Object.keys(updates).length > 0) {
            await userRef.update(updates);
        }
        await idemRef.set({
            receivedAt: admin.firestore.FieldValue.serverTimestamp(),
            event,
            paymentId: payId,
            uid: ext.uid,
            product: ext.product,
        });
        res.status(200).json({ ok: true });
    }
    catch (e) {
        console.error('asaasWebhook', e);
        res.status(500).json({ error: 'processing_failed' });
    }
});
