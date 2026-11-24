import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dogar's Fire & Flavour | Order Online",
  description: "Smoky BBQ, juicy burgers, and fresh favourites made for sharing.",
  applicationName: "Dogar's Fire & Flavour",
};

export const viewport: Viewport = {
  themeColor: "#35170f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
