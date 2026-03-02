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
 * Interface for the global Chat Store state and actions.
 */
interface ChatStore {
  chatTitles: Record<string, string>; // Local overrides for titles (useful for real-time updates).
  chats: Chat[]; // The master list of unassigned chats shown in the sidebar.

  // Action to update the title of a specific chat session.
  setChatTitle: (chatId: string, title: string) => void;
  // Action to add a single new chat to the list.
  addChat: (chat: Chat) => void;
  // Action to replace the entire local chat collection.
  setChats: (chats: Chat[]) => void;
  // Action to remove a chat from the local state.
  deleteChat: (chatId: string) => void;
}

/**
 * Hook-based store instance.
 */
export const useChatStore = create<ChatStore>((set) => ({
  chatTitles: {},
  chats: [],

  /**
   * Updates a chat's title in both the lookup map and the list.
   */
  setChatTitle: (chatId, title) =>
    set((state) => ({
      chatTitles: { ...state.chatTitles, [chatId]: title },
      chats: state.chats.map((c) => (c.id === chatId ? { ...c, title } : c)),
    })),

  /**
   * Adds a new chat to the top of the list if it doesn't already exist.
   */
  addChat: (chat) =>
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
    })),
}));
