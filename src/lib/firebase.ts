/**
 * DEMO BUILD — there is no Firebase project behind this app.
 *
 * The real client build reads VITE_FIREBASE_* env vars and connects to a live
 * project. This one seeds an in-memory dataset instead and exports the same
 * `app` / `auth` / `db` / `storage` handles, so every store, page and component
 * works unchanged.
 *
 * No env vars, no credentials, no network. See src/demo/store.ts.
 */

import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { seedDemoData } from '../demo/seed';

seedDemoData();

export const app = { name: 'demo' };
export const auth = getAuth();
export const db = getFirestore();
export const storage = getStorage();

/** The demo never talks to emulators — it has no backend at all. */
export const USING_EMULATORS = false;
