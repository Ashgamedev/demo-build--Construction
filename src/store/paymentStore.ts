// @ts-nocheck
import { create } from 'zustand';
import { db } from '../lib/firebase';
import { 
  collection, doc, getDocs, onSnapshot, query, orderBy, where, serverTimestamp, runTransaction } from 'firebase/firestore';
import { setDocSafe as setDoc, stripUndefined } from '../lib/firestoreSafe';
import { CustomerPayment, PaymentReceipt, ReceiptSnapshot } from '../types';
import { useCompanySettingsStore } from './companySettingsStore';

interface PaymentState {
  payments: CustomerPayment[];
  receipts: PaymentReceipt[];
  loading: boolean;
  error: string | null;
  subscribeToQuotationPayments: (quotationId: string) => () => void;
  recordPaymentAndGenerateReceipt: (
    paymentData: Omit<CustomerPayment, 'id' | 'createdAt' | 'receiptGenerated' | 'receiptId'>,
    clientName: string,
    projectName: string,
    contractValue: number // Total agreed value; the balance is derived from it
  ) => Promise<{ receiptId: string; remainingBalance: number }>;
}

export const usePaymentStore = create<PaymentState>((set) => ({
  payments: [],
  receipts: [],
  loading: false,
  error: null,
  
  subscribeToQuotationPayments: (quotationId: string) => {
    set({ loading: true });
    
    // Subscribe to payments
    const qPayments = query(collection(db, 'payments'), where('quotationId', '==', quotationId), orderBy('createdAt', 'desc'));
    const unsubPayments = onSnapshot(qPayments, (snapshot) => {
      const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CustomerPayment[];
      set({ payments, loading: false });
    });

    // Subscribe to receipts
    const qReceipts = query(collection(db, 'receipts'), where('quotationId', '==', quotationId), orderBy('createdAt', 'desc'));
    const unsubReceipts = onSnapshot(qReceipts, (snapshot) => {
      const receipts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PaymentReceipt[];
      set({ receipts });
    });

    return () => {
      unsubPayments();
      unsubReceipts();
    };
  },

  recordPaymentAndGenerateReceipt: async (paymentData, clientName, projectName, contractValue) => {
    try {
      const paymentRef = doc(collection(db, 'payments'));
      const receiptRef = doc(collection(db, 'receipts'));

      const companySettings = useCompanySettingsStore.getState().settings;
      if (!companySettings) throw new Error("Company settings not loaded. Cannot generate receipt.");

      // The balance printed on the receipt must account for every payment already
      // received, not just this one. Computing it here rather than trusting the
      // caller keeps every entry point consistent.
      let previouslyPaid = 0;
      if (paymentData.projectId) {
        const priorSnap = await getDocs(
          query(collection(db, 'payments'), where('projectId', '==', paymentData.projectId))
        );
        previouslyPaid = priorSnap.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0);
      }
      const remainingBalance = contractValue - previouslyPaid - paymentData.amount;

      const now = serverTimestamp();
      
      let receiptNumber = '';
      
      await runTransaction(db, async (transaction) => {
        // 1. Generate receipt number
        const counterRef = doc(db, 'settings', 'receiptCounter');
        const counterDoc = await transaction.get(counterRef);
        
        let seq = 1;
        if (counterDoc.exists()) {
          seq = counterDoc.data().current + 1;
          transaction.update(counterRef, { current: seq });
        } else {
          transaction.set(counterRef, { current: 1 });
        }
        
        const year = new Date().getFullYear();
        receiptNumber = `DC/R/${year}/${seq.toString().padStart(4, '0')}`;
        
        // 2. Prepare Payment
        const payment: Partial<CustomerPayment> = {
          ...paymentData,
          id: paymentRef.id,
          receiptGenerated: true,
          receiptId: receiptRef.id,
          createdAt: now as any,
        };
        
        // 3. Prepare Receipt
        const snapshot: ReceiptSnapshot = {
          clientName,
          projectName,
          amountReceived: paymentData.amount,
          paymentMode: paymentData.paymentMode,
          date: paymentData.date,
          remainingBalance,
          companySettings
        };
        
        const receipt: Partial<PaymentReceipt> = {
          id: receiptRef.id,
          receiptNumber,
          paymentId: paymentRef.id,
          quotationId: paymentData.quotationId,
          snapshot,
          isVoided: false,
          createdAt: now as any,
          createdBy: paymentData.createdBy,
        };
        
        transaction.set(paymentRef, stripUndefined(payment));
        transaction.set(receiptRef, stripUndefined(receipt));
      });
      
      return { receiptId: receiptRef.id, remainingBalance };
    } catch (error: any) {
      console.error('Error recording payment:', error);
      throw new Error(error.message);
    }
  }
}));

