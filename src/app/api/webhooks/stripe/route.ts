import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Usamos o Service Role Key para contornar o RLS ao atualizar as assinaturas (pois o webhook não é autenticado por usuário)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  try {
            if (event.type === 'checkout.session.completed') {
                const session = event.data.object as Stripe.Checkout.Session;
                const opticId = session.client_reference_id;
                const subscriptionId = session.subscription as string;
                const customerId = session.customer as string;

                if (opticId && subscriptionId) {
                    // Fetch subscription details to get current_period_end
                    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                    const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000).toISOString();

                    await supabase
                        .from('shop_subscriptions')
                        .upsert({
                            optic_id: opticId,
                            plan: 'pro',
                            status: 'active',
                            stripe_customer_id: customerId,
                            stripe_subscription_id: subscriptionId,
                            current_period_end: currentPeriodEnd
                        }, { onConflict: 'optic_id' });
                }
            }

            if (event.type === 'invoice.payment_succeeded') {
                const invoice = event.data.object as Stripe.Invoice;
                const subscriptionId = (invoice as any).subscription as string;
                
                if (subscriptionId) {
                    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                    const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000).toISOString();

                    await supabase
                        .from('shop_subscriptions')
                        .update({ 
                            status: 'active',
                            current_period_end: currentPeriodEnd
                        })
                        .eq('stripe_subscription_id', subscriptionId);
                }
            }

            if (event.type === 'invoice.payment_failed') {
                const invoice = event.data.object as Stripe.Invoice;
                const subscriptionId = (invoice as any).subscription as string;

                if (subscriptionId) {
                    await supabase
                        .from('shop_subscriptions')
                        .update({ status: 'past_due' })
                        .eq('stripe_subscription_id', subscriptionId);
                }
            }

            if (event.type === 'customer.subscription.deleted') {
                const subscription = event.data.object as Stripe.Subscription;
                
                await supabase
                    .from('shop_subscriptions')
                    .update({ status: 'canceled' })
                    .eq('stripe_subscription_id', subscription.id);
            }
    // The original code had a default case for the switch statement.
    // With the if-else if structure, unhandled events will simply fall through.
    // If specific logging for unhandled events is still desired, it would need to be added here.
    // For example:
    // else {
    //   console.log(`Unhandled event type: ${event.type}`);
    // }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Webhook event handling failed:', err);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
