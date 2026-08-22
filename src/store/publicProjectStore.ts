import { create } from 'zustand';
import { 
  collection, doc, getDocs, query, where, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { setDocSafe as setDoc } from '../lib/firestoreSafe';
import { db } from '../lib/firebase';
import { PublicProject } from '../types';

interface PublicProjectState {
  publicProjects: PublicProject[];
  loading: boolean;
  error: string | null;
  fetchPublicProjects: () => Promise<void>;
  publishProject: (project: Omit<PublicProject, 'id' | 'publishedAt' | 'updatedAt'>) => Promise<string>;
  unpublishProject: (id: string) => Promise<void>;
}

export const usePublicProjectStore = create<PublicProjectState>((set, get) => ({
  publicProjects: [],
  loading: false,
  error: null,

  fetchPublicProjects: async () => {
    set({ loading: true, error: null });
    try {
      const q = query(collection(db, 'publicProjects'), where('isPublished', '==', true));
      const querySnapshot = await getDocs(q);
      const projects = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PublicProject[];
      
      set({ publicProjects: projects, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  publishProject: async (projectData) => {
    set({ loading: true, error: null });
    try {
      // Create a slug from the title
      const baseSlug = projectData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      let slug = baseSlug;
      let counter = 1;
      
      // Ensure unique slug
      let docSnap = await getDoc(doc(db, 'publicProjects', slug));
      while (docSnap.exists() && docSnap.data().internalProjectId !== projectData.internalProjectId) {
        slug = `${baseSlug}-${counter}`;
        counter++;
        docSnap = await getDoc(doc(db, 'publicProjects', slug));
      }

      const docRef = doc(db, 'publicProjects', slug);
      
      const newProject = {
        ...projectData,
        id: slug,
        publishedAt: Date.now(),
        updatedAt: Date.now()
      };

      await setDoc(docRef, newProject);
      
      // Update local state
      const currentProjects = get().publicProjects.filter(p => p.id !== slug);
      set({ 
        publicProjects: [...currentProjects, newProject as PublicProject],
        loading: false 
      });
      
      return slug;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  unpublishProject: async (id) => {
    set({ loading: true, error: null });
    try {
      await deleteDoc(doc(db, 'publicProjects', id));
      set(state => ({
        publicProjects: state.publicProjects.filter(p => p.id !== id),
        loading: false
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  }
}));
