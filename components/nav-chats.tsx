/**
 * NavChats Component
 * Renders the list of unassigned (standalone) chats in the sidebar.
 * Includes functionality to move these chats into projects or delete them.
 */

'use client';

import Link from 'next/link';
// Import utility and functional icons.
import {
  FolderKanban,
  FolderPlus,
  Loader2,
  Forward,
  MessageSquare,
  MoreHorizontal,
  Trash2,
  type LucideIcon,
} from 'lucide-react';

// Import Dropdown UI components for the chat context menu.
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
// Import Sidebar layout primitives.
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { truncate } from '@/lib/utils';

/**
 * Component to display a flat list of chats with individual action menus.
 */
export function NavChats({
  chats, // Array of chat objects to display.
  projects, // Global list of projects for the "Move to project" feature.
  onMoveToProject, // Callback for project reassignment.
  onCreateProject, // Callback to initiate new project creation.
  onDeleteChat, // Callback for chat removal.
  assigningChatId, // Tracker for showing loading state on a specific chat.
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
  onDeleteChat?: (chatId: string) => void;
  assigningChatId?: string | null;
}) {
  const { isMobile } = useSidebar();

  return (
    // Wrap the chats list in a SidebarGroup, hidden when the sidebar is collapsed to icon-only mode.
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Chats</SidebarGroupLabel>
      <SidebarMenu>
        {/* Empty state messaging if no unassigned chats exist. */}
        {chats.length === 0 && (
          <SidebarMenuItem>
            <SidebarMenuButton disabled>
              <MessageSquare className="text-muted-foreground mr-2 size-4" />
              <span className="text-muted-foreground">No chats yet</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}

        {/* Map through each individual chat. */}
        {chats.map((item) => (
          <SidebarMenuItem key={item.id || item.name}>
            {/* Primary link to the chat session. */}
            <SidebarMenuButton asChild tooltip={item.name}>
              <Link
                href={item.url}
                className="grid grid-cols-[auto_1fr] items-center gap-2 overflow-hidden px-2 py-1.5"
              >
                {/* Fixed-size icon container. */}
                <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {item.icon ? <item.icon className="size-4" /> : <MessageSquare className="size-4" />}
                </div>
                {/* Title with robust CSS truncation. */}
                <span className="min-w-0 truncate text-sm font-medium">
                  {item.name}
                </span>
              </Link>
            </SidebarMenuButton>

            {/* Context menu for chat-specific actions. */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {/* The '...' button visible on hover. */}
                <SidebarMenuAction showOnHover>
                  <MoreHorizontal />
                  <span className="sr-only">More</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-48 rounded-lg"
                side={isMobile ? 'bottom' : 'right'}
                align={isMobile ? 'end' : 'start'}
              >
                <DropdownMenuItem asChild>
                  <Link href={item.url}>
                    <MessageSquare className="text-muted-foreground mr-2 size-4" />
                    <span>View Chat</span>
                  </Link>
                </DropdownMenuItem>

                {/* Hierarchical "Move to project" menu. */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Forward className="text-muted-foreground mr-2 size-4" />
                    <span>Move to project</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-60">
                    {/* List existing projects as valid drop targets. */}
                    {projects.map((project) => (
                      <DropdownMenuItem
                        key={project.id}
                        onSelect={() =>
                          item.id && onMoveToProject?.(item.id, project.id)
                        }
                        disabled={assigningChatId === item.id}
                      >
                        {/* Show specific loading spinner if this chat is being processed. */}
                        {assigningChatId === item.id ? (
                          <Loader2 className="mr-2 size-4 animate-spin text-muted-foreground" />
                        ) : (
                          <FolderKanban className="mr-2 size-4 text-muted-foreground" />
                        )}
                        <span>{project.title}</span>
                      </DropdownMenuItem>
                    ))}
                    {projects.length > 0 && <DropdownMenuSeparator />}
                    {/* Immediate trigger to create a NEW project for this chat. */}
                    <DropdownMenuItem
                      onSelect={() => onCreateProject?.(item.id)}
                    >
                      <FolderPlus className="text-muted-foreground mr-2 size-4" />
                      <span>Create project</span>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />

                {/* Destructive chat deletion. */}
                <DropdownMenuItem
                  onSelect={() => item.id && onDeleteChat?.(item.id)}
                  className="focus:bg-red-500/10"
                >
                  <Trash2 className="mr-2 size-4 text-muted-foreground" />
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
