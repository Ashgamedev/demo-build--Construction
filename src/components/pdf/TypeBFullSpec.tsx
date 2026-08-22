import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { QuotationVersion } from '../../types';
import { Letterhead } from './Letterhead';
import { commonStyles } from './shared';

interface Props {
  quotation: QuotationVersion;
}

export function TypeBFullSpecPDF({ quotation }: Props) {
  const isTa = quotation.language === 'ta';
  const t = quotation.tamilTranslations || {};
  const fontFamily = isTa ? 'NotoSansTamil' : undefined;
  
  const subject = isTa && t.subject ? t.subject : quotation.subject;
  const specList = quotation.fullSpecItems || [];

  return (
    <Document>
      <Page size="A4" style={{ ...commonStyles.page, fontFamily }}>
        <Letterhead settings={quotation.companySnapshot} />
        
        <Text style={{ ...commonStyles.title, fontFamily }}>STATEMENT OF SPECIFICATIONS</Text>
        <Text style={{ fontSize: 9, textAlign: 'center', marginBottom: 15, fontFamily }}>(The specifications are in feet and inches)</Text>
        
        <View style={{ marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 10, fontFamily }}>Quotation No: {quotation.quotationNumber}</Text>
            <Text style={{ fontSize: 10, fontFamily }}>Date: {new Date(quotation.date).toLocaleDateString()}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 10, fontFamily }}>Client: {quotation.clientName}</Text>
            <Text style={{ fontSize: 10, fontFamily }}>Site: {quotation.siteName}</Text>
            {quotation.contractorName && (
              <Text style={{ fontSize: 10, fontFamily }}>Contractor: {quotation.contractorName}</Text>
            )}
          </View>
        </View>
        
        <View style={{ marginBottom: 15 }}>
          <Text style={{ fontSize: 10, fontWeight: 'bold', fontFamily }}>Subject: {subject}</Text>
        </View>

        <View style={commonStyles.table}>
          <View style={[commonStyles.tableRow, commonStyles.tableHeader]}>
            <View style={[commonStyles.tableCol, { width: '10%' }]}><Text style={commonStyles.tableCell}>Sl No.</Text></View>
            <View style={[commonStyles.tableCol, { width: '25%' }]}><Text style={commonStyles.tableCell}>Name of Works</Text></View>
            <View style={[commonStyles.tableCol, { width: '40%' }]}><Text style={commonStyles.tableCell}>Specification</Text></View>
            <View style={[commonStyles.tableCol, { width: '10%' }]}><Text style={commonStyles.tableCell}>Mix</Text></View>
            <View style={[commonStyles.tableCol, { width: '15%' }]}><Text style={commonStyles.tableCell}>Brands</Text></View>
          </View>
          
          {specList.map((item, idx) => {
            const itemTrans = isTa && t.fullSpecItems?.[item.id] ? t.fullSpecItems[item.id] : {};
            return (
              <View key={item.id} style={commonStyles.tableRow}>
                <View style={[commonStyles.tableCol, { width: '10%' }]}><Text style={commonStyles.tableCell}>{idx + 1}</Text></View>
                <View style={[commonStyles.tableCol, { width: '25%' }]}><Text style={{ ...commonStyles.tableCell, fontWeight: 'bold', fontFamily }}>{itemTrans.name || item.name}</Text></View>
                <View style={[commonStyles.tableCol, { width: '40%' }]}><Text style={{ ...commonStyles.tableCell, fontFamily }}>{itemTrans.description || item.description}</Text></View>
                <View style={[commonStyles.tableCol, { width: '10%' }]}><Text style={commonStyles.tableCell}>{item.mixRatio || '-'}</Text></View>
                <View style={[commonStyles.tableCol, { width: '15%' }]}><Text style={commonStyles.tableCell}>{item.brandOptions || '-'}</Text></View>
              </View>
            );
          })}
        </View>

        {quotation.fullSpecRate && (
          <View style={{ marginTop: 15, marginBottom: 15, padding: 5, backgroundColor: '#f0f0f0' }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', fontFamily }}>
              Agreed Rate: Rs. {quotation.fullSpecRate} / sq.ft (All inclusive of materials & labour)
            </Text>
          </View>
        )}

        {(quotation.notes || isTa) && (
          <View style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 5, fontFamily, textDecoration: 'underline' }}>Notes / Exclusions:</Text>
            <Text style={{ fontSize: 10, lineHeight: 1.5, paddingLeft: 10, fontFamily }}>{isTa && t.notes ? t.notes : quotation.notes}</Text>
          </View>
        )}
        
        <View style={{ marginTop: 20, paddingTop: 20, flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ alignItems: 'center', justifyContent: 'flex-end' }}>
            <Text style={{ fontSize: 10, marginBottom: 40, fontFamily }}>Accepted By (Client)</Text>
            <Text style={{ fontSize: 10, fontWeight: 'bold', fontFamily }}>{quotation.clientName}</Text>
          </View>
          <View style={{ alignItems: 'center', justifyContent: 'flex-end' }}>
            <Text style={{ fontSize: 10, marginBottom: quotation.showOwnerSignature && quotation.companySnapshot.signatureUrl ? 5 : 40, fontFamily }}>For {quotation.companySnapshot.name}</Text>
            {quotation.showOwnerSignature && quotation.companySnapshot.signatureUrl && (
              <Image src={quotation.companySnapshot.signatureUrl} style={{ width: 100, height: 40, objectFit: 'contain', marginBottom: 5 }} />
            )}
            <Text style={{ fontSize: 10, fontWeight: 'bold', fontFamily }}>Authorized Signatory</Text>
          </View>
        </View>

        <Text style={commonStyles.footer}>Generated by Deepthi Construction CRM - Quotation #{quotation.quotationNumber}</Text>
      </Page>
    </Document>
  );
}
