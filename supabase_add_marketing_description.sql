-- Adicionar campo description na tabela marketing_campaigns se não existir
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS description TEXT;
