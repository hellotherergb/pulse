import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Providers } from "@/components/providers";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXTAUTH_URL ||
  "https://postinpulse.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Pulse — Create. Watch. Earn Sparks.",
    template: "%s · Pulse",
  },
  description:
    "Pulse is the social app for clips, posts, and stories. Create content, get views, and earn Sparks — the social feed that pays you for attention.",
  applicationName: "Pulse",
  keywords: [
    "Pulse",
    "Pulse app",
    "Pulse social",
    "Pulse Sparks",
    "clips",
    "short videos",
    "earn Sparks",
    "social feed",
  ],
  authors: [{ name: "Pulse" }],
  creator: "Pulse",
  publisher: "Pulse",
  category: "social",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Pulse",
    title: "Pulse — Create. Watch. Earn Sparks.",
    description:
      "Clips, posts, and stories — earn Sparks for every view and follower. Join Pulse.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pulse — Create. Watch. Earn Sparks.",
    description:
      "Clips, posts, and stories — earn Sparks for every view and follower.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  appleWebApp: {
    capable: true,
    title: "Pulse",
    statusBarStyle: "black-translucent",
  },
  verification: {
    other: {
      "msvalidate.01": "0B0A48755F7D1C7FB6E929D75B77017D",
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0f14",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: "Pulse",
        alternateName: ["Pulse App", "Pulse Social", "Pulse Sparks"],
        url: siteUrl,
        description:
          "The social feed that pays you for attention. Clips, posts, stories — earn Sparks for views and followers.",
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl}/signup`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "SoftwareApplication",
        name: "Pulse",
        applicationCategory: "SocialNetworkingApplication",
        operatingSystem: "Web",
        url: siteUrl,
        description:
          "Create clips, posts, and stories. Earn Sparks for views and followers.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      },
    ],
  };

  return (
    <html lang="en">
      <head>
        <meta
          name="msvalidate.01"
          content="0B0A48755F7D1C7FB6E929D75B77017D"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
