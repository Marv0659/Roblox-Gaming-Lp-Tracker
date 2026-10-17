import type { Metadata } from "next";
import { Barlow_Condensed, Geist_Mono, IBM_Plex_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const body = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const heading = Barlow_Condensed({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LP Tracker",
  description: "Friends-only gaming tracker",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${body.variable} ${heading.variable} ${geistMono.variable} min-h-screen bg-background text-foreground antialiased font-sans`}
      >
        <Providers>{children}</Providers>
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
