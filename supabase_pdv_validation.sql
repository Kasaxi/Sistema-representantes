-- ==========================================
-- FASE 1: BANCO DE DADOS - PDV COM VALIDAÇÃO
-- ==========================================

-- 1. Adicionar campo is_from_rep na brands
ALTER TABLE brands ADD COLUMN IF NOT EXISTS is_from_rep BOOLEAN DEFAULT false;

-- 2. Adicionar campos em shop_sales
ALTER TABLE shop_sales ADD COLUMN IF NOT EXISTS needs_validation BOOLEAN DEFAULT false;
ALTER TABLE shop_sales ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP WITH TIME ZONE;

-- 3. Criar tabela pdv_sales_pending
CREATE TABLE IF NOT EXISTS pdv_sales_pending (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_sale_id UUID REFERENCES shop_sales(id) ON DELETE CASCADE,
    optic_id UUID REFERENCES optics(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    seller_id UUID REFERENCES profiles(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    photo_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Habilitar RLS
ALTER TABLE pdv_sales_pending ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para pdv_sales_pending
DROP POLICY IF EXISTS "Optics can manage their pending sales" ON pdv_sales_pending;
CREATE POLICY "Optics can manage their pending sales" ON pdv_sales_pending FOR ALL USING (
    optic_id IN (SELECT o.id FROM optics o JOIN profiles p ON p.cnpj = o.cnpj WHERE p.id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can view all pending" ON pdv_sales_pending;
CREATE POLICY "Admins can view all pending" ON pdv_sales_pending FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 6. Atualizar políticas de shop_sales para incluir sellers
DROP POLICY IF EXISTS "Optic users can manage shop sales" ON shop_sales;
CREATE POLICY "Optic users can manage shop sales" ON shop_sales FOR ALL USING (
    optic_id IN (SELECT o.id FROM optics o JOIN profiles p ON p.cnpj = o.cnpj WHERE p.id = auth.uid())
);

-- 7. Atualizar políticas de shop_sale_items
DROP POLICY IF EXISTS "Optic users can manage shop sale items" ON shop_sale_items;
CREATE POLICY "Optic users can manage shop sale items" ON shop_sale_items FOR ALL USING (
    shop_sale_id IN (SELECT s.id FROM shop_sales s JOIN optics o ON s.optic_id = o.id JOIN profiles p ON p.cnpj = o.cnpj WHERE p.id = auth.uid())
);

-- 8. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_pdv_sales_pending_optic ON pdv_sales_pending(optic_id);
CREATE INDEX IF NOT EXISTS idx_pdv_sales_pending_status ON pdv_sales_pending(status);
