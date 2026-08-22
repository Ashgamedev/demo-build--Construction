import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContractorStore } from '../../store/contractorStore';
import { useWorkforceStore } from '../../store/workforceStore';
import { HardHat, Plus, Activity, Edit2 } from 'lucide-react';

interface Props {
  projectId: string;
}

export function ProjectContractorsTab({ projectId }: Props) {
  const navigate = useNavigate();
  const { assignments, fetchProjectContractors, createAssignment } = useContractorStore();
  const { workforce } = useWorkforceStore();
  
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [formData, setFormData] = useState({
    workforceId: '',
    assignedScope: '',
    agreedValue: 0,
    compensationModel: 'fixed' as 'fixed' | 'daily' | 'sqft',
    paymentMethod: 'full_job' as 'milestone' | 'full_job'
  });

  useEffect(() => {
    fetchProjectContractors(projectId);
  }, [projectId, fetchProjectContractors]);

  const handleAssign = async () => {
    if (!formData.workforceId || formData.agreedValue <= 0) {
      alert('Please select a contractor and enter a valid agreed value.');
      return;
    }
    
    try {
      await createAssignment({
        id: crypto.randomUUID(),
        projectId,
        workforceId: formData.workforceId,
        assignedScope: formData.assignedScope,
        agreedValue: formData.agreedValue,
        compensationModel: formData.compensationModel,
        paymentMethod: formData.paymentMethod,
        status: 'active',
        totalPaid: 0,
        progressPercentage: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      setShowAssignForm(false);
      setFormData({ workforceId: '', assignedScope: '', agreedValue: 0, compensationModel: 'fixed', paymentMethod: 'full_job' });
    } catch (e: any) {
      alert('Failed to assign contractor: ' + e.message);
    }
  };

  const contractors = workforce.filter(w => w.type === 'Contractor' || w.type === 'Subcontractor');
  
  // Filter out those already assigned
  const availableContractors = contractors.filter(
    c => !assignments.some(a => a.workforceId === c.id && a.status === 'active')
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <HardHat className="w-5 h-5 mr-2 text-orange-500" />
          Assigned Contractors
        </h2>
        {!showAssignForm && (
          <button 
            onClick={() => setShowAssignForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center text-sm"
          >
            <Plus className="w-4 h-4 mr-1" /> Assign Contractor
          </button>
        )}
      </div>

      {showAssignForm && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-4">Assign New Contractor</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Select Contractor</label>
              <select 
                value={formData.workforceId}
                onChange={e => setFormData({ ...formData, workforceId: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              >
                <option value="">-- Choose --</option>
                {availableContractors.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.trade})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Compensation Model</label>
              <select 
                value={formData.compensationModel}
                onChange={e => setFormData({ ...formData, compensationModel: e.target.value as any })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              >
                <option value="fixed">Fixed Lumpsum</option>
                <option value="sqft">Per Sq.ft</option>
                <option value="daily">Daily Wages</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Payment Method</label>
              <select 
                value={formData.paymentMethod}
                onChange={e => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              >
                <option value="full_job">Full Payment at End of Job</option>
                <option value="milestone">Milestone Based (Mini-contract)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Assigned Scope / Description</label>
              <input 
                type="text" 
                value={formData.assignedScope}
                onChange={e => setFormData({ ...formData, assignedScope: e.target.value })}
                placeholder="e.g. Electrical wiring for first floor"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Agreed Value (₹)</label>
              <input 
                type="number" 
                value={formData.agreedValue}
                onChange={e => setFormData({ ...formData, agreedValue: Number(e.target.value) })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end space-x-3">
            <button onClick={() => setShowAssignForm(false)} className="text-gray-600 hover:text-gray-800">Cancel</button>
            <button onClick={handleAssign} className="bg-blue-600 text-white px-4 py-2 rounded">Confirm Assignment</button>
          </div>
        </div>
      )}

      {assignments.length === 0 && !showAssignForm && (
        <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500">No contractors assigned to this project yet.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assignments.map(assignment => {
          const contractor = workforce.find(w => w.id === assignment.workforceId);
          if (!contractor) return null;
          
          return (
            <div key={assignment.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="p-4 border-b border-gray-100 flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">{contractor.name}</h3>
                  <p className="text-sm text-gray-500">{contractor.trade}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`px-2 py-1 mb-1 rounded text-xs font-medium ${assignment.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {assignment.status.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">
                    {assignment.paymentMethod === 'milestone' ? 'Milestone Based' : 'Full Job Payment'}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3 text-sm">
                <div>
                  <span className="text-gray-500 block text-xs">Assigned Scope</span>
                  <span className="font-medium text-gray-900">{assignment.assignedScope || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-500 block text-xs">Agreed Value</span>
                    <span className="font-medium">₹{assignment.agreedValue.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Total Paid</span>
                    <span className="font-medium text-green-600">₹{assignment.totalPaid.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Work Progress</span>
                    <span className="font-medium">{assignment.progressPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${assignment.progressPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-b-lg border-t border-gray-100 flex justify-end">
                <button 
                  onClick={() => navigate(`/projects/${projectId}/contractors/${assignment.id}`)}
                  className="text-blue-600 hover:text-blue-800 flex items-center text-sm font-medium"
                >
                  <Activity className="w-4 h-4 mr-1" /> Dashboard & Logs
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
