'use client';

import { Menu } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function FloatingSidebarTrigger() {
  const { toggleSidebar, isMobile } = useSidebar();

  if (!isMobile) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        'fixed top-4 left-4 z-50 size-9 rounded-md border bg-background/80 backdrop-blur-sm md:hidden shadow-sm hover:bg-accent transition-all duration-200 active:scale-95',
      )}
      onClick={toggleSidebar}
    >
      <Menu className="size-5" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}
