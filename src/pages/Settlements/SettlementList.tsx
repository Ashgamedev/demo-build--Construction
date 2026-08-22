import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAttendanceStore } from '../../store/attendanceStore';
import { useWorkforceStore } from '../../store/workforceStore';
import { useBillStore } from '../../store/billStore';
import { useContractorStore } from '../../store/contractorStore';
import { useVendorStore } from '../../store/vendorStore';
import { useProjectStore } from '../../store/projectStore';
import { ArrowLeft, Search, AlertTriangle, Loader2, HardHat, ShoppingCart, Briefcase } from 'lucide-react';
import { format, isBefore, startOfDay } from 'date-fns';
import { buildWageBalances } from '../../lib/ledger';

type Group = 'people' | 'vendors' | 'contractors';

const META: Record<Group, { title: string; icon: typeof HardHat; accent: string; payLink?: string; payLabel?: string }> = {
  people:      { title: 'Our People — Coolies & Staff', icon: HardHat,      accent: 'text-orange-500', payLink: '/attendance/wages', payLabel: 'Pay wages' },
  vendors:     { title: 'Shops & Vendors',              icon: ShoppingCart, accent: 'text-blue-500',   payLink: '/purchases',        payLabel: 'Pay bills' },
  contractors: { title: 'Contractors & Subcontractors', icon: Briefcase,    accent: 'text-purple-500' },
};

/**
 * The full list for one settlement group. The Settlements page shows only the
 * top few of each group so the three sections stay reachable; this is where
 * the complete list lives, with search.
 */
