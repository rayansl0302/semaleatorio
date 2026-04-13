import type { ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { BrandLogo, BRAND_LOGO_TEXT_COMPACT_HEADER_IMG_CLASS } from './BrandLogo'

type LegalPageShellProps = {
  title: string
  description: string
  children: ReactNode
}

export function LegalPageShell({ title, description, children }: LegalPageShellProps) {
  return (
    <>
      <Helmet>
        <title>{`${title} · SemAleatório`}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="index,follow" />
      </Helmet>
      <div className="min-h-dvh bg-bg text-slate-200">
        <header className="border-b border-border bg-bg/95 px-4 py-2 backdrop-blur sm:py-2.5">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:gap-x-4">
            <Link
              to="/"
              className="block shrink-0 rounded-md p-0 leading-none ring-offset-2 ring-offset-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <BrandLogo
                variant="text"
                className="leading-none"
                imgClassName={BRAND_LOGO_TEXT_COMPACT_HEADER_IMG_CLASS}
                loading="eager"
              />
            </Link>
            <Link
              to="/"
              className="text-sm font-medium text-primary hover:text-primary/90"
            >
              ← Voltar ao início
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">Última atualização: 13 de abril de 2026</p>
          <div className="mt-8 space-y-4 text-sm leading-relaxed text-slate-400 sm:text-[15px]">
            {children}
          </div>
        </main>
      </div>
    </>
  )
}
