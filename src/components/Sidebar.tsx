import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UserCircle, 
  FileText, 
  Briefcase, 
  HardHat, 
  IndianRupee, 
  Settings,
  FileSignature,
  X,
  BarChart,
  CalendarCheck,
  ShoppingCart,
  Globe,
  Wallet
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Leads', href: '/leads', icon: UserCircle },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Quotations', href: '/quotations', icon: FileText },
  { name: 'Agreements', href: '/agreements', icon: FileSignature },
  { name: 'Projects', href: '/projects', icon: Briefcase },
  { name: 'Case Studies', href: '/case-studies', icon: Globe },
  { name: 'Workforce', href: '/workforce', icon: HardHat },
  { name: 'Attendance', href: '/attendance', icon: CalendarCheck },
  { name: 'Purchases', href: '/purchases', icon: ShoppingCart },
  { name: 'Settlements', href: '/settlements', icon: Wallet },
  { name: 'Finance', href: '/finance', icon: IndianRupee },
  { name: 'Reports', href: '/reports', icon: BarChart },
  { name: 'Settings', href: '/settings', icon: Settings, ownerOnly: true },
];

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuthStore();
  const { isSidebarOpen, closeSidebar } = useUIStore();

  const navItems = navigation.filter(item => !item.ownerOnly || user?.role === 'owner');

  return (
    <>
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar Content */}
      <div className={clsx(
        'fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col',
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="h-16 flex items-center justify-between px-6 bg-slate-950">
          <div className="flex items-center space-x-3">
            {/* The sidebar is near-black and the mark's charcoal strokes would
                disappear against it, so this one keeps its white tile. */}
            <img
              src="/images/logo-mark.png"
              alt="Deepthi Construction"
              className="h-10 w-10 md:h-12 md:w-12 object-contain rounded-md bg-white p-0.5 shrink-0"
            />
            <span className="text-white font-bold text-xl tracking-tight">DEEPTHI CONST.</span>
          </div>
          <button onClick={closeSidebar} className="md:hidden text-gray-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-1 py-4 overflow-y-auto">
          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href || 
                               (item.href !== '/' && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => closeSidebar()}
                  className={clsx(
                    isActive ? 'bg-brand-600 text-white' : 'hover:bg-slate-800 hover:text-white',
                    'group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors'
                  )}
                >
                  <item.icon
                    className={clsx(
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-white',
                      'flex-shrink-0 -ml-1 mr-3 h-5 w-5'
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
