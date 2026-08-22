import { Routes, Route } from 'react-router-dom';
import { FinanceDashboard } from './FinanceDashboard';
import { PaymentsList } from './PaymentsList';
import { ExpensesList } from './ExpensesList';
import { PaymentDetails } from './PaymentDetails';
import { Breakdown } from './Breakdown';

export function Finance() {
  return (
    <Routes>
      <Route path="/" element={<FinanceDashboard />} />
      <Route path="/payments" element={<PaymentsList />} />
      <Route path="/payments/:id" element={<PaymentDetails />} />
      <Route path="/expenses" element={<ExpensesList />} />
      <Route path="/breakdown/:metric" element={<Breakdown />} />
    </Routes>
  );
}
