import { useState, useEffect, useMemo } from 'react';
import { useSupervisorStore } from '../../store/supervisorStore';
import { useProjectStore } from '../../store/projectStore';
import { Shield, Mail, Loader2, X, Plus, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Workforce, User } from '../../types';

interface Props {
  worker: Workforce;
}

export function SupervisorAccessPanel({ worker }: Props) {
  const { advances, spends, invites, subscribeAll, inviteSupervisor, cancelInvite, giveAdvance, findLinkedUser } = useSupervisorStore();
  const { projects } = useProjectStore();

  const [linkedUser, setLinkedUser] = useState<User | null | undefined>(undefined); // undefined = checking
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceNotes, setAdvanceNotes] = useState('');
  const [givingAdvance, setGivingAdvance] = useState(false);

  useEffect(() => {
    const unsub = subscribeAll();
    return unsub;
  }, [subscribeAll]);

  useEffect(() => {
    findLinkedUser(worker.id).then(setLinkedUser);
  }, [worker.id, findLinkedUser]);

  const pendingInvite = invites.find(i => i.workforceId === worker.id);
  const myAdvances = advances.filter(a => a.workforceId === worker.id);
  const mySpends = spends.filter(s => s.workforceId === worker.id);

  const totalAdvanced = myAdvances.reduce((s, a) => s + a.amount, 0);
  const totalSpent = mySpends.reduce((s, sp) => s + sp.amount, 0);
  const balance = totalAdvanced - totalSpent;

  const timeline = useMemo(() => {
    const rows = [
      ...myAdvances.map(a => ({ id: a.id, date: a.date, kind: 'Advance Given' as const, amount: a.amount, detail: a.notes || '—' })),
      ...mySpends.map(s => ({
        id: s.id, date: s.date, kind: 'Spent' as const, amount: -s.amount,
        detail: `${s.description} (${projects.find(p => p.id === s.projectId)?.title || 'Unknown project'})`,
      })),
    ];
    return rows.sort((a, b) => b.date - a.date);
  }, [myAdvances, mySpends, projects]);

  const handleInvite = async () => {
    if (!email.trim()) return;
    setInviting(true);
    try {
      await inviteSupervisor(email, worker.id, worker.name);
      setShowInviteForm(false);
      setEmail('');
    } catch (e: any) {
      alert('Failed to send invite: ' + e.message);
    } finally {
      setInviting(false);
    }
  };

  const handleGiveAdvance = async () => {
    const amount = Number(advanceAmount);
    if (!amount || amount <= 0) return alert('Enter a valid amount');
    setGivingAdvance(true);
    try {
      await giveAdvance(worker.id, amount, advanceNotes);
      setShowAdvanceForm(false);
      setAdvanceAmount('');
      setAdvanceNotes('');
    } catch (e: any) {
      alert('Failed to give advance: ' + e.message);
    } finally {
      setGivingAdvance(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-3 sm:px-6 py-4 border-b border-gray-200 flex items-center gap-2">
        <Shield className="w-4 h-4 text-gray-400" />
        <h3 className="font-semibold text-gray-900">Supervisor Access & Advances</h3>
      </div>

      <div className="p-6 space-y-4">
        {linkedUser === undefined ? (
          <div className="flex items-center text-sm text-gray-400"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Checking access…</div>
        ) : linkedUser ? (
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2 text-sm text-green-800">
              <Shield className="w-4 h-4" />
              <span>CRM supervisor access active — signs in as <strong>{linkedUser.email}</strong>. Can only see their own advance and assigned projects.</span>
            </div>
          </div>
        ) : pendingInvite ? (
          <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <Mail className="w-4 h-4" />
              <span>Invited as supervisor at <strong>{pendingInvite.email}</strong> — access begins once they sign in for the first time.</span>
            </div>
            <button
              onClick={() => cancelInvite(pendingInvite.email)}
              className="text-xs text-amber-700 hover:text-amber-900 underline shrink-0 ml-3"
            >
              Cancel invite
            </button>
          </div>
        ) : showInviteForm ? (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Supervisor's email address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full border border-gray-300 rounded-md p-2 text-sm"
              />
            </div>
            <button onClick={handleInvite} disabled={inviting} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Invite'}
            </button>
            <button onClick={() => setShowInviteForm(false)} className="p-2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <button
            onClick={() => setShowInviteForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Shield className="w-4 h-4 text-gray-500" /> Give This Person Supervisor Login Access
          </button>
        )}

        {/* Advance balance + timeline - only meaningful once they have access */}
        {linkedUser && (
          <>
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="p-4 bg-slate-50 rounded-md">
                <p className="text-xs text-gray-500">Total Advanced</p>
                <p className="text-lg font-bold text-gray-900">₹{totalAdvanced.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-md">
                <p className="text-xs text-gray-500">Accounted For</p>
                <p className="text-lg font-bold text-green-700">₹{totalSpent.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-md">
                <p className="text-xs text-gray-500">Still Unaccounted / In Hand</p>
                <p className={`text-lg font-bold ${balance > 0 ? 'text-orange-600' : 'text-gray-400'}`}>₹{balance.toLocaleString('en-IN')}</p>
              </div>
            </div>

            {showAdvanceForm ? (
              <div className="p-4 border border-gray-200 rounded-md space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Amount (₹)</label>
                    <input type="number" min="0" value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Notes (optional)</label>
                    <input value={advanceNotes} onChange={e => setAdvanceNotes(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm" placeholder="e.g. for site cash expenses" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowAdvanceForm(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-md">Cancel</button>
                  <button onClick={handleGiveAdvance} disabled={givingAdvance} className="px-4 py-1.5 bg-amber-600 text-white rounded-md text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
                    {givingAdvance ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Give Advance'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAdvanceForm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-sm font-medium hover:bg-amber-100"
              >
                <Plus className="w-3.5 h-3.5" /> Give Advance
              </button>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Detail</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {timeline.map(row => (
                    <tr key={row.id}>
                      <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">{format(row.date, 'dd MMM yyyy')}</td>
                      <td className="py-2 pr-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${row.kind === 'Advance Given' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>
                          {row.kind === 'Advance Given' && <Clock className="w-3 h-3" />}
                          {row.kind}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-gray-700 max-w-[260px] truncate" title={row.detail}>{row.detail}</td>
                      <td className={`py-2 text-right font-semibold ${row.amount < 0 ? 'text-green-700' : 'text-amber-700'}`}>
                        {row.amount < 0 ? '−' : '+'}₹{Math.abs(row.amount).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                  {timeline.length === 0 && (
                    <tr><td colSpan={4} className="py-6 text-center text-gray-400">No advances given yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
