import { useState, useEffect } from 'react';
import { Menu, LogOut, Bell, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { useNotificationStore } from '../store/notificationStore';
import { format } from 'date-fns';

/**
 * notifications.createdAt is written with Firestore's serverTimestamp(),
 * which the client SDK hands back as a Firestore Timestamp object (or briefly
 * null, before the server has assigned a value) - never a plain Date or
 * number. date-fns's format() can't parse either of those directly and
 * throws "Invalid time value", which crashes the whole app since nothing
 * here has an error boundary. This normalizes both cases to a real Date.
 */
function toDisplayDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'object' && typeof (value as any).toDate === 'function') {
    return (value as any).toDate();
  }
  return null;
}

export function Header() {
  const { user, logout } = useAuthStore();
  const { toggleSidebar } = useUIStore();
  const { notifications, subscribeNotifications, markAsRead, markAllAsRead } = useNotificationStore();
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const unsub = subscribeNotifications();
    return () => unsub();
  }, [subscribeNotifications]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shadow-sm z-30 relative">
      <div className="flex items-center md:hidden">
        <button onClick={toggleSidebar} className="text-gray-500 hover:text-gray-700 p-2 -ml-2">
          <Menu className="h-6 w-6" />
        </button>
        <div className="ml-2 flex items-center">
          <img src="/images/logo-mark-transparent.png" alt="Logo" className="h-10 w-10 object-contain mr-2 rounded" />
          <span className="font-bold text-gray-900 text-lg tracking-tight">DEEPTHI CONST.</span>
        </div>
      </div>
      <div className="hidden md:flex items-center">
        <img src="/images/logo-mark-transparent.png" alt="Logo" className="h-14 w-14 object-contain mr-3 rounded" />
        <span className="font-semibold text-gray-800 text-xl tracking-wide">Deepthi Construction CRM</span>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="text-sm text-right hidden sm:block mr-2">
          <div className="font-medium text-gray-900">{user?.name}</div>
          <div className="text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</div>
        </div>
        
        {/* Notification Bell */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors relative"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>
          
          {/* Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-gray-200 flex justify-between items-center">
                <span className="font-semibold text-gray-800">Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Mark all read</button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">No notifications</div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      className={`p-3 border-b border-gray-100 hover:bg-slate-50 transition-colors cursor-pointer ${!n.isRead ? 'bg-blue-50/50' : ''}`}
                      onClick={() => !n.isRead && markAsRead(n.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="mt-0.5">
                          {n.type === 'Payment Due' && <AlertCircle className="w-4 h-4 text-red-500" />}
                          {n.type === 'Milestone Completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                          {n.type === 'Work Pending' && <Clock className="w-4 h-4 text-orange-500" />}
                          {n.type === 'System' && <Bell className="w-4 h-4 text-blue-500" />}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm ${!n.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {(() => {
                              const d = toDisplayDate(n.createdAt);
                              return d ? format(d, 'MMM d, h:mm a') : 'Just now';
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Separator */}
        <div className="h-6 w-px bg-gray-200"></div>
        <button
          onClick={() => logout()}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
