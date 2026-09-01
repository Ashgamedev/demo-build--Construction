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
  /** The logo now floats absolutely inside this row (see letterheadLogo), so
   *  its horizontal position no longer pushes the identity block around. The
   *  row still gives the block a minimum height so the identity can vertically
   *  centre against the taller logo without overlapping the divider below. */
  letterheadRow: {
    position: 'relative',
    minHeight: 62,
    justifyContent: 'center',
    marginBottom: 6,
  },
  /** Absolutely positioned so the row's flex layout doesn't allocate width to
   *  it - meaning the logo can be pulled right, next to the centred title,
   *  without shifting the title or the address. `left` is the one number to
   *  change if the gap looks wrong: bigger pulls the logo closer to the text,
   *  smaller pushes it back toward the page edge. */
  letterheadLogo: {
    position: 'absolute',
    left: 110,
    top: 0,
    width: 62,
    height: 62,
    objectFit: 'contain',
  },
  letterheadIdentity: {
    width: '100%',
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
