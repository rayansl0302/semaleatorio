import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'

export function LegalTermsPage() {
  return (
    <div className="min-h-dvh bg-bg px-4 py-10 text-slate-300">
      <Helmet>
        <title>Termos de serviço — SemAleatório</title>
        <meta
          name="description"
          content="Termos de uso do SemAleatório — comunidade brasileira para busca de time e dupla em League of Legends."
        />
      </Helmet>

      <article className="mx-auto max-w-3xl text-sm leading-relaxed">
        <Link
          to="/"
          className="mb-8 inline-block text-primary hover:underline"
        >
          ← Voltar ao início
        </Link>

        <h1 className="text-2xl font-bold text-white">Termos de serviço</h1>
        <p className="mt-2 text-slate-500">SemAleatório · Última atualização: abril de 2026</p>

        <section className="mt-10 space-y-4">
          <h2 className="text-lg font-semibold text-white">1. Aceitação</h2>
          <p>
            Ao acessar ou usar o <strong className="text-slate-200">SemAleatório</strong>,
            você concorda com estes Termos de serviço. Se não concordar, deve deixar de usar a
            plataforma. O uso de funcionalidades específicas pode estar sujeito a condições
            adicionais que lhe serão apresentadas no momento adequado.
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-white">2. Descrição do serviço</h2>
          <p>
            O SemAleatório oferece ferramentas comunitárias para jogadores de League of Legends no
            Brasil, incluindo perfis, listagem de jogadores, publicação de disponibilidade para jogar (ex.: procurando time) e comunicação
            entre usuários, conforme as funcionalidades disponíveis em cada momento.
          </p>
          <p>
            O serviço é prestado &quot;no estado em que se encontra&quot;. Não garantimos
            disponibilidade ininterrupta nem que você encontrará sempre parceiros de jogo adequados.
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-white">3. Independência em relação à Riot Games</h2>
          <p>
            O SemAleatório <strong className="text-slate-300">não é endossado pela Riot Games</strong>{' '}
            e não reflete as opiniões ou políticas oficiais da Riot. League of Legends e marcas
            associadas são propriedade da Riot Games, Inc. O seu uso do jogo continua sujeito aos{' '}
            <a
              href="https://www.riotgames.com/en/terms-of-use"
              className="text-primary underline-offset-2 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              termos da Riot
            </a>
            .
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-white">4. Conta e elegibilidade</h2>
          <p>
            Você se compromete a fornecer informação verídica quando solicitada e a manter as credenciais
            de acesso em segurança. Você é responsável por toda a atividade realizada com sua conta.
            O serviço destina-se a usuários com idade e capacidade legais para celebrar
            contratos no Brasil (em regra, 18 anos ou mais, salvo disposição legal em contrário).
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-white">5. Conduta e conteúdo</h2>
          <p>É proibido utilizar a plataforma para:</p>
          <ul className="list-inside list-disc space-y-2 text-slate-400">
            <li>assédio, ódio, discriminação, ameaças ou violência;</li>
            <li>spam, golpes (scams), phishing ou distribuição de malware;</li>
            <li>violação de direitos de terceiros (incluindo propriedade intelectual);</li>
            <li>impersonação de outras pessoas, marcas ou entidades;</li>
            <li>burlar moderação, segurança ou limites técnicos;</li>
            <li>qualquer fim ilegal ou que viole estes Termos ou a legislação aplicável.</li>
          </ul>
          <p>
            Reservamo-nos o direito de remover conteúdo, suspender ou encerrar contas e cooperar com
            autoridades quando legalmente obrigados ou para proteger a comunidade.
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-white">6. Conteúdo dos usuários</h2>
          <p>
            Você mantém a titularidade do conteúdo que publica. Ao enviar conteúdo ao SemAleatório,
            você nos concede uma licença não exclusiva, mundial e gratuita para hospedar, reproduzir,
            exibir e distribuir esse conteúdo <strong className="text-slate-300">no âmbito do
            funcionamento do serviço</strong> (por exemplo, mostrar seu perfil e mensagens a outros
            usuários).
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-white">7. Pagamentos e planos</h2>
          <p>
            Se existirem funcionalidades pagas, preços, renovação e reembolsos serão descritos no
            momento da compra. Impostos aplicáveis podem ser adicionados conforme a lei.
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-white">8. Limitação de responsabilidade</h2>
          <p>
            Na medida máxima permitida pela lei brasileira, o SemAleatório e os seus responsáveis
            não respondem por danos indiretos, lucros cessantes, perda de dados ou interrupção de
            negócio. A responsabilidade total cumulativa por qualquer reclamação relacionada ao
            serviço deve limitar-se, sempre que legalmente admissível, ao valor que você tenha pago
            pelos serviços pagos nos últimos doze meses, ou a zero se não houver pagamentos.
          </p>
          <p>
            Interações com outros jogadores (incluindo partidas no cliente da Riot) são de sua
            responsabilidade. Recomendamos cautela ao compartilhar dados pessoais ou links externos.
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-white">9. Alterações e rescisão</h2>
          <p>
            Podemos alterar estes Termos; a data no topo será atualizada. O uso continuado após
            alterações relevantes pode constituir aceitação. Você pode deixar de usar o serviço a
            qualquer momento; nós podemos suspender ou encerrar o acesso em caso de violação grave
            destes Termos.
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-white">10. Lei aplicável e foro</h2>
          <p>
            Estes Termos regem-se pelas leis da <strong className="text-slate-300">República
            Federativa do Brasil</strong>. Fica eleito o foro da comarca do domicílio do consumidor
            no Brasil, quando aplicável o Código de Defesa do Consumidor; nos demais casos, aplica-se
            o foro da comarca de São Paulo, Estado de São Paulo, salvo norma imperativa em contrário.
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-white">11. Contato</h2>
          <p>
            Para questões sobre estes Termos, use os meios de contato indicados na aplicação ou
            no site oficial do SemAleatório.
          </p>
        </section>

        <p className="mt-12 border-t border-border pt-8 text-slate-500">
          Veja também a{' '}
          <Link to="/privacidade" className="text-primary hover:underline">
            Política de privacidade
          </Link>
          .
        </p>
      </article>
    </div>
  )
}
