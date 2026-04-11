/**
 * Auth Layout Component
 * This layout is applied to all pages within the (auth) route group.
 * It provides a consistent centered layout for authentication-related pages like sign-in, sign-up, etc.
 */

export default function AuthLayout({
  children,
}: Readonly<{
  // Strong typing for the children prop to ensure it's a valid React node.
  children: React.ReactNode;
}>) {
  return (
    // Outer container ensures full screen height and width.
    <div className="min-h-screen w-full flex justify-center items-center bg-zinc-50 px-4 dark:bg-transparent">
      {/* Renders the specific auth page content (e.g., Sign In form). */}
      {children}
    </div>
  );
}
