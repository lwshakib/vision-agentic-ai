"use client";

import Link from "next/link";
import {
  FolderKanban,
  FolderPlus,
  Loader2,
  Forward,
  MessageSquare,
  MoreHorizontal,
  Trash2,
  type LucideIcon,
} from "lucide-react";

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
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavChats({
  chats,
  projects,
  onMoveToProject,
  onCreateProject,
  assigningChatId,
}: {
  chats: {
    id?: string;
    name: string;
    url: string;
    icon?: LucideIcon;
  }[];
  projects: {
    id: string;
    title: string;
  }[];
  onMoveToProject?: (chatId: string, projectId: string) => void | Promise<void>;
  onCreateProject?: (chatId?: string) => void;
  assigningChatId?: string | null;
}) {
  const { isMobile } = useSidebar();

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Chats</SidebarGroupLabel>
      <SidebarMenu>
        {chats.length === 0 && (
          <SidebarMenuItem>
            <SidebarMenuButton disabled>
              <MessageSquare className="text-muted-foreground" />
              <span className="text-muted-foreground">No chats yet</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
        {chats.map((item) => (
          <SidebarMenuItem key={item.id || item.name}>
            <SidebarMenuButton asChild>
              <Link href={item.url}>
                {item.icon ? <item.icon /> : <MessageSquare />}
                <span>{item.name}</span>
              </Link>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction showOnHover>
                  <MoreHorizontal />
                  <span className="sr-only">More</span>
                </SidebarMenuAction>
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
                    {projects.length === 0 && (
                      <DropdownMenuItem
                        onSelect={() => onCreateProject?.(item.id)}
                      >
                        <FolderPlus className="text-muted-foreground" />
                        <span>Create project</span>
                      </DropdownMenuItem>
                    )}
                    {projects.map((project) => (
                      <DropdownMenuItem
                        key={project.id}
                        onSelect={() =>
                          item.id && onMoveToProject?.(item.id, project.id)
                        }
                        disabled={assigningChatId === item.id}
                      >
                        {assigningChatId === item.id ? (
                          <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        ) : (
                          <FolderKanban className="text-muted-foreground" />
                        )}
                        <span>{project.title}</span>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => onCreateProject?.(item.id)}
                    >
                      <FolderPlus className="text-muted-foreground" />
                      <span>Create new project</span>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem>
                  <Forward className="text-muted-foreground" />
                  <span>Share Chat</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Trash2 className="text-muted-foreground" />
                  <span>Delete Chat</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
