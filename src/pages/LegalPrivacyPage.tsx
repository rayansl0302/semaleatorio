import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'

export function LegalPrivacyPage() {
  return (
    <div className="min-h-dvh bg-bg px-4 py-10 text-slate-300">
      <Helmet>
        <title>Política de privacidade — SemAleatório</title>
        <meta
          name="description"
          content="Como o SemAleatório trata dados pessoais dos usuários (LGPD, Firebase, perfil de jogador)."
        />
      </Helmet>

      <article className="mx-auto max-w-3xl text-sm leading-relaxed">
        <Link
          to="/"
          className="mb-8 inline-block text-primary hover:underline"
        >
          ← Voltar ao início
        </Link>

        <h1 className="text-2xl font-bold text-white">Política de privacidade</h1>
        <p className="mt-2 text-slate-500">SemAleatório · Última atualização: abril de 2026</p>

        <section className="mt-10 space-y-4">
          <h2 className="text-lg font-semibold text-white">1. Quem somos</h2>
          <p>
            O <strong className="text-slate-200">SemAleatório</strong> é uma plataforma comunitária
            para jogadores de League of Legends no Brasil, focada em encontrar parceiros de fila
            (duo, flex, Clash) e indicar se está procurando time ou dupla. O tratamento de dados descrito aqui aplica-se
            ao site e à aplicação web associada.
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-white">2. Que dados coletamos</h2>
          <p>Dependendo de como você usa o serviço, podemos tratar:</p>
          <ul className="list-inside list-disc space-y-2 text-slate-400">
            <li>
              <strong className="text-slate-300">Dados de conta:</strong> endereço de e-mail,
              identificador de usuário e, se você optar por entrar com Google, nome e foto de perfil
              fornecidos por esse provedor (via Firebase Authentication).
            </li>
            <li>
              <strong className="text-slate-300">Perfil na comunidade:</strong> nome de invocador
              (ou Riot ID), tag, região, elo, papéis, filas de interesse, estado de disponibilidade (ex.: procurando time), texto de
              bio, reputação ou avaliações visíveis na plataforma, e outros campos que você preencher no
              perfil.
            </li>
            <li>
              <strong className="text-slate-300">Ligação opcional à Riot:</strong> se você usar login
              oficial da Riot (RSO) ou confirmar seu Riot ID, tratamos identificadores e dados de
              conta necessários para mostrar seu nick/tag na comunidade, conforme permitido pela
              Riot e suas escolhas no fluxo de autorização.
            </li>
            <li>
              <strong className="text-slate-300">Mensagens e interações:</strong> conteúdo que
              você enviar por meio de mensagens ou moderação, quando existirem.
            </li>
            <li>
              <strong className="text-slate-300">Dados técnicos:</strong> registros de segurança,
              endereço IP, tipo de navegador, data/hora de acesso e informação semelhante,
              necessários para operar, proteger e melhorar o serviço.
            </li>
          </ul>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-white">3. Finalidades e bases legais (LGPD)</h2>
          <p>Tratamos dados pessoais para:</p>
          <ul className="list-inside list-disc space-y-2 text-slate-400">
            <li>
              <strong className="text-slate-300">Prestação do serviço</strong> — criar sessão,
              mostrar perfil, lista de jogadores, feed e mensagens (base: execução de contrato ou
              procedimentos preliminares, art. 7º, V da LGPD).
            </li>
            <li>
              <strong className="text-slate-300">Segurança e prevenção de abuso</strong> —
              moderar conteúdo, investigar denúncias e cumprir obrigações legais quando aplicável
              (bases: legítimo interesse e/ou cumprimento de obrigação legal, art. 7º, II e IX).
            </li>
            <li>
              <strong className="text-slate-300">Melhorias e estatísticas agregadas</strong> —
              compreender o uso geral da plataforma, sem identificar usuários de forma desnecessária
              (base: legítimo interesse, com medidas compatíveis).
            </li>
          </ul>
          <p>
            Quando um tratamento depender do seu consentimento (por exemplo, comunicações opcionais ou
            cookies não essenciais), indicaremos isso no momento da coleta e você poderá retirar o
            consentimento a qualquer momento.
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-white">4. Compartilhamento com terceiros</h2>
          <p>
            Usamos fornecedores de infraestrutura, em particular{' '}
            <strong className="text-slate-300">Google Firebase / Google Cloud</strong> (autenticação,
            banco de dados e hospedagem associada), e podemos usar outros serviços de pagamento,
            e-mail ou analítica conforme necessário para o funcionamento do produto. Esses
            fornecedores tratam dados apenas sob nossas instruções ou conforme os respectivos
            contratos e políticas.
          </p>
          <p>
            A <strong className="text-slate-300">Riot Games</strong> trata dados quando você inicia o
            fluxo de login ou de vinculação de conta na Riot; nesse caso aplicam-se também as políticas
            da Riot. O SemAleatório não é afiliado nem endossado pela Riot Games.
          </p>
          <p>
            Podemos divulgar informação se a lei exigir ou para proteger direitos, segurança e
            integridade dos usuários e do serviço.
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-white">5. Armazenamento e transferência internacional</h2>
          <p>
            Os dados podem ser armazenados em servidores fora do Brasil (por exemplo,
            nos Estados Unidos ou na União Europeia), conforme a configuração dos nossos
            fornecedores. Adotamos cláusulas contratuais e medidas técnicas razoáveis para proteger
            seus dados, em linha com a LGPD.
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-white">6. Retenção</h2>
          <p>
            Conservamos os dados pelo tempo necessário para prestar o serviço, cumprir obrigações
            legais e resolver litígios. Você pode pedir a exclusão da conta; alguns registros poderão ser
            mantidos anonimizados ou pelo período legal mínimo.
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-white">7. Seus direitos (LGPD)</h2>
          <p>
            Nos termos da Lei n.º 13.709/2018, você pode solicitar confirmação de tratamento, acesso,
            correção, anonimização, portabilidade, eliminação de dados desnecessários ou tratados em
            desconformidade, informação sobre compartilhamentos e, quando aplicável, revogação do
            consentimento. Para exercer direitos, use os contatos indicados abaixo. Também
            você pode apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-white">8. Segurança</h2>
          <p>
            Aplicamos boas práticas de segurança da informação (conexão criptografada, controle de
            acesso, segredos fora do código público). Nenhum sistema é totalmente invulnerável; se
            você detectar uma falha, entre em contato conosco de forma responsável.
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-white">9. Crianças e adolescentes</h2>
          <p>
            O serviço não se destina a menores de 16 anos. Se você souber que um menor
            forneceu dados sem autorização adequada, entre em contato conosco para que possamos adotar medidas.
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-white">10. Alterações</h2>
          <p>
            Podemos atualizar esta política para refletir mudanças legais ou no produto. A data no
            topo indica a versão em vigor; alterações relevantes serão comunicadas por meios
            razoáveis (por exemplo, aviso na aplicação).
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-white">11. Contato</h2>
          <p>
            Para questões sobre privacidade ou exercício de direitos, entre em contato com a equipe do
            SemAleatório pelos meios disponíveis na aplicação ou no site oficial do projeto
            (e-mail de suporte, quando publicado).
          </p>
        </section>

        <p className="mt-12 border-t border-border pt-8 text-slate-500">
          Veja também os{' '}
          <Link to="/termos" className="text-primary hover:underline">
            Termos de serviço
          </Link>
          .
        </p>
      </article>
    </div>
  )
}
