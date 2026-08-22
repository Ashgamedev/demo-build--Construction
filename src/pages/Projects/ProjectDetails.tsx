import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../store/projectStore';
import { useCustomerStore } from '../../store/customerStore';
import { useFinanceStore } from '../../store/financeStore';
import { useWorkforceStore } from '../../store/workforceStore';
import { useStageStore } from '../../store/stageStore';
import { ArrowLeft, HardHat, Briefcase, Plus, X, IndianRupee, Lightbulb, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { ProjectContractorsTab } from './ProjectContractorsTab';
import { ProjectStagesTab } from './ProjectStagesTab';
import { ScheduleTab } from './schedule/ScheduleTab';
import { PlansIdeasTab } from './PlansIdeasTab';
import { ExpenseModal } from '../Finance/ExpenseModal';

import { PublishToWebsiteModal } from '../../components/PublishToWebsiteModal';
import { Globe } from 'lucide-react';

export function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { projects, subscribeProjects, updateProject } = useProjectStore();
  const { customers, subscribe: subscribeCustomers } = useCustomerStore();
  const { expenses, payments, subscribeFinance } = useFinanceStore();
  const { workforce, subscribeWorkforce } = useWorkforceStore();
  const { stages, subscribeStages } = useStageStore();

  const [selectedWorkforceId, setSelectedWorkforceId] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'stages' | 'plans' | 'finances' | 'contractors'>('overview');
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [expenseModalTarget, setExpenseModalTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const unsub1 = subscribeProjects();
    const unsub2 = subscribeCustomers();
    const unsub3 = subscribeFinance();
    const unsub4 = subscribeWorkforce();
    let unsub5 = () => {};
    if (id) {
      unsub5 = subscribeStages(id);
    }
    return () => {
      unsub1(); unsub2(); unsub3(); unsub4(); unsub5();
    };
  }, [subscribeProjects, subscribeCustomers, subscribeFinance, subscribeWorkforce, subscribeStages, id]);

  const project = projects.find(p => p.id === id);
  const customer = customers.find(c => c.id === project?.customerId);
  const projectStages = id ? stages[id] || [] : [];

  if (!project) {
    return <div className="p-8">Loading or Project not found...</div>;
  }

  const projectExpenses = expenses.filter(e => e.projectId === project.id);
  const projectPayments = payments.filter(p => p.projectId === project.id);
  const assignedWorkforce = workforce.filter(w => project.assignedWorkforceIds?.includes(w.id));

  // Compute how much was paid to each assigned contractor
  const contractorPayments = assignedWorkforce.map(worker => {
    // Expense paid to this specific worker for this project
    const paidAmount = projectExpenses
      .filter(e => e.payeeId === worker.id || e.payeeName.toLowerCase() === worker.name.toLowerCase())
      .reduce((acc, e) => acc + e.amount, 0);
    return { ...worker, totalPaid: paidAmount };
  });

  const totalCollected = projectPayments.reduce((acc, p) => acc + p.amount, 0);
  const totalExpenses = projectExpenses.reduce((acc, e) => acc + e.amount, 0);

  const handleAssignWorkforce = async () => {
    if (!selectedWorkforceId) return;
    const currentIds = project.assignedWorkforceIds || [];
    if (currentIds.includes(selectedWorkforceId)) return;
    
    await updateProject(project.id, {
      assignedWorkforceIds: [...currentIds, selectedWorkforceId]
    });
    setSelectedWorkforceId('');
  };

  const handleRemoveWorkforce = async (workforceId: string) => {
    if (!confirm('Remove this person from the project?')) return;
    const currentIds = project.assignedWorkforceIds || [];
    await updateProject(project.id, {
      assignedWorkforceIds: currentIds.filter(id => id !== workforceId)
    });
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/projects')} className="p-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{project.title}</h1>
            <p className="text-gray-500 text-sm">Customer: {customer?.name || 'Unknown'}</p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowPublishModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-md shadow-md hover:shadow-lg transition-all text-sm font-medium"
        >
          <Globe className="w-4 h-4" />
          Share Case Study
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium text-sm border-b-2 whitespace-nowrap ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Overview & Staff
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2 font-medium text-sm border-b-2 whitespace-nowrap ${activeTab === 'schedule' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Schedule
        </button>
        <button 
          onClick={() => setActiveTab('stages')}
          className={`px-4 py-2 font-medium text-sm border-b-2 whitespace-nowrap ${activeTab === 'stages' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Stages
        </button>
        <button 
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-2 font-medium text-sm border-b-2 flex items-center whitespace-nowrap ${activeTab === 'plans' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Lightbulb className="w-4 h-4 mr-1" /> Plans & Ideas
        </button>
        <button 
          onClick={() => setActiveTab('finances')}
          className={`px-4 py-2 font-medium text-sm border-b-2 flex items-center whitespace-nowrap ${activeTab === 'finances' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <IndianRupee className="w-4 h-4 mr-1" /> Finances
        </button>
        <button 
          onClick={() => setActiveTab('contractors')}
          className={`px-4 py-2 font-medium text-sm border-b-2 flex items-center whitespace-nowrap ${activeTab === 'contractors' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <HardHat className="w-4 h-4 mr-1" /> Contractor Management
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Overview Card */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <Briefcase className="text-blue-600 w-6 h-6" />
              <h3 className="text-lg font-semibold">Overview</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Status</span>
                <span className="font-medium text-gray-900">{project.status}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Progress</span>
                <span className="font-medium text-gray-900">{project.progressPercentage || 0}%</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Contract Value</span>
                <span className="font-medium text-gray-900">₹{(project.agreedValue || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Total Collected</span>
                <span className="font-medium text-green-600">+₹{totalCollected.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Pending Amount</span>
                <span className="font-medium text-orange-600">₹{Math.max(0, (project.agreedValue || 0) - totalCollected).toLocaleString('en-IN')}</span>
              </div>
              {(project.agreedValue || 0) > 0 && (
                <div className="py-2 border-b">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Payment Received</span>
                    <span className="font-medium text-gray-700">{Math.round((totalCollected / (project.agreedValue || 1)) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, (totalCollected / (project.agreedValue || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Total Expenses</span>
                <span className="font-medium text-red-600">-₹{totalExpenses.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-gray-900 font-bold">Net Profit</span>
                <span className={`font-bold ${totalCollected - totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{(totalCollected - totalExpenses).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Assigned Workforce Card (General Staff) */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200 md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <HardHat className="text-orange-500 w-6 h-6" />
                <h3 className="text-lg font-semibold">Assigned Staff (Non-Contractors)</h3>
              </div>
            </div>
            
            <div className="flex space-x-2 mb-4">
              <select 
                value={selectedWorkforceId}
                onChange={e => setSelectedWorkforceId(e.target.value)}
                className="flex-1 border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select Person --</option>
                {workforce.filter(w => !project.assignedWorkforceIds?.includes(w.id) && w.type !== 'Contractor' && w.type !== 'Subcontractor').map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.type} - {w.trade})</option>
                ))}
              </select>
              <button 
                onClick={handleAssignWorkforce}
                disabled={!selectedWorkforceId}
                className="bg-blue-600 text-white px-4 py-2 rounded flex items-center disabled:opacity-50 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-1" /> Add
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-500">Name</th>
                    <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-500">Role</th>
                    <th className="px-2 sm:px-4 py-2 text-right font-medium text-gray-500">Total Paid</th>
                    <th className="px-2 sm:px-4 py-2 text-right font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {contractorPayments.filter(w => w.type !== 'Contractor' && w.type !== 'Subcontractor').map(worker => (
                    <tr key={worker.id}>
                      <td className="px-4 py-2 font-medium text-gray-900">{worker.name}</td>
                      <td className="px-2 sm:px-4 py-2 text-gray-500">{worker.type} - {worker.trade}</td>
                      <td className="px-2 sm:px-4 py-2 text-right font-medium text-gray-900">₹{worker.totalPaid.toLocaleString('en-IN')}</td>
                      <td className="px-2 sm:px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => setExpenseModalTarget({ id: worker.id, name: worker.name })}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                            title="Record a payment or expense for this person on this project"
                          >
                            <Receipt className="w-3.5 h-3.5" /> Record Pay
                          </button>
                          <button onClick={() => handleRemoveWorkforce(worker.id)} className="text-red-500 hover:text-red-700" title="Remove from project">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {contractorPayments.filter(w => w.type !== 'Contractor' && w.type !== 'Subcontractor').length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-4 text-center text-gray-500">No staff assigned yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'finances' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payments Collected */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="px-3 sm:px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Inbound Payments (From Customer)</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-500">Date</th>
                    <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-500">Mode</th>
                    <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-500">Stage</th>
                    <th className="px-2 sm:px-4 py-2 text-right font-medium text-gray-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {projectPayments.map(p => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">{format(p.date, 'dd MMM yyyy')}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{p.paymentMode}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {p.stageId ? (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            {projectStages.find(s => s.id === p.stageId)?.name || 'Unknown'}
                          </span>
                        ) : <span className="text-gray-400 text-xs">-</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-green-600 font-bold">+₹{p.amount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                  {projectPayments.length === 0 && <tr><td colSpan={4} className="px-4 py-4 text-center text-gray-500">No payments collected yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Expenses */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="px-3 sm:px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Project Expenses</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-500">Date</th>
                    <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-500">Payee</th>
                    <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-500">Stage/Desc</th>
                    <th className="px-2 sm:px-4 py-2 text-right font-medium text-gray-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {projectExpenses.map(e => (
                    <tr key={e.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">{format(e.date, 'dd MMM yyyy')}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium max-w-[100px] truncate" title={e.payeeName}>{e.payeeName}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500 max-w-[150px] truncate" title={e.description}>
                        {e.stageId && (
                          <span className="inline-block text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mr-1">
                            {projectStages.find(s => s.id === e.stageId)?.name || 'Stage'}
                          </span>
                        )}
                        {e.description}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-red-600 font-bold">-₹{e.amount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                  {projectExpenses.length === 0 && <tr><td colSpan={4} className="px-4 py-4 text-center text-gray-500">No expenses recorded yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'contractors' && (
        <ProjectContractorsTab projectId={project.id} />
      )}

      {activeTab === 'schedule' && (
        <ScheduleTab project={project} />
      )}

      {activeTab === 'stages' && (
        <ProjectStagesTab projectId={project.id} />
      )}

      {activeTab === 'plans' && (
        <PlansIdeasTab projectId={project.id} />
      )}

      <PublishToWebsiteModal
        project={project}
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
      />

      {expenseModalTarget && (
        <ExpenseModal
          defaultPayeeId={expenseModalTarget.id}
          defaultPayeeName={expenseModalTarget.name}
          defaultProjectId={project.id}
          onClose={() => setExpenseModalTarget(null)}
        />
      )}
    </div>
  );
}
