import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

/**
 * Hosted `/pay/:id` denies framing (clickjacking). Embed `/pay/:id/embed` allows only
 * origins listed in CHECKOUT_EMBED_FRAME_ANCESTORS (CSP frame-ancestors).
 */
function checkoutSecurityResponse(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;

  if (/^\/pay\/[^/]+\/embed\/?$/.test(pathname)) {
    const frameAncestors =
      process.env.CHECKOUT_EMBED_FRAME_ANCESTORS?.trim() || "'none'";
    const res = NextResponse.next();
    res.headers.set(
      'Content-Security-Policy',
      `frame-ancestors ${frameAncestors}`,
    );
    res.headers.set('X-Content-Type-Options', 'nosniff');
    return res;
  }

  if (/^\/pay\/[^/]+\/?$/.test(pathname)) {
    const res = NextResponse.next();
    res.headers.set('X-Frame-Options', 'DENY');
    res.headers.set('Content-Security-Policy', "frame-ancestors 'none'");
    res.headers.set('X-Content-Type-Options', 'nosniff');
    return res;
  }

  return null;
}

export default function middleware(request: NextRequest) {
  const checkout = checkoutSecurityResponse(request);
  if (checkout) return checkout;
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    '/',
    '/(en|fr|pt)/:path*',
    '/signup',
    '/login',
    '/verify-otp',
    '/pay/:path*',
  ],
};
