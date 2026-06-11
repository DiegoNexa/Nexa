\# PRD — Nexa

Product Requirements Document

Versão 1.2 | Maio 2026



\---



\## 1. Visão Geral



Nexa é um SaaS B2B de gestão para serviços de beleza, criado para

centralizar agenda, clientes, estoque, equipe e finanças em uma única

plataforma — com folha de pagamento automatizada e link público de

agendamento online.



Missão: Simplificar a vida do empresário de beleza, lidando com a

parte de contagem e gestão, mantendo-o sempre em alerta.



\---



\## 2. Problema



\- Agendamentos em cima da hora e demora de confirmação

\- Clientes sem retorno, cadeira vazia

\- Sem controle de estoque (produtos acabam sem aviso)

\- Sem controle financeiro real

\- Dificuldade para gerenciar equipe e comissões

\- Sem histórico do cliente



\---



\## 3. Público-Alvo



Persona 1 - A Autônoma

Trabalha sozinha, em casa ou alugando cadeira. Usa WhatsApp para

marcar horários manualmente. Não tem controle de estoque nem

financeiro. Quer praticidade, não complexidade.



Persona 2 - Salão de Bairro

2 a 5 profissionais. Dono acumula função de atendente e gestor.

Precisa controlar comissões da equipe. Quer reduzir faltas e

automatizar confirmações.



Persona 3 - Salão Consolidado

6 ou mais profissionais. Já tem clientela fiel. Precisa de

relatórios, metas e gestão completa. Quer profissionalizar toda

a operação.



\---



\## 4. Os 5 Pilares da Nexa (v1.0)



1\. Agenda inteligente + link público de agendamento

2\. Gestão de equipe (carga horária, comissões, salário fixo)

3\. Gestão de estoque com alertas

4\. Folha de pagamento com geração de PDF

5\. Histórico de cliente e controle financeiro



> WhatsApp com IA para agendamento automático foi planejado e

> adiado para pós-lançamento por custo operacional. Plano completo

> em [ROADMAP.md](ROADMAP.md).



\---



\## 5. Funcionalidades



5.1 Agenda

\- Visualização por dia, semana e mês

\- Criação de agendamento manual

\- Link público de agendamento online (nexa.com.br/agendar/[slug-do-salao])

\- Status: agendado, confirmado, concluído, cancelado, falta



5.2 Gestão de Estoque

\- Cadastro de produtos com quantidade mínima

\- Baixa automática de estoque ao registrar serviço

\- Alerta no site quando produto atingir quantidade mínima

\- Histórico de consumo por produto



5.3 Gestão de Funcionários

\- Cadastro de profissional com nome e telefone

\- Definição de carga horária por dia da semana

\- Comissão configurável por profissional e por serviço

\- Salário fixo opcional (CLT/mensalista)

\- Visualização de agenda individual por profissional

\- Folha de pagamento com geração de PDF (funcionário e empregador)

\- Extrato de comissões gerado automaticamente por período



5.4 Histórico de Cliente

\- Identificar clientes sem visita há X dias (dashboard)

\- Marcar aniversariantes (dashboard)

\- Última visita exibida em cada cliente

\- Total de atendimentos concluídos

\- Próximos agendamentos vinculados



5.5 Gestão Financeira

\- Receitas por agendamento e serviço

\- Registro de despesas (produtos, aluguel, etc.)

\- Comissões automáticas por profissional

\- Relatório de faturamento por período

\- Extrato por profissional



\---



\## 6. Decisões Técnicas



Multi-tenant

Todos os salões acessam a mesma interface. O isolamento de dados é

feito via Row Level Security (RLS) no Supabase — cada login acessa

exclusivamente os dados do seu salão. Sem schemas separados ou

instâncias distintas.



Cadastro de Clientes

Realizado manualmente pelo gestor ou profissional. Sem importação

automática, visto que a maioria dos salões mantém contatos apenas no

WhatsApp, sem base exportável.



\---



\## 7. Planos e Preços



Solo — R$49/mês

\- 1 profissional

\- Agenda, link público de agendamento, lembretes no dashboard

\- Histórico de cliente e marcador de aniversariantes

\- Gestão de estoque básica

\- Folha de pagamento simples

\- Suporte por email



Profissional — R$99/mês

\- Até 5 profissionais

\- Tudo do Solo

\- Gestão de equipe e comissões

\- Relatórios completos

\- Suporte por chat



Premium — R$199/mês

\- Profissionais ilimitados

\- Tudo do Profissional

\- Relatórios avançados

\- Suporte prioritário



\---



\## 8. User Stories Principais



\- Como autônoma, quero que meus clientes consigam agendar online

&#x20; sozinhos pelo link público, sem eu precisar responder mensagens.

\- Como autônoma, quero receber um alerta quando meu produto

&#x20; estiver acabando.

\- Como dono de salão, quero ver no dashboard quem sumiu há mais

&#x20; de X dias para conversar manualmente.

\- Como dono de salão, quero ver o faturamento e comissões de

&#x20; cada profissional no mês e baixar a folha em PDF.

\- Como cliente, quero acessar um link e marcar meu horário online

&#x20; sem precisar baixar app.



\---



\## 9. Fora do Escopo (v1.0)



\- WhatsApp + IA para agendamento automático (custo operacional alto — ver [ROADMAP.md](ROADMAP.md))

\- Envio automatizado de mensagens (depende de WhatsApp)

\- App mobile nativo

\- Integração com maquininhas de cartão

\- Sistema de fidelidade/pontos

\- Emissão de nota fiscal

