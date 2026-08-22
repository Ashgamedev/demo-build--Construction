import { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useBillStore } from '../store/billStore';
import { useNotificationStore } from '../store/notificationStore';
import { billReminderCandidates } from '../lib/ledger';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ErrorBoundary } from './ErrorBoundary';
import { Loader2 } from 'lucide-react';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  FileSignature, 
  Briefcase, 
  UsersRound, 
  HardHat, 
  IndianRupee,
  BarChart 
} from 'lucide-react';

export function Layout() {
  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Leads', href: '/leads', icon: Users },
    { name: 'Quotations', href: '/quotations', icon: FileText },
    { name: 'Agreements', href: '/agreements', icon: FileSignature },
    { name: 'Projects', href: '/projects', icon: Briefcase },
    { name: 'Customers', href: '/customers', icon: UsersRound },
    { name: 'Workforce', href: '/workforce', icon: HardHat },
    { name: 'Finance', href: '/finance', icon: IndianRupee },
    { name: 'Reports', href: '/reports', icon: BarChart },
  ];

  const { user, loading, initialized, initialize } = useAuthStore();
  const { bills, subscribeBills } = useBillStore();
  const { notifications, createIfNotExists, subscribeNotifications } = useNotificationStore();
  const location = useLocation();

  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  // Supervisors never see this shell at all (redirected below) - these
  // subscriptions are for the finance data they have no rules access to
  // anyway, so skip them for that role rather than throw permission errors.
  const isRestrictedRole = user?.role === 'supervisor';

  useEffect(() => {
    if (user && !isRestrictedRole) {
      const unsubBills = subscribeBills();
      const unsubNotif = subscribeNotifications();
      return () => { unsubBills(); unsubNotif(); };
    }
  }, [user, isRestrictedRole, subscribeBills, subscribeNotifications]);

  // Generate reminders for bills due soon or overdue, whenever the CRM is open.
  // See lib/ledger.ts:billReminderCandidates for what this can and can't guarantee.
  // Each reminder is created at most once ever (createIfNotExists uses the
  // candidate's key as the document id, so re-running this on every load is
  // safe and never produces duplicates).
  useEffect(() => {
    if (isRestrictedRole || bills.length === 0) return;
    for (const candidate of billReminderCandidates(bills)) {
      createIfNotExists(candidate.key, {
        title: candidate.title,
        message: candidate.message,
        type: 'Payment Due',
        isRead: false,
        relatedEntityId: candidate.key,
        dueDate: candidate.bill.dueDate,
      });
    }
  }, [bills, createIfNotExists]);

  if (loading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // A supervisor gets their own dedicated screen, never this one - not just
  // because the data would fail to load under the database rules, but so
  // they're never shown a sidebar full of links to things they can't open.
  if (user.role === 'supervisor') {
    return <Navigate to="/supervisor" replace />;
  }

  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8">
          {/* Scoped to the page content so a broken screen leaves the sidebar
              and header usable, and keyed on the route so navigating away
              clears the error rather than staying stuck. */}
          <ErrorBoundary variant="page" resetKey={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
