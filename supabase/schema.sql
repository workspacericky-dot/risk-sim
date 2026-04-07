-- Schema for Risk-Sim (Mahkamah Agung)

-- Enable uuid-ossp extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table: UNIT_KERJA (Hierarki Satker/MA)
CREATE TABLE public.unit_kerja (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode_unit VARCHAR(50) UNIQUE NOT NULL,
    nama_unit VARCHAR(255) NOT NULL,
    tingkat INTEGER NOT NULL CHECK (tingkat IN (0, 1, 2, 3)), -- 0: Tk 1, 1: Banding, 2: Eselon I, 3: MA
    parent_unit_id UUID REFERENCES public.unit_kerja(id) ON DELETE SET NULL,
    lokasi VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table: USERS (Integrasi dengan auth.users disarankan, namun kita buat table spesifik untuk referensi)
-- Idealnya ini adalah public.users yang memiliki trigger dari auth.users
CREATE TABLE public.users (
    id UUID PRIMARY KEY, -- referensi langsung ke auth.users.id
    email VARCHAR(255) UNIQUE NOT NULL,
    nama_lengkap VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- e.g., 'Admin Satker', 'Pemilik Risiko Satker', 'Pengelola Risiko Satker', 'Admin Sistem', dst
    unit_kerja_id UUID REFERENCES public.unit_kerja(id) ON DELETE SET NULL,
    status_aktif BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Table: PENETAPAN_KONTEKS
CREATE TABLE public.penetapan_konteks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_kerja_id UUID REFERENCES public.unit_kerja(id) ON DELETE CASCADE,
    tahun_penerapan INTEGER NOT NULL,
    sasaran_strategis TEXT,
    proses_bisnis TEXT,
    selera_risiko INTEGER CHECK (selera_risiko BETWEEN 1 AND 5),
    status VARCHAR(50) DEFAULT 'Draft', -- Draft, Menunggu Persetujuan, Disetujui
    pemilik_risiko_id UUID REFERENCES public.users(id),
    pengelola_risiko_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Table: RISIKO (Identifikasi)
CREATE TABLE public.risiko (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    konteks_id UUID REFERENCES public.penetapan_konteks(id) ON DELETE CASCADE,
    kode_risiko VARCHAR(50),
    pernyataan_risiko TEXT NOT NULL,
    kategori_risiko VARCHAR(100),
    sumber_risiko TEXT,
    penyebab_risiko TEXT,
    dampak_potensial TEXT,
    status VARCHAR(50) DEFAULT 'Teridentifikasi', -- Teridentifikasi, Dianalisis, Dievaluasi, Diekstraksi
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Table: ANALISIS_RISIKO
CREATE TABLE public.analisis_risiko (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    risiko_id UUID UNIQUE REFERENCES public.risiko(id) ON DELETE CASCADE,
    level_kemungkinan INTEGER CHECK (level_kemungkinan BETWEEN 1 AND 5),
    level_dampak INTEGER CHECK (level_dampak BETWEEN 1 AND 5),
    status_risiko INTEGER, -- Nilai otomatis = kemungkinan * dampak (namun untuk level 1-5 matriks bisa dihitung via fungsi)
    existing_control TEXT,
    efektivitas_control BOOLEAN,
    di_atas_selera_risiko BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Table: RTP (Rencana Tindak Pengendalian)
CREATE TABLE public.rtp (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analisis_id UUID REFERENCES public.analisis_risiko(id) ON DELETE CASCADE,
    kegiatan_pengendalian TEXT NOT NULL,
    indikator_keluaran TEXT,
    penanggung_jawab_id UUID REFERENCES public.users(id),
    target_waktu DATE,
    level_kemungkinan_treated INTEGER CHECK (level_kemungkinan_treated BETWEEN 1 AND 5),
    level_dampak_treated INTEGER CHECK (level_dampak_treated BETWEEN 1 AND 5),
    status_risiko_treated INTEGER,
    status_rtp VARCHAR(50) DEFAULT 'Draft', -- Draft, Disetujui, Sedang Berjalan, Selesai
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Table: PEMANTAUAN_RTP
CREATE TABLE public.pemantauan_rtp (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rtp_id UUID REFERENCES public.rtp(id) ON DELETE CASCADE,
    tanggal_realisasi DATE NOT NULL,
    status_realisasi VARCHAR(50), -- Belum Dimulai, Sedang Berjalan, Selesai
    bukti_dukung TEXT, -- Path di storage
    hambatan_kendala TEXT,
    catatan_perkembangan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Table: PERISTIWA_RISIKO
CREATE TABLE public.peristiwa_risiko (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    konteks_id UUID REFERENCES public.penetapan_konteks(id) ON DELETE CASCADE,
    risiko_id UUID REFERENCES public.risiko(id) ON DELETE SET NULL,
    nama_peristiwa VARCHAR(255) NOT NULL,
    tanggal_kejadian DATE NOT NULL,
    tempat_kejadian VARCHAR(255),
    pemicu_peristiwa TEXT,
    kronologi TEXT,
    skor_dampak_aktual INTEGER CHECK (skor_dampak_aktual BETWEEN 1 AND 5),
    penyebab_aktual TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Table: EFEKTIVITAS_PENGENDALIAN
CREATE TABLE public.efektivitas_pengendalian (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analisis_id UUID REFERENCES public.analisis_risiko(id) ON DELETE CASCADE,
    status_risiko_treated INTEGER,
    status_risiko_aktual INTEGER,
    efektif BOOLEAN,
    deviasi INTEGER,
    rekomendasi TEXT,
    tahun INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Table: LAPORAN
CREATE TABLE public.laporan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    konteks_id UUID REFERENCES public.penetapan_konteks(id) ON DELETE CASCADE,
    tipe_laporan VARCHAR(50), -- Semester, Tahunan
    periode VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Draft', -- Draft, Disetujui, Dikirim
    file_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Table: AUDIT_LOG
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id),
    action VARCHAR(50) NOT NULL, -- Create, Update, Delete, View
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    old_value JSONB,
    new_value JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Setup Row Level Security (RLS) - Diterapkan setelah auth integration
-- Nanti akan disesuaikan secara khusus pada tahapan integrasi fitur.

-- Fungsi untuk update trigger timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER set_unit_kerja_updated_at BEFORE UPDATE ON public.unit_kerja FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_penetapan_konteks_updated_at BEFORE UPDATE ON public.penetapan_konteks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_risiko_updated_at BEFORE UPDATE ON public.risiko FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_analisis_risiko_updated_at BEFORE UPDATE ON public.analisis_risiko FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_rtp_updated_at BEFORE UPDATE ON public.rtp FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_pemantauan_rtp_updated_at BEFORE UPDATE ON public.pemantauan_rtp FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_peristiwa_risiko_updated_at BEFORE UPDATE ON public.peristiwa_risiko FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_efektivitas_pengendalian_updated_at BEFORE UPDATE ON public.efektivitas_pengendalian FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_laporan_updated_at BEFORE UPDATE ON public.laporan FOR EACH ROW EXECUTE FUNCTION set_updated_at();
