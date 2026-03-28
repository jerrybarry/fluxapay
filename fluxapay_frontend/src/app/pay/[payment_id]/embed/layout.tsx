import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Embedded checkout · FluxaPay',
  robots: { index: false, follow: false },
};

export default function EmbedPayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
