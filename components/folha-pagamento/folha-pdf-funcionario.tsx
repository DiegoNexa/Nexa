import { Document, Page, Text, View } from "@react-pdf/renderer";
import { pdfStyles as s, COLORS } from "./pdf-styles";
import {
  BRL,
  formatarDataBR,
  quebrarPalavrasLongas,
  type FolhaResumo,
} from "@/lib/folha-pagamento";

type Props = {
  nomeSalao: string;
  folha:     FolhaResumo;
};

/**
 * PDF do funcionário — visão simples, recibo de pagamento.
 *
 * Foco: "Quanto vou receber e por quê".
 * Não expõe:
 *   - Preço bruto do serviço
 *   - Margem do salão
 *   - Detalhamento por movimento (apenas o valor agregado descontado)
 *
 * Exibe:
 *   - Lista de atendimentos com a data, serviço e valor já calculado
 *     da comissão recebida
 *   - Linha agregada de descontos e bônus
 *   - Total líquido em destaque
 *   - Linha de assinatura única (recibo)
 */
export function FolhaPdfFuncionario({ nomeSalao, folha }: Props) {
  const { profissional, periodo, atendimentos, totais } = folha;

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
          <Text style={s.titleLabel}>Recibo de pagamento</Text>
          <Text style={s.title}>{profissional.nome}</Text>
          <Text style={s.subtitle}>{periodo.label}</Text>
        </View>

        {/* Atendimentos */}
        <Text style={s.sectionTitle}>Atendimentos realizados</Text>

        {atendimentos.length === 0 ? (
          <View style={s.tableRow}>
            <Text style={s.muted}>Nenhum atendimento concluído no período.</Text>
          </View>
        ) : (
          <View>
            <View style={s.tableHead}>
              <Text style={{ flex: 1 }}>Data</Text>
              <Text style={{ flex: 2 }}>Serviço</Text>
              <Text style={[{ flex: 1.2 }, s.right]}>Comissão</Text>
            </View>

            {atendimentos.map((a) => (
              <View key={a.id} style={s.tableRow}>
                <View style={{ flex: 1, paddingRight: 4 }}>
                  <Text>{formatarDataBR(a.data_hora_inicio)}</Text>
                </View>
                <View style={{ flex: 2, paddingRight: 4 }}>
                  <Text>{quebrarPalavrasLongas(a.servico_nome)}</Text>
                </View>
                <Text style={[{ flex: 1.2 }, s.right, s.bold]}>{BRL.format(a.comissao_valor)}</Text>
              </View>
            ))}

            <View style={s.tableTotalRow}>
              <Text style={{ flex: 3 }}>SUBTOTAL DE COMISSÕES</Text>
              <Text style={[{ flex: 1.2 }, s.right]}>{BRL.format(totais.comissao_bruta)}</Text>
            </View>
          </View>
        )}

        {/* Outros valores — versão agregada */}
        {(totais.descontos > 0 || totais.bonus > 0) && (
          <>
            <Text style={s.sectionTitle}>Outros valores</Text>

            {totais.descontos > 0 && (
              <View style={s.rowBetween}>
                <Text>Descontos (vales, adiantamentos e demais)</Text>
                <Text style={[s.bold, s.error]}>− {BRL.format(totais.descontos)}</Text>
              </View>
            )}

            {totais.bonus > 0 && (
              <View style={s.rowBetween}>
                <Text>Bônus</Text>
                <Text style={[s.bold, s.success]}>+ {BRL.format(totais.bonus)}</Text>
              </View>
            )}
          </>
        )}

        {/* Composição final: salário + adicionais */}
        <Text style={s.sectionTitle}>Composição do pagamento</Text>
        <View style={s.rowBetween}>
          <Text>Salário fixo do mês</Text>
          <Text style={s.bold}>{BRL.format(totais.salario_fixo)}</Text>
        </View>
        <View style={s.rowBetween}>
          <Text>+ Movimentos adicionais (comissão + bônus − descontos)</Text>
          <Text style={s.bold}>{BRL.format(totais.movimentos_adicionais)}</Text>
        </View>

        {/* Resumo do líquido */}
        <View style={s.resumoBox}>
          <Text style={s.resumoLabel}>Total líquido a receber</Text>
          <Text style={s.resumoValor}>{BRL.format(totais.liquido)}</Text>
        </View>

        {/* Assinatura — recibo */}
        <View style={s.assinatura}>
          <View style={s.assinaturaBox}>
            <View style={s.assinaturaLinha} />
            <Text style={s.assinaturaLabel}>{profissional.nome}</Text>
            <Text style={[s.assinaturaLabel, s.small]}>Recebido em ____ / ____ / ________</Text>
          </View>
        </View>

        <Text style={s.footer} fixed>
          Nexa · Gestão inteligente para salões de beleza
        </Text>
      </Page>
    </Document>
  );
}
