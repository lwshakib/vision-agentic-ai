/**
 * Main Content Layout
 * This server component defines the structural template for all authenticated pages.
 * It wraps the primary application view with the responsive sidebar navigation system.
 */

// Import the AppSidebar, which contains the branding, navigation, and user context.
import { AppSidebar } from '@/components/app-sidebar';
import { FloatingSidebarTrigger } from '@/components/floating-sidebar-trigger';
// Import Sidebar primitives to manage the sliding drawer state and content spacing.
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

/**
 * Root Layout for the (main) route group.
 */
export default async function Layout({
  children, // The page-level content passed from Next.js.
}: {
  children: React.ReactNode;
}) {
  return (
    // SidebarProvider tracks the expanded/collapsed state and provides context to children.
    <SidebarProvider>
      {/* Renders the application's persistent navigation sidebar. */}
      <AppSidebar />

      {/* SidebarInset shifts the main page content to accommodate the sidebar on desktop. */}
      <SidebarInset>
        {/* Floating hamburger menu for mobile users to access the sidebar. */}
        <FloatingSidebarTrigger />
        {/* Inject the specific page content here. */}
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

