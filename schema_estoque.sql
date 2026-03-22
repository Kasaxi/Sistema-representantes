-- 1. Extensão de Tabelas Existentes
-- Adicionar categoria às marcas
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'brand_category') THEN
        CREATE TYPE brand_category AS ENUM ('luxo', 'premium', 'frontline');
    END IF;
END $$;

ALTER TABLE brands ADD COLUMN IF NOT EXISTS category brand_category DEFAULT 'frontline';

-- Adicionar campos à tabela de vendas para controle de estoque e markup
ALTER TABLE sales ADD COLUMN IF NOT EXISTS product_id UUID;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2);

-- 2. Novas Tabelas
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movement_type') THEN
        CREATE TYPE movement_type AS ENUM ('entrada', 'saida', 'ajuste');
    END IF;
END $$;

-- Tabela de Produtos (Peças/Óculos)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    unit_cost DECIMAL(10,2) NOT NULL,
    suggested_price DECIMAL(10,2) NOT NULL,
    unit_type TEXT NOT NULL DEFAULT 'unidade', -- unidade, par, caixa
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar FK em sales agora que products existe
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_product_id_fkey;
ALTER TABLE sales ADD CONSTRAINT sales_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id);

-- Tabela de Configuração de Estoque por Ótica
CREATE TABLE IF NOT EXISTS inventory_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    optic_id UUID REFERENCES optics(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    min_stock INTEGER NOT NULL DEFAULT 0,
    max_stock INTEGER NOT NULL DEFAULT 100,
    current_stock INTEGER NOT NULL DEFAULT 0,
    UNIQUE(optic_id, product_id)
);

-- Tabela de Movimentação de Estoque
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    optic_id UUID REFERENCES optics(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    type movement_type NOT NULL,
    quantity INTEGER NOT NULL,
    movement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    observation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Autenticação: Adicionar role lojista (shopkeeper)
-- Nota: Atualização do check constraint de roles na tabela profiles
DO $$ 
BEGIN 
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role = ANY (ARRAY['admin'::text, 'seller'::text, 'representative'::text, 'shopkeeper'::text]));
EXCEPTION 
    WHEN others THEN 
        RAISE NOTICE 'Não foi possível atualizar o check de roles (pode já estar atualizado ou o nome ser diferente)';
END $$;

-- 4. Função e Trigger para Baixa de Estoque Automática
CREATE OR REPLACE FUNCTION handle_sale_stock_update() 
RETURNS TRIGGER AS $$
DECLARE
    v_optic_id UUID;
BEGIN
    -- Obter o ID da ótica do vendedor
    SELECT optics.id INTO v_optic_id 
    FROM profiles 
    JOIN optics ON profiles.cnpj = optics.cnpj
    WHERE profiles.id = NEW.seller_id;

    -- Quando a venda é APROVADA
    IF (OLD.status != 'approved' AND NEW.status = 'approved' AND NEW.product_id IS NOT NULL) THEN
        -- Tenta atualizar o estoque
        UPDATE inventory_configs 
        SET current_stock = current_stock - NEW.quantity
        WHERE optic_id = v_optic_id AND product_id = NEW.product_id;

        -- Registra a movimentação
        INSERT INTO inventory_movements (optic_id, product_id, type, quantity, observation)
        VALUES (v_optic_id, NEW.product_id, 'saida', NEW.quantity, 'Venda aprova: ' || NEW.id);
    END IF;

    -- Se a venda for estornada (de aprovado para outro)
    IF (OLD.status = 'approved' AND NEW.status != 'approved' AND NEW.product_id IS NOT NULL) THEN
        UPDATE inventory_configs 
        SET current_stock = current_stock + NEW.quantity
        WHERE optic_id = v_optic_id AND product_id = NEW.product_id;

        INSERT INTO inventory_movements (optic_id, product_id, type, quantity, observation)
        VALUES (v_optic_id, NEW.product_id, 'entrada', NEW.quantity, 'Venda estornada: ' || NEW.id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sale_stock_update ON sales;
CREATE TRIGGER trg_sale_stock_update
AFTER UPDATE ON sales
FOR EACH ROW
EXECUTE FUNCTION handle_sale_stock_update();

-- RLS POLICIES

-- Habilitar RLS
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Marcas e Produtos: Todos autenticados podem ver, apenas admin/rep pode editar
DROP POLICY IF EXISTS "Public brands are viewable by everyone" ON brands;
CREATE POLICY "Public brands are viewable by everyone" ON brands FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins and Reps can modify brands" ON brands;
CREATE POLICY "Admins and Reps can modify brands" ON brands FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'representative'))
);

DROP POLICY IF EXISTS "Public products are viewable by everyone" ON products;
CREATE POLICY "Public products are viewable by everyone" ON products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins and Reps can modify products" ON products;
CREATE POLICY "Admins and Reps can modify products" ON products FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'representative'))
);

-- Configuração de Estoque: Rep/Admin vê tudo, lojista vê e gerencia o seu
DROP POLICY IF EXISTS "Admin and Rep can see all inventory configs" ON inventory_configs;
CREATE POLICY "Admin and Rep can see all inventory configs" ON inventory_configs FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'representative'))
);

DROP POLICY IF EXISTS "Shopkeepers can manage their own inventory configs" ON inventory_configs;
CREATE POLICY "Shopkeepers can manage their own inventory configs" ON inventory_configs FOR ALL USING (
    optic_id IN (
        SELECT o.id FROM optics o 
        JOIN profiles p ON p.cnpj = o.cnpj 
        WHERE p.id = auth.uid()
    )
);

-- Movimentações: Rep/Admin vê tudo, lojista vê e cria o seu
DROP POLICY IF EXISTS "Admin and Rep can manage all inventory movements" ON inventory_movements;
CREATE POLICY "Admin and Rep can manage all inventory movements" ON inventory_movements FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'representative'))
);

DROP POLICY IF EXISTS "Shopkeepers can manage their own movements" ON inventory_movements;
CREATE POLICY "Shopkeepers can manage their own movements" ON inventory_movements FOR ALL USING (
    optic_id IN (
        SELECT o.id FROM optics o 
        JOIN profiles p ON p.cnpj = o.cnpj 
        WHERE p.id = auth.uid()
    )
);
