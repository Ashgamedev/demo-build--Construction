import { useEffect, useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { useSupervisorStore } from '../store/supervisorStore';
import { Project, SupervisorAdvance, SupervisorSpend } from '../types';
import { LogOut, Wallet, Plus, Loader2, HardHat } from 'lucide-react';
import { format } from 'date-fns';

/**
 * The entire CRM experience for a supervisor: their own advance balance, a
 * form to log spending against a project, and their own history. Nothing
 * else - no sidebar, no other module, deliberately not the same shell as
 * Layout.tsx. The real enforcement is in firestore.rules; this page just
 * makes sure a supervisor is never even shown a link to anything they
 * can't reach.
 */
export function SupervisorView() {
  const { user, logout } = useAuthStore();
  const { logSpend } = useSupervisorStore();

  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [advances, setAdvances] = useState<SupervisorAdvance[]>([]);
  const [spends, setSpends] = useState<SupervisorSpend[]>([]);
  const [loading, setLoading] = useState(true);

  const [projectId, setProjectId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [justLogged, setJustLogged] = useState(false);

  const workforceId = user?.linkedWorkforceId;

  useEffect(() => {
    if (!workforceId) return;
    setLoading(true);
    const unsubs = [
      onSnapshot(
        query(collection(db, 'projects'), where('assignedWorkforceIds', 'array-contains', workforceId)),
        (snap) => setMyProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Project[])
      ),
      onSnapshot(
        query(collection(db, 'supervisorAdvances'), where('workforceId', '==', workforceId)),
        (snap) => { setAdvances(snap.docs.map(d => ({ id: d.id, ...d.data() })) as SupervisorAdvance[]); setLoading(false); }
      ),
      onSnapshot(
        query(collection(db, 'supervisorSpends'), where('workforceId', '==', workforceId)),
        (snap) => setSpends(snap.docs.map(d => ({ id: d.id, ...d.data() })) as SupervisorSpend[])
      ),
    ];
    return () => unsubs.forEach(u => u());
  }, [workforceId]);

  const totalAdvanced = advances.reduce((s, a) => s + a.amount, 0);
  const totalSpent = spends.reduce((s, sp) => s + sp.amount, 0);
  const balance = totalAdvanced - totalSpent;

  const history = useMemo(() => {
    const rows = [
      ...advances.map(a => ({ id: a.id, date: a.date, label: 'Advance received', amount: a.amount, positive: true })),
      ...spends.map(s => ({
        id: s.id, date: s.date,
        label: `${s.description} — ${myProjects.find(p => p.id === s.projectId)?.title || 'Project'}`,
        amount: s.amount, positive: false,
      })),
    ];
    return rows.sort((a, b) => b.date - a.date);
  }, [advances, spends, myProjects]);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'supervisor') return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!projectId) return alert('Select which project this was for');
    if (!amt || amt <= 0) return alert('Enter a valid amount');
    if (!description.trim()) return alert('Describe what this was spent on');

    setSubmitting(true);
    try {
      await logSpend({ workforceId: workforceId!, projectId, amount: amt, description });
      setAmount('');
      setDescription('');
      setJustLogged(true);
      setTimeout(() => setJustLogged(false), 2500);
    } catch (err: any) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardHat className="w-5 h-5 text-blue-600" />
          <div>
            <h1 className="font-bold text-gray-900">{user.name}</h1>
            <p className="text-xs text-gray-500">Site Supervisor</p>
          </div>
        </div>
        <button onClick={logout} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-16 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Wallet className="w-4 h-4" /> Cash In Hand
              </div>
              <p className={`text-3xl font-bold ${balance > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                ₹{balance.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                ₹{totalAdvanced.toLocaleString('en-IN')} received · ₹{totalSpent.toLocaleString('en-IN')} accounted for
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-gray-400" /> Log Spending
              </h2>
              {myProjects.length === 0 ? (
                <p className="text-sm text-gray-500">You're not assigned to any project yet — ask the office to assign you before logging spending.</p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Which project? <span className="text-red-500">*</span></label>
                    <select
                      required value={projectId} onChange={e => setProjectId(e.target.value)}
                      className="w-full border border-gray-300 rounded-md p-2.5 text-sm"
                    >
                      <option value="">-- Select project --</option>
                      {myProjects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Amount (₹) <span className="text-red-500">*</span></label>
                    <input
                      type="number" required min="0" value={amount} onChange={e => setAmount(e.target.value)}
                      className="w-full border border-gray-300 rounded-md p-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">What was it for? <span className="text-red-500">*</span></label>
                    <input
                      type="text" required value={description} onChange={e => setDescription(e.target.value)}
                      placeholder="e.g. Auto fare for material pickup"
                      className="w-full border border-gray-300 rounded-md p-2.5 text-sm"
                    />
                  </div>
                  <button
                    type="submit" disabled={submitting}
                    className="w-full py-2.5 bg-blue-600 text-white rounded-md font-medium text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : justLogged ? 'Saved ✓' : 'Save'}
                  </button>
                </form>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-5 py-3 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 text-sm">History</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {history.map(row => (
                  <div key={row.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-900 truncate">{row.label}</p>
                      <p className="text-xs text-gray-400">{format(row.date, 'dd MMM yyyy')}</p>
                    </div>
                    <span className={`shrink-0 font-semibold text-sm ${row.positive ? 'text-amber-700' : 'text-green-700'}`}>
                      {row.positive ? '+' : '−'}₹{row.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
                {history.length === 0 && (
                  <div className="px-5 py-8 text-center text-sm text-gray-400">Nothing recorded yet.</div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
