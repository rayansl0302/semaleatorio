import { Helmet } from 'react-helmet-async'
import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BrandLogo,
  BRAND_LOGO_TEXT_HEADER_IMG_CLASS,
} from '../components/BrandLogo'
import { RiotLegalNotice } from '../components/RiotLegalNotice'
import { useAuth } from '../contexts/AuthContext'
import { getPublicSiteUrl } from '../lib/siteUrl'

const DOR = [
  {
    t: 'O “duo” que some depois de um game',
    d: 'Você sobe fila achando que achou parceiro. Na primeira derrota some. De novo.',
  },
  {
    t: 'Macro zero e ping infinito',
    d: 'Seu time não sabe fechar partida, não respeita call, e ainda te estoura o chat.',
  },
  {
    t: 'FF em 15 e mental quebrado',
    d: 'Uma lane perde e já tem voto de rendição. Você ainda tenta carregar sozinho.',
  },
  {
    t: 'Aleatório que não comunica',
    d: 'SoloQ vira loteria: ou vem tryhard, ou vem int, AFK ou “first time champ” no ranked.',
  },
  {
    t: 'Flex parecendo solo com extra steps',
    d: 'Time fechado de amigos que não encaixa com seu estilo — ou você fica refém do grupinho.',
  },
  {
    t: 'Clash no fim de semana, time em cima da hora',
    d: 'Falta um flexível de verdade, alguém que compareça e saiba o básico do draft.',
  },
] as const

const COMO = [
  {
    passo: '1',
    t: 'Entra com e-mail ou Google',
    d: 'Sem formulário gigante. Perfil rápido, BR, com nick e tag da Riot.',
  },
  {
    passo: '2',
    t: 'Filtra quem combina com você',
    d: 'Elo, rota, duo / flex / Clash e quem está procurando time ou dupla agora. Lista ao vivo.',
  },
  {
    passo: '3',
    t: 'Copie o nick e feche no client',
    d: 'O que funciona no Brasil: LoL aberto, amizade, call e partida. Sem enrolação.',
  },
] as const

