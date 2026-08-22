import { create } from 'zustand';
import {
  collection, doc, getDocs, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { setDocSafe as setDoc } from '../lib/firestoreSafe';
import { db } from '../lib/firebase';
import { createdStamp, currentActor } from '../lib/audit';
import { useFinanceStore } from './financeStore';
import { SupervisorAdvance, SupervisorSpend, SupervisorInvite, User } from '../types';

interface SupervisorState {
  advances: SupervisorAdvance[];
  spends: SupervisorSpend[];
  invites: SupervisorInvite[];
  loading: boolean;
  error: string | null;

  /** Company-wide, live - for the office/owner side (managing supervisors). */
  subscribeAll: () => () => void;
  /** One-off, scoped to a single supervisor - for their own restricted view. */
  fetchForWorkforce: (workforceId: string) => Promise<{ advances: SupervisorAdvance[]; spends: SupervisorSpend[] }>;

  inviteSupervisor: (email: string, workforceId: string, workforceName: string) => Promise<void>;
  cancelInvite: (email: string) => Promise<void>;
  /** Office-side lookup: does this workforce member already have supervisor login access? */
  findLinkedUser: (workforceId: string) => Promise<User | null>;

  /** Creates the advance AND its matching Expense in one place - see types.ts:SupervisorAdvance for why. */
  giveAdvance: (workforceId: string, amount: number, notes?: string) => Promise<void>;
  logSpend: (data: { workforceId: string; projectId: string; amount: number; description: string }) => Promise<void>;
}

export const useSupervisorStore = create<SupervisorState>((set, get) => ({
  advances: [],
  spends: [],
  invites: [],
  loading: false,
  error: null,

  subscribeAll: () => {
    set({ loading: true });
    const unsubs = [
      onSnapshot(query(collection(db, 'supervisorAdvances'), orderBy('date', 'desc')), (snap) => {
        set({ advances: snap.docs.map((d) => ({ id: d.id, ...d.data() })) as SupervisorAdvance[], loading: false });
      }, (err) => { console.error('Error subscribing to advances:', err); set({ error: err.message, loading: false }); }),
      onSnapshot(query(collection(db, 'supervisorSpends'), orderBy('date', 'desc')), (snap) => {
        set({ spends: snap.docs.map((d) => ({ id: d.id, ...d.data() })) as SupervisorSpend[] });
      }),
      onSnapshot(collection(db, 'supervisorInvites'), (snap) => {
        set({ invites: snap.docs.map((d) => ({ id: d.id, ...d.data() })) as SupervisorInvite[] });
      }),
    ];
    return () => unsubs.forEach((u) => u());
  },

  fetchForWorkforce: async (workforceId) => {
    const [advSnap, spendSnap] = await Promise.all([
      getDocs(query(collection(db, 'supervisorAdvances'), where('workforceId', '==', workforceId))),
      getDocs(query(collection(db, 'supervisorSpends'), where('workforceId', '==', workforceId))),
    ]);
    return {
      advances: advSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as SupervisorAdvance[],
      spends: spendSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as SupervisorSpend[],
    };
  },

  inviteSupervisor: async (email, workforceId, workforceName) => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) throw new Error('Enter an email address');
    const actor = currentActor();
    await setDoc(doc(db, 'supervisorInvites', normalized), {
      id: normalized,
      email: normalized,
      workforceId,
      workforceName,
      invitedBy: actor.id,
      invitedAt: Date.now(),
    } as SupervisorInvite);
  },

  cancelInvite: async (email) => {
    const normalized = email.trim().toLowerCase();
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'supervisorInvites', normalized));
  },

  findLinkedUser: async (workforceId) => {
    const snap = await getDocs(query(collection(db, 'users'), where('linkedWorkforceId', '==', workforceId)));
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as User;
  },

  giveAdvance: async (workforceId, amount, notes) => {
    if (amount <= 0) throw new Error('Enter a valid amount');
    set({ loading: true, error: null });
    try {
      const advanceRef = doc(collection(db, 'supervisorAdvances'));
      const financeStore = useFinanceStore.getState();

      // Find the worker's display name for the expense record.
      const { useWorkforceStore } = await import('./workforceStore');
      const worker = useWorkforceStore.getState().workforce.find((w) => w.id === workforceId);

      await financeStore.addExpense({
        category: 'Supervisor Advance',
        description: `Cash advance to ${worker?.name || 'supervisor'}`,
        amount,
        date: Date.now(),
        payeeType: 'workforce',
        payeeId: workforceId,
        payeeName: worker?.name || 'Supervisor',
        paidBy: 'Company cash',
        paymentMethod: 'Cash',
      });

      await setDoc(advanceRef, {
        id: advanceRef.id,
        workforceId,
        amount,
        date: Date.now(),
        notes: notes || '',
        ...createdStamp(),
      });

      set({ loading: false });
    } catch (error: any) {
      console.error('Error giving advance:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  logSpend: async ({ workforceId, projectId, amount, description }) => {
    if (!projectId) throw new Error('Select which project this was spent on');
    if (amount <= 0) throw new Error('Enter a valid amount');
    if (!description.trim()) throw new Error('Describe what this was spent on');

    const spendRef = doc(collection(db, 'supervisorSpends'));
    await setDoc(spendRef, {
      id: spendRef.id,
      workforceId,
      projectId,
      amount,
      description: description.trim(),
      date: Date.now(),
      ...createdStamp(),
    });
  },
}));
