/**
 * Root Layout Component
 * This file serves as the main layout wrapper for the entire Next.js application.
 * It handles global styles, metadata, and provide application-wide context providers.
 */

// Import the Metadata type from Next.js for strong typing of the metadata object.
import type { Metadata } from 'next';
// Import global CSS styles that apply to the entire application.
import './globals.css';
// Import the ThemeProvider to handle light/dark mode switching across the app.
import { ThemeProvider } from '@/components/theme-provider';
// Import the Toaster component for displaying toast notifications.
import { Toaster } from '@/components/ui/sonner';

/**
 * Metadata Configuration
 * Defines the SEO-related data, social sharing information (OpenGraph/Twitter),
 * and site icons.
 */
export const metadata: Metadata = {
  // Configures the page title with a default and template for subpages.
  title: {
    default: 'Vision Agentic AI',
    template: '%s | Vision Agentic AI',
  },
  // Main description of the application for SEO.
  description:
    'Vision Agentic AI is a powerful agentic chatbot platform that lets you chat, search the web, extract data, and generate images with ease.',
  // Keywords for search engine indexing.
  keywords: [
    'AI',
    'Vision Agentic AI',
    'Agentic Chatbot',
    'AI Tools',
    'Web Search',
    'Data Extraction',
    'Image Generation',
    'AI Development',
    'Next.js AI',
  ],
  // OpenGraph configuration for better social media sharing on platforms like Facebook/LinkedIn.
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://vision-agentic-ai.com',
    siteName: 'Vision Agentic AI',
    title: 'Vision Agentic AI',
    description:
      'A powerful agentic chatbot platform with web search, data extraction, and image generation capabilities.',
    images: [
      {
        url: '/favicon_io/android-chrome-512x512.png',
        width: 512,
        height: 512,
        alt: 'Vision Agentic AI Logo',
      },
    ],
  },
  // Twitter card configuration for rich previews on X (formerly Twitter).
  twitter: {
    card: 'summary_large_image',
    title: 'Vision Agentic AI',
    description:
      'A powerful agentic chatbot platform with web search, data extraction, and image generation capabilities.',
    images: ['/favicon_io/android-chrome-512x512.png'],
  },
  // Favicon and app icon configurations for various devices and browsers.
  icons: {
    icon: [
      {
        url: '/favicon_io/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        url: '/favicon_io/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: '/favicon_io/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    other: [
      {
        rel: 'manifest',
        url: '/favicon_io/site.webmanifest',
      },
    ],
  },
};

/**
 * Root Layout Function
 * This is the top-level component that wraps all pages.
 * @param children - The page content to be rendered within the layout.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Root HTML element with English language setting and smooth scrolling enabled.
    <html lang="en" className="scroll-smooth">
      {/* Body tag with antialiasing for smoother font rendering. */}
      <body className="antialiased">
        {/* ThemeProvider wraps the application to manage dark/light modes. */}
        <ThemeProvider
          attribute="class" // Uses CSS classes for theme switching.
          defaultTheme="system" // Defaults to the user's system preference.
          enableSystem // Allows tracking of system theme changes.
          disableTransitionOnChange // Prevents flickers during theme transitions.
        >
          {/* Render the actual page content. */}
          {children}
          {/* Toaster component placed here to be available on all pages. */}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
