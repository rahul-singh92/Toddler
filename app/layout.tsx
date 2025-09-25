import type { Metadata, Viewport } from "next"; // ✅ Add Viewport import
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ✅ Separate viewport export
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#C8A2D6",
};

// ✅ Clean metadata export (removed viewport and themeColor)
export const metadata: Metadata = {
  title: {
    default: "Toddler",
    template: "%s | Toddler"
  },
  description: "Organize your tasks efficiently with smart collaboration features, calendar views and different styles",
  icons: {
    icon: { url: "/images/main-logo.svg", type: "image/svg+xml" },
    shortcut: "/images/main-logo.svg",
    apple: "/images/main-logo.svg",
  },
  keywords: ["todo", "tasks", "productivity", "collaboration", "calendar"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
