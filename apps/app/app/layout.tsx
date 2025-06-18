import type { Metadata } from "next";
import { Orbitron, Share_Tech_Mono } from "next/font/google";
import "./globals.css";

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
      <body
        className={`${orbitron.variable} ${shareTechMono.variable} font-mono antialiased bg-black text-white overflow-hidden`}
      >
        {children}
      </body>
    </html>
  );
}
