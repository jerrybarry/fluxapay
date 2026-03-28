'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckoutPageClient } from '@/components/checkout/CheckoutPageClient';
import { Loader2 } from 'lucide-react';

function EmbedCheckoutInner() {
  const sp = useSearchParams();
  return <CheckoutPageClient mode="embed" parentQuery={sp.get('parent')} />;
}

function EmbedFallback() {
  return (
    <div
      className="flex min-h-[240px] flex-col items-center justify-center gap-3 p-8 text-gray-600"
      role="status"
    >
      <Loader2 className="h-10 w-10 animate-spin" aria-hidden />
      <p>Loading checkout…</p>
    </div>
  );
}

/**
 * Embedded checkout spike: iframe target with CSP frame-ancestors + postMessage allowlist.
 * @see fluxapay_frontend/docs/EMBEDDED_CHECKOUT.md
 */
export default function EmbedCheckoutPage() {
  return (
    <Suspense fallback={<EmbedFallback />}>
      <EmbedCheckoutInner />
    </Suspense>
  );
}
