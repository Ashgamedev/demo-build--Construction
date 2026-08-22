/**
 * Drop-in stand-in for the subset of `firebase/firestore` this app uses.
 *
 * Aliased in vite.config.ts, so every existing import keeps working untouched.
 * Reads and writes go to the in-memory demo store. All operations resolve
 * immediately — there is no network.
 */

import { store, newId, SENTINEL, type Doc } from './store';

// --- reference objects -------------------------------------------------

export interface CollectionRef {
  __kind: 'collection';
  path: string;
}

export interface DocRef {
  __kind: 'doc';
  path: string;
  id: string;
}

type Constraint =
  | { type: 'where'; field: string; op: string; value: any }
  | { type: 'orderBy'; field: string; dir: 'asc' | 'desc' }
  | { type: 'limit'; n: number };

export interface Query {
  __kind: 'query';
  path: string;
  constraints: Constraint[];
}

export function getFirestore(_app?: unknown) {
  return { __kind: 'firestore' } as const;
}

export function collection(_db: unknown, path: string): CollectionRef {
  return { __kind: 'collection', path };
}

export function doc(dbOrRef: any, pathOrId?: string, maybeId?: string): DocRef {
  // doc(db, 'collection', id)
  if (typeof pathOrId === 'string' && typeof maybeId === 'string') {
    return { __kind: 'doc', path: pathOrId, id: maybeId };
  }
  // doc(collectionRef, id)
  if (dbOrRef?.__kind === 'collection' && typeof pathOrId === 'string') {
    return { __kind: 'doc', path: dbOrRef.path, id: pathOrId };
  }
  // doc(collectionRef) — generates an id, used to pre-allocate a document
  if (dbOrRef?.__kind === 'collection') {
    return { __kind: 'doc', path: dbOrRef.path, id: newId(dbOrRef.path) };
  }
  throw new Error('demo firestore: unsupported doc() call signature');
}

// --- query building ----------------------------------------------------

export function where(field: string, op: string, value: any): Constraint {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, dir: 'asc' | 'desc' = 'asc'): Constraint {
  return { type: 'orderBy', field, dir };
}

export function limit(n: number): Constraint {
  return { type: 'limit', n };
}

export function query(ref: CollectionRef | Query, ...constraints: Constraint[]): Query {
  const base = ref.__kind === 'query' ? ref.constraints : [];
  return { __kind: 'query', path: ref.path, constraints: [...base, ...constraints] };
}

function valueAt(row: Doc, field: string): any {
  // `__name__` is Firestore's sentinel for the document id, used by
  // where('__name__', '==', id) and orderBy(documentId()).
  if (field === '__name__') return row.id;
  return field.split('.').reduce<any>((acc, part) => (acc == null ? acc : acc[part]), row);
}

/** Mirrors Firestore's documentId() field path helper. */
export function documentId(): string {
  return '__name__';
}

function matches(row: Doc, c: Extract<Constraint, { type: 'where' }>): boolean {
  const actual = valueAt(row, c.field);
  switch (c.op) {
    case '==':
      return actual === c.value;
    case '!=':
      return actual !== c.value;
    case '>':
      return actual > c.value;
    case '>=':
      return actual >= c.value;
    case '<':
      return actual < c.value;
    case '<=':
      return actual <= c.value;
    case 'in':
      return Array.isArray(c.value) && c.value.includes(actual);
    case 'not-in':
      return Array.isArray(c.value) && !c.value.includes(actual);
    case 'array-contains':
      return Array.isArray(actual) && actual.includes(c.value);
    case 'array-contains-any':
      return Array.isArray(actual) && Array.isArray(c.value) && c.value.some((v) => actual.includes(v));
    default:
      throw new Error(`demo firestore: unsupported operator "${c.op}"`);
  }
}

function runQuery(q: Query | CollectionRef): Doc[] {
  const constraints = q.__kind === 'query' ? q.constraints : [];
  let rows = store.all(q.path);

  for (const c of constraints) {
    if (c.type === 'where') rows = rows.filter((r) => matches(r, c));
  }
  for (const c of constraints) {
    if (c.type === 'orderBy') {
      rows.sort((a, b) => {
        const av = valueAt(a, c.field);
        const bv = valueAt(b, c.field);
        if (av === bv) return 0;
        const cmp = av > bv ? 1 : -1;
        return c.dir === 'desc' ? -cmp : cmp;
      });
    }
  }
  for (const c of constraints) {
    if (c.type === 'limit') rows = rows.slice(0, c.n);
  }
  return rows;
}

// --- snapshots ---------------------------------------------------------

function docSnap(path: string, id: string, data: Doc | undefined) {
  return {
    id,
    ref: { __kind: 'doc', path, id } as DocRef,
    exists: () => data !== undefined,
    data: () => (data ? { ...data } : undefined),
  };
}

export async function getDoc(ref: DocRef) {
  return docSnap(ref.path, ref.id, store.get(ref.path, ref.id));
}

