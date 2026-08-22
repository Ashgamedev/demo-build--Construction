import { create } from 'zustand';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { setDocSafe as setDoc } from '../lib/firestoreSafe';
import { CompanySettings } from '../types';

interface CompanySettingsState {
  settings: CompanySettings | null;
  loading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: CompanySettings) => Promise<void>;
}

const DEFAULT_SETTINGS: CompanySettings = {
  name: 'Deepthi Construction',
  address: 'No.14/13, Complex (Near EB Office), Thingal Nagar\nNeyyoor Post, Kanyakumari Dist - 629802',
  proprietor: 'S. Manikanda Prabhu',
  mobileNumbers: '9003676384, 9543676384'
};

export const useCompanySettingsStore = create<CompanySettingsState>((set) => ({
  settings: null,
  loading: true,
  error: null,

  fetchSettings: async () => {
    set({ loading: true, error: null });
    try {
      const docRef = doc(db, 'settings', 'companyProfile');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        set({ settings: docSnap.data() as CompanySettings, loading: false });
      } else {
        // Initialize with default settings if none exist
        await setDoc(docRef, DEFAULT_SETTINGS);
        set({ settings: DEFAULT_SETTINGS, loading: false });
      }
    } catch (error: any) {
      console.error('Error fetching company settings:', error);
      set({ error: error.message, loading: false, settings: DEFAULT_SETTINGS });
    }
  },

  updateSettings: async (newSettings: CompanySettings) => {
    set({ loading: true, error: null });
    try {
      const docRef = doc(db, 'settings', 'companyProfile');
      await setDoc(docRef, newSettings);
      set({ settings: newSettings, loading: false });
    } catch (error: any) {
      console.error('Error updating company settings:', error);
      set({ error: error.message, loading: false });
      throw new Error('Failed to update company settings');
    }
  }
}));
