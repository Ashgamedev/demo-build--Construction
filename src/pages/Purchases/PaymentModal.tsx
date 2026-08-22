import { useState } from 'react';
import { useBillStore } from '../../store/billStore';
import { useFinanceStore } from '../../store/financeStore';
import { X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { VendorBill } from '../../types';

interface Props {
  bill: VendorBill;
  onClose: () => void;
}

export function PaymentModal({ bill, onClose }: Props) {
  const { addPayment } = useBillStore();
  const { addExpense } = useFinanceStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const balance = bill.amount - bill.paidAmount;

  const [formData, setFormData] = useState({
    amount: balance.toString(),
    date: format(new Date(), 'yyyy-MM-dd'),
    paymentMode: 'bank transfer',
    referenceNumber: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(formData.amount);
    if (!amountNum || amountNum <= 0 || amountNum > balance) {
      setError("Please enter a valid amount not exceeding the balance.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const paymentDate = new Date(formData.date).getTime();
      
      // 1. Add payment to bill
      await addPayment(bill.id, {
        amount: amountNum,
        date: paymentDate,
        paymentMode: formData.paymentMode,
        referenceNumber: formData.referenceNumber
      });

      // 2. Add to global expenses
      await addExpense({
        category: 'Purchases / Bills',
        description: `Payment for bill to ${bill.vendorName} - ${bill.description}`,
        amount: amountNum,
        date: paymentDate,
        payeeName: bill.vendorName,
        paidBy: 'Company bank',
        paymentMethod: formData.paymentMode,
        referenceNumber: formData.referenceNumber
      });

      onClose();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Log Payment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
              {error}
            </div>
          )}

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
            <div className="text-sm text-slate-500 mb-1">Paying to <span className="font-semibold text-slate-700">{bill.vendorName}</span></div>
            <div className="flex justify-between items-center text-sm">
              <span>Total Bill: ₹{bill.amount.toLocaleString()}</span>
              <span className="font-bold text-red-600">Balance: ₹{balance.toLocaleString()}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount (₹) <span className="text-red-500">*</span></label>
            <input
              type="number"
              required
              min="1"
              max={balance}
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date <span className="text-red-500">*</span></label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode <span className="text-red-500">*</span></label>
            <select
              value={formData.paymentMode}
              onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
              className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="bank transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number / UTR</label>
            <input
              type="text"
              value={formData.referenceNumber}
              onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
              className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Optional"
            />
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