export async function getDocs(q: Query | CollectionRef) {
  const rows = runQuery(q);
  const docs = rows.map((r) => docSnap(q.path, r.id, r));
  return {
    docs,
    size: docs.length,
    empty: docs.length === 0,
    forEach: (fn: (d: (typeof docs)[number]) => void) => docs.forEach(fn),
  };
}

// --- writes ------------------------------------------------------------

export async function addDoc(ref: CollectionRef, data: Record<string, any>) {
  const id = store.add(ref.path, data);
  return { __kind: 'doc', path: ref.path, id } as DocRef;
}

/**
 * `setDoc(ref, data)` replaces the document; `setDoc(ref, data, { merge: true })`
 * merges into it. The app relies on the merge form in agreementStore and
 * attendanceStore — treating it as a replace silently drops fields.
 */
export async function setDoc(ref: DocRef, data: Record<string, any>, options?: { merge?: boolean }) {
  if (options?.merge && store.get(ref.path, ref.id)) {
    store.update(ref.path, ref.id, data);
    return;
  }
  store.set(ref.path, ref.id, data);
}

export async function updateDoc(ref: DocRef, patch: Record<string, any>) {
  store.update(ref.path, ref.id, patch);
}

export async function deleteDoc(ref: DocRef) {
  store.remove(ref.path, ref.id);
}

export function writeBatch(_db?: unknown) {
  const ops: Array<() => void> = [];
  const batch = {
    set(ref: DocRef, data: Record<string, any>) {
      ops.push(() => store.set(ref.path, ref.id, data));
      return batch;
    },
    update(ref: DocRef, patch: Record<string, any>) {
      ops.push(() => store.update(ref.path, ref.id, patch));
      return batch;
    },
    delete(ref: DocRef) {
      ops.push(() => store.remove(ref.path, ref.id));
      return batch;
    },
    async commit() {
      ops.forEach((op) => op());
      ops.length = 0;
    },
  };
  return batch;
}

// --- field values ------------------------------------------------------

// --- realtime -----------------------------------------------------------

type SnapHandler = ((snap: any) => void) | { next?: (snap: any) => void; error?: (e: any) => void };

function callHandler(handler: SnapHandler, snap: any) {
  if (typeof handler === 'function') handler(snap);
  else handler.next?.(snap);
}

/**
 * Supports both shapes the app uses:
 *   onSnapshot(query|collection, cb)
 *   onSnapshot(docRef, cb)
 * Fires immediately, then again on any write to that collection.
 */
export function onSnapshot(target: Query | CollectionRef | DocRef, handler: SnapHandler, _err?: unknown) {
  const path = target.path;

  const emit = () => {
    if (target.__kind === 'doc') {
      const ref = target as DocRef;
      callHandler(handler, docSnap(ref.path, ref.id, store.get(ref.path, ref.id)));
    } else {
      const rows = runQuery(target as Query | CollectionRef);
      const docs = rows.map((r) => docSnap(path, r.id, r));
      callHandler(handler, {
        docs,
        size: docs.length,
        empty: docs.length === 0,
        forEach: (fn: (d: (typeof docs)[number]) => void) => docs.forEach(fn),
      });
    }
  };

  setTimeout(emit, 0);
  return store.watch(path, emit);
}

// --- transactions -------------------------------------------------------

/**
 * There is no concurrency here — a single browser tab against an in-memory
 * map — so a "transaction" just runs the body against the store directly.
 */
export async function runTransaction<T>(
  _db: unknown,
  updateFn: (tx: {
    get: (ref: DocRef) => Promise<ReturnType<typeof docSnap>>;
    set: (ref: DocRef, data: Record<string, any>) => void;
    update: (ref: DocRef, patch: Record<string, any>) => void;
    delete: (ref: DocRef) => void;
  }) => Promise<T>
): Promise<T> {
  return updateFn({
    get: async (ref) => docSnap(ref.path, ref.id, store.get(ref.path, ref.id)),
    set: (ref, data) => store.set(ref.path, ref.id, data),
    update: (ref, patch) => store.update(ref.path, ref.id, patch),
    delete: (ref) => store.remove(ref.path, ref.id),
  });
}

/** Emulator wiring is a no-op — this build has no backend to connect to. */
export function connectFirestoreEmulator(..._args: any[]) {}

export function serverTimestamp() {
  return { [SENTINEL]: true, kind: 'serverTimestamp' } as any;
}

export function arrayUnion(...values: any[]) {
  return { [SENTINEL]: true, kind: 'arrayUnion', values } as any;
}

export function arrayRemove(...values: any[]) {
  return { [SENTINEL]: true, kind: 'arrayRemove', values } as any;
}

export const Timestamp = {
  now: () => ({ toMillis: () => Date.now(), toDate: () => new Date() }),
  fromMillis: (ms: number) => ({ toMillis: () => ms, toDate: () => new Date(ms) }),
};
