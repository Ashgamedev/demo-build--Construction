import { useState, useEffect } from 'react';
import { useBillStore } from '../../store/billStore';
import { format } from 'date-fns';
import { Loader2, Plus, ShoppingCart, IndianRupee, AlertCircle } from 'lucide-react';
import { PurchaseModal } from './PurchaseModal';
import { PaymentModal } from './PaymentModal';
import { VendorBill } from '../../types';

export function PurchasesDashboard() {
  const { bills, loading, subscribeBills } = useBillStore();
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [paymentBill, setPaymentBill] = useState<VendorBill | null>(null);
  
  useEffect(() => {
    const unsub = subscribeBills();
    return () => unsub();
  }, [subscribeBills]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const totalUnpaid = bills.reduce((acc, bill) => acc + (bill.amount - bill.paidAmount), 0);
  const totalPaid = bills.reduce((acc, bill) => acc + bill.paidAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Purchases & Payables</h2>
          <p className="text-sm text-gray-500">Track future expenses and vendor bills</p>
        </div>
        <button 
          onClick={() => setIsPurchaseModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Purchase / Bill</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Total Unpaid (Future Expenses)</p>
            <h3 className="text-2xl font-bold text-red-600">₹{totalUnpaid.toLocaleString()}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <IndianRupee className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Total Paid</p>
            <h3 className="text-2xl font-bold text-green-600">₹{totalPaid.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-200 text-sm font-semibold text-gray-600 uppercase tracking-wider">
              <th className="p-4">Date / Due</th>
              <th className="p-4">Vendor & Details</th>
              <th className="p-4 text-right">Bill Amount</th>
              <th className="p-4 text-right">Balance</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bills.map(bill => {
              const balance = bill.amount - bill.paidAmount;
              const isOverdue = bill.status !== 'Paid' && bill.dueDate && bill.dueDate < Date.now();

              return (
                <tr key={bill.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 whitespace-nowrap text-sm">
                    <div className="font-medium text-gray-900">{format(bill.date, 'MMM d, yyyy')}</div>
                    {bill.dueDate && (
                      <div className={`text-xs mt-1 ${isOverdue ? 'text-red-600 font-bold flex items-center' : 'text-gray-500'}`}>
                        {isOverdue && <AlertCircle className="w-3 h-3 mr-1" />}
                        Due: {format(bill.dueDate, 'MMM d, yyyy')}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <ShoppingCart className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-base">{bill.vendorName}</div>
                        <div className="text-sm text-gray-500 line-clamp-1">{bill.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-right font-semibold text-gray-900">
                    ₹{bill.amount.toLocaleString()}
                  </td>
                  <td className="p-4 text-right font-bold text-red-600">
                    {balance > 0 ? `₹${balance.toLocaleString()}` : '-'}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold
                      ${bill.status === 'Paid' ? 'bg-green-100 text-green-800' : ''}
                      ${bill.status === 'Partial' ? 'bg-yellow-100 text-yellow-800' : ''}
                      ${bill.status === 'Unpaid' ? 'bg-red-100 text-red-800' : ''}
                    `}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {bill.status !== 'Paid' && (
                      <button 
                        onClick={() => setPaymentBill(bill)}
                        className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-md hover:bg-slate-800 transition-colors font-medium whitespace-nowrap"
                      >
                        Log Payment
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {bills.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  No purchases logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isPurchaseModalOpen && (
        <PurchaseModal onClose={() => setIsPurchaseModalOpen(false)} />
      )}

      {paymentBill && (
        <PaymentModal bill={paymentBill} onClose={() => setPaymentBill(null)} />
      )}
    </div>
  );
}
