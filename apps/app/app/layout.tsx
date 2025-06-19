import type { Metadata } from "next";
import { Orbitron, Share_Tech_Mono } from "next/font/google";
import "./globals.css";
import ThemeToggle from "../components/ThemeToggle";

  const orbitron = Orbitron({
    variable: "--font-orbitron",
    subsets: ["latin"],
    display: "swap",
  });

  const shareTechMono = Share_Tech_Mono({
    variable: "--font-share-tech",
    weight: "400",
    subsets: ["latin"],
  });

export const metadata: Metadata = {
  title: "FlameBot - Admin Dashboard",
  description: "Neural Interface for FlameBot Automation System",
  keywords: ["flamebot", "automation", "dashboard", "cyberpunk"],
  authors: [{ name: "pimbo" }],
  creator: "pimbo",
  openGraph: {
    title: "FlameBot Admin Interface",
    description: "Neural Interface for FlameBot Automation System",
    type: "website",
  },
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const savedTheme = localStorage.getItem('theme');
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  const theme = savedTheme || (prefersDark ? 'dark' : 'light');
                  
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${orbitron.variable} ${shareTechMono.variable} font-mono font-medium antialiased bg-white dark:bg-black text-zinc-900 dark:text-white overflow-hidden transition-colors duration-300`}
      >
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
