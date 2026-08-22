import { create } from 'zustand';
import { db } from '../lib/firebase';
import { collection, doc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, runTransaction } from 'firebase/firestore';
import { setDocSafe as setDoc, updateDocSafe as updateDoc } from '../lib/firestoreSafe';
import { Notification } from '../types';

interface NotificationState {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  subscribeNotifications: () => () => void;
  createNotification: (data: Omit<Notification, 'id' | 'createdAt'>) => Promise<void>;
  /**
   * Creates a notification with a fixed, caller-chosen id, and does nothing
   * if one already exists. Used for anything that gets re-evaluated on every
   * app load (like bill due-date reminders): a plain "does one already exist
   * in local state?" check races against Firestore's snapshot delivery
   * (an initial cached snapshot, then a server-confirmed one, both trigger
   * the check before the first write has round-tripped back), so the same
   * reminder can get created several times over. A transaction against a
   * deterministic id closes that race - only one of any number of
   * concurrent callers actually creates the document.
   */
  createIfNotExists: (id: string, data: Omit<Notification, 'id' | 'createdAt'>) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  loading: false,
  error: null,
  
  subscribeNotifications: () => {
    set({ loading: true, error: null });
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notification[];
      set({ notifications, loading: false });
    }, (error) => {
      console.error("Error subscribing to notifications:", error);
      set({ error: error.message, loading: false });
    });

    return unsubscribe;
  },

  createNotification: async (data) => {
    try {
      const newRef = doc(collection(db, 'notifications'));
      await setDoc(newRef, {
        ...data,
        createdAt: serverTimestamp(),
      });
    } catch (error: any) {
      console.error('Error creating notification:', error);
      throw error;
    }
  },

  createIfNotExists: async (id, data) => {
    try {
      const ref = doc(db, 'notifications', id);
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists()) return;
        tx.set(ref, { ...data, createdAt: serverTimestamp() });
      });
    } catch (error: any) {
      console.error('Error creating notification:', error);
      throw error;
    }
  },

  markAsRead: async (id) => {
    try {
      const docRef = doc(db, 'notifications', id);
      await updateDoc(docRef, {
        isRead: true
      });
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  markAllAsRead: async () => {
    try {
      const unread = get().notifications.filter(n => !n.isRead);
      await Promise.all(
        unread.map(n => updateDoc(doc(db, 'notifications', n.id), { isRead: true }))
      );
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  deleteNotification: async (id) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }
}));
