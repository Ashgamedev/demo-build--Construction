import { Routes, Route } from 'react-router-dom';
import { WorkforceList } from './WorkforceList';
import { WorkforceDetail } from './WorkforceDetail';

export function Workforce() {
  return (
    <Routes>
      <Route path="/" element={<WorkforceList />} />
      <Route path="/:id" element={<WorkforceDetail />} />
    </Routes>
  );
}
