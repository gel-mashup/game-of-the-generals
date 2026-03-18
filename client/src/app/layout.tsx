import type { Metadata } from 'next';
import { SocketProvider } from '@/components/SocketProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Game of the Generals',
  description: 'The classic Filipino strategy game, online',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SocketProvider>{children}</SocketProvider>
      </body>
    </html>
  );
}
