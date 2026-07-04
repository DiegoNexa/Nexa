import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/legal-layout";

export const metadata: Metadata = {
  title: "Política de Privacidade · Nexa",
  description: "Como a Nexa coleta, usa e protege os dados na plataforma de gestão para salões.",
};

export default function PrivacidadePage() {
  return (
    <LegalLayout titulo="Política de Privacidade" atualizadoEm="1 de julho de 2026">
      <p>
        Esta Política descreve como a Nexa trata os dados pessoais na sua plataforma de
        gestão para salões e barbearias, em conformidade com a Lei Geral de Proteção de
        Dados (LGPD - Lei nº 13.709/2018).
      </p>

      <h2>1. Dados que coletamos</h2>
      <p>
        <strong>Da sua conta:</strong> nome, e-mail, telefone e dados do salão.<br />
        <strong>Dos seus clientes:</strong> nome, telefone, e-mail e histórico de
        agendamentos que você cadastra.<br />
        <strong>De uso:</strong> registros técnicos de acesso necessários à segurança e
        ao funcionamento do serviço.
      </p>

      <h2>2. Como usamos os dados</h2>
      <p>
        Usamos os dados para operar a Plataforma: autenticar o acesso, gerenciar agenda,
        clientes, equipe, estoque e finanças, enviar lembretes de agendamento e prestar
        suporte. Não vendemos dados pessoais.
      </p>

      <h2>3. Papéis (LGPD)</h2>
      <p>
        Em relação aos dados dos seus clientes, o salão é o <strong>controlador</strong> e
        a Nexa é a <strong>operadora</strong>, tratando os dados apenas conforme suas
        instruções e para prestar o serviço.
      </p>

      <h2>4. Compartilhamento</h2>
      <p>
        Compartilhamos dados apenas com fornecedores essenciais à operação (por exemplo,
        hospedagem em nuvem e envio de e-mails), que atuam sob obrigações de segurança e
        confidencialidade.
      </p>

      <h2>5. Segurança</h2>
      <p>
        Adotamos medidas técnicas para proteger os dados, incluindo isolamento por
        estabelecimento, controle de acesso e criptografia em trânsito. Nenhum sistema é
        100% imune, mas trabalhamos para reduzir riscos.
      </p>

      <h2>6. Retenção</h2>
      <p>
        Mantemos os dados enquanto a conta estiver ativa e pelo prazo necessário para
        cumprir obrigações legais. Após o encerramento, os dados podem ser excluídos ou
        anonimizados.
      </p>

      <h2>7. Seus direitos</h2>
      <p>
        Você e os titulares dos dados podem solicitar acesso, correção, portabilidade ou
        exclusão dos dados pessoais, conforme a LGPD, pelos canais de suporte.
      </p>

      <h2>8. Lembretes por e-mail</h2>
      <p>
        Quando o cliente informa o e-mail no agendamento, ele pode receber um lembrete do
        horário. O envio é feito exclusivamente para essa finalidade.
      </p>

      <h2>9. Contato</h2>
      <p>
        Para exercer direitos ou tirar dúvidas sobre privacidade, utilize o canal de
        suporte informado na Plataforma.
      </p>
    </LegalLayout>
  );
}
