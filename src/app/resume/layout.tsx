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
    images: [{ url: "/SocialImage.png?v=2", width: 1200, height: 630, alt: "Winston Zhao" }],
  },
};

export default function ResumeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
