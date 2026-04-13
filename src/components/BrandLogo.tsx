import type { ImgHTMLAttributes } from 'react'

type Variant = 'full' | 'text' | 'mark'

type Props = {
  variant?: Variant
  className?: string
  imgClassName?: string
} & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'>

/**
 * Assets em /public (espelho de `src/assets/` no deploy).
 * - full: logo_completa.png
 * - text: logo_texto.png
 * - mark: brasao.png
 */
const SRC: Record<Variant, string> = {
  full: '/logo_completa.png',
  text: '/logo_texto.png',
  mark: '/brasao.png',
}

/** Logo texto em headers — altura próxima à linha da nav (~text-sm + py-2 + ícone). */
export const BRAND_LOGO_TEXT_HEADER_IMG_CLASS =
  'h-9 w-auto max-w-[min(100vw-10rem,18rem)] object-left sm:h-10 md:h-10 lg:h-11'

/** Headers estreitos (login, legal). */
export const BRAND_LOGO_TEXT_COMPACT_HEADER_IMG_CLASS =
  'h-9 w-auto max-w-[min(100vw-9rem,17rem)] object-left sm:h-10 md:h-10'

const defaultImgClass: Record<Variant, string> = {
  full: 'h-11 w-auto max-h-full sm:h-12 md:h-14',
  text: 'h-9 w-auto max-h-full sm:h-10 md:h-11',
  mark: 'h-10 w-10 max-h-full sm:h-11 sm:w-11',
}

function textLogoFrameClass(imgClass: string): string {
  return imgClass
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter(
      (t) =>
        /^(sm:|md:|lg:|xl:|2xl:)?h-/.test(t) ||
        /^(sm:|md:|lg:|xl:|2xl:)?max-w-/.test(t),
    )
    .join(' ')
}

export function BrandLogo({
  variant = 'full',
  className = '',
  imgClassName,
  loading = 'lazy',
  decoding = 'async',
  ...imgProps
}: Props) {
  const base = imgClassName ?? defaultImgClass[variant]

  if (variant === 'text') {
    const frameCls = textLogoFrameClass(base) || 'h-9 sm:h-10 md:h-11'
    const imgCls =
      'block m-0 h-full w-auto max-h-full max-w-full object-contain object-left p-0 align-middle'

    return (
      <span
        className={`inline-flex max-w-full items-center align-middle leading-[0] m-0 p-0 ${frameCls} ${className}`.trim()}
      >
        <img
          src={SRC[variant]}
          alt="SemAleatório — Matchmaking de Confiança"
          className={imgCls}
          loading={loading}
          decoding={decoding}
          {...imgProps}
        />
      </span>
    )
  }

  const imgCls =
    `${base} block max-w-full object-contain object-left m-0 p-0 align-middle`.trim()

  return (
    <span
      className={`inline-flex items-center leading-none m-0 p-0 max-w-full ${className}`.trim()}
    >
      <img
        src={SRC[variant]}
        alt="SemAleatório — Matchmaking de Confiança"
        width={variant === 'mark' ? 48 : undefined}
        height={variant === 'mark' ? 48 : undefined}
        className={imgCls}
        loading={loading}
        decoding={decoding}
        {...imgProps}
      />
    </span>
  )
}
