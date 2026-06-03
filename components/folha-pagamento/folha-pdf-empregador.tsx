import { Document, Page, Text, View } from "@react-pdf/renderer";
import { pdfStyles as s, COLORS } from "./pdf-styles";
import {
  BRL,
  formatarDataBR,
  formatarDataHoraBR,
  TIPO_LABEL,
  quebrarPalavrasLongas,
  type FolhaResumo,
} from "@/lib/folha-pagamento";

type Props = {
  nomeSalao: string;
  folha:     FolhaResumo;
};

/**
 * PDF do empregador — visão completa para arquivo/contabilidade.
 *
 * Exibe:
 *   - Tabela detalhada de atendimentos com cliente, preço bruto,
 *     % aplicado, comissão paga e margem do salão
 *   - Cada movimento da folha individualmente (não agregado)
 *   - Breakdown: bruto → descontos → bônus → líquido
 *   - Linhas de assinatura: 1ª via empregador + 2ª via funcionário
 *
 * Esconde do funcionário (que tem o outro PDF):
 *   - Margem do salão
 *   - Preço bruto cobrado do cliente
 *   - Detalhamento por vale/desconto
 */
export function FolhaPdfEmpregador({ nomeSalao, folha }: Props) {
  const { profissional, periodo, atendimentos, movimentos, totais } = folha;

  const margemSalao = atendimentos.reduce(
    (s, a) => s + (a.servico_preco - a.comissao_valor),
    0,
  );

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Cabeçalho */}
        <View style={s.header}>
          <Text style={s.headerBrand}>Nexa</Text>
          <View>
            <Text style={s.headerMeta}>{nomeSalao}</Text>
            <Text style={s.headerMeta}>Emitido em {formatarDataBR(new Date().toISOString())}</Text>
          </View>
        </View>

        {/* Título */}
        <View style={s.titleBlock}>
          <Text style={s.titleLabel}>Folha de pagamento — Empregador</Text>
          <Text style={s.title}>{profissional.nome}</Text>
          <Text style={s.subtitle}>
            {periodo.label} · Comissão padrão {profissional.comissao_padrao}%
          </Text>
        </View>

        {/* Atendimentos detalhados */}
        <Text style={s.sectionTitle}>Atendimentos detalhados</Text>

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
              <Text style={[{ flex: 0.9 }, s.right]}>Comissão</Text>
              <Text style={[{ flex: 0.9 }, s.right]}>Salão</Text>
            </View>

            {atendimentos.map((a) => {
              const margem = a.servico_preco - a.comissao_valor;
              return (
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
                  <Text style={[{ flex: 0.9 }, s.right, s.bold]}>{BRL.format(a.comissao_valor)}</Text>
                  <Text style={[{ flex: 0.9 }, s.right, s.muted]}>{BRL.format(margem)}</Text>
                </View>
              );
            })}

            <View style={s.tableTotalRow}>
              <Text style={{ flex: 5 }}>SUBTOTAIS</Text>
              <Text style={[{ flex: 0.9 }, s.right]}>{BRL.format(totais.comissao_bruta)}</Text>
              <Text style={[{ flex: 0.9 }, s.right]}>{BRL.format(margemSalao)}</Text>
            </View>
          </View>
        )}

        {/* Movimentos detalhados */}
        <Text style={s.sectionTitle}>Movimentos da folha</Text>

        {movimentos.length === 0 ? (
          <View style={s.tableRow}>
            <Text style={s.muted}>Nenhum movimento neste período.</Text>
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
                  <Text
                    style={[{ flex: 1 }, s.right, s.bold, isBonus ? s.success : s.error]}
                  >
                    {isBonus ? "+ " : "− "}{BRL.format(Number(m.valor))}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Breakdown final */}
        <View style={{ marginTop: 18 }}>
          <View style={s.rowBetween}>
            <Text>Comissões brutas dos atendimentos</Text>
            <Text style={s.bold}>{BRL.format(totais.comissao_bruta)}</Text>
          </View>
          <View style={s.rowBetween}>
            <Text>(−) Descontos (vales + adiantamentos + descontos)</Text>
            <Text style={[s.bold, s.error]}>− {BRL.format(totais.descontos)}</Text>
          </View>
          <View style={s.rowBetween}>
            <Text>(+) Bônus</Text>
            <Text style={[s.bold, s.success]}>+ {BRL.format(totais.bonus)}</Text>
          </View>
          <View style={[s.rowBetween, { marginTop: 6, paddingTop: 6, borderTop: `1 solid ${COLORS.border}` }]}>
            <Text style={s.bold}>= Movimentos adicionais</Text>
            <Text style={s.bold}>{BRL.format(totais.movimentos_adicionais)}</Text>
          </View>
          <View style={[s.rowBetween, { marginTop: 4 }]}>
            <Text>(+) Salário fixo do mês</Text>
            <Text style={s.bold}>{BRL.format(totais.salario_fixo)}</Text>
          </View>
        </View>

        <View style={s.resumoBox}>
          <Text style={s.resumoLabel}>Total líquido a pagar (salário + adicionais)</Text>
          <Text style={s.resumoValor}>{BRL.format(totais.liquido)}</Text>
        </View>

        {/* Assinaturas — duas vias */}
        <View style={s.assinatura}>
          <View style={s.assinaturaBox}>
            <View style={s.assinaturaLinha} />
            <Text style={s.assinaturaLabel}>Empregador</Text>
            <Text style={[s.assinaturaLabel, s.small]}>{nomeSalao}</Text>
          </View>
          <View style={s.assinaturaBox}>
            <View style={s.assinaturaLinha} />
            <Text style={s.assinaturaLabel}>{profissional.nome}</Text>
            <Text style={[s.assinaturaLabel, s.small]}>Profissional</Text>
          </View>
        </View>

        <Text style={s.footer} fixed>
          Documento gerado pela plataforma Nexa · 1ª via Empregador / 2ª via Funcionário
        </Text>
      </Page>
    </Document>
  );
}
