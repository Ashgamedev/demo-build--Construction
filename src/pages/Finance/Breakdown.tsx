import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useFinanceStore } from '../../store/financeStore';
import { useProjectStore } from '../../store/projectStore';
import { useCustomerStore } from '../../store/customerStore';
import { useBillStore } from '../../store/billStore';
import { useContractorStore } from '../../store/contractorStore';
import { useWorkforceStore } from '../../store/workforceStore';
import { useAttendanceStore } from '../../store/attendanceStore';
import {
  ArrowLeft, Search, Loader2, TrendingUp, TrendingDown, IndianRupee,
  Wallet, AlertCircle, ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { buildWageBalances, totalWagesOwed } from '../../lib/ledger';

type Metric = 'pending' | 'contracted' | 'collected' | 'expenses' | 'cash';

const META: Record<Metric, { title: string; blurb: string; icon: typeof Wallet; tone: string }> = {
  pending:    { title: 'Pending to Pay',     blurb: 'Everything still owed to workers, shops and contractors.', icon: AlertCircle, tone: 'text-orange-600' },
  contracted: { title: 'Contracted Value',   blurb: 'The agreed value of every project on the books.',          icon: IndianRupee, tone: 'text-blue-600' },
  collected:  { title: 'Amount Collected',   blurb: 'Every payment received from customers.',                   icon: TrendingUp,  tone: 'text-green-600' },
  expenses:   { title: 'Actual Expenses',    blurb: 'Every rupee recorded as spent.',                           icon: TrendingDown, tone: 'text-red-600' },
  cash:       { title: 'Cash Position',      blurb: 'Money collected, less money spent.',                       icon: Wallet,      tone: 'text-indigo-600' },
};

/**
 * The detail behind one figure on the Finance dashboard.
 *
 * Every row links back to wherever that money was actually recorded, so a
 * number on the dashboard can always be traced to its source rather than
 * being taken on trust.
 */
export function Breakdown() {
  const { metric } = useParams<{ metric: Metric }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const { expenses, payments, subscribeFinance } = useFinanceStore();
  const { projects, subscribeProjects } = useProjectStore();
  const { customers, subscribe: subscribeCustomers } = useCustomerStore();
  const { bills, subscribeBills } = useBillStore();
  const { allAssignments, subscribeAllAssignments } = useContractorStore();
  const { workforce, subscribeWorkforce } = useWorkforceStore();
  const { records, wagePayments, subscribeByDateRange, subscribeWagePayments } = useAttendanceStore();

  useEffect(() => {
    const unsubs = [
      subscribeFinance(), subscribeProjects(), subscribeCustomers(), subscribeBills(),
      subscribeAllAssignments(), subscribeWorkforce(), subscribeWagePayments(),
      subscribeByDateRange(0, Date.now() + 86400000),
    ];
    const t = setTimeout(() => setLoading(false), 1200);
    return () => { clearTimeout(t); unsubs.forEach(u => typeof u === 'function' && u()); };
  }, [subscribeFinance, subscribeProjects, subscribeCustomers, subscribeBills, subscribeAllAssignments, subscribeWorkforce, subscribeWagePayments, subscribeByDateRange]);

  // A stale bookmark or a mistyped URL used to blank this whole screen, because
  // an unrecognised name was still used to look the figure up. Anything not on
  // the list now falls back to Amount Collected instead of crashing.
  const key: Metric = metric && metric in META ? (metric as Metric) : 'collected';
  const meta = META[key];
  const Icon = meta.icon;
  const q = search.trim().toLowerCase();

  const projectName = (id?: string) => projects.find(p => p.id === id)?.title || '';

  // --- the figures, computed the same way the dashboard computes them ---
  const collectedRows = useMemo(
    () => payments
      .map(p => ({ ...p, project: projectName(p.projectId), customer: customers.find(c => c.id === p.customerId)?.name || '' }))
      .filter(r => !q || r.project.toLowerCase().includes(q) || r.customer.toLowerCase().includes(q))
      .sort((a, b) => b.date - a.date),
    [payments, projects, customers, q]
  );

  const expenseRows = useMemo(
    () => expenses
      .map(e => ({ ...e, project: projectName(e.projectId) }))
      .filter(r => !q || (r.description || '').toLowerCase().includes(q) || (r.payeeName || '').toLowerCase().includes(q) || r.project.toLowerCase().includes(q) || (r.category || '').toLowerCase().includes(q))
      .sort((a, b) => b.date - a.date),
    [expenses, projects, q]
  );

  const projectRows = useMemo(
    () => projects
      .map(p => {
        const collected = payments.filter(x => x.projectId === p.id).reduce((s, x) => s + (x.amount || 0), 0);
        return { ...p, collected, outstanding: (p.agreedValue || 0) - collected, customer: customers.find(c => c.id === p.customerId)?.name || '' };
      })
      .filter(r => !q || r.title.toLowerCase().includes(q) || r.customer.toLowerCase().includes(q))
      .sort((a, b) => (b.agreedValue || 0) - (a.agreedValue || 0)),
    [projects, payments, customers, q]
  );

  const wageBalances = useMemo(
    () => buildWageBalances({ workforce, attendance: records, wagePayments }).filter(b => b.owed > 0),
    [workforce, records, wagePayments]
  );
  const openBills = bills.filter(b => (b.amount - (b.paidAmount || 0)) > 0);
  const openContracts = allAssignments.filter(a => a.status !== 'terminated' && (a.agreedValue - (a.totalPaid || 0)) > 0);

  const totals = {
    pending: totalWagesOwed(wageBalances)
      + openBills.reduce((s, b) => s + (b.amount - (b.paidAmount || 0)), 0)
      + openContracts.reduce((s, a) => s + (a.agreedValue - (a.totalPaid || 0)), 0),
    contracted: projects.reduce((s, p) => s + (p.agreedValue || 0), 0),
    collected: payments.reduce((s, p) => s + (p.amount || 0), 0),
    expenses: expenses.reduce((s, e) => s + (e.amount || 0), 0),
    cash: payments.reduce((s, p) => s + (p.amount || 0), 0) - expenses.reduce((s, e) => s + (e.amount || 0), 0),
  };

  const th = 'px-3 sm:px-6 py-2 text-left font-medium text-gray-500';
  const rowCls = 'hover:bg-gray-50 cursor-pointer';

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <Link to="/finance" className="p-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          <Icon className={`w-6 h-6 ${meta.tone}`} />
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{meta.title}</h1>
            <p className="text-sm text-gray-500">{meta.blurb}</p>
          </div>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
          <p className={`text-2xl font-bold ${meta.tone}`}>₹{totals[key].toLocaleString('en-IN')}</p>
        </div>
      </div>

      {key !== 'cash' && key !== 'pending' && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search…" className="pl-9 pr-3 py-2 w-full border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>
      )}

      {loading && payments.length === 0 && expenses.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-gray-400 bg-white rounded-lg border border-gray-200">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
        </div>
      ) : (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">

          {/* ---- Money collected from customers ---- */}
          {key === 'collected' && (
            <table className="min-w-full text-sm divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className={th}>Date</th><th className={th}>Project</th>
                  <th className={th}>Customer</th><th className={th}>Mode</th>
                  <th className={`${th} text-right`}>Amount</th><th className={th}></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {collectedRows.map(p => (
                  <tr key={p.id} className={rowCls} onClick={() => navigate(`/finance/payments/${p.id}`)}>
                    <td className="px-3 sm:px-6 py-3 text-gray-500 whitespace-nowrap">{format(p.date, 'dd MMM yyyy')}</td>
                    <td className="px-3 sm:px-6 py-3 font-medium text-gray-900 max-w-[220px] truncate">{p.project || '—'}</td>
                    <td className="px-3 sm:px-6 py-3 text-gray-600">{p.customer || '—'}</td>
                    <td className="px-3 sm:px-6 py-3 text-gray-600">{p.paymentMode}</td>
                    <td className="px-3 sm:px-6 py-3 text-right font-bold text-green-700">+₹{p.amount.toLocaleString('en-IN')}</td>
                    <td className="px-3 sm:px-6 py-3 text-gray-300"><ChevronRight className="w-4 h-4" /></td>
                  </tr>
                ))}
                {collectedRows.length === 0 && <tr><td colSpan={6} className="px-3 sm:px-6 py-8 text-center text-gray-500">No payments recorded.</td></tr>}
              </tbody>
            </table>
          )}

          {/* ---- Money spent ---- */}
          {key === 'expenses' && (
            <table className="min-w-full text-sm divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className={th}>Date</th><th className={th}>Category</th>
                  <th className={th}>Description</th><th className={th}>Paid To</th>
                  <th className={th}>Project</th><th className={`${th} text-right`}>Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expenseRows.map(e => (
                  <tr
                    key={e.id}
                    className={rowCls}
                    // Expenses are corrected on the expenses list, so that's
                    // where the trail leads.
                    onClick={() => navigate('/finance/expenses')}
                  >
                    <td className="px-3 sm:px-6 py-3 text-gray-500 whitespace-nowrap">{format(e.date, 'dd MMM yyyy')}</td>
                    <td className="px-3 sm:px-6 py-3"><span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{e.category}</span></td>
                    <td className="px-3 sm:px-6 py-3 text-gray-900 max-w-[220px] truncate" title={e.description}>{e.description}</td>
                    <td className="px-3 sm:px-6 py-3 text-gray-600 max-w-[140px] truncate">{e.payeeName || '—'}</td>
                    <td className="px-3 sm:px-6 py-3 text-gray-500 max-w-[160px] truncate">{e.project || <span className="text-gray-300">General</span>}</td>
                    <td className="px-3 sm:px-6 py-3 text-right font-bold text-red-600">-₹{e.amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                {expenseRows.length === 0 && <tr><td colSpan={6} className="px-3 sm:px-6 py-8 text-center text-gray-500">No expenses recorded.</td></tr>}
              </tbody>
            </table>
          )}

          {/* ---- Contracted value, per project ---- */}
          {key === 'contracted' && (
            <table className="min-w-full text-sm divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className={th}>Project</th><th className={th}>Customer</th><th className={th}>Status</th>
                  <th className={`${th} text-right`}>Agreed</th><th className={`${th} text-right`}>Collected</th>
                  <th className={`${th} text-right`}>Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {projectRows.map(p => (
                  <tr key={p.id} className={rowCls} onClick={() => navigate(`/projects/${p.id}`)}>
                    <td className="px-3 sm:px-6 py-3 font-medium text-gray-900 max-w-[220px] truncate">{p.title}</td>
                    <td className="px-3 sm:px-6 py-3 text-gray-600">{p.customer || '—'}</td>
                    <td className="px-3 sm:px-6 py-3"><span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{p.status}</span></td>
                    <td className="px-3 sm:px-6 py-3 text-right text-gray-900">₹{(p.agreedValue || 0).toLocaleString('en-IN')}</td>
                    <td className="px-3 sm:px-6 py-3 text-right text-green-700">₹{p.collected.toLocaleString('en-IN')}</td>
                    <td className="px-3 sm:px-6 py-3 text-right font-semibold text-orange-600">₹{Math.max(0, p.outstanding).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                {projectRows.length === 0 && <tr><td colSpan={6} className="px-3 sm:px-6 py-8 text-center text-gray-500">No projects yet.</td></tr>}
              </tbody>
            </table>
          )}

          {/* ---- What's still owed out ---- */}
          {key === 'pending' && (
            <div className="divide-y divide-gray-100">
              {([
                ['Our people — coolies & staff', wageBalances.length, totalWagesOwed(wageBalances), '/settlements/people'],
                ['Shops & vendors', openBills.length, openBills.reduce((s, b) => s + (b.amount - (b.paidAmount || 0)), 0), '/settlements/vendors'],
                ['Contractors & subcontractors', openContracts.length, openContracts.reduce((s, a) => s + (a.agreedValue - (a.totalPaid || 0)), 0), '/settlements/contractors'],
              ] as const).map(([label, count, amount, link]) => (
                <Link key={label} to={link} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500">{count} outstanding</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-orange-600">₹{amount.toLocaleString('en-IN')}</span>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* ---- Cash position: both sides of the figure ---- */}
          {key === 'cash' && (
            <div className="divide-y divide-gray-100">
              <Link to="/finance/breakdown/collected" className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">Money collected</p>
                  <p className="text-xs text-gray-500">{payments.length} payments from customers</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-green-700">+₹{totals.collected.toLocaleString('en-IN')}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </Link>
              <Link to="/finance/breakdown/expenses" className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">Money spent</p>
                  <p className="text-xs text-gray-500">{expenses.length} expenses recorded</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-red-600">−₹{totals.expenses.toLocaleString('en-IN')}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </Link>
              <div className="flex items-center justify-between px-6 py-4 bg-slate-50">
                <p className="font-semibold text-gray-900">Cash position</p>
                <span className={`text-lg font-bold ${totals.cash >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                  ₹{totals.cash.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="px-3 sm:px-6 py-3 text-xs text-gray-500">
                This counts money actually received and actually spent. It does not include what is still
                owed to you, or what you still owe out — see <Link to="/finance/breakdown/pending" className="text-blue-600 hover:underline">Pending to Pay</Link>.
              </p>
            </div>
          )}

        </div>
      </div>
      )}
    </div>
  );
}
