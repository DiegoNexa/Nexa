\# PRD — Nexa

Product Requirements Document

Versão 1.2 | Maio 2026



\---



\## 1. Visão Geral



Nexa é um SaaS B2B de gestão para serviços de beleza, criado para

centralizar agenda, clientes, estoque e finanças em uma única

plataforma, com IA integrada ao WhatsApp para agendamento automático.



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



\## 4. Os 5 Pilares do Nexa



1\. Agenda inteligente

2\. WhatsApp com IA para agendamento automático

3\. Gestão de estoque com lembretes via site

4\. Avisos aos clientes para manter frequência

5\. Gestão financeira completa



\---



\## 5. Funcionalidades



5.1 Agenda

\- Visualização por dia, semana e mês

\- Criação de agendamento manual

\- Link público de agendamento online (nexa.com.br/agendar/[slug-do-salao])

\- Status: agendado, confirmado, concluído, cancelado, falta



5.2 WhatsApp com IA

\- Cliente manda mensagem no WhatsApp do salão

\- IA responde automaticamente, entende o pedido e agenda o horário

\- Integração direta com a agenda da plataforma

\- Confirmação automática enviada ao cliente

\- Lembrete automático antes do horário

\- Mensagens de reengajamento para clientes sem visita



Inteligência Artificial

A IA é processada pela Evolution API com integração nativa ao GPT

(OpenAI). O bot interpreta linguagem natural, identifica serviço,

profissional e horário desejado, e confirma o agendamento direto na

plataforma. Sem código extra na camada de IA, apenas configuração.



Integração e Progressão Técnica

Fase 1 — MVP (Evolution API)

A integração utiliza Evolution API, solução open source hospedada em

servidor próprio via Docker. Opera via emulação do WhatsApp Web,

eliminando burocracia de aprovação e custo por mensagem. Custo

estimado: R$50–100/mês de servidor, zero por mensagem. Indicado para

validação do produto e primeiros clientes.



Fase 2 — Escala (Meta Cloud API)

Com o produto validado, a integração migra para a Meta Cloud API

oficial. A transição é realizada na camada de configuração do

Evolution API, sem reescrita de código. Elimina o risco de ban de

contas e garante estabilidade em escala. Custo estimado por salão:

R$15–40/mês considerando lembretes (utilidade, ~R$0,05/msg) e

reengajamento (marketing, ~R$0,35/msg). Mensagens iniciadas pelo

cliente dentro da janela de 24h são gratuitas.



5.3 Gestão de Estoque

\- Cadastro de produtos com quantidade mínima

\- Baixa automática de estoque ao registrar serviço

\- Alerta no site quando produto atingir quantidade mínima

\- Histórico de consumo por produto



5.4 Gestão de Funcionários

\- Cadastro de profissional com nome e telefone

\- Definição de carga horária por dia da semana

\- Comissão configurável por profissional e por serviço

\- Visualização de agenda individual por profissional

\- Extrato de comissões gerado automaticamente por período



5.5 Avisos aos Clientes

\- Identificar clientes sem visita há X dias

\- Envio automático de mensagem de retorno via WhatsApp

\- Mensagem de aniversário automática

\- Templates simples com variáveis de nome e data

\- Cliente pode responder e o salão recebe no WhatsApp normalmente



5.6 Gestão Financeira

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

\- Agenda, WhatsApp IA, lembretes, avisos de retorno

\- Gestão de estoque básica

\- Relatórios básicos

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



\- Como autônoma, quero que meus clientes consigam agendar pelo

&#x20; WhatsApp sem eu precisar responder.

\- Como autônoma, quero receber um alerta quando meu produto

&#x20; estiver acabando.

\- Como dono de salão, quero que o sistema avise automaticamente

&#x20; clientes que sumiram.

\- Como dono de salão, quero ver o faturamento e comissões de

&#x20; cada profissional no mês.

\- Como cliente, quero receber confirmação e lembrete do meu

&#x20; horário pelo WhatsApp.



\---



\## 9. Fora do Escopo (v1.0)



\- App mobile nativo

\- Integração com maquininhas de cartão

\- Sistema de fidelidade/pontos

\- Emissão de nota fiscal

