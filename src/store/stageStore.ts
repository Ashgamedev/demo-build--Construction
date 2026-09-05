import { create } from 'zustand';
import { db } from '../lib/firebase';
import { currentActor } from '../lib/audit';
import { 
  collection, doc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { setDocSafe as setDoc, updateDocSafe as updateDoc } from '../lib/firestoreSafe';
import { ProjectStage, ProjectTask } from '../types';
import { computeProjectProgress } from '../lib/progress';
import { useProjectStore } from './projectStore';

interface StageState {
  stages: Record<string, ProjectStage[]>; // Map of projectId to stages
  loading: boolean;
  error: string | null;
  subscribeStages: (projectId: string) => () => void;
  addStage: (projectId: string, stage: Omit<ProjectStage, 'id'>) => Promise<void>;
  updateStage: (projectId: string, stageId: string, data: Partial<ProjectStage>) => Promise<void>;
  removeStage: (projectId: string, stageId: string) => Promise<void>;
  reorderStages: (projectId: string, orderedStageIds: string[]) => Promise<void>;
  addTask: (projectId: string, stageId: string, task: Omit<ProjectTask, 'id'>) => Promise<void>;
  updateTask: (projectId: string, stageId: string, taskId: string, data: Partial<ProjectTask>) => Promise<void>;
  removeTask: (projectId: string, stageId: string, taskId: string) => Promise<void>;
  reorderTasks: (projectId: string, stageId: string, orderedTaskIds: string[]) => Promise<void>;
}

export const useStageStore = create<StageState>((set, get) => ({
  stages: {},
  loading: false,
  error: null,
  
  subscribeStages: (projectId: string) => {
    set({ loading: true });
    
    // Subscribe to projects/{projectId}/stages
    const q = query(
      collection(db, `projects/${projectId}/stages`),
      orderBy('order', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const projectStages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ProjectStage[];
        
        set((state) => ({
          stages: { ...state.stages, [projectId]: projectStages },
          loading: false,
          error: null
        }));

        // Progress is now driven by the stages. Recompute it and, if it has
        // moved, persist it onto the project so every screen that already reads
        // project.progressPercentage (dashboard, list, reports) stays correct
        // without each having to know about stages. Writing the project doc
        // does not re-trigger this stage subscription, so there's no loop.
        // Only runs when the project is loaded in the project store and only
        // writes on an actual change.
        const auto = computeProjectProgress(projectStages);
        if (auto !== null) {
          const projStore = useProjectStore.getState();
          const proj = projStore.projects.find(p => p.id === projectId);
          if (proj && proj.progressPercentage !== auto) {
            projStore.updateProject(projectId, { progressPercentage: auto }).catch(() => {
              /* non-fatal: a permissions or offline error here just means the
                 stored number lags; the live screens still compute from stages */
            });
          }
        }
      },
      (error) => {
        console.error('Error fetching stages:', error);
        set({ error: error.message, loading: false });
      }
    );
    return unsubscribe;
  },

  addStage: async (projectId, stageData) => {
    try {
      const newRef = doc(collection(db, `projects/${projectId}/stages`));
      await setDoc(newRef, {
        ...stageData,
        createdBy: currentActor().id,
        createdAt: serverTimestamp(),
      });
    } catch (error: any) {
      console.error('Error adding stage:', error);
      throw new Error(error.message);
    }
  },

  updateStage: async (projectId, stageId, data) => {
    try {
      const ref = doc(db, `projects/${projectId}/stages`, stageId);
      await updateDoc(ref, {
        ...data,
        updatedBy: currentActor().id,
        updatedAt: serverTimestamp(),
      });
    } catch (error: any) {
      console.error('Error updating stage:', error);
      throw new Error(error.message);
    }
  },

  removeStage: async (projectId, stageId) => {
    try {
      // In a real app, you might want to archive rather than delete if there are linked records
      const ref = doc(db, `projects/${projectId}/stages`, stageId);
      await deleteDoc(ref);
    } catch (error: any) {
      console.error('Error removing stage:', error);
      throw new Error(error.message);
    }
  },
  
  reorderStages: async (projectId, orderedStageIds) => {
    try {
      // Create a batch or just loop through and update order
      const promises = orderedStageIds.map((id, index) => {
        const ref = doc(db, `projects/${projectId}/stages`, id);
        return updateDoc(ref, { order: index });
      });
      await Promise.all(promises);
    } catch (error: any) {
      console.error('Error reordering stages:', error);
      throw new Error(error.message);
    }
  },

  addTask: async (projectId, stageId, taskData) => {
    try {
      const state = get();
      const stage = state.stages[projectId]?.find(s => s.id === stageId);
      if (!stage) throw new Error("Stage not found");
      
      const newTask = { ...taskData, id: crypto.randomUUID() };
      const tasks = [...(stage.tasks || []), newTask];
      await get().updateStage(projectId, stageId, { tasks });
    } catch (e: any) { throw new Error(e.message); }
  },
  
  updateTask: async (projectId, stageId, taskId, data) => {
    try {
      const state = get();
      const stage = state.stages[projectId]?.find(s => s.id === stageId);
      if (!stage) throw new Error("Stage not found");
      
      const tasks = (stage.tasks || []).map(t => t.id === taskId ? { ...t, ...data } : t);
      await get().updateStage(projectId, stageId, { tasks });
    } catch (e: any) { throw new Error(e.message); }
  },
  
  removeTask: async (projectId, stageId, taskId) => {
    try {
      const state = get();
      const stage = state.stages[projectId]?.find(s => s.id === stageId);
      if (!stage) throw new Error("Stage not found");
      
      const tasks = (stage.tasks || []).filter(t => t.id !== taskId);
      await get().updateStage(projectId, stageId, { tasks });
    } catch (e: any) { throw new Error(e.message); }
  },

  reorderTasks: async (projectId, stageId, orderedTaskIds) => {
    try {
      const state = get();
      const stage = state.stages[projectId]?.find(s => s.id === stageId);
      if (!stage || !stage.tasks) throw new Error("Stage or tasks not found");
      
      const tasks = [...stage.tasks].sort((a, b) => orderedTaskIds.indexOf(a.id) - orderedTaskIds.indexOf(b.id));
      tasks.forEach((t, i) => t.order = i);
      await get().updateStage(projectId, stageId, { tasks });
    } catch (e: any) { throw new Error(e.message); }
  }
}));
