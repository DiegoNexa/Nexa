import { StyleSheet } from "@react-pdf/renderer";

/**
 * Estilos compartilhados entre os dois templates de PDF.
 *
 * Paleta neutra e profissional — não usa o gradiente dourado da UI
 * porque PDF é documento formal. Mantém apenas o accent gold como
 * cor de assinatura/destaque.
 */
export const COLORS = {
  background:  "#FFFFFF",
  text:        "#1D1A05",
  textMuted:   "#6B6B6B",
  border:      "#E5E5E5",
  accent:      "#C89933",
  accentLight: "#F5E8C5",
  error:       "#B91C1C",
  success:     "#15803D",
};

export const pdfStyles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.background,
    color:           COLORS.text,
    padding:         32,
    fontSize:        10,
    fontFamily:      "Helvetica",
  },

  // Cabeçalho
  header: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "flex-end",
    marginBottom:   16,
    paddingBottom:  12,
    borderBottom:   `2 solid ${COLORS.accent}`,
  },
  headerBrand: {
    fontSize:   18,
    fontWeight: 700,
    color:      COLORS.accent,
  },
  headerMeta: {
    fontSize: 9,
    color:    COLORS.textMuted,
    textAlign: "right",
  },

  // Título do documento
  titleBlock: { marginBottom: 18 },
  titleLabel: {
    fontSize:      8,
    letterSpacing: 2,
    textTransform: "uppercase",
    color:         COLORS.textMuted,
    marginBottom:  2,
  },
  title: {
    fontSize:   20,
    fontWeight: 700,
    color:      COLORS.text,
  },
  subtitle: {
    fontSize:  11,
    color:     COLORS.textMuted,
    marginTop: 4,
  },

  // Seções
  sectionTitle: {
    fontSize:      9,
    fontWeight:    700,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color:         COLORS.textMuted,
    marginBottom:  6,
    marginTop:     14,
  },

  // Tabelas
  tableHead: {
    flexDirection:    "row",
    backgroundColor:  "#F5F5F5",
    paddingVertical:  6,
    paddingHorizontal: 8,
    fontSize:         8,
    fontWeight:       700,
    textTransform:    "uppercase",
    letterSpacing:    0.8,
    color:            COLORS.textMuted,
  },
  tableRow: {
    flexDirection:    "row",
    alignItems:       "flex-start",
    paddingVertical:  8,
    paddingHorizontal: 8,
    borderBottom:     `1 solid ${COLORS.border}`,
    fontSize:         9,
  },
  tableTotalRow: {
    flexDirection:    "row",
    paddingVertical:  8,
    paddingHorizontal: 8,
    backgroundColor:  COLORS.accentLight,
    fontWeight:       700,
    fontSize:         10,
    marginTop:        4,
  },

  // Resumo final destacado
  resumoBox: {
    marginTop:        16,
    padding:          14,
    backgroundColor:  COLORS.accentLight,
    borderRadius:     4,
    border:           `1 solid ${COLORS.accent}`,
  },
  resumoLabel: {
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  resumoValor: {
    fontSize:   20,
    fontWeight: 700,
    color:      COLORS.accent,
  },

  // Linha de assinatura
  assinatura: {
    marginTop:    30,
    paddingTop:   24,
    borderTop:    `1 solid ${COLORS.border}`,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  assinaturaBox: {
    width:      "40%",
    textAlign:  "center",
  },
  assinaturaLinha: {
    borderTop:    `1 solid ${COLORS.text}`,
    marginBottom: 4,
    paddingTop:   30,
  },
  assinaturaLabel: {
    fontSize:    9,
    color:       COLORS.textMuted,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom:   24,
    left:     32,
    right:    32,
    fontSize: 8,
    color:    COLORS.textMuted,
    textAlign: "center",
    borderTop: `1 solid ${COLORS.border}`,
    paddingTop: 8,
  },

  // Utilitários
  rowBetween: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
    marginVertical: 3,
  },
  bold:    { fontWeight: 700 },
  muted:   { color: COLORS.textMuted },
  small:   { fontSize: 8 },
  right:   { textAlign: "right" },
  error:   { color: COLORS.error },
  success: { color: COLORS.success },
});
