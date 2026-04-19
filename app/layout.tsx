import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "Post-Discharge Companion",
  description:
    "Turn discharge instructions into a daily plan, check-ins, and clear next steps.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f766e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <div className="mx-auto flex min-h-dvh max-w-lg flex-col pb-24">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
