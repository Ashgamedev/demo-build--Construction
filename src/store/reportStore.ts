import { create } from 'zustand';
import { db } from '../lib/firebase';
import { 
  collection, doc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { setDocSafe as setDoc } from '../lib/firestoreSafe';
import { SavedReport } from '../types';

interface ReportState {
  reports: SavedReport[];
  loading: boolean;
  error: string | null;
  subscribeReports: () => () => void;
  saveReport: (report: Omit<SavedReport, 'id' | 'createdAt'>) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
}

export const useReportStore = create<ReportState>((set) => ({
  reports: [],
  loading: false,
  error: null,
  
  subscribeReports: () => {
    set({ loading: true });
    const q = query(
      collection(db, 'reports'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const reportsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as SavedReport[];
        
        set({ reports: reportsData, loading: false, error: null });
      },
      (error) => {
        console.error('Error fetching reports:', error);
        set({ error: error.message, loading: false });
      }
    );
    return unsubscribe;
  },

  saveReport: async (reportData) => {
    try {
      const newRef = doc(collection(db, 'reports'));
      await setDoc(newRef, {
        ...reportData,
        createdAt: Date.now(),
      });
    } catch (error: any) {
      console.error('Error saving report:', error);
      throw new Error(error.message);
    }
  },

  deleteReport: async (id) => {
    try {
      const ref = doc(db, 'reports', id);
      await deleteDoc(ref);
    } catch (error: any) {
      console.error('Error deleting report:', error);
      throw new Error(error.message);
    }
  }
}));
