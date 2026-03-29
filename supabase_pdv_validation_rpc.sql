-- ==========================================
-- FUNÇÃO RPC PARA CRIAR VENDA PDV COM VALIDAÇÃO
-- ==========================================

-- Dropar função existente
DROP FUNCTION IF EXISTS create_pdv_sale_with_validation(UUID, UUID, TEXT);

-- Criar função com validação de marca
CREATE OR REPLACE FUNCTION create_pdv_sale_with_validation(
    p_optic_id UUID,
    p_seller_id UUID,
    p_items TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sale_id UUID;
    v_item JSONB;
    v_total DECIMAL(10,2) := 0;
    v_items_json JSONB;
    v_product_id UUID;
    v_brand_is_from_rep BOOLEAN;
    v_needs_validation BOOLEAN := false;
    v_pending_count INTEGER := 0;
    v_direct_count INTEGER := 0;
BEGIN
    -- Parsear items
    v_items_json := p_items::JSONB;
    
    -- Calcular total
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items_json)
    LOOP
        v_total := v_total + ((v_item->>'unit_price')::DECIMAL * (v_item->>'quantity')::INTEGER);
    END LOOP;

    -- Criar venda
    INSERT INTO shop_sales (optic_id, seller_id, total_amount, status, needs_validation)
    VALUES (p_optic_id, p_seller_id, v_total, 'completed', false)
    RETURNING id INTO v_sale_id;

    -- Processar cada item
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items_json)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        
        -- Verificar se a marca do produto é do representante
        SELECT COALESCE(b.is_from_rep, false) INTO v_brand_is_from_rep
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.id
        WHERE p.id = v_product_id;

        -- Inserir item da venda
        INSERT INTO shop_sale_items (shop_sale_id, product_id, quantity, unit_price)
        VALUES (
            v_sale_id,
            v_product_id,
            (v_item->>'quantity')::INTEGER,
            (v_item->>'unit_price')::DECIMAL
        );

        -- Baixar estoque
        UPDATE inventory_configs
        SET current_stock = current_stock - (v_item->>'quantity')::INTEGER
        WHERE optic_id = p_optic_id AND product_id = v_product_id;

        -- Se for marca do representante, criar registro pendente
        IF v_brand_is_from_rep = true THEN
            v_needs_validation := true;
            
            INSERT INTO pdv_sales_pending (
                shop_sale_id, optic_id, product_id, seller_id, 
                quantity, unit_price, status
            ) VALUES (
                v_sale_id, p_optic_id, v_product_id, p_seller_id,
                (v_item->>'quantity')::INTEGER, (v_item->>'unit_price')::DECIMAL, 'pending'
            );
            
            v_pending_count := v_pending_count + 1;
            
            -- Registrar movimentação
            INSERT INTO inventory_movements (optic_id, product_id, type, quantity, observation)
            VALUES (
                p_optic_id,
                v_product_id,
                'saida',
                (v_item->>'quantity')::INTEGER,
                'PDV Venda Pendente: ' || v_sale_id
            );
        ELSE
            -- Venda direta (marca própria da ótica)
            v_direct_count := v_direct_count + 1;
            
            -- Registrar movimentação
            INSERT INTO inventory_movements (optic_id, product_id, type, quantity, observation)
            VALUES (
                p_optic_id,
                v_product_id,
                'saida',
                (v_item->>'quantity')::INTEGER,
                'PDV Venda Direta: ' || v_sale_id
            );
        END IF;
    END LOOP;

    -- Atualizar campo needs_validation na venda
    UPDATE shop_sales
    SET needs_validation = v_needs_validation
    WHERE id = v_sale_id;

    -- Retornar resultado
    RETURN jsonb_build_object(
        'sale_id', v_sale_id,
        'total', v_total,
        'direct_sales', v_direct_count,
        'pending_validation', v_pending_count
    );
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION create_pdv_sale_with_validation TO anon, authenticated, service_role;
