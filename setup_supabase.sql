-- 1. Создаем бакет 'review-media'
INSERT INTO storage.buckets (id, name, public)
VALUES ('review-media', 'review-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Разрешаем ПУБЛИЧНЫЙ ПРОСМОТР (SELECT)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'review-media' );

-- 3. Разрешаем ПУБЛИЧНУЮ ЗАГРУЗКУ (INSERT)
CREATE POLICY "Public Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'review-media' );

-- 4. Разрешаем ПУБЛИЧНОЕ ОБНОВЛЕНИЕ (UPDATE)
CREATE POLICY "Public Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'review-media' );

-- 5. Разрешаем ПУБЛИЧНОЕ УДАЛЕНИЕ (DELETE)
CREATE POLICY "Public Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'review-media' );
