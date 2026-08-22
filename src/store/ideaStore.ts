import { create } from 'zustand';
import { db, storage } from '../lib/firebase';
import { 
  collection, doc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { setDocSafe as setDoc, updateDocSafe as updateDoc } from '../lib/firestoreSafe';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { ProjectIdea } from '../types';

interface IdeaState {
  ideas: Record<string, ProjectIdea[]>; // Map of projectId to ideas
  loading: boolean;
  error: string | null;
  subscribeIdeas: (projectId: string) => () => void;
  addIdea: (projectId: string, idea: Omit<ProjectIdea, 'id' | 'createdAt' | 'imageUrl'>, imageFile?: File) => Promise<void>;
  updateIdeaStatus: (projectId: string, ideaId: string, status: ProjectIdea['status']) => Promise<void>;
  removeIdea: (projectId: string, ideaId: string, imageUrl?: string) => Promise<void>;
}

export const useIdeaStore = create<IdeaState>((set) => ({
  ideas: {},
  loading: false,
  error: null,
  
  subscribeIdeas: (projectId: string) => {
    set({ loading: true });
    const q = query(
      collection(db, `projects/${projectId}/ideas`),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const projectIdeas = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ProjectIdea[];
        
        set((state) => ({ 
          ideas: { ...state.ideas, [projectId]: projectIdeas },
          loading: false, 
          error: null 
        }));
      },
      (error) => {
        console.error('Error fetching ideas:', error);
        set({ error: error.message, loading: false });
      }
    );
    return unsubscribe;
  },

  addIdea: async (projectId, ideaData, imageFile) => {
    try {
      const newRef = doc(collection(db, `projects/${projectId}/ideas`));
      let imageUrl = '';

      if (imageFile) {
        const storageRef = ref(storage, `projects/${projectId}/ideas/${newRef.id}_${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(storageRef);
      }

      await setDoc(newRef, {
        ...ideaData,
        imageUrl,
        createdAt: Date.now(),
      });
    } catch (error: any) {
      console.error('Error adding idea:', error);
      throw new Error(error.message);
    }
  },

  updateIdeaStatus: async (projectId, ideaId, status) => {
    try {
      const docRef = doc(db, `projects/${projectId}/ideas`, ideaId);
      await updateDoc(docRef, { status, updatedAt: serverTimestamp() });
    } catch (error: any) {
      console.error('Error updating idea:', error);
      throw new Error(error.message);
    }
  },

  removeIdea: async (projectId, ideaId, imageUrl) => {
    try {
      if (imageUrl) {
        try {
          const imageRef = ref(storage, imageUrl);
          await deleteObject(imageRef);
        } catch (e) {
          console.warn('Failed to delete image from storage:', e);
        }
      }
      const docRef = doc(db, `projects/${projectId}/ideas`, ideaId);
      await deleteDoc(docRef);
    } catch (error: any) {
      console.error('Error removing idea:', error);
      throw new Error(error.message);
    }
  }
}));
