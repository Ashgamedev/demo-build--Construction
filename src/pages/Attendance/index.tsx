import { Routes, Route } from 'react-router-dom';
import { AttendanceDashboard } from './AttendanceDashboard';
import { WageCalculator } from './WageCalculator';

export function Attendance() {
  return (
    <Routes>
      <Route path="/" element={<AttendanceDashboard />} />
      <Route path="/wages" element={<WageCalculator />} />
    </Routes>
  );
}
