import type { Metadata } from 'next'
import Script from 'next/script'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'AmerOS',
  description: 'jsweb-OS, a web-based operating system built with React and Next.js',
  icons: {
    icon: '/icon.svg',
  },
}

import { ClipboardProvider } from "@/lib/clipboard";
import { Toaster } from '@/components/ui/sonner';
import OSProvider from "@/components/System/OSProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
    <head>
    <meta name="google-site-verification" content="gVr2hebXws8kKvnwLSwhBHy8Egmzd9IhgO9GfCritCQ" />
    <Script src="https://www.googletagmanager.com/gtag/js?id=G-QCBRK64W0J" strategy="afterInteractive" />
    <Script id="google-analytics" strategy="afterInteractive">
      {`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-QCBRK64W0J');
      `}
    </Script>
    </head>
      <body className={`font-sans antialiased`}>
        <ClipboardProvider>
          <OSProvider>
            {children}
          </OSProvider>
          <Toaster />
          <Analytics />
        </ClipboardProvider>
      </body>
    </html>
  )
}
