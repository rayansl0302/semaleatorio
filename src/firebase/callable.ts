import {
  httpsCallable,
  httpsCallableFromURL,
  type Functions,
  type HttpsCallableOptions,
} from 'firebase/functions'

/**
 * Em `vite dev`, as HTTPS callables usam o proxy `/__sem_fn/*` → Cloud Functions,
 * mesmo origin → sem preflight CORS para o domínio do Google.
 * Em build/preview, usa o endpoint normal da região.
 */
export function appHttpsCallable<RequestData = unknown, ResponseData = unknown>(
  functions: Functions,
  name: string,
  options?: HttpsCallableOptions,
) {
  const useProxy = import.meta.env.DEV && typeof window !== 'undefined'
  if (useProxy) {
    const url = `${window.location.origin}/__sem_fn/${name}`
    return httpsCallableFromURL<RequestData, ResponseData>(
      functions,
      url,
      options,
    )
  }
  return httpsCallable<RequestData, ResponseData>(functions, name, options)
}
