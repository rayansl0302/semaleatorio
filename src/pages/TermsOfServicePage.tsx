import { Link } from 'react-router-dom'
import { LegalPageShell } from '../components/LegalPageShell'

export function TermsOfServicePage() {
  return (
    <LegalPageShell
      title="Termos de Serviço"
      description="Regras de uso da plataforma SemAleatório para jogadores de League of Legends no Brasil."
    >
      <p>
        Estes Termos de Serviço (“Termos”) regem o acesso e o uso do site e dos recursos do{' '}
        <strong className="text-slate-200">SemAleatório</strong> (“serviço”, “plataforma” ou “nós”). Ao criar
        conta, acessar o mural, perfis, mensagens ou qualquer funcionalidade, você concorda com estes Termos.
        Se não concordar, não utilize o serviço.
      </p>

      <h2 className="mt-10 text-lg font-semibold text-white">1. O que é o SemAleatório</h2>
      <p>
        O SemAleatório é uma plataforma online que ajuda jogadores brasileiros a encontrarem parceiros para
        partidas de <strong className="text-slate-200">League of Legends</strong> (por exemplo duo, flex ou
        Clash), por meio de perfis, listagens, posts de busca de time ou dupla, reputação da comunidade e
        ferramentas auxiliares. <strong className="text-slate-200">Não somos a Riot Games</strong> nem estamos
        endossados por ela. League of Legends é marca da Riot Games, Inc.
      </p>

      <h2 className="mt-10 text-lg font-semibold text-white">2. Elegibilidade e conta</h2>
      <p>
        Você declara ter capacidade legal para contratar no Brasil ou permissão de responsável, quando
        aplicável. É responsável pela veracidade das informações da conta e pela segurança das suas
        credenciais. Notifique-nos imediatamente em caso de uso não autorizado da sua conta, pelos meios
        disponíveis na plataforma.
      </p>

      <h2 className="mt-10 text-lg font-semibold text-white">3. Uso permitido</h2>
      <p>Você concorda em usar o serviço apenas de forma lícita e de acordo com estes Termos. É proibido:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Violar leis, direitos de terceiros ou estes Termos;</li>
        <li>
          Assediar, ameaçar, discriminar, difamar ou publicar conteúdo ilegal, ofensivo, sexual explícito
          envolvendo menores, ou que incite violência;
        </li>
        <li>
          Fingir ser outra pessoa, manipular reputação de forma fraudulenta, criar múltiplas contas para
          burlar moderação ou spam;
        </li>
        <li>
          Tentar acessar dados ou sistemas sem autorização, sobrecarregar a infraestrutura, fazer engenharia
          reversa desproporcional ou contornar limites técnicos;
        </li>
        <li>
          Utilizar a plataforma para golpes, phishing, venda não autorizada de contas de jogo ou qualquer
          atividade comercial não autorizada expressamente por nós.
        </li>
      </ul>

      <h2 className="mt-10 text-lg font-semibold text-white">4. Conteúdo do usuário</h2>
      <p>
        Você mantém a titularidade do conteúdo que publica, mas nos concede uma licença não exclusiva, mundial,
        gratuita e revogável na medida necessária para hospedar, exibir, distribuir e operar o serviço (incluindo
        moderação e backups). Você declara ter direito de conceder essa licença. Podemos remover conteúdo que
        viole estes Termos ou a lei.
      </p>

      <h2 className="mt-10 text-lg font-semibold text-white">5. Interações entre jogadores</h2>
      <p>
        O SemAleatório facilita o contato entre pessoas; <strong className="text-slate-200">as partidas e
        interações ocorrem fora do nosso controle direto</strong> (cliente Riot, voz, redes sociais, etc.).
        Você é responsável pelo seu comportamento e pelos riscos de interagir com desconhecidos. Recomendamos
        cautela ao compartilhar dados pessoais.
      </p>

      <h2 className="mt-10 text-lg font-semibold text-white">6. Planos pagos e pagamentos</h2>
      <p>
        Recursos premium ou complementares podem ser oferecidos mediante pagamento processado por{' '}
        <strong className="text-slate-200">parceiros de pagamento</strong>, podendo incluir{' '}
        <strong className="text-slate-200">PIX</strong>,{' '}
        <strong className="text-slate-200">cartão de crédito</strong> ou{' '}
        <strong className="text-slate-200">cartão de débito</strong>, conforme disponibilidade no checkout.
        Preços, formas de pagamento e prazos são exibidos no momento da contratação. A confirmação do pagamento
        pode depender do processador e da rede bancária ou da bandeira. Em caso de chargeback, fraude ou
        disputa, podemos suspender benefícios vinculados à transação.
      </p>
      <p>
        Exceto quando a lei exigir o contrário, <strong className="text-slate-200">não garantimos reembolso
        </strong> de valores já pagos por uso parcial ou desistência; pedidos serão analisados caso a caso quando
        houver base legal ou política comercial específica divulgada no serviço.
      </p>

      <h2 className="mt-10 text-lg font-semibold text-white">7. Moderação e encerramento</h2>
      <p>
        Podemos advertir, restringir, suspender ou encerrar contas, ocultar perfis ou aplicar outras medidas
        (incluindo <strong className="text-slate-200">shadowban</strong> ou bloqueio na listagem) quando
        houver violação destes Termos, risco à comunidade, ordem legal ou necessidade de proteger o serviço.
        Você pode deixar de usar o serviço a qualquer momento; disposições que por natureza devam sobreviver
        (limitações de responsabilidade, propriedade intelectual, lei aplicável) permanecem válidas.
      </p>

      <h2 className="mt-10 text-lg font-semibold text-white">8. Disponibilidade e mudanças no produto</h2>
      <p>
        Empregamos esforços razoáveis para manter o serviço disponível, mas <strong className="text-slate-200">
        não garantimos disponibilidade ininterrupta</strong>. Podemos alterar, descontinuar recursos ou o
        próprio serviço, com aviso quando razoável.
      </p>

      <h2 className="mt-10 text-lg font-semibold text-white">9. Isenções e limitação de responsabilidade</h2>
      <p>
        O serviço é fornecido <strong className="text-slate-200">“no estado em que se encontra”</strong>. Na
        máxima extensão permitida pela lei aplicável, excluímos garantias implícitas de comercialização,
        adequação a um fim específico e não violação. Não nos responsabilizamos por perdas de LP, penalidades
        no jogo, comportamento de terceiros, indisponibilidade da Riot ou de provedores de internet.
      </p>
      <p>
        <strong className="text-slate-200">Limitação:</strong> salvo disposição legal em contrário, a
        responsabilidade total do SemAleatório por danos diretos relacionados ao uso do serviço fica limitada ao
        que você pagou a nós nos últimos doze meses pela funcionalidade específica que deu origem ao dano, ou,
        se não houver pagamento, a valor simbólico mínimo permitido pela lei.
      </p>

      <h2 className="mt-10 text-lg font-semibold text-white">10. Propriedade intelectual</h2>
      <p>
        Marcas, layout, textos próprios da plataforma e demais elementos protegidos pertencem ao operador do
        SemAleatório ou licenciantes. Conteúdo de League of Legends e marcas da Riot pertencem aos respectivos
        titulares. É vedado uso não autorizado que infrinja direitos de terceiros.
      </p>

      <h2 className="mt-10 text-lg font-semibold text-white">11. Privacidade</h2>
      <p>
        O tratamento de dados pessoais é descrito na{' '}
        <Link to="/privacidade" className="font-medium text-primary hover:underline">
          Política de Privacidade
        </Link>
        , parte integrante destes Termos na medida em que trate de dados.
      </p>

      <h2 className="mt-10 text-lg font-semibold text-white">12. Lei e foro</h2>
      <p>
        Estes Termos são regidos pelas leis da <strong className="text-slate-200">República Federativa do
        Brasil</strong>. Fica eleito o foro do domicílio do consumidor para demandas em que for aplicável o Código
        de Defesa do Consumidor; nos demais casos, competirá o foro da comarca de São Paulo, Estado de São Paulo,
        salvo regra legal imperativa em contrário.
      </p>

      <h2 className="mt-10 text-lg font-semibold text-white">13. Contato</h2>
      <p>
        Para assuntos relacionados a estes Termos, utilize o canal oficial de contato divulgado no site ou na
        área autenticada do aplicativo.
      </p>
    </LegalPageShell>
  )
}
