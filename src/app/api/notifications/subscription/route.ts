import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const opticId = searchParams.get('optic_id');

    if (!opticId) {
      return NextResponse.json(
        { error: 'optic_id é obrigatório' },
        { status: 400 }
      );
    }

    const { data: subscription, error } = await supabase
      .from('shop_subscriptions')
      .select('*')
      .eq('optic_id', opticId)
      .single();

    if (error || !subscription) {
      return NextResponse.json({
        has_subscription: false,
        is_expiring_soon: false,
        days_until_expiry: null,
        plan: 'free',
        status: null,
      });
    }

    if (subscription.plan === 'free') {
      return NextResponse.json({
        has_subscription: true,
        is_expiring_soon: false,
        days_until_expiry: null,
        plan: 'free',
        status: 'active',
      });
    }

    const now = new Date();
    const periodEnd = new Date(subscription.current_period_end);
    const diffTime = periodEnd.getTime() - now.getTime();
    const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const isExpiringSoon = daysUntilExpiry <= 7 && daysUntilExpiry > 0;

    return NextResponse.json({
      has_subscription: true,
      is_expiring_soon: isExpiringSoon,
      days_until_expiry: daysUntilExpiry,
      plan: subscription.plan,
      status: subscription.status,
      payment_method: subscription.payment_method,
      current_period_end: subscription.current_period_end,
    });
  } catch (error) {
    console.error('Erro ao buscar status da assinatura:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
