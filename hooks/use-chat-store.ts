/**
 * Global State Management (Zustand)
 * This store manages UI-related chat data that needs to be synchronized
 * across different components (e.g., Sidebar and Main Chat View).
 */

import { create } from 'zustand';

/**
 * Interface representing a chat summary item.
 */
interface Chat {
  id: string; // Unique database ID.
  title: string; // The user-friendly title.
  url: string; // The relative navigation path.
}

/**
 * Interface representing a project item.
 */
interface Project {
  id: string;
  title: string;
  chats?: Chat[];
  isLoading?: boolean;
}

/**
 * Interface for the global Chat Store state and actions.
 */
interface ChatStore {
  chatTitles: Record<string, string>; // Local overrides for titles (useful for real-time updates).
  chats: Chat[]; // The master list of unassigned chats shown in the sidebar.
  projects: Project[]; // The list of projects and their nested chats.

  // Action to update the title of a specific chat session.
  setChatTitle: (chatId: string, title: string) => void;
  // Action to add a single new chat to the list.
  addChat: (chat: Chat) => void;
  // Action to replace the entire local chat collection.
  setChats: (chats: Chat[]) => void;
  // Action to remove a chat from the local state.
  deleteChat: (chatId: string) => void;

  // Project Actions
  setProjects: (projects: Project[]) => void;
  setProjectChats: (projectId: string, chats: Chat[]) => void;
  addProjectChat: (projectId: string, chat: Chat) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  removeProject: (projectId: string) => void;
}

/**
 * Hook-based store instance.
 */
export const useChatStore = create<ChatStore>((set) => ({
  chatTitles: {},
  chats: [],
  projects: [],

  /**
   * Updates a chat's title in both the lookup map and the list.
   */
  setChatTitle: (chatId, title) =>
    set((state) => ({
      chatTitles: { ...state.chatTitles, [chatId]: title },
      chats: state.chats.map((c) => (c.id === chatId ? { ...c, title } : c)),
      projects: state.projects.map((p) => ({
        ...p,
        chats: p.chats?.map((c) => (c.id === chatId ? { ...c, title } : c)),
      })),
    })),

  /**
   * Adds a new chat to the top of the list if it doesn't already exist.
   */
  addChat: (chat: Chat) =>
    set((state) => {
      if (state.chats.some((c) => c.id === chat.id)) return state;
      return { chats: [chat, ...state.chats] };
    }),

  /**
   * Overwrites the current chat list.
   */
  setChats: (chats) => set({ chats }),

  /**
   * Removes a chat and cleans up its title mapping.
   */
  deleteChat: (chatId) =>
    set((state) => ({
      chats: state.chats.filter((c) => c.id !== chatId),
      chatTitles: Object.fromEntries(
        Object.entries(state.chatTitles).filter(([key]) => key !== chatId),
      ),
      projects: state.projects.map((p) => ({
        ...p,
        chats: p.chats?.filter((c) => c.id !== chatId),
      })),
    })),

  /**
   * Overwrites the current projects list.
   */
  setProjects: (projects) => set({ projects }),

  /**
   * Sets chats for a specific project.
   */
  setProjectChats: (projectId, chats) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, chats, isLoading: false } : p,
      ),
    })),

  /**
   * Adds a chat to a specific project if it doesn't already exist.
   */
  addProjectChat: (projectId, chat) =>
    set((state) => ({
      projects: state.projects.map((p) => {
        if (p.id !== projectId) return p;
        const chats = p.chats || [];
        if (chats.some((c) => c.id === chat.id)) return p;
        return { ...p, chats: [chat, ...chats] };
      }),
    })),

  /**
   * Updates project metadata.
   */
  updateProject: (projectId, updates) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, ...updates } : p,
      ),
    })),

  /**
   * Removes a project from the list.
   */
  removeProject: (projectId) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== projectId),
    })),
}));
