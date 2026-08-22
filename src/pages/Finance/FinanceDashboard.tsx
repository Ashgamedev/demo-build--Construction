import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFinanceStore } from '../../store/financeStore';
import { useProjectStore } from '../../store/projectStore';
import { useCustomerStore } from '../../store/customerStore';
import { useQuotationStore } from '../../store/quotationStore';
import { useBillStore } from '../../store/billStore';
import { useContractorStore } from '../../store/contractorStore';
import { useWorkforceStore } from '../../store/workforceStore';
import { useAttendanceStore } from '../../store/attendanceStore';
import { IndianRupee, TrendingUp, TrendingDown, Wallet, ArrowDownRight, ArrowUpRight, Info, Download, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useCompanySettingsStore } from '../../store/companySettingsStore';
import { generateReceiptPDF } from '../../utils/pdfGenerator';
import { ExpenseModal } from './ExpenseModal';
import { AddPaymentModal } from './AddPaymentModal';
import { HelpTooltip } from '../../components/HelpTooltip';
import { companyWidePayablePending, buildWageBalances } from '../../lib/ledger';

export function FinanceDashboard() {
  const navigate = useNavigate();
  const { expenses, payments, subscribeFinance } = useFinanceStore();
  const { projects, subscribeProjects } = useProjectStore();
  const { subscribe: subscribeCustomers, customers } = useCustomerStore();
  const { subscribeQuotations, quotations } = useQuotationStore();
  const { settings, fetchSettings } = useCompanySettingsStore();
  const { bills, subscribeBills } = useBillStore();
  const { allAssignments, subscribeAllAssignments } = useContractorStore();
  const { workforce, subscribeWorkforce } = useWorkforceStore();
  const { records, wagePayments, subscribeByDateRange, subscribeWagePayments } = useAttendanceStore();

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    if (!settings) fetchSettings();
    const unsubFinance = subscribeFinance();
    const unsubProj = subscribeProjects();
    const unsubCust = subscribeCustomers();
    const unsubQuo = subscribeQuotations();
    const unsubBills = subscribeBills();
    const unsubAssignments = subscribeAllAssignments();
    const unsubWf = subscribeWorkforce();
    const unsubWage = subscribeWagePayments();
    const unsubAtt = subscribeByDateRange(0, Date.now() + 86400000);
    return () => {
      unsubFinance();
      unsubProj();
      unsubCust();
      unsubQuo();
      unsubBills();
      unsubAssignments();
      unsubWf();
      unsubWage();
      unsubAtt();
    };
  }, [subscribeFinance, subscribeProjects, subscribeCustomers, subscribeQuotations, subscribeBills, subscribeAllAssignments, subscribeWorkforce, subscribeWagePayments, subscribeByDateRange, settings, fetchSettings]);

  const handleGenerateReceipt = async (payment: any) => {
    if (!settings) return alert('Company settings not loaded');
    const project = projects.find(p => p.id === payment.projectId);
    const customer = customers.find(c => c.id === payment.customerId);
    if (!project || !customer) return alert('Project or Customer not found');

    const quotation = quotations.find(q => q.id === payment.quotationId);
    
    // Simplistic balance recalculation at current time
    const newBalance = project.agreedValue - payment.amount;

    const pdfBlob = generateReceiptPDF(
      settings,
      customer,
      project,
      payment,
      quotation,
      newBalance
    );

    // Always trigger direct download
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

  const contractedValue = projects.reduce((acc, p) => acc + (p.agreedValue || 0), 0);
  const collected = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const actualExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const cashPosition = collected - actualExpenses;
  const wageBalances = buildWageBalances({ workforce, attendance: records, wagePayments });
  const totalPendingPayable = companyWidePayablePending(bills, allAssignments, wageBalances);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Finance Dashboard</h1>
        <div className="flex space-x-3">
          <button 
            onClick={() => setIsExpenseModalOpen(true)}
            className="bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded-md hover:bg-red-100 flex items-center font-medium"
          >
            <ArrowDownRight className="w-5 h-5 mr-2" /> Add Expense
          </button>
          <button 
            onClick={() => setIsPaymentModalOpen(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center font-medium"
          >
            <ArrowUpRight className="w-5 h-5 mr-2" /> Record Payment
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">

        <Link to="/finance/breakdown/pending" className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative group hover:shadow-md hover:border-blue-300 transition-all block">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center">
                <p className="text-sm font-medium text-gray-500">Pending to Pay</p>
                <HelpTooltip className="ml-1" text="Everything still owed to shops (unpaid/partial bills) and contractors (agreed value minus what's been paid), company-wide." />
              </div>
              <h3 className="text-2xl font-bold text-orange-600 mt-1">₹{totalPendingPayable.toLocaleString('en-IN')}</h3>
            </div>
            <div className="p-3 bg-orange-50 text-orange-600 rounded-lg"><AlertCircle className="w-5 h-5" /></div>
          </div>
        </Link>

        <Link to="/finance/breakdown/contracted" className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative group hover:shadow-md hover:border-blue-300 transition-all block">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center">
                <p className="text-sm font-medium text-gray-500">Contracted Value</p>
                <HelpTooltip className="ml-1" text="Total agreed value of all your recorded projects." />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">₹{contractedValue.toLocaleString('en-IN')}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><IndianRupee className="w-5 h-5" /></div>
          </div>
        </Link>
        
        <Link to="/finance/breakdown/collected" className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative group hover:shadow-md hover:border-blue-300 transition-all block">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center">
                <p className="text-sm font-medium text-gray-500">Amount Collected</p>
                <HelpTooltip className="ml-1" text="Total money received from customers globally." />
              </div>
              <h3 className="text-2xl font-bold text-green-600 mt-1">₹{collected.toLocaleString('en-IN')}</h3>
            </div>
            <div className="p-3 bg-green-50 text-green-600 rounded-lg"><TrendingUp className="w-5 h-5" /></div>
          </div>
        </Link>

        <Link to="/finance/breakdown/expenses" className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative group hover:shadow-md hover:border-blue-300 transition-all block">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center">
                <p className="text-sm font-medium text-gray-500">Actual Expenses</p>
                <HelpTooltip className="ml-1" text="Total money spent on materials, labor, and other costs globally." />
              </div>
              <h3 className="text-2xl font-bold text-red-600 mt-1">₹{actualExpenses.toLocaleString('en-IN')}</h3>
            </div>
            <div className="p-3 bg-red-50 text-red-600 rounded-lg"><TrendingDown className="w-5 h-5" /></div>
          </div>
        </Link>

        <Link to="/finance/breakdown/cash" className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative group hover:shadow-md hover:border-blue-300 transition-all block">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center">
                <p className="text-sm font-medium text-gray-500">Cash Position</p>
                <HelpTooltip className="ml-1" text="Net cash flow (Amount Collected minus Actual Expenses)." />
              </div>
              <h3 className="text-2xl font-bold text-indigo-600 mt-1">₹{cashPosition.toLocaleString('en-IN')}</h3>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Wallet className="w-5 h-5" /></div>
          </div>
        </Link>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <div className="bg-white rounded-lg shadow border border-gray-200 flex flex-col">
          <div className="px-3 sm:px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Recent Payments</h3>
            <Link to="/finance/payments" className="text-sm text-blue-600 hover:text-blue-800 font-medium">View Full List</Link>
          </div>
          <div className="p-0 overflow-x-auto overflow-y-auto flex-1">
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
                {payments.slice(0, 5).map(p => {
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
                {payments.length === 0 && <tr><td colSpan={5} className="px-3 sm:px-6 py-4 text-center text-gray-500">No payments found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="bg-white rounded-lg shadow border border-gray-200 flex flex-col">
          <div className="px-3 sm:px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Recent Expenses</h3>
            <Link to="/finance/expenses" className="text-sm text-blue-600 hover:text-blue-800 font-medium">View Full List</Link>
          </div>
          <div className="p-0 overflow-x-auto overflow-y-auto flex-1">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left font-medium text-gray-500">Date</th>
                  <th className="px-3 sm:px-6 py-3 text-left font-medium text-gray-500">Category</th>
                  <th className="px-3 sm:px-6 py-3 text-left font-medium text-gray-500">Description</th>
                  <th className="px-3 sm:px-6 py-3 text-right font-medium text-gray-500">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {expenses.slice(0, 5).map(e => (
                  <tr key={e.id}>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-gray-500">{format(e.date, 'dd MMM yyyy')}</td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap"><span className="px-2 py-1 bg-gray-100 rounded text-xs">{e.category}</span></td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap max-w-[150px] truncate" title={e.description}>{e.description}</td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-red-600 font-bold">-₹{e.amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                {expenses.length === 0 && <tr><td colSpan={4} className="px-3 sm:px-6 py-4 text-center text-gray-500">No expenses found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {isExpenseModalOpen && (
        <ExpenseModal onClose={() => setIsExpenseModalOpen(false)} />
      )}
      
      {isPaymentModalOpen && (
        <AddPaymentModal onClose={() => setIsPaymentModalOpen(false)} />
      )}
    </div>
  );
}
