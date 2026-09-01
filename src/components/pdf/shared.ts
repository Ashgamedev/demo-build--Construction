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
  letterheadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  letterheadLogo: {
    width: 62,
    height: 62,
    objectFit: 'contain',
  },
  letterheadIdentity: {
    flex: 1,
    paddingHorizontal: 8,
  },
  /** Same width as the logo so the identity block above centres on the page,
   *  not on the whitespace left after the logo. Kept as a real (empty) View
   *  because @react-pdf's flex layout gives it real width, unlike a margin. */
  letterheadSpacer: {
    width: 62,
    height: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0369a1', // Match deep blue
    textAlign: 'center',
    marginBottom: 3,
  },
  companyAddress: {
    fontSize: 10,
    color: '#4b5563',
    textAlign: 'center',
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
