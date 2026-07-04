import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/legal-layout";

export const metadata: Metadata = {
  title: "Termos de Uso · Nexa",
  description: "Termos de Uso da plataforma Nexa de gestão para salões e barbearias.",
};

export default function TermosPage() {
  return (
    <LegalLayout titulo="Termos de Uso" atualizadoEm="1 de julho de 2026">
      <p>
        Estes Termos de Uso regulam o acesso e a utilização da plataforma Nexa
        (&quot;Plataforma&quot;), um sistema de gestão para salões de beleza e barbearias.
        Ao criar uma conta, você declara ter lido e concordado com estes termos.
      </p>

      <h2>1. Cadastro e conta</h2>
      <p>
        Para usar a Plataforma é necessário criar uma conta com informações verdadeiras
        e atualizadas. Você é responsável por manter a confidencialidade das suas
        credenciais e por toda atividade realizada na sua conta.
      </p>

      <h2>2. Uso da plataforma</h2>
      <p>
        A Nexa concede a você uma licença limitada, não exclusiva e intransferível para
        usar a Plataforma na gestão do seu negócio. Você concorda em não utilizá-la para
        fins ilícitos, nem tentar acessar dados de outros estabelecimentos.
      </p>

      <h2>3. Dados dos seus clientes</h2>
      <p>
        Ao cadastrar clientes e agendamentos, você é o controlador desses dados e
        responsável por ter base legal para tratá-los, conforme a Lei Geral de Proteção
        de Dados (LGPD). A Nexa atua como operadora, processando os dados apenas para
        prestar o serviço.
      </p>

      <h2>4. Planos e pagamento</h2>
      <p>
        Os planos, valores e período de teste vigentes são os informados na Plataforma.
        Assinaturas podem ser canceladas a qualquer momento, sem multa, produzindo efeito
        no fim do ciclo já pago.
      </p>

      <h2>5. Disponibilidade</h2>
      <p>
        Empregamos esforços razoáveis para manter a Plataforma disponível, mas ela é
        fornecida &quot;como está&quot;, sem garantia de operação ininterrupta. Manutenções
        programadas serão comunicadas quando possível.
      </p>

      <h2>6. Limitação de responsabilidade</h2>
      <p>
        Na máxima extensão permitida por lei, a Nexa não se responsabiliza por lucros
        cessantes ou danos indiretos decorrentes do uso ou da indisponibilidade da
        Plataforma.
      </p>

      <h2>7. Encerramento</h2>
      <p>
        Você pode encerrar sua conta a qualquer momento. Podemos suspender contas que
        violem estes termos. Após o encerramento, seus dados são tratados conforme a
        Política de Privacidade.
      </p>

      <h2>8. Alterações</h2>
      <p>
        Estes termos podem ser atualizados. Mudanças relevantes serão comunicadas pelos
        canais cadastrados. O uso contínuo após a alteração representa concordância.
      </p>

      <h2>9. Contato</h2>
      <p>
        Dúvidas sobre estes termos podem ser enviadas pelo canal de suporte informado na
        Plataforma.
      </p>
    </LegalLayout>
  );
}
