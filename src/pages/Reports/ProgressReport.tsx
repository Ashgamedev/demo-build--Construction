import { useProjectStore } from '../../store/projectStore';
import { useStageStore } from '../../store/stageStore';
import { useReportStore } from '../../store/reportStore';
import { useMemo, useState } from 'react';
import { BarChart, CheckCircle2, Clock, Save } from 'lucide-react';
import { currentActor } from '../../lib/audit';

export function ProgressReport() {
  const { projects } = useProjectStore();
  const { stages } = useStageStore();
  const { saveReport } = useReportStore();
  
  const [isSaving, setIsSaving] = useState(false);

  const reportData = useMemo(() => {
    return projects.map(p => {
      const projectStages = stages[p.id] || [];
      const totalStages = projectStages.length;
      const completedStages = projectStages.filter(s => s.status === 'Completed').length;
      const progressPercent = totalStages > 0 ? (completedStages / totalStages) * 100 : 0;
      
      const inProgressStages = projectStages.filter(s => s.status === 'In Progress');
      
      return {
        ...p,
        totalStages,
        completedStages,
        progressPercent,
        currentStage: inProgressStages[0]?.name || 'N/A'
      };
    });
  }, [projects, stages]);

  const activeProjects = reportData.filter(p => p.status !== 'Completed' && p.status !== 'Cancelled');

  const handleSaveReport = async () => {
    setIsSaving(true);
    try {
      await saveReport({
        title: `Project Progress Report`,
        type: 'Progress',
        dateRange: 'Active Projects',
        data: {
          activeProjects
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Project Progress Tracking</h2>
          <p className="text-gray-600 text-sm">Overview of active project stages and completion status.</p>
        </div>
        <button 
          onClick={handleSaveReport}
          disabled={isSaving}
          className="flex items-center text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md font-medium transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4 mr-1.5" /> {isSaving ? 'Saving...' : 'Save Report'}
        </button>
      </div>

      <div className="space-y-6">
        {activeProjects.map(project => (
          <div key={project.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg text-gray-900">{project.title}</h3>
                <p className="text-sm text-gray-500 flex items-center mt-1">
                  <BarChart className="w-4 h-4 mr-1" />
                  Currently at: <span className="font-medium text-gray-800 ml-1">{project.currentStage}</span>
                </p>
              </div>
              
              <div className="mt-4 md:mt-0 text-right">
                <div className="text-sm font-medium text-blue-700 mb-1">
                  {project.completedStages} of {project.totalStages} Stages Completed
                </div>
                <div className="flex items-center justify-end">
                  <span className="text-2xl font-bold text-gray-900 mr-2">{project.progressPercent.toFixed(0)}%</span>
                  <span className="text-gray-500 text-xs">Done</span>
                </div>
              </div>
            </div>

            <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-1000" 
                style={{ width: `${project.progressPercent}%` }}
              />
            </div>
            
            {project.totalStages > 0 && (
              <div className="flex text-xs justify-between text-gray-400 font-medium px-1">
                <span>Start</span>
                <span>Finish</span>
              </div>
            )}

            {project.totalStages === 0 && (
              <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded mt-3 inline-flex items-center">
                <Clock className="w-4 h-4 mr-1.5" /> No stages defined yet
              </p>
            )}
          </div>
        ))}

        {activeProjects.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No Active Projects</h3>
            <p className="text-gray-500 mt-1">There are currently no active projects to track.</p>
          </div>
        )}
      </div>
    </div>
  );
}
