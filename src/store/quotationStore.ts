// @ts-nocheck
import { create } from 'zustand';
import { db } from '../lib/firebase';
import { 
  collection, doc, onSnapshot, query, orderBy, serverTimestamp, getDoc, getDocs, limit, runTransaction, writeBatch } from 'firebase/firestore';
import { setDocSafe as setDoc, updateDocSafe as updateDoc, stripUndefined } from '../lib/firestoreSafe';
import { Quotation, QuotationVersion } from '../types';

interface QuotationState {
  quotations: Quotation[];
  versions: Record<string, QuotationVersion[]>; // Map of familyId -> versions
  loading: boolean;
  error: string | null;
  subscribeQuotations: () => () => void;
  fetchVersions: (familyId: string) => Promise<void>;
  createQuotation: (data: Partial<QuotationVersion>) => Promise<string>;
  updateVersion: (versionId: string, data: Partial<QuotationVersion>) => Promise<void>;
  lockVersion: (versionId: string) => Promise<void>;
  createRevision: (familyId: string, sourceVersionId: string) => Promise<string>;
  deleteQuotation: (familyId: string) => Promise<void>;
}

export const useQuotationStore = create<QuotationState>((set, get) => ({
  quotations: [],
  versions: {},
  loading: true,
  error: null,
  
  subscribeQuotations: () => {
    set({ loading: true });
    const q = query(collection(db, 'quotations'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const quotations = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Quotation[];
        set({ quotations, loading: false, error: null });
      },
      (error) => {
        console.error('Error fetching quotations:', error);
        set({ error: error.message, loading: false });
      }
    );
    return unsubscribe;
  },

  fetchVersions: async (familyId) => {
    try {
      const q = query(collection(db, `quotations/${familyId}/versions`), orderBy('versionNumber', 'desc'));
      const snapshot = await getDocs(q);
      const versions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as QuotationVersion[];
      
      set(state => ({
        versions: { ...state.versions, [familyId]: versions }
      }));
    } catch (error: any) {
      console.error('Error fetching versions:', error);
    }
  },

  createQuotation: async (data) => {
    try {
      const familyRef = doc(collection(db, 'quotations'));
      const versionRef = doc(collection(db, `quotations/${familyRef.id}/versions`));
      
      // Atomic counter for quotation number would be best here. For demo, generating timestamp-based
      // Wait, requirement says "Do not rely only on timestamps for unique numbers. Use an atomic counter".
      let newNumber = '';
      
      await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, 'settings', 'quotationCounter');
        const counterDoc = await transaction.get(counterRef);
        
        let seq = 1;
        if (counterDoc.exists()) {
          seq = counterDoc.data().current + 1;
          transaction.update(counterRef, { current: seq });
        } else {
          transaction.set(counterRef, { current: 1, prefix: 'DC/Q', year: new Date().getFullYear() });
        }
        
        const year = new Date().getFullYear();
        newNumber = `DC/Q/${year}/${seq.toString().padStart(4, '0')}`;
        
        const now = serverTimestamp();
        
        const familyData: Partial<Quotation> = {
          currentVersionId: versionRef.id,
          customerId: data.customerId || '',
          leadId: data.leadId || '',
          status: 'Draft',
          createdAt: now as any,
          updatedAt: now as any,
        };
        
        const versionData: Partial<QuotationVersion> = {
          ...data,
          id: versionRef.id,
          familyId: familyRef.id,
          versionNumber: 1,
          quotationNumber: newNumber,
          isLocked: false,
          createdAt: now as any,
        };

        transaction.set(familyRef, stripUndefined(familyData));
        transaction.set(versionRef, stripUndefined(versionData));
      });
      
      return familyRef.id;
    } catch (error: any) {
      console.error('Error creating quotation:', error);
      throw new Error(error.message);
    }
  },

  updateVersion: async (versionId, data) => {
    // In a real app, find familyId. Here we assume we have it in data or we fetch it.
    if (!data.familyId) throw new Error("Family ID required");
    const versionRef = doc(db, `quotations/${data.familyId}/versions`, versionId);
    
    // Check if locked
    const state = get();
    const versions = state.versions[data.familyId] || [];
    const v = versions.find(x => x.id === versionId);
    if (v?.isLocked) throw new Error("Cannot edit a locked version");
    
    // customerId lives on the quotation family, not the version - writing it
    // onto the version would leave the customer page still unable to find it.
    const { customerId, ...versionFields } = data as any;

    await updateDoc(versionRef, {
      ...versionFields,
    });

    await updateDoc(doc(db, 'quotations', data.familyId), {
      updatedAt: serverTimestamp(),
      ...(customerId !== undefined ? { customerId } : {}),
    });
  },

  lockVersion: async (familyId: string, versionId: string) => {
    try {
      const versionRef = doc(db, `quotations/${familyId}/versions`, versionId);
      await updateDoc(versionRef, {
        isLocked: true
      });
      
      const state = get();
      const familyVersions = state.versions[familyId] || [];
      const updatedVersions = familyVersions.map(v => 
        v.id === versionId ? { ...v, isLocked: true } : v
      );
      
      set(state => ({
        versions: { ...state.versions, [familyId]: updatedVersions }
      }));
    } catch (error: any) {
      console.error('Error locking version:', error);
      throw new Error(error.message);
    }
  },

  createRevision: async (familyId: string, sourceVersionId: string) => {
    try {
      const sourceRef = doc(db, `quotations/${familyId}/versions`, sourceVersionId);
      const sourceDoc = await getDoc(sourceRef);
      
      if (!sourceDoc.exists()) throw new Error("Source version not found");
      const sourceData = sourceDoc.data() as QuotationVersion;
      
      const versionRef = doc(collection(db, `quotations/${familyId}/versions`));
      
      const now = serverTimestamp();
      
      const newVersionData: Partial<QuotationVersion> = {
        ...sourceData,
        id: versionRef.id,
        versionNumber: sourceData.versionNumber + 1,
        isLocked: false,
        date: Date.now(),
        createdAt: now as any,
      };
      
      await runTransaction(db, async (transaction) => {
        const familyRef = doc(db, 'quotations', familyId);
        transaction.set(versionRef, stripUndefined(newVersionData));
        transaction.update(familyRef, {
          currentVersionId: versionRef.id,
          updatedAt: now
        });
      });
      
      return versionRef.id;
    } catch (error: any) {
      console.error('Error creating revision:', error);
      throw new Error(error.message);
    }
  },

  deleteQuotation: async (familyId: string) => {
    try {
      const q = query(collection(db, `quotations/${familyId}/versions`));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      snapshot.forEach((docSnap: any) => {
        batch.delete(docSnap.ref);
      });
      batch.delete(doc(db, 'quotations', familyId));
      
      await batch.commit();
      
      // Update local state
      set(state => {
        const newVersions = { ...state.versions };
        delete newVersions[familyId];
        return {
          quotations: state.quotations.filter(q => q.id !== familyId),
          versions: newVersions
        };
      });
    } catch (error: any) {
      console.error('Error deleting quotation:', error);
      throw new Error(error.message);
    }
  }
}));

