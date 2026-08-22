// @ts-nocheck
import { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCustomerStore } from '../../store/customerStore';
import { useProjectStore } from '../../store/projectStore';
import { useQuotationStore } from '../../store/quotationStore';
import { usePaymentStore } from '../../store/paymentStore';
import { useAgreementStore } from '../../store/agreementStore';
import { ArrowLeft, Briefcase, FileText, IndianRupee, FileSignature, AlertTriangle } from 'lucide-react';

export function CustomerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { customers, subscribe: subscribeCustomers } = useCustomerStore();
  const { projects, subscribeProjects } = useProjectStore();
  const { quotations, subscribeQuotations } = useQuotationStore();
  const { payments, subscribeToQuotationPayments } = usePaymentStore();
  const { agreements, versions: agreementVersions, subscribeAgreements, fetchVersions: fetchAgreementVersions } = useAgreementStore();

  useEffect(() => {
    const unsubC = subscribeCustomers();
    const unsubP = subscribeProjects();
    const unsubQ = subscribeQuotations();
    const unsubA = subscribeAgreements();
    
    // In a real app with more refined stores, we would fetch payments by customerId.
    // For this scaffold, we'll assume the payment store can load all or we subscribe via some mock logic.
    // const unsubPay = subscribeToPayments(id);
    
    return () => {
      unsubC();
      unsubP();
      unsubQ();
      unsubA();
    };
  }, [id, subscribeCustomers, subscribeProjects, subscribeQuotations, subscribeAgreements]);

  const customer = customers.find(c => c.id === id);
  const customerProjects = projects.filter(p => p.customerId === id);
  const customerQuotes = quotations.filter(q => q.customerId === id);
  const customerAgreements = agreements.filter(a => a.customerId === id || customerQuotes.some(q => q.id === a.quotationId));
  // Assuming payments array holds customer's payments if we fetched them correctly:
  const customerPayments = payments.filter(p => p.customerId === id);

  useEffect(() => {
    customerAgreements.forEach(a => {
      if (!agreementVersions[a.id]) fetchAgreementVersions(a.id);
    });
  }, [customerAgreements, agreementVersions, fetchAgreementVersions]);

  if (!customer) return <div>Loading customer profile...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button onClick={() => navigate('/customers')} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">{customer.name} - Profile</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-lg font-medium border-b pb-2 mb-4">Contact Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><span className="text-gray-500">Phone:</span> {customer.phone}</div>
          <div><span className="text-gray-500">Email:</span> {customer.email || 'N/A'}</div>
          <div className="md:col-span-2"><span className="text-gray-500">Billing Address:</span> {customer.billingAddress}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Projects History */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center">
            <Briefcase className="w-5 h-5 mr-2 text-blue-600" />
            <h3 className="font-semibold text-gray-700">Projects History</h3>
          </div>
          <div className="p-4 space-y-3">
            {customerProjects.length === 0 ? <p className="text-gray-500 text-sm">No projects found.</p> : null}
            {customerProjects.map(p => (
              <div key={p.id} className="border-b pb-2 last:border-0">
                <div className="font-medium">{p.title}</div>
                <div className="text-xs text-gray-500">{p.status} - ₹{p.agreedValue?.toLocaleString('en-IN')}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quotations */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-green-600" />
            <h3 className="font-semibold text-gray-700">Quotations Issued</h3>
          </div>
          <div className="p-4 space-y-3">
            {customerQuotes.length === 0 ? (
              <div className="text-sm text-gray-500 space-y-2">
                <p>No quotations found.</p>
                {/* A quotation created without picking a customer has nothing
                    tying it here, which looked like data going missing. */}
                {quotations.some(q => !q.customerId) && (
                  <p className="flex items-start gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Some quotations aren't linked to any customer. Open the quotation and choose this customer in the <strong>Client</strong> box to make it appear here.
                    </span>
                  </p>
                )}
              </div>
            ) : null}
            {customerQuotes.map(q => (
              <Link
                key={q.id}
                to={`/quotations/${q.id}/edit`}
                className="block border-b pb-2 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded"
              >
                <div className="font-medium">Quotation #{q.id.substring(0,6).toUpperCase()}</div>
                <div className="text-xs text-gray-500">{q.status}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Agreements */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center">
            <FileSignature className="w-5 h-5 mr-2 text-indigo-600" />
            <h3 className="font-semibold text-gray-700">Agreements</h3>
          </div>
          <div className="p-4 space-y-3">
            {customerAgreements.length === 0 ? (
              <p className="text-gray-500 text-sm">No agreements yet.</p>
            ) : customerAgreements.map(a => {
              // The signed value and number live on the agreement's version,
              // not the agreement itself.
              const v = (agreementVersions[a.id] || [])[0];
              const statusTone =
                a.status === 'Signed' ? 'bg-green-100 text-green-800'
                : a.status === 'Cancelled' ? 'bg-red-100 text-red-800'
                : a.status === 'Sent' ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-700';
              return (
                <Link
                  key={a.id}
                  to={`/agreements/${a.id}/edit`}
                  className="flex items-start justify-between gap-3 border-b pb-3 last:border-0 hover:bg-gray-50 -mx-2 px-2 py-1 rounded"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {v?.agreementNumber || `Agreement #${a.id.substring(0, 6).toUpperCase()}`}
                    </div>
                    <div className="text-xs text-gray-500">
                      {v?.subject || 'No subject'}
                      {v?.date ? ` · ${new Date(v.date).toLocaleDateString('en-IN')}` : ''}
                    </div>
                    {v?.signatures && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        {v.signatures.clientSigned ? 'Client signed' : 'Awaiting client signature'}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {v?.totalValue ? (
                      <div className="font-semibold text-gray-900">₹{v.totalValue.toLocaleString('en-IN')}</div>
                    ) : null}
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${statusTone}`}>
                      {a.status}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Payments Ledger */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center">
            <IndianRupee className="w-5 h-5 mr-2 text-orange-600" />
            <h3 className="font-semibold text-gray-700">Payments & Receipts</h3>
          </div>
          <div className="p-4 space-y-3">
            {customerPayments.length === 0 ? <p className="text-gray-500 text-sm">No payments recorded.</p> : null}
            {customerPayments.map(p => (
              <div key={p.id} className="border-b pb-2 last:border-0">
                <div className="font-medium">₹{p.amount.toLocaleString('en-IN')}</div>
                <div className="text-xs text-gray-500">{new Date(p.date).toLocaleDateString()} via {p.paymentMode}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