export function SettlementList() {
  // Normalised once, then used everywhere below. Read raw, an unrecognised
  // name could show one group's heading over another group's rows.
  const { group: rawGroup } = useParams<{ group: string }>();
  const group: Group = rawGroup && rawGroup in META ? (rawGroup as Group) : 'people';
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const { records, wagePayments, subscribeByDateRange, subscribeWagePayments } = useAttendanceStore();
  const { workforce, subscribeWorkforce } = useWorkforceStore();
  const { bills, subscribeBills } = useBillStore();
  const { allAssignments, subscribeAllAssignments } = useContractorStore();
  const { vendors, subscribeVendors } = useVendorStore();
  const { projects, subscribeProjects } = useProjectStore();

  useEffect(() => {
    const unsubs = [
      subscribeWorkforce(), subscribeBills(), subscribeAllAssignments(),
      subscribeVendors(), subscribeWagePayments(), subscribeProjects(),
      subscribeByDateRange(0, Date.now() + 86400000),
    ];
    const t = setTimeout(() => setLoading(false), 1200);
    return () => { clearTimeout(t); unsubs.forEach(u => typeof u === 'function' && u()); };
  }, [subscribeWorkforce, subscribeBills, subscribeAllAssignments, subscribeVendors, subscribeWagePayments, subscribeProjects, subscribeByDateRange]);

  const meta = META[group];
  const Icon = meta.icon;
  const q = search.trim().toLowerCase();

  const people = useMemo(
    () => buildWageBalances({ workforce, attendance: records, wagePayments })
      .filter(b => b.owed > 0)
      .filter(b => !q || b.name.toLowerCase().includes(q) || b.trade.toLowerCase().includes(q)),
    [workforce, records, wagePayments, q]
  );

  const openBills = useMemo(
    () => bills
      .filter(b => (b.amount - (b.paidAmount || 0)) > 0)
      .map(b => ({ ...b, balance: b.amount - (b.paidAmount || 0) }))
      .filter(b => !q || b.vendorName.toLowerCase().includes(q) || (b.description || '').toLowerCase().includes(q))
      .sort((a, b) => (a.dueDate || Infinity) - (b.dueDate || Infinity)),
    [bills, q]
  );

  const openContracts = useMemo(
    () => allAssignments
      .filter(a => a.status !== 'terminated' && (a.agreedValue - (a.totalPaid || 0)) > 0)
      .map(a => {
        const person = workforce.find(w => w.id === a.workforceId);
        const project = projects.find(p => p.id === a.projectId);
        return {
          ...a,
          balance: a.agreedValue - (a.totalPaid || 0),
          name: person?.name || 'Unknown contractor',
          trade: person?.trade || '',
          type: person?.type || 'Contractor',
          projectTitle: project?.title || '—',
        };
      })
      .filter(c => !q || c.name.toLowerCase().includes(q) || c.assignedScope.toLowerCase().includes(q) || c.projectTitle.toLowerCase().includes(q))
      .sort((a, b) => b.balance - a.balance),
    [allAssignments, workforce, projects, q]
  );

  const count = group === 'vendors' ? openBills.length : group === 'contractors' ? openContracts.length : people.length;
  const total =
    group === 'vendors' ? openBills.reduce((s, b) => s + b.balance, 0)
    : group === 'contractors' ? openContracts.reduce((s, c) => s + c.balance, 0)
    : people.reduce((s, p) => s + p.owed, 0);

  const today = startOfDay(new Date()).getTime();
  const rowCls = 'hover:bg-gray-50 cursor-pointer';

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/settlements" className="p-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${meta.accent}`} />
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{meta.title}</h1>
              <p className="text-sm text-gray-500">{count} outstanding · ₹{total.toLocaleString('en-IN')} total</p>
            </div>
          </div>
        </div>
        {meta.payLink && (
          <Link to={meta.payLink} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 shrink-0">
            {meta.payLabel}
          </Link>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="pl-9 pr-3 py-2 w-full border border-gray-300 rounded-md text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading && count === 0 ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-100">
              {group === 'vendors' ? (
                <>
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-2 text-left font-medium text-gray-500">Shop</th>
                      <th className="px-3 sm:px-6 py-2 text-left font-medium text-gray-500">For</th>
                      <th className="px-3 sm:px-6 py-2 text-left font-medium text-gray-500">Due</th>
                      <th className="px-3 sm:px-6 py-2 text-right font-medium text-gray-500">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {openBills.map(b => {
                      const overdue = b.dueDate && isBefore(b.dueDate, today);
                      const vendor = vendors.find(v => v.id === b.vendorId);
                      return (
                        <tr key={b.id} className={rowCls} onClick={() => navigate('/purchases')}>
                          <td className="px-3 sm:px-6 py-3 font-medium text-gray-900">
                            {b.vendorName}
                            {vendor?.category && <div className="text-xs text-gray-500">{vendor.category}</div>}
                          </td>
                          <td className="px-3 sm:px-6 py-3 text-gray-600 max-w-[260px] truncate" title={b.description}>{b.description || '—'}</td>
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
                    {openBills.length === 0 && <tr><td colSpan={4} className="px-3 sm:px-6 py-8 text-center text-gray-500">Nothing outstanding.</td></tr>}
                  </tbody>
                </>
              ) : group === 'contractors' ? (
                <>
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-2 text-left font-medium text-gray-500">Contractor</th>
                      <th className="px-3 sm:px-6 py-2 text-left font-medium text-gray-500">Project</th>
                      <th className="hidden sm:table-cell px-3 sm:px-6 py-2 text-left font-medium text-gray-500">Scope</th>
                      <th className="px-3 sm:px-6 py-2 text-center font-medium text-gray-500">Progress</th>
                      <th className="hidden sm:table-cell px-3 sm:px-6 py-2 text-right font-medium text-gray-500">Agreed</th>
                      <th className="px-3 sm:px-6 py-2 text-right font-medium text-gray-500">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {openContracts.map(c => (
                      <tr key={c.id} className={rowCls} onClick={() => navigate(`/workforce/${c.workforceId}`)}>
                        <td className="px-3 sm:px-6 py-3">
                          <div className="font-medium text-gray-900">{c.name}</div>
                          <div className="text-xs text-gray-500">{c.type} • {c.trade}</div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 text-gray-600 max-w-[160px] truncate" title={c.projectTitle}>{c.projectTitle}</td>
                        <td className="hidden sm:table-cell px-3 sm:px-6 py-3 text-gray-600 max-w-[220px] truncate" title={c.assignedScope}>{c.assignedScope}</td>
                        <td className="px-3 sm:px-6 py-3 text-center text-gray-600">{c.progressPercentage || 0}%</td>
                        <td className="hidden sm:table-cell px-3 sm:px-6 py-3 text-right text-gray-500">₹{c.agreedValue.toLocaleString('en-IN')}</td>
                        <td className="px-3 sm:px-6 py-3 text-right font-bold text-purple-700">₹{c.balance.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                    {openContracts.length === 0 && <tr><td colSpan={6} className="px-3 sm:px-6 py-8 text-center text-gray-500">Nothing outstanding.</td></tr>}
                  </tbody>
                </>
              ) : (
                <>
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-2 text-left font-medium text-gray-500">Name</th>
                      <th className="px-3 sm:px-6 py-2 text-center font-medium text-gray-500">Days</th>
                      <th className="hidden sm:table-cell px-3 sm:px-6 py-2 text-left font-medium text-gray-500">Last worked</th>
                      <th className="hidden sm:table-cell px-3 sm:px-6 py-2 text-right font-medium text-gray-500">Earned</th>
                      <th className="px-3 sm:px-6 py-2 text-right font-medium text-gray-500">Paid</th>
                      <th className="px-3 sm:px-6 py-2 text-right font-medium text-gray-500">Owed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {people.map(b => (
                      <tr key={b.workforceId} className={rowCls} onClick={() => navigate(`/workforce/${b.workforceId}`)}>
                        <td className="px-3 sm:px-6 py-3">
                          <div className="font-medium text-gray-900">{b.name}</div>
                          <div className="text-xs text-gray-500">{b.type} • {b.trade}</div>
                          {b.hasUnratedDays && (
                            <div className="flex items-center gap-1 text-xs text-amber-700 mt-0.5">
                              <AlertTriangle className="w-3 h-3" /> some days have no amount
                            </div>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-3 text-center text-gray-700">{b.daysWorked}</td>
                        <td className="hidden sm:table-cell px-3 sm:px-6 py-3 text-gray-500">{b.lastWorked ? format(b.lastWorked, 'dd MMM yyyy') : '—'}</td>
                        <td className="hidden sm:table-cell px-3 sm:px-6 py-3 text-right text-gray-700">₹{b.totalEarned.toLocaleString('en-IN')}</td>
                        <td className="px-3 sm:px-6 py-3 text-right text-gray-500">
                          ₹{b.totalPaid.toLocaleString('en-IN')}
                          {b.totalAdvances > 0 && (
                            <div className="text-xs text-amber-700">incl. ₹{b.totalAdvances.toLocaleString('en-IN')} advance</div>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-3 text-right font-bold text-orange-600">₹{b.owed.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                    {people.length === 0 && <tr><td colSpan={6} className="px-3 sm:px-6 py-8 text-center text-gray-500">Nothing outstanding.</td></tr>}
                  </tbody>
                </>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
