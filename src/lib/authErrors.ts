/** Mensagens em PT para códigos comuns do Firebase Auth */
export function authErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Este e-mail já está cadastrado. Entre ou use outro e-mail.'
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
    default:
      return 'Não foi possível concluir. Tente de novo.'
  }
}
