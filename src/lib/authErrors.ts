export type AuthErrorContext = 'login' | 'register'

/** Mensagens em PT para códigos comuns do Firebase Auth */
export function authErrorMessage(
  code: string | undefined,
  context: AuthErrorContext = 'login',
): string {
  switch (code) {
    case 'auth/email-already-in-use':
      if (context === 'register') {
        return 'Não foi possível criar a conta com estes dados. Verifique o e-mail ou faça login.'
      }
      return 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.'
    case 'auth/invalid-email':
      return 'E-mail inválido.'
    case 'auth/weak-password':
      return 'Senha fraca. Use pelo menos 6 caracteres.'
    case 'auth/user-disabled':
      return 'Esta conta foi desativada.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos.'
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde um pouco e tente de novo.'
    case 'auth/configuration-not-found':
      return 'Autenticação não configurada. Confira o .env e o Console Firebase.'
    case 'auth/popup-closed-by-user':
      return 'Login com Google cancelado.'
    case 'auth/network-request-failed':
      return 'Falha de rede. Verifique sua conexão.'
    case 'auth/operation-not-allowed':
      return 'Login com e-mail não está ativo no Firebase. Ative “E-mail/senha” em Authentication → Sign-in method.'
    case 'auth/unauthorized-domain':
      return 'Este domínio não está autorizado. Em Firebase → Authentication → Settings, adicione o host da Vercel (ex.: seu-projeto.vercel.app) e o domínio customizado.'
    case 'auth/invalid-api-key':
      return 'Chave da API Firebase inválida ou restrita. Confira VITE_FIREBASE_API_KEY e restrições no Google Cloud Console.'
    default:
      return 'Não foi possível concluir. Tente de novo.'
  }
}
