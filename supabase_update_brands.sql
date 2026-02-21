-- Atualização da Tabela de Marcas (Logos)
ALTER TABLE public.brands
ADD COLUMN IF NOT EXISTS logo_url text;

COMMENT ON COLUMN public.brands.logo_url IS 'URL da URL do logo da marca para exibição no painel de prêmios';
