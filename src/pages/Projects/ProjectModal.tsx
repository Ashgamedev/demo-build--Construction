import { useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useCustomerStore } from '../../store/customerStore';
import { Project } from '../../types';
import { currentActor } from '../../lib/audit';

interface Props {
  onClose: () => void;
  projectToEdit?: Project | null;
}

export function ProjectModal({ onClose, projectToEdit }: Props) {
  const { createProject, updateProject, loading } = useProjectStore();
  const { customers } = useCustomerStore();
  
  const [title, setTitle] = useState(projectToEdit?.title || '');
  const [siteAddress, setSiteAddress] = useState(projectToEdit?.siteAddress || '');
  const [type, setType] = useState<'residential' | 'commercial' | 'renovation'>(
    (projectToEdit?.type?.toLowerCase() as any) || 'residential'
  );
  const [agreedValue, setAgreedValue] = useState(projectToEdit?.agreedValue || 0);
  const [allocatedAmount, setAllocatedAmount] = useState(projectToEdit?.allocatedAmount || 0);
  const [revisionReason, setRevisionReason] = useState('');
  const [customerId, setCustomerId] = useState(projectToEdit?.customerId || '');
  const [status, setStatus] = useState<Project['status']>(projectToEdit?.status || 'Planning');
  const [progressPercentage, setProgressPercentage] = useState(projectToEdit?.progressPercentage || 0);

  // True only while editing and after the agreed value has actually been
  // changed from what was saved - that's when we need a reason for the change.
  const agreedValueChanged = !!projectToEdit && agreedValue !== projectToEdit.agreedValue;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return alert('Title is required');
    if (!customerId) return alert('Please select a Customer for this project');

    try {
      if (projectToEdit) {
        // If the agreed value changed, record the revision. The first revision
        // also captures the original value, so the history always starts from
        // what was first agreed even for projects created before this feature.
        let agreedValueHistory = projectToEdit.agreedValueHistory;
        if (agreedValueChanged) {
          const actor = currentActor();
          const existing = projectToEdit.agreedValueHistory || [];
          const seeded = existing.length === 0
            ? [{
                amount: projectToEdit.agreedValue || 0,
                reason: 'Original agreed value',
                date: projectToEdit.createdAt || Date.now(),
              }]
            : existing;
          agreedValueHistory = [
            ...seeded,
            {
              amount: agreedValue,
              reason: revisionReason.trim() || 'Revised',
              date: Date.now(),
              changedBy: actor.id,
              changedByName: actor.name,
            },
          ];
        }

        await updateProject(projectToEdit.id, {
          title,
          siteAddress,
          type: type.charAt(0).toUpperCase() + type.slice(1) as any, // Capitalize
          status,
          progressPercentage,
          agreedValue,
          allocatedAmount,
          ...(agreedValueHistory ? { agreedValueHistory } : {}),
          customerId,
        });
      } else {
        await createProject({
          title,
          siteAddress,
          type: type.charAt(0).toUpperCase() + type.slice(1) as any, // Capitalize
          status: 'Planning',
          progressPercentage: 0,
          agreedValue,
          allocatedAmount,
          customerId,
          startDate: Date.now(),
          stages: [],
          warrantyEnabled: false,
          scopeSummary: '',
          createdBy: currentActor().id,
        });
      }
      onClose();
    } catch (error: any) {
      console.error(error);
      alert('Failed to save project: ' + (error?.message || error));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-md w-full p-4 sm:p-6 my-6 mx-2 sm:mx-0 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">{projectToEdit ? 'Edit Project' : 'New Project'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Customer <span className="text-red-500">*</span></label>
            <select 
              required
              value={customerId} 
              onChange={e => setCustomerId(e.target.value)} 
              className="mt-1 block w-full border border-gray-300 rounded p-2"
            >
              <option value="">-- Select a Customer --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
              ))}
            </select>
            {customers.length === 0 && (
              <p className="text-xs text-orange-500 mt-1">No customers found. Please create a customer first.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Project Title</label>
            <input 
              type="text" 
              required 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="mt-1 block w-full border border-gray-300 rounded p-2" 
              placeholder="e.g. Skyline Villa"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Site Address</label>
            <textarea 
              value={siteAddress} 
              onChange={e => setSiteAddress(e.target.value)} 
              className="mt-1 block w-full border border-gray-300 rounded p-2" 
              placeholder="Full site location..."
              rows={2}
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Project Type</label>
              <select 
                value={type} 
                onChange={e => setType(e.target.value as any)} 
                className="mt-1 block w-full border border-gray-300 rounded p-2"
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="renovation">Renovation</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Agreed Value (₹)</label>
              <input
                type="number"
                value={agreedValue}
                onChange={e => setAgreedValue(Number(e.target.value))}
                className="mt-1 block w-full border border-gray-300 rounded p-2"
              />
              <p className="text-xs text-gray-500 mt-1">What the customer pays you.</p>
            </div>
          </div>

          {/* When the agreed value is changed on an existing project, ask why.
              The old value is kept in the project's history automatically. */}
          {agreedValueChanged && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <label className="block text-sm font-medium text-amber-800">
                Why is the agreed value changing?
              </label>
              <p className="text-xs text-amber-700 mb-2">
                Was ₹{(projectToEdit?.agreedValue || 0).toLocaleString('en-IN')}, now ₹{agreedValue.toLocaleString('en-IN')}.
                The old value is kept on record so you can always show the customer the original and the revised amount.
              </p>
              <input
                type="text"
                value={revisionReason}
                onChange={e => setRevisionReason(e.target.value)}
                placeholder="e.g. Added first-floor balcony slope work"
                className="block w-full border border-amber-300 rounded p-2 text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Allocated Amount (₹)</label>
            <input
              type="number"
              value={allocatedAmount}
              onChange={e => setAllocatedAmount(Number(e.target.value))}
              className="mt-1 block w-full border border-gray-300 rounded p-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              The budget you set aside to actually build this project. Your profit is measured against
              it. Only you see this - it never appears on the customer's paperwork.
            </p>
          </div>

          {projectToEdit && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-4 mt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select 
                  value={status} 
                  onChange={e => setStatus(e.target.value as any)} 
                  className="mt-1 block w-full border border-gray-300 rounded p-2"
                >
                  <option value="Planning">Planning</option>
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Delayed">Delayed</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Progress (%)</label>
                <input
                  type="number"
                  min="0" max="100"
                  value={progressPercentage}
                  onChange={e => setProgressPercentage(Number(e.target.value))}
                  className="mt-1 block w-full border border-gray-300 rounded p-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Once you add stages to this project, progress is calculated from them
                  automatically and this number is kept in step.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-6 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Saving...' : projectToEdit ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

