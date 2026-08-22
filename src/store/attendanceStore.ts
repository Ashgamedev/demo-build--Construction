// @ts-nocheck
import { create } from 'zustand';
import { db } from '../lib/firebase';
import { collection, doc, getDocs, onSnapshot, query, where, orderBy, serverTimestamp, writeBatch } from 'firebase/firestore';
import { setDocSafe as setDoc, stripUndefined } from '../lib/firestoreSafe';
import { AttendanceRecord, WagePayment } from '../types';
import { useAuthStore } from './authStore';
import { currentActor } from '../lib/audit';

interface AttendanceState {
  records: AttendanceRecord[];
  loading: boolean;
  error: string | null;
  subscribeByProjectAndDate: (projectId: string, dateTimestamp: number) => () => void;
  subscribeByDateRange: (startDate: number, endDate: number) => () => void;
  /** One-off fetch of every attendance record for one worker, across all projects and dates. */
  fetchByWorkforce: (workforceId: string) => Promise<AttendanceRecord[]>;
  saveRecord: (data: Omit<AttendanceRecord, 'id' | 'createdAt' | 'createdBy'>, payeeName: string) => Promise<void>;
  /** Every wage payment made, company-wide. Balances are earned minus this. */
  wagePayments: WagePayment[];
  subscribeWagePayments: () => () => void;
  /**
   * Pays a worker any amount against what they've earned. Creates the wage
   * payment and its matching Expense together, so the money shows once in
   * finance. Whatever isn't covered simply stays owed - no day is marked
   * "settled", because a partial payment can't be expressed that way.
   */
  payWages: (params: {
    workforceId: string;
    workforceName: string;
    amount: number;
    projectId?: string;
    paymentMethod: string;
    notes?: string;
    /** Mid-week cash rather than a settle-up. Still reduces the balance. */
    isAdvance?: boolean;
    /** Defaults to now; advances are dated to the day the cash was handed over. */
    date?: number;
  }) => Promise<void>;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  records: [],
  wagePayments: [],
  loading: false,
  error: null,
  
  subscribeByProjectAndDate: (projectId, dateTimestamp) => {
    set({ loading: true, error: null });
    
    // We expect dateTimestamp to be a normalized start-of-day timestamp
    const q = query(
      collection(db, 'attendance'),
      where('projectId', '==', projectId),
      where('date', '==', dateTimestamp)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AttendanceRecord[];
      set({ records, loading: false });
    }, (error) => {
      console.error("Error subscribing to attendance:", error);
      set({ error: error.message, loading: false });
    });

    return unsubscribe;
  },

  subscribeByDateRange: (startDate, endDate) => {
    set({ loading: true, error: null });
    
    const q = query(
      collection(db, 'attendance'),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AttendanceRecord[];
      set({ records, loading: false });
    }, (error) => {
      console.error("Error subscribing to global attendance:", error);
      set({ error: error.message, loading: false });
    });

    return unsubscribe;
  },

  fetchByWorkforce: async (workforceId) => {
    const snap = await getDocs(query(collection(db, 'attendance'), where('workforceId', '==', workforceId)));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as AttendanceRecord[];
  },

  saveRecord: async (data, payeeName) => {
    set({ loading: true, error: null });
    try {
      const auth = useAuthStore.getState();
      const user = auth.user;
      const createdBy = user ? user.id : 'system';

      // One record per worker per day. The site is stored as a field rather
      // than baked into the id on purpose: if the wrong site is picked and
      // corrected, re-marking updates the same record instead of creating a
      // second one and paying the person twice for the same day.
      const recordId = `${data.workforceId}_${data.date}`;
      const docRef = doc(db, 'attendance', recordId);
      
      await setDoc(docRef, {
        ...data,
        id: recordId, // keep id in doc as well
        createdAt: serverTimestamp(),
        createdBy
      }, { merge: true });

      // Advances are NOT handled here any more. They used to create an Expense
      // without reducing what the worker was owed, so the same money would be
      // handed over mid-week and then paid again at the week-end settle-up.
      // They now go through payWages({ isAdvance: true }), which records the
      // payment against the balance and creates exactly one Expense.

      set({ loading: false });
    } catch (error: any) {
      console.error('Error saving attendance record:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  subscribeWagePayments: () => {
    const q = query(collection(db, 'wagePayments'), orderBy('date', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        set({ wagePayments: snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as WagePayment[] });
      },
      (error) => console.error('Error subscribing to wage payments:', error)
    );
  },

  payWages: async ({ workforceId, workforceName, amount, projectId, paymentMethod, notes, isAdvance, date }) => {
    if (!amount || amount <= 0) throw new Error('Enter a valid amount');
    set({ loading: true, error: null });
    try {
      const actor = currentActor();
      const batch = writeBatch(db);
      const now = date ?? Date.now();

      // The expense is what makes this money visible in finance; the wage
      // payment is what reduces the balance owed. Written together so the two
      // can never disagree.
      const expenseRef = doc(collection(db, 'expenses'));
      const wageRef = doc(collection(db, 'wagePayments'));

      const expensePayload: any = {
        category: isAdvance ? 'Labour Advance' : 'Labour/Contractor',
        description: notes?.trim() || (isAdvance
          ? `Advance to ${workforceName}`
          : `Wages paid to ${workforceName}`),
        amount,
        date: now,
        payeeType: 'workforce',
        payeeId: workforceId,
        payeeName: workforceName,
        paidBy: 'Company cash',
        paymentMethod,
        wagePaymentId: wageRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: actor.id,
        createdByName: actor.name,
        updatedBy: actor.id,
        updatedByName: actor.name,
      };
      if (projectId) expensePayload.projectId = projectId;
      batch.set(expenseRef, stripUndefined(expensePayload));

      const wagePayload: any = {
        id: wageRef.id,
        workforceId,
        workforceName,
        amount,
        date: now,
        paymentMethod,
        expenseId: expenseRef.id,
        createdAt: now,
        createdBy: actor.id,
        createdByName: actor.name,
      };
      if (projectId) wagePayload.projectId = projectId;
      if (notes?.trim()) wagePayload.notes = notes.trim();
      if (isAdvance) wagePayload.isAdvance = true;
      batch.set(wageRef, stripUndefined(wagePayload));

      await batch.commit();
      set({ loading: false });
    } catch (error: any) {
      console.error('Error paying wages:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  }
}));
