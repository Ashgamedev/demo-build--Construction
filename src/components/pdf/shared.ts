import { StyleSheet } from '@react-pdf/renderer';

export const commonStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333',
  },
  letterheadContainer: {
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#2563eb',
    borderBottomStyle: 'solid',
    paddingBottom: 8,
  },
  /** Logo and identity are grouped as one unit and that unit is centred on the
   *  page. The gap between them is a fixed marginRight on the logo, so it
   *  reads as consistent and small - the same measured relationship you get
   *  between the company name and the address underneath, which is the look
   *  the client asked for. Left-aligning the title and address inside their
   *  own block is what makes the composition sit as one thing rather than
   *  three centred things drifting apart. */
  letterheadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  letterheadLogo: {
    width: 52,
    height: 52,
    objectFit: 'contain',
    marginRight: 14,
  },
  letterheadIdentity: {
    // Natural width so the logo sits right next to the text. Do NOT set flex:1
    // here - that turned this into two separate centred columns.
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0369a1',
    marginBottom: 3,
  },
  companyAddress: {
    fontSize: 9.5,
    color: '#4b5563',
    lineHeight: 1.35,
  },
  proprietorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 10,
    marginTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 5,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    textDecoration: 'underline',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  table: {
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableHeader: {
    backgroundColor: '#f9fafb',
    fontWeight: 'bold',
  },
  tableCol: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableCell: {
    margin: 5,
    fontSize: 9,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: 'grey',
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  }
});
