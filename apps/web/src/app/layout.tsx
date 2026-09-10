import type { Metadata } from 'next';
import type React from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'Anonym Messenger',
  description: 'Privacy-first, anonymity-focused communication system.',
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
