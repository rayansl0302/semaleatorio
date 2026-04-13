/** ID estável da conversa entre dois UIDs (mesmo formato em todo o app). */
export function threadIdFor(a: string, b: string): string {
  return [a, b].sort().join('_')
}

/** Garante o mesmo formato de UID usado ao gravar mensagens (evita thread vazia por espaços / texto extra). */
export function normalizePeerUid(raw: string): string {
  const t = raw.trim()
  return extractLikelyFirebaseUid(t) ?? t
}

/** Extrai um possível UID do Firebase de texto colado (28 chars é o mais comum). */
export function extractLikelyFirebaseUid(raw: string): string | null {
  const t = raw.trim().replace(/\u200b/g, '')
  const tokens = t.split(/[\s,;|]+/).filter(Boolean)
  for (const w of tokens) {
    if (/^[A-Za-z0-9]{20,32}$/.test(w)) return w
  }
  const m = t.match(/[A-Za-z0-9]{20,32}/)
  return m ? m[0] : null
}
