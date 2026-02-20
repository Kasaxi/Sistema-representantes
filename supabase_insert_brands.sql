-- Insert Nike, Náutica, and Donna Karan into the brands table
INSERT INTO public.brands (name)
VALUES 
    ('Nike'),
    ('Náutica'),
    ('Donna Karan')
ON CONFLICT (name) DO NOTHING;
