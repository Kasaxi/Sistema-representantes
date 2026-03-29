import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { abacatepay, WebhookPayload } from '@/lib/abacatepay';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('X-Webhook-Signature');
    const webhookSecret = req.nextUrl.searchParams.get('webhookSecret');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    if (webhookSecret !== process.env.ABACATEPAY_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 });
    }

    const isValidSignature = abacatepay.verifySignature(rawBody, signature);
    if (!isValidSignature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload: WebhookPayload = JSON.parse(rawBody);
    const { event, data, devMode } = payload;

    if (devMode) {
      console.log('[DEV MODE] Evento recebido:', event);
    }

    switch (event) {
      case 'subscription.completed': {
        const subscription = data.subscription;
        const checkout = data.checkout as { metadata?: Record<string, unknown> } | undefined;
        const opticId = checkout?.metadata?.optic_id as string | undefined;

        if (opticId) {
          const nextPeriodEnd = new Date();
          nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

          await supabase
            .from('shop_subscriptions')
            .upsert({
              optic_id: opticId,
              plan: 'pro',
              status: 'active',
              abacatepay_subscription_id: subscription?.id,
              payment_method: 'CARD',
              current_period_end: nextPeriodEnd.toISOString(),
            }, { onConflict: 'optic_id' });
        }
        break;
      }

      case 'subscription.renewed': {
        const subscription = data.subscription;
        
        if (subscription?.id) {
          const nextPeriodEnd = new Date();
          if (subscription.frequency === 'MONTHLY') {
            nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
          } else if (subscription.frequency === 'YEARLY') {
            nextPeriodEnd.setFullYear(nextPeriodEnd.getFullYear() + 1);
          }

          await supabase
            .from('shop_subscriptions')
            .update({
              status: 'active',
              current_period_end: nextPeriodEnd.toISOString(),
            })
            .eq('abacatepay_subscription_id', subscription.id);
        }
        break;
      }

      case 'subscription.cancelled': {
        const subscription = data.subscription;
        
        if (subscription?.id) {
          await supabase
            .from('shop_subscriptions')
            .update({
              status: 'canceled',
            })
            .eq('abacatepay_subscription_id', subscription.id);
        }
        break;
      }

      case 'checkout.completed': {
        const checkout = data.checkout as { id: string; amount: number; metadata?: Record<string, unknown> } | undefined;
        const opticId = checkout?.metadata?.optic_id as string | undefined;
        const isFirstPayment = checkout?.metadata?.is_first_payment;

        if (opticId) {
          const nextBillingDate = new Date();
          nextBillingDate.setDate(nextBillingDate.getDate() + 30);

          await supabase
            .from('shop_subscriptions')
            .upsert({
              optic_id: opticId,
              plan: 'pro',
              status: 'active',
              payment_method: 'PIX',
              current_period_end: nextBillingDate.toISOString(),
              next_billing_date: nextBillingDate.toISOString(),
            }, { onConflict: 'optic_id' });

          if (isFirstPayment) {
            await supabase
              .from('pending_pix_charges')
              .insert({
                optic_id: opticId,
                billing_id: checkout?.id,
                amount: checkout?.amount || 0,
                status: 'paid',
              });
          }
        }
        break;
      }

      case 'checkout.expired': {
        const checkout = data.checkout as { metadata?: Record<string, unknown> } | undefined;
        const opticId = checkout?.metadata?.optic_id as string | undefined;

        if (opticId) {
          await supabase
            .from('shop_subscriptions')
            .update({
              status: 'past_due',
            })
            .eq('optic_id', opticId);
        }
        break;
      }

      case 'checkout.refunded': {
        const checkout = data.checkout as { metadata?: Record<string, unknown> } | undefined;
        const opticId = checkout?.metadata?.optic_id as string | undefined;

        if (opticId) {
          await supabase
            .from('shop_subscriptions')
            .update({
              status: 'canceled',
            })
            .eq('optic_id', opticId);
        }
        break;
      }

      default:
        console.log(`[ABACATEPAY] Evento não tratado: ${event}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Erro no webhook:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
