"use client";

import Link from "next/link";
import {
  ChevronRight,
  FolderKanban,
  FolderPlus,
  Forward,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavProjects({
  projects,
  onOpenProject,
  onCreateProject,
  onMoveChat,
  onRemoveFromProject,
  assigningChatId,
}: {
  projects: {
    id: string;
    title: string;
    chats?: { id: string; title: string; url: string }[];
    isLoading?: boolean;
  }[];
  onOpenProject?: (projectId: string) => void;
  onCreateProject?: (chatId?: string) => void;
  onMoveChat?: (
    chatId: string,
    targetProjectId: string,
    fromProjectId: string
  ) => void | Promise<void>;
  onRemoveFromProject?: (chatId: string, fromProjectId: string) => void;
  assigningChatId?: string | null;
}) {
  const { isMobile } = useSidebar();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarMenu>
        {projects.length === 0 && (
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => onCreateProject?.()}>
              + Add Project
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
        {projects.map((project) => (
          <Collapsible
            key={project.id}
            asChild
            defaultOpen={false}
            className="group/collapsible"
            onOpenChange={(open) => {
              if (open) {
                onOpenProject?.(project.id);
              }
            }}
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={project.title}>
                  <FolderKanban />
                  <span>{project.title}</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {project.chats?.map((subItem) => (
                    <SidebarMenuSubItem
                      key={subItem.id}
                      className="group/subitem"
                    >
                      <SidebarMenuSubButton asChild>
                        <Link href={subItem.url}>
                          <MessageSquare className="size-4" />
                          <span>{subItem.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/subitem:opacity-100 p-1 rounded hover:bg-sidebar-accent">
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">More</span>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          className="w-48 rounded-lg"
                          side={isMobile ? "bottom" : "right"}
                          align={isMobile ? "end" : "start"}
                        >
                          <DropdownMenuItem>
                            <MessageSquare className="text-muted-foreground" />
                            <span>View Chat</span>
                          </DropdownMenuItem>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <Forward className="text-muted-foreground" />
                              <span>Move to project</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent
                              className="w-60"
                            >
                              {projects
                                .filter((p) => p.id !== project.id)
                                .map((p) => (
                                  <DropdownMenuItem
                                    key={p.id}
                                    onSelect={() =>
                                      onMoveChat?.(subItem.id, p.id, project.id)
                                    }
                                    disabled={assigningChatId === subItem.id}
                                  >
                                    {assigningChatId === subItem.id ? (
                                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                                    ) : (
                                      <FolderKanban className="text-muted-foreground" />
                                    )}
                                    <span>{p.title}</span>
                                  </DropdownMenuItem>
                                ))}
                              {projects.filter((p) => p.id !== project.id).length === 0 && (
                                <DropdownMenuItem disabled>
                                  <span className="text-muted-foreground">
                                    No other projects
                                  </span>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={() => onCreateProject?.(subItem.id)}
                              >
                                <FolderPlus className="text-muted-foreground" />
                                <span>Create project</span>
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() =>
                              onRemoveFromProject?.(subItem.id, project.id)
                            }
                            disabled={assigningChatId === subItem.id}
                          >
                            <Trash2 className="text-muted-foreground" />
                            <span>Remove from project</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </SidebarMenuSubItem>
                  ))}
                  {project.isLoading && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton>
                        <span className="text-muted-foreground">Loading...</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                  {!project.isLoading &&
                    (!project.chats || project.chats.length === 0) && (
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton>
                          <span className="text-muted-foreground">
                            No chats yet
                          </span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
