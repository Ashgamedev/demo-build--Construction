import { useState, useEffect, useMemo } from 'react';
import { useBillStore } from '../../store/billStore';
import { useVendorStore } from '../../store/vendorStore';
import { useProjectStore } from '../../store/projectStore';
import { useWorkforceStore } from '../../store/workforceStore';
import { createdStamp, currentActor } from '../../lib/audit';
import { PurchaseLineItem } from '../../types';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  onClose: () => void;
}

const blankLine = (): PurchaseLineItem => ({
  id: crypto.randomUUID(),
  description: '',
  quantity: 1,
  unit: '',
  rate: 0,
  amount: 0,
});

export function PurchaseModal({ onClose }: Props) {
  const { createBill } = useBillStore();
  const { vendors, subscribeVendors, findOrCreateByName } = useVendorStore();
  const { projects, subscribeProjects } = useProjectStore();
  const { workforce, subscribeWorkforce } = useWorkforceStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [vendorId, setVendorId] = useState('');
  const [newVendorName, setNewVendorName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [purchasedById, setPurchasedById] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState('');
  const [lineItems, setLineItems] = useState<PurchaseLineItem[]>([blankLine()]);
  const [useLineItems, setUseLineItems] = useState(false);
  const [lumpSum, setLumpSum] = useState('');

  // How this purchase is being settled.
  const [settlement, setSettlement] = useState<'credit' | 'paid' | 'partial'>('credit');
  const [amountPaidNow, setAmountPaidNow] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [referenceNumber, setReferenceNumber] = useState('');

  useEffect(() => {
    const unsubs = [subscribeVendors(), subscribeProjects(), subscribeWorkforce()];
    return () => unsubs.forEach((u) => typeof u === 'function' && u());
  }, [subscribeVendors, subscribeProjects, subscribeWorkforce]);

  const total = useMemo(() => {
    if (!useLineItems) return Number(lumpSum) || 0;
    return lineItems.reduce((sum, li) => sum + (Number(li.quantity) || 0) * (Number(li.rate) || 0), 0);
  }, [useLineItems, lumpSum, lineItems]);

  const paidNow =
    settlement === 'paid' ? total : settlement === 'partial' ? Number(amountPaidNow) || 0 : 0;
  const pending = Math.max(0, total - paidNow);

  const selectedVendor = vendors.find((v) => v.id === vendorId);

  // Pre-fill the due date from the shop's usual credit terms.
  useEffect(() => {
    if (selectedVendor?.defaultCreditDays && !dueDate) {
      const d = new Date(date);
      d.setDate(d.getDate() + selectedVendor.defaultCreditDays);
      setDueDate(format(d, 'yyyy-MM-dd'));
    }
  }, [selectedVendor, date, dueDate]);

  const updateLine = (id: string, patch: Partial<PurchaseLineItem>) => {
    setLineItems((prev) =>
      prev.map((li) => {
        if (li.id !== id) return li;
        const next = { ...li, ...patch };
        next.amount = (Number(next.quantity) || 0) * (Number(next.rate) || 0);
        return next;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!vendorId && !newVendorName.trim()) return setError('Choose a shop or enter a new one.');
    if (total <= 0) return setError('Enter the purchase amount.');
    if (settlement === 'partial' && (paidNow <= 0 || paidNow >= total)) {
      return setError('Amount paid now must be more than zero and less than the total.');
    }

    setLoading(true);
    try {
      const vendor = vendorId
        ? vendors.find((v) => v.id === vendorId)!
        : await findOrCreateByName(newVendorName);

      const actor = currentActor();
      const purchaser = workforce.find((w) => w.id === purchasedById);

      const status = pending === 0 ? 'Paid' : paidNow > 0 ? 'Partial' : 'Unpaid';

      await createBill({
        vendorId: vendor.id,
        vendorName: vendor.name,
        description,
        lineItems: useLineItems ? lineItems.filter((li) => li.description.trim()) : undefined,
        amount: total,
        date: new Date(date).getTime(),
        dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
        status,
        paidAmount: paidNow,
        payments: paidNow
          ? [{
              id: crypto.randomUUID(),
              amount: paidNow,
              date: new Date(date).getTime(),
              paymentMode,
              referenceNumber: referenceNumber || undefined,
              recordedBy: actor.id,
              recordedByName: actor.name,
            }]
          : [],
        projectId: projectId || undefined,
        purchasedById: purchasedById || undefined,
        purchasedByName: purchaser?.name || undefined,
        ...createdStamp(),
      } as any);

      onClose();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const field = 'w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none';
  const label = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Add Purchase</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">{error}</div>
          )}

          {/* Shop + project */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>Shop / Supplier <span className="text-red-500">*</span></label>
              <select value={vendorId} onChange={(e) => { setVendorId(e.target.value); setNewVendorName(''); }} className={field}>
                <option value="">-- Select shop --</option>
                {vendors.filter(v => v.isActive !== false).map((v) => (
                  <option key={v.id} value={v.id}>{v.name}{v.category ? ` — ${v.category}` : ''}</option>
                ))}
                <option value="">+ New shop (type below)</option>
              </select>
              {!vendorId && (
                <input
                  type="text"
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  className={`${field} mt-2`}
                  placeholder="New shop name, e.g. SRK Cements"
                />
              )}
            </div>

            <div>
              <label className={label}>Project</label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={field}>
                <option value="">-- General / not project-specific --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={label}>Purchased by</label>
            <select value={purchasedById} onChange={(e) => setPurchasedById(e.target.value)} className={field}>
              <option value="">-- Not recorded --</option>
              {workforce.filter(w => w.isActive).map((w) => (
                <option key={w.id} value={w.id}>{w.name} ({w.trade})</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Who physically bought this, for site accountability.</p>
          </div>

          {/* What was bought */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={label}>What was purchased</label>
              <button
                type="button"
                onClick={() => setUseLineItems(!useLineItems)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                {useLineItems ? 'Use single amount' : 'Add itemised list'}
              </button>
            </div>

            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={field}
              placeholder="e.g. Cement and steel for first floor slab"
            />

            {useLineItems ? (
              <div className="mt-3 space-y-2">
                {lineItems.map((li) => (
                  <div key={li.id} className="grid grid-cols-12 gap-2 items-start">
                    <input
                      className={`${field} col-span-5`} placeholder="Item"
                      value={li.description}
                      onChange={(e) => updateLine(li.id, { description: e.target.value })}
                    />
                    <input
                      className={`${field} col-span-2`} type="number" placeholder="Qty" min="0"
                      value={li.quantity || ''}
                      onChange={(e) => updateLine(li.id, { quantity: Number(e.target.value) })}
                    />
                    <input
                      className={`${field} col-span-2`} placeholder="Unit"
                      value={li.unit || ''}
                      onChange={(e) => updateLine(li.id, { unit: e.target.value })}
                    />
                    <input
                      className={`${field} col-span-2`} type="number" placeholder="Rate" min="0"
                      value={li.rate || ''}
                      onChange={(e) => updateLine(li.id, { rate: Number(e.target.value) })}
                    />
                    <button
                      type="button"
                      onClick={() => setLineItems((p) => p.filter((x) => x.id !== li.id))}
                      className="col-span-1 p-2 text-gray-400 hover:text-red-600"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setLineItems((p) => [...p, blankLine()])}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  <Plus className="w-4 h-4" /> Add item
                </button>
              </div>
            ) : (
              <div className="mt-3">
                <label className={label}>Total amount (₹) <span className="text-red-500">*</span></label>
                <input
                  type="number" min="0" required value={lumpSum}
                  onChange={(e) => setLumpSum(e.target.value)}
                  className={field}
                />
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Purchase date <span className="text-red-500">*</span></label>
              <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={field} />
            </div>
            <div>
              <label className={label}>Payment due date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={field} />
              <p className="text-xs text-gray-500 mt-1">You'll be reminded 3 days, 1 day and 1 hour before.</p>
            </div>
          </div>

          {/* Settlement */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <label className={label}>How is this being paid?</label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {([
                ['credit', 'On credit', 'Nothing paid yet'],
                ['partial', 'Advance paid', 'Part now, rest later'],
                ['paid', 'Paid in full', 'Settled now'],
              ] as const).map(([value, title, sub]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSettlement(value)}
                  className={`p-2 rounded-md border text-left transition-colors ${
                    settlement === value
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                      : 'border-gray-300 bg-white hover:bg-gray-50'
                  }`}
                >
                  <span className="block text-sm font-medium text-gray-900">{title}</span>
                  <span className="block text-xs text-gray-500">{sub}</span>
                </button>
              ))}
            </div>

            {settlement === 'partial' && (
              <div className="mb-3">
                <label className={label}>Amount paid now (₹)</label>
                <input
                  type="number" min="0" value={amountPaidNow}
                  onChange={(e) => setAmountPaidNow(e.target.value)}
                  className={field}
                />
              </div>
            )}

            {settlement !== 'credit' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={label}>Paid by</label>
                  <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className={field}>
                    <option>Cash</option>
                    <option>UPI</option>
                    <option>Bank Transfer</option>
                    <option>Cheque</option>
                  </select>
                </div>
                <div>
                  <label className={label}>Reference no.</label>
                  <input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} className={field} placeholder="Optional" />
                </div>
              </div>
            )}

            {total > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between text-sm">
                <span className="text-gray-600">
                  Total ₹{total.toLocaleString('en-IN')}
                  {paidNow > 0 && <> · Paid ₹{paidNow.toLocaleString('en-IN')}</>}
                </span>
                <span className={`font-semibold ${pending > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {pending > 0 ? `₹${pending.toLocaleString('en-IN')} pending` : 'Fully settled'}
                </span>
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Purchase
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
