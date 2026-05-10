-- Jalankan di Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)
-- untuk menetapkan role admin_sistem pada akun Administrator Utama.

UPDATE public.users
SET role = 'admin_sistem'
WHERE email = 'admin@mahkamahagung.go.id';
