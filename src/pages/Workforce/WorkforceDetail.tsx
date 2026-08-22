import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useWorkforceStore } from '../../store/workforceStore';
import { useFinanceStore } from '../../store/financeStore';
import { useProjectStore } from '../../store/projectStore';
import { useContractorStore } from '../../store/contractorStore';
import { useAttendanceStore } from '../../store/attendanceStore';
import { ExpenseModal } from '../Finance/ExpenseModal';
import { SupervisorAccessPanel } from './SupervisorAccessPanel';
import { WorkforceModal } from './WorkforceModal';
import {
  ArrowLeft, Phone, MapPin, IndianRupee, Receipt, Briefcase,
  Loader2, CalendarCheck, TrendingUp, AlertTriangle, Pencil,
  CreditCard, ExternalLink, CalendarDays, ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import { buildWorkforceLedger, amountPaidOnProject } from '../../lib/ledger';
import { ContractorAssignment, ContractorActivity } from '../../types';

export function WorkforceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { workforce, subscribeWorkforce } = useWorkforceStore();
  const { expenses, subscribeFinance } = useFinanceStore();
  const { projects, subscribeProjects } = useProjectStore();
  const { fetchWorkforceHistory } = useContractorStore();
  const { fetchByWorkforce } = useAttendanceStore();

  const [contractorPayments, setContractorPayments] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<ContractorAssignment[]>([]);
  const [activities, setActivities] = useState<ContractorActivity[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  // Long histories are collapsed to the most recent few by default - after a
  // month on site these lists otherwise run to hundreds of rows.
  const [showAllAttendance, setShowAllAttendance] = useState(false);
  const [showAllPayments, setShowAllPayments] = useState(false);
  const PREVIEW_COUNT = 5;

  useEffect(() => {
    const unsub1 = subscribeWorkforce();
    const unsub2 = subscribeFinance();
    const unsub3 = subscribeProjects();
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [subscribeWorkforce, subscribeFinance, subscribeProjects]);

  useEffect(() => {
    if (!id) return;
    setLoadingHistory(true);
    Promise.all([fetchWorkforceHistory(id), fetchByWorkforce(id)])
      .then(([contractorHistory, attendanceRecords]) => {
        setAssignments(contractorHistory.assignments);
        setContractorPayments(contractorHistory.payments);
        setActivities(contractorHistory.activities);
        setAttendance(attendanceRecords);
      })
      .finally(() => setLoadingHistory(false));
  }, [id, fetchWorkforceHistory, fetchByWorkforce]);

  const worker = workforce.find(w => w.id === id);

  if (!worker && workforce.length > 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Workforce member not found.</p>
        <button onClick={() => navigate('/workforce')} className="mt-2 text-blue-600 hover:underline text-sm">
          Back to Workforce
        </button>
      </div>
    );
  }

  if (!worker || loadingHistory) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  const isContractorType = worker.type === 'Contractor' || worker.type === 'Subcontractor';

  const ledger = buildWorkforceLedger({
    workforceId: worker.id,
    expenses,
    contractorPayments,
    attendance,
    projects,
  });

  const assignmentsPending = assignments
    .filter(a => a.status !== 'terminated')
    .reduce((sum, a) => sum + Math.max(0, a.agreedValue - a.totalPaid), 0);

  // Every project this person has touched, whether via payment, attendance, or a current assignment.
  const touchedProjectIds = new Set([
    ...ledger.projectIds,
    ...assignments.map(a => a.projectId),
  ]);
  const projectRows = [...touchedProjectIds].map(pid => {
    const project = projects.find(p => p.id === pid);
    const assignment = assignments.find(a => a.projectId === pid);
    return {
      projectId: pid,
      title: project?.title || 'Unknown project',
      paid: amountPaidOnProject(ledger, pid),
      assignment,
    };
  });

  return (
    <div className="space-y-6 pb-10">
      <button onClick={() => navigate('/workforce')} className="flex items-center text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Workforce
      </button>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{worker.name}</h1>
              {!worker.isActive && (
                <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full font-medium">No longer working</span>
              )}
            </div>
            <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
              {worker.type} • {worker.trade}
            </span>
            <div className="mt-3 space-y-1 text-sm text-gray-600">
              <div className="flex items-center"><Phone className="w-4 h-4 mr-2 text-gray-400" /> {worker.phone}</div>
              {worker.address && <div className="flex items-center"><MapPin className="w-4 h-4 mr-2 text-gray-400" /> {worker.address}</div>}
              {worker.joinedOn ? (
                <div className="flex items-center"><CalendarDays className="w-4 h-4 mr-2 text-gray-400" /> Joined {format(worker.joinedOn, 'dd MMM yyyy')}</div>
              ) : null}
              {worker.monthlySalary ? <div>Monthly Salary: ₹{worker.monthlySalary.toLocaleString('en-IN')}</div> : null}
              {worker.dailyWage ? (
                <div>Usual Daily Wage: ₹{worker.dailyWage.toLocaleString('en-IN')}</div>
              ) : (worker.type === 'Coolie' || worker.type === 'Site Staff') ? (
                <div className="flex items-center gap-1 text-amber-700">
                  <AlertTriangle className="w-4 h-4" />
                  No daily wage set — wages can't be worked out until this is filled in
                </div>
              ) : null}

              {(worker.idProofType || worker.upiId || worker.bankAccountNumber) && (
                <div className="pt-2 mt-2 border-t border-gray-100 space-y-1">
                  {worker.idProofType && (
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-gray-400 shrink-0" />
                      <span>{worker.idProofType}{worker.idProofNumber ? ` · ${worker.idProofNumber}` : ''}</span>
                      {worker.idProofUrl && (
                        <a href={worker.idProofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-blue-600 hover:underline text-xs">
                          <ExternalLink className="w-3 h-3" /> view
                        </a>
                      )}
                    </div>
                  )}
                  {worker.upiId && <div className="text-gray-500">UPI: {worker.upiId}</div>}
                  {worker.bankAccountNumber && (
                    <div className="text-gray-500">
                      Bank: {worker.bankAccountNumber}{worker.bankIfsc ? ` · ${worker.bankIfsc}` : ''}
                    </div>
                  )}
                </div>
              )}

              {worker.notes && <div className="text-gray-500 italic pt-1">{worker.notes}</div>}
            </div>
          </div>
          <div className="shrink-0 flex flex-col gap-2">
            <button
              onClick={() => setShowEditModal(true)}
              className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 flex items-center text-sm font-medium"
            >
              <Pencil className="w-4 h-4 mr-2 text-gray-500" /> Edit Details
            </button>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 flex items-center text-sm font-medium"
            >
              <Receipt className="w-4 h-4 mr-2 text-gray-500" /> Record Pay / Expense
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total Paid (All Time)</p>
          <h3 className="text-xl font-bold text-green-600 mt-1">₹{ledger.totalPaid.toLocaleString('en-IN')}</h3>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Projects Worked On</p>
          <h3 className="text-xl font-bold text-gray-900 mt-1">{projectRows.length}</h3>
        </div>
        {isContractorType ? (
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Pending to Pay</p>
            <h3 className="text-xl font-bold text-orange-600 mt-1">₹{assignmentsPending.toLocaleString('en-IN')}</h3>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Days Recorded</p>
            <h3 className="text-xl font-bold text-gray-900 mt-1">{ledger.attendanceDays.length}</h3>
          </div>
        )}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Advances Given</p>
          <h3 className="text-xl font-bold text-amber-600 mt-1">₹{ledger.totalAdvances.toLocaleString('en-IN')}</h3>
        </div>
      </div>

      {/* Per-project breakdown */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-3 sm:px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Projects & Payment Per Project</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left font-medium text-gray-500">Project</th>
                {isContractorType && <th className="px-3 sm:px-6 py-3 text-right font-medium text-gray-500">Agreed Value</th>}
                <th className="px-3 sm:px-6 py-3 text-right font-medium text-gray-500">Paid on This Project</th>
                {isContractorType && <th className="px-3 sm:px-6 py-3 text-right font-medium text-gray-500">Pending</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {projectRows.map(row => (
                <tr key={row.projectId} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-6 py-3 font-medium text-gray-900">
                    <Link to={`/projects/${row.projectId}`} className="hover:text-blue-600 hover:underline">{row.title}</Link>
                  </td>
                  {isContractorType && (
                    <td className="px-3 sm:px-6 py-3 text-right text-gray-700">
                      {row.assignment ? `₹${row.assignment.agreedValue.toLocaleString('en-IN')}` : '—'}
                    </td>
                  )}
                  <td className="px-3 sm:px-6 py-3 text-right font-semibold text-green-700">₹{row.paid.toLocaleString('en-IN')}</td>
                  {isContractorType && (
                    <td className="px-3 sm:px-6 py-3 text-right font-semibold text-orange-600">
                      {row.assignment ? `₹${Math.max(0, row.assignment.agreedValue - row.assignment.totalPaid).toLocaleString('en-IN')}` : '—'}
                    </td>
                  )}
                </tr>
              ))}
              {projectRows.length === 0 && (
                <tr><td colSpan={4} className="px-3 sm:px-6 py-6 text-center text-gray-500">No projects recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SupervisorAccessPanel worker={worker} />

      {isContractorType && activities.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-3 sm:px-6 py-4 border-b border-gray-200 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Work Log</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {activities.sort((a, b) => b.date - a.date).slice(0, 15).map(act => (
              <div key={act.id} className="px-3 sm:px-6 py-3 text-sm flex justify-between items-start gap-4">
                <div>
                  <p className="text-gray-900">{act.description}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{format(act.date, 'dd MMM yyyy')}</p>
                </div>
                {act.progressAdded > 0 && (
                  <span className="shrink-0 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded">+{act.progressAdded}% progress</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!isContractorType && ledger.attendanceDays.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-3 sm:px-6 py-4 border-b border-gray-200 flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Attendance</h3>
            <span className="text-xs text-gray-400 ml-auto">Work record — wages here are settled through Expenses below, not paid twice</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-2 text-left font-medium text-gray-500">Date</th>
                  <th className="px-3 sm:px-6 py-2 text-left font-medium text-gray-500">Project</th>
                  <th className="px-3 sm:px-6 py-2 text-left font-medium text-gray-500">Status</th>
                  <th className="px-3 sm:px-6 py-2 text-right font-medium text-gray-500">Wages Accrued</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(showAllAttendance ? ledger.attendanceDays : ledger.attendanceDays.slice(0, PREVIEW_COUNT)).map((d, i) => (
                  <tr key={i}>
                    <td className="px-3 sm:px-6 py-2 text-gray-500">{format(d.date, 'dd MMM yyyy')}</td>
                    <td className="px-3 sm:px-6 py-2 text-gray-700 truncate max-w-[180px]">{d.projectTitle}</td>
                    <td className="px-3 sm:px-6 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        d.status === 'Present' ? 'bg-green-100 text-green-800' :
                        d.status === 'Half-day' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>{d.status}</span>
                    </td>
                    <td className="px-3 sm:px-6 py-2 text-right text-gray-700">₹{d.wagesEarned.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {ledger.attendanceDays.length > PREVIEW_COUNT && (
            <button
              onClick={() => setShowAllAttendance(v => !v)}
              className="w-full px-6 py-3 border-t border-gray-100 text-sm font-medium text-blue-600 hover:bg-gray-50 flex items-center justify-center gap-1"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showAllAttendance ? 'rotate-180' : ''}`} />
              {showAllAttendance ? 'Show less' : `View all ${ledger.attendanceDays.length} days`}
            </button>
          )}
        </div>
      )}

      {/* Full payment history */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-3 sm:px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <IndianRupee className="w-4 h-4 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Payment History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left font-medium text-gray-500">Date</th>
                <th className="px-3 sm:px-6 py-3 text-left font-medium text-gray-500">Project</th>
                <th className="px-3 sm:px-6 py-3 text-left font-medium text-gray-500">Type</th>
                <th className="px-3 sm:px-6 py-3 text-left font-medium text-gray-500">Description</th>
                <th className="px-3 sm:px-6 py-3 text-right font-medium text-gray-500">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(showAllPayments ? ledger.entries : ledger.entries.slice(0, PREVIEW_COUNT)).map(e => (
                <tr key={e.id}>
                  <td className="px-3 sm:px-6 py-3 whitespace-nowrap text-gray-500">{format(e.date, 'dd MMM yyyy')}</td>
                  <td className="px-3 sm:px-6 py-3 max-w-[180px] truncate" title={e.projectTitle}>{e.projectTitle}</td>
                  <td className="px-3 sm:px-6 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      e.kind === 'Advance' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
                    }`}>{e.kind}</span>
                  </td>
                  <td className="px-3 sm:px-6 py-3 max-w-[220px] truncate" title={e.description}>{e.description}</td>
                  <td className="px-3 sm:px-6 py-3 text-right font-semibold text-green-700">₹{e.amount.toLocaleString('en-IN')}</td>
                </tr>
              ))}
              {ledger.entries.length === 0 && (
                <tr><td colSpan={5} className="px-3 sm:px-6 py-6 text-center text-gray-500 flex items-center justify-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-gray-300" /> No payments recorded yet.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {ledger.entries.length > PREVIEW_COUNT && (
          <button
            onClick={() => setShowAllPayments(v => !v)}
            className="w-full px-6 py-3 border-t border-gray-100 text-sm font-medium text-blue-600 hover:bg-gray-50 flex items-center justify-center gap-1"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showAllPayments ? 'rotate-180' : ''}`} />
            {showAllPayments ? 'Show less' : `View all ${ledger.entries.length} payments`}
          </button>
        )}
      </div>

      {showExpenseModal && (
        <ExpenseModal
          defaultPayeeId={worker.id}
          defaultPayeeName={worker.name}
          onClose={() => setShowExpenseModal(false)}
        />
      )}

      {showEditModal && (
        <WorkforceModal
          workerToEdit={worker}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}
