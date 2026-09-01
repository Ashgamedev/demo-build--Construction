import { useState, useEffect, useMemo } from 'react';
import { usePaymentStore } from '../../store/paymentStore';
import { useCustomerStore } from '../../store/customerStore';
import { useProjectStore } from '../../store/projectStore';
import { useQuotationStore } from '../../store/quotationStore';
import { useStageStore } from '../../store/stageStore';
import { useCompanySettingsStore } from '../../store/companySettingsStore';
import { sendWhatsAppMessage } from '../../utils/whatsapp';
import { generateReceiptPDF } from '../../utils/pdfGenerator';
import { currentActor } from '../../lib/audit';
import { PaymentAllocation, PaymentPurpose } from '../../types';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  onClose: () => void;
}

/** Labels in the customer's language. "Milestone" tests as jargon in every
 *  conversation - "Scheduled instalment" is what he actually says. */
const PURPOSE_OPTIONS: Array<{ value: PaymentPurpose; label: string; hint: string }> = [
  { value: 'milestone',  label: 'Scheduled instalment', hint: 'Part of the agreed payment plan, tied to a stage' },
  { value: 'advance',    label: 'Advance',              hint: 'Money taken before that piece of work begins' },
  { value: 'variation',  label: 'Variation / addition', hint: 'Extra work the customer added to the project' },
  { value: 'general',    label: 'General collection',   hint: 'No specific purpose - on account' },
  { value: 'other',      label: 'Other',                hint: 'Anything else - explain in the description' },
];

const newAllocation = (amount = 0): PaymentAllocation => ({
  id: crypto.randomUUID(),
  amount,
  purpose: 'general',
});

