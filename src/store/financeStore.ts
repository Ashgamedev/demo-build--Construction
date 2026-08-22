// @ts-nocheck
import { create } from 'zustand';
import { db } from '../lib/firebase';
import { 
  collection, doc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { setDocSafe as setDoc, updateDocSafe as updateDoc } from '../lib/firestoreSafe';
import { Expense, CustomerPayment } from '../types';
import { currentActor } from '../lib/audit';

interface FinanceState {
  expenses: Expense[];
  payments: CustomerPayment[];
  loading: boolean;
  error: string | null;
  subscribeFinance: () => () => void;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) => Promise<void>;
  /** Correct a mistyped expense. Without this a wrong amount was permanent. */
  updateExpense: (id: string, data: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addPayment: (payment: Omit<CustomerPayment, 'id' | 'createdAt' | 'createdBy'>) => Promise<void>;
}

export const useFinanceStore = create<FinanceState>((set) => ({
  expenses: [],
  payments: [],
  loading: true,
  error: null,
  
  subscribeFinance: () => {
    set({ loading: true });
    
    // In a real app we might combine these or use a composite store, 
    // but for simplicity we subscribe to both here
    const qExpenses = query(collection(db, 'expenses'), orderBy('date', 'desc'));
    const unsubExpenses = onSnapshot(qExpenses, (snapshot) => {
      const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Expense[];
      set({ expenses, loading: false });
    });

    const qPayments = query(collection(db, 'payments'), orderBy('date', 'desc'));
    const unsubPayments = onSnapshot(qPayments, (snapshot) => {
      const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CustomerPayment[];
      set({ payments, loading: false });
    });

    return () => {
      unsubExpenses();
      unsubPayments();
    };
  },

  addExpense: async (expenseData) => {
    try {
      const actor = currentActor();
      const newRef = doc(collection(db, 'expenses'));
      await setDoc(newRef, {
        ...expenseData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: actor.id,
        createdByName: actor.name,
        updatedBy: actor.id,
        updatedByName: actor.name,
      });
    } catch (error: any) {
      console.error('Error adding expense:', error);
      throw new Error(error.message);
    }
  },

  updateExpense: async (id, data) => {
    try {
      const actor = currentActor();
      await updateDoc(doc(db, 'expenses', id), {
        ...data,
        updatedAt: serverTimestamp(),
        updatedBy: actor.id,
        updatedByName: actor.name,
      });
    } catch (error: any) {
      console.error('Error updating expense:', error);
      throw new Error(error.message);
    }
  },

  deleteExpense: async (id) => {
    try {
      await deleteDoc(doc(db, 'expenses', id));
    } catch (error: any) {
      console.error('Error deleting expense:', error);
      throw new Error(error.message);
    }
  },

  addPayment: async (paymentData) => {
    try {
      const actor = currentActor();
      const newRef = doc(collection(db, 'payments'));
      await setDoc(newRef, {
        ...paymentData,
        createdAt: serverTimestamp(),
        createdBy: actor.id,
        createdByName: actor.name,
      });
      // Here we would also generate the receipt transactionally
    } catch (error: any) {
      console.error('Error adding payment:', error);
      throw new Error(error.message);
    }
  }
}));

