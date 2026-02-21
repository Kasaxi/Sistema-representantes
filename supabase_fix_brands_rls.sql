-- Permitir que administradores atualizem as marcas
CREATE POLICY "Admins can update brands" ON "public"."brands"
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
