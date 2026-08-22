import {
  setDoc as fbSetDoc,
  updateDoc as fbUpdateDoc,
  addDoc as fbAddDoc,
} from 'firebase/firestore';
// Types only - kept in a separate `import type` so the bundler drops the line
// entirely. The sales demo swaps `firebase/firestore` for a stand-in that has
// no such types, and a value import of them would break its build.
import type {
  DocumentReference,
  CollectionReference,
  SetOptions,
} from 'firebase/firestore';

/**
 * Firestore rejects `undefined` outright and fails the whole write, so a single
 * blank optional field on a form takes down the entire save. That produced two
 * separate user-facing crashes ("Add Purchase" and "Save Agreement") from the
 * same cause, in different screens.
 *
 * Rather than remembering to guard at each of the ~46 write sites, every write
 * goes through here and blank values are stripped first. Nested objects and
 * arrays are cleaned too, since a line item or payment-schedule row can carry
 * an undefined just as easily as a top-level field.
 *
 * `null` is deliberately left alone - Firestore accepts it, and it is the
 * correct way to explicitly clear a stored field.
 */
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(stripUndefined) as unknown as T;
  }

  // Leave class instances (Timestamp, FieldValue, GeoPoint, DocumentReference,
  // Date) untouched - rebuilding them as plain objects would corrupt them.
  if (
    value === null ||
    typeof value !== 'object' ||
    value instanceof Date ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return value;
  }

  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    if (v === undefined) continue;
    out[key] = stripUndefined(v);
  }
  return out as T;
}

/** setDoc with blank values removed. Use instead of the Firestore import. */
export function setDocSafe(ref: DocumentReference, data: any, options?: SetOptions) {
  return options
    ? fbSetDoc(ref, stripUndefined(data), options)
    : fbSetDoc(ref, stripUndefined(data));
}

/** updateDoc with blank values removed. */
export function updateDocSafe(ref: DocumentReference, data: any) {
  return fbUpdateDoc(ref, stripUndefined(data));
}

/** addDoc with blank values removed. */
export function addDocSafe(ref: CollectionReference, data: any) {
  return fbAddDoc(ref, stripUndefined(data));
}
