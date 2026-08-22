import { create } from 'zustand';
import { collection, doc, getDocs, query, where, onSnapshot, serverTimestamp, writeBatch } from 'firebase/firestore';
import { setDocSafe as setDoc } from '../lib/firestoreSafe';
import { db } from '../lib/firebase';
import { Agreement, AgreementVersion, QuotationVersion } from '../types';
import { calculateMilestoneAmount } from '../utils/currencyMath';
import { currentActor } from '../lib/audit';

interface AgreementState {
  agreements: Agreement[];
  versions: Record<string, AgreementVersion[]>; // Map of agreementId to versions
  loading: boolean;
  error: string | null;
  subscribeAgreements: () => () => void;
  fetchVersions: (agreementId: string) => Promise<void>;
  createAgreementFromQuotation: (
    quotationId: string,
    version: QuotationVersion,
    confirmedContractValue: number,
    paymentSchedule: AgreementVersion['paymentSchedule'],
    quotationValue?: number
  ) => Promise<string>;
  updateVersion: (versionId: string, updates: Partial<AgreementVersion>) => Promise<void>;
  generateNewVersion: (agreementId: string, payload: Partial<AgreementVersion>) => Promise<void>;
  deleteAgreement: (agreementId: string) => Promise<void>;
}

export const useAgreementStore = create<AgreementState>((set, _get) => ({
  agreements: [],
  versions: {},
  loading: false,
  error: null,

  subscribeAgreements: () => {
    set({ loading: true });
    const q = query(collection(db, 'agreements'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const agreements: Agreement[] = [];
      snapshot.forEach((doc: any) => {
        agreements.push({ id: doc.id, ...doc.data() } as Agreement);
      });
      // Sort in memory to avoid composite index requirement
      agreements.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      set({ agreements, loading: false, error: null });
    }, (error: any) => {
      set({ error: error.message, loading: false });
    });

    return unsubscribe;
  },

  fetchVersions: async (agreementId: string) => {
    try {
      const q = query(
        collection(db, 'agreementVersions'),
        where('agreementId', '==', agreementId)
      );
      const snapshot = await getDocs(q);
      const versions: AgreementVersion[] = [];
      snapshot.forEach((doc: any) => {
        versions.push({ id: doc.id, ...doc.data() } as AgreementVersion);
      });
      
      // Sort in memory to avoid requiring a Firestore composite index
      versions.sort((a, b) => b.versionNumber - a.versionNumber);
      
      set(state => ({
        versions: {
          ...state.versions,
          [agreementId]: versions
        }
      }));
    } catch (error: any) {
      console.error('Error fetching agreement versions:', error);
      // Even on error, set empty array so it doesn't get stuck indefinitely
      set(state => ({
        versions: {
          ...state.versions,
          [agreementId]: []
        }
      }));
    }
  },

  createAgreementFromQuotation: async (
    quotationId: string,
    quotationVersion: QuotationVersion,
    confirmedContractValue: number,
    paymentSchedule: AgreementVersion['paymentSchedule'],
    quotationValue?: number
  ) => {
    try {
      set({ loading: true, error: null });
      
      const newAgreementRef = doc(collection(db, 'agreements'));
      const newVersionRef = doc(collection(db, 'agreementVersions'));

      // Compile scope of work from quotation
      let scopeOfWork = '';
      if (quotationVersion.type === 'labour' && quotationVersion.labourScope) {
        scopeOfWork = quotationVersion.labourScope.map((s, i) => `${i + 1}. ${s.description}`).join('\n');
      } else if (quotationVersion.type === 'full_spec' && quotationVersion.fullSpecItems) {
        scopeOfWork = quotationVersion.fullSpecItems.map((s, i) => `${i + 1}. ${s.name}: ${s.description}`).join('\n');
      } else if (quotationVersion.type === 'measurement' && quotationVersion.measurementGroups) {
        scopeOfWork = quotationVersion.measurementGroups.map(g => `${g.name}:\n` + g.items.map((it, i) => `  ${i + 1}. ${it.description}`).join('\n')).join('\n\n');
      }

      const contractValueDiffers = quotationValue !== undefined && quotationValue !== confirmedContractValue;

      const initialVersion: AgreementVersion = {
        id: newVersionRef.id,
        agreementId: newAgreementRef.id,
        versionNumber: 1,
        agreementNumber: `AGR-${Date.now()}`,
        date: Date.now(),
        subject: quotationVersion.subject || '',
        clientName: quotationVersion.clientName || '',
        siteName: quotationVersion.siteName || '',
        contractorName: quotationVersion.contractorName || '',
        totalValue: confirmedContractValue,
        quotationValue: quotationValue,
        contractValueDiffersFromQuotation: contractValueDiffers,
        paymentSchedule,
        termsAndConditions: '1. Standard construction terms apply.\n2. Any extra works will be billed separately.',
        scopeOfWork,
        signatures: { clientSigned: false, contractorSigned: false },
        companySnapshot: quotationVersion.companySnapshot,
        language: quotationVersion.language || 'en',
        isLocked: false,
        createdAt: Date.now(),
        createdBy: currentActor().id,
      };
      
      // Inherit the customer from the quotation this came from. It was
      // hardcoded to 'unknown', so no agreement could ever be found on a
      // customer's page - the same "stored a name, not a link" problem.
      const { useQuotationStore } = await import('./quotationStore');
      const family = useQuotationStore.getState().quotations.find(q => q.id === quotationId);

      const newAgreement: Partial<Agreement> = {
        quotationId,
        quotationVersionId: quotationVersion.id,
        customerId: family?.customerId || '',
        status: 'Draft',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await setDoc(newVersionRef, initialVersion);
      await setDoc(newAgreementRef, newAgreement);
      
      return newAgreementRef.id;
    } catch (error: any) {
      console.error(error);
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateVersion: async (versionId: string, updates: Partial<AgreementVersion>) => {
    try {
      const versionRef = doc(db, 'agreementVersions', versionId);
      await setDoc(versionRef, { ...updates, updatedAt: serverTimestamp() }, { merge: true });
    } catch (error: any) {
      console.error('Error updating version:', error);
      throw error;
    }
  },

  generateNewVersion: async (_agreementId: string, _payload: Partial<AgreementVersion>) => {
    // Future: create a new version from an existing one
  },

  deleteAgreement: async (agreementId: string) => {
    try {
      const q = query(collection(db, 'agreementVersions'), where('agreementId', '==', agreementId));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      snapshot.forEach((docSnap: any) => {
        batch.delete(docSnap.ref);
      });
      batch.delete(doc(db, 'agreements', agreementId));
      
      await batch.commit();
      
      // Update local state
      set(state => {
        const newVersions = { ...state.versions };
        delete newVersions[agreementId];
        return {
          agreements: state.agreements.filter(a => a.id !== agreementId),
          versions: newVersions
        };
      });
    } catch (error: any) {
      console.error('Error deleting agreement:', error);
      throw new Error(error.message);
    }
  }
}));
