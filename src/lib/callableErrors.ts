/** Mensagens mais claras para erros da API Vercel / rede. */
export function formatApiBackendError(e: unknown): string {
  if (e instanceof Error) {
    if (e.message.includes('VITE_VERCEL_API_URL')) {
      return e.message
    }
    if (e.message.includes('Failed to fetch')) {
      return 'Não foi possível contactar a API. Confira VITE_VERCEL_API_URL, CORS e se o deploy Vercel está ativo.'
    }
    return e.message
  }
  return 'Erro ao falar com o servidor.'
}
