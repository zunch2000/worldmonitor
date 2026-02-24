export const config = { runtime: 'edge' };

// Minimal Stripe Checkout session creation without the Stripe SDK.
// Requires the following environment variables in Vercel:
// - STRIPE_SECRET_KEY (sk_...)
// - STRIPE_PRICE_ID (optional) — a recurring price id for subscription mode
// If STRIPE_PRICE_ID is set, this will create a subscription Checkout session.
// Otherwise it creates a one-time payment of $49 (4900 cents) as a fallback.

async function createStripeCheckoutSession(body, origin) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }

  const priceId = process.env.STRIPE_PRICE_ID; // optional

  const form = new URLSearchParams();
  form.append('success_url', `${origin}/?checkout=success`);
  form.append('cancel_url', `${origin}/?checkout=cancel`);

  if (priceId) {
    // Subscription mode using an existing Price created in Stripe dashboard
    form.append('mode', 'subscription');
    form.append('line_items[0][price]', priceId);
    form.append('line_items[0][quantity]', '1');
  } else {
    // Fallback: one-time payment of $49.00 USD
    form.append('mode', 'payment');
    form.append('line_items[0][price_data][currency]', 'usd');
    form.append('line_items[0][price_data][product_data][name]', 'World Monitor — Pro (fallback)');
    form.append('line_items[0][price_data][unit_amount]', '4900');
    form.append('line_items[0][quantity]', '1');
  }

  // Allow card payments
  form.append('payment_method_types[]', 'card');

  const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secret}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Stripe API error: ${resp.status} ${text}`);
  }

  return resp.json();
}

export default async function handler(req) {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    const origin = new URL(req.url).origin;
    // You can optionally pass { email, metadata } in the request body for bookkeeping.
    const { email } = await req.json().catch(() => ({}));

    const session = await createStripeCheckoutSession({ email }, origin);

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err.message) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
