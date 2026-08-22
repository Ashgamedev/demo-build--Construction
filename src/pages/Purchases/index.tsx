import { Routes, Route } from 'react-router-dom';
import { PurchasesDashboard } from './PurchasesDashboard';

export function Purchases() {
  return (
    <Routes>
      <Route path="/" element={<PurchasesDashboard />} />
    </Routes>
  );
}
