import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import BootSplash from "@/components/boot-splash";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "OtoFlow Pro — by NB Projects",
    template: "%s · OtoFlow Pro",
  },
  description:
    "Aplikasi manajemen bengkel OtoFlow Pro by NB Projects — kasir, servis, stok, dan laporan keuangan.",
  applicationName: "OtoFlow Pro",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-canvas text-slate-900">
        <BootSplash />
        {children}
      </body>
    </html>
  );
}