export function AddPaymentModal({ onClose }: Props) {
  const { recordPaymentAndGenerateReceipt, loading } = usePaymentStore();
  const { customers } = useCustomerStore();
  const { projects } = useProjectStore();
  const { quotations } = useQuotationStore();
  const { stages, subscribeStages } = useStageStore();
  const { settings, fetchSettings } = useCompanySettingsStore();

  const [projectId, setProjectId] = useState<string>('');
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'UPI' | 'bank transfer' | 'cheque'>('UPI');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);

  // Start with one line - most payments are single-purpose and the split UI
  // shouldn't be in the way for the common case. Adding a second line reveals
  // the running sum.
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([newAllocation()]);

  useEffect(() => {
    if (!settings) fetchSettings();
  }, [settings, fetchSettings]);

  useEffect(() => {
    if (!projectId) return;
    const unsub = subscribeStages(projectId);
    return () => unsub();
  }, [projectId, subscribeStages]);

  // Whenever the top-level amount changes and there's only one line, keep them
  // in step - single-purpose is the common case and forcing him to also type
  // the amount into the line would be an obviously stupid extra step.
  useEffect(() => {
    if (allocations.length === 1) {
      setAllocations([{ ...allocations[0], amount: Number(amount) || 0 }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount]);

  const projectStages = useMemo(
    () => [...((stages as any)[projectId] || [])].sort((a: any, b: any) => a.order - b.order),
    [stages, projectId]
  );

  const allocSum = useMemo(
    () => allocations.reduce((s, a) => s + (Number(a.amount) || 0), 0),
    [allocations]
  );

  const total = Number(amount) || 0;
  const diff = total - allocSum;
  const splitValid = allocations.length === 0 || Math.abs(diff) < 0.005;

  const updateAlloc = (id: string, patch: Partial<PaymentAllocation>) => {
    setAllocations(list => list.map(a => (a.id === id ? { ...a, ...patch } : a)));
  };
  const addLine = () => setAllocations(list => [...list, newAllocation(Math.max(0, diff))]);
  const removeLine = (id: string) => setAllocations(list => list.filter(a => a.id !== id));

  const stageName = (stageId?: string) =>
    stageId ? projectStages.find(s => s.id === stageId)?.name : undefined;

  const purposeLabel = (p: PaymentPurpose) => PURPOSE_OPTIONS.find(o => o.value === p)?.label || p;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || total <= 0) return alert('Enter the amount received.');
    if (!projectId) return alert('Select a project.');
    if (!splitValid) {
      return alert(
        `The lines add up to ₹${allocSum.toLocaleString('en-IN')}, but you received `
        + `₹${total.toLocaleString('en-IN')}. They must match before you can save.`
      );
    }
    for (const a of allocations) {
      if (a.purpose === 'other' && !(a.description || '').trim()) {
        return alert('For "Other", please write a short description so the receipt makes sense.');
      }
      if (a.purpose === 'milestone' && !a.stageId) {
        return alert('For a scheduled instalment, choose which stage it settles.');
      }
    }

    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const customer = customers.find(c => c.id === project.customerId);
    if (!customer) return alert('Customer not found for this project');
    if (!settings) return alert('Company settings not loaded yet, please try again.');

    const quotationId =
      project.quotationVersionId ||
      quotations.find(q => q.customerId === customer.id)?.id ||
      'generic-quotation';
    const quotation = quotations.find(q => q.id === quotationId);

    // Freeze stage names into the allocations sent to the store so a stage
    // renamed later never rewrites the printed history.
    const cleanAllocations: PaymentAllocation[] = allocations.map(a => ({
      id: a.id,
      amount: Number(a.amount) || 0,
      purpose: a.purpose,
      stageId: a.purpose === 'milestone' ? a.stageId : undefined,
      description: (a.description || '').trim() || undefined,
    }));

    // If it's a single "general" line with no description, the payment isn't
    // really allocated - keep the allocations array off so old code paths
    // stay clean.
    const isSingleGeneric =
      cleanAllocations.length === 1 &&
      cleanAllocations[0].purpose === 'general' &&
      !cleanAllocations[0].description;

    try {
      const paymentData = {
        quotationId,
        projectId,
        customerId: customer.id,
        amount: total,
        date: new Date(date).getTime(),
        paymentMode,
        allocations: isSingleGeneric ? undefined : cleanAllocations,
        receivedBy: currentActor().id,
        createdBy: currentActor().id,
      };

      const receiptAllocations = isSingleGeneric ? undefined : cleanAllocations.map(a => ({
        amount: a.amount,
        purpose: a.purpose,
        stageName: stageName(a.stageId),
        description: a.description,
      }));

      const { receiptId, remainingBalance: newBalance } = await recordPaymentAndGenerateReceipt(
        paymentData,
        customer.name,
        project.title,
        project.agreedValue,
        receiptAllocations
      );

      if (sendWhatsApp) {
        const pdfBlob = generateReceiptPDF(
          settings,
          customer,
          project,
          { ...paymentData, id: receiptId } as any,
          quotation,
          newBalance
        );

        const file = new File([pdfBlob], `Receipt_${receiptId.substring(0, 8)}.pdf`, { type: 'application/pdf' });
        const shareText = `Hello ${customer.name}, please find your payment receipt of Rs ${total}/- attached.`;

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: 'Payment Receipt', text: shareText });
          } catch (err) {
            console.log('Share was cancelled or failed', err);
          }
        } else {
          const url = URL.createObjectURL(pdfBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Receipt_${receiptId.substring(0, 8)}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          if (customer.phone) {
            sendWhatsAppMessage(
              customer.phone,
              `${shareText} (The PDF receipt has been downloaded to your device, please attach it).`
            );
          }
        }
      }

      onClose();
    } catch (error: any) {
      console.error(error);
      alert('Failed to record payment: ' + (error?.message || error));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-lg w-full p-4 sm:p-6 my-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Record Inbound Payment</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Project / Customer</label>
            <select
              required
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded p-2"
            >
              <option value="">-- Select Project --</option>
              {projects.map(p => {
                const customer = customers.find(c => c.id === p.customerId);
                return (
                  <option key={p.id} value={p.id}>
                    {p.title} {customer ? `(${customer.name})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Amount Received (₹)</label>
            <input
              type="number"
              min="0"
              required
              value={amount}
              onChange={e => setAmount(e.target.value ? Number(e.target.value) : '')}
              className="mt-1 block w-full border border-gray-300 rounded p-2 text-lg font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Payment Mode</label>
              <select value={paymentMode} onChange={e => setPaymentMode(e.target.value as any)} className="mt-1 block w-full border border-gray-300 rounded p-2">
                <option value="UPI">UPI</option>
                <option value="cash">Cash</option>
                <option value="bank transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded p-2" />
            </div>
          </div>

          {/* -------- Purpose / split -------- */}
          <div className="border-t border-gray-200 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">What is this payment for?</h3>
              {allocations.length === 1 && (
                <button type="button" onClick={addLine} className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Split into parts
                </button>
              )}
            </div>

            {allocations.length > 1 && (
              <p className="text-xs text-gray-500 -mt-1">
                One payment settling several things. Each line shows on the receipt.
                Lines must add up to the amount received.
              </p>
            )}

            {allocations.map((a, idx) => (
              <div key={a.id} className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-2">
                {allocations.length > 1 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Part {idx + 1}</span>
                    <button type="button" onClick={() => removeLine(a.id)} className="text-gray-400 hover:text-red-600" title="Remove this line">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Purpose</label>
                    <select
                      value={a.purpose}
                      onChange={e => updateAlloc(a.id, { purpose: e.target.value as PaymentPurpose, stageId: undefined })}
                      className="mt-1 block w-full border border-gray-300 rounded p-2 text-sm"
                    >
                      {PURPOSE_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-gray-500 mt-1">
                      {PURPOSE_OPTIONS.find(o => o.value === a.purpose)?.hint}
                    </p>
                  </div>
                  {allocations.length > 1 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Amount for this part (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={a.amount || ''}
                        onChange={e => updateAlloc(a.id, { amount: Number(e.target.value) || 0 })}
                        className="mt-1 block w-full border border-gray-300 rounded p-2 text-sm font-semibold"
                      />
                    </div>
                  )}
                </div>

                {a.purpose === 'milestone' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Which stage?</label>
                    <select
                      value={a.stageId || ''}
                      onChange={e => updateAlloc(a.id, { stageId: e.target.value || undefined })}
                      className="mt-1 block w-full border border-gray-300 rounded p-2 text-sm"
                    >
                      <option value="">-- Choose a stage --</option>
                      {projectStages.length === 0 && projectId && (
                        <option value="" disabled>No stages set up for this project yet</option>
                      )}
                      {projectStages.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-600">
                    Description {a.purpose === 'other' && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={a.description || ''}
                    onChange={e => updateAlloc(a.id, { description: e.target.value })}
                    placeholder={
                      a.purpose === 'variation' ? 'e.g. Extra window in the bedroom' :
                      a.purpose === 'advance' ? 'e.g. Advance for wiring' :
                      a.purpose === 'other' ? 'What is this for?' :
                      'Optional - shown on the receipt'
                    }
                    className="mt-1 block w-full border border-gray-300 rounded p-2 text-sm"
                  />
                </div>
              </div>
            ))}

            {allocations.length > 1 && (
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={addLine} className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add another part
                </button>
                <div className={`text-sm font-semibold ${splitValid ? 'text-green-700' : 'text-orange-600'}`}>
                  {splitValid ? (
                    <>Lines add up ✓</>
                  ) : diff > 0 ? (
                    <>₹{diff.toLocaleString('en-IN')} still to allocate</>
                  ) : (
                    <>Over by ₹{Math.abs(diff).toLocaleString('en-IN')}</>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center mt-4">
            <input
              type="checkbox"
              id="sendWa"
              checked={sendWhatsApp}
              onChange={e => setSendWhatsApp(e.target.checked)}
              className="mr-2 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="sendWa" className="text-sm text-gray-700">Generate &amp; Share PDF Receipt</label>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50">Cancel</button>
            <button
              type="submit"
              disabled={loading || !splitValid || !total}
              title={!splitValid ? 'The line amounts must add up to the amount received.' : undefined}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
