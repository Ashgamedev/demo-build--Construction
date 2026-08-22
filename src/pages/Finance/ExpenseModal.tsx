import { useState, useEffect, useMemo } from 'react';
import { useFinanceStore } from '../../store/financeStore';
import { useProjectStore } from '../../store/projectStore';
import { useStageStore } from '../../store/stageStore';
import { useWorkforceStore } from '../../store/workforceStore';
import { useVendorStore } from '../../store/vendorStore';
import { WorkforceType } from '../../types';

interface Props {
  onClose: () => void;
  defaultPayeeId?: string;
  defaultPayeeName?: string;
  /** Pre-selects (and locks) the project - used when recording pay for a
   *  specific person from inside that project's own staff list, so the
   *  expense can't accidentally land against the wrong project. */
  defaultProjectId?: string;
}

type PayeeType = 'workforce' | 'vendor' | 'other';

/** Sensible default expense category for a given kind of worker. */
function categoryForWorkforceType(type?: WorkforceType): string {
  switch (type) {
    case 'Coolie':
      return 'Labour/Contractor';
    case 'Permanent Employee':
    case 'Site Staff':
      return 'Salary';
    case 'Contractor':
    case 'Subcontractor':
      return 'Labour/Contractor';
    default:
      return 'Materials';
  }
}

