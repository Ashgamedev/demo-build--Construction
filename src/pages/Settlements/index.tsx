import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAttendanceStore } from '../../store/attendanceStore';
import { useWorkforceStore } from '../../store/workforceStore';
import { useBillStore } from '../../store/billStore';
import { useContractorStore } from '../../store/contractorStore';
import { useVendorStore } from '../../store/vendorStore';
import {
  HardHat, ShoppingCart, Briefcase, AlertTriangle, ChevronRight,
  Loader2, CalendarClock, CheckCircle2
} from 'lucide-react';
import { format, isBefore, startOfDay, addDays } from 'date-fns';
import { buildWageBalances, totalWagesOwed } from '../../lib/ledger';

/**
 * Everything the company still owes, in one place, grouped by who it's owed
 * to. Built for the end-of-week settle-up, but usable any day - each group
 * links straight to where that kind of payment is actually made.
 */
export function Settlements() {
  const { records, wagePayments, subscribeByDateRange, subscribeWagePayments } = useAttendanceStore();
  const { workforce, subscribeWorkforce } = useWorkforceStore();
  const { bills, subscribeBills } = useBillStore();
  const { allAssignments, subscribeAllAssignments } = useContractorStore();
  const { vendors, subscribeVendors } = useVendorStore();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  /** Only the top few per group, so all three sections stay reachable. */
  const PREVIEW = 5;

  useEffect(() => {
    const unsubs = [
      subscribeWorkforce(),
      subscribeBills(),
      subscribeAllAssignments(),
      subscribeVendors(),
      subscribeWagePayments(),
      subscribeByDateRange(0, Date.now() + 86400000),
    ];
    const t = setTimeout(() => setLoading(false), 1200);
    return () => { clearTimeout(t); unsubs.forEach(u => typeof u === 'function' && u()); };
  }, [subscribeWorkforce, subscribeBills, subscribeAllAssignments, subscribeVendors, subscribeWagePayments, subscribeByDateRange]);

  // --- Our own people (day-paid) ---
  const wageBalances = useMemo(
    () => buildWageBalances({ workforce, attendance: records, wagePayments }).filter(b => b.owed > 0),
    [workforce, records, wagePayments]
  );
  const wagesTotal = totalWagesOwed(wageBalances);

  // --- Shops and vendors ---
  const openBills = useMemo(
    () => bills
      .filter(b => (b.amount - (b.paidAmount || 0)) > 0)
      .map(b => ({ ...b, balance: b.amount - (b.paidAmount || 0) }))
      .sort((a, b) => (a.dueDate || Infinity) - (b.dueDate || Infinity)),
    [bills]
  );
  const billsTotal = openBills.reduce((s, b) => s + b.balance, 0);

  // --- Contractors and subcontractors ---
  const openContracts = useMemo(
    () => allAssignments
      .filter(a => a.status !== 'terminated' && (a.agreedValue - (a.totalPaid || 0)) > 0)
      .map(a => {
        const person = workforce.find(w => w.id === a.workforceId);
        return {
          ...a,
          balance: a.agreedValue - (a.totalPaid || 0),
          name: person?.name || 'Unknown contractor',
          trade: person?.trade || '',
          type: person?.type || 'Contractor',
        };
      })
      .sort((a, b) => b.balance - a.balance),
    [allAssignments, workforce]
  );
  const contractsTotal = openContracts.reduce((s, c) => s + c.balance, 0);

  const grandTotal = wagesTotal + billsTotal + contractsTotal;
  const today = startOfDay(new Date()).getTime();
  const weekAhead = addDays(today, 7).getTime();
  const dueThisWeek = openBills.filter(b => b.dueDate && b.dueDate <= weekAhead).reduce((s, b) => s + b.balance, 0);

  if (loading && grandTotal === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Working out what's owed…
      </div>
    );
  }

  const card = 'bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden';
  const groupHead = 'px-3 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3';

  return (
    <div className="space-y-6 pb-10">
      {/* Headline */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">Settlements</h1>
        <p className="text-sm text-gray-500 mt-1">
          Everything still to be paid — settle any of it now, or use this to plan the week's payments.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          <div className="p-4 rounded-lg bg-slate-900 text-white">
            <p className="text-xs uppercase tracking-wide text-slate-300">Total to pay</p>
            <p className="text-2xl font-bold mt-1">₹{grandTotal.toLocaleString('en-IN')}</p>
          </div>
          <div className="p-4 rounded-lg bg-orange-50 border border-orange-100">
            <p className="text-xs uppercase tracking-wide text-orange-700">Our people</p>
            <p className="text-xl font-bold text-orange-700 mt-1">₹{wagesTotal.toLocaleString('en-IN')}</p>
            <p className="text-xs text-orange-600 mt-0.5">{wageBalances.length} {wageBalances.length === 1 ? 'person' : 'people'}</p>
          </div>
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
            <p className="text-xs uppercase tracking-wide text-blue-700">Shops &amp; vendors</p>
            <p className="text-xl font-bold text-blue-700 mt-1">₹{billsTotal.toLocaleString('en-IN')}</p>
            <p className="text-xs text-blue-600 mt-0.5">{openBills.length} open {openBills.length === 1 ? 'bill' : 'bills'}</p>
          </div>
          <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
            <p className="text-xs uppercase tracking-wide text-purple-700">Contractors</p>
            <p className="text-xl font-bold text-purple-700 mt-1">₹{contractsTotal.toLocaleString('en-IN')}</p>
            <p className="text-xs text-purple-600 mt-0.5">{openContracts.length} open {openContracts.length === 1 ? 'contract' : 'contracts'}</p>
          </div>
        </div>

        {dueThisWeek > 0 && (
          <div className="mt-4 flex items-center gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            <CalendarClock className="w-4 h-4 shrink-0" />
            <span><strong>₹{dueThisWeek.toLocaleString('en-IN')}</strong> of shop bills falls due within the next 7 days.</span>
          </div>
        )}
      </div>

      {/* Our own people */}
      <div className={card}>
        <div className={groupHead}>
          <div className="flex items-center gap-2">
            <HardHat className="w-4 h-4 text-orange-500" />
            <h2 className="font-semibold text-gray-900">Our People — Coolies &amp; Staff</h2>
          </div>
          <Link to="/attendance/wages" className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1 shrink-0">
            Pay wages <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {wageBalances.length === 0 ? (
          <p className="px-3 sm:px-6 py-6 text-sm text-gray-500 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" /> Everyone is fully paid.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-2 text-left font-medium text-gray-500">Name</th>
                  <th className="px-3 sm:px-6 py-2 text-center font-medium text-gray-500">Days</th>
                  <th className="hidden sm:table-cell px-3 sm:px-6 py-2 text-left font-medium text-gray-500">Last worked</th>
                  <th className="px-3 sm:px-6 py-2 text-right font-medium text-gray-500">Owed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {wageBalances.slice(0, PREVIEW).map(b => (
                  <tr key={b.workforceId} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/workforce/${b.workforceId}`)}>
                    <td className="px-3 sm:px-6 py-3">
                      <Link to={`/workforce/${b.workforceId}`} className="font-medium text-gray-900 hover:text-blue-600 hover:underline">{b.name}</Link>
                      <div className="text-xs text-gray-500">{b.type} • {b.trade}</div>
                      {b.hasUnratedDays && (
                        <div className="flex items-center gap-1 text-xs text-amber-700 mt-0.5">
                          <AlertTriangle className="w-3 h-3" /> some days have no amount
                        </div>
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-3 text-center text-gray-700">{b.daysWorked}</td>
                    <td className="hidden sm:table-cell px-3 sm:px-6 py-3 text-gray-500">{b.lastWorked ? format(b.lastWorked, 'dd MMM yyyy') : '—'}</td>
                    <td className="px-3 sm:px-6 py-3 text-right font-bold text-orange-600">₹{b.owed.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {wageBalances.length > PREVIEW && (
          <Link to="/settlements/people" className="block px-6 py-3 border-t border-gray-100 text-sm font-medium text-blue-600 hover:bg-gray-50 text-center">
            View full list — all {wageBalances.length} people
          </Link>
        )}
      </div>

      {/* Shops & vendors */}
      <div className={card}>
        <div className={groupHead}>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-blue-500" />
            <h2 className="font-semibold text-gray-900">Shops &amp; Vendors</h2>
          </div>
          <Link to="/purchases" className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1 shrink-0">
            Pay bills <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {openBills.length === 0 ? (
          <p className="px-3 sm:px-6 py-6 text-sm text-gray-500 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" /> No unpaid bills.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-2 text-left font-medium text-gray-500">Shop</th>
                  <th className="px-3 sm:px-6 py-2 text-left font-medium text-gray-500">For</th>
                  <th className="px-3 sm:px-6 py-2 text-left font-medium text-gray-500">Due</th>
                  <th className="px-3 sm:px-6 py-2 text-right font-medium text-gray-500">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {openBills.slice(0, PREVIEW).map(b => {
                  const overdue = b.dueDate && isBefore(b.dueDate, today);
                  const vendor = vendors.find(v => v.id === b.vendorId);
                  return (
                    <tr key={b.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate('/purchases')}>
                      <td className="px-3 sm:px-6 py-3 font-medium text-gray-900">
                        {b.vendorName}
                        {vendor?.category && <div className="text-xs text-gray-500">{vendor.category}</div>}
                      </td>
                      <td className="px-3 sm:px-6 py-3 text-gray-600 max-w-[220px] truncate" title={b.description}>{b.description || '—'}</td>
                      <td className="px-3 sm:px-6 py-3">
                        {b.dueDate ? (
                          <span className={overdue ? 'text-red-600 font-medium flex items-center gap-1' : 'text-gray-500'}>
                            {overdue && <AlertTriangle className="w-3.5 h-3.5" />}
                            {format(b.dueDate, 'dd MMM yyyy')}
                          </span>
                        ) : <span className="text-gray-300">No due date</span>}
                      </td>
                      <td className="px-3 sm:px-6 py-3 text-right font-bold text-blue-700">₹{b.balance.toLocaleString('en-IN')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {openBills.length > PREVIEW && (
          <Link to="/settlements/vendors" className="block px-6 py-3 border-t border-gray-100 text-sm font-medium text-blue-600 hover:bg-gray-50 text-center">
            View full list — all {openBills.length} bills
          </Link>
        )}
      </div>

      {/* Contractors */}
      <div className={card}>
        <div className={groupHead}>
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-purple-500" />
            <h2 className="font-semibold text-gray-900">Contractors &amp; Subcontractors</h2>
          </div>
        </div>
        {openContracts.length === 0 ? (
          <p className="px-3 sm:px-6 py-6 text-sm text-gray-500 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" /> Nothing outstanding on any contract.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-2 text-left font-medium text-gray-500">Contractor</th>
                  <th className="px-3 sm:px-6 py-2 text-left font-medium text-gray-500">Scope</th>
                  <th className="px-3 sm:px-6 py-2 text-center font-medium text-gray-500">Progress</th>
                  <th className="px-3 sm:px-6 py-2 text-right font-medium text-gray-500">Agreed</th>
                  <th className="px-3 sm:px-6 py-2 text-right font-medium text-gray-500">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {openContracts.slice(0, PREVIEW).map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/workforce/${c.workforceId}`)}>
                    <td className="px-3 sm:px-6 py-3">
                      <Link to={`/workforce/${c.workforceId}`} className="font-medium text-gray-900 hover:text-blue-600 hover:underline">{c.name}</Link>
                      <div className="text-xs text-gray-500">{c.type} • {c.trade}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 text-gray-600 max-w-[220px] truncate" title={c.assignedScope}>{c.assignedScope}</td>
                    <td className="px-3 sm:px-6 py-3 text-center text-gray-600">{c.progressPercentage || 0}%</td>
                    <td className="px-3 sm:px-6 py-3 text-right text-gray-500">₹{c.agreedValue.toLocaleString('en-IN')}</td>
                    <td className="px-3 sm:px-6 py-3 text-right font-bold text-purple-700">₹{c.balance.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {openContracts.length > PREVIEW && (
          <Link to="/settlements/contractors" className="block px-6 py-3 border-t border-gray-100 text-sm font-medium text-blue-600 hover:bg-gray-50 text-center">
            View full list — all {openContracts.length} contracts
          </Link>
        )}
      </div>
    </div>
  );
}
