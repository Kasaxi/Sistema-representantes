-- ==========================================
-- MÓDULO PDV - MIGRAÇÃO COMPLETA
-- Data: 2026-03-28
-- ==========================================

-- 1. Adicionar coluna attributes JSONB na tabela products
-- Permite atributos específicos por categoria (ex: lente com grau, armação com cor)
ALTER TABLE products ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb;

-- 2. Criar tabela de vendas do PDV (shop_sales)
CREATE TABLE IF NOT EXISTS shop_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    optic_id UUID REFERENCES optics(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES profiles(id),
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled', 'refunded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar tabela de itens das vendas do PDV (shop_sale_items)
CREATE TABLE IF NOT EXISTS shop_sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_sale_id UUID REFERENCES shop_sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Habilitar RLS nas novas tabelas
ALTER TABLE shop_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_sale_items ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- POLÍTICAS RLS - SHOP_SALES
-- ==========================================

-- Policy: Admin e Representative podem ver todas as vendas
DROP POLICY IF EXISTS "Admin and Rep can view all shop sales" ON shop_sales;
CREATE POLICY "Admin and Rep can view all shop sales" ON shop_sales FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'representative'))
);

-- Policy: Lojistas e vendedores da ótica podem criar e ver apenas vendas da própria ótica
DROP POLICY IF EXISTS "Shopkeepers and sellers can manage their own shop sales" ON shop_sales;
CREATE POLICY "Shopkeepers and sellers can manage their own shop sales" ON shop_sales FOR ALL USING (
    optic_id IN (
        SELECT o.id FROM optics o 
        JOIN profiles p ON p.cnpj = o.cnpj 
        WHERE p.id = auth.uid()
    )
);

-- ==========================================
-- POLÍTICAS RLS - SHOP_SALE_ITEMS
-- ==========================================

-- Policy: Admin e Representative podem ver todos os itens
DROP POLICY IF EXISTS "Admin and Rep can view all shop sale items" ON shop_sale_items;
CREATE POLICY "Admin and Rep can view all shop sale items" ON shop_sale_items FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'representative'))
);

-- Policy: Lojistas e vendedores podem gerenciar itens das vendas da própria ótica
DROP POLICY IF EXISTS "Shopkeepers and sellers can manage their own shop sale items" ON shop_sale_items;
CREATE POLICY "Shopkeepers and sellers can manage their own shop sale items" ON shop_sale_items FOR ALL USING (
    shop_sale_id IN (
        SELECT s.id FROM shop_sales s
        JOIN optics o ON s.optic_id = o.id
        JOIN profiles p ON p.cnpj = o.cnpj
        WHERE p.id = auth.uid()
    )
);

-- ==========================================
-- ÍNDICES PARA PERFORMANCE
-- ==========================================

-- Índice para buscar vendas por ótica rapidamente
CREATE INDEX IF NOT EXISTS idx_shop_sales_optic_id ON shop_sales(optic_id);
CREATE INDEX IF NOT EXISTS idx_shop_sales_created_at ON shop_sales(created_at DESC);

-- Índice para buscar itens por venda
CREATE INDEX IF NOT EXISTS idx_shop_sale_items_sale_id ON shop_sale_items(shop_sale_id);

-- Índice para buscar produtos por SKU (uso no PDV)
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- Índice JSONB para buscar lentes por atributos (futuro)
CREATE INDEX IF NOT EXISTS idx_products_attributes ON products USING GIN(attributes);

-- ==========================================
-- FUNÇÃO PARA BAIXA DE ESTOQUE AUTOMÁTICA
-- ==========================================

CREATE OR REPLACE FUNCTION handle_pdv_sale_stock_update()
RETURNS TRIGGER AS $$
DECLARE
    v_optic_id UUID;
    v_product_id UUID;
    v_quantity INTEGER;
    v_inventory_stock INTEGER;
