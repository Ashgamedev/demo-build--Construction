import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../store/projectStore';
import { useCustomerStore } from '../../store/customerStore';
import { Plus, Search, Briefcase, Edit2 } from 'lucide-react';
import { ProjectModal } from './ProjectModal';
import { Project } from '../../types';

export function ProjectList() {
  const navigate = useNavigate();
  const { projects, loading, error, subscribeProjects } = useProjectStore();
  const { customers, subscribe: subscribeCustomers } = useCustomerStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  
  // Date Filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    const unsubscribeProj = subscribeProjects();
    const unsubscribeCust = subscribeCustomers();
    return () => {
      unsubscribeProj();
      unsubscribeCust();
    };
  }, [subscribeProjects, subscribeCustomers]);

  const startTs = startDate ? new Date(startDate).getTime() : 0;
  const endTs = endDate ? new Date(endDate).getTime() + 86399999 : Infinity;

  const filteredProjects = projects.filter(p => {
    let projectTs = 0;
    if (p.createdAt) {
      if (typeof p.createdAt === 'object' && 'toMillis' in p.createdAt) {
        projectTs = (p.createdAt as any).toMillis();
      } else if (typeof p.createdAt === 'object' && 'seconds' in p.createdAt) {
        projectTs = (p.createdAt as any).seconds * 1000;
      } else if (typeof p.createdAt === 'number') {
        projectTs = p.createdAt;
      }
    }

    const matchesSearch = p.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.siteAddress?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = projectTs >= startTs && projectTs <= endTs;
    
    return matchesSearch && matchesDate;
  });

  const openNewProjectModal = () => {
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  if (loading) return <div className="p-8">Loading projects...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
        <button 
          onClick={openNewProjectModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" /> New Project
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-end space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1 max-w-sm relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
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
              onClick={() => { setStartDate(''); setEndDate(''); setSearchTerm(''); }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Title</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProjects.map(project => {
                const customer = customers.find(c => c.id === project.customerId);
                return (
                  <tr 
                    key={project.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Briefcase className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{project.title}</div>
                          <div className="text-sm text-gray-500 max-w-[150px] truncate">{project.siteAddress}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{customer ? customer.name : <span className="text-red-500 text-xs font-semibold">Missing</span>}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{project.type}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        project.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        project.status === 'Planning' ? 'bg-yellow-100 text-yellow-800' :
                        project.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="w-full bg-gray-200 rounded-full h-2.5 max-w-[100px]">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${project.progressPercentage || 0}%` }}></div>
                      </div>
                      <span className="text-xs text-gray-500 mt-1">{project.progressPercentage || 0}%</span>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      ₹{project.agreedValue?.toLocaleString('en-IN') || 0}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        className="text-gray-400 hover:text-blue-600 p-2"
                        onClick={(e) => { e.stopPropagation(); openEditModal(project); }}
                        title="Edit Project"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 sm:px-6 py-8 text-center text-gray-500">
                    No projects found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {isModalOpen && (
        <ProjectModal 
          projectToEdit={editingProject} 
          onClose={() => {
            setIsModalOpen(false);
            setEditingProject(null);
          }} 
        />
      )}
    </div>
  );
}
