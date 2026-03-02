/**
 * Global Context System
 * This module provides a secondary state management bridge.
 * NOTE: Often used alongside lib/store.ts for specific UI contexts.
 */

import { create } from 'zustand';

/**
 * Basic Chat structure for the context.
 */
interface Chat {
  id: string; // The chat identifier.
  title: string; // Display name.
  [key: string]: unknown; // Extensibility for dynamic properties.
}

/**
 * State and setter definitions for the context store.
 */
interface ChatStore {
  chats: Chat[]; // Array of chat records.
  setChats: (chats: Chat[]) => void; // Batch update chats.
  currentChat: Chat | null; // The chat currently being viewed.
  setCurrentChat: (chat: Chat | null) => void; // Update the viewing focus.
}

/**
 * Contextual Store Implementation.
 */
export const useChatStore = create<ChatStore>((set) => ({
  chats: [],
  currentChat: null,

  // Set the collection of chats in the context.
  setChats: (chats) => set({ chats }),

  // Update the currently active/selected chat.
  setCurrentChat: (chat) => set({ currentChat: chat }),
}));
