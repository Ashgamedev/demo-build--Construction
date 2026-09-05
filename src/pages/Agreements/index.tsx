import { Routes, Route, useNavigate } from 'react-router-dom';
import { AgreementBuilder } from './Builder';
import { useAgreementStore } from '../../store/agreementStore';
import { useCompanySettingsStore } from '../../store/companySettingsStore';
import { useEffect } from 'react';
import { Plus, Trash2, FileText } from 'lucide-react';
import { format } from 'date-fns';

function AgreementList() {
  const { agreements, loading, subscribeAgreements, fetchVersions, versions, deleteAgreement, createBlankFreeformAgreement } = useAgreementStore();
  const { settings, fetchSettings } = useCompanySettingsStore();
  const navigate = useNavigate();

  useEffect(() => { if (!settings) fetchSettings(); }, [settings, fetchSettings]);

  const handleNewLetterpad = async () => {
    if (!settings) return alert('Company settings still loading, please try again in a moment.');
    try {
      const newId = await createBlankFreeformAgreement(settings);
      navigate(`/agreements/${newId}/edit`);
    } catch (e: any) {
      alert('Failed to create agreement: ' + (e?.message || e));
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeAgreements();
    return () => unsubscribe();
  }, [subscribeAgreements]);

  const handleDelete = async (agreementId: string) => {
    if (window.confirm('Are you sure you want to delete this agreement? This action cannot be undone.')) {
      try {
        await deleteAgreement(agreementId);
      } catch (e: any) {
        alert('Failed to delete agreement: ' + e.message);
      }
    }
  };

  useEffect(() => {
    agreements.forEach(a => {
      if (!versions[a.id]) {
        fetchVersions(a.id);
      }
    });
  }, [agreements, fetchVersions, versions]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Agreements</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleNewLetterpad}
            className="bg-white text-blue-700 border border-blue-300 px-4 py-2 rounded-md hover:bg-blue-50 flex items-center"
          >
            <FileText className="w-5 h-5 mr-2" /> New Letter-pad Agreement
          </button>
          <button
            onClick={() => navigate('/quotations')} // agreements originate from quotations
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" /> New from Quotation
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agreement No.</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && agreements.length === 0 ? (
                <tr><td colSpan={5} className="px-3 sm:px-6 py-4 text-center text-gray-500">Loading...</td></tr>
              ) : agreements.length === 0 ? (
                <tr><td colSpan={5} className="px-3 sm:px-6 py-4 text-center text-gray-500">No agreements found.</td></tr>
              ) : (
                agreements.map((agreement) => {
                  const familyVersions = versions[agreement.id];
                  const latestVersion = familyVersions?.[0]; // Assuming ordered desc
                  
                  return (
                    <tr key={agreement.id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap font-medium text-blue-600">
                        {latestVersion?.agreementNumber || 'Pending...'}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-gray-900">
                        {latestVersion?.clientName || 'N/A'}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-gray-500">
                        {agreement.updatedAt ? format(typeof agreement.updatedAt === 'number' ? agreement.updatedAt : new Date(agreement.updatedAt), 'MMM d, yyyy') : '-'}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${agreement.status === 'Draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                          {agreement.status || 'Draft'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900 mr-4" onClick={() => navigate(`/agreements/${agreement.id}/edit`)}>Edit / View</button>
                        <button className="text-red-500 hover:text-red-700 inline-flex items-center" onClick={() => handleDelete(agreement.id)} title="Delete Agreement">
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

export function Agreements() {
  return (
    <Routes>
      <Route path="/" element={<AgreementList />} />
      <Route path="/new" element={<AgreementBuilder />} />
      <Route path="/:id/edit" element={<AgreementBuilder />} />
    </Routes>
  );
}
