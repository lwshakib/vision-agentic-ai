"use client";

import * as React from "react";
import {
  BookOpen,
  Bot,
  Clock,
  MessageSquarePlus,
  Search,
  Settings2,
  SquareTerminal,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavChats } from "@/components/nav-chats";
import { NavUser } from "@/components/nav-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
} from "@/components/ui/sidebar";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Logo } from "./logo";
import { useChatStore } from "@/lib/store";

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "New Chat",
      url: "/",
      icon: MessageSquarePlus,
    },
    {
      title: "Turn on Temporary Chat",
      url: "/?temporary-chat=true",
      icon: Clock,
    },
    {
      title: "Search Chats",
      url: "#",
      icon: Search,
    },
    {
      title: "Library",
      url: "/library",
      icon: BookOpen,
    },
  ],
  projects: [
    {
      title: "Playground",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "History",
          url: "#",
        },
        {
          title: "Starred",
          url: "#",
        },
        {
          title: "Settings",
          url: "#",
        },
      ],
    },
    {
      title: "Models",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "Genesis",
          url: "#",
        },
        {
          title: "Explorer",
          url: "#",
        },
        {
          title: "Quantum",
          url: "#",
        },
      ],
    },
    {
      title: "Documentation",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Introduction",
          url: "#",
        },
        {
          title: "Get Started",
          url: "#",
        },
        {
          title: "Tutorials",
          url: "#",
        },
        {
          title: "Changelog",
          url: "#",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const { chats, setChats, addChat, chatTitles, deleteChat } = useChatStore();
  const [projects, setProjects] = React.useState<
    {
      id: string;
      title: string;
      chats?: { id: string; title: string; url: string }[];
      isLoading?: boolean;
    }[]
  >([]);
  const [assigningChatId, setAssigningChatId] = React.useState<string | null>(
    null
  );
  const [createProjectOpen, setCreateProjectOpen] = React.useState(false);
  const [newProjectTitle, setNewProjectTitle] = React.useState("");
  const [isCreatingProject, setIsCreatingProject] = React.useState(false);
  const [pendingChatId, setPendingChatId] = React.useState<string | null>(null);
  const [isLoadingChats, setIsLoadingChats] = React.useState(true);
  const [isLoadingProjects, setIsLoadingProjects] = React.useState(true);

  const fetchChats = React.useCallback(async () => {
    setIsLoadingChats(true);
    try {
      const res = await fetch("/api/chat");
      if (!res.ok) {
        throw new Error("Failed to fetch chats");
      }

      const json = await res.json();
      if (!Array.isArray(json)) return;

      const mapped = json.map((chat: { id: string; title?: string }) => ({
        id: chat.id,
        title: chat.title || "Untitled chat",
        url: `/~/${chat.id}`,
      }));

      setChats(mapped);
    } catch (error) {
      console.error("Unable to load chats", error);
    } finally {
      setIsLoadingChats(false);
    }
  }, [setChats]);

  // Transform store chats to display format (handling title updates)
  const displayChats = React.useMemo(() => {
    return chats.map((chat) => ({
      id: chat.id,
      name: chatTitles[chat.id] || chat.title,
      url: chat.url,
    }));
  }, [chats, chatTitles]);

  const fetchProjects = React.useCallback(async () => {
    setIsLoadingProjects(true);
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) {
        throw new Error("Failed to fetch projects");
      }

      const json = await res.json();
      if (!Array.isArray(json)) return;

      const mapped = json.map((project: { id: string; title: string }) => ({
        id: project.id,
        title: project.title,
        chats: undefined,
      }));

      setProjects(mapped);
    } catch (error) {
      console.error("Unable to load projects", error);
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  const loadProjectChats = React.useCallback(async (projectId: string) => {
    let shouldFetch = true;
    setProjects((prev) => {
      const project = prev.find((p) => p.id === projectId);
      if (!project || project.chats || project.isLoading) {
        shouldFetch = false;
        return prev;
      }

      return prev.map((p) =>
        p.id === projectId ? { ...p, isLoading: true } : p
      );
    });

    if (!shouldFetch) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/chats`);
      if (!res.ok) {
        throw new Error("Failed to fetch project chats");
      }

      const json = await res.json();
      if (!Array.isArray(json)) return;

      const mapped = json.map((chat: { id: string; title?: string }) => ({
        id: chat.id,
        title: chat.title || "Untitled chat",
        url: `/~/${chat.id}`,
      }));

      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId ? { ...p, chats: mapped, isLoading: false } : p
        )
      );
    } catch (error) {
      console.error("Unable to load project chats", error);
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, isLoading: false } : p))
      );
    }
  }, []);

  const handleMoveChatToProject = React.useCallback(
    async (chatId: string, projectId: string, fromProjectId?: string) => {
      setAssigningChatId(chatId);
      try {
        const res = await fetch(`/api/chat/${chatId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });

        if (!res.ok) {
          throw new Error("Failed to move chat to project");
        }

        const updated = await res.json();

        // Remove from unassigned chats if present
        setChats(chats.filter((chat) => chat.id !== chatId));

        setProjects((prev) =>
          prev.map((project) => {
            // Remove from previous project list if moving from there
            if (fromProjectId && project.id === fromProjectId) {
              return {
                ...project,
                chats: (project.chats ?? []).filter((c) => c.id !== chatId),
              };
            }

            if (project.id !== projectId) return project;

            const chatEntry = {
              id: updated.id,
              title: updated.title || "Untitled chat",
              url: `/~/${updated.id}`,
            };

            const existingChats = project.chats ?? [];
            const alreadyPresent = existingChats.some(
              (c) => c.id === chatEntry.id
            );

            return {
              ...project,
              chats: alreadyPresent
                ? existingChats
                : [...existingChats, chatEntry],
            };
          })
        );
      } catch (error) {
        console.error("Unable to move chat to project", error);
      } finally {
        setAssigningChatId(null);
      }
    },
    [chats, setChats]
  );

  const handleRemoveChatFromProject = React.useCallback(
    async (chatId: string, fromProjectId: string) => {
      setAssigningChatId(chatId);
      try {
        const res = await fetch(`/api/chat/${chatId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: null }),
        });

        if (!res.ok) {
          throw new Error("Failed to remove chat from project");
        }

        const updated = await res.json();

        // Remove from project
        setProjects((prev) =>
          prev.map((project) =>
            project.id === fromProjectId
              ? {
                  ...project,
                  chats: (project.chats ?? []).filter((c) => c.id !== chatId),
                }
              : project
          )
        );

        // Add back to unassigned chats
        addChat({
          id: updated.id,
          title: updated.title || "Untitled chat",
          url: `/~/${updated.id}`,
        });
      } catch (error) {
        console.error("Unable to remove chat from project", error);
      } finally {
        setAssigningChatId(null);
      }
    },
    [addChat]
  );

  const openCreateProjectDialog = React.useCallback((chatId?: string) => {
    setPendingChatId(chatId ?? null);
    setCreateProjectOpen(true);
  }, []);

  const handleCreateProject = React.useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault();
      if (!newProjectTitle.trim()) return;
      setIsCreatingProject(true);
      try {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newProjectTitle }),
        });

        if (!res.ok) {
          throw new Error("Failed to create project");
        }

        const project = await res.json();
        const projectEntry = {
          id: project.id as string,
          title: project.title as string,
          chats: [],
        };

        setProjects((prev) => [projectEntry, ...prev]);
        setCreateProjectOpen(false);
        setNewProjectTitle("");

        if (pendingChatId) {
          await handleMoveChatToProject(pendingChatId, project.id);
          setPendingChatId(null);
        }
      } catch (error) {
        console.error("Unable to create project", error);
      } finally {
        setIsCreatingProject(false);
      }
    },
    [handleMoveChatToProject, newProjectTitle, pendingChatId]
  );

  const handleDeleteChat = React.useCallback(
    async (chatId: string) => {
      // Optimistic delete
      deleteChat(chatId);
      setProjects((prev) =>
        prev.map((p) => ({
          ...p,
          chats: p.chats?.filter((c) => c.id !== chatId),
        }))
      );

      // Redirect if we are on the page of the deleted chat
      if (window.location.pathname.includes(chatId)) {
        router.push("/");
      }

      try {
        const res = await fetch(`/api/chat/${chatId}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          throw new Error("Failed to delete chat");
        }
      } catch (error) {
        console.error("Delete failed", error);
        toast.error("Failed to delete chat");
        // Restore chats if failed
        fetchChats();
        fetchProjects();
      }
    },
    [deleteChat, router, fetchChats, fetchProjects]
  );

  React.useEffect(() => {
    fetchChats();
    fetchProjects();
  }, [fetchChats, fetchProjects]);

  return (
    <Sidebar collapsible="icon" {...props}>
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
      <SidebarContent className="overflow-hidden">
        {isLoadingChats || isLoadingProjects ? (
          <SidebarSkeleton />
        ) : (
          <>
            <NavMain items={data.navMain} />
            <ScrollArea className="flex-1">
              <NavProjects
                projects={projects}
                onOpenProject={loadProjectChats}
                onCreateProject={(chatId) => openCreateProjectDialog(chatId)}
                onMoveChat={handleMoveChatToProject}
                onRemoveFromProject={handleRemoveChatFromProject}
                onDeleteChat={handleDeleteChat}
                assigningChatId={assigningChatId}
              />
              <NavChats
                chats={displayChats}
                projects={projects}
                onMoveToProject={handleMoveChatToProject}
                onCreateProject={openCreateProjectDialog}
                onDeleteChat={handleDeleteChat}
                assigningChatId={assigningChatId}
              />
            </ScrollArea>
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
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
                {isCreatingProject ? "Creating..." : "Create project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}

function SidebarSkeleton() {
  return (
    <div className="flex flex-col gap-6 px-2 py-1">
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-9 w-full" />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-4 w-20" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="ml-auto h-4 w-4 rounded-full" />
              </div>
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, subIdx) => (
                  <div key={subIdx} className="flex items-center gap-2">
                    <Skeleton className="h-3.5 w-3.5 rounded-full" />
                    <Skeleton className="h-3.5 flex-1" />
                    <Skeleton className="h-3.5 w-10" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-4 w-16" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 rounded-lg px-2 py-2"
            >
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
