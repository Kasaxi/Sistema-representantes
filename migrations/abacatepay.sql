-- Migração para adicionar campos do AbacatePay à tabela shop_subscriptions

-- 1. Adicionar colunas para o AbacatePay
ALTER TABLE shop_subscriptions 
ADD COLUMN IF NOT EXISTS abacatepay_customer_id TEXT,
ADD COLUMN IF NOT EXISTS abacatepay_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('CARD', 'PIX', 'STRIPE')),
ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMP WITH TIME ZONE;

-- 2. Criar tabela para cobranças PIX pendentes
CREATE TABLE IF NOT EXISTS pending_pix_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    optic_id UUID REFERENCES optics(id) ON DELETE CASCADE,
    billing_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(optic_id, billing_id)
);

-- 3. Habilitar RLS na nova tabela
ALTER TABLE pending_pix_charges ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS para pending_pix_charges
DROP POLICY IF EXISTS "Admin and Rep can manage all pending charges" ON pending_pix_charges;
CREATE POLICY "Admin and Rep can manage all pending charges" ON pending_pix_charges FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'representative'))
);

DROP POLICY IF EXISTS "Shopkeepers can view their own pending charges" ON pending_pix_charges;
CREATE POLICY "Shopkeepers can view their own pending charges" ON pending_pix_charges FOR SELECT USING (
    optic_id IN (
        SELECT o.id FROM optics o 
        JOIN profiles p ON p.cnpj = o.cnpj 
        WHERE p.id = auth.uid()
    )
);
