import { useState, useEffect } from 'react';
import { usePaymentStore } from '../../store/paymentStore';
import { useCustomerStore } from '../../store/customerStore';
import { useProjectStore } from '../../store/projectStore';
import { useQuotationStore } from '../../store/quotationStore';
import { useCompanySettingsStore } from '../../store/companySettingsStore';
import { sendWhatsAppMessage } from '../../utils/whatsapp';
import { generateReceiptPDF } from '../../utils/pdfGenerator';
import { currentActor } from '../../lib/audit';

interface Props {
  onClose: () => void;
}

export function AddPaymentModal({ onClose }: Props) {
  const { recordPaymentAndGenerateReceipt, loading } = usePaymentStore();
  const { customers } = useCustomerStore();
  const { projects } = useProjectStore();
  const { quotations } = useQuotationStore();
  const { settings, fetchSettings } = useCompanySettingsStore();
  
  const [projectId, setProjectId] = useState<string>('');
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'UPI' | 'bank transfer' | 'cheque'>('UPI');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  
  useEffect(() => {
    if (!settings) fetchSettings();
  }, [settings, fetchSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) return alert('Enter valid amount');
    if (!projectId) return alert('Select a project');

    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    const customer = customers.find(c => c.id === project.customerId);
    if (!customer) return alert('Customer not found for this project');
    
    if (!settings) return alert('Company settings not loaded yet, please try again.');

    const quotationId = project.quotationVersionId || quotations.find(q => q.customerId === customer.id)?.id || 'generic-quotation';
    const quotation = quotations.find(q => q.id === quotationId);

    try {
      const paymentData = {
        quotationId,
        projectId,
        customerId: customer.id,
        amount: Number(amount),
        date: new Date(date).getTime(),
        paymentMode,
        receivedBy: currentActor().id, createdBy: currentActor().id,
      };
      
      const { receiptId, remainingBalance: newBalance } = await recordPaymentAndGenerateReceipt(
        paymentData,
        customer.name,
        project.title,
        project.agreedValue
      );

      if (sendWhatsApp) {
        // Generate PDF
        const pdfBlob = generateReceiptPDF(
          settings,
          customer,
          project,
          { ...paymentData, id: receiptId } as any,
          quotation,
          newBalance
        );
        
        const file = new File([pdfBlob], `Receipt_${receiptId.substring(0,8)}.pdf`, { type: 'application/pdf' });
        
        const shareText = `Hello ${customer.name}, please find your payment receipt of Rs ${amount}/- attached.`;
        
        // Attempt native mobile share
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'Payment Receipt',
              text: shareText,
            });
          } catch (err) {
            console.log('Share was cancelled or failed', err);
          }
        } else {
          // Fallback for desktop: Download PDF and open standard WhatsApp link
          const url = URL.createObjectURL(pdfBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Receipt_${receiptId.substring(0,8)}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          if (customer.phone) {
            sendWhatsAppMessage(customer.phone, `${shareText} (The PDF receipt has been downloaded to your device, please attach it).`);
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
      <div className="bg-white rounded-lg max-w-md w-full p-4 sm:p-6 my-6 mx-2 sm:mx-0 max-h-[90vh] overflow-y-auto">
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
              required 
              value={amount} 
              onChange={e => setAmount(e.target.value ? Number(e.target.value) : '')} 
              className="mt-1 block w-full border border-gray-300 rounded p-2" 
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Payment Mode</label>
              <select 
                value={paymentMode} 
                onChange={e => setPaymentMode(e.target.value as any)} 
                className="mt-1 block w-full border border-gray-300 rounded p-2"
              >
                <option value="UPI">UPI</option>
                <option value="cash">Cash</option>
                <option value="bank transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input 
                type="date" 
                required 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                className="mt-1 block w-full border border-gray-300 rounded p-2" 
              />
            </div>
          </div>
          
          <div className="flex items-center mt-4">
            <input 
              type="checkbox" 
              id="sendWa" 
              checked={sendWhatsApp}
              onChange={e => setSendWhatsApp(e.target.checked)}
              className="mr-2 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="sendWa" className="text-sm text-gray-700">
              Generate & Share PDF Receipt
            </label>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
              {loading ? 'Saving...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
