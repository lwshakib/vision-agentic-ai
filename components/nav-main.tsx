/**
 * NavMain Component
 * Renders the primary navigation links in the sidebar.
 * Includes a built-in Command Palette (CMD+K) for full-text search across all user chats.
 */

import * as React from 'react';
import Link from 'next/link';
// Import functional and utility icons.
import { MessageCircle, SquarePen, type LucideIcon } from 'lucide-react';

// Import Sidebar layout primitives.
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
// Import Command Palette UI components for search functionality.
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * Main navigation component with integrated search.
 */
export function NavMain({
  items, // List of navigation items passed from the sidebar config.
}: {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
  }[];
}) {
  // state for the search dialog and results.
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<
    { id: string; title: string; url: string }[]
  >([]);
  const [isLoading, setIsLoading] = React.useState(false);

  // Ref-based management for debouncing and aborting stale API requests.
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);
  const controllerRef = React.useRef<AbortController | null>(null);

  /**
   * Effect: Global keyboard listener for CMD+K search shortcut.
   */
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  /**
   * Effect: Live search logic with debouncing and request cancellation.
   */
  React.useEffect(() => {
    // Clear previous pending debounce.
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Reset results if the query is empty.
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    // Start a new debounced search execution.
    debounceRef.current = setTimeout(async () => {
      // Abort any ongoing search request.
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
      const controller = new AbortController();
      controllerRef.current = controller;
      setIsLoading(true);

      try {
        // Fetch matching chats from the search API endpoint.
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('Search failed');
        const json = await res.json();

        // Populate results if the response is valid.
        if (Array.isArray(json)) {
          setResults(json);
        } else {
          setResults([]);
        }
      } catch (err) {
        // Ignore errors caused by manual cancellation.
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 250); // 250ms debounce window.

    // Cleanup: stop any pending timers or requests on unmount/re-run.
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, [query]);

  return (
    <>
      {/* Primary Sidebar Navigation Group. */}
      <SidebarGroup>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title}>
                <Link
                  href={item.url}
                  onClick={(e) => {
                    // Hijack the search link to open the Command Palette instead of navigating.
                    if (item.title === 'Search Chats') {
                      e.preventDefault();
                      setOpen(true);
                    }
                  }}
                >
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>

      {/* Global Search Dialog (Command Palette). */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search chats..."
          value={query}
          onValueChange={(val) => {
            setQuery(val);
          }}
        />
        <CommandList className="overflow-y-hidden">
          {/* Scrollable container for hits. */}
          <ScrollArea className="h-[300px]">
            {/* Empty state messaging. */}
            <CommandEmpty>
              {query ? 'No results found.' : 'Start typing to search chats.'}
            </CommandEmpty>

            {/* Results Group. */}
            <CommandGroup heading="Chats">
              {/* Spinner for active API calls. */}
              {isLoading && (
                <CommandItem disabled>
                  <MessageCircle className="mr-2 size-4" />
                  <span>Searching...</span>
                </CommandItem>
              )}
              {/* Iteratively render matching chat links. */}
              {results.map((chat) => (
                <CommandItem
                  key={chat.id}
                  onSelect={() => {
                    setOpen(false); // Close modal on selection.
                  }}
                  asChild
                >
                  <Link href={chat.url}>
                    <MessageCircle className="mr-2 size-4" />
                    <span>{chat.title}</span>
                  </Link>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            {/* Context Actions. */}
            <CommandGroup heading="">
              <CommandItem asChild>
                <Link href="/~">
                  <SquarePen className="mr-2 size-4" />
                  <span>New chat</span>
                </Link>
              </CommandItem>
            </CommandGroup>
          </ScrollArea>
        </CommandList>
      </CommandDialog>
    </>
  );
}
