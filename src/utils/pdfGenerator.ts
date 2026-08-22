import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CompanySettings, Project, Customer, CustomerPayment, Quotation } from '../types';

export function generateReceiptPDF(
  company: CompanySettings,
  customer: Customer,
  project: Project,
  payment: CustomerPayment,
  quotation: Quotation | undefined,
  newBalance: number
): Blob {
  const doc = new jsPDF();

  // Company Header
  doc.setFontSize(20);
  doc.setTextColor(33, 37, 41);
  doc.text(company.name.toUpperCase(), 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const addressLines = company.address.split('\n');
  addressLines.forEach((line, index) => {
    doc.text(line, 14, 30 + (index * 5));
  });
  doc.text(`Phone: ${company.mobileNumbers}`, 14, 30 + (addressLines.length * 5));

  // Receipt Title
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('PAYMENT RECEIPT', 140, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Receipt ID: ${payment.id.substring(0, 8).toUpperCase()}`, 140, 30);
  const dateStr = new Date(payment.date).toLocaleDateString('en-IN');
  doc.text(`Date: ${dateStr}`, 140, 35);

  doc.line(14, 45, 196, 45); // Separator

  // Received From
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('Received From:', 14, 55);
  doc.setFontSize(10);
  doc.text(customer.name, 14, 62);
  doc.text(`Phone: ${customer.phone}`, 14, 67);
  if (customer.email) doc.text(`Email: ${customer.email}`, 14, 72);

  // Towards Project
  doc.setFontSize(11);
  doc.text('Towards Project:', 100, 55);
  doc.setFontSize(10);
  doc.text(project.title, 100, 62);
  doc.text(project.siteAddress, 100, 67);
  if (quotation) {
    doc.text(`Ref Quotation: ${quotation.id.substring(0, 8).toUpperCase()}`, 100, 72);
  }

  // Payment Details Table
  autoTable(doc, {
    startY: 85,
    head: [['Description', 'Payment Mode', 'Amount']],
    body: [
      [`Payment towards ${project.title}`, payment.paymentMode.toUpperCase(), `Rs. ${payment.amount.toLocaleString('en-IN')}`]
    ],
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Balance Details
  doc.setFontSize(10);
  doc.text(`Total Contract Value: Rs. ${project.agreedValue.toLocaleString('en-IN')}`, 14, finalY);
  doc.text(`Remaining Balance: Rs. ${newBalance.toLocaleString('en-IN')}`, 14, finalY + 6);

  // Footer / Signature
  doc.text('Authorized Signature', 150, finalY + 25);
  doc.line(140, finalY + 20, 196, finalY + 20); // Signature line

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('This is a computer-generated receipt.', 105, 280, { align: 'center' });

  return doc.output('blob');
}
