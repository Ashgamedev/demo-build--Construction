import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { QuotationVersion } from '../../types';
import { Letterhead } from './Letterhead';
import { commonStyles } from './shared';

interface Props {
  quotation: QuotationVersion;
}

export function TypeCMeasurementPDF({ quotation }: Props) {
  let grandTotal = 0;
  let totalAmount = 0;
  const isTa = quotation.language === 'ta';
  const t = quotation.tamilTranslations || {};
  const fontFamily = isTa ? 'NotoSansTamil' : undefined;

  return (
    <Document>
      <Page size="A4" style={{ ...commonStyles.page, fontFamily }}>
        <Letterhead settings={quotation.companySnapshot} />
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
          <View>
            <Text style={{ fontSize: 10, fontWeight: 'bold', fontFamily }}>To, {quotation.clientName}</Text>
            <Text style={{ fontSize: 10, fontFamily }}>Place: {quotation.siteName}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 10, fontFamily }}>Date: {new Date(quotation.date).toLocaleDateString()}</Text>
          </View>
        </View>
        
        <Text style={{ ...commonStyles.title, fontFamily }}>Bill Details / Measurement</Text>

        {quotation.measurementGroups?.map((group) => {
          let groupTotal = 0;
          const translatedGroup = isTa && t.measurementGroups?.[group.id] ? t.measurementGroups[group.id] : null;
          const groupName = translatedGroup?.name || group.name;

          return (
            <View key={group.id} style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 5, fontFamily }}>{groupName}</Text>
              
              <View style={commonStyles.table}>
                <View style={[commonStyles.tableRow, commonStyles.tableHeader]}>
                  <View style={[commonStyles.tableCol, { width: '8%' }]}><Text style={commonStyles.tableCell}>Sl No.</Text></View>
                  <View style={[commonStyles.tableCol, { width: '32%' }]}><Text style={commonStyles.tableCell}>Description</Text></View>
                  <View style={[commonStyles.tableCol, { width: '20%' }]}><Text style={commonStyles.tableCell}>Dimensions (L x W x D) x Nos</Text></View>
                  <View style={[commonStyles.tableCol, { width: '12%' }]}><Text style={commonStyles.tableCell}>Total Qty</Text></View>
                  <View style={[commonStyles.tableCol, { width: '13%' }]}><Text style={commonStyles.tableCell}>Rate</Text></View>
                  <View style={[commonStyles.tableCol, { width: '15%' }]}><Text style={commonStyles.tableCell}>Amount</Text></View>
                </View>

                {group.items.map((item, index) => {
                  groupTotal += item.amount;
                  grandTotal += item.amount;
                  const itemDesc = translatedGroup?.items?.[item.id] || item.description;
                  return (
                    <View key={item.id} style={{ flexDirection: 'column' }}>
                      <View style={commonStyles.tableRow}>
                        <View style={[commonStyles.tableCol, { width: '8%' }]}><Text style={{ ...commonStyles.tableCell, fontFamily }}>{index + 1}</Text></View>
                        <View style={[commonStyles.tableCol, { width: '32%' }]}><Text style={{ ...commonStyles.tableCell, fontFamily }}>{itemDesc}</Text></View>
                        <View style={[commonStyles.tableCol, { width: '20%' }]}><Text style={commonStyles.tableCell}></Text></View>
                        <View style={[commonStyles.tableCol, { width: '12%' }]}><Text style={{ ...commonStyles.tableCell, fontFamily }}>{item.totalQuantity.toFixed(2)} cft</Text></View>
                        <View style={[commonStyles.tableCol, { width: '13%' }]}><Text style={{ ...commonStyles.tableCell, fontFamily }}>Rs. {item.unitRate}</Text></View>
                        <View style={[commonStyles.tableCol, { width: '15%' }]}><Text style={{ ...commonStyles.tableCell, fontFamily }}>Rs. {item.amount.toLocaleString()}</Text></View>
                      </View>
                      
                      {/* Dimension Rows. Custom columns are free-text reference
                          values, surfaced inline after the tag so any number of
                          them shows without breaking the fixed table widths. */}
                      {item.dimensions.map((dim, dimIdx) => {
                        const custSuffix = (quotation.measurementColumns || [])
                          .filter(c => dim.customValues?.[c.id])
                          .map(c => ` · ${c.name}: ${dim.customValues![c.id]}`)
                          .join('');
                        return (
                        <View key={dim.id} style={commonStyles.tableRow}>
                          <View style={[commonStyles.tableCol, { width: '8%' }]}><Text style={commonStyles.tableCell}></Text></View>
                          <View style={[commonStyles.tableCol, { width: '27%' }]}><Text style={{ ...commonStyles.tableCell, fontSize: 8, fontFamily }}>{dim.description}{custSuffix}</Text></View>
                          <View style={[commonStyles.tableCol, { width: '10%' }]}><Text style={{ ...commonStyles.tableCell, fontSize: 8 }}>{dim.nos || 1}</Text></View>
                          <View style={[commonStyles.tableCol, { width: '10%' }]}><Text style={{ ...commonStyles.tableCell, fontSize: 8 }}>{dim.length}</Text></View>
                          <View style={[commonStyles.tableCol, { width: '10%' }]}><Text style={{ ...commonStyles.tableCell, fontSize: 8 }}>{dim.width}</Text></View>
                          <View style={[commonStyles.tableCol, { width: '10%' }]}><Text style={{ ...commonStyles.tableCell, fontSize: 8 }}>{dim.height}</Text></View>
                          <View style={[commonStyles.tableCol, { width: '10%' }]}><Text style={{ ...commonStyles.tableCell, fontSize: 8 }}>{dim.quantity.toFixed(2)}</Text></View>
                          <View style={[commonStyles.tableCol, { width: '15%' }]}><Text style={commonStyles.tableCell}></Text></View>
                        </View>
                        );
                      })}

                      {/* Cost Row for this item */}
                      <View style={[commonStyles.tableRow, { backgroundColor: '#fcfcfc', borderBottomColor: '#ccc', borderBottomWidth: 1 }]}>
                        <View style={[commonStyles.tableCol, { width: '65%' }]}><Text style={commonStyles.tableCell}></Text></View>
                        <View style={[commonStyles.tableCol, { width: '20%' }]}>
                          <Text style={{ ...commonStyles.tableCell, fontSize: 8, fontStyle: 'italic', textAlign: 'right' }}>
                            Rate: ₹{item.unitRate.toLocaleString()}/-
                          </Text>
                        </View>
                        <View style={[commonStyles.tableCol, { width: '15%' }]}>
                          <Text style={{ ...commonStyles.tableCell, fontSize: 8, fontWeight: 'bold' }}>
                            ₹{item.amount.toLocaleString()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}

                {/* Group Total */}
                <View style={[commonStyles.tableRow, { backgroundColor: '#f0f0f0' }]}>
                  <View style={[commonStyles.tableCol, { width: '85%' }]}>
                    <Text style={{ ...commonStyles.tableCell, fontWeight: 'bold', textAlign: 'right', fontFamily }}>
                      Total for {groupName}:
                    </Text>
                  </View>
                  <View style={[commonStyles.tableCol, { width: '15%' }]}>
                    <Text style={{ ...commonStyles.tableCell, fontWeight: 'bold' }}>
                      ₹{(() => { totalAmount += groupTotal; return groupTotal.toLocaleString(); })()}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}

        {/* Grand Total */}
        <View style={{ marginTop: 10, padding: 8, backgroundColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Text style={{ fontSize: 12, fontWeight: 'bold', marginRight: 20, fontFamily }}>GRAND TOTAL:</Text>
          <Text style={{ fontSize: 12, fontWeight: 'bold', fontFamily }}>Rs. {totalAmount.toLocaleString()}/-</Text>
        </View>

        {(quotation.notes || isTa) && (
          <View style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 5, fontFamily, textDecoration: 'underline' }}>Notes / Exclusions:</Text>
            <Text style={{ fontSize: 10, lineHeight: 1.5, paddingLeft: 10, fontFamily }}>{isTa && t.notes ? t.notes : quotation.notes}</Text>
          </View>
        )}
        
        <View style={{ marginTop: 10, marginBottom: 20 }}>
          <Text style={{ fontSize: 8, fontStyle: 'italic', color: '#666', fontFamily }}>* Legend: cft = cubic feet (unit of volume used in construction measurement)</Text>
        </View>

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

        <Text style={commonStyles.footer}>Generated by Deepthi Construction CRM - Bill #{quotation.quotationNumber}</Text>
      </Page>
    </Document>
  );
}
