import { Routes, Route } from 'react-router-dom';
import { CustomerList } from './CustomerList';
import { CustomerDetails } from './CustomerDetails';

export function Customers() {
  return (
    <Routes>
      <Route path="/" element={<CustomerList />} />
      <Route path="/:id" element={<CustomerDetails />} />
    </Routes>
  );
}
