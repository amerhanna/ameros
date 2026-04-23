import type { Metadata } from 'next'
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
import { RegistryProvider } from "@/lib/registry-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <ClipboardProvider>
          <RegistryProvider>
            {children}
            <Analytics />
          </RegistryProvider>
        </ClipboardProvider>
      </body>
    </html>
  )
}
