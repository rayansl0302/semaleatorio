/**
 * Lê ASAAS_API_KEY_SANDBOX do backend_semaleatorio/.env, cria links no **sandbox** e imprime URLs.
 * O front em produção usa só `VITE_ASAAS_LINK_*` (links do painel **produção**); este script é para testes locais/API sandbox.
 * Nota: no sandbox o valor mínimo por cobrança é R$ 5,00 — o link de destaque 1h usa R$ 5,00 na API.
 *
 * `callback.successUrl` → volta ao perfil com `?pagamento=sucesso` (define ASAAS_LINK_SUCCESS_URL ou FRONTEND_APP_URL no .env do backend).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '../../backend_semaleatorio/.env')

function parseEnvFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
  const out = {}
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

const env = parseEnvFile(envPath)
const token = env.ASAAS_API_KEY_SANDBOX || env.ASAAS_API_KEY
if (!token) {
  console.error('Sem ASAAS_API_KEY_SANDBOX (ou ASAAS_API_KEY) em backend_semaleatorio/.env')
  process.exit(1)
}

const API = 'https://api-sandbox.asaas.com/v3/paymentLinks'

const returnBase = (
  process.env.ASAAS_LINK_SUCCESS_URL ||
  env.FRONTEND_APP_URL ||
  'http://127.0.0.1:5173'
)
  .trim()
  .replace(/\/$/, '')
const callback = {
  successUrl: `${returnBase}/app/perfil?pagamento=sucesso`,
  autoRedirect: true,
}

const plans = [
  {
    key: 'URL_PREMIUM_ESSENTIAL',
    body: {
      name: 'Sem aleatório — Premium Essencial 30d',
      description: 'Assinatura mensal Essencial',
      value: 19.9,
      billingType: 'UNDEFINED',
      chargeType: 'RECURRENT',
      subscriptionCycle: 'MONTHLY',
      dueDateLimitDays: 10,
      externalReference: 'SA_PREMIUM_ESSENTIAL_30D',
    },
  },
  {
    key: 'URL_PREMIUM_COMPLETE',
    body: {
      name: 'Sem aleatório — Premium Pro 30d',
      description: 'Assinatura mensal Pro',
      value: 29.9,
      billingType: 'UNDEFINED',
      chargeType: 'RECURRENT',
      subscriptionCycle: 'MONTHLY',
      dueDateLimitDays: 10,
      externalReference: 'SA_PREMIUM_COMPLETE_30D',
    },
  },
  {
    key: 'URL_BOOST_1H',
    body: {
      name: 'Sem aleatório — Destaque 1h',
      description: 'Destaque na lista — 1 hora',
      value: 5.0,
      billingType: 'UNDEFINED',
      chargeType: 'DETACHED',
      dueDateLimitDays: 10,
      externalReference: 'SA_BOOST_1H',
    },
  },
  {
    key: 'URL_BOOST_2H',
    body: {
      name: 'Sem aleatório — Destaque 2h',
      description: 'Destaque na lista — 2 horas',
      value: 5.0,
      billingType: 'UNDEFINED',
      chargeType: 'DETACHED',
      dueDateLimitDays: 10,
      externalReference: 'SA_BOOST_2H',
    },
  },
]

const results = {}
for (const { key, body } of plans) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      access_token: token,
    },
    body: JSON.stringify({ ...body, callback }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error(key, res.status, JSON.stringify(data))
    process.exit(1)
  }
  if (typeof data.url !== 'string') {
    console.error(key, 'resposta sem url', JSON.stringify(data))
    process.exit(1)
  }
  results[key] = data.url
}

console.log(JSON.stringify(results, null, 2))
