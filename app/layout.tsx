import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: {
    default: "Vision AI Studio",
    template: "%s | Vision AI Studio",
  },
  description:
    "Experience the future of AI with Vision AI Studio. A powerful agentic chatbot platform, intuitive, and ready for your next project.",
  keywords: [
    "AI",
    "Vision AI Studio",
    "Agentic Chatbot",
    "AI Platform",
    "Computer Vision",
    "Machine Learning",
    "Deep Learning",
    "AI Tools",
    "AI Development",
    "AI Solutions",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://vision-ai-studio.com",
    siteName: "Vision AI Studio",
    title: "Vision AI Studio",
    description:
      "Experience the future of computer vision with Vision AI Studio. Powerful, intuitive, and ready for your next project.",
    images: [
      {
        url: "/favicon_io/android-chrome-512x512.png",
        width: 512,
        height: 512,
        alt: "Vision AI Studio Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vision AI Studio",
    description:
      "Experience the future of computer vision with Vision AI Studio. Powerful, intuitive, and ready for your next project.",
    images: ["/favicon_io/android-chrome-512x512.png"],
  },
  icons: {
    icon: [
      {
        url: "/favicon_io/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/favicon_io/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/favicon_io/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    other: [
      {
        rel: "manifest",
        url: "/favicon_io/site.webmanifest",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (

      <html lang="en" className="scroll-smooth">
        <body className="antialiased">
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </body>
      </html>
  );
}
