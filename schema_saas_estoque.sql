-- ==========================================
-- MÓDULO DE ESTOQUE SAAS - MIGRAÇÃO DE BANCO
-- ==========================================

-- 1. Criar Tipos Enum para a Assinatura (se não existirem)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_type') THEN
        CREATE TYPE plan_type AS ENUM ('free', 'pro');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
        CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'unpaid');
    END IF;
END $$;

-- 2. Criar Tabela de Assinaturas das Lojas
CREATE TABLE IF NOT EXISTS shop_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    optic_id UUID REFERENCES optics(id) ON DELETE CASCADE,
    plan plan_type NOT NULL DEFAULT 'free',
    status subscription_status NOT NULL DEFAULT 'active',
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(optic_id)
);

-- Habilitar RLS na nova tabela
ALTER TABLE shop_subscriptions ENABLE ROW LEVEL SECURITY;

-- Admins e Representantes podem ver e editar todas as assinaturas
DROP POLICY IF EXISTS "Admin and Rep can manage all subscriptions" ON shop_subscriptions;
CREATE POLICY "Admin and Rep can manage all subscriptions" ON shop_subscriptions FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'representative'))
);

-- Lojistas podem apenas VER a própria assinatura
DROP POLICY IF EXISTS "Shopkeepers can view their own subscription" ON shop_subscriptions;
CREATE POLICY "Shopkeepers can view their own subscription" ON shop_subscriptions FOR SELECT USING (
    optic_id IN (
        SELECT o.id FROM optics o 
        JOIN profiles p ON p.cnpj = o.cnpj 
        WHERE p.id = auth.uid()
    )
);

-- 3. Inserir Assinatura 'Free' padrão para todas as óticas existentes que não tem assinatura
INSERT INTO shop_subscriptions (optic_id, plan, status)
SELECT id, 'free', 'active' 
FROM optics 
WHERE NOT EXISTS (
    SELECT 1 FROM shop_subscriptions WHERE shop_subscriptions.optic_id = optics.id
);

-- 4. Atualizar RLS Policies (Módulo de Estoque)
-- Restringir Lojistas: Só podem gerenciar estoque se tiverem plano 'pro' e status 'active'.
-- Se for Admin/Representative, continua podendo acessar tudo.

-- Tabela: INVENTORY_CONFIGS
DROP POLICY IF EXISTS "Shopkeepers can manage their own inventory configs" ON inventory_configs;
CREATE POLICY "Shopkeepers can manage their own inventory configs" ON inventory_configs FOR ALL USING (
    -- É dono da ótica
    optic_id IN (
        SELECT o.id FROM optics o 
        JOIN profiles p ON p.cnpj = o.cnpj 
        WHERE p.id = auth.uid()
    )
    AND 
    -- Tem assinatura PRO ativa
    EXISTS (
        SELECT 1 FROM shop_subscriptions sub
        WHERE sub.optic_id = inventory_configs.optic_id 
        AND sub.plan = 'pro' 
        AND sub.status = 'active'
    )
);

-- Tabela: INVENTORY_MOVEMENTS
DROP POLICY IF EXISTS "Shopkeepers can manage their own movements" ON inventory_movements;
CREATE POLICY "Shopkeepers can manage their own movements" ON inventory_movements FOR ALL USING (
    -- É dono da ótica
    optic_id IN (
        SELECT o.id FROM optics o 
        JOIN profiles p ON p.cnpj = o.cnpj 
        WHERE p.id = auth.uid()
    )
    AND 
    -- Tem assinatura PRO ativa
    EXISTS (
        SELECT 1 FROM shop_subscriptions sub
        WHERE sub.optic_id = inventory_movements.optic_id 
        AND sub.plan = 'pro' 
        AND sub.status = 'active'
    )
);

-- Nota: Como o Supabase avalia as políticas com OR (se houver múltiplas para o mesmo role), 
-- garantimos que a política do Rep/Admin continue funcionando normalmente (pois tem a própria policy).
