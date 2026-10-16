import type { Metadata } from 'next';
import { JetBrains_Mono, Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { Providers } from './providers';
import './globals.css';

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

import { BRAND } from '@/config/brand.config';

export const metadata: Metadata = {
  title: `${BRAND.name} - ${BRAND.tagline}`,
  description: BRAND.description,
  keywords:
    'prediction markets, kalshi, polymarket, market movements, probability shifts, real-time tracking, breaking news, smart money, betting markets, event probabilities, live markets',
  authors: [{ name: BRAND.author }],
  creator: BRAND.name,
  publisher: BRAND.legalEntity,
  openGraph: {
    title: `${BRAND.name} - ${BRAND.tagline}`,
    description: BRAND.description,
    url: BRAND.domain,
    siteName: BRAND.name,
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: `${BRAND.domain}/og-image.png`,
        width: 1200,
        height: 630,
        alt: `${BRAND.name} - ${BRAND.tagline}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND.name} - ${BRAND.tagline}`,
    description: BRAND.description,
    site: BRAND.social.twitter || '@tremordotlive',
    creator: BRAND.social.twitter || '@tremordotlive',
    images: [`${BRAND.domain}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/tremor-icon.svg',
    shortcut: '/tremor-icon.svg',
    apple: '/tremor-icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${jetbrainsMono.variable} ${inter.variable} bg-paper font-sans text-ink antialiased`}
      >
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
