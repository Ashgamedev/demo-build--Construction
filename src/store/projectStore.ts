// @ts-nocheck
import { create } from 'zustand';
import { db } from '../lib/firebase';
import { 
  collection, doc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { setDocSafe as setDoc, updateDocSafe as updateDoc } from '../lib/firestoreSafe';
import { Project } from '../types';

interface ProjectState {
  projects: Project[];
  loading: boolean;
  error: string | null;
  subscribeProjects: () => () => void;
  createProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  loading: true,
  error: null,
  
  subscribeProjects: () => {
    set({ loading: true });
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const projects = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Project[];
        set({ projects, loading: false, error: null });
      },
      (error) => {
        console.error('Error fetching projects:', error);
        set({ error: error.message, loading: false });
      }
    );
    return unsubscribe;
  },

  createProject: async (projectData) => {
    try {
      const newRef = doc(collection(db, 'projects'));
      await setDoc(newRef, {
        ...projectData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error: any) {
      console.error('Error creating project:', error);
      throw new Error(error.message);
    }
  },

  updateProject: async (id, data) => {
    try {
      const ref = doc(db, 'projects', id);
      await updateDoc(ref, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (error: any) {
      console.error('Error updating project:', error);
      throw new Error(error.message);
    }
  },
}));

