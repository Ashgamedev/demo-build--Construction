/**
 * In-memory demo database.
 *
 * This build has NO backend. Every collection lives in this module, seeded fresh
 * on page load from `seed.ts`. That is deliberate:
 *
 *   - it runs offline, so a demo at a customer's shop never depends on signal
 *   - there are no credentials in the bundle and no real data anywhere
 *   - a refresh always restores a perfect demo state, so nothing gets left broken
 *
 * `firebase/firestore`, `firebase/auth` and `firebase/storage` are aliased in
 * vite.config.ts to the shims beside this file, so no page or component needed
 * to change.
 */

export type Doc = Record<string, any> & { id: string };

const collections = new Map<string, Map<string, Doc>>();

function bucket(name: string): Map<string, Doc> {
  let c = collections.get(name);
  if (!c) {
    c = new Map();
    collections.set(name, c);
  }
  return c;
}

let idCounter = 0;
export function newId(prefix = 'demo'): string {
  idCounter += 1;
  return `${prefix}_${idCounter.toString().padStart(5, '0')}`;
}

/**
 * Live listeners, so `onSnapshot` behaves like the real thing: this app is
 * built around realtime stores, and a write in one screen has to show up in
 * another without a reload.
 */
const watchers = new Map<string, Set<() => void>>();

function notify(name: string): void {
  watchers.get(name)?.forEach((fn) => fn());
}

export const store = {
  all(name: string): Doc[] {
    return Array.from(bucket(name).values()).map((d) => ({ ...d }));
  },

  get(name: string, id: string): Doc | undefined {
    const d = bucket(name).get(id);
    return d ? { ...d } : undefined;
  },

  set(name: string, id: string, data: Record<string, any>): void {
    bucket(name).set(id, { ...data, id });
    notify(name);
  },

  add(name: string, data: Record<string, any>): string {
    const id = data.id ?? newId(name);
    bucket(name).set(id, { ...data, id });
    notify(name);
    return id;
  },

  update(name: string, id: string, patch: Record<string, any>): void {
    const existing = bucket(name).get(id);
    if (!existing) return;
    bucket(name).set(id, applyPatch(existing, patch));
    notify(name);
  },

  remove(name: string, id: string): void {
    bucket(name).delete(id);
    notify(name);
  },

  /** Returns an unsubscribe function, matching onSnapshot's contract. */
  watch(name: string, cb: () => void): () => void {
    let set = watchers.get(name);
    if (!set) {
      set = new Set();
      watchers.set(name, set);
    }
    set.add(cb);
    return () => set!.delete(cb);
  },

  reset(): void {
    collections.clear();
    idCounter = 0;
  },
};

/** Sentinels returned by arrayUnion / arrayRemove / serverTimestamp. */
export const SENTINEL = Symbol('demo-sentinel');

export function applyPatch(existing: Doc, patch: Record<string, any>): Doc {
  const next: Doc = { ...existing };
  for (const [rawKey, rawValue] of Object.entries(patch)) {
    let value = rawValue;

    if (value && typeof value === 'object' && (value as any)[SENTINEL]) {
      const s = value as any;
      if (s.kind === 'serverTimestamp') {
        value = Date.now();
      } else {
        const current: any[] = Array.isArray(next[rawKey]) ? next[rawKey] : [];
        value =
          s.kind === 'arrayUnion'
            ? [...current, ...s.values.filter((v: any) => !current.includes(v))]
            : current.filter((v: any) => !s.values.includes(v));
      }
    }

    // Firestore treats dotted keys as nested paths.
    if (rawKey.includes('.')) {
      const parts = rawKey.split('.');
      let cursor: any = next;
      for (let i = 0; i < parts.length - 1; i += 1) {
        cursor[parts[i]] = { ...(cursor[parts[i]] ?? {}) };
        cursor = cursor[parts[i]];
      }
      cursor[parts[parts.length - 1]] = value;
    } else {
      next[rawKey] = value;
    }
  }
  return next;
}
