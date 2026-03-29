import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { abacatepay } from '@/lib/abacatepay';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { optic_id, method } = body;

    if (!optic_id || !method) {
      return NextResponse.json(
        { error: 'optic_id e method são obrigatórios' },
        { status: 400 }
      );
    }

    if (!['CARD', 'PIX'].includes(method)) {
      return NextResponse.json(
        { error: 'method deve ser CARD ou PIX' },
        { status: 400 }
      );
    }

    const { data: optic, error: opticError } = await supabase
      .from('optics')
      .select('*, profiles!inner(*)')
      .eq('id', optic_id)
      .single();

    if (opticError || !optic) {
      return NextResponse.json(
        { error: 'Loja não encontrada' },
        { status: 404 }
      );
    }

    const profile = optic.profiles;
    const taxId = profile.cnpj?.replace(/\D/g, '') || '';
    const cellphone = profile.celular || '(00) 00000-0000';

    let customerId: string | undefined;
    let customer;

    const { data: existingSubscription } = await supabase
      .from('shop_subscriptions')
      .select('*')
      .eq('optic_id', optic_id)
      .single();

    if (existingSubscription?.abacatepay_customer_id) {
      customerId = existingSubscription.abacatepay_customer_id;
    } else {
      customer = {
        name: profile.name || optic.fantasy_name || 'Cliente',
        email: profile.email,
        taxId: taxId,
        cellphone: cellphone,
      };

      const customerResponse = await abacatepay.createCustomer(customer);
      
      if (customerResponse.error) {
        return NextResponse.json(
          { error: customerResponse.error },
          { status: 400 }
        );
      }

      customerId = customerResponse.data.id;
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const returnUrl = `${siteUrl}/lojista/upgrade?status=cancelled`;
    const completionUrl = `${siteUrl}/lojista/upgrade?status=completed`;
    const externalId = `optic_${optic_id}_${Date.now()}`;

    if (method === 'CARD') {
      const checkoutResponse = await abacatepay.createSubscriptionCheckout({
        items: [{ id: 'plan-pro', quantity: 1 }],
        customerId,
        methods: ['CARD'],
        returnUrl,
        completionUrl,
        externalId,
        metadata: {
          optic_id,
          plan: 'pro',
        },
      });

      if (checkoutResponse.error) {
        return NextResponse.json(
          { error: checkoutResponse.error },
          { status: 400 }
        );
      }

      if (existingSubscription) {
        await supabase
          .from('shop_subscriptions')
          .update({
            abacatepay_customer_id: customerId,
            abacatepay_subscription_id: checkoutResponse.data.id,
            payment_method: 'CARD',
          })
          .eq('optic_id', optic_id);
      } else {
        await supabase
          .from('shop_subscriptions')
          .insert({
            optic_id,
            plan: 'pro',
            status: 'active',
            abacatepay_customer_id: customerId,
            abacatepay_subscription_id: checkoutResponse.data.id,
            payment_method: 'CARD',
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          });
      }

      return NextResponse.json({
        url: checkoutResponse.data.url,
        checkoutId: checkoutResponse.data.id,
        method: 'CARD',
      });
    } else {
      const checkoutResponse = await abacatepay.createCheckout({
        items: [{ id: 'plan-pro', quantity: 1 }],
        customerId,
        methods: ['PIX'],
        returnUrl,
        completionUrl,
        externalId,
        metadata: {
          optic_id,
          plan: 'pro',
          is_first_payment: true,
        },
      });

      if (checkoutResponse.error) {
        return NextResponse.json(
          { error: checkoutResponse.error },
          { status: 400 }
        );
      }

      const nextBillingDate = new Date();
      nextBillingDate.setDate(nextBillingDate.getDate() + 30);

      if (existingSubscription) {
        await supabase
          .from('shop_subscriptions')
          .update({
            abacatepay_customer_id: customerId,
            payment_method: 'PIX',
            next_billing_date: nextBillingDate.toISOString(),
          })
          .eq('optic_id', optic_id);
      } else {
        await supabase
          .from('shop_subscriptions')
          .insert({
            optic_id,
            plan: 'pro',
            status: 'active',
            abacatepay_customer_id: customerId,
            payment_method: 'PIX',
            next_billing_date: nextBillingDate.toISOString(),
            current_period_end: nextBillingDate.toISOString(),
          });
      }

      return NextResponse.json({
        url: checkoutResponse.data.url,
        checkoutId: checkoutResponse.data.id,
        method: 'PIX',
        amount: checkoutResponse.data.amount,
      });
    }
  } catch (error) {
    console.error('Erro ao criar checkout:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
