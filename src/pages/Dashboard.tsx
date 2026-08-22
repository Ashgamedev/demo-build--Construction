import { useEffect } from 'react';
import { useFinanceStore } from '../store/financeStore';
import { useProjectStore } from '../store/projectStore';
import { useLeadStore } from '../store/leadStore';
import { IndianRupee, Users, Briefcase, FileText, Bell, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotificationStore } from '../store/notificationStore';
import { format } from 'date-fns';

export function Dashboard() {
  const { expenses, payments, loading: financeLoading, subscribeFinance } = useFinanceStore();
  const { projects, loading: projLoading, subscribeProjects } = useProjectStore();
  const { leads, loading: leadsLoading, subscribe } = useLeadStore();
  const { notifications, loading: notifLoading, subscribeNotifications } = useNotificationStore();

  useEffect(() => {
    const unsubFinance = subscribeFinance();
    const unsubProj = subscribeProjects();
    const unsubLeads = subscribe();
    const unsubNotif = subscribeNotifications();
    return () => {
      unsubFinance();
      unsubProj();
      unsubLeads();
      unsubNotif();
    };
  }, [subscribeFinance, subscribeProjects, subscribe, subscribeNotifications]);

  if (financeLoading || projLoading || leadsLoading || notifLoading) return <div>Loading dashboard...</div>;

  const activeProjects = projects.filter(p => p.status === 'In Progress').length;
  const newLeads = leads.filter(l => l.status === 'New' || l.status === 'Contacted').length;
  
  const contractedValue = projects.reduce((acc, p) => acc + (p.agreedValue || 0), 0);
  const collected = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const pending = contractedValue - collected;
  
  const dashboardAlerts = notifications.filter(n => !n.isRead).slice(0, 5); // top 5 unread

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link to="/finance" className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center hover:shadow-md transition-shadow">
          <div className="p-4 bg-green-50 text-green-600 rounded-full mr-4"><IndianRupee className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Amount Collected</p>
            <h3 className="text-2xl font-bold text-gray-900">₹{collected.toLocaleString('en-IN')}</h3>
          </div>
        </Link>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="p-4 bg-orange-50 text-orange-600 rounded-full mr-4"><FileText className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Amount Pending</p>
            <h3 className="text-2xl font-bold text-gray-900">₹{pending.toLocaleString('en-IN')}</h3>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-full mr-4"><Briefcase className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Overall Contract Revenue</p>
            <h3 className="text-2xl font-bold text-gray-900">₹{contractedValue.toLocaleString('en-IN')}</h3>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/projects" className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center hover:shadow-md transition-shadow">
          <div className="p-4 bg-purple-50 text-purple-600 rounded-full mr-4"><Briefcase className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Active Projects</p>
            <h3 className="text-2xl font-bold text-gray-900">{activeProjects}</h3>
          </div>
        </Link>
        
        <Link to="/leads" className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center hover:shadow-md transition-shadow">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full mr-4"><Users className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">New Leads</p>
            <h3 className="text-2xl font-bold text-gray-900">{newLeads}</h3>
          </div>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link to="/leads" className="p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors flex items-center justify-center text-blue-700 font-medium">Add New Lead</Link>
            <Link to="/quotations/new" className="p-4 border rounded-lg hover:bg-green-50 hover:border-green-200 transition-colors flex items-center justify-center text-green-700 font-medium">Create Quotation</Link>
            <Link to="/finance" className="p-4 border rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors flex items-center justify-center text-red-700 font-medium">Record Expense</Link>
            <Link to="/finance" className="p-4 border rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-colors flex items-center justify-center text-indigo-700 font-medium">Record Payment</Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <Bell className="w-5 h-5 mr-2 text-blue-600" />
              Action Needed & Alerts
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3">
            {dashboardAlerts.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-500 italic">
                You're all caught up! No pending alerts.
              </div>
            ) : (
              dashboardAlerts.map(alert => (
                <div key={alert.id} className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg flex items-start space-x-3">
                  <div className="mt-0.5">
                    {alert.type === 'Payment Due' && <AlertCircle className="w-4 h-4 text-red-500" />}
                    {alert.type === 'Milestone Completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {alert.type === 'Work Pending' && <Clock className="w-4 h-4 text-orange-500" />}
                    {alert.type === 'System' && <Bell className="w-4 h-4 text-blue-500" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{alert.title}</h4>
                    <p className="text-xs text-gray-600 mt-1">{alert.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
