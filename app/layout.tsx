import type { Metadata } from "next";
import { Manrope } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Pearl Auction Admin",
  description: "Pearl Auction Administration Console",
  icons: {
    icon: "/client-logo.png",
    shortcut: "/client-logo.png",
    apple: "/client-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={manrope.variable}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
