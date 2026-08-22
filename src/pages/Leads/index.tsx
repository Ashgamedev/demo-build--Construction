import { useState, useEffect } from 'react';
import { useLeadStore } from '../../store/leadStore';
import { Plus, Phone, Mail } from 'lucide-react';
import { LeadStatus } from '../../types';
import { currentActor } from '../../lib/audit';

const STAGES = ['New', 'Contacted', 'Site Visit', 'Quotation Sent', 'Converted'];

export function Leads() {
  const { leads, loading, addLead, updateLead, subscribe } = useLeadStore();
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    const unsub = subscribe();
    return () => unsub();
  }, [subscribe]);
  
  // New Lead Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addLead({
        name,
        phone,
        email,
        status: 'New',
        notes,
        source: 'Manual Entry',
        workType: '',
        projectCategory: 'residential',
        siteAddress: '',
        requirements: '',
        createdBy: currentActor().id
      });
      setShowModal(false);
      setName(''); setPhone(''); setEmail(''); setNotes('');
    } catch (error: any) {
      alert('Failed to create lead: ' + (error?.message || error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStageChange = async (leadId: string, newStage: LeadStatus) => {
    try {
      await updateLead(leadId, { status: newStage });
    } catch (error: any) {
      alert('Failed to update stage: ' + (error?.message || error));
    }
  };

  if (loading) return <div>Loading leads...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Leads Pipeline</h1>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" /> Add Lead
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex overflow-x-auto space-x-4 pb-4">
        {STAGES.map(stage => {
          const stageLeads = leads.filter(l => l.status === stage);
          return (
            <div key={stage} className="flex-shrink-0 w-80 bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-700 mb-4 flex justify-between">
                {stage}
                <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs">{stageLeads.length}</span>
              </h3>
              
              <div className="space-y-3">
                {stageLeads.map(lead => (
                  <div key={lead.id} className="bg-white p-4 rounded shadow-sm border border-gray-100 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-gray-900">{lead.name}</h4>
                      {lead.source === 'Website' && (
                        <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Website</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 space-y-1">
                      {lead.phone && <div className="flex items-center"><Phone className="w-3 h-3 mr-2" /> {lead.phone}</div>}
                      {lead.email && <div className="flex items-center"><Mail className="w-3 h-3 mr-2" /> {lead.email}</div>}
                    </div>
                    {lead.requirements && (
                      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 whitespace-pre-wrap mt-2">
                        {lead.requirements}
                      </div>
                    )}
                    
                    <select 
                      value={lead.status}
                      onChange={(e) => handleStageChange(lead.id, e.target.value as LeadStatus)}
                      className="mt-3 block w-full text-xs border border-gray-300 rounded p-1 bg-gray-50"
                    >
                      {STAGES.map(s => <option key={s} value={s}>Move to: {s}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Lead Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full p-4 sm:p-6 mt-10 mb-10 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add New Lead</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Name</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium">Phone</label>
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded p-2" rows={3}></textarea>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Create Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
