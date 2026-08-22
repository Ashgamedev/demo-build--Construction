import { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { QuotationBuilder } from './Builder';
import { useQuotationStore } from '../../store/quotationStore';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

function QuotationList() {
  const { quotations, loading, error, subscribeQuotations, fetchVersions, versions, deleteQuotation } = useQuotationStore();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = subscribeQuotations();
    return () => unsubscribe();
  }, [subscribeQuotations]);

  const handleDelete = async (familyId: string) => {
    if (window.confirm('Are you sure you want to delete this quotation and all its versions? This action cannot be undone.')) {
      try {
        await deleteQuotation(familyId);
      } catch (e: any) {
        alert('Failed to delete quotation: ' + e.message);
      }
    }
  };

  // Optionally fetch versions for all quotations to get the quotation number from the current version
  useEffect(() => {
    quotations.forEach(q => {
      if (!versions[q.id]) {
        fetchVersions(q.id);
      }
    });
  }, [quotations, fetchVersions, versions]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Quotations</h1>
        <button 
          onClick={() => navigate('/quotations/new')}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" /> New Quotation
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quotation No.</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && quotations.length === 0 ? (
                <tr><td colSpan={5} className="px-3 sm:px-6 py-4 text-center text-gray-500">Loading...</td></tr>
              ) : quotations.length === 0 ? (
                <tr><td colSpan={5} className="px-3 sm:px-6 py-4 text-center text-gray-500">No quotations found. Create one to get started.</td></tr>
              ) : (
                quotations.map((quotation) => {
                  const familyVersions = versions[quotation.id];
                  const latestVersion = familyVersions?.find(v => v.id === quotation.currentVersionId) || familyVersions?.[0];
                  
                  return (
                    <tr key={quotation.id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap font-medium text-blue-600">
                        {latestVersion?.quotationNumber || 'Pending...'}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-gray-900">
                        {latestVersion?.clientName || 'N/A'}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-gray-500">
                        {quotation.updatedAt ? format(typeof quotation.updatedAt === 'number' ? quotation.updatedAt : quotation.updatedAt.toDate ? quotation.updatedAt.toDate() : new Date(quotation.updatedAt), 'MMM d, yyyy') : '-'}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${quotation.status === 'Draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                          {quotation.status || 'Draft'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900 mr-4" onClick={() => navigate(`/quotations/${quotation.id}/edit`)}>Edit</button>
                        <button className="text-green-600 hover:text-green-900 mr-4" onClick={() => navigate(`/agreements/new?quotationId=${quotation.id}`)}>Create Agreement</button>
                        <button className="text-red-500 hover:text-red-700 inline-flex items-center" onClick={() => handleDelete(quotation.id)} title="Delete Quotation">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function Quotations() {
  return (
    <Routes>
      <Route path="/" element={<QuotationList />} />
      <Route path="/new" element={<QuotationBuilder />} />
      <Route path="/:id/edit" element={<QuotationBuilder />} />
    </Routes>
  );
}
