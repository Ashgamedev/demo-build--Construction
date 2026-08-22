// @ts-nocheck
import { create } from 'zustand';
import { db } from '../lib/firebase';
import { 
  collection, doc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { setDocSafe as setDoc, updateDocSafe as updateDoc } from '../lib/firestoreSafe';
import { Lead } from '../types';

interface LeadState {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  subscribe: () => () => void;
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateLead: (id: string, data: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
}

export const useLeadStore = create<LeadState>((set) => ({
  leads: [],
  loading: true,
  error: null,
  
  subscribe: () => {
    set({ loading: true });
    const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const leads = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Lead[];
        set({ leads, loading: false, error: null });
      },
      (error) => {
        console.error('Error fetching leads:', error);
        set({ error: error.message, loading: false });
      }
    );
    return unsubscribe;
  },

  addLead: async (leadData) => {
    try {
      const newLeadRef = doc(collection(db, 'leads'));
      await setDoc(newLeadRef, {
        ...leadData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error: any) {
      console.error('Error adding lead:', error);
      throw new Error(error.message);
    }
  },

  updateLead: async (id, data) => {
    try {
      const leadRef = doc(db, 'leads', id);
      await updateDoc(leadRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (error: any) {
      console.error('Error updating lead:', error);
      throw new Error(error.message);
    }
  },

  deleteLead: async (id) => {
    try {
      const leadRef = doc(db, 'leads', id);
      await updateDoc(leadRef, {
        status: 'Deleted',
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      console.error('Error deleting lead:', error);
      throw new Error(error.message);
    }
  }
}));

