import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useFinanceStore } from '../../store/financeStore';
import { useProjectStore } from '../../store/projectStore';
import { useCustomerStore } from '../../store/customerStore';
import { useQuotationStore } from '../../store/quotationStore';
import { useCompanySettingsStore } from '../../store/companySettingsStore';
import { ArrowLeft, Download, Eye, Send } from 'lucide-react';
import { format } from 'date-fns';
import { generateReceiptPDF } from '../../utils/pdfGenerator';

export function PaymentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { payments, subscribeFinance } = useFinanceStore();
  const { projects, subscribeProjects } = useProjectStore();
  const { customers, subscribe: subscribeCustomers } = useCustomerStore();
  const { quotations, subscribeQuotations } = useQuotationStore();
  const { settings, fetchSettings } = useCompanySettingsStore();

  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchSettings();
    const u1 = subscribeFinance();
    const u2 = subscribeProjects();
    const u3 = subscribeCustomers();
    const u4 = subscribeQuotations();
    return () => { u1(); u2(); u3(); u4(); };
  }, [subscribeFinance, subscribeProjects, subscribeCustomers, subscribeQuotations, fetchSettings]);

  const payment = payments.find(p => p.id === id);
  const project = payment ? projects.find(p => p.id === payment.projectId) : null;
  const customer = payment ? customers.find(c => c.id === payment.customerId) : null;
  const quotation = payment ? quotations.find(q => q.id === payment.quotationId) : null;

  useEffect(() => {
    if (payment && project && customer && settings && !pdfBlobUrl) {
      const newBalance = (project.agreedValue || 0) - payment.amount;
      const blob = generateReceiptPDF(settings, customer, project, payment, quotation || undefined, newBalance);
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
    }
  }, [payment, project, customer, settings, quotation, pdfBlobUrl]);

  if (!payment || !project || !customer) {
    return <div className="p-6">Loading payment details...</div>;
  }

  const getReceiptFilename = () => {
    const projName = project?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'Project';
    const dateStr = format(payment.date, 'ddMMMMyyyy');
    return `Receipt_${projName}_Rs${payment.amount}_${dateStr}.pdf`;
  };

  const handleDownload = () => {
    if (!pdfBlobUrl) return;
    const a = document.createElement('a');
    a.href = pdfBlobUrl;
    a.download = getReceiptFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSendWhatsApp = () => {
    if (!pdfBlobUrl) return;
    // Just open WhatsApp with text. Do NOT trigger a local download.
    const phone = customer.phone.replace(/\D/g, '');
    const text = `Hello ${customer.name}, we have successfully received your payment of Rs ${payment.amount}/- towards ${project.title}. Thank you!`;
    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">Payment Details</h1>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center shadow-sm"
          >
            <Eye className="w-4 h-4 mr-2" /> {showPreview ? 'Hide Preview' : 'Preview Receipt'}
          </button>
          <button 
            onClick={handleDownload}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center shadow-sm"
          >
            <Download className="w-4 h-4 mr-2" /> Download
          </button>
          <button 
            onClick={handleSendWhatsApp}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center shadow-sm"
          >
            <Send className="w-4 h-4 mr-2" /> Send Receipt
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">Amount Received</p>
              <h2 className="text-4xl font-bold text-green-600">₹{payment.amount.toLocaleString('en-IN')}</h2>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 font-medium mb-1">Receipt Number</p>
              <p className="font-mono text-gray-900 font-medium">#{payment.id.substring(0,8).toUpperCase()}</p>
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Date</p>
              <p className="font-medium text-gray-900">{format(payment.date, 'dd MMMM yyyy, hh:mm a')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Payment Mode</p>
              <p className="font-medium text-gray-900 capitalize">{payment.paymentMode}</p>
            </div>
            {payment.referenceNumber && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Reference Number</p>
                <p className="font-medium text-gray-900 font-mono">{payment.referenceNumber}</p>
              </div>
            )}
            {payment.notes && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Notes</p>
                <p className="font-medium text-gray-900 bg-gray-50 p-3 rounded">{payment.notes}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Customer</p>
              <p className="font-medium text-gray-900">{customer.name}</p>
              <p className="text-sm text-gray-600">{customer.phone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Project</p>
              <Link to={`/projects/${project.id}`} className="font-medium text-blue-600 hover:underline">
                {project.title}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {showPreview && pdfBlobUrl && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 h-[800px]">
          <iframe src={pdfBlobUrl} className="w-full h-full rounded" title="Receipt Preview" />
        </div>
      )}
    </div>
  );
}
