import { Link } from 'react-router-dom'
import { LegalPageShell } from '../components/LegalPageShell'

export function PrivacyPolicyPage() {
  return (
    <LegalPageShell
      title="Política de Privacidade"
      description="Como o SemAleatório trata dados pessoais na plataforma de encontro de jogadores de League of Legends."
    >
      <p>
        Esta Política de Privacidade descreve como o <strong className="text-slate-200">SemAleatório</strong>{' '}
        (“nós”, “nosso” ou “plataforma”) coleta, usa, armazena e protege informações quando você acessa o site
        ou utiliza os recursos do serviço. Ao usar o SemAleatório, você declara que leu e compreendeu esta
        política.
      </p>

      <h2 className="mt-10 text-lg font-semibold text-white">1. Quem é o responsável</h2>
      <p>
        O tratamento de dados pessoais é realizado pelo operador do SemAleatório, em conformidade com a Lei nº
        13.709/2018 (Lei Geral de Proteção de Dados — LGPD) e demais normas aplicáveis.
      </p>

      <h2 className="mt-10 text-lg font-semibold text-white">2. Que dados coletamos</h2>
      <p>Dependendo de como você usa a plataforma, podemos tratar:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong className="text-slate-200">Dados de conta e autenticação:</strong> por exemplo, identificador
          de usuário, e-mail e informações fornecidas pelo provedor de login (como o Google), quando você opta
          por esse método.
        </li>
        <li>
          <strong className="text-slate-200">Dados de perfil e atividade no jogo:</strong> apelido (nick), tag
          da Riot, região, elo e informações que você preenche voluntariamente (bio, rotas preferidas, status
          disponibilidade para jogar, posts no mural, avaliações recebidas ou enviadas, favoritos e dados semelhantes exibidos na
          comunidade).
        </li>
        <li>
          <strong className="text-slate-200">Dados de uso e técnicos:</strong> registros de acesso, tipo de
          dispositivo, navegador, idioma, endereço IP aproximado e eventos de segurança necessários para
          operação e prevenção de abuso.
        </li>
        <li>
          <strong className="text-slate-200">Mensagens e comunicações na plataforma:</strong> conteúdo trocado
          pelos recursos de mensagens do serviço, quando utilizados.
        </li>
        <li>
          <strong className="text-slate-200">Notificações (push):</strong> se você autorizar, podemos registrar
          tokens e preferências associadas ao envio de notificações pelo navegador ou dispositivo.
        </li>
        <li>
          <strong className="text-slate-200">Pagamentos:</strong> quando você adquire planos ou benefícios
          pagos, dados necessários à cobrança e confirmação (incluindo, conforme o meio escolhido, dados de
          cartão ou de PIX) são tratados pelo{' '}
          <strong className="text-slate-200">processador de pagamentos</strong> contratado. Nós podemos
          receber identificadores de transação, status de pagamento e
          referências internas para ativar ou renovar benefícios na sua conta — sem armazenar número completo
          de cartão no SemAleatório.
        </li>
      </ul>

      <h2 className="mt-10 text-lg font-semibold text-white">3. Finalidades e bases legais (LGPD)</h2>
      <p>Tratamos dados para:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong className="text-slate-200">Prestação do serviço e execução de contrato:</strong> criar e
          manter sua conta, exibir perfil e listagens, viabilizar pedidos no feed e mural, mensagens, reputação e recursos
          pagos contratados por você.
        </li>
        <li>
          <strong className="text-slate-200">Legítimo interesse:</strong> melhorar o produto, medir audiência de
          forma agregada, combater fraude, moderar conteúdo, investigar denúncias e garantir segurança da
          comunidade — sempre respeitando seus direitos e expectativas.
        </li>
        <li>
          <strong className="text-slate-200">Consentimento:</strong> quando exigido por lei ou quando você
          aceita recursos opcionais (por exemplo, notificações push no navegador).
        </li>
        <li>
          <strong className="text-slate-200">Cumprimento de obrigação legal ou regulatória:</strong> quando
          necessário para atender ordens legais válidas ou requisitos aplicáveis.
        </li>
      </ul>

      <h2 className="mt-10 text-lg font-semibold text-white">4. Integração com Riot Games</h2>
      <p>
        O SemAleatório não é afiliado à Riot Games. Quando você informa Riot ID ou utiliza integrações
        oficiais da Riot, dados públicos ou autorizados por você podem ser obtidos conforme as políticas da
        Riot. O uso dessas informações limita-se a exibir e operar funcionalidades da plataforma (como elo e
        identificação no jogo).
      </p>

      <h2 className="mt-10 text-lg font-semibold text-white">5. Prestadores e subprocessadores</h2>
      <p>
        Utilizamos serviços de terceiros essenciais à operação, como hospedagem, banco de dados, autenticação,
        mensageria, analytics e processamento de pagamentos. Isso pode incluir, entre outros, provedores como{' '}
        <strong className="text-slate-200">Google (Firebase / autenticação)</strong> e{' '}
        <strong className="text-slate-200">processadores de pagamento</strong>, que tratam dados conforme seus próprios termos e
        políticas. Recomendamos a leitura das políticas desses fornecedores quando aplicável.
      </p>

      <h2 className="mt-10 text-lg font-semibold text-white">6. Perfis públicos e visibilidade</h2>
      <p>
        Parte das informações do seu perfil pode ser exibida a outros usuários ou ao público (por exemplo,
        página pública compartilhável por link). Não publique dados sensíveis que não queira tornar visíveis.
        Ajuste o que compartilha de acordo com o funcionamento do serviço.
      </p>

      <h2 className="mt-10 text-lg font-semibold text-white">7. Retenção</h2>
      <p>
        Mantemos os dados pelo tempo necessário para cumprir as finalidades desta política, respeitar prazos
        legais e resolver disputas. Após encerramento da conta ou pedido válido de exclusão, quando aplicável,
        podemos manter registros mínimos exigidos por lei ou para legítima defesa em processos.
      </p>

      <h2 className="mt-10 text-lg font-semibold text-white">8. Segurança</h2>
      <p>
        Adotamos medidas técnicas e organizacionais razoáveis para proteger os dados contra acesso não
        autorizado, perda ou alteração indevida. Nenhum sistema é 100% seguro; o uso da internet envolve
        riscos inerentes.
      </p>

      <h2 className="mt-10 text-lg font-semibold text-white">9. Seus direitos (titular)</h2>
      <p>
        Nos termos da LGPD, você pode solicitar confirmação de tratamento, acesso, correção, anonimização,
        portabilidade (quando aplicável), eliminação de dados desnecessários, informação sobre compartilhamentos
        e revogação de consentimento, quando a base for o consentimento. Também pode opor-se a tratamentos
        baseados em legítimo interesse, conforme a lei.
      </p>
      <p>
        Para exercer seus direitos, utilize os canais de contato indicados na plataforma ou responda às
        comunicações oficiais do serviço. Podemos solicitar informações para confirmar sua identidade antes de
        atender pedidos.
      </p>

      <h2 className="mt-10 text-lg font-semibold text-white">10. Crianças e adolescentes</h2>
      <p>
        O SemAleatório é voltado a jogadores e não se destina a menores de 13 anos. Se tomarmos conhecimento de
        cadastro indevido de menor, tomaremos medidas para remover as informações pertinentes, conforme a lei.
      </p>

      <h2 className="mt-10 text-lg font-semibold text-white">11. Alterações</h2>
      <p>
        Podemos atualizar esta Política de Privacidade para refletir mudanças no serviço ou na legislação. A
        data da última versão aparece no topo desta página. O uso continuado após alterações relevantes pode
        constituir ciência das mudanças, conforme comunicado no serviço.
      </p>

      <h2 className="mt-10 text-lg font-semibold text-white">12. Contato</h2>
      <p>
        Dúvidas sobre privacidade e proteção de dados podem ser encaminhadas pelo canal de contato oficial do
        SemAleatório divulgado no site ou na área autenticada do aplicativo.
      </p>
      <p className="text-slate-500">
        Consulte também os{' '}
        <Link to="/termos" className="font-medium text-primary hover:underline">
          Termos de Serviço
        </Link>
        .
      </p>
    </LegalPageShell>
  )
}
