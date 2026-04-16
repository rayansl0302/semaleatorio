import { useCallback, useEffect, useRef, useState } from 'react'

const SCRIPT_SRC = 'https://www.google.com/recaptcha/api.js?render=explicit'

function findRecaptchaScript(): HTMLScriptElement | null {
  return document.querySelector(`script[src="${SCRIPT_SRC}"]`) as HTMLScriptElement | null
}

function loadRecaptchaScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = findRecaptchaScript()
    if (existing) {
      if (window.grecaptcha) {
        window.grecaptcha.ready(() => resolve())
        return
      }
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('reCAPTCHA: falha ao carregar script')), {
        once: true,
      })
      return
    }
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('reCAPTCHA: falha ao carregar script'))
    document.head.appendChild(script)
  })
}

/**
 * reCAPTCHA v2 (widget explícito), alinhado à doc Google:
 * https://developers.google.com/recaptcha/docs/display?hl=pt-br
 */
export function useRecaptchaV2Widget(siteKey: string | undefined) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<number | null>(null)
  const [scriptError, setScriptError] = useState<string | null>(null)

  const enabled = Boolean(siteKey?.trim())

  useEffect(() => {
    if (!enabled || !siteKey) return
    const el = containerRef.current
    if (!el) return

    let cancelled = false

    void (async () => {
      try {
        await loadRecaptchaScript()
        if (cancelled || !containerRef.current) return
        if (widgetIdRef.current != null) return
        containerRef.current.replaceChildren()
        const gc = window.grecaptcha
        if (!gc) {
          setScriptError('reCAPTCHA indisponível.')
          return
        }
        gc.ready(() => {
          if (cancelled || !containerRef.current || widgetIdRef.current != null) return
          try {
            widgetIdRef.current = gc.render(containerRef.current, {
              sitekey: siteKey.trim(),
              theme: 'dark',
            })
            setScriptError(null)
          } catch {
            setScriptError('Não foi possível mostrar o reCAPTCHA.')
          }
        })
      } catch {
        if (!cancelled) setScriptError('Não foi possível carregar o reCAPTCHA.')
      }
    })()

    return () => {
      cancelled = true
      if (widgetIdRef.current != null && window.grecaptcha) {
        try {
          window.grecaptcha.reset(widgetIdRef.current)
        } catch {
          /* ignore */
        }
      }
      widgetIdRef.current = null
    }
  }, [enabled, siteKey])

  const getResponse = useCallback((): string => {
    if (!enabled || widgetIdRef.current == null || !window.grecaptcha) return ''
    try {
      return window.grecaptcha.getResponse(widgetIdRef.current) ?? ''
    } catch {
      return ''
    }
  }, [enabled])

  const reset = useCallback(() => {
    if (widgetIdRef.current != null && window.grecaptcha) {
      try {
        window.grecaptcha.reset(widgetIdRef.current)
      } catch {
        /* ignore */
      }
    }
  }, [])

  return { containerRef, getResponse, reset, enabled, scriptError }
}
