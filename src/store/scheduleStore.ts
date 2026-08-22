/**
 * Schedule activities for a project, stored at projects/{projectId}/schedule.
 *
 * Mirrors stageStore's shape on purpose - same subscribe-per-project pattern,
 * same realtime behaviour - so there is one way to do this in the codebase
 * rather than two.
 *
 * No dates are written here. The store holds durations and dependencies; dates
 * come from `lib/cpm.ts` at read time. See `useProjectSchedule` below, which is
 * what screens should actually use.
 */
import { create } from 'zustand';
import { useMemo } from 'react';
import { db } from '../lib/firebase';
import { currentActor } from '../lib/audit';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { ScheduleActivity } from '../types';
import {
  computeSchedule,
  ScheduleResult,
  WorkCalendar,
  DEFAULT_CALENDAR,
} from '../lib/cpm';

interface ScheduleState {
  activities: Record<string, ScheduleActivity[]>; // projectId -> activities
  loading: boolean;
  error: string | null;
  subscribeSchedule: (projectId: string) => () => void;
  addActivity: (projectId: string, data: Omit<ScheduleActivity, 'id' | 'projectId'>) => Promise<string>;
  updateActivity: (projectId: string, activityId: string, data: Partial<ScheduleActivity>) => Promise<void>;
  removeActivity: (projectId: string, activityId: string) => Promise<void>;
  reorderActivities: (projectId: string, orderedIds: string[]) => Promise<void>;
  /** Freezes today's calculated dates as the plan to be judged against later. */
  setBaseline: (projectId: string, dated: { id: string; start: number; finish: number }[]) => Promise<void>;
  clearBaseline: (projectId: string) => Promise<void>;
}

const path = (projectId: string) => `projects/${projectId}/schedule`;

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  activities: {},
  loading: false,
  error: null,

  subscribeSchedule: (projectId: string) => {
    set({ loading: true });
    const q = query(collection(db, path(projectId)), orderBy('order', 'asc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() })) as ScheduleActivity[];
        set((state) => ({
          activities: { ...state.activities, [projectId]: list },
          loading: false,
          error: null,
        }));
      },
      (error: any) => {
        console.error('Error fetching schedule:', error);
        set({ error: error.message, loading: false });
      },
    );
  },

  addActivity: async (projectId, data) => {
    const ref = doc(collection(db, path(projectId)));
    await setDoc(ref, {
      ...data,
      projectId,
      predecessors: data.predecessors ?? [],
      percentComplete: data.percentComplete ?? 0,
      createdBy: currentActor().id,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  },

  updateActivity: async (projectId, activityId, data) => {
    await updateDoc(doc(db, path(projectId), activityId), {
      ...data,
      updatedBy: currentActor().id,
      updatedAt: serverTimestamp(),
    });
  },

  removeActivity: async (projectId, activityId) => {
    // Strip the activity out of everyone else's predecessor list first.
    // Skipping this leaves dangling links that the engine reports as broken,
    // which reads as a bug to anyone watching a demo.
    const list = get().activities[projectId] ?? [];
    const dependents = list.filter((a) =>
      (a.predecessors || []).some((l) => l.predecessorId === activityId),
    );
    await Promise.all(
      dependents.map((a) =>
        updateDoc(doc(db, path(projectId), a.id), {
          predecessors: (a.predecessors || []).filter((l) => l.predecessorId !== activityId),
        }),
      ),
    );
    await deleteDoc(doc(db, path(projectId), activityId));
  },

  reorderActivities: async (projectId, orderedIds) => {
    await Promise.all(
      orderedIds.map((id, index) =>
        updateDoc(doc(db, path(projectId), id), { order: index + 1 }),
      ),
    );
  },

  setBaseline: async (projectId, dated) => {
    await Promise.all(
      dated.map((d) =>
        updateDoc(doc(db, path(projectId), d.id), {
          baselineStart: d.start,
          baselineFinish: d.finish,
        }),
      ),
    );
  },

  clearBaseline: async (projectId) => {
    const list = get().activities[projectId] ?? [];
    await Promise.all(
      list.map((a) =>
        updateDoc(doc(db, path(projectId), a.id), {
          baselineStart: null,
          baselineFinish: null,
        } as any),
      ),
    );
  },
}));

/**
 * The calculated schedule for one project.
 *
 * Screens should use this rather than reading `activities` directly - it is the
 * single place the CPM pass is run, memoised so a Gantt with sixty bars does
 * not recompute on every unrelated render.
 */
export function useProjectSchedule(
  projectId: string | undefined,
  projectStart: number | undefined,
  options?: { calendar?: WorkCalendar; baselineFinishDate?: number },
): ScheduleResult {
  const activities = useScheduleStore((s) => (projectId ? s.activities[projectId] : undefined));
  const calendar = options?.calendar ?? DEFAULT_CALENDAR;
  const baselineFinishDate = options?.baselineFinishDate;

  return useMemo(
    () =>
      computeSchedule(activities ?? [], {
        projectStart: projectStart ?? Date.now(),
        calendar,
        baselineFinishDate,
      }),
    [activities, projectStart, calendar, baselineFinishDate],
  );
}
