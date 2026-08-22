/**
 * Stand-in for `firebase/auth` in the demo build.
 *
 * Signs in as the company owner straight away, so the demo opens on the
 * dashboard rather than a login screen.
 */

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAnonymous: boolean;
}

export const OWNER_UID = 'demo_owner_uid';

let currentUser: User | null = {
  uid: OWNER_UID,
  email: 'office@deepthi.demo',
  displayName: 'Office',
  isAnonymous: false,
};

type Listener = (user: User | null) => void;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((fn) => fn(currentUser));
}

export function getAuth(_app?: unknown) {
  return {
    __kind: 'auth' as const,
    get currentUser() {
      return currentUser;
    },
    signOut: async () => signOut(),
  };
}

export function onAuthStateChanged(_auth: unknown, cb: Listener) {
  listeners.add(cb);
  setTimeout(() => cb(currentUser), 0);
  return () => listeners.delete(cb);
}

export async function signInAnonymously(_auth?: unknown) {
  currentUser = { uid: OWNER_UID, email: 'office@deepthi.demo', displayName: 'Office', isAnonymous: false };
  emit();
  return { user: currentUser };
}

export async function signInWithEmailAndPassword(_auth: unknown, email: string, _password: string) {
  currentUser = { uid: OWNER_UID, email, displayName: 'Office', isAnonymous: false };
  emit();
  return { user: currentUser };
}

export async function createUserWithEmailAndPassword(_auth: unknown, email: string, _password: string) {
  return signInWithEmailAndPassword(_auth, email, '');
}

export async function signOut(_auth?: unknown) {
  currentUser = null;
  emit();
}

export async function sendPasswordResetEmail(_auth: unknown, _email: string) {}

/** No backend to connect to. */
export function connectAuthEmulator(..._args: any[]) {}

export type { User as FirebaseUser };