export function ExpenseModal({ onClose, defaultPayeeId, defaultPayeeName, defaultProjectId }: Props) {
  const { addExpense } = useFinanceStore();
  const { projects } = useProjectStore();
  const { stages, subscribeStages } = useStageStore();
  const { workforce, subscribeWorkforce } = useWorkforceStore();
  const { vendors, subscribeVendors } = useVendorStore();
  const [loading, setLoading] = useState(false);

  const [projectId, setProjectId] = useState<string>(defaultProjectId || '');
  const [stageId, setStageId] = useState<string>('');

  // Who this expense is for.
  const [payeeType, setPayeeType] = useState<PayeeType>(defaultPayeeId ? 'workforce' : 'other');
  const [workforceId, setWorkforceId] = useState(defaultPayeeId || '');
  const [vendorId, setVendorId] = useState('');
  const [otherPayeeName, setOtherPayeeName] = useState(defaultPayeeName || '');

  const [category, setCategory] = useState('Materials');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paidBy, setPaidBy] = useState('Company bank');
  const [paymentMethod, setPaymentMethod] = useState('UPI');

  useEffect(() => {
    const unsubs = [subscribeWorkforce(), subscribeVendors()];
    return () => unsubs.forEach((u) => typeof u === 'function' && u());
  }, [subscribeWorkforce, subscribeVendors]);

  useEffect(() => {
    if (projectId) {
      const unsub = subscribeStages(projectId);
      return () => unsub();
    }
  }, [projectId, subscribeStages]);

  const selectedWorker = workforce.find((w) => w.id === workforceId);
  const selectedVendor = vendors.find((v) => v.id === vendorId);

  // Suggest a matching category once a worker is chosen, without overriding a manual change.
  const [categoryTouched, setCategoryTouched] = useState(false);
  useEffect(() => {
    if (payeeType === 'workforce' && selectedWorker && !categoryTouched) {
      setCategory(categoryForWorkforceType(selectedWorker.type));
    }
    if (payeeType === 'vendor' && !categoryTouched) {
      setCategory('Materials');
    }
  }, [payeeType, selectedWorker, categoryTouched]);

  const resolvedPayeeName = useMemo(() => {
    if (payeeType === 'workforce') return selectedWorker?.name || '';
    if (payeeType === 'vendor') return selectedVendor?.name || '';
    return otherPayeeName;
  }, [payeeType, selectedWorker, selectedVendor, otherPayeeName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) return alert('Enter valid amount');
    if (payeeType === 'workforce' && !workforceId) return alert('Select who this was paid to');
    if (payeeType === 'vendor' && !vendorId) return alert('Select the shop this was paid to');
    if (payeeType === 'other' && !otherPayeeName.trim()) return alert('Enter who this was paid to');
    if (!description) return alert('Description is required');

    setLoading(true);
    try {
      const payload: any = {
        category,
        description,
        amount: Number(amount),
        date: new Date(date).getTime(),
        payeeType,
        payeeId: payeeType === 'workforce' ? workforceId : payeeType === 'vendor' ? vendorId : undefined,
        payeeName: resolvedPayeeName,
        paidBy: paidBy as any,
        paymentMethod,
      };

      if (projectId) payload.projectId = projectId;
      if (stageId) payload.stageId = stageId;

      await addExpense(payload);
      onClose();
    } catch (error: any) {
      console.error(error);
      alert('Failed to record expense: ' + (error?.message || error));
    } finally {
      setLoading(false);
    }
  };

  const projectStages = projectId ? stages[projectId] || [] : [];
  const field = 'mt-1 block w-full border border-gray-300 rounded p-2 text-sm';
  const label = 'block text-sm font-medium text-gray-700';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-md w-full p-4 sm:p-6 my-6 mx-2 sm:mx-0 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Record Expense</h2>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Who this was paid to */}
          <div>
            <label className={label}>This expense was paid to <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {([
                ['workforce', 'Coolie / Staff / Contractor'],
                ['vendor', 'Shop / Vendor'],
                ['other', 'Someone else'],
              ] as const).map(([value, title]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPayeeType(value)}
                  disabled={!!defaultPayeeId}
                  className={`p-2 rounded-md border text-xs font-medium leading-tight transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                    payeeType === value
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 text-blue-900'
                      : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {title}
                </button>
              ))}
            </div>

            {payeeType === 'workforce' && (
              <select
                value={workforceId}
                onChange={(e) => setWorkforceId(e.target.value)}
                disabled={!!defaultPayeeId}
                className={`${field} disabled:bg-gray-100`}
              >
                <option value="">-- Select person --</option>
                {workforce.filter((w) => w.isActive).map((w) => (
                  <option key={w.id} value={w.id}>{w.name} — {w.type} ({w.trade})</option>
                ))}
              </select>
            )}

            {payeeType === 'vendor' && (
              <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={field}>
                <option value="">-- Select shop --</option>
                {vendors.filter((v) => v.isActive !== false).map((v) => (
                  <option key={v.id} value={v.id}>{v.name}{v.category ? ` — ${v.category}` : ''}</option>
                ))}
              </select>
            )}

            {payeeType === 'other' && (
              <input
                type="text"
                required
                value={otherPayeeName}
                onChange={(e) => setOtherPayeeName(e.target.value)}
                className={field}
                placeholder="Name of who was paid"
              />
            )}
          </div>

          <div>
            <label className={label}>Project {!defaultProjectId && '(Optional)'}</label>
            <select
              value={projectId}
              onChange={e => {
                setProjectId(e.target.value);
                setStageId('');
              }}
              disabled={!!defaultProjectId}
              className={`${field} disabled:bg-gray-100`}
            >
              <option value="">-- General Business Expense --</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          {projectId && projectStages.length > 0 && (
            <div>
              <label className={label}>Project Stage (Optional)</label>
              <select
                value={stageId}
                onChange={e => setStageId(e.target.value)}
                className={field}
              >
                <option value="">-- Unassigned to Stage --</option>
                {projectStages.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.status})</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>Category</label>
              <select
                value={category}
                onChange={e => { setCategory(e.target.value); setCategoryTouched(true); }}
                className={field}
              >
                <option value="Materials">Materials</option>
                <option value="Labour/Contractor">Labour/Contractor</option>
                <option value="Salary">Salary</option>
                <option value="Equipment">Equipment</option>
                <option value="Fuel/Travel">Fuel/Travel</option>
                <option value="Office">Office/Admin</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className={label}>Amount (₹)</label>
              <input
                type="number"
                required
                value={amount}
                onChange={e => setAmount(e.target.value ? Number(e.target.value) : '')}
                className={field}
              />
            </div>
          </div>

          <div>
            <label className={label}>Description</label>
            <input
              type="text"
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={field}
              placeholder="e.g. Cement bags (50x)"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>Paid By</label>
              <select
                value={paidBy}
                onChange={e => setPaidBy(e.target.value)}
                className={field}
              >
                <option value="Company cash">Company Cash</option>
                <option value="Company bank">Company Bank</option>
                <option value="Owner personally">Owner Personally</option>
                <option value="Staff personally">Staff Personally</option>
              </select>
            </div>
            <div>
              <label className={label}>Method</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className={field}
              >
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>

          <div>
            <label className={label}>Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className={field}
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
              {loading ? 'Saving...' : 'Record Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
