import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resume",
  description: "Resume of Winston Zhao, product designer based in Stockholm.",
  alternates: {
    canonical: "/resume",
  },
  openGraph: {
    title: "Resume — Winston Zhao",
    description: "Resume of Winston Zhao, product designer based in Stockholm.",
    url: "https://winston.studio/resume",
  },
};

export default function ResumeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
