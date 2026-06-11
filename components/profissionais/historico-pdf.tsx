import { Document, Page, Text, View } from "@react-pdf/renderer";
import { pdfStyles as s } from "@/components/folha-pagamento/pdf-styles";
import {
  BRL,
  formatarDataBR,
  formatarDataHoraBR,
  quebrarPalavrasLongas,
  TIPO_LABEL,
  type HistoricoCompleto,
} from "@/lib/folha-pagamento";

type Props = {
  nomeSalao: string;
  historico: HistoricoCompleto;
};

/**
 * PDF de Histórico no Salão.
 *
 * Documento completo de carreira do profissional. Útil em:
 *   - Demissão (entregar pro profissional como histórico)
 *   - Acordo pra cálculo de rescisão
 *   - Pedido do próprio profissional pra arquivo pessoal
 *
 * Estrutura em 3 páginas:
 *   Pág 1: Identificação + estatísticas + resumo financeiro
 *   Pág 2: Lista completa de atendimentos
 *   Pág 3: Movimentos da folha + assinaturas
 */
export function HistoricoPdf({ nomeSalao, historico }: Props) {
  const { profissional, periodo, atendimentos, movimentos, totais, estatisticas } = historico;

  return (
    <Document>
      {/* ────────────── PÁGINA 1: RESUMO ────────────── */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.headerBrand}>Nexa</Text>
          <View>
            <Text style={s.headerMeta}>{nomeSalao}</Text>
            <Text style={s.headerMeta}>Emitido em {formatarDataBR(new Date().toISOString())}</Text>
          </View>
        </View>

        <View style={s.titleBlock}>
          <Text style={s.titleLabel}>Histórico no salão</Text>
          <Text style={s.title}>{profissional.nome}</Text>
          <Text style={s.subtitle}>
            {periodo.labelDataInicio} até {periodo.labelDataFim} · {periodo.diasNoSalao} dias trabalhados
          </Text>
        </View>

        <Text style={s.sectionTitle}>Dados do profissional</Text>
        <View style={s.rowBetween}>
          <Text>Nome completo</Text>
          <Text style={s.bold}>{profissional.nome}</Text>
        </View>
        {profissional.telefone && (
          <View style={s.rowBetween}>
            <Text>Telefone</Text>
            <Text style={s.bold}>{profissional.telefone}</Text>
          </View>
        )}
        <View style={s.rowBetween}>
          <Text>Data de admissão</Text>
          <Text style={s.bold}>{periodo.labelDataInicio}</Text>
        </View>
        <View style={s.rowBetween}>
          <Text>Período coberto neste relatório</Text>
          <Text style={s.bold}>
            {periodo.diasNoSalao} dias ({periodo.mesesNoSalao} meses)
          </Text>
        </View>
        <View style={s.rowBetween}>
          <Text>Comissão padrão configurada</Text>
          <Text style={s.bold}>{profissional.comissao_padrao}%</Text>
        </View>
        <View style={s.rowBetween}>
          <Text>Salário fixo mensal</Text>
          <Text style={s.bold}>{BRL.format(totais.salario_fixo_mensal)}</Text>
        </View>

        <Text style={s.sectionTitle}>Estatísticas de carreira</Text>
        <View style={s.rowBetween}>
          <Text>Total de atendimentos concluídos</Text>
          <Text style={s.bold}>{estatisticas.total_atendimentos}</Text>
        </View>
        <View style={s.rowBetween}>
          <Text>Média de atendimentos por mês</Text>
          <Text style={s.bold}>{estatisticas.media_atendimentos_mes}</Text>
        </View>
        <View style={s.rowBetween}>
          <Text>Ticket médio (preço médio por atendimento)</Text>
          <Text style={s.bold}>{BRL.format(estatisticas.ticket_medio)}</Text>
        </View>
        <View style={s.rowBetween}>
          <Text>Comissão média por atendimento</Text>
          <Text style={s.bold}>{BRL.format(estatisticas.comissao_media)}</Text>
        </View>

        <Text style={s.sectionTitle}>Resumo financeiro acumulado</Text>
        <View style={s.rowBetween}>
          <Text>
            Salário fixo total{" "}
            {totais.salario_fixo_mensal > 0
              ? `(${BRL.format(totais.salario_fixo_mensal)} × ${periodo.mesesNoSalao} meses)`
              : "(sem salário fixo)"}
          </Text>
          <Text style={s.bold}>{BRL.format(totais.salario_fixo_total)}</Text>
        </View>
        <View style={s.rowBetween}>
          <Text>(+) Comissões dos atendimentos</Text>
          <Text style={s.bold}>{BRL.format(totais.comissao_bruta_total)}</Text>
        </View>
        <View style={s.rowBetween}>
          <Text>(−) Descontos (vales, adiantamentos, descontos)</Text>
          <Text style={[s.bold, s.error]}>− {BRL.format(totais.descontos_total)}</Text>
        </View>
        <View style={s.rowBetween}>
          <Text>(+) Bônus</Text>
          <Text style={[s.bold, s.success]}>+ {BRL.format(totais.bonus_total)}</Text>
        </View>

        <View style={s.resumoBox}>
          <Text style={s.resumoLabel}>Total recebido durante todo o período</Text>
          <Text style={s.resumoValor}>{BRL.format(totais.total_recebido)}</Text>
        </View>

        <Text style={s.footer} fixed>
          {profissional.nome} · Histórico no salão · {nomeSalao}
        </Text>
      </Page>

      {/* ────────────── PÁGINA 2: ATENDIMENTOS ────────────── */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.headerBrand}>Nexa</Text>
          <View>
            <Text style={s.headerMeta}>{nomeSalao}</Text>
            <Text style={s.headerMeta}>{profissional.nome}</Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>
          Detalhamento dos atendimentos ({atendimentos.length})
        </Text>

        {atendimentos.length === 0 ? (
          <View style={s.tableRow}>
            <Text style={s.muted}>Nenhum atendimento concluído no período.</Text>
          </View>
        ) : (
          <View>
            <View style={s.tableHead}>
              <Text style={{ flex: 1.2 }}>Data/Hora</Text>
              <Text style={{ flex: 1.5 }}>Cliente</Text>
              <Text style={{ flex: 1.5 }}>Serviço</Text>
              <Text style={[{ flex: 0.8 }, s.right]}>Preço</Text>
              <Text style={[{ flex: 0.6 }, s.right]}>%</Text>
              <Text style={[{ flex: 1 }, s.right]}>Comissão</Text>
            </View>

            {atendimentos.map((a) => (
              <View key={a.id} style={s.tableRow}>
                <View style={{ flex: 1.2, paddingRight: 4 }}>
                  <Text style={s.small}>{formatarDataHoraBR(a.data_hora_inicio)}</Text>
                </View>
                <View style={{ flex: 1.5, paddingRight: 4 }}>
                  <Text>{quebrarPalavrasLongas(a.cliente_nome)}</Text>
                </View>
                <View style={{ flex: 1.5, paddingRight: 4 }}>
                  <Text>{quebrarPalavrasLongas(a.servico_nome)}</Text>
                </View>
                <Text style={[{ flex: 0.8 }, s.right]}>{BRL.format(a.servico_preco)}</Text>
                <Text style={[{ flex: 0.6 }, s.right]}>{a.percentual}%</Text>
                <Text style={[{ flex: 1 }, s.right, s.bold]}>{BRL.format(a.comissao_valor)}</Text>
              </View>
            ))}

            <View style={s.tableTotalRow}>
              <Text style={{ flex: 5.6 }}>SUBTOTAL DE COMISSÕES</Text>
              <Text style={[{ flex: 1 }, s.right]}>{BRL.format(totais.comissao_bruta_total)}</Text>
            </View>
          </View>
        )}

        <Text style={s.footer} fixed>
          {profissional.nome} · Histórico no salão · {nomeSalao}
        </Text>
      </Page>

      {/* ────────────── PÁGINA 3: MOVIMENTOS + ASSINATURAS ────────────── */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.headerBrand}>Nexa</Text>
          <View>
            <Text style={s.headerMeta}>{nomeSalao}</Text>
            <Text style={s.headerMeta}>{profissional.nome}</Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>
          Detalhamento dos movimentos da folha ({movimentos.length})
        </Text>

        {movimentos.length === 0 ? (
          <View style={s.tableRow}>
            <Text style={s.muted}>Nenhum movimento registrado durante o período.</Text>
          </View>
        ) : (
          <View>
            <View style={s.tableHead}>
              <Text style={{ flex: 0.9 }}>Data</Text>
              <Text style={{ flex: 1 }}>Tipo</Text>
              <Text style={{ flex: 2.5 }}>Descrição</Text>
              <Text style={[{ flex: 1 }, s.right]}>Valor</Text>
            </View>

            {movimentos.map((m) => {
              const isBonus = m.tipo === "bonus";
              return (
                <View key={m.id} style={s.tableRow}>
                  <View style={{ flex: 0.9, paddingRight: 4 }}>
                    <Text style={s.small}>{formatarDataBR(m.data_movimento)}</Text>
                  </View>
                  <View style={{ flex: 1, paddingRight: 4 }}>
                    <Text>{TIPO_LABEL[m.tipo]}</Text>
                  </View>
                  <View style={{ flex: 2.5, paddingRight: 4 }}>
                    <Text>{quebrarPalavrasLongas(m.descricao)}</Text>
                  </View>
                  <Text style={[{ flex: 1 }, s.right, s.bold, isBonus ? s.success : s.error]}>
                    {isBonus ? "+ " : "− "}{BRL.format(Number(m.valor))}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={s.assinatura}>
          <View style={s.assinaturaBox}>
            <View style={s.assinaturaLinha} />
            <Text style={s.assinaturaLabel}>Empregador</Text>
            <Text style={[s.assinaturaLabel, s.small]}>{nomeSalao}</Text>
          </View>
          <View style={s.assinaturaBox}>
            <View style={s.assinaturaLinha} />
            <Text style={s.assinaturaLabel}>{profissional.nome}</Text>
            <Text style={[s.assinaturaLabel, s.small]}>Recebi e confirmo</Text>
          </View>
        </View>

        <Text style={s.footer} fixed>
          {profissional.nome} · Histórico no salão · {nomeSalao} · Documento gerado pela Nexa
        </Text>
      </Page>
    </Document>
  );
}
