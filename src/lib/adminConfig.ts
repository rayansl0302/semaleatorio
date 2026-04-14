/** Email único autorizado a criar o documento em `admins/{uid}` (registo inicial). */
export const MASTER_ADMIN_EMAIL = 'rayansl.dev@gmail.com'

export function isMasterAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return email.trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()
}
