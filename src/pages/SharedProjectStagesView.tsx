import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Project, ProjectStage } from '../types';
import { Clock, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export function SharedProjectStagesView() {
  const { projectId } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [stages, setStages] = useState<ProjectStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!projectId) return;
      try {
        const projRef = doc(db, 'projects', projectId);
        const projSnap = await getDoc(projRef);
        if (!projSnap.exists()) {
          setError('Project not found');
          return;
        }
        setProject({ id: projSnap.id, ...projSnap.data() } as Project);

        const q = query(collection(db, `projects/${projectId}/stages`), orderBy('order', 'asc'));
        const stagesSnap = await getDocs(q);
        const fetchedStages = stagesSnap.docs.map(d => ({ id: d.id, ...d.data() }) as ProjectStage);
        setStages(fetchedStages);
      } catch (err: any) {
        console.error(err);
        setError('Failed to load project progress. Ensure you have the correct link.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Unavailable</h1>
        <p className="text-gray-500">{error || 'This link is invalid or has expired.'}</p>
      </div>
    );
  }

  const toDateString = (timestamp?: number) => {
    if (!timestamp) return 'TBD';
    return format(new Date(timestamp), 'MMM d, yyyy');
  };

  const getStageMetrics = (stage: any) => {
    if (!stage.tasks || stage.tasks.length === 0) {
      return {
        progressPercentage: stage.progressPercentage || 0,
        status: stage.status || 'Pending'
      };
    }
    const completedTasks = stage.tasks.filter((t: any) => t.status === 'Completed').length;
    const avgProgress = Math.round(stage.tasks.reduce((sum: number, t: any) => sum + t.progressPercentage, 0) / stage.tasks.length);
    const status = completedTasks === stage.tasks.length ? 'Completed' : (avgProgress > 0 ? 'In Progress' : 'Pending');
    return { progressPercentage: avgProgress, status };
  };

  const totalStages = stages.length;
  let overallProgress = 0;
  if (totalStages > 0) {
    overallProgress = Math.round(stages.reduce((sum, stage) => sum + getStageMetrics(stage).progressPercentage, 0) / totalStages);
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{project.title}</h1>
          <p className="text-gray-500 text-lg mb-6">Project Progress Tracker</p>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 max-w-2xl mx-auto">
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="font-semibold text-gray-700">Overall Completion</span>
              <span className="font-bold text-blue-600 text-lg">{overallProgress}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className="bg-blue-600 h-3 rounded-full transition-all duration-500" style={{ width: `${overallProgress}%` }}></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-10">
          <h2 className="text-xl font-bold text-gray-900 mb-10 border-b border-gray-100 pb-4 text-center">Project Timeline</h2>
          
          {stages.length === 0 ? (
            <p className="text-gray-500 text-center italic py-8">No stages tracked for this project yet.</p>
          ) : (
            <div className="relative py-8">
              {/* Continuous Timeline Line */}
              <div className="absolute inset-0 ml-5 -translate-x-px md:mx-auto md:translate-x-0 w-0.5 bg-gradient-to-b from-transparent via-slate-300 to-transparent pointer-events-none"></div>
              
              <div className="space-y-12">
                {stages.map((stage) => (
                  <div key={stage.id} className="relative z-10 w-full">
                    
                    {/* Stage Top Banner (Name & Start Date) */}
                    <div className="flex justify-center mb-8">
                      <div className="bg-white px-6 py-2.5 rounded-full border border-blue-100 shadow-sm flex flex-col items-center">
                        <h3 className="font-bold text-gray-900 text-lg">{stage.name}</h3>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <span className="mr-2 font-medium text-blue-600">START:</span>
                          <span>{toDateString(stage.startDate)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Tasks Timeline */}
                    <div className="space-y-6">
                      {(!stage.tasks || stage.tasks.length === 0) ? (
                        <div className="text-center text-gray-400 py-4 italic text-sm">
                          No tasks tracked for this stage.
                        </div>
                      ) : (
                        stage.tasks.map((task) => {
                          const isExpanded = expandedTaskId === task.id;
                          const isCompleted = task.status === 'Completed';
                          const isInProgress = task.status === 'In Progress';
                          
                          return (
                            <div key={task.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                              {/* Timeline Icon */}
                              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white shadow shrink-0 z-10 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${isCompleted ? 'bg-green-500' : isInProgress ? 'bg-blue-500' : 'bg-slate-300'}`}>
                                {isCompleted ? <Check className="w-5 h-5 text-white" /> : <Clock className="w-5 h-5 text-white" />}
                              </div>
                              
                              {/* Task Card */}
                              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1 cursor-pointer" onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-gray-400">
                                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                      </span>
                                      <h4 className="font-semibold text-gray-900 text-base">{task.name}</h4>
                                      <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${isCompleted ? 'bg-green-100 text-green-800' : isInProgress ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {task.status}
                                      </span>
                                    </div>
                                    <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                      <div className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${task.progressPercentage}%` }}></div>
                                    </div>
                                  </div>
                                </div>

                                {/* Task Expanded Read-Only View */}
                                {isExpanded && (
                                  <div className="mt-5 pt-4 border-t border-gray-100">
                                    <div className="space-y-3">
                                      <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Work Logs</h5>
                                      {task.workLogs?.map((log) => (
                                        <div key={log.id} className="bg-gray-50 p-3 rounded-lg text-sm border border-gray-100">
                                          <p className="text-gray-400 text-xs mb-1 font-medium">{format(log.date, 'MMM d, yyyy')}</p>
                                          <p className="text-gray-800">{log.text}</p>
                                        </div>
                                      ))}
                                      {(!task.workLogs || task.workLogs.length === 0) && (
                                        <p className="text-xs text-gray-400 italic">No logs available.</p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Stage Bottom Banner (End Date) */}
                    <div className="flex justify-center mt-6 mb-12">
                      <div className="bg-white px-5 py-1.5 rounded-full border border-gray-200 shadow-sm flex items-center">
                        <span className="text-xs text-gray-500 mr-2 font-medium">TARGET END:</span>
                        <span className="text-xs text-gray-700">{toDateString(stage.endDate)}</span>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
