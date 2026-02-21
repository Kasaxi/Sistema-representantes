-- Atualização da Tabela de Óticas
ALTER TABLE public.oticas
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text;

COMMENT ON COLUMN public.oticas.city IS 'Cidade onde a ótica está localizada';
COMMENT ON COLUMN public.oticas.state IS 'Estado (UF) onde a ótica está localizada';
