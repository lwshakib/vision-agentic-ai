/**
 * AppSidebar Component
 * This is the primary navigation sidebar for the application.
 * It manages state for chats, projects, navigation links, and provides
 * functionality for creating, moving, and deleting items.
 */

'use client';

import * as React from 'react';
// Import a set of polished icons from the Lucide React library.
import {
  BookOpen,
  Clock,
  MessageSquarePlus,
  Search,
  SquareTerminal,
} from 'lucide-react';

// Import specialized sub-navigation components.
import { NavMain } from '@/components/nav-main';
import { NavProjects } from '@/components/nav-projects';
import { NavChats } from '@/components/nav-chats';
import { NavUser } from '@/components/nav-user';
// Import core UI primitives for buttons, inputs, and feedback.
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Import the specialized sidebar system components.
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuSkeleton,
} from '@/components/ui/sidebar';
// Import utility for toast notifications.
import { toast } from 'sonner';
// Import Next.js router for programmatic navigation.
import { useRouter } from 'next/navigation';

// Import local UI extensions.
import { ScrollArea } from '@/components/ui/scroll-area';
import { Logo } from './logo';
// Import global state store for chat-related data.
import { useChatStore } from '@/lib/store';

/**
 * Static navigation data for consistently rendered links.
 */
const data = {
  user: {
    name: 'shadcn',
    email: 'm@example.com',
    avatar: '/avatars/shadcn.jpg',
  },
  navMain: [
    {
      title: 'New Chat',
      url: '/',
      icon: MessageSquarePlus,
    },
    {
      title: 'Turn on Temporary Chat',
      url: '/?temporary-chat=true',
      icon: Clock,
    },
    {
      title: 'Search Chats',
      url: '#',
      icon: Search,
    },
    {
      title: 'Library',
      url: '/library',
      icon: BookOpen,
    },
  ],
  // Placeholder projects data (typically overridden by API data).
  projects: [
    {
      title: 'Playground',
      url: '#',
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: 'History',
          url: '#',
        },
        {
          title: 'Starred',
          url: '#',
        },
        {
          title: 'Settings',
          url: '#',
        },
      ],
    },
    // ... other static project definitions
  ],
};

