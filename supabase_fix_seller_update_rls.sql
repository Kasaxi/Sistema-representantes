-- Este código cria uma Política de Segurança (RLS) para permitir que os Vendedores
-- editem (façam UPDATE) em suas próprias notas fiscais quando precisam corrigir algo.

-- Cria a política que permite o Update nas vendas pertencentes ao vendedor logado
CREATE POLICY "Sellers can update their own sales"
ON public.sales
FOR UPDATE
USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);
