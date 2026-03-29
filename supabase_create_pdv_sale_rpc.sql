-- ==========================================
-- FUNÇÃO RPC PARA CRIAR VENDA PDV
-- ==========================================

-- Dropar função existente
DROP FUNCTION IF EXISTS create_pdv_sale(UUID, UUID, JSONB);
DROP FUNCTION IF EXISTS create_pdv_sale(UUID, UUID, TEXT);

-- Criar função corrigida
CREATE OR REPLACE FUNCTION create_pdv_sale(
    p_optic_id UUID,
    p_seller_id UUID,
    p_items TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sale_id UUID;
    v_item JSONB;
    v_total DECIMAL(10,2) := 0;
    v_items_json JSONB;
BEGIN
    -- Parsear items
    v_items_json := p_items::JSONB;
    
    -- Calcular total
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items_json)
    LOOP
        v_total := v_total + ((v_item->>'unit_price')::DECIMAL * (v_item->>'quantity')::INTEGER);
    END LOOP;

    -- Criar venda
    INSERT INTO shop_sales (optic_id, seller_id, total_amount, status)
    VALUES (p_optic_id, p_seller_id, v_total, 'completed')
    RETURNING id INTO v_sale_id;

    -- Inserir itens e baixar estoque
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items_json)
    LOOP
        -- Inserir item
        INSERT INTO shop_sale_items (shop_sale_id, product_id, quantity, unit_price)
        VALUES (
            v_sale_id,
            (v_item->>'product_id')::UUID,
            (v_item->>'quantity')::INTEGER,
            (v_item->>'unit_price')::DECIMAL
        );

        -- Baixar estoque
        UPDATE inventory_configs
        SET current_stock = current_stock - (v_item->>'quantity')::INTEGER
        WHERE optic_id = p_optic_id AND product_id = (v_item->>'product_id')::UUID;

        -- Registrar movimentação
        INSERT INTO inventory_movements (optic_id, product_id, type, quantity, observation)
        VALUES (
            p_optic_id,
            (v_item->>'product_id')::UUID,
            'saida',
            (v_item->>'quantity')::INTEGER,
            'PDV Venda RPC: ' || v_sale_id
        );
    END LOOP;

    RETURN v_sale_id;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION create_pdv_sale TO anon, authenticated, service_role;

-- Verificar
SELECT proname, proargnames FROM pg_proc WHERE proname = 'create_pdv_sale';
