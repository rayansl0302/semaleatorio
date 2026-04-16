export {}

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void
      render: (
        container: HTMLElement,
        parameters: {
          sitekey: string
          theme?: 'light' | 'dark'
          callback?: (response: string) => void
        },
      ) => number
      getResponse: (optWidgetId?: number) => string
      reset: (optWidgetId?: number) => void
    }
  }
}
