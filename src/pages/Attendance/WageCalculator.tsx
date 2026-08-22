import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAttendanceStore } from '../../store/attendanceStore';
import { useWorkforceStore } from '../../store/workforceStore';
import { useProjectStore } from '../../store/projectStore';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameWeek } from 'date-fns';
import {
  Loader2, ArrowLeft, IndianRupee, AlertTriangle, X, CheckCircle2, History,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { buildWageBalances, totalWagesOwed, WageBalance } from '../../lib/ledger';

/**
 * What the company owes each day-paid worker right now.
 *
 * Deliberately not framed by week: the question people actually ask is "what
 * do I owe this person today", and a shortfall from three weeks ago still
 * needs paying. Any amount can be paid at any time; whatever isn't covered
 * simply stays owed.
 */
export function WageCalculator() {
  const {
    records, wagePayments, loading: attLoading,
    subscribeByDateRange, subscribeWagePayments, payWages,
  } = useAttendanceStore();
  const { workforce, loading: wfLoading, subscribeWorkforce } = useWorkforceStore();
  const { projects, subscribeProjects } = useProjectStore();

  /** All-time is the honest default - a shortfall from a past week still needs
   *  paying. The week view is for reviewing a specific stretch of work. */
  const [view, setView] = useState<'all' | 'week'>('all');
  const [weekAnchor, setWeekAnchor] = useState(new Date());

  const [payTarget, setPayTarget] = useState<WageBalance | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [payNotes, setPayNotes] = useState('');
  const [payProjectId, setPayProjectId] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    // Everything ever recorded, since a balance spans all time rather than one week.
    const unsubs = [
      subscribeWorkforce(),
      subscribeProjects(),
      subscribeWagePayments(),
      subscribeByDateRange(0, Date.now() + 86400000),
    ];
    return () => unsubs.forEach(u => typeof u === 'function' && u());
  }, [subscribeWorkforce, subscribeProjects, subscribeWagePayments, subscribeByDateRange]);

  const weekStart = startOfWeek(weekAnchor, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekAnchor, { weekStartsOn: 1 });

  /** The true balance, always all-time - this is what's genuinely owed. */
  const allTimeBalances = useMemo(
    () => buildWageBalances({ workforce, attendance: records, wagePayments }),
    [workforce, records, wagePayments]
  );

  /** Activity within the chosen week, used only for the days/earned/paid columns. */
  const weekBalances = useMemo(
    () => buildWageBalances({
      workforce, attendance: records, wagePayments,
      from: weekStart.getTime(), to: weekEnd.getTime(),
    }),
    [workforce, records, wagePayments, weekStart, weekEnd]
  );

  const displayed = view === 'week' ? weekBalances : allTimeBalances;
  const owedLookup = useMemo(
    () => new Map(allTimeBalances.map(b => [b.workforceId, b])),
    [allTimeBalances]
  );

  const owedList = displayed.filter(b => (owedLookup.get(b.workforceId)?.owed ?? 0) > 0);
  const settledList = displayed.filter(b => (owedLookup.get(b.workforceId)?.owed ?? 0) <= 0);
  const grandTotal = totalWagesOwed(allTimeBalances);

  const openPay = (row: WageBalance) => {
    // Always pay against the true all-time balance, never the week's subtotal.
    const b = owedLookup.get(row.workforceId) || row;
    setPayTarget(b);
    setPayAmount(String(Math.max(0, b.owed)));
    setPayMethod('Cash');
    setPayNotes('');
    setPayProjectId(b.projectIds.length === 1 ? b.projectIds[0] : '');
  };

  const handlePay = async () => {
    if (!payTarget) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) return alert('Enter a valid amount');
    if (amount > payTarget.owed && !confirm(
      `That's more than the ₹${payTarget.owed.toLocaleString('en-IN')} owed to ${payTarget.name}.\n\n` +
      `Pay ₹${amount.toLocaleString('en-IN')} anyway? They'll show as paid ahead.`
    )) return;

    setPaying(true);
    try {
      await payWages({
        workforceId: payTarget.workforceId,
        workforceName: payTarget.name,
        amount,
        projectId: payProjectId || undefined,
        paymentMethod: payMethod,
        notes: payNotes,
      });
      setPayTarget(null);
    } catch (e: any) {
      alert('Failed to record payment: ' + e.message);
    } finally {
      setPaying(false);
    }
  };

  if (wfLoading || attLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const renderRow = (b: WageBalance) => {
    const trueBalance = owedLookup.get(b.workforceId) || b;
    const owed = trueBalance.owed;

    return (
    <tr key={b.workforceId} className="hover:bg-slate-50 transition-colors">
      <td className="p-4">
        <Link to={`/workforce/${b.workforceId}`} className="font-semibold text-gray-900 hover:text-blue-600 hover:underline">
          {b.name}
        </Link>
        <div className="text-xs text-gray-500">{b.type} • {b.trade}</div>
      </td>
      <td className="p-4 text-center text-gray-700">{b.daysWorked}</td>
      <td className="hidden sm:table-cell p-4 text-right text-gray-700">₹{b.totalEarned.toLocaleString('en-IN')}</td>
      <td className="p-4 text-right text-gray-500">
        ₹{b.totalPaid.toLocaleString('en-IN')}
        {b.totalAdvances > 0 && (
          <div className="text-xs text-amber-700 mt-0.5" title="Cash handed over mid-week, already counted against wages">
            incl. ₹{b.totalAdvances.toLocaleString('en-IN')} advance
          </div>
        )}
        {/* Show exactly when advances were given, which is what the client
            needs to see to trust the reduced settle-up figure. */}
        {b.payments.filter(p => p.isAdvance).map(p => (
          <div key={p.id} className="text-[11px] text-gray-400">
            {format(p.date, 'dd MMM')} · ₹{p.amount.toLocaleString('en-IN')}
          </div>
        ))}
      </td>
      <td className="p-4 text-right">
        {owed > 0 ? (
          <span className="font-bold text-lg text-orange-600">₹{owed.toLocaleString('en-IN')}</span>
        ) : owed < 0 ? (
          <span className="text-sm text-blue-600" title="Paid more than earned so far">
            ₹{Math.abs(owed).toLocaleString('en-IN')} ahead
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-sm text-green-700">
            <CheckCircle2 className="w-3.5 h-3.5" /> Settled
          </span>
        )}
        {b.hasUnratedDays && (
          <Link to={`/workforce/${b.workforceId}`} className="mt-1 flex items-center justify-end gap-1 text-xs text-amber-700 hover:underline">
            <AlertTriangle className="w-3 h-3" /> some days have no amount
          </Link>
        )}
      </td>
      <td className="p-4 text-right">
        <button
          onClick={() => openPay(b)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
        >
          <IndianRupee className="w-3.5 h-3.5" /> Pay
        </button>
      </td>
    </tr>
    );
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-4">
          <Link to="/attendance" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Wages Owed</h2>
            <p className="text-sm text-gray-500">Pay any amount, any day — whatever is left stays owed</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total owed to workers</p>
          <p className="text-2xl font-bold text-orange-600">₹{grandTotal.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* All-time vs one week */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="inline-flex rounded-md border border-gray-300 overflow-hidden shrink-0">
          <button
            onClick={() => setView('all')}
            className={`px-3 py-1.5 text-sm font-medium ${view === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            All time
          </button>
          <button
            onClick={() => setView('week')}
            className={`px-3 py-1.5 text-sm font-medium border-l border-gray-300 ${view === 'week' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            By week
          </button>
        </div>

        {view === 'week' && (
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekAnchor(w => subWeeks(w, 1))} className="p-1.5 hover:bg-slate-100 rounded" title="Previous week">
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <span className="text-sm font-semibold text-slate-800 whitespace-nowrap">
              {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
              {isSameWeek(weekAnchor, new Date(), { weekStartsOn: 1 }) && (
                <span className="ml-2 text-xs font-normal text-blue-600">this week</span>
              )}
            </span>
            <button onClick={() => setWeekAnchor(w => addWeeks(w, 1))} className="p-1.5 hover:bg-slate-100 rounded" title="Next week">
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        )}

        <p className="text-xs text-gray-500 sm:ml-auto">
          {view === 'week'
            ? 'Days, earned and paid show this week only — "Still Owed" is always the full running balance.'
            : 'Everything earned and paid since the beginning.'}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-gray-200 text-sm font-semibold text-gray-600">
                <th className="p-4">Staff / Coolie</th>
                <th className="p-4 text-center">Days{view === 'week' && <span className="block text-[10px] font-normal text-gray-400">this week</span>}</th>
                <th className="hidden sm:table-cell p-4 text-right">Earned{view === 'week' && <span className="block text-[10px] font-normal text-gray-400">this week</span>}</th>
                <th className="p-4 text-right">Paid{view === 'week' && <span className="block text-[10px] font-normal text-gray-400">this week</span>}</th>
                <th className="p-4 text-right">Still Owed<span className="block text-[10px] font-normal text-gray-400">all time</span></th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {owedList.map(renderRow)}

              {settledList.length > 0 && (
                <tr className="bg-slate-50">
                  <td colSpan={6} className="px-2 sm:px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Nothing outstanding
                  </td>
                </tr>
              )}
              {settledList.map(renderRow)}

              {displayed.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    {view === 'week'
                      ? 'Nobody worked during this week.'
                      : 'No attendance recorded yet. Mark people present on the Attendance page and their wages will build up here.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent payments, so a mistaken payment can be spotted */}
      {wagePayments.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-3 sm:px-6 py-4 border-b border-gray-200 flex items-center gap-2">
            <History className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Recent Wage Payments</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-2 text-left font-medium text-gray-500">Date</th>
                  <th className="px-3 sm:px-6 py-2 text-left font-medium text-gray-500">Paid To</th>
                  <th className="px-3 sm:px-6 py-2 text-left font-medium text-gray-500">Method</th>
                  <th className="px-3 sm:px-6 py-2 text-right font-medium text-gray-500">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {wagePayments.slice(0, 8).map(p => (
                  <tr key={p.id}>
                    <td className="px-3 sm:px-6 py-2 text-gray-500 whitespace-nowrap">{format(p.date, 'dd MMM yyyy')}</td>
                    <td className="px-3 sm:px-6 py-2 text-gray-900 font-medium">{p.workforceName}</td>
                    <td className="px-3 sm:px-6 py-2 text-gray-600">{p.paymentMethod}</td>
                    <td className="px-3 sm:px-6 py-2 text-right font-semibold text-green-700">₹{p.amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pay modal */}
      {payTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Pay {payTarget.name}</h2>
              <button onClick={() => setPayTarget(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded">
                  <p className="text-xs text-gray-500">Earned</p>
                  <p className="font-bold text-gray-900">₹{payTarget.totalEarned.toLocaleString('en-IN')}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded">
                  <p className="text-xs text-gray-500">Already paid</p>
                  <p className="font-bold text-gray-700">₹{payTarget.totalPaid.toLocaleString('en-IN')}</p>
                </div>
                <div className="p-3 bg-orange-50 rounded">
                  <p className="text-xs text-orange-700">Owed</p>
                  <p className="font-bold text-orange-700">₹{payTarget.owed.toLocaleString('en-IN')}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount paying now (₹)</label>
                <input
                  type="number" min="0" autoFocus
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 text-lg font-semibold"
                />
                <div className="flex items-center justify-between mt-1">
                  <button
                    type="button"
                    onClick={() => setPayAmount(String(payTarget.owed))}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Pay full ₹{payTarget.owed.toLocaleString('en-IN')}
                  </button>
                  {Number(payAmount) > 0 && Number(payAmount) < payTarget.owed && (
                    <span className="text-xs text-orange-700">
                      ₹{(payTarget.owed - Number(payAmount)).toLocaleString('en-IN')} will stay owed
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paid by</label>
                  <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm">
                    <option>Cash</option><option>UPI</option><option>Bank Transfer</option><option>Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Against project</label>
                  <select value={payProjectId} onChange={e => setPayProjectId(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm">
                    <option value="">-- Not specific --</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                <input value={payNotes} onChange={e => setPayNotes(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm" placeholder="e.g. part payment, rest on Saturday" />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setPayTarget(null)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={handlePay}
                disabled={paying}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {paying && <Loader2 className="w-4 h-4 animate-spin" />}
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
