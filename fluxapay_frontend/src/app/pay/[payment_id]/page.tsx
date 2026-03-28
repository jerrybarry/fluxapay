import { CheckoutPageClient } from '@/components/checkout/CheckoutPageClient';

/**
 * Hosted checkout (full-page). Framing is denied via middleware (clickjacking).
 */
export default function CheckoutPage() {
  return <CheckoutPageClient mode="hosted" />;
}
