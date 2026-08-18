import type { Metadata } from "next";
import {
 Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import {
 Providers } from "@/components/providers";
import {
 AppSidebar } from "@/components/app-sidebar";
import {
 TopBar } from "@/components/top-bar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "GoTrading - Algorithmic Trading Platform",
  description: "Professional algorithmic trading platform for Indian markets",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <Providers>
          <div className="flex h-screen">
            <AppSidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
              <TopBar />
              <main className="flex-1 overflow-auto bg-background p-4">
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
