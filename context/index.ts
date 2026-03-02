import { create } from 'zustand';

interface Chat {
  id: string;
  title: string;
  [key: string]: unknown;
}

interface ChatStore {
  chats: Chat[];
  setChats: (chats: Chat[]) => void;
  currentChat: Chat | null;
  setCurrentChat: (chat: Chat | null) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  chats: [],
  currentChat: null,
  setChats: (chats) => set({ chats }),
  setCurrentChat: (chat) => set({ currentChat: chat }),
}));
