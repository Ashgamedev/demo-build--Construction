import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { AgreementVersion } from '../../types';
import { Letterhead } from './Letterhead';
import { commonStyles } from './shared';

interface Props {
  agreement: AgreementVersion;
}

export function AgreementPDF({ agreement }: Props) {
  const isTa = agreement.language === 'ta';
  const t = agreement.tamilTranslations || {};
  const fontFamily = isTa ? 'NotoSansTamil' : undefined;
  const onStamp = !!agreement.printOnStampPaper;

  const subject = isTa && t.subject ? t.subject : agreement.subject;
  const terms = isTa && t.termsAndConditions ? t.termsAndConditions : agreement.termsAndConditions;
  const scope = isTa && t.scopeOfWork ? t.scopeOfWork : agreement.scopeOfWork;

  // A4 is 842pt tall. Indian Rs.100 non-judicial stamp paper carries the
  // pre-printed matter across roughly the top third; 320pt gives a safe margin
  // that clears the stamp area with the printer's usual y-offset. This is only
  // applied to page one - subsequent pages spill onto plain paper.
  const stampTopReserve = 320;

  return (
    <Document>
      <Page size="A4" style={{ ...commonStyles.page, fontFamily }}>
        {onStamp ? (
          <View style={{ height: stampTopReserve }} />
        ) : (
          <Letterhead settings={agreement.companySnapshot} />
        )}

        <Text style={{ ...commonStyles.title, fontFamily }}>CONSTRUCTION AGREEMENT</Text>
        
        <View style={{ marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 10, fontFamily }}>Agreement No: {agreement.agreementNumber}</Text>
            <Text style={{ fontSize: 10, fontFamily }}>Date: {new Date(agreement.date).toLocaleDateString()}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 10, fontFamily }}>Client: {agreement.clientName}</Text>
            <Text style={{ fontSize: 10, fontFamily }}>Site: {agreement.siteName}</Text>
          </View>
        </View>
        
        <View style={{ marginBottom: 15 }}>
          <Text style={{ fontSize: 10, fontWeight: 'bold', fontFamily }}>Subject: {subject}</Text>
        </View>

        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 5, fontFamily, textDecoration: 'underline' }}>Scope of Work</Text>
          <Text style={{ fontSize: 10, lineHeight: 1.5, fontFamily }}>{scope}</Text>
        </View>

        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 5, fontFamily, textDecoration: 'underline' }}>Commercials</Text>
          <Text style={{ fontSize: 10, fontFamily }}>Total Agreed Value: Rs. {agreement.totalValue.toLocaleString()}/-</Text>
        </View>

        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 5, fontFamily, textDecoration: 'underline' }}>Payment Schedule</Text>
          
          <View style={commonStyles.table}>
            <View style={[commonStyles.tableRow, commonStyles.tableHeader]}>
              <View style={[commonStyles.tableCol, { width: '15%' }]}><Text style={commonStyles.tableCell}>Sl No.</Text></View>
              <View style={[commonStyles.tableCol, { width: '50%' }]}><Text style={commonStyles.tableCell}>Milestone / Description</Text></View>
              <View style={[commonStyles.tableCol, { width: '15%' }]}><Text style={commonStyles.tableCell}>%</Text></View>
              <View style={[commonStyles.tableCol, { width: '20%' }]}><Text style={commonStyles.tableCell}>Amount (Rs)</Text></View>
            </View>
            
            {agreement.paymentSchedule.map((milestone, idx) => {
              const mDesc = isTa && t.paymentSchedule?.[milestone.id] ? t.paymentSchedule[milestone.id] : milestone.description;
              return (
                <View key={milestone.id} style={commonStyles.tableRow}>
                  <View style={[commonStyles.tableCol, { width: '15%' }]}><Text style={commonStyles.tableCell}>{idx + 1}</Text></View>
                  <View style={[commonStyles.tableCol, { width: '50%' }]}><Text style={{ ...commonStyles.tableCell, fontFamily }}>{mDesc}</Text></View>
                  <View style={[commonStyles.tableCol, { width: '15%' }]}><Text style={commonStyles.tableCell}>{milestone.percentage}%</Text></View>
                  <View style={[commonStyles.tableCol, { width: '20%' }]}><Text style={commonStyles.tableCell}>{milestone.amount.toLocaleString()}</Text></View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ marginBottom: 30 }}>
          <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 5, fontFamily, textDecoration: 'underline' }}>Terms & Conditions</Text>
          <Text style={{ fontSize: 10, lineHeight: 1.5, fontFamily }}>{terms}</Text>
        </View>

        <View style={{ marginTop: 'auto', paddingTop: 20, flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ alignItems: 'center', justifyContent: 'flex-end' }}>
            <Text style={{ fontSize: 10, marginBottom: 40, fontFamily }}>Accepted By (Client)</Text>
            <Text style={{ fontSize: 10, fontWeight: 'bold', fontFamily }}>{agreement.clientName}</Text>
          </View>
          <View style={{ alignItems: 'center', justifyContent: 'flex-end' }}>
            <Text style={{ fontSize: 10, marginBottom: agreement.showOwnerSignature && agreement.companySnapshot.signatureUrl ? 5 : 40, fontFamily }}>For {agreement.companySnapshot.name}</Text>
            {agreement.showOwnerSignature && agreement.companySnapshot.signatureUrl && (
              <Image src={agreement.companySnapshot.signatureUrl} style={{ width: 100, height: 40, objectFit: 'contain', marginBottom: 5 }} />
            )}
            <Text style={{ fontSize: 10, fontWeight: 'bold', fontFamily }}>Authorized Signatory</Text>
          </View>
        </View>
        
      </Page>
    </Document>
  );
}
