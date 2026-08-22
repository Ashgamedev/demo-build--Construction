import { Routes, Route } from 'react-router-dom';
import { ProjectList } from './ProjectList';
import { ProjectDetails } from './ProjectDetails';
import { ContractorDashboard } from './ContractorDashboard';

export function Projects() {
  return (
    <Routes>
      <Route path="/" element={<ProjectList />} />
      <Route path="/:id" element={<ProjectDetails />} />
      <Route path="/:projectId/contractors/:assignmentId" element={<ContractorDashboard />} />
    </Routes>
  );
}
