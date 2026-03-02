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
              <ChevronsUpDown className="ml-auto size-4" />
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

            {/* Feature Groups (currently disabled placeholders). */}
            <DropdownMenuGroup>
              <DropdownMenuItem disabled>
                <Sparkles size={16} />
                Upgrade to Pro
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem disabled>
                <BadgeCheck size={16} />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <CreditCard size={16} />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
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
