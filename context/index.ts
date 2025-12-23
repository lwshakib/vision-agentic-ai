import { create } from "zustand";

interface ChatStore {
  chats: Array<any>;
  setChats: (chats: Array<any>) => void;
  currentChat: any;
  setCurrentChat: (chat: any) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  chats: [],
  currentChat: null,
  setChats: (chats) => set({ chats }),
  setCurrentChat: (chat) => set({ currentChat: chat }),
}));
