-- 1. Create marketing_campaigns table
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Register dismissals
CREATE TABLE IF NOT EXISTS user_campaign_dismissals (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, campaign_id)
);

-- 3. RLS Policies
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_campaign_dismissals ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read active campaigns
CREATE POLICY "Anyone can read active campaigns" 
ON marketing_campaigns FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins have full access to campaigns" 
ON marketing_campaigns FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

CREATE POLICY "Users can manage their own dismissals" 
ON user_campaign_dismissals FOR ALL 
USING (auth.uid() = user_id);

-- 4. Storage Bucket Setup (For image uploads)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('marketing_images', 'marketing_images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Public Read Access for banners"
ON storage.objects FOR SELECT
USING ( bucket_id = 'marketing_images' );

CREATE POLICY "Allow admins to upload banners"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'marketing_images' AND
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

CREATE POLICY "Allow admins to update banners"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'marketing_images' AND
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

CREATE POLICY "Allow admins to delete banners"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'marketing_images' AND
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);
