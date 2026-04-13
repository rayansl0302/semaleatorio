/** Mensagens mais claras para erros da API Vercel / rede. */
export function formatApiBackendError(e: unknown): string {
  if (e instanceof Error) {
    if (
      e.message.includes('VITE_VERCEL_API_URL') ||
      e.message.includes('VITE_API_URL') ||
      e.message.includes('VITE_BACKEND_URL')
    ) {
      return e.message
    }
    if (e.message.includes('Failed to fetch')) {
      return 'Não foi possível contactar a API. Confira VITE_API_URL (URL do teu site na Vercel, ex.: https://xxx.vercel.app), CORS e as variáveis na Vercel.'
    }
    return e.message
  }
  return 'Erro ao falar com o servidor.'
}
