import { useAuthStore } from '../store/authStore';

/**
 * Who is performing the current action.
 *
 * Records used to be stamped with the literal strings 'current-user', 'system'
 * or 'mock-user-id', which made it impossible to answer "who entered this?" —
 * a question the business genuinely needs for purchases and payments.
 *
 * These read the auth store directly rather than taking a hook argument, so
 * they work inside Zustand stores and plain functions as well as components.
 */
export function currentActor(): { id: string; name: string } {
  const user = useAuthStore.getState().user;
  if (!user) return { id: 'unknown', name: 'Unknown user' };
  return { id: user.id, name: user.name || user.email || 'Unknown user' };
}

/** Fields stamped on every newly created record. */
export function createdStamp() {
  const actor = currentActor();
  const now = Date.now();
  return {
    createdAt: now,
    createdBy: actor.id,
    createdByName: actor.name,
    updatedAt: now,
    updatedBy: actor.id,
    updatedByName: actor.name,
  };
}

/** Fields stamped when an existing record is modified. */
export function updatedStamp() {
  const actor = currentActor();
  return {
    updatedAt: Date.now(),
    updatedBy: actor.id,
    updatedByName: actor.name,
  };
}
