/**
 * Stand-in for `firebase/storage`.
 *
 * Technicians attach voice notes and part photos to jobs. In the demo those
 * uploads are kept as object URLs in the browser for the length of the session,
 * so the flow can be shown end to end without any storage bucket existing.
 */

export interface StorageRef {
  __kind: 'storageRef';
  path: string;
}

const blobs = new Map<string, string>();

export function connectStorageEmulator(..._args: any[]) {}

export function getStorage(_app?: unknown) {
  return { __kind: 'storage' } as const;
}

export function ref(_storage: unknown, path: string): StorageRef {
  return { __kind: 'storageRef', path };
}

export async function uploadBytes(reference: StorageRef, data: Blob | Uint8Array) {
  const blob = data instanceof Blob ? data : new Blob([data as BlobPart]);
  blobs.set(reference.path, URL.createObjectURL(blob));
  return { ref: reference };
}

export async function getDownloadURL(reference: StorageRef) {
  return blobs.get(reference.path) ?? '';
}

export async function deleteObject(reference: StorageRef) {
  const url = blobs.get(reference.path);
  if (url) URL.revokeObjectURL(url);
  blobs.delete(reference.path);
}
