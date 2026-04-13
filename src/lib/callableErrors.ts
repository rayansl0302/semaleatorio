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
      return (
        'Não foi possível contactar a API. ' +
        'Em desenvolvimento: inicia `npx vercel dev` (porta 3000 por omissão), remove ou comenta `VITE_API_URL` no .env para o Vite encaminhar `/api` para o proxy, ou define `VITE_API_URL=http://127.0.0.1:3000`. ' +
        'Na Vercel (produção): o front pode usar `/api` na mesma origem sem `VITE_API_URL`; se o SPA estiver noutro domínio, define `VITE_API_URL` com o URL do projeto que tem as serverless functions. Confere também CORS e variáveis de ambiente do servidor.'
      )
    }
    return e.message
  }
  return 'Erro ao falar com o servidor.'
}
