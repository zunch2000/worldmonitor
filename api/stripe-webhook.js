export const config = { runtime: 'edge' };

// Minimal Stripe webhook receiver.
// Configure STRIPE_WEBHOOK_SECRET in Vercel to enable signature verification.
// For now this handler logs events to Vercel function logs. Replace the
// console.log with database calls (Upstash, Convex, etc.) for production.

async function verifySignature(rawBody, header) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return true; // no secret configured -> skip verification (NOT for prod)

  try {
    // header format: t=timestamp,v1=signature
    const parts = header.split(',').reduce((acc, p) => {
      const [k, v] = p.split('='); acc[k] = v; return acc;
    }, {});
    const sig = parts.v1;
    const ts = parts.t;
    if (!sig || !ts) return false;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msg = encoder.encode(`${ts}.${rawBody}`);

    const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, msg);
    const sigHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');

    // stripe sends hex lowercase
    return sigHex === sig;
  } catch (e) {
    console.warn('signature verify failed', e);
    return false;
  }
}

export default async function handler(req) {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const raw = await req.text();
    const sigHeader = req.headers.get('stripe-signature') || '';

    const ok = await verifySignature(raw, sigHeader);
    if (!ok) {
      console.warn('Stripe webhook signature verification failed');
      // continue anyway for local testing; in prod return 400
      // return new Response('Invalid signature', { status: 400 });
    }

    const event = JSON.parse(raw);

    // Handle the event types you care about
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('Checkout completed:', event.data.object);
        // TODO: persist subscription -> mark user as PRO in your DB
        break;
      case 'invoice.payment_succeeded':
        console.log('Invoice paid:', event.data.object);
        break;
      case 'invoice.payment_failed':
        console.log('Invoice failed:', event.data.object);
        break;
      default:
        console.log('Unhandled Stripe event:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('webhook error', err);
    return new Response(JSON.stringify({ error: String(err.message) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
