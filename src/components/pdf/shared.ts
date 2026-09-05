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
  /** Small logo pinned to the top-left corner, company name and address centred
   *  on the page. The row is the positioning context (relative); the logo is
   *  absolutely placed in its top-left, and the identity spans the full width
   *  with centred text so the logo never pushes it around. This is the layout
   *  the client settled on: logo in the corner, identity centred like the
   *  letterpad format. */
  letterheadRow: {
    position: 'relative',
    minHeight: 44,
    justifyContent: 'center',
    marginBottom: 6,
  },
  letterheadLogo: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 42,
    height: 42,
    objectFit: 'contain',
  },
  letterheadIdentity: {
    width: '100%',
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0369a1',
    textAlign: 'center',
    marginBottom: 3,
  },
  companyAddress: {
    fontSize: 9.5,
    color: '#4b5563',
    textAlign: 'center',
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