/**
 * The main component definition for the application's sidebar.
 */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  // Destructure state and actions from the global chat store.
  const { chats, setChats, addChat, chatTitles, deleteChat } = useChatStore();

  // Local state for managing the list of projects and their individual loading states.
  const [projects, setProjects] = React.useState<
    {
      id: string;
      title: string;
      chats?: { id: string; title: string; url: string }[];
      isLoading?: boolean;
    }[]
  >([]);

  // State to track which chat is currently being moved between projects.
  const [assigningChatId, setAssigningChatId] = React.useState<string | null>(
    null,
  );

  // Local state for managing the "Create Project" dialog and form data.
  const [createProjectOpen, setCreateProjectOpen] = React.useState(false);
  const [newProjectTitle, setNewProjectTitle] = React.useState('');
  const [isCreatingProject, setIsCreatingProject] = React.useState(false);
  const [pendingChatId, setPendingChatId] = React.useState<string | null>(null);

  // High-level loading status trackers.
  const [isLoadingChats, setIsLoadingChats] = React.useState(true);
  const [isLoadingProjects, setIsLoadingProjects] = React.useState(true);

  /**
   * Fetches the user's unassigned/main chats from the API.
   */
  const fetchChats = React.useCallback(async () => {
    setIsLoadingChats(true);
    try {
      const res = await fetch('/api/chat');
      if (!res.ok) {
        throw new Error('Failed to fetch chats');
      }

      const json = await res.json();
      if (!Array.isArray(json)) return;

      // Map API data to the format expected by the store and UI.
      const mapped = json.map((chat: { id: string; title?: string }) => ({
        id: chat.id,
        title: chat.title || 'Untitled chat',
        url: `/~/${chat.id}`,
      }));

      setChats(mapped);
    } catch (error) {
      console.error('Unable to load chats', error);
    } finally {
      setIsLoadingChats(false);
    }
  }, [setChats]);

  /**
   * Memoized list of chats for display, merging base titles with any active generated titles from the store.
   */
  const displayChats = React.useMemo(() => {
    return chats.map((chat) => ({
      id: chat.id,
      name: chatTitles[chat.id] || chat.title,
      url: chat.url,
    }));
  }, [chats, chatTitles]);

  /**
   * Fetches the list of all projects owned by the user.
   */
  const fetchProjects = React.useCallback(async () => {
    setIsLoadingProjects(true);
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) {
        throw new Error('Failed to fetch projects');
      }

      const json = await res.json();
      if (!Array.isArray(json)) return;

      const mapped = json.map((project: { id: string; title: string }) => ({
        id: project.id,
        title: project.title,
        chats: undefined, // Initial fetch only gets project metadata.
      }));

      setProjects(mapped);
    } catch (error) {
      console.error('Unable to load projects', error);
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  /**
   * Fetches chats scoped specifically to a single project.
   * Triggered when a project folder is expanded in the UI.
   */
  const loadProjectChats = React.useCallback(async (projectId: string) => {
    let shouldFetch = true;
    setProjects((prev) => {
      const project = prev.find((p) => p.id === projectId);
      // Skip fetch if already loaded or currently loading.
      if (!project || project.chats || project.isLoading) {
        shouldFetch = false;
        return prev;
      }

      // Mark this specific project as loading.
      return prev.map((p) =>
        p.id === projectId ? { ...p, isLoading: true } : p,
      );
    });

    if (!shouldFetch) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/chats`);
      if (!res.ok) {
        throw new Error('Failed to fetch project chats');
      }

      const json = await res.json();
      if (!Array.isArray(json)) return;

      const mapped = json.map((chat: { id: string; title?: string }) => ({
        id: chat.id,
        title: chat.title || 'Untitled chat',
        url: `/~/${chat.id}`,
      }));

      // Update the projects list with the newly loaded chat data.
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId ? { ...p, chats: mapped, isLoading: false } : p,
        ),
      );
    } catch (error) {
      console.error('Unable to load project chats', error);
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, isLoading: false } : p)),
      );
    }
  }, []);

  /**
   * Orchestrates moving a chat from one project (or no project) to another.
   */
  const handleMoveChatToProject = React.useCallback(
    async (chatId: string, projectId: string, fromProjectId?: string) => {
      setAssigningChatId(chatId);
      try {
        const res = await fetch(`/api/chat/${chatId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId }),
        });

        if (!res.ok) {
          throw new Error('Failed to move chat to project');
        }

        const updated = await res.json();

        // Remove from the 'All Chats' list if it was previously unassigned.
        setChats(chats.filter((chat) => chat.id !== chatId));

        // Update projects state to reflect the transition.
        setProjects((prev) =>
          prev.map((project) => {
            // Remove from previous project list if applicable.
            if (fromProjectId && project.id === fromProjectId) {
              return {
                ...project,
                chats: (project.chats ?? []).filter((c) => c.id !== chatId),
              };
            }

            // Add to the new target project.
            if (project.id !== projectId) return project;

            const chatEntry = {
              id: updated.id,
              title: updated.title || 'Untitled chat',
              url: `/~/${updated.id}`,
            };

            const existingChats = project.chats ?? [];
            const alreadyPresent = existingChats.some(
              (c) => c.id === chatEntry.id,
            );

            return {
              ...project,
              chats: alreadyPresent
                ? existingChats
                : [...existingChats, chatEntry],
            };
          }),
        );
      } catch (error) {
        console.error('Unable to move chat to project', error);
      } finally {
        setAssigningChatId(null);
      }
    },
    [chats, setChats],
  );

  /**
   * Orchestrates removing a chat from a project, effectively returning it to the main chats list.
   */
  const handleRemoveChatFromProject = React.useCallback(
    async (chatId: string, fromProjectId: string) => {
      setAssigningChatId(chatId);
      try {
        const res = await fetch(`/api/chat/${chatId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: null }),
        });

        if (!res.ok) {
          throw new Error('Failed to remove chat from project');
        }

        const updated = await res.json();

        // Update project state to remove the chat.
        setProjects((prev) =>
          prev.map((project) =>
            project.id === fromProjectId
              ? {
                  ...project,
                  chats: (project.chats ?? []).filter((c) => c.id !== chatId),
                }
              : project,
          ),
        );

        // Add the chat back to the global/unassigned store.
        addChat({
          id: updated.id,
          title: updated.title || 'Untitled chat',
          url: `/~/${updated.id}`,
        });
      } catch (error) {
        console.error('Unable to remove chat from project', error);
      } finally {
        setAssigningChatId(null);
      }
    },
    [addChat],
  );

  /**
   * UI helper to open the project creation dialog, optionally pre-assigning a chat.
   */
  const openCreateProjectDialog = React.useCallback((chatId?: string) => {
    setPendingChatId(chatId ?? null);
    setCreateProjectOpen(true);
  }, []);

  /**
   * Form handler for creating a new project via the API.
   */
  const handleCreateProject = React.useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault();
      if (!newProjectTitle.trim()) return;
      setIsCreatingProject(true);
      try {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newProjectTitle }),
        });

        if (!res.ok) {
          throw new Error('Failed to create project');
        }

        const project = await res.json();
        const projectEntry = {
          id: project.id as string,
          title: project.title as string,
          chats: [],
        };

        // Add the new project to the list locally.
        setProjects((prev) => [projectEntry, ...prev]);
        setCreateProjectOpen(false);
        setNewProjectTitle('');

        // If a chat was waiting for this project, move it now.
        if (pendingChatId) {
          await handleMoveChatToProject(pendingChatId, project.id);
          setPendingChatId(null);
        }
      } catch (error) {
        console.error('Unable to create project', error);
      } finally {
        setIsCreatingProject(false);
      }
    },
    [handleMoveChatToProject, newProjectTitle, pendingChatId],
  );

  /**
   * Handler for deleting a chat session.
   */
  const handleDeleteChat = React.useCallback(
    async (chatId: string) => {
      // Optimistic delete: remove from UI immediately for perceived performance.
      deleteChat(chatId);
      setProjects((prev) =>
        prev.map((p) => ({
          ...p,
          chats: p.chats?.filter((c) => c.id !== chatId),
        })),
      );

      // If the user is currently viewing the deleted chat, redirect them home.
      if (window.location.pathname.includes(chatId)) {
        router.push('/');
      }

      try {
        const res = await fetch(`/api/chat/${chatId}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          throw new Error('Failed to delete chat');
        }
      } catch (error) {
        console.error('Delete failed', error);
        toast.error('Failed to delete chat');
        // Rollback: Re-sync state from server if API call failed.
        fetchChats();
        fetchProjects();
      }
    },
    [deleteChat, router, fetchChats, fetchProjects],
  );

  // Initial data load on component mount.
  React.useEffect(() => {
    fetchChats();
    fetchProjects();
  }, [fetchChats, fetchProjects]);

  return (
    // Main Sidebar container with configuration.
    <Sidebar collapsible="icon" {...props}>
      {/* Sidebar Header: Logo and Toggle Trigger. */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              className="group justify-between hover:bg-transparent active:bg-transparent data-[state=open]:bg-transparent hover:text-inherit group-data-[collapsible=icon]:justify-center"
            >
              <div className="flex w-full items-center justify-between">
                <div className="-ml-3 group-data-[collapsible=icon]:ml-0 group-data-[collapsible=icon]:group-hover:hidden">
                  <Logo className="size-12" />
                </div>
                <SidebarTrigger className="-ml-1 group-data-[collapsible=icon]:hidden group-data-[collapsible=icon]:group-hover:flex group-data-[collapsible=icon]:group-hover:ml-0" />
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Main Content Area: Search, Projects, and Chats lists. */}
      <SidebarContent className="overflow-hidden">
        <NavMain items={data.navMain} />
        <ScrollArea className="flex-1">
          {/* Show skeletons while initial data is loading. */}
          {isLoadingChats || isLoadingProjects ? (
            <SidebarSkeleton />
          ) : (
            <>
              {/* Project navigation and management. */}
              <NavProjects
                projects={projects}
                onOpenProject={loadProjectChats}
                onCreateProject={(chatId) => openCreateProjectDialog(chatId)}
                onMoveChat={handleMoveChatToProject}
                onRemoveFromProject={handleRemoveChatFromProject}
                onDeleteChat={handleDeleteChat}
                assigningChatId={assigningChatId}
              />
              {/* Individual unassigned chat list. */}
              <NavChats
                chats={displayChats}
                projects={projects}
                onMoveToProject={handleMoveChatToProject}
                onCreateProject={openCreateProjectDialog}
                onDeleteChat={handleDeleteChat}
                assigningChatId={assigningChatId}
              />
            </>
          )}
        </ScrollArea>
      </SidebarContent>

      {/* Sidebar Footer: User profile and settings. */}
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />

      {/* Dialog for creating a new project. */}
      <Dialog open={createProjectOpen} onOpenChange={setCreateProjectOpen}>
        <DialogContent>
          <form className="space-y-4" onSubmit={handleCreateProject}>
            <DialogHeader>
              <DialogTitle>Create project</DialogTitle>
              <DialogDescription>
                Name your project to group related chats together.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
                placeholder="My project"
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateProjectOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingProject}>
                {isCreatingProject ? 'Creating...' : 'Create project'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}

/**
 * Skeleton UI displayed during the initial loading phase.
 */
function SidebarSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-0">
      {/* Projects Skeleton Block. */}
      <SidebarGroup>
        <SidebarGroupLabel>Projects</SidebarGroupLabel>
        <SidebarMenu className="gap-2">
          <SidebarMenuItem>
            <SidebarMenuSkeleton showIcon />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      {/* Chats Skeleton Block. */}
      <SidebarGroup>
        <SidebarGroupLabel>Chats</SidebarGroupLabel>
        <SidebarMenu className="gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SidebarMenuItem key={`chat-${i}`}>
              <SidebarMenuSkeleton showIcon />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    </div>
  );
}