BEGIN
    -- Nova venda criada
    IF TG_OP = 'INSERT' AND NEW.status = 'completed' THEN
        -- Para cada item da venda
        FOR v_product_id, v_quantity IN 
            SELECT product_id, quantity FROM shop_sale_items WHERE shop_sale_id = NEW.id
        LOOP
            -- Verificar se existe configuração de estoque
            SELECT current_stock INTO v_inventory_stock
            FROM inventory_configs
            WHERE optic_id = NEW.optic_id AND product_id = v_product_id;

            -- Se existe configuração e tem estoque suficiente
            IF v_inventory_stock IS NOT NULL AND v_inventory_stock >= v_quantity THEN
                -- Baixar estoque
                UPDATE inventory_configs 
                SET current_stock = current_stock - v_quantity
                WHERE optic_id = NEW.optic_id AND product_id = v_product_id;

                -- Registrar movimentação de saída
                INSERT INTO inventory_movements (optic_id, product_id, type, quantity, observation)
                VALUES (NEW.optic_id, v_product_id, 'saida', v_quantity, 'PDV Venda: ' || NEW.id);
            END IF;
        END LOOP;
    END IF;

    -- Venda cancelada/estornada - repor estoque
    IF TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status IN ('cancelled', 'refunded') THEN
        FOR v_product_id, v_quantity IN 
            SELECT product_id, quantity FROM shop_sale_items WHERE shop_sale_id = NEW.id
        LOOP
            UPDATE inventory_configs 
            SET current_stock = current_stock + v_quantity
            WHERE optic_id = NEW.optic_id AND product_id = v_product_id;

            INSERT INTO inventory_movements (optic_id, product_id, type, quantity, observation)
            VALUES (NEW.optic_id, v_product_id, 'entrada', v_quantity, 'PDV Estorno: ' || NEW.id);
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trg_pdv_sale_stock_update ON shop_sales;
CREATE TRIGGER trg_pdv_sale_stock_update
AFTER INSERT OR UPDATE ON shop_sales
FOR EACH ROW
EXECUTE FUNCTION handle_pdv_sale_stock_update();

-- ==========================================
-- ATUALIZAR RLS DE INVENTORY_CONFIGS
-- (Permitir que vendedores também acessem)
-- ==========================================

-- Remover política anterior de inventory_configs (lojista)
DROP POLICY IF EXISTS "Shopkeepers can manage their own inventory configs" ON inventory_configs;

-- Nova política: Lojista OU vendedor vinculado ao CNPJ da ótica
DROP POLICY IF EXISTS "Optic users can manage their own inventory configs" ON inventory_configs;
CREATE POLICY "Optic users can manage their own inventory configs" ON inventory_configs FOR ALL USING (
    optic_id IN (
        SELECT o.id FROM optics o 
        JOIN profiles p ON p.cnpj = o.cnpj 
        WHERE p.id = auth.uid()
    )
);

-- Mesma atualização para inventory_movements
DROP POLICY IF EXISTS "Shopkeepers can manage their own movements" ON inventory_movements;
DROP POLICY IF EXISTS "Optic users can manage their own movements" ON inventory_movements;
CREATE POLICY "Optic users can manage their own movements" ON inventory_movements FOR ALL USING (
    optic_id IN (
        SELECT o.id FROM optics o 
        JOIN profiles p ON p.cnpj = o.cnpj 
        WHERE p.id = auth.uid()
    )
);

-- ==========================================
-- FIM DA MIGRAÇÃO
-- ==========================================

COMMENT ON COLUMN products.attributes IS 'JSONB para atributos específicos por categoria. Ex: {esférico: -2.00, cilíndrico: -1.50, eixo: 180, adição: 2.50, índice: 1.67} para lentes';
COMMENT ON TABLE shop_sales IS 'Tabela de vendas do PDV (Lojista -> Consumidor Final)';
COMMENT ON TABLE shop_sale_items IS 'Itens das vendas do PDV';
