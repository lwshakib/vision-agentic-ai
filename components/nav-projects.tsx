/**
 * NavProjects Component
 * Renders the organized projects section in the sidebar.
 * Users can expand collections (projects) to see their contained chats.
 * Provides context menus for moving, removing, or deleting chats across projects.
 */

'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
// Import a set of polished icons for project and chat management.
import {
  ChevronRight,
  FolderKanban,
  FolderPlus,
  Forward,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Trash2,
  FolderMinus,
} from 'lucide-react';
// Import Collapsible primitives for the accordion-style project list.
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
// Import Dropdown and Submenu components for the chat action menus.
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
// Import Sidebar layout components.
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';

/**
 * Component to display hierarchical projects and their associated chats.
 */
export function NavProjects({
  projects, // data model for projects and nested chats.
  onOpenProject, // callback when a project is expanded (used for lazy fetching).
  onCreateProject, // trigger for the project creation dialog.
  onMoveChat, // logic to re-assign a chat to a different project.
  onRemoveFromProject, // logic to detach a chat (back to general library).
  onDeleteChat, // logic for hard deleting a chat.
  onDeleteProject, // logic for deleting a project.
  assigningChatId, // loading state indicator for a specific chat being processed.
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
    fromProjectId: string,
  ) => void | Promise<void>;
  onRemoveFromProject?: (chatId: string, fromProjectId: string) => void;
  onDeleteChat?: (chatId: string) => void;
  onDeleteProject?: (projectId: string) => void;
  assigningChatId?: string | null;
}) {
  const { isMobile } = useSidebar(); // Adaptive UI state.

  return (
    <SidebarGroup>
      {/* Visual divider label for the section. */}
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarMenu>
        {/* Empty State: Prompt user to create their first project. */}
        {projects.length === 0 && (
          <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
            <SidebarMenuButton onClick={() => onCreateProject?.()}>
              + Add Project
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}

        {/* Iterate over projects. */}
        {projects.map((project) => (
          <Collapsible
            key={project.id}
            asChild
            defaultOpen={false}
            className="group/collapsible"
            onOpenChange={(open) => {
              // Trigger lazy load of chats when project is opened.
              if (open) {
                onOpenProject?.(project.id);
              }
            }}
          >
            <SidebarMenuItem className="group/project relative">
              {/* Trigger: Project icon on the left to toggle chats. */}
              <CollapsibleTrigger asChild>
                <button
                  className="absolute left-1 top-1.5 z-20 flex size-5 items-center justify-center rounded-sm text-sidebar-foreground hover:bg-sidebar-accent"
                  title="Toggle Project"
                >
                  <FolderKanban className="size-4" />
                </button>
              </CollapsibleTrigger>

              {/* Navigation: Clicking the text goes to the project page. */}
              <SidebarMenuButton asChild tooltip={project.title}>
                <Link href={`/project/${project.id}`} className="pl-8!">
                  <span className="truncate">{project.title}</span>
                </Link>
              </SidebarMenuButton>

              {/* Action: Three-dot icon replaces the chevron. Provide project actions. */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction
                    className="group-data-[state=open]/collapsible:rotate-0"
                  >
                    <MoreHorizontal />
                    <span className="sr-only">Project Actions</span>
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-48 rounded-lg"
                  side={isMobile ? 'bottom' : 'right'}
                  align={isMobile ? 'end' : 'start'}
                >
                  <DropdownMenuItem
                    onSelect={() => onCreateProject?.()}
                  >
                    <FolderPlus className="mr-2 size-4 text-muted-foreground" />
                    <span>New Project</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="focus:bg-red-500/10"
                    onSelect={() => onDeleteProject?.(project.id)}
                  >
                    <Trash2 className="mr-2 size-4 text-muted-foreground" />
                    <span>Delete Project</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Nested Chats List. */}
              <CollapsibleContent>
                <SidebarMenuSub>
                  <AnimatePresence initial={false}>
                    {project.chats?.map((subItem) => (
                      <motion.div
                        key={subItem.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <SidebarMenuSubItem className="group/subitem">
                          {/* Individual Chat Link. */}
                          <SidebarMenuSubButton asChild>
                            <Link href={subItem.url}>
                              <MessageSquare className="size-4" />
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>

                          {/* Chat Action Menu (Hidden until hover). */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/subitem:opacity-100 p-1 rounded hover:bg-sidebar-accent">
                                <MoreHorizontal className="size-4" />
                                <span className="sr-only">More</span>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              className="w-48 rounded-lg"
                              side={isMobile ? 'bottom' : 'right'}
                              align={isMobile ? 'end' : 'start'}
                            >
                              <DropdownMenuItem>
                                <MessageSquare className="text-muted-foreground mr-2 size-4" />
                                <span>View Chat</span>
                              </DropdownMenuItem>

                              {/* Move Chat Sub-menu. */}
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <Forward className="text-muted-foreground mr-2 size-4" />
                                  <span>Move to project</span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="w-60">
                                  {/* Filter current project out of target list. */}
                                  {projects
                                    .filter((p) => p.id !== project.id)
                                    .map((p) => (
                                      <DropdownMenuItem
                                        key={p.id}
                                        onSelect={() =>
                                          onMoveChat?.(
                                            subItem.id,
                                            p.id,
                                            project.id,
                                          )
                                        }
                                        disabled={
                                          assigningChatId === subItem.id
                                        }
                                      >
                                        {/* Show loader icon if this specific chat is being moved. */}
                                        {assigningChatId === subItem.id ? (
                                          <Loader2 className="mr-2 size-4 animate-spin text-muted-foreground" />
                                        ) : (
                                          <FolderKanban className="mr-2 size-4 text-muted-foreground" />
                                        )}
                                        <span>{p.title}</span>
                                      </DropdownMenuItem>
                                    ))}
                                  {/* Edge Case: No other projects exist. */}
                                  {projects.filter((p) => p.id !== project.id)
                                    .length === 0 && (
                                    <DropdownMenuItem disabled>
                                      <span className="text-muted-foreground">
                                        No other projects
                                      </span>
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  {/* Create NEW project and put this chat in it. */}
                                  <DropdownMenuItem
                                    onSelect={() =>
                                      onCreateProject?.(subItem.id)
                                    }
                                  >
                                    <FolderPlus className="mr-2 size-4 text-muted-foreground" />
                                    <span>Create project</span>
                                  </DropdownMenuItem>
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>

                              <DropdownMenuSeparator />

                              {/* Detach Chat Action. */}
                              <DropdownMenuItem
                                onSelect={() =>
                                  onRemoveFromProject?.(subItem.id, project.id)
                                }
                                disabled={assigningChatId === subItem.id}
                              >
                                <FolderMinus className="mr-2 size-4 text-muted-foreground" />
                                <span>Remove from project</span>
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              {/* Hard Delete Action. */}
                              <DropdownMenuItem
                                onSelect={() => onDeleteChat?.(subItem.id)}
                                disabled={assigningChatId === subItem.id}
                                className="focus:bg-red-500/10"
                              >
                                <Trash2 className="mr-2 size-4 text-muted-foreground" />
                                <span>Delete Chat</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </SidebarMenuSubItem>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Local project loading spinner (during API fetch). */}
                  {project.isLoading && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        <span className="text-muted-foreground">
                          Loading...
                        </span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}

                  {/* Empty Project State. */}
                  {!project.isLoading &&
                    (!project.chats || project.chats.length === 0) && (
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton>
                          <span className="text-muted-foreground pl-6 text-xs italic">
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
