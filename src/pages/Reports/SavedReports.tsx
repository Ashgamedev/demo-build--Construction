import { useEffect, useState, useRef } from 'react';
import { useReportStore } from '../../store/reportStore';
import { FileText, Download, Trash2, Calendar, Printer, X } from 'lucide-react';
import { format } from 'date-fns';
import { ReportPDF } from '../../components/pdf/ReportPDF';

export function SavedReports() {
  const { reports, loading, subscribeReports, deleteReport } = useReportStore();
  const [printingReport, setPrintingReport] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeReports();
    return () => unsub();
  }, [subscribeReports]);

  const handleDownloadJSON = (report: any) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report.data, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", `${report.title.replace(/\s+/g, '_').toLowerCase()}_${format(report.createdAt, 'yyyy-MM-dd')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading saved reports...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 print:hidden">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Saved Reports</h2>
        <p className="text-gray-600 text-sm">Access previously generated financial and progress report snapshots.</p>
      </div>

      {printingReport && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto print:static print:bg-transparent print:z-auto print:overflow-visible">
          <div className="p-4 bg-gray-100 flex justify-between items-center border-b border-gray-300 print:hidden sticky top-0 shadow-sm z-10">
            <h3 className="font-bold text-gray-800">Print Preview: {printingReport.title}</h3>
            <div className="flex space-x-3">
              <button 
                onClick={handlePrint}
                className="bg-blue-600 text-white px-4 py-2 rounded flex items-center text-sm font-medium hover:bg-blue-700"
              >
                <Printer className="w-4 h-4 mr-2" /> Print / Save as PDF
              </button>
              <button 
                onClick={() => setPrintingReport(null)}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded flex items-center text-sm font-medium hover:bg-gray-400"
              >
                <X className="w-4 h-4 mr-2" /> Close Preview
              </button>
            </div>
          </div>
          <div className="bg-gray-200 py-8 print:py-0 print:bg-white min-h-screen">
            <ReportPDF ref={printRef} report={printingReport} />
          </div>
        </div>
      )}

      {!printingReport && reports.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-300 print:hidden">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No Reports Saved</h3>
          <p className="text-gray-500 mt-1">Generate and save a report to see it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:hidden">
          {reports.map((report) => (
            <div key={report.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-lg ${report.type === 'Finance' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => setPrintingReport(report)}
                    className="text-gray-500 hover:text-blue-600 p-1"
                    title="Print / PDF"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      if(confirm('Delete this saved report?')) deleteReport(report.id);
                    }}
                    className="text-gray-400 hover:text-red-500 p-1"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <h3 className="font-semibold text-gray-900 text-lg mb-1">{report.title}</h3>
              <p className="text-sm text-gray-500 mb-4 flex-1">
                {report.type} Report • {report.dateRange}
              </p>
              
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5 mr-1" />
                  {format(report.createdAt, 'MMM dd, yyyy')}
                </div>
                <button 
                  onClick={() => handleDownloadJSON(report)}
                  className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  <Download className="w-4 h-4 mr-1" /> Raw Data
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
