/** Minúsculas + remove diacríticos (ex.: "José" ↔ "jose") para pesquisa tolerante. */
export function foldDiacriticsLower(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}
