import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Winston Zhao - Portfolio",
  description: "Product designer crafting software and digital experiences that solve problems and delight users.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