export function LandingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/app', { replace: true })
  }, [user, navigate])

  const siteUrl = getPublicSiteUrl()

  return (
    <>
      <Helmet>
        <title>
          {`SemAleatório — Chega de aleatório troll no LoL · duo, flex e Clash BR`}
        </title>
        <meta
          name="description"
          content="Cansado de int, AFK e duo que some? SemAleatório conecta jogadores BR com perfil, elo e reputação. Veja em tempo real quem quer subir fila (ranked, Clash) — sem depender só da sorte da fila."
        />
        <meta
          name="keywords"
          content="League of Legends BR, duo ranked, parceiro lol, busca de time brasil, flex queue, clash time, sem troll, soloq frustrante"
        />
        <meta
          property="og:title"
          content="SemAleatório — Pare de perder LP por causa de aleatório"
        />
        <meta
          property="og:description"
          content="Encontre jogadores que jogam de verdade: reputação, filtros por elo e rota, disponibilidade ao vivo. Duo e flex sem loteria."
        />
        <meta property="og:type" content="website" />
        {siteUrl ? <meta property="og:url" content={`${siteUrl}/`} /> : null}
        <link rel="canonical" href={siteUrl ? `${siteUrl}/` : '/'} />
        {siteUrl ? (
          <meta property="og:image" content={`${siteUrl}/logo_completa.png`} />
        ) : null}
        <meta property="og:image:alt" content="SemAleatório — Matchmaking de Confiança" />
      </Helmet>

      <div className="min-h-dvh bg-bg text-slate-200">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(34,197,94,0.12),transparent)]" />

        <header className="relative z-10 border-b border-border bg-bg/80 px-4 py-2 backdrop-blur sm:py-2.5">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 sm:gap-3">
            <Link
              to="/"
              className="block shrink-0 rounded-md p-0 leading-none ring-offset-2 ring-offset-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <BrandLogo
                variant="text"
                className="leading-none"
                imgClassName={BRAND_LOGO_TEXT_HEADER_IMG_CLASS}
                loading="eager"
              />
            </Link>
            <Link
              to="/entrar?redirect=/app"
              className="rounded-lg bg-primary/15 px-3 py-1.5 text-sm font-semibold text-primary ring-1 ring-primary/30 hover:bg-primary/25"
            >
              Entrar
            </Link>
          </div>
        </header>

        <main className="relative z-10">
          {/* Hero */}
          <section className="mx-auto max-w-5xl px-4 pb-16 pt-10 sm:pb-20 sm:pt-14 md:pt-16">
            <div className="flex justify-center">
              <div className="relative">
                <div
                  className="pointer-events-none absolute inset-0 blur-3xl opacity-40"
                  aria-hidden
                  style={{
                    background:
                      'linear-gradient(90deg, rgba(34,197,94,0.5) 0%, rgba(59,130,246,0.45) 100%)',
                  }}
                />
                <BrandLogo
                  variant="full"
                  imgClassName="relative h-[7.5rem] w-auto object-center sm:h-[10rem] md:h-[12rem] lg:h-[14rem] max-w-[min(100vw-2rem,52rem)] drop-shadow-[0_12px_48px_rgba(0,0,0,0.5)]"
                  loading="eager"
                />
              </div>
            </div>
            <p className="mt-10 text-center text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              Feito pra quem cansa da fila
            </p>
            <h1 className="mx-auto mt-5 max-w-4xl text-center text-[1.65rem] font-bold leading-[1.15] text-white sm:text-4xl md:text-5xl lg:text-[3.25rem]">
              Você não joga mal.
              <br />
              <span className="text-slate-500">Só cai com gente que não tá no mesmo jogo que você.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-center text-base leading-relaxed text-slate-400 sm:text-lg">
              Int, AFK, tilt, macro duvidosa, duo que some, flex desorganizado — a
              soloQ castiga quem tenta de verdade. O SemAleatório é o atalho para{' '}
              <strong className="font-semibold text-slate-200">
                escolher com quem você sobe fila
              </strong>
              : perfil com Riot, reputação da comunidade BR e lista ao vivo de quem
              quer jogar agora.
            </p>

            <div className="mx-auto mt-10 flex max-w-xl flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center sm:gap-4">
              <Link
                to="/entrar?redirect=/app"
                className="rounded-xl bg-primary px-8 py-4 text-center text-base font-bold text-black shadow-lg shadow-primary/25 transition hover:bg-primary/90 sm:min-w-[280px]"
              >
                Começar agora — conta grátis
              </Link>
              <Link
                to="/app/jogadores"
                className="rounded-xl border border-border bg-card/80 px-8 py-4 text-center text-base font-semibold text-white backdrop-blur transition hover:border-slate-600 hover:bg-card sm:min-w-[220px]"
              >
                Só ver quem está procurando time
              </Link>
            </div>

            <p className="mx-auto mt-8 max-w-lg text-center text-xs leading-relaxed text-slate-600">
              Grátis para usar o que importa: aparecer, filtrar, publicar pedidos no feed e copiar
              nick. Premium só deixa sua busca mais rápida e visível — o core não fica
              trancado.
            </p>
          </section>

          {/* Dor */}
          <section className="border-y border-border bg-[#0a0e13] py-16 sm:py-20">
            <div className="mx-auto max-w-5xl px-4">
              <h2 className="text-center text-2xl font-bold text-white sm:text-3xl">
                Isso é familiar?
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-center text-slate-500">
                Se pelo menos uma bateu, você não tá “exagerando” — é o padrão da
                experiência de milhares de jogadores BR todo dia.
              </p>
              <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {DOR.map((item) => (
                  <li
                    key={item.t}
                    className="rounded-xl border border-red-500/10 bg-card/60 p-5 transition hover:border-red-500/20"
                  >
                    <p className="font-semibold text-slate-200">{item.t}</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                      {item.d}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Ponte */}
          <section className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
            <div className="rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/10 to-transparent p-8 sm:p-10 md:p-12">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                A gente não promete 100% de winrate.
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-400">
                Prometemos algo mais honesto:{' '}
                <span className="text-primary font-semibold">
                  menos surpresa ruim
                </span>
                . Você vê elo, rotas, se a pessoa está procurando time ou dupla, nota da comunidade e o selo
                SemAleatório pra quem se mantém bem avaliado — antes de gastar 40
                minutos na mesma partida que um estranho que já desistiu no loading.
              </p>
              <ul className="mt-8 space-y-3 text-slate-400">
                <li className="flex gap-3">
                  <span className="text-primary" aria-hidden>
                    ✓
                  </span>
                  <span>
                    <strong className="text-slate-200">Matchmaking manual, rápido:</strong>{' '}
                    você escolhe com quem falar — não é mais uma fila cega.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-primary" aria-hidden>
                    ✓
                  </span>
                  <span>
                    <strong className="text-slate-200">Duo, flex e Clash</strong> no mesmo
                    lugar, com pedidos no feed quando você precisa de uma rota específica.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-primary" aria-hidden>
                    ✓
                  </span>
                  <span>
                    <strong className="text-slate-200">Contato que funciona no BR:</strong>{' '}
                    copiar nick e fechar no client; sem depender de DM de rede social.
                  </span>
                </li>
              </ul>
            </div>
          </section>

          {/* Como funciona */}
          <section className="border-t border-border bg-card/30 py-16 sm:py-20">
            <div className="mx-auto max-w-5xl px-4">
              <h2 className="text-center text-2xl font-bold text-white sm:text-3xl">
                Três passos. Sem burocracia.
              </h2>
              <ol className="mt-12 grid gap-8 md:grid-cols-3">
                {COMO.map((item) => (
                  <li key={item.passo} className="text-center md:text-left">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-black">
                      {item.passo}
                    </span>
                    <p className="mt-4 font-semibold text-white">{item.t}</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                      {item.d}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* CTA final */}
          <section className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
            <div className="rounded-2xl border border-border bg-card px-6 py-12 text-center sm:px-12">
              <div className="flex justify-center">
                <BrandLogo
                  variant="mark"
                  width={512}
                  height={512}
                  imgClassName="mx-auto h-32 w-32 opacity-95 sm:h-40 sm:w-40 md:h-48 md:w-48 lg:h-52 lg:w-52 object-center"
                  loading="lazy"
                />
              </div>
              <p className="mt-4 text-sm font-medium uppercase tracking-widest text-primary">
                Comunidade brasileira
              </p>
              <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
                Chega de depender só da sorte da fila.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-slate-500">
                Entra, acha alguém no seu elo e na sua rota, e volta a jogar League
                como time — não como aposta.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                <Link
                  to="/entrar?redirect=/app"
                  className="w-full max-w-sm rounded-xl bg-primary px-8 py-3.5 text-center text-base font-bold text-black hover:bg-primary/90 sm:w-auto"
                >
                  Criar conta ou entrar
                </Link>
                <Link
                  to="/app/jogadores"
                  className="text-sm font-medium text-slate-400 underline-offset-4 hover:text-white hover:underline"
                >
                  Ou abrir o mural direto →
                </Link>
              </div>
            </div>
          </section>
        </main>

        <footer className="relative z-10 space-y-4 border-t border-border py-8 text-center text-xs text-slate-600">
          <p>SemAleatório — comunidade BR</p>
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-slate-500">
            <Link to="/privacidade" className="hover:text-primary hover:underline">
              Política de Privacidade
            </Link>
            <span aria-hidden className="text-slate-700">
              ·
            </span>
            <Link to="/termos" className="hover:text-primary hover:underline">
              Termos de Serviço
            </Link>
          </nav>
          <div className="mx-auto max-w-2xl px-4">
            <RiotLegalNotice />
          </div>
        </footer>
      </div>
    </>
  )
}
