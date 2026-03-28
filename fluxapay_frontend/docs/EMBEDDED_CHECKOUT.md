# Embedded checkout (spike)

This document supports the product spike for on-site checkout via iframe ([issue #329](https://github.com/MetroLogic/fluxapay/issues/329)): threat model, minimal flow, and differences from hosted checkout.

## Hosted vs embedded

| | Hosted `/pay/:paymentId` | Embedded `/pay/:paymentId/embed` |
|---|--------------------------|----------------------------------|
| **Navigation** | Customer opens full-page URL (often redirect from merchant). | Merchant page loads checkout inside an `<iframe>`. |
| **Framing** | **Denied** — `X-Frame-Options: DENY` and `Content-Security-Policy: frame-ancestors 'none'`. | **Restricted** — `frame-ancestors` must list parent storefront origins (`CHECKOUT_EMBED_FRAME_ANCESTORS`). |
| **Return to merchant** | Browser navigates to `success_url` / user leaves FluxaPay origin. | Parent page stays put; checkout notifies parent via **`postMessage`** (with strict origin allowlist). |
| **Configuration** | None beyond normal checkout base URL. | Deploy must set **two** env vars (see below) so CSP and JavaScript allowlists stay aligned. |

## Threat model

### Clickjacking

**Risk:** A malicious site iframes checkout and tricks the user into interacting with a transparent overlay (e.g. fake “Pay” button) while the real wallet action happens underneath.

**Mitigations in this spike:**

1. **Hosted checkout** cannot be framed; attackers cannot overlay it on their domain.
2. **Embedded checkout** is only frameable by origins explicitly allowed in **`CHECKOUT_EMBED_FRAME_ANCESTORS`** (CSP `frame-ancestors`). This must be a **small, HTTPS-first** list of merchant storefront origins (not `*`).

Operational note: keep this list in sync with **`NEXT_PUBLIC_CHECKOUT_EMBED_PARENT_ORIGINS`** (comma-separated). Both should describe the same storefront origins in different formats (CSP uses spaces; the public allowlist uses commas).

### `postMessage` and origin confusion

**Risk:** If the iframe used `postMessage(data, '*')`, any opener or embedding context could receive payment status events. Forged listeners could confuse merchant scripts.

**Mitigations in this spike:**

1. The iframe **only** sends messages with a concrete **`targetOrigin`** equal to the normalized `parent` query parameter.
2. That parent origin must **exactly match** an entry in **`NEXT_PUBLIC_CHECKOUT_EMBED_PARENT_ORIGINS`** (after `new URL(parent).origin` normalization).
3. **Merchants** should listen with `window.addEventListener('message', …)` and **reject** any event where `event.origin` is not their own origin and `event.data?.source !== 'fluxapay'`.

### Data leakage via URL

**Risk:** Putting secrets in `parent` or payment URLs.

**Guidance:** `parent` must be an **origin only** (scheme + host + port), passed as a full URL string (e.g. `https://shop.example`). Do not put API keys or PII in checkout URLs.

## Minimal merchant flow

1. **Server-side:** Create a payment (existing API); obtain `paymentId` (from returned `checkout_url` or API body).
2. **Configure** the FluxaPay frontend deployment with allowlisted storefront origins (env vars below).
3. **Build embed URL** (same checkout host as hosted checkout):

   ```
   https://<checkout-host>/pay/<paymentId>/embed?parent=<encodeURIComponent(storefrontOrigin)>
   ```

   Example: `parent=https%3A%2F%2Fshop.example`

4. **HTML:**

   ```html
   <iframe
     title="Pay with FluxaPay"
     src="https://checkout.example/pay/PAYMENT_ID/embed?parent=https%3A%2F%2Fshop.example"
     width="420"
     height="720"
     style="border:0"
   ></iframe>
   ```

5. **Listen for status** (merchant page):

   ```javascript
   window.addEventListener('message', (event) => {
     if (event.origin !== 'https://shop.example') return;
     const msg = event.data;
     if (msg?.source !== 'fluxapay' || msg.type !== 'checkout:status') return;
     // msg.paymentId, msg.status — e.g. pending | confirmed | expired | failed
   });
   ```

## Message shape

```ts
{
  source: 'fluxapay',
  type: 'checkout:status',
  paymentId: string,
  status: string
}
```

Messages are sent when status is known or changes (including while **pending**). **Do not** treat `postMessage` as a payment guarantee; verify with your **server** (API or webhooks) before fulfilling orders.

## Environment variables

| Variable | Where | Purpose |
|----------|--------|---------|
| `CHECKOUT_EMBED_FRAME_ANCESTORS` | Server / Edge (middleware) | CSP `frame-ancestors` value, space-separated, e.g. `https://shop.example https://app.shop.example` |
| `NEXT_PUBLIC_CHECKOUT_EMBED_PARENT_ORIGINS` | Browser | Comma-separated list of allowed `parent` origins and `postMessage` targets |

If `NEXT_PUBLIC_CHECKOUT_EMBED_PARENT_ORIGINS` is empty, embedded routes show a configuration error (embed disabled).

## SDK helper

`@fluxapay/sdk` exports `buildCheckoutEmbedUrl` to construct the iframe `src` from a checkout base URL, payment id, and parent origin.

## Future work (out of scope for this spike)

- Per-merchant allowlists stored in the backend instead of deployment env.
- Optional signed `parent` or nonce to bind iframe instances.
- Resize / `postMessage` handshake for dynamic iframe height.
- Formal versioning of message payloads.
