import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { QuotationVersion } from '../../types';
import { Letterhead } from './Letterhead';
import { commonStyles } from './shared';

interface Props {
  quotation: QuotationVersion;
}

/**
 * Type D - the free-form "letter-pad" quotation.
 *
 * Reproduces the quotation the client writes by hand: a table whose columns he
 * names and whose rows he fills freely, a free summary line (e.g. the built-up
 * area * rate), then a payment schedule with a percentage/amount split and a
 * 100% total, and a signature footer. Nothing here is computed - every cell is
 * his text - which is the whole point of this type.
 */
export function TypeDFreeformPDF({ quotation }: Props) {
  const isTa = quotation.language === 'ta';
  const fontFamily = isTa ? 'NotoSansTamil' : undefined;

  const columns = quotation.freeformColumns || [];
  const rows = quotation.freeformRows || [];
  const schedule = quotation.paymentSchedule || [];
  const scheduleTotal = schedule.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const schedulePct = schedule.reduce((s, r) => s + (Number(r.percentage) || 0), 0);

  // Even column widths across the page, but let the first column be wider since
  // it's usually the description.
  const colWidth = (idx: number) => {
    if (columns.length <= 1) return '100%';
    const firstShare = 46;
    if (idx === 0) return `${firstShare}%`;
    return `${(100 - firstShare) / (columns.length - 1)}%`;
  };

  return (
    <Document>
      <Page size="A4" style={{ ...commonStyles.page, fontFamily }}>
        <Letterhead settings={quotation.companySnapshot} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <View>
            <Text style={{ fontSize: 10, fontFamily }}>Client Name : {quotation.clientName}</Text>
            <Text style={{ fontSize: 10, fontFamily }}>Place : {quotation.siteName}</Text>
          </View>
          <Text style={{ fontSize: 10, fontFamily }}>Date : {new Date(quotation.date).toLocaleDateString('en-GB')}</Text>
        </View>

        {quotation.subject ? (
          <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 8, fontFamily }}>{quotation.subject}</Text>
        ) : null}

        {quotation.freeformTitle ? (
          <Text style={{ ...commonStyles.title, fontFamily }}>{quotation.freeformTitle}</Text>
        ) : null}

        {/* Free-form table */}
        {columns.length > 0 && (
          <View style={[commonStyles.table, { marginBottom: 12 }]}>
            <View style={[commonStyles.tableRow, commonStyles.tableHeader]}>
              {columns.map((c, idx) => (
                <View key={c.id} style={[commonStyles.tableCol, { width: colWidth(idx) }]}>
                  <Text style={{ ...commonStyles.tableCell, textAlign: c.align || (idx === 0 ? 'left' : 'right') }}>{c.name}</Text>
                </View>
              ))}
            </View>
            {rows.map(row => (
              <View key={row.id} style={commonStyles.tableRow}>
                {columns.map((c, idx) => (
                  <View key={c.id} style={[commonStyles.tableCol, { width: colWidth(idx) }]}>
                    <Text style={{ ...commonStyles.tableCell, fontFamily, textAlign: c.align || (idx === 0 ? 'left' : 'right') }}>
                      {row.cells?.[c.id] || ''}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {quotation.freeformSummary ? (
          <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 12, fontFamily }}>{quotation.freeformSummary}</Text>
        ) : null}

        {/* Payment schedule */}
        {schedule.length > 0 && (
          <>
            <Text style={{ fontSize: 12, fontWeight: 'bold', textAlign: 'center', marginBottom: 6, fontFamily }}>PAYMENT SCHEDULE</Text>
            <View style={commonStyles.table}>
              <View style={[commonStyles.tableRow, commonStyles.tableHeader]}>
                <View style={[commonStyles.tableCol, { width: '12%' }]}><Text style={commonStyles.tableCell}>Sl No.</Text></View>
                <View style={[commonStyles.tableCol, { width: '58%' }]}><Text style={commonStyles.tableCell}>Description of Work</Text></View>
                <View style={[commonStyles.tableCol, { width: '15%' }]}><Text style={commonStyles.tableCell}>Percentage</Text></View>
                <View style={[commonStyles.tableCol, { width: '15%' }]}><Text style={commonStyles.tableCell}>Amount</Text></View>
              </View>
              {schedule.map((r, idx) => (
                <View key={r.id} style={commonStyles.tableRow}>
                  <View style={[commonStyles.tableCol, { width: '12%' }]}><Text style={commonStyles.tableCell}>{idx + 1}</Text></View>
                  <View style={[commonStyles.tableCol, { width: '58%' }]}><Text style={{ ...commonStyles.tableCell, fontFamily }}>{r.description}</Text></View>
                  <View style={[commonStyles.tableCol, { width: '15%' }]}><Text style={commonStyles.tableCell}>{r.percentage}%</Text></View>
                  <View style={[commonStyles.tableCol, { width: '15%' }]}><Text style={commonStyles.tableCell}>{(Number(r.amount) || 0).toLocaleString('en-IN')}</Text></View>
                </View>
              ))}
              <View style={[commonStyles.tableRow, { backgroundColor: '#f0f0f0' }]}>
                <View style={[commonStyles.tableCol, { width: '70%' }]}><Text style={{ ...commonStyles.tableCell, fontWeight: 'bold', textAlign: 'right' }}>Total</Text></View>
                <View style={[commonStyles.tableCol, { width: '15%' }]}><Text style={{ ...commonStyles.tableCell, fontWeight: 'bold' }}>{schedulePct}%</Text></View>
                <View style={[commonStyles.tableCol, { width: '15%' }]}><Text style={{ ...commonStyles.tableCell, fontWeight: 'bold' }}>{scheduleTotal.toLocaleString('en-IN')}</Text></View>
              </View>
            </View>
          </>
        )}

        {quotation.notes ? (
          <View style={{ marginTop: 14 }}>
            <Text style={{ fontSize: 10, lineHeight: 1.5, fontFamily }}>{quotation.notes}</Text>
          </View>
        ) : null}

        {/* Signature footer */}
        <View style={{ marginTop: 30 }}>
          <Text style={{ fontSize: 10, fontFamily }}>Thanks and Regards,</Text>
          {quotation.showOwnerSignature && quotation.companySnapshot.signatureUrl && (
            <Image src={quotation.companySnapshot.signatureUrl} style={{ width: 120, height: 45, objectFit: 'contain', marginTop: 6 }} />
          )}
          <Text style={{ fontSize: 10, fontWeight: 'bold', marginTop: quotation.showOwnerSignature && quotation.companySnapshot.signatureUrl ? 2 : 30, fontFamily }}>
            ({quotation.companySnapshot.proprietor || quotation.companySnapshot.name})
          </Text>
        </View>

        <Text style={commonStyles.footer}>Generated by Deepthi Construction CRM - {quotation.quotationNumber}</Text>
      </Page>
    </Document>
  );
}
