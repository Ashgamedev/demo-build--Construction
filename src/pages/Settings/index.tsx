import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Image as ImageIcon } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useCompanySettingsStore } from '../../store/companySettingsStore';

export function Settings() {
  const { user } = useAuthStore();
  const { settings, fetchSettings, updateSettings } = useCompanySettingsStore();
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    proprietor: '',
    mobileNumbers: '',
    signatureUrl: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      setFormData({
        name: settings.name || '',
        address: settings.address || '',
        proprietor: settings.proprietor || '',
        mobileNumbers: settings.mobileNumbers || '',
        signatureUrl: settings.signatureUrl || ''
      });
    }
  }, [settings]);

  if (user?.role !== 'owner') {
    return (
      <div className="text-center p-8 text-red-500 bg-red-50 rounded-lg">
        You do not have permission to access Settings.
      </div>
    );
  }

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateSettings(formData);
      alert('Settings saved successfully');
    } catch (e: any) {
      alert('Failed to save settings: ' + (e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Image size should be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFormData({ ...formData, signatureUrl: event.target.result as string });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <button 
          onClick={handleSave}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50"
        >
          <Save className="w-5 h-5 mr-2" /> {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Business Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Company Name</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Proprietor Name</label>
              <input 
                type="text" 
                value={formData.proprietor}
                onChange={e => setFormData({ ...formData, proprietor: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Mobile Numbers</label>
              <input 
                type="text" 
                value={formData.mobileNumbers}
                onChange={e => setFormData({ ...formData, mobileNumbers: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <textarea 
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-24" 
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Digital Signature</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50">
                {formData.signatureUrl ? (
                  <div className="relative group w-full flex justify-center">
                    <img src={formData.signatureUrl} alt="Signature" className="max-h-32 object-contain bg-white border rounded p-2" />
                    <button 
                      onClick={() => setFormData({ ...formData, signatureUrl: '' })}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-sm text-gray-500 text-center mb-4">
                      Upload a transparent PNG of the proprietor's signature.
                    </p>
                    <label className="cursor-pointer bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
                      <span>Upload Image</span>
                      <input type="file" className="sr-only" accept="image/*" onChange={handleSignatureUpload} />
                    </label>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                This signature will be appended to Quotations and Agreements when the "Owner Signature" toggle is enabled.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
