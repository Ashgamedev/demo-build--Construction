import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkforceStore } from '../../store/workforceStore';
import { Plus, Search, HardHat, Phone, MapPin, Receipt, ChevronRight } from 'lucide-react';
import { WorkforceModal } from './WorkforceModal';
import { ExpenseModal } from '../Finance/ExpenseModal';
import { Workforce as WorkforceType } from '../../types';

export function WorkforceList() {
  const navigate = useNavigate();
  const { workforce, loading, subscribeWorkforce } = useWorkforceStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isWorkforceModalOpen, setIsWorkforceModalOpen] = useState(false);

  const [expenseModalTarget, setExpenseModalTarget] = useState<WorkforceType | null>(null);

  useEffect(() => {
    const unsub = subscribeWorkforce();
    return () => unsub();
  }, [subscribeWorkforce]);

  const filteredWorkforce = workforce.filter(w =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.trade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Workforce</h1>
        <button
          onClick={() => setIsWorkforceModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" /> Add Staff/Contractor
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or trade..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading workforce...</div>
          ) : filteredWorkforce.length === 0 ? (
            <div className="p-8 text-center text-gray-500 flex flex-col items-center">
              <HardHat className="h-12 w-12 text-gray-300 mb-2" />
              <p>No workforce members found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {filteredWorkforce.map(member => (
                <div
                  key={member.id}
                  onClick={() => navigate(`/workforce/${member.id}`)}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 transition-shadow bg-gray-50 flex flex-col cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg flex items-center gap-1">
                        {member.name}
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </h3>
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                        {member.type} • {member.trade}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-gray-600 flex-1">
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-gray-400" />
                      {member.phone}
                    </div>
                    {member.address && (
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="truncate">{member.address}</span>
                      </div>
                    )}
                    {member.monthlySalary && (
                      <div className="mt-2 text-gray-900 font-medium">
                        Monthly Salary: ₹{member.monthlySalary.toLocaleString('en-IN')}
                      </div>
                    )}
                    {member.dailyWage && (
                      <div className="mt-2 text-gray-900 font-medium">
                        Daily Wage: ₹{member.dailyWage.toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 flex space-x-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setExpenseModalTarget(member); }}
                      className="flex-1 bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-50 flex items-center justify-center text-sm font-medium"
                    >
                      <Receipt className="w-4 h-4 mr-2 text-gray-500" />
                      Record Pay / Expense
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      {isWorkforceModalOpen && (
        <WorkforceModal onClose={() => setIsWorkforceModalOpen(false)} />
      )}

      {expenseModalTarget && (
        <ExpenseModal
          defaultPayeeId={expenseModalTarget.id}
          defaultPayeeName={expenseModalTarget.name}
          onClose={() => setExpenseModalTarget(null)}
        />
      )}
    </div>
  );
}
