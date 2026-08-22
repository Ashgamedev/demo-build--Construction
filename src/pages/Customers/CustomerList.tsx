import { useState, useEffect } from 'react';
import { useCustomerStore } from '../../store/customerStore';
import { Plus, Search, MapPin, Phone, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export function CustomerList() {
  const { customers, loading, subscribe, createCustomer } = useCustomerStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [billingAddress, setBillingAddress] = useState('');

  useEffect(() => {
    const unsub = subscribe();
    return () => unsub();
  }, [subscribe]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createCustomer({
        name,
        phone,
        email,
        billingAddress
      });
      setShowModal(false);
      setName(''); setPhone(''); setEmail(''); setBillingAddress('');
    } catch (error: any) {
      alert('Failed to create customer: ' + (error?.message || error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  if (loading) return <div>Loading customers...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Customers</h1>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" /> New Customer
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm">
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Contact</th>
                <th className="p-4 font-medium">Billing Address</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(customer => (
                <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-900">{customer.name}</td>
                  <td className="p-4 text-gray-600 text-sm">
                    <div className="flex items-center"><Phone className="w-3 h-3 mr-2" /> {customer.phone}</div>
                    {customer.email && <div className="flex items-center mt-1"><Mail className="w-3 h-3 mr-2" /> {customer.email}</div>}
                  </td>
                  <td className="p-4 text-gray-600 text-sm">
                    <div className="flex items-start"><MapPin className="w-4 h-4 mr-2 flex-shrink-0 text-gray-400" /> {customer.billingAddress}</div>
                  </td>
                  <td className="p-4 text-right">
                    <Link to={`/customers/${customer.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">View Profile</Link>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">No customers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add New Customer</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Name</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium">Phone</label>
                <input required type="text" value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium">Email (optional)</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium">Billing Address</label>
                <textarea required value={billingAddress} onChange={e => setBillingAddress(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded p-2" rows={3}></textarea>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
