/**
 * Project Details Page
 * Displays information about a specific project, its associated chats,
 * and allows starting new chats within the project context.
 */

'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FolderKanban, MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import ChatInput from '@/components/chats/chat-input';
import { useChatStore } from '@/hooks/use-chat-store';
import Link from 'next/link';

/**
 * Type definition for file metadata from the input.
 */
type FileInfo = {
  url: string;
  name: string;
  type: string;
  publicId: string;
};

export default function ProjectPage() {
  const router = useRouter();
  const { projectId } = useParams() as { projectId: string };

  const [project, setProject] = React.useState<{ title: string } | null>(null);
  const [chats, setChats] = React.useState<
    { id: string; title: string; url: string }[]
  >([]);
  const [isLoading, setIsLoading] = React.useState(true);

  /**
   * Fetch project details and its chats.
   */
  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // Parallel fetch for project title and its chats.
      const [projectRes, chatsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/chats`),
      ]);

      if (!projectRes.ok || !chatsRes.ok) {
        if (projectRes.status === 404) {
          toast.error('Project not found');
          router.push('/');
          return;
        }
        throw new Error('Failed to fetch project data');
      }

      const projectData = await projectRes.json();
      const chatsData = await chatsRes.json();

      const mappedChats = chatsData.map(
        (c: { id: string; title?: string }) => ({
          id: c.id,
          title: c.title || 'Untitled chat',
          url: `/~/${c.id}`,
        }),
      );

      setProject({ title: projectData.title });
      setChats(mappedChats);

      // Synchronize with global sidebar store.
      useChatStore.getState().setProjectChats(projectId, mappedChats);
    } catch (error) {
      console.error('Error loading project:', error);
      toast.error('Failed to load project details');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, router]);

  React.useEffect(() => {
    if (projectId) {
      fetchData();
    }
  }, [projectId, fetchData]);

  /**
   * Handle starting a new chat within this project.
   */
  const handleSend = async (message: string, files?: FileInfo[]) => {
    try {
      // Create a new chat session assigned to this project.
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      if (!res.ok) {
        throw new Error('Failed to create chat');
      }

      const data = await res.json();

      const chatEntry = {
        id: data.chatId,
        title: 'New chat',
        url: `/~/${data.chatId}`,
      };

      // Update the global store for the sidebar.
      useChatStore.getState().addProjectChat(projectId, chatEntry);

      // Update local state.
      setChats((prev) => [chatEntry, ...prev]);

      // Navigate to the new chat page with the initial message/files as params.
      const params = new URLSearchParams();
      params.set('message', message);
      if (files && files.length > 0) {
        params.set('files', encodeURIComponent(JSON.stringify(files)));
      }

      router.push(`/~/${data.chatId}?${params.toString()}`);
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start new chat');
    } finally {
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading project...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Centered Header with Project Icon and Title */}
      <header className="flex flex-col items-center justify-center pt-12 pb-8 px-4 text-center">
        <div className="flex items-center justify-center gap-6 mb-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <FolderKanban className="size-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {project?.title}
          </h1>
        </div>
        <p className="text-muted-foreground max-w-md mx-auto">
          Start a new conversation or view recent chats in this project.
        </p>
      </header>

      <main className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-4 pb-8 overflow-hidden">
        {/* Chat Input Area */}
        <div className="mb-12">
          <ChatInput
            onSend={handleSend}
            placeholder="Type a message to start a new chat in this project..."
          />
        </div>

        {/* Project Chats List */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4 border-b pb-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Project Chats
            </h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {chats.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {chats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-2xl bg-muted/30">
                <MessageSquare className="size-10 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">
                  No chats in this project yet.
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Start one above to keep your research organized.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 pb-4">
                {chats.map((chat) => (
                  <Link
                    key={chat.id}
                    href={chat.url}
                    className="group flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <MessageSquare className="size-4" />
                      </div>
                      <span className="font-medium truncate">{chat.title}</span>
                    </div>
                    <div className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Open &rarr;
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
