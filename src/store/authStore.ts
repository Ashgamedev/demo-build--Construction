import { create } from 'zustand';
import { auth, db, USING_EMULATORS } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser, signOut, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { setDocSafe as setDoc } from '../lib/firestoreSafe';
import { User } from '../types';

// Dev-only automatic sign-in, so the app opens straight into the CRM without a
// login screen. Only ever runs against the local emulators (see lib/firebase.ts),
// where accounts are fake and no real credentials exist.
const DEV_AUTOLOGIN = USING_EMULATORS;

interface AuthState {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  initialized: boolean;
  /** Set when a real Firebase account signed in but has neither an existing
   *  profile nor a matching invite - see initialize(). The UI should show a
   *  "no account set up for you" message and sign them back out, never grant
   *  access by default. */
  noProfileError: boolean;
  setUser: (user: User | null) => void;
  initialize: () => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  firebaseUser: null,
  loading: true,
  initialized: false,
  noProfileError: false,
  setUser: (user) => set({ user }),

  initialize: () => {
    try {
      if (DEV_AUTOLOGIN && !auth.currentUser) {
        signInAnonymously(auth).catch((err) => {
          console.error(
            '[dev autologin] Emulator sign-in failed. Is the emulator running? ' +
            'Start it with: npm run emulators',
            err.code
          );
        });
      }

      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data() as Omit<User, 'id'>;
              set({
                user: { id: userDoc.id, ...userData },
                firebaseUser,
                loading: false,
                initialized: true,
                noProfileError: false,
              });
              return;
            }

            // The dev auto-login account is always anonymous - a real
            // provider (email/password) is never used for it - so this
            // check can't be spoofed by a genuine sign-in. Keeps local
            // testing frictionless without weakening real access control.
            if (firebaseUser.isAnonymous) {
              const newUser: Omit<User, 'id'> = {
                email: firebaseUser.email || '',
                name: firebaseUser.displayName || 'Admin',
                role: 'owner',
                createdAt: Date.now(),
              };
              await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
              set({
                user: { id: firebaseUser.uid, ...newUser },
                firebaseUser,
                loading: false,
                initialized: true,
                noProfileError: false,
              });
              return;
            }

            // No profile yet for a real account: only proceed if an owner
            // explicitly invited this email as a supervisor. Anyone else
            // gets no access at all - there is no default role anymore.
            const email = (firebaseUser.email || '').toLowerCase();
            const inviteDoc = email ? await getDoc(doc(db, 'supervisorInvites', email)) : null;

            if (inviteDoc?.exists()) {
              const invite = inviteDoc.data();
              const newUser: Omit<User, 'id'> = {
                email,
                name: invite.workforceName || firebaseUser.displayName || email,
                role: 'supervisor',
                linkedWorkforceId: invite.workforceId,
                createdAt: Date.now(),
              };
              await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
              await deleteDoc(doc(db, 'supervisorInvites', email));
              set({
                user: { id: firebaseUser.uid, ...newUser },
                firebaseUser,
                loading: false,
                initialized: true,
                noProfileError: false,
              });
              return;
            }

            console.error(`No CRM account or invite found for ${email || firebaseUser.uid}. Signing out.`);
            await signOut(auth);
            set({ user: null, firebaseUser: null, loading: false, initialized: true, noProfileError: true });
          } catch (error) {
            console.error('Error resolving user profile:', error);
            set({ user: null, firebaseUser, loading: false, initialized: true, noProfileError: true });
          }
        } else {
          set({ user: null, firebaseUser: null, loading: false, initialized: true, noProfileError: false });
        }
      });
    } catch (e) {
      console.error('Firebase initialization error:', e);
      set({ loading: false, initialized: true });
    }
  },

  logout: async () => {
    try {
      await signOut(auth);
      set({ user: null, firebaseUser: null, noProfileError: false });
    } catch (error) {
      console.error('Logout error:', error);
    }
  },
}));
