import { useState, useEffect } from 'react';
import { useBillStore } from '../../store/billStore';
import { format } from 'date-fns';
import { Loader2, Plus, ShoppingCart, IndianRupee, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { PurchaseModal } from './PurchaseModal';
import { PaymentModal } from './PaymentModal';
import { VendorBill } from '../../types';

export function PurchasesDashboard() {
  const { bills, loading, subscribeBills, deleteBill } = useBillStore();
  const [addOpen, setAddOpen] = useState(false);
  const [editBill, setEditBill] = useState<VendorBill | null>(null);
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

  const handleDelete = async (bill: VendorBill) => {
    // Naming both the vendor and the amount, so a mistap on the wrong row is
    // visible before it's confirmed - the shown numbers should match what he
    // meant to delete. A bill with money already paid against it is a bigger
    // deal because delete makes those payments unaccounted for, so its warning
    // is louder.
    const paidLine = bill.paidAmount > 0
      ? `\n\nThis bill already has ₹${bill.paidAmount.toLocaleString('en-IN')} recorded as paid against it. Those payments will also be removed.`
      : '';
    const ok = window.confirm(
      `Delete the bill from ${bill.vendorName} for ₹${bill.amount.toLocaleString('en-IN')}?${paidLine}\n\nThis cannot be undone.`
    );
    if (!ok) return;
    try {
      await deleteBill(bill.id);
    } catch (e: any) {
      alert(`Could not delete: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header: stacks on phone so the button is full-width and thumb-friendly. */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Purchases &amp; Payables</h2>
          <p className="text-sm text-gray-500">Track future expenses and vendor bills</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Purchase / Bill</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Total Unpaid (Future Expenses)</p>
            <h3 className="text-2xl font-bold text-red-600">₹{totalUnpaid.toLocaleString('en-IN')}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <IndianRupee className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Total Paid</p>
            <h3 className="text-2xl font-bold text-green-600">₹{totalPaid.toLocaleString('en-IN')}</h3>
          </div>
        </div>
      </div>

      {/* -------- Desktop / tablet: table -------- */}
      <div className="hidden sm:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-200 text-sm font-semibold text-gray-600 uppercase tracking-wider">
              <th className="p-4">Date / Due</th>
              <th className="p-4">Vendor &amp; Details</th>
              <th className="p-4 text-right">Bill Amount</th>
              <th className="p-4 text-right">Balance</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-right">Actions</th>
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
                  <td className="p-4 text-right font-semibold text-gray-900 tabular-nums">
                    ₹{bill.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="p-4 text-right font-bold text-red-600 tabular-nums">
                    {balance > 0 ? `₹${balance.toLocaleString('en-IN')}` : '-'}
                  </td>
                  <td className="p-4 text-center">
                    <StatusPill status={bill.status} />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      {bill.status !== 'Paid' && (
                        <button
                          onClick={() => setPaymentBill(bill)}
                          className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-md hover:bg-slate-800 transition-colors font-medium whitespace-nowrap"
                        >
                          Log Payment
                        </button>
                      )}
                      <button
                        onClick={() => setEditBill(bill)}
                        title="Edit this bill"
                        className="p-2 rounded-md text-gray-500 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(bill)}
                        title="Delete this bill"
                        className="p-2 rounded-md text-gray-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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

      {/* -------- Phone: stacked cards. A six-column table cannot fit 375px
                    without either horizontal scroll (loses the amount column)
                    or shrunken text no-one will read. Cards keep every field
                    visible in the order it's read. -------- */}
      <div className="sm:hidden space-y-3">
        {bills.map(bill => {
          const balance = bill.amount - bill.paidAmount;
          const isOverdue = bill.status !== 'Paid' && bill.dueDate && bill.dueDate < Date.now();
          return (
            <div key={bill.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-gray-900 truncate">{bill.vendorName}</div>
                  <div className="text-sm text-gray-500 line-clamp-2">{bill.description}</div>
                </div>
                <StatusPill status={bill.status} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Bill</div>
                  <div className="font-semibold text-gray-900 tabular-nums">
                    ₹{bill.amount.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Balance</div>
                  <div className={`font-bold tabular-nums ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {balance > 0 ? `₹${balance.toLocaleString('en-IN')}` : 'Settled'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Billed</div>
                  <div className="text-gray-700">{format(bill.date, 'MMM d, yyyy')}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Due</div>
                  {bill.dueDate ? (
                    <div className={isOverdue ? 'text-red-600 font-semibold flex items-center gap-1' : 'text-gray-700'}>
                      {isOverdue && <AlertCircle className="w-3 h-3" />}
                      {format(bill.dueDate, 'MMM d, yyyy')}
                    </div>
                  ) : (
                    <div className="text-gray-400">—</div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                {bill.status !== 'Paid' && (
                  <button
                    onClick={() => setPaymentBill(bill)}
                    className="flex-1 text-sm bg-slate-900 text-white px-3 py-2 rounded-md hover:bg-slate-800 font-medium"
                  >
                    Log Payment
                  </button>
                )}
                <button
                  onClick={() => setEditBill(bill)}
                  className="flex items-center gap-1 px-3 py-2 rounded-md border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
                >
                  <Pencil className="w-4 h-4" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(bill)}
                  title="Delete"
                  className="p-2 rounded-md border border-gray-300 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
        {bills.length === 0 && (
          <div className="bg-white p-8 text-center text-gray-500 rounded-lg border border-gray-200">
            No purchases logged yet.
          </div>
        )}
      </div>

      {addOpen && (
        <PurchaseModal onClose={() => setAddOpen(false)} />
      )}

      {editBill && (
        <PurchaseModal editBill={editBill} onClose={() => setEditBill(null)} />
      )}

      {paymentBill && (
        <PaymentModal bill={paymentBill} onClose={() => setPaymentBill(null)} />
      )}
    </div>
  );
}

function StatusPill({ status }: { status: VendorBill['status'] }) {
  const cls =
    status === 'Paid' ? 'bg-green-100 text-green-800' :
    status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
    'bg-red-100 text-red-800';
  return (
    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold shrink-0 ${cls}`}>
      {status}
    </span>
  );
}
