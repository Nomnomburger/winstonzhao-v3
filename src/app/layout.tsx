import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import ThemeController from "@/components/ThemeController";

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

const SITE_URL = "https://winstonzhao.ca";
const SITE_DESCRIPTION =
  "Hej! I'm Winston, a product designer currently working at Newly in Stockholm Sweden. I'm pursuing a degree in Industrial Design at OCAD University in Toronto Canada.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Winston Zhao",
    template: "%s — Winston Zhao",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "Winston Zhao",
    "product designer",
    "Stockholm",
    "portfolio",
    "UX designer",
    "UI designer",
    "Newly",
    "Figma",
    "OCAD University",
    "OCAD",
    "Waterloo GBDA",
    "Waterloo",
    "Toronto",
  ],
  authors: [{ name: "Winston Zhao", url: SITE_URL }],
  creator: "Winston Zhao",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Winston Zhao",
    title: "Winston Zhao",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_US",
    alternateLocale: ["sv_SE", "zh_CN"],
    images: [
      {
        url: "/SocialImage.png",
        width: 1200,
        height: 630,
        alt: "Winston Zhao",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Winston Zhao",
    description: SITE_DESCRIPTION,
    images: ["/SocialImage.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Winston Zhao",
  alternateName: "赵思中",
  url: SITE_URL,
  jobTitle: "Product Designer",
  description: SITE_DESCRIPTION,
  email: "hello@winstonzhao.ca",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Stockholm",
    addressCountry: "SE",
  },
  worksFor: {
    "@type": "Organization",
    name: "Newly",
    url: "https://newly.app",
  },
  sameAs: ["https://www.linkedin.com/in/zhaowinston/"],
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <ThemeController />
        {children}
      </body>
    </html>
  );
}
