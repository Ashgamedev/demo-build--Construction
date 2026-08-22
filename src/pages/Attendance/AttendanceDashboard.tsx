import { useState, useEffect, useMemo } from 'react';
import { useAttendanceStore } from '../../store/attendanceStore';
import { useWorkforceStore } from '../../store/workforceStore';
import { useProjectStore } from '../../store/projectStore';
import { format, startOfDay, addDays, subDays } from 'date-fns';
import { Loader2, Calendar, ChevronLeft, ChevronRight, Calculator, History, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { WorkforceType } from '../../types';

export function AttendanceDashboard() {
  const [activeTab, setActiveTab] = useState<'entry' | 'history'>('entry');
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()).getTime());
  /** Which site the day's work is being recorded against. Without this, wages
   *  can never be attributed to a project - previously every record saved as
   *  "General / Not project-specific". */
  const [siteProjectId, setSiteProjectId] = useState('');

  // History filters
  const [startDate, setStartDate] = useState(subDays(startOfDay(new Date()), 7).getTime());
  const [endDate, setEndDate] = useState(startOfDay(new Date()).getTime());
  const [typeFilter, setTypeFilter] = useState<WorkforceType | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Present' | 'Half-day' | 'Absent'>('All');

  const { records, wagePayments, loading, subscribeByDateRange, subscribeWagePayments, saveRecord, payWages } = useAttendanceStore();
  const [advanceTarget, setAdvanceTarget] = useState<{ id: string; name: string } | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [savingAdvance, setSavingAdvance] = useState(false);
  const { workforce, loading: wfLoading, subscribeWorkforce } = useWorkforceStore();
  const { projects, subscribeProjects } = useProjectStore();

  useEffect(() => {
    const unsubs = [subscribeWorkforce(), subscribeProjects(), subscribeWagePayments()];
    return () => unsubs.forEach(u => u());
  }, [subscribeWorkforce, subscribeProjects, subscribeWagePayments]);

  /** Cash handed to someone on site today. Recorded against their wage
   *  balance, so the week-end settle-up is automatically reduced by it. */
  const handleGiveAdvance = async () => {
    if (!advanceTarget) return;
    const amount = Number(advanceAmount);
    if (!amount || amount <= 0) return alert('Enter a valid amount');

    setSavingAdvance(true);
    try {
      await payWages({
        workforceId: advanceTarget.id,
        workforceName: advanceTarget.name,
        amount,
        projectId: siteProjectId || undefined,
        paymentMethod: 'Cash',
        isAdvance: true,
        date: selectedDate,
      });
      setAdvanceTarget(null);
      setAdvanceAmount('');
    } catch (e: any) {
      alert('Failed to record advance: ' + e.message);
    } finally {
      setSavingAdvance(false);
    }
  };
  
  useEffect(() => {
    if (activeTab === 'entry') {
      const unsub = subscribeByDateRange(selectedDate, selectedDate);
      return () => unsub();
    } else {
      const unsub = subscribeByDateRange(startDate, endDate);
      return () => unsub();
    }
  }, [activeTab, selectedDate, startDate, endDate, subscribeByDateRange]);

  const handleDateChange = (days: number) => {
    setSelectedDate(prev => addDays(new Date(prev), days).getTime());
  };

  // When moving to a day that already has attendance recorded, show the site
  // it was recorded against so re-marking someone doesn't silently reassign
  // the whole day to a different project.
  useEffect(() => {
    if (activeTab !== 'entry') return;
    const existing = records.find(r => r.date === selectedDate && r.projectId);
    setSiteProjectId(existing?.projectId || '');
  }, [activeTab, selectedDate, records]);

  const handleStatusChange = async (workforceId: string, status: 'Present' | 'Half-day' | 'Absent') => {
    const person = workforce.find(w => w.id === workforceId);
    if (!person) return;
    
    let wagesEarned = 0;
    if (person.dailyWage) {
      if (status === 'Present') wagesEarned = person.dailyWage;
      if (status === 'Half-day') wagesEarned = person.dailyWage / 2;
    }
    
    await saveRecord({
      date: selectedDate,
      projectId: siteProjectId || undefined,
      workforceId,
      status,
      wagesEarned
    }, person.name);
  };

  /** Adjust what a person earned on this specific day, overriding their usual rate. */
  const handleAmountChange = async (
    workforceId: string,
    field: 'wagesEarned' | 'overtimeAmount',
    raw: string
  ) => {
    const person = workforce.find(w => w.id === workforceId);
    const existing = records.find(r => r.workforceId === workforceId && r.date === selectedDate);
    if (!person || !existing) return;

    const value = raw === '' ? 0 : Number(raw);
    if (Number.isNaN(value) || value < 0) return;
    if ((existing[field] || 0) === value) return; // nothing actually changed

    await saveRecord({
      date: selectedDate,
      projectId: existing.projectId ?? (siteProjectId || undefined),
      workforceId,
      status: existing.status,
      wagesEarned: field === 'wagesEarned' ? value : (existing.wagesEarned || 0),
      overtimeAmount: field === 'overtimeAmount' ? value : (existing.overtimeAmount || 0),
    }, person.name);
  };

  const filteredHistory = useMemo(() => {
    return records
      .filter(r => {
        const person = workforce.find(w => w.id === r.workforceId);
        if (!person) return false;
        if (typeFilter !== 'All' && person.type !== typeFilter) return false;
        if (statusFilter !== 'All' && r.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => b.date - a.date);
  }, [records, workforce, typeFilter, statusFilter]);

  if (wfLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Filter for Coolies and Staff
  const trackingList = workforce.filter(w => w.isActive && (w.type === 'Coolie' || w.type === 'Site Staff' || w.type === 'Permanent Employee'));

  // Advances already given on the day being viewed.
  const advancesToday = wagePayments.filter(p => p.isAdvance && p.date === selectedDate);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Attendance</h2>
          <p className="text-sm text-gray-500">Track staff and coolie attendance company-wide</p>
        </div>
        <div className="flex items-center space-x-4">
          <Link
            to="/attendance/wages"
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
            title="See what each person is owed and pay them"
          >
            <Calculator className="w-4 h-4" />
            <span>Wages Owed</span>
          </Link>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('entry')}
            className={`${
              activeTab === 'entry'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Calendar className="w-4 h-4 mr-2" /> Daily Entry
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <History className="w-4 h-4 mr-2" /> History & Filters
          </button>
        </nav>
      </div>

      {activeTab === 'entry' ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Date Selector Header */}
          <div className="bg-slate-50 border-b border-gray-200 p-4 flex items-center justify-between gap-2">
            <button
              onClick={() => handleDateChange(-1)}
              className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600 shrink-0"
              title="Previous day"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center space-x-2 text-slate-800 font-semibold text-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span>{format(selectedDate, 'EEEE, MMMM do yyyy')}</span>
              </div>
              {/* Jump straight to any past date, rather than clicking back one day at a time. */}
              {/* Comfortably tappable - this gets used one-handed on a site. */}
              <input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                max={format(startOfDay(new Date()), 'yyyy-MM-dd')}
                onChange={e => e.target.value && setSelectedDate(startOfDay(new Date(e.target.value)).getTime())}
                className="text-sm border border-gray-300 rounded-md px-3 py-2 min-h-[40px] text-slate-600"
              />
            </div>

            <button
              onClick={() => handleDateChange(1)}
              className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600 shrink-0"
              disabled={selectedDate >= startOfDay(new Date()).getTime()}
              title="Next day"
            >
              <ChevronRight className={`w-5 h-5 ${selectedDate >= startOfDay(new Date()).getTime() ? 'text-gray-300' : ''}`} />
            </button>
          </div>

          {/* Which site today's work is against */}
          <div className="px-4 py-3 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-sm font-medium text-gray-700 shrink-0">Working at site:</label>
            <select
              value={siteProjectId}
              onChange={e => setSiteProjectId(e.target.value)}
              className="flex-1 border border-gray-300 rounded-md p-2 text-sm"
            >
              <option value="">-- Not linked to a project --</option>
              {projects.filter(p => p.status !== 'Completed' && p.status !== 'Cancelled').map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
            {!siteProjectId && (
              <span className="flex items-center gap-1 text-xs text-amber-700 shrink-0">
                <AlertTriangle className="w-3.5 h-3.5" />
                Wages won't count towards any project
              </span>
            )}
          </div>

          {/* Attendance List */}
          <div className="divide-y divide-gray-100">
            {trackingList.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No staff or coolies found. Add them in the Workforce tab first.
              </div>
            ) : (
              trackingList.map(person => {
                const record = records.find(r => r.workforceId === person.id && r.date === selectedDate);
                const status = record?.status || null;
                const worked = status === 'Present' || status === 'Half-day';

                return (
                  <div key={person.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg">
                          {person.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{person.name}</h4>
                          <p className="text-sm text-gray-500">{person.type} • Trade: {person.trade}</p>
                        </div>
                      </div>

                      <div className="flex space-x-2 w-full md:w-auto">
                        <button
                          onClick={() => handleStatusChange(person.id, 'Present')}
                          className={`flex-1 md:flex-none px-6 py-2 rounded-md font-medium text-sm transition-colors border ${status === 'Present' ? 'bg-green-100 border-green-500 text-green-800 shadow-sm' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => handleStatusChange(person.id, 'Half-day')}
                          className={`flex-1 md:flex-none px-6 py-2 rounded-md font-medium text-sm transition-colors border ${status === 'Half-day' ? 'bg-yellow-100 border-yellow-500 text-yellow-800 shadow-sm' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                        >
                          Half-day
                        </button>
                        <button
                          onClick={() => handleStatusChange(person.id, 'Absent')}
                          className={`flex-1 md:flex-none px-6 py-2 rounded-md font-medium text-sm transition-colors border ${status === 'Absent' ? 'bg-red-100 border-red-500 text-red-800 shadow-sm' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                        >
                          Absent
                        </button>
                      </div>
                    </div>

                    {/* What they actually earned that day. Pre-filled from their
                        usual rate, but changeable - site pay varies. */}
                    {worked && (
                      <div className="mt-3 ml-0 md:ml-14 flex flex-wrap items-end gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Wage for this day (₹)</label>
                          <input
                            type="number"
                            min="0"
                            defaultValue={record?.wagesEarned ?? ''}
                            key={`w-${person.id}-${selectedDate}-${record?.wagesEarned}`}
                            onBlur={e => handleAmountChange(person.id, 'wagesEarned', e.target.value)}
                            className="w-32 border border-gray-300 rounded p-1.5 text-sm"
                            placeholder={person.dailyWage ? String(person.dailyWage) : 'No rate set'}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Overtime (₹)</label>
                          <input
                            type="number"
                            min="0"
                            defaultValue={record?.overtimeAmount ?? ''}
                            key={`o-${person.id}-${selectedDate}-${record?.overtimeAmount}`}
                            onBlur={e => handleAmountChange(person.id, 'overtimeAmount', e.target.value)}
                            className="w-28 border border-gray-300 rounded p-1.5 text-sm"
                            placeholder="0"
                          />
                        </div>
                        <div className="text-sm text-gray-600 pb-2">
                          Total: <strong className="text-gray-900">
                            ₹{((record?.wagesEarned || 0) + (record?.overtimeAmount || 0)).toLocaleString('en-IN')}
                          </strong>
                        </div>
                        {!person.dailyWage && !record?.wagesEarned && (
                          <span className="flex items-center gap-1 text-xs text-amber-700 pb-2">
                            <AlertTriangle className="w-3.5 h-3.5" /> No usual rate — type the amount
                          </span>
                        )}

                        <div className="pb-1 flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => { setAdvanceTarget({ id: person.id, name: person.name }); setAdvanceAmount(''); }}
                            className="px-2.5 py-1.5 text-xs font-medium border border-amber-300 text-amber-800 bg-amber-50 rounded hover:bg-amber-100"
                            title="Cash given to this person today — reduces what's owed at settle-up"
                          >
                            + Advance
                          </button>
                          {advancesToday
                            .filter(p => p.workforceId === person.id)
                            .map(p => (
                              <span key={p.id} className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                ₹{p.amount.toLocaleString('en-IN')} advance given
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input 
                type="date" 
                value={format(startDate, 'yyyy-MM-dd')}
                onChange={e => setStartDate(startOfDay(new Date(e.target.value)).getTime())}
                className="w-full border border-gray-300 rounded p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input 
                type="date" 
                value={format(endDate, 'yyyy-MM-dd')}
                onChange={e => setEndDate(startOfDay(new Date(e.target.value)).getTime())}
                className="w-full border border-gray-300 rounded p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Workforce Type</label>
              <select 
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as any)}
                className="w-full border border-gray-300 rounded p-2 text-sm"
              >
                <option value="All">All Types</option>
                <option value="Coolie">Coolie</option>
                <option value="Permanent Employee">Permanent Employee</option>
                <option value="Site Staff">Site Staff</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select 
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="w-full border border-gray-300 rounded p-2 text-sm"
              >
                <option value="All">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Half-day">Half-day</option>
                <option value="Absent">Absent</option>
              </select>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type / Trade</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wages (₹)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-3 sm:px-6 py-4 text-center text-sm text-gray-500">Loading history...</td>
                  </tr>
                ) : filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 sm:px-6 py-4 text-center text-sm text-gray-500">No attendance records found for this period.</td>
                  </tr>
                ) : (
                  filteredHistory.map(record => {
                    const person = workforce.find(w => w.id === record.workforceId);
                    if (!person) return null;
                    return (
                      <tr key={record.id} className="hover:bg-slate-50">
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(record.date, 'MMM do, yyyy')}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {person.name}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {person.type} • {person.trade}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            record.status === 'Present' ? 'bg-green-100 text-green-800' : 
                            record.status === 'Half-day' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {/* Total for the day, so an edited amount or added
                              overtime is actually visible here. */}
                          {(() => {
                            const wage = record.wagesEarned || 0;
                            const ot = record.overtimeAmount || 0;
                            if (wage + ot === 0) return <span className="text-gray-400">—</span>;
                            return (
                              <>
                                <span className="font-medium">₹{(wage + ot).toLocaleString('en-IN')}</span>
                                {ot > 0 && (
                                  <span className="block text-xs text-amber-700">
                                    ₹{wage.toLocaleString('en-IN')} + ₹{ot.toLocaleString('en-IN')} OT
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Give an advance */}
      {advanceTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-sm shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Advance to {advanceTarget.name}</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Cash given on {format(selectedDate, 'dd MMM yyyy')} — this reduces what they're owed at settle-up.
              </p>
            </div>
            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
              <input
                type="number" min="0" autoFocus
                value={advanceAmount}
                onChange={e => setAdvanceAmount(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 text-lg font-semibold"
                placeholder="e.g. 500"
              />
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setAdvanceTarget(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGiveAdvance}
                disabled={savingAdvance}
                className="px-4 py-2 bg-amber-600 text-white rounded-md text-sm font-medium hover:bg-amber-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {savingAdvance && <Loader2 className="w-4 h-4 animate-spin" />}
                Record Advance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
