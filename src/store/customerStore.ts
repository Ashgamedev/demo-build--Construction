// @ts-nocheck
import { create } from 'zustand';
import { db } from '../lib/firebase';
import { collection, doc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { setDocSafe as setDoc, updateDocSafe as updateDoc } from '../lib/firestoreSafe';
import { Customer } from '../types';

interface CustomerState {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  subscribe: () => () => void;
  createCustomer: (data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
}

export const useCustomerStore = create<CustomerState>((set) => ({
  customers: [],
  loading: true,
  error: null,
  
  subscribe: () => {
    set({ loading: true });
    const q = query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const customers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Customer[];
      
      set({ customers, loading: false });
    }, (error) => {
      console.error('Error fetching customers:', error);
      set({ error: error.message, loading: false });
    });
    
    return unsubscribe;
  },

  createCustomer: async (data) => {
    try {
      const newRef = doc(collection(db, 'customers'));
      const now = serverTimestamp();
      
      const customer = {
        ...data,
        id: newRef.id,
        createdAt: now,
        updatedAt: now,
      };
      
      await setDoc(newRef, customer);
      return newRef.id;
    } catch (error: any) {
      console.error('Error creating customer:', error);
      throw new Error(error.message);
    }
  },

  updateCustomer: async (id, data) => {
    try {
      const ref = doc(db, 'customers', id);
      await updateDoc(ref, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      console.error('Error updating customer:', error);
      throw new Error(error.message);
    }
  }
}));

