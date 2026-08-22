import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useContractorStore } from '../../store/contractorStore';
import { useWorkforceStore } from '../../store/workforceStore';
import { useProjectStore } from '../../store/projectStore';
import { useStageStore } from '../../store/stageStore';
import { ArrowLeft, Activity, IndianRupee, Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ContractorActivity, ContractorPayment } from '../../types';
import { currentActor } from '../../lib/audit';

export function ContractorDashboard() {
  const { projectId, assignmentId } = useParams<{ projectId: string, assignmentId: string }>();
  const navigate = useNavigate();
  
  const { assignments, activities, payments, fetchProjectContractors, addActivity, addPayment } = useContractorStore();
  const { workforce, subscribeWorkforce } = useWorkforceStore();
  const { projects, subscribeProjects } = useProjectStore();
  const { stages, subscribeStages } = useStageStore();

  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Form states
  const [activityDesc, setActivityDesc] = useState('');
  const [progressAdded, setProgressAdded] = useState(0);
  const [activityStageId, setActivityStageId] = useState('');
  
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'UPI' | 'bank transfer' | 'cheque'>('UPI');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentStageId, setPaymentStageId] = useState('');

  useEffect(() => {
    if (projectId) {
      fetchProjectContractors(projectId);
      const unsubS = subscribeStages(projectId);
      const unsubW = subscribeWorkforce();
      const unsubP = subscribeProjects();
      return () => { unsubW(); unsubP(); unsubS(); };
    }
  }, [projectId, fetchProjectContractors, subscribeWorkforce, subscribeProjects, subscribeStages]);

  const assignment = assignments.find(a => a.id === assignmentId);
  const contractor = workforce.find(w => w.id === assignment?.workforceId);
  const project = projects.find(p => p.id === projectId);
  const projectStages = projectId ? stages[projectId] || [] : [];

  if (!assignment || !contractor || !project) {
    return <div className="p-8">Loading dashboard...</div>;
  }

  const assignmentActivities = activities.filter(a => a.assignmentId === assignmentId).sort((a, b) => b.createdAt - a.createdAt);
  const assignmentPayments = payments.filter(p => p.assignmentId === assignmentId).sort((a, b) => b.createdAt - a.createdAt);

  const paymentPercent = assignment.agreedValue > 0 
    ? (assignment.totalPaid / assignment.agreedValue) * 100 
    : 0;
  
  const progressPercent = assignment.progressPercentage;
  const isOverpaid = paymentPercent > progressPercent;

  const handleAddActivity = async () => {
    if (!activityDesc) return alert('Enter description');
    if (progressAdded < 0 || progressAdded > 100) return alert('Invalid progress %');
    
    const payload: Partial<ContractorActivity> = {
      id: crypto.randomUUID(),
      assignmentId: assignment.id,
      projectId: project.id,
      workforceId: contractor.id,
      date: Date.now(),
      description: activityDesc,
      progressAdded,
      createdAt: Date.now(),
      createdBy: currentActor().id
    };
    
    if (activityStageId) {
      payload.stageId = activityStageId;
    }

    await addActivity(payload as ContractorActivity);

    setShowActivityModal(false);
    setActivityDesc('');
    setProgressAdded(0);
    setActivityStageId('');
  };

  const handleAddPayment = async () => {
    if (paymentAmount <= 0) return alert('Enter valid amount');
    
    const payload: Partial<ContractorPayment> = {
      id: crypto.randomUUID(),
      assignmentId: assignment.id,
      projectId: project.id,
      workforceId: contractor.id,
      amount: paymentAmount,
      date: Date.now(),
      paymentMode,
      referenceNumber: paymentRef,
      createdAt: Date.now(),
      createdBy: currentActor().id
    };

    if (paymentStageId) {
      payload.stageId = paymentStageId;
    }

    await addPayment(payload as ContractorPayment);

    setShowPaymentModal(false);
    setPaymentAmount(0);
    setPaymentRef('');
    setPaymentStageId('');
  };

  return (
    <div className="space-y-6 pb-20 p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate(`/projects/${projectId}`)} className="p-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{contractor.name}</h1>
            <p className="text-gray-500 text-sm">Dashboard & Logs for: {project.title}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium border border-blue-200">
            {assignment.compensationModel.toUpperCase()}
          </span>
          <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium border border-gray-200">
            {assignment.paymentMethod === 'milestone' ? 'MILESTONE BASED' : 'FULL JOB PAYMENT'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Scope & Overview */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200 md:col-span-1">
          <h3 className="font-semibold text-lg border-b pb-2 mb-4">Assignment Scope</h3>
          <p className="text-gray-700 text-sm mb-6">{assignment.assignedScope}</p>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Agreed Value</p>
              <p className="text-2xl font-bold">₹{assignment.agreedValue.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Paid</p>
              <p className="text-xl font-bold text-green-600">₹{assignment.totalPaid.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Balance Payable</p>
              <p className="text-lg font-bold text-gray-800">
                ₹{Math.max(0, assignment.agreedValue - assignment.totalPaid).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>

        {/* Payment vs Progress */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200 md:col-span-2">
          <h3 className="font-semibold text-lg border-b pb-2 mb-6">Payment vs Work Progress</h3>
          
          <div className="space-y-8">
            {/* Work Progress Bar */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-700 flex items-center">
                  <Activity className="w-4 h-4 mr-2 text-blue-500" />
                  Actual Work Completed
                </span>
                <span className="font-bold text-blue-600">{progressPercent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-blue-500 h-4 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, progressPercent)}%` }}
                />
              </div>
            </div>

            {/* Payments Disbursed Bar */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-700 flex items-center">
                  <IndianRupee className="w-4 h-4 mr-2 text-green-500" />
                  Payments Disbursed
                </span>
                <span className="font-bold text-green-600">{paymentPercent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-green-500 h-4 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, paymentPercent)}%` }}
                />
              </div>
            </div>
          </div>

          <div className={`mt-8 p-4 rounded-lg flex items-start space-x-3 ${isOverpaid ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
            <CheckCircle className={`w-6 h-6 mt-0.5 ${isOverpaid ? 'text-orange-500' : 'text-green-500'}`} />
            <div>
              <h4 className={`font-semibold ${isOverpaid ? 'text-orange-800' : 'text-green-800'}`}>
                {isOverpaid ? 'Overpayment Alert' : 'Healthy Status'}
              </h4>
              <p className={`text-sm ${isOverpaid ? 'text-orange-600' : 'text-green-600'} mt-1`}>
                {isOverpaid 
                  ? `Payments are ${(paymentPercent - progressPercent).toFixed(1)}% ahead of the actual work progress on site.`
                  : `Payments are in line with or behind work progress. Work is ${(progressPercent - paymentPercent).toFixed(1)}% ahead.`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Activity Logs */}
        <div className="bg-white rounded-lg shadow border border-gray-200 flex flex-col h-[500px]">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-gray-500" /> Activity Logs
            </h3>
            <button 
              onClick={() => setShowActivityModal(true)}
              className="text-sm bg-white border border-gray-300 px-3 py-1.5 rounded hover:bg-gray-50 font-medium"
            >
              Log Activity
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {assignmentActivities.length === 0 && <p className="text-gray-500 text-center py-4 text-sm">No activities logged yet.</p>}
            {assignmentActivities.map(act => (
              <div key={act.id} className="border-l-2 border-blue-200 pl-4 py-1 relative">
                <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-2" />
                <div className="flex justify-between items-start">
                  <p className="text-xs text-gray-500 mb-1">{format(act.createdAt, 'dd MMM yyyy, p')}</p>
                  {act.stageId && (
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                      {projectStages.find(s => s.id === act.stageId)?.name || 'Unknown Stage'}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-900">{act.description}</p>
                {act.progressAdded > 0 && (
                  <span className="inline-block mt-1 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">
                    +{act.progressAdded}% Progress
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Payment History */}
        <div className="bg-white rounded-lg shadow border border-gray-200 flex flex-col h-[500px]">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <IndianRupee className="w-5 h-5 mr-2 text-gray-500" /> Payment History
            </h3>
            <button 
              onClick={() => setShowPaymentModal(true)}
              className="text-sm bg-white border border-gray-300 px-3 py-1.5 rounded hover:bg-gray-50 font-medium"
            >
              Record Payment
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {assignmentPayments.length === 0 && <p className="text-gray-500 text-center py-4 text-sm">No payments recorded yet.</p>}
            {assignmentPayments.map(pay => (
              <div key={pay.id} className="border border-gray-100 p-3 rounded-lg bg-gray-50 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-900">₹{pay.amount.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-gray-500">{format(pay.date, 'dd MMM yyyy')} • {pay.paymentMode}</p>
                  {pay.referenceNumber && <p className="text-xs text-gray-400 mt-1">Ref: {pay.referenceNumber}</p>}
                </div>
                {pay.stageId && (
                  <span className="text-[10px] bg-gray-200 text-gray-700 px-2 py-1 rounded">
                    {projectStages.find(s => s.id === pay.stageId)?.name || 'Unknown Stage'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Log Daily Activity</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Project Stage (Optional)</label>
                <select 
                  value={activityStageId}
                  onChange={e => setActivityStageId(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                >
                  <option value="">-- General / Unassigned --</option>
                  {projectStages.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">What work was done?</label>
                <textarea 
                  value={activityDesc}
                  onChange={e => setActivityDesc(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Add to Overall Progress (%)</label>
                <input 
                  type="number"
                  value={progressAdded}
                  onChange={e => setProgressAdded(Number(e.target.value))}
                  placeholder="e.g. 5"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
                <p className="text-xs text-gray-500 mt-1">Current progress is {progressPercent}%. This will add to it.</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => setShowActivityModal(false)} className="text-gray-600">Cancel</button>
              <button onClick={handleAddActivity} className="bg-blue-600 text-white px-4 py-2 rounded">Save Activity</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Record Payment to Contractor</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Project Stage (Optional)</label>
                <select 
                  value={paymentStageId}
                  onChange={e => setPaymentStageId(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                >
                  <option value="">-- General / Unassigned --</option>
                  {projectStages.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount (₹)</label>
                <input 
                  type="number"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(Number(e.target.value))}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Mode</label>
                <select 
                  value={paymentMode}
                  onChange={e => setPaymentMode(e.target.value as any)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                  <option value="UPI">UPI</option>
                  <option value="bank transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Reference / Txn No.</label>
                <input 
                  type="text"
                  value={paymentRef}
                  onChange={e => setPaymentRef(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-600">Cancel</button>
              <button onClick={handleAddPayment} className="bg-green-600 text-white px-4 py-2 rounded">Save Payment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
