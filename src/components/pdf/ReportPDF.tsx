import { forwardRef } from 'react';
import { format } from 'date-fns';
import { SavedReport } from '../../types';

interface Props {
  report: SavedReport;
}

export const ReportPDF = forwardRef<HTMLDivElement, Props>(({ report }, ref) => {
  const { type, data, title, dateRange, createdAt, createdBy } = report;

  return (
    <div ref={ref} className="bg-white p-10 max-w-4xl mx-auto text-sm print:p-0 print:m-0" style={{ minHeight: '297mm' }}>
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">DEEPTHI CONSTRUCTION</h1>
          <p className="text-gray-500">Official Report Document</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-blue-800">{title}</h2>
          <p className="text-gray-600 mt-1">Generated: {format(createdAt, 'dd MMM yyyy, p')}</p>
          <p className="text-gray-600">Range: {dateRange}</p>
        </div>
      </div>

      {/* Finance Report Content */}
      {type === 'Finance' && (
        <div className="space-y-8">
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-gray-500 mb-1">Total Inflow</p>
              <h3 className="text-xl font-bold text-green-700">₹{data.totalInflow?.toLocaleString('en-IN') || 0}</h3>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-gray-500 mb-1">Total Outflow</p>
              <h3 className="text-xl font-bold text-red-700">₹{data.totalOutflow?.toLocaleString('en-IN') || 0}</h3>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-gray-500 mb-1">Net Position</p>
              <h3 className={`text-xl font-bold ${data.pnl >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                ₹{Math.abs(data.pnl || 0).toLocaleString('en-IN')}
                <span className="text-sm font-normal ml-2">{data.pnl >= 0 ? '(Profit)' : '(Loss)'}</span>
              </h3>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">Expenses Breakdown</h3>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 border border-gray-300 font-semibold text-gray-700">Category</th>
                  <th className="p-3 border border-gray-300 font-semibold text-gray-700 text-right">Amount (₹)</th>
                  <th className="p-3 border border-gray-300 font-semibold text-gray-700 text-right">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.expensesByCategory || {})
                  .sort((a: any, b: any) => b[1] - a[1])
                  .map(([cat, amt]: [string, any]) => {
                    const percent = data.totalOutflow > 0 ? (amt / data.totalOutflow) * 100 : 0;
                    return (
                      <tr key={cat}>
                        <td className="p-3 border border-gray-300">{cat}</td>
                        <td className="p-3 border border-gray-300 text-right">{amt.toLocaleString('en-IN')}</td>
                        <td className="p-3 border border-gray-300 text-right">{percent.toFixed(1)}%</td>
                      </tr>
                    );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Progress Report Content */}
      {type === 'Progress' && (
        <div className="space-y-6">
          <h3 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">Active Projects Status</h3>
          
          {data.activeProjects?.map((project: any) => (
            <div key={project.id} className="border border-gray-200 p-4 rounded-lg mb-4 page-break-inside-avoid">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-bold text-lg">{project.title}</h4>
                  <p className="text-gray-600">Current Stage: {project.currentStage}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-2xl text-blue-700">{project.progressPercent?.toFixed(0) || 0}%</span>
                  <p className="text-sm text-gray-500">{project.completedStages} / {project.totalStages} Stages</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${project.progressPercent || 0}%` }}
                />
              </div>
            </div>
          ))}
          {(!data.activeProjects || data.activeProjects.length === 0) && (
            <p className="text-gray-500">No active projects to report.</p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-16 pt-8 border-t border-gray-200 text-center text-gray-500 text-xs">
        <p>This is a system-generated report. Deepthi Construction CRM.</p>
        <p>Generated by: {createdBy}</p>
      </div>
    </div>
  );
});
