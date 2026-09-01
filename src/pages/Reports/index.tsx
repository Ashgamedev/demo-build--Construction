import { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { PieChart, Activity, Save } from 'lucide-react';
import { FinanceReport } from './FinanceReport';
import { ProgressReport } from './ProgressReport';
import { SavedReports } from './SavedReports';

export function Reports() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports &amp; Analytics</h1>
        <p className="text-gray-500">Financial summaries and project progress reports.</p>
      </div>

      {/* Tab bar scrolls horizontally on a phone if the labels won't fit, so
          the active tab stays reachable without hiding the others behind an
          overflow menu. */}
      <div className="flex border-b border-gray-200 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <button
          onClick={() => navigate('/reports')}
          className={`px-4 py-2 font-medium text-sm border-b-2 flex items-center whitespace-nowrap ${currentPath === '/reports' || currentPath === '/reports/' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <PieChart className="w-4 h-4 mr-2" /> Financial Overview
        </button>
        <button
          onClick={() => navigate('/reports/progress')}
          className={`px-4 py-2 font-medium text-sm border-b-2 flex items-center whitespace-nowrap ${currentPath.includes('/progress') ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Activity className="w-4 h-4 mr-2" /> Project Progress
        </button>
        <button
          onClick={() => navigate('/reports/saved')}
          className={`px-4 py-2 font-medium text-sm border-b-2 flex items-center whitespace-nowrap ${currentPath.includes('/saved') ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Save className="w-4 h-4 mr-2" /> Saved Reports
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[500px]">
        <Routes>
          <Route path="/" element={<FinanceReport />} />
          <Route path="/progress" element={<ProgressReport />} />
          <Route path="/saved" element={<SavedReports />} />
        </Routes>
      </div>
    </div>
  );
}
