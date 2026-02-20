-- Add reference column to sales table
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS reference TEXT;
