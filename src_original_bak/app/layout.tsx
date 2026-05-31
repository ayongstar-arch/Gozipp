import React from 'react';
import type { Metadata } from 'next';
import { Noto_Sans_Thai, Inter, Prompt, Kanit } from 'next/font/google';
import './globals.css';
import Providers from './providers';

const notoThai = Noto_Sans_Thai({ 
  subsets: ['thai'], 
  weight: ['300', '400', '600', '700'],
  variable: '--font-noto-thai',
  display: 'swap',
});

const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-inter',
  display: 'swap',
});

const prompt = Prompt({ 
  subsets: ['thai'], 
  weight: ['300', '400', '600'],
  variable: '--font-prompt',
  display: 'swap',
});

const kanit = Kanit({ 
  subsets: ['thai'], 
  weight: ['600', '700', '800'],
  variable: '--font-kanit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GOZIPP – แอปเรียกวินอัจฉริยะ รวดเร็ว ปลอดภัย',
  description: 'จองรถมอเตอร์ไซค์รับจ้างได้ทันทีกับ GOZIPP ปลอดภัย ฉลาด และราคาประหยัด เพื่อการเดินทางในเมืองที่ไร้ขีดจำกัด',
  manifest: '/manifest.json',
  openGraph: {
    title: 'GOZIPP – แอปเรียกวินที่คนไทยไว้วางใจ',
    description: 'จุดเริ่มความเร็ว เพื่อทุกการเดินทาง ไปกับ GOZIPP',
    url: 'https://gozipp.app',
    siteName: 'GOZIPP',
    images: [
      {
        url: '/og-gozipp.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'th_TH',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GOZIPP – แอปเรียกวินที่คนไทยไว้วางใจ',
    description: 'จุดเริ่มความเร็ว เพื่อทุกการเดินทาง ไปกับ GOZIPP',
    images: ['/og-gozipp.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={`${notoThai.variable} ${inter.variable} ${prompt.variable} ${kanit.variable}`}>
      <body className="bg-slate-950 text-slate-50 antialiased overflow-x-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
