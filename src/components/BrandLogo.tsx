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

const defaultImgClass: Record<Variant, string> = {
  full: 'h-11 w-auto max-h-full sm:h-12 md:h-14',
  text: 'h-9 w-auto max-h-full sm:h-10 md:h-11',
  mark: 'h-10 w-10 max-h-full sm:h-11 sm:w-11',
}

// logo_texto.png costuma ter faixas transparentes no PNG: object-contain deixa “ar” visível.
// Altura (h-*) e max-w ficam no frame; a imagem é ampliada e deslocada para preencher o corte.
const TEXT_LOGO_CLIP = '[clip-path:inset(7%_0_8%_0)]'

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
      `block m-0 max-w-none w-auto h-[128%] max-h-none object-contain object-left -translate-y-[11%] ${TEXT_LOGO_CLIP}`.trim()

    return (
      <span
        className={`inline-block max-w-full overflow-hidden align-middle leading-[0] m-0 p-0 ${frameCls} ${className}`.trim()}
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
