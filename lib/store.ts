import { create } from "zustand";

interface ChatStore {
  chatTitles: Record<string, string>;
  setChatTitle: (chatId: string, title: string) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  chatTitles: {},
  setChatTitle: (chatId, title) =>
    set((state) => ({
      chatTitles: { ...state.chatTitles, [chatId]: title },
    })),
}));
