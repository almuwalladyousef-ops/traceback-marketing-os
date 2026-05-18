import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/shell/AppShell";
import { NavigationProgress } from "@/components/shell/NavigationProgress";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Traceback Marketing OS",
  description: "Internal marketing dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body suppressHydrationWarning className={`h-full antialiased ${inter.variable} ${jetbrainsMono.variable}`}>
        <NavigationProgress />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
