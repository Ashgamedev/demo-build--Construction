import { useFinanceStore } from '../../store/financeStore';
import { useProjectStore } from '../../store/projectStore';
import { useReportStore } from '../../store/reportStore';
import { useMemo, useState } from 'react';
import { Download, IndianRupee, TrendingDown, TrendingUp, Save } from 'lucide-react';
import { currentActor } from '../../lib/audit';

export function FinanceReport() {
  const { expenses, payments } = useFinanceStore();
  const { projects } = useProjectStore();
  const { saveReport } = useReportStore();
  
  const [dateRange, setDateRange] = useState('all'); // 'all', 'month', 'year'
  const [isSaving, setIsSaving] = useState(false);
  
  const { totalInflow, totalOutflow, pnl, expensesByCategory } = useMemo(() => {
    let filteredExpenses = expenses;
    let filteredPayments = payments;
    
    // Apply date filter logic if needed (simplifying for now)
    
    const inflow = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const outflow = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    const categories: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      categories[e.category] = (categories[e.category] || 0) + e.amount;
    });

    return {
      totalInflow: inflow,
      totalOutflow: outflow,
      pnl: inflow - outflow,
      expensesByCategory: categories
    };
  }, [expenses, payments, dateRange]);

  const handleExportCSV = () => {
    // Generate CSV for P&L
    let csv = 'Category,Amount\n';
    csv += `Total Inflow (Customer Payments),${totalInflow}\n`;
    csv += `Total Outflow (Expenses),${totalOutflow}\n`;
    csv += `Net Profit/Loss,${pnl}\n\n`;
    csv += 'Expense Breakdown\n';
    Object.entries(expensesByCategory).forEach(([cat, amt]) => {
      csv += `${cat},${amt}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleSaveReport = async () => {
    setIsSaving(true);
    try {
      await saveReport({
        title: `Financial Summary (${dateRange})`,
        type: 'Finance',
        dateRange,
        data: {
          totalInflow,
          totalOutflow,
          pnl,
          expensesByCategory
        },
        createdBy: currentActor().id
      });
      alert('Report saved successfully!');
    } catch (e: any) {
      alert('Failed to save report: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Financial Summary</h2>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          >
            <option value="all">All Time</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <button
            onClick={handleExportCSV}
            className="flex items-center text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap"
          >
            <Download className="w-4 h-4 mr-1.5" /> Export CSV
          </button>
          <button
            onClick={handleSaveReport}
            disabled={isSaving}
            className="flex items-center text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <Save className="w-4 h-4 mr-1.5" /> {isSaving ? 'Saving...' : 'Save Report'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <p className="text-green-700 text-sm font-medium mb-1">Total Inflow</p>
          <h3 className="text-2xl font-bold text-green-800 flex items-center">
            <IndianRupee className="w-5 h-5 mr-1" /> {totalInflow.toLocaleString('en-IN')}
          </h3>
          <p className="text-xs text-green-600 mt-2 flex items-center">
            <TrendingUp className="w-3 h-3 mr-1" /> All customer payments
          </p>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <p className="text-red-700 text-sm font-medium mb-1">Total Outflow</p>
          <h3 className="text-2xl font-bold text-red-800 flex items-center">
            <IndianRupee className="w-5 h-5 mr-1" /> {totalOutflow.toLocaleString('en-IN')}
          </h3>
          <p className="text-xs text-red-600 mt-2 flex items-center">
            <TrendingDown className="w-3 h-3 mr-1" /> All recorded expenses
          </p>
        </div>
        
        <div className={`${pnl >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'} border rounded-xl p-5`}>
          <p className={`${pnl >= 0 ? 'text-blue-700' : 'text-orange-700'} text-sm font-medium mb-1`}>Net Position</p>
          <h3 className={`text-2xl font-bold ${pnl >= 0 ? 'text-blue-800' : 'text-orange-800'} flex items-center`}>
            <IndianRupee className="w-5 h-5 mr-1" /> {Math.abs(pnl).toLocaleString('en-IN')}
          </h3>
          <p className={`text-xs ${pnl >= 0 ? 'text-blue-600' : 'text-orange-600'} mt-2`}>
            {pnl >= 0 ? 'Surplus (Profit)' : 'Deficit (Loss)'}
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">Expenses by Category</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4 max-w-2xl">
            {Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]).map(([category, amount]) => {
              const percentage = totalOutflow > 0 ? (amount / totalOutflow) * 100 : 0;
              return (
                <div key={category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{category}</span>
                    <span className="font-bold text-gray-900">₹{amount.toLocaleString('en-IN')} ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div 
                      className="bg-red-500 h-2.5 rounded-full" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
            {Object.keys(expensesByCategory).length === 0 && (
              <p className="text-gray-500 italic">No expenses recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
