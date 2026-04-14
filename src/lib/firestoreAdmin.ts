import { doc, type DocumentReference, type Firestore } from 'firebase/firestore'

export type AdminDoc = {
  email: string
  role: 'global'
  createdAt?: { toMillis?: () => number } | null
}

export function adminDocRef(fs: Firestore, uid: string): DocumentReference {
  return doc(fs, 'admins', uid)
}
