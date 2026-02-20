-- Adds a commission_value column to the brands table
-- Run this in the Supabase SQL Editor

ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS commission_value numeric DEFAULT 0;

COMMENT ON COLUMN public.brands.commission_value IS 'Valor fixo de comissão por venda desta marca (em Reais)';
