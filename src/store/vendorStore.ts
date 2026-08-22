import { create } from 'zustand';
import {
  collection, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { setDocSafe as setDoc, updateDocSafe as updateDoc } from '../lib/firestoreSafe';
import { db } from '../lib/firebase';
import { createdStamp, updatedStamp } from '../lib/audit';
import { Vendor } from '../types';

interface VendorState {
  vendors: Vendor[];
  loading: boolean;
  error: string | null;
  subscribeVendors: () => () => void;
  addVendor: (data: Omit<Vendor, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>) => Promise<string>;
  updateVendor: (id: string, data: Partial<Vendor>) => Promise<void>;
  /**
   * Finds a vendor by name, creating one if it doesn't exist yet.
   * Lets existing free-text vendor names migrate into real records as they're used.
   */
  findOrCreateByName: (name: string) => Promise<Vendor>;
}

export const useVendorStore = create<VendorState>((set, get) => ({
  vendors: [],
  loading: false,
  error: null,

  subscribeVendors: () => {
    set({ loading: true });
    const q = query(collection(db, 'vendors'), orderBy('name'));
    return onSnapshot(
      q,
      (snapshot) => {
        set({
          vendors: snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Vendor[],
          loading: false,
          error: null,
        });
      },
      (error) => {
        console.error('Error fetching vendors:', error);
        set({ error: error.message, loading: false });
      }
    );
  },

  addVendor: async (data) => {
    const ref = doc(collection(db, 'vendors'));
    await setDoc(ref, { ...data, id: ref.id, ...createdStamp() });
    return ref.id;
  },

  updateVendor: async (id, data) => {
    await updateDoc(doc(db, 'vendors', id), { ...data, ...updatedStamp() });
  },

  findOrCreateByName: async (name) => {
    const trimmed = name.trim();
    const existing = get().vendors.find(
      (v) => v.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) return existing;

    const ref = doc(collection(db, 'vendors'));
    const vendor: Vendor = {
      id: ref.id,
      name: trimmed,
      isActive: true,
      ...createdStamp(),
    } as Vendor;
    await setDoc(ref, vendor);
    return vendor;
  },
}));
