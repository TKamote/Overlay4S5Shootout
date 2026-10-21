import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Overlay4S5 Shootout",
  description: "Standalone shootout overlay — OBS landscape, vertical, and controller",
  icons: {
    icon: "/PSGB_TransparantLogo.PNG",
    apple: "/PSGB_TransparantLogo.PNG",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
