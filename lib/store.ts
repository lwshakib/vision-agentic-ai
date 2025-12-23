import { create } from "zustand";

interface Chat {
  id: string;
  title: string;
  url: string;
}

interface ChatStore {
  chatTitles: Record<string, string>;
  chats: Chat[];
  setChatTitle: (chatId: string, title: string) => void;
  addChat: (chat: Chat) => void;
  setChats: (chats: Chat[]) => void;
  deleteChat: (chatId: string) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  chatTitles: {},
  chats: [],
  setChatTitle: (chatId, title) =>
    set((state) => ({
      chatTitles: { ...state.chatTitles, [chatId]: title },
      chats: state.chats.map((c) => (c.id === chatId ? { ...c, title } : c)),
    })),
  addChat: (chat) =>
    set((state) => {
      if (state.chats.some((c) => c.id === chat.id)) return state;
      return { chats: [chat, ...state.chats] };
    }),
  setChats: (chats) => set({ chats }),
  deleteChat: (chatId) =>
    set((state) => ({
      chats: state.chats.filter((c) => c.id !== chatId),
      chatTitles: Object.fromEntries(
        Object.entries(state.chatTitles).filter(([key]) => key !== chatId)
      ),
    })),
}));
