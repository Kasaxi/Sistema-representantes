-- Este código altera a regra de verificação (constraint) da tabela 'sales'
-- para permitir o novo status 'needs_correction' (Requer Correção).

-- 1. Remove a regra de validação atual (que só aceitava pending, approved, rejected)
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_status_check;

-- 2. Cria a nova regra incluindo o 'needs_correction'
ALTER TABLE public.sales ADD CONSTRAINT sales_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'needs_correction', 'paid'));
