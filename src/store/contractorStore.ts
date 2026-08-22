import { create } from 'zustand';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, onSnapshot, doc } from 'firebase/firestore';
import { setDocSafe as setDoc, updateDocSafe as updateDoc } from '../lib/firestoreSafe';
import { ContractorAssignment, ContractorActivity, ContractorPayment } from '../types';

interface ContractorState {
  assignments: ContractorAssignment[];
  activities: ContractorActivity[];
  payments: ContractorPayment[];
  loading: boolean;
  error: string | null;
  /** All contractor assignments company-wide, live - used for the Finance overview's pending total. */
  allAssignments: ContractorAssignment[];
  subscribeAllAssignments: () => () => void;
  fetchProjectContractors: (projectId: string) => Promise<void>;
  /** One-off, cross-project fetch for a single workforce member's contractor history. Does not touch the shared per-project state above. */
  fetchWorkforceHistory: (workforceId: string) => Promise<{
    assignments: ContractorAssignment[];
    payments: ContractorPayment[];
    activities: ContractorActivity[];
  }>;
  createAssignment: (assignment: ContractorAssignment) => Promise<void>;
  updateAssignment: (id: string, updates: Partial<ContractorAssignment>) => Promise<void>;
  addActivity: (activity: ContractorActivity) => Promise<void>;
  addPayment: (payment: ContractorPayment) => Promise<void>;
}

export const useContractorStore = create<ContractorState>((set, get) => ({
  assignments: [],
  activities: [],
  payments: [],
  allAssignments: [],
  loading: false,
  error: null,

  subscribeAllAssignments: () => {
    const unsubscribe = onSnapshot(
      collection(db, 'contractorAssignments'),
      (snapshot) => {
        set({ allAssignments: snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as ContractorAssignment[] });
      },
      (error) => console.error('Error subscribing to all contractor assignments:', error)
    );
    return unsubscribe;
  },

  fetchProjectContractors: async (projectId: string) => {
    set({ loading: true, error: null });
    try {
      // 1. Fetch Assignments
      const assignQ = query(collection(db, 'contractorAssignments'), where('projectId', '==', projectId));
      const assignSnap = await getDocs(assignQ);
      const assignments = assignSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as ContractorAssignment));

      // 2. Fetch Activities
      const actQ = query(collection(db, 'contractorActivities'), where('projectId', '==', projectId));
      const actSnap = await getDocs(actQ);
      const activities = actSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as ContractorActivity));

      // 3. Fetch Payments
      const payQ = query(collection(db, 'contractorPayments'), where('projectId', '==', projectId));
      const paySnap = await getDocs(payQ);
      const payments = paySnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as ContractorPayment));

      set({ assignments, activities, payments, loading: false });
    } catch (error: any) {
      console.error('Error fetching contractor data:', error);
      set({ error: error.message, loading: false });
    }
  },

  fetchWorkforceHistory: async (workforceId: string) => {
    const [assignSnap, paySnap, actSnap] = await Promise.all([
      getDocs(query(collection(db, 'contractorAssignments'), where('workforceId', '==', workforceId))),
      getDocs(query(collection(db, 'contractorPayments'), where('workforceId', '==', workforceId))),
      getDocs(query(collection(db, 'contractorActivities'), where('workforceId', '==', workforceId))),
    ]);
    return {
      assignments: assignSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as ContractorAssignment)),
      payments: paySnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as ContractorPayment)),
      activities: actSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as ContractorActivity)),
    };
  },

  createAssignment: async (assignment: ContractorAssignment) => {
    set({ loading: true, error: null });
    try {
      await setDoc(doc(db, 'contractorAssignments', assignment.id), assignment);
      set(state => ({
        assignments: [...state.assignments, assignment],
        loading: false
      }));
    } catch (error: any) {
      console.error('Error creating assignment:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateAssignment: async (id: string, updates: Partial<ContractorAssignment>) => {
    set({ loading: true, error: null });
    try {
      await updateDoc(doc(db, 'contractorAssignments', id), updates);
      set(state => ({
        assignments: state.assignments.map(a => a.id === id ? { ...a, ...updates } : a),
        loading: false
      }));
    } catch (error: any) {
      console.error('Error updating assignment:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  addActivity: async (activity: ContractorActivity) => {
    set({ loading: true, error: null });
    try {
      await setDoc(doc(db, 'contractorActivities', activity.id), activity);
      
      // If progress added, update the assignment
      if (activity.progressAdded > 0) {
        const assignment = get().assignments.find(a => a.id === activity.assignmentId);
        if (assignment) {
          const newProgress = Math.min(100, assignment.progressPercentage + activity.progressAdded);
          await get().updateAssignment(assignment.id, { progressPercentage: newProgress });
        }
      }

      set(state => ({
        activities: [...state.activities, activity],
        loading: false
      }));
    } catch (error: any) {
      console.error('Error adding activity:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  addPayment: async (payment: ContractorPayment) => {
    set({ loading: true, error: null });
    try {
      await setDoc(doc(db, 'contractorPayments', payment.id), payment);
      
      // Update total paid on assignment
      const assignment = get().assignments.find(a => a.id === payment.assignmentId);
      if (assignment) {
        const newTotalPaid = assignment.totalPaid + payment.amount;
        await get().updateAssignment(assignment.id, { totalPaid: newTotalPaid });
      }

      set(state => ({
        payments: [...state.payments, payment],
        loading: false
      }));
    } catch (error: any) {
      console.error('Error adding payment:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  }
}));
