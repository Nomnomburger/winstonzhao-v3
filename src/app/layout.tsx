import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import ClientLayout from "./ClientLayout";

const ppNeueMontreal = localFont({
  src: [
    {
      path: "../../public/fonts/pp-neue-montreal/PPNeueMontreal-Thin.woff2",
      weight: "100",
      style: "normal",
    },
    {
      path: "../../public/fonts/pp-neue-montreal/PPNeueMontreal-ThinItalic.woff2",
      weight: "100",
      style: "italic",
    },
    {
      path: "../../public/fonts/pp-neue-montreal/PPNeueMontreal-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/pp-neue-montreal/PPNeueMontreal-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/pp-neue-montreal/PPNeueMontreal-Italic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../public/fonts/pp-neue-montreal/PPNeueMontreal-Book.woff2",
      weight: "450",
      style: "normal",
    },
    {
      path: "../../public/fonts/pp-neue-montreal/PPNeueMontreal-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/pp-neue-montreal/PPNeueMontreal-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/pp-neue-montreal/PPNeueMontreal-BoldItalic.woff2",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-pp-neue-montreal",
  fallback: ["Arial", "Helvetica", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Winston Zhao",
  description: "Winston Zhao's portfolio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${ppNeueMontreal.variable} antialiased`}
      >
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
