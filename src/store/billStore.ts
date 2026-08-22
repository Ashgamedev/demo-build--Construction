import { create } from 'zustand';
import { db } from '../lib/firebase';
import { collection, doc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { setDocSafe as setDoc, updateDocSafe as updateDoc } from '../lib/firestoreSafe';
import { VendorBill } from '../types';

interface BillState {
  bills: VendorBill[];
  loading: boolean;
  error: string | null;
  subscribeBills: () => () => void;
  createBill: (data: Omit<VendorBill, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateBill: (id: string, data: Partial<VendorBill>) => Promise<void>;
  addPayment: (billId: string, payment: Omit<VendorBill['payments'][0], 'id'>) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;
}

export const useBillStore = create<BillState>((set, get) => ({
  bills: [],
  loading: false,
  error: null,
  
  subscribeBills: () => {
    set({ loading: true, error: null });
    const q = query(collection(db, 'vendor_bills'), orderBy('date', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bills = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as VendorBill[];
      set({ bills, loading: false });
    }, (error) => {
      console.error("Error subscribing to bills:", error);
      set({ error: error.message, loading: false });
    });

    return unsubscribe;
  },

  createBill: async (data) => {
    set({ loading: true });
    try {
      const newRef = doc(collection(db, 'vendor_bills'));
      await setDoc(newRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      set({ loading: false });
      return newRef.id;
    } catch (error: any) {
      console.error('Error creating bill:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateBill: async (id, data) => {
    set({ loading: true });
    try {
      const docRef = doc(db, 'vendor_bills', id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
      set({ loading: false });
    } catch (error: any) {
      console.error('Error updating bill:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  addPayment: async (billId, paymentData) => {
    set({ loading: true });
    try {
      const currentBills = get().bills;
      const bill = currentBills.find(b => b.id === billId);
      if (!bill) throw new Error("Bill not found");

      const newPayment = {
        id: crypto.randomUUID(),
        ...paymentData
      };
      
      const payments = [...(bill.payments || []), newPayment];
      const paidAmount = bill.paidAmount + paymentData.amount;
      const status = paidAmount >= bill.amount ? 'Paid' : 'Partial';

      const docRef = doc(db, 'vendor_bills', billId);
      await updateDoc(docRef, {
        payments,
        paidAmount,
        status,
        updatedAt: serverTimestamp(),
      });
      
      set({ loading: false });
    } catch (error: any) {
      console.error('Error adding payment to bill:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteBill: async (id) => {
    set({ loading: true });
    try {
      await deleteDoc(doc(db, 'vendor_bills', id));
      set({ loading: false });
    } catch (error: any) {
      console.error('Error deleting bill:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  }
}));
