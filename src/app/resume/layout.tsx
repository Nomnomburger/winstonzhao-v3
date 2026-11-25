import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resume",
  description: "Resume of Winston Zhao, a product designer in Toronto and Figma Campus Leader studying Industrial Design at OCAD University.",
  alternates: {
    canonical: "/resume",
  },
  openGraph: {
    title: "Resume — Winston Zhao",
    description: "Resume of Winston Zhao, a product designer in Toronto and Figma Campus Leader studying Industrial Design at OCAD University.",
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
