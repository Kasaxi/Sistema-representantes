-- Create a new column to store admin feedback when a sale needs correction
ALTER TABLE public.sales
ADD COLUMN admin_feedback TEXT;

-- Update the status check constraint to include 'needs_correction' if one exists
-- First, lets try to just alter the type if it's an enum, or just use text if it's text
-- Supabase often uses text for status with app-level validation, but just in case:
-- If it's a constraint:
-- ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_status_check;
-- ALTER TABLE public.sales ADD CONSTRAINT sales_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'needs_correction'));
