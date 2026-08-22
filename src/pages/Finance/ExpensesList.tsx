import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useFinanceStore } from '../../store/financeStore';
import { useProjectStore } from '../../store/projectStore';
import { ArrowLeft, Pencil, Trash2, Loader2, X, Check } from 'lucide-react';
import { format } from 'date-fns';
import { Expense } from '../../types';

const CATEGORIES = ['Materials', 'Labour/Contractor', 'Salary', 'Equipment', 'Fuel/Travel', 'Office', 'Other'];

export function ExpensesList() {
  const { expenses, subscribeFinance, updateExpense, deleteExpense } = useFinanceStore();
  const { projects, subscribeProjects } = useProjectStore();
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ description: string; amount: string; category: string; date: string }>({
    description: '', amount: '', category: '', date: '',
  });
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const unsubs = [subscribeFinance(), subscribeProjects()];
    return () => unsubs.forEach(u => u());
  }, [subscribeFinance, subscribeProjects]);

  const startTs = startDate ? new Date(startDate).getTime() : 0;
  const endTs = endDate ? new Date(endDate).getTime() + 86399999 : Infinity;
  const filteredExpenses = expenses.filter(e => e.date >= startTs && e.date <= endTs);

  const beginEdit = (e: Expense) => {
    setEditingId(e.id);
    setDraft({
      description: e.description,
      amount: String(e.amount),
      category: e.category,
      date: format(e.date, 'yyyy-MM-dd'),
    });
  };

  const saveEdit = async (id: string) => {
    const amount = Number(draft.amount);
    if (!amount || amount <= 0) return alert('Enter a valid amount');
    if (!draft.description.trim()) return alert('Description is required');

    setBusyId(id);
    try {
      await updateExpense(id, {
        description: draft.description.trim(),
        amount,
        category: draft.category,
        date: new Date(draft.date).getTime(),
      });
      setEditingId(null);
    } catch (err: any) {
      alert('Failed to save: ' + err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (e: Expense) => {
    if (!confirm(
      `Delete this expense permanently?\n\n${e.description}\n₹${e.amount.toLocaleString('en-IN')} — ${e.payeeName}\n\nThis cannot be undone.`
    )) return;

    setBusyId(e.id);
    try {
      await deleteExpense(e.id);
    } catch (err: any) {
      alert('Failed to delete: ' + err.message);
    } finally {
      setBusyId(null);
    }
  };

  const cell = 'w-full border border-gray-300 rounded p-1.5 text-sm';

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center space-x-4">
        <Link to="/finance" className="p-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">Expenses History</h1>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-end space-x-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="pb-1">
          <button
            onClick={() => { setStartDate(''); setEndDate(''); }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 flex flex-col">
        <div className="p-0 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left font-medium text-gray-500">Date</th>
                <th className="px-3 sm:px-6 py-3 text-left font-medium text-gray-500">Category</th>
                <th className="px-3 sm:px-6 py-3 text-left font-medium text-gray-500">Description</th>
                <th className="px-3 sm:px-6 py-3 text-left font-medium text-gray-500">Paid To</th>
                <th className="px-3 sm:px-6 py-3 text-left font-medium text-gray-500">Project</th>
                <th className="px-3 sm:px-6 py-3 text-right font-medium text-gray-500">Amount</th>
                <th className="px-3 sm:px-6 py-3 text-right font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredExpenses.map(e => {
                const isEditing = editingId === e.id;
                const busy = busyId === e.id;
                const project = projects.find(p => p.id === e.projectId);

                return (
                  <tr key={e.id} className={isEditing ? 'bg-blue-50' : ''}>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-gray-500">
                      {isEditing ? (
                        <input type="date" value={draft.date} onChange={ev => setDraft(d => ({ ...d, date: ev.target.value }))} className={cell} />
                      ) : format(e.date, 'dd MMM yyyy')}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      {isEditing ? (
                        <select value={draft.category} onChange={ev => setDraft(d => ({ ...d, category: ev.target.value }))} className={cell}>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          {!CATEGORIES.includes(draft.category) && <option value={draft.category}>{draft.category}</option>}
                        </select>
                      ) : <span className="px-2 py-1 bg-gray-100 rounded text-xs">{e.category}</span>}
                    </td>
                    <td className="px-3 sm:px-6 py-4 max-w-[200px]">
                      {isEditing ? (
                        <input value={draft.description} onChange={ev => setDraft(d => ({ ...d, description: ev.target.value }))} className={cell} />
                      ) : <span className="block truncate" title={e.description}>{e.description}</span>}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-gray-600 max-w-[140px] truncate" title={e.payeeName}>
                      {e.payeeName || '—'}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-gray-500 max-w-[140px] truncate" title={project?.title}>
                      {project?.title || <span className="text-gray-300">General</span>}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-red-600 font-bold">
                      {isEditing ? (
                        <input type="number" min="0" value={draft.amount} onChange={ev => setDraft(d => ({ ...d, amount: ev.target.value }))} className={`${cell} text-right`} />
                      ) : `-₹${e.amount.toLocaleString('en-IN')}`}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right">
                      {busy ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400 inline" />
                      ) : isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => saveEdit(e.id)} className="text-green-600 hover:text-green-800" title="Save changes">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600" title="Cancel">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-3">
                          <button onClick={() => beginEdit(e)} className="text-blue-600 hover:text-blue-800" title="Correct this expense">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(e)} className="text-red-500 hover:text-red-700" title="Delete this expense">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredExpenses.length === 0 && <tr><td colSpan={7} className="px-3 sm:px-6 py-4 text-center text-gray-500">No expenses found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
