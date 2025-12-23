import * as React from "react";
import Link from "next/link";
import { MessageCircle, SquarePen, type LucideIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
  }[];
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<
    { id: string; title: string; url: string }[]
  >([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);
  const controllerRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  React.useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
      const controller = new AbortController();
      controllerRef.current = controller;
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Search failed");
        const json = await res.json();
        if (Array.isArray(json)) {
          setResults(json);
        } else {
          setResults([]);
        }
      } catch (err) {
        if ((err as any)?.name === "AbortError") return;
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

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
      <SidebarGroup>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title}>
                <Link
                  href={item.url}
                  onClick={(e) => {
                    if (item.title === "Search Chats") {
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
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search chats..."
          value={query}
          onValueChange={(val) => {
            setQuery(val);
          }}
        />
        <CommandList className="overflow-y-hidden">
          <ScrollArea className="h-[300px]">
            <CommandEmpty>
              {query ? "No results found." : "Start typing to search chats."}
            </CommandEmpty>
            <CommandGroup heading="Chats">
              {isLoading && (
                <CommandItem disabled>
                  <MessageCircle className="mr-2 size-4" />
                  <span>Searching...</span>
                </CommandItem>
              )}
              {results.map((chat) => (
                <CommandItem
                  key={chat.id}
                  onSelect={() => {
                    setOpen(false);
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
