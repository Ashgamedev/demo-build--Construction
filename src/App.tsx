import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Leads } from './pages/Leads';
import { Quotations } from './pages/Quotations';
import { Projects } from './pages/Projects';
import { Finance } from './pages/Finance';
import { Agreements } from './pages/Agreements';
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { Workforce } from './pages/Workforce';
import { Settings } from './pages/Settings';
import { Reports } from './pages/Reports';
import { SharedProjectStagesView } from './pages/SharedProjectStagesView';
import { Attendance } from './pages/Attendance';
import { Purchases } from './pages/Purchases';
import { CaseStudies } from './pages/CaseStudies';
import { Settlements } from './pages/Settlements';
import { SettlementList } from './pages/Settlements/SettlementList';
import { SupervisorView } from './pages/SupervisorView';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    // Last resort: catches failures outside the page area - including in the
    // sidebar, header, or routing itself - so a crash never leaves a blank
    // screen with no way back.
    <ErrorBoundary variant="app">
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/supervisor" element={<SupervisorView />} />
        <Route path="/shared/project/:projectId/stages" element={<SharedProjectStagesView />} />
        
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/leads/*" element={<Leads />} />
          <Route path="/customers/*" element={<Customers />} />
          <Route path="/quotations/*" element={<Quotations />} />
          <Route path="/agreements/*" element={<Agreements />} />
          <Route path="/projects/*" element={<Projects />} />
          <Route path="/case-studies" element={<CaseStudies />} />
          <Route path="/settlements" element={<Settlements />} />
          <Route path="/settlements/:group" element={<SettlementList />} />
          <Route path="/workforce/*" element={<Workforce />} />
          <Route path="/attendance/*" element={<Attendance />} />
          <Route path="/purchases/*" element={<Purchases />} />
          <Route path="/finance/*" element={<Finance />} />
          <Route path="/reports/*" element={<Reports />} />
          <Route path="/settings/*" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
