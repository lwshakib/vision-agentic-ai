/**
 * NavUser Component
 * Renders the user profile section within the sidebar.
 * Displays user avatar, name, and email, and provides a dropdown menu for settings and logout.
 * Integrated with 'better-auth' for real-time session state.
 */

'use client';

// Import Icons.
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
} from 'lucide-react';

// Import Avatar and Dropdown UI primitives.
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
// Import Sidebar primitives.
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

// Import Auth Client and Routing.
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
// Import Skeleton for loading states.
import { Skeleton } from '@/components/ui/skeleton';

// Import global state store for chat-related data.
import { useChatStore } from '@/hooks/use-chat-store';
import { useEffect } from 'react';

/**
 * Main NavUser component.
 */
export function NavUser({
  user: initialUser, // Optional fallback user data.
}: {
  user?: {
    name: string;
    email: string;
    avatar: string;
  };
}) {
  const { isMobile } = useSidebar(); // Access sidebar layout state.
  const router = useRouter();

  // Real-time authentication session hook.
  const { data: session, isPending } = authClient.useSession();
  const { messageCredits, setMessageCredits } = useChatStore();

  // Sync session credits with store on mount or session change.
  useEffect(() => {
    async function syncCredits() {
      try {
        const res = await fetch('/api/credits/sync');
        if (res.ok) {
          const data = await res.json();
          setMessageCredits(data.messageCredits);
        } else if (session?.user) {
          // Fallback to session data if API fails
          setMessageCredits(
            ((session.user as Record<string, unknown>)
              .messageCredits as number) ?? 0,
          );
        }
      } catch (err) {
        console.error('Failed to sync credits:', err);
        if (session?.user) {
          setMessageCredits(
            ((session.user as Record<string, unknown>)
              .messageCredits as number) ?? 0,
          );
        }
      }
    }

    if (session?.user) {
      syncCredits();
    }
  }, [session, setMessageCredits]);

  /**
   * Derive the current user object.
   * Priority: Active Session User > Passed initialUser > Default Guest.
   */
  const user = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        avatar: session.user.image || '',
      }
    : initialUser || {
        name: 'Guest',
        email: '',
        avatar: '',
      };

  /**
   * Orchestrates the sign-out process and post-logout redirection.
   */
  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          // Successfully logged out: clear local state and bounce to sign-in.
          router.push('/sign-in');
        },
      },
    });
  };

  /**
   * Render loading skeleton while 'better-auth' determines session status.
   */
  if (isPending) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center gap-2 px-2 py-1.5 p-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="grid flex-1 gap-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="ml-auto size-4" />
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          {/* Main profile toggle button. */}
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">
                  {user.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <div className="flex flex-col items-end gap-1 px-1">
                <Badge
                  variant="outline"
                  className="h-4 px-1 text-[9px] font-bold border-primary/20 bg-primary/5 text-primary"
                >
                  {messageCredits ?? 0}/10
                </Badge>
                <ChevronsUpDown className="size-3 text-muted-foreground" />
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          {/* Expanded dropdown content. */}
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            {/* User Info Header. */}
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {user.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            {/* Feature Groups. */}
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push('/pro')}>
                <Sparkles size={16} />
                Upgrade to Pro
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push('/account')}>
                <BadgeCheck size={16} />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/billing')}>
                <CreditCard size={16} />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/notifications')}>
                <Bell size={16} />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {/* Destructive Action: Logout. */}
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut size={16} />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
