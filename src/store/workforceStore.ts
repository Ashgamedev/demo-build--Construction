// @ts-nocheck
import { create } from 'zustand';
import { db } from '../lib/firebase';
import { collection, doc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { setDocSafe as setDoc, updateDocSafe as updateDoc } from '../lib/firestoreSafe';
import { Workforce } from '../types';

interface WorkforceState {
  workforce: Workforce[];
  loading: boolean;
  error: string | null;
  subscribeWorkforce: () => () => void;
  createWorkforce: (data: Omit<Workforce, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateWorkforce: (id: string, data: Partial<Workforce>) => Promise<void>;
}

export const useWorkforceStore = create<WorkforceState>((set) => ({
  workforce: [],
  loading: true,
  error: null,
  
  subscribeWorkforce: () => {
    set({ loading: true });
    const q = query(collection(db, 'workforce'), orderBy('name', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const workforce = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Workforce[];
      set({ workforce, loading: false });
    }, (error) => {
      console.error("Error subscribing to workforce:", error);
      set({ error: error.message, loading: false });
    });

    return unsubscribe;
  },

  createWorkforce: async (data) => {
    set({ loading: true });
    try {
      const newRef = doc(collection(db, 'workforce'));
      await setDoc(newRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      set({ loading: false });
      return newRef.id;
    } catch (error: any) {
      console.error('Error creating workforce:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateWorkforce: async (id, data) => {
    set({ loading: true });
    try {
      const docRef = doc(db, 'workforce', id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
      set({ loading: false });
    } catch (error: any) {
      console.error('Error updating workforce:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  }
}));

