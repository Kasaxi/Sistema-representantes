-- ==========================================
-- CORREÇÃO RLS PARA PDV - VENDAS
-- ==========================================

-- Verificar políticas existentes
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'shop_sales';

-- ==========================================
-- POLÍTICAS PARA SHOP_SALES
-- ==========================================

-- Remover política problemática se existir
DROP POLICY IF EXISTS "Shopkeepers and sellers can manage their own shop sales" ON shop_sales;

-- Criar política para lojistas e vendedores com CNPJ (acesso completo)
CREATE POLICY "Optic users can manage shop sales" ON shop_sales FOR ALL USING (
    optic_id IN (
        SELECT o.id FROM optics o 
        JOIN profiles p ON p.cnpj = o.cnpj 
        WHERE p.id = auth.uid()
    )
);

-- ==========================================
-- POLÍTICAS PARA SHOP_SALE_ITEMS
-- ==========================================

-- Remover política problemática se existir
DROP POLICY IF EXISTS "Shopkeepers and sellers can manage their own shop sale items" ON shop_sale_items;

-- Criar política para lojistas e vendedores com CNPJ (acesso completo)
CREATE POLICY "Optic users can manage shop sale items" ON shop_sale_items FOR ALL USING (
    shop_sale_id IN (
        SELECT s.id FROM shop_sales s
        JOIN optics o ON s.optic_id = o.id
        JOIN profiles p ON p.cnpj = o.cnpj
        WHERE p.id = auth.uid()
    )
);

-- ==========================================
-- VERIFICAÇÃO
-- ==========================================

-- Verificar políticas aplicadas
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename IN ('shop_sales', 'shop_sale_items');
