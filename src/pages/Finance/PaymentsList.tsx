import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFinanceStore } from '../../store/financeStore';
import { useProjectStore } from '../../store/projectStore';
import { useCustomerStore } from '../../store/customerStore';
import { useQuotationStore } from '../../store/quotationStore';
import { ArrowLeft, Download } from 'lucide-react';
import { format } from 'date-fns';
import { useCompanySettingsStore } from '../../store/companySettingsStore';
import { generateReceiptPDF } from '../../utils/pdfGenerator';

export function PaymentsList() {
  const navigate = useNavigate();
  const { payments, subscribeFinance } = useFinanceStore();
  const { projects, subscribeProjects } = useProjectStore();
  const { subscribe: subscribeCustomers, customers } = useCustomerStore();
  const { subscribeQuotations, quotations } = useQuotationStore();
  const { settings, fetchSettings } = useCompanySettingsStore();

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    if (!settings) fetchSettings();
    const unsubFinance = subscribeFinance();
    const unsubProj = subscribeProjects();
    const unsubCust = subscribeCustomers();
    const unsubQuo = subscribeQuotations();
    return () => {
      unsubFinance();
      unsubProj();
      unsubCust();
      unsubQuo();
    };
  }, [subscribeFinance, subscribeProjects, subscribeCustomers, subscribeQuotations, settings, fetchSettings]);

  const handleGenerateReceipt = async (payment: any) => {
    if (!settings) return alert('Company settings not loaded');
    const project = projects.find(p => p.id === payment.projectId);
    const customer = customers.find(c => c.id === payment.customerId);
    if (!project || !customer) return alert('Project or Customer not found');

    const quotation = quotations.find(q => q.id === payment.quotationId);
    
    const newBalance = project.agreedValue - payment.amount;

    const pdfBlob = generateReceiptPDF(
      settings,
      customer,
      project,
      payment,
      quotation,
      newBalance
    );

    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    
    const projName = project?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'Project';
    const dateStr = format(payment.date, 'ddMMMMyyyy');
    a.download = `Receipt_${projName}_Rs${payment.amount}_${dateStr}.pdf`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const startTs = startDate ? new Date(startDate).getTime() : 0;
  const endTs = endDate ? new Date(endDate).getTime() + 86399999 : Infinity;
  const filteredPayments = payments.filter(p => p.date >= startTs && p.date <= endTs);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center space-x-4">
        <Link to="/finance" className="p-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">Payments Collected</h1>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-end space-x-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">From Date</label>
          <input 
            type="date" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)}
            className="border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">To Date</label>
          <input 
            type="date" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)}
            className="border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="pb-1">
          <button 
            onClick={() => { setStartDate(''); setEndDate(''); }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 flex flex-col">
        <div className="p-0 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left font-medium text-gray-500">Date</th>
                <th className="px-3 sm:px-6 py-3 text-left font-medium text-gray-500">Project</th>
                <th className="px-3 sm:px-6 py-3 text-left font-medium text-gray-500">Mode</th>
                <th className="px-3 sm:px-6 py-3 text-right font-medium text-gray-500">Amount</th>
                <th className="px-3 sm:px-6 py-3 text-right font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPayments.map(p => {
                const project = projects.find(proj => proj.id === p.projectId);
                return (
                  <tr 
                    key={p.id}
                    onClick={() => navigate(`/finance/payments/${p.id}`)}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-gray-500">{format(p.date, 'dd MMM yyyy')}</td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap font-medium max-w-[150px] truncate" title={project?.title || p.projectId}>
                      {project?.title || p.projectId}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">{p.paymentMode}</td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-green-600 font-bold">+₹{p.amount.toLocaleString('en-IN')}</td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleGenerateReceipt(p); }} 
                        className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
                        title="Download/Share Receipt"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredPayments.length === 0 && <tr><td colSpan={5} className="px-3 sm:px-6 py-4 text-center text-gray-500">No payments found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
