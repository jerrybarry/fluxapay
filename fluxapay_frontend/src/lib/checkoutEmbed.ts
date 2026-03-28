/**
 * Origins allowed to receive postMessage events from embedded checkout.
 * Set `NEXT_PUBLIC_CHECKOUT_EMBED_PARENT_ORIGINS` to a comma-separated list
 * (e.g. `https://shop.example,https://app.shop.example`).
 */
export function getCheckoutEmbedParentAllowlist(): string[] {
  const raw = process.env.NEXT_PUBLIC_CHECKOUT_EMBED_PARENT_ORIGINS ?? '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseParentOriginParam(param: string | null | undefined): string | null {
  if (!param || !param.trim()) return null;
  try {
    return new URL(param.trim()).origin;
  } catch {
    return null;
  }
}

export function isOriginAllowed(
  origin: string,
  allowlist: string[],
): boolean {
  return allowlist.some((entry) => entry === origin);
}

/** Payload posted to the parent window when checkout status changes (embed only). */
export type CheckoutEmbedMessage = {
  source: 'fluxapay';
  type: 'checkout:status';
  paymentId: string;
  status: string;
};

export function postCheckoutEmbedStatus(
  parentOrigin: string,
  message: CheckoutEmbedMessage,
): void {
  if (typeof window === 'undefined') return;
  window.parent?.postMessage(message, parentOrigin);
}
