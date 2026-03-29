import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { abacatepay } from '@/lib/abacatepay';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const { data: subscriptions, error: fetchError } = await supabase
      .from('shop_subscriptions')
      .select(`
        *,
        optics!inner(id, fantasy_name, cnpj, profiles!inner(email, name, celular))
      `)
      .eq('status', 'active')
      .eq('payment_method', 'PIX')
      .lte('next_billing_date', threeDaysFromNow.toISOString())
      .gte('next_billing_date', now.toISOString());

    if (fetchError) {
      console.error('Erro ao buscar assinaturas:', fetchError);
      return NextResponse.json(
        { error: 'Erro ao buscar assinaturas' },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        message: 'Nenhuma cobrança para processar',
        processed: 0,
      });
    }

    const results = [];

    for (const subscription of subscriptions) {
      try {
        const optic = subscription.optics;
        const profile = optic.profiles;

        const customerId = subscription.abacatepay_customer_id;
        
        if (!customerId) {
          console.error(`Cliente não encontrado para optic_id: ${subscription.optic_id}`);
          continue;
        }

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const returnUrl = `${siteUrl}/lojista/upgrade?status=cancelled`;
        const completionUrl = `${siteUrl}/lojista/upgrade?status=completed`;
        const externalId = `optic_${subscription.optic_id}_renew_${Date.now()}`;

        const checkoutResponse = await abacatepay.createCheckout({
          items: [{ id: 'plan-pro', quantity: 1 }],
          customerId,
          methods: ['PIX'],
          returnUrl,
          completionUrl,
          externalId,
          metadata: {
            optic_id: subscription.optic_id,
            plan: 'pro',
            is_first_payment: false,
            is_renewal: true,
          },
        });

        if (checkoutResponse.error) {
          console.error(`Erro ao criar cobrança para optic_id ${subscription.optic_id}:`, checkoutResponse.error);
          results.push({
            optic_id: subscription.optic_id,
            status: 'error',
            error: checkoutResponse.error,
          });
          continue;
        }

        const nextBillingDate = new Date();
        nextBillingDate.setDate(nextBillingDate.getDate() + 30);

        await supabase
          .from('shop_subscriptions')
          .update({
            current_period_end: nextBillingDate.toISOString(),
            next_billing_date: nextBillingDate.toISOString(),
          })
          .eq('optic_id', subscription.optic_id);

        await supabase
          .from('pending_pix_charges')
          .insert({
            optic_id: subscription.optic_id,
            billing_id: checkoutResponse.data.id,
            amount: checkoutResponse.data.amount,
            status: 'pending',
          });

        results.push({
          optic_id: subscription.optic_id,
          status: 'success',
          checkoutUrl: checkoutResponse.data.url,
          nextBillingDate: nextBillingDate.toISOString(),
        });

        console.log(`Cobrança PIX criada para optic_id: ${subscription.optic_id}`);
      } catch (innerError) {
        console.error(`Erro ao processar assinatura ${subscription.optic_id}:`, innerError);
        results.push({
          optic_id: subscription.optic_id,
          status: 'error',
          error: String(innerError),
        });
      }
    }

    return NextResponse.json({
      message: `Processadas ${results.length} cobranças`,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error('Erro no processamento de cobranças PIX:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
