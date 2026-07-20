-- RALS v6 — Penomoran kode risiko level organisasi (sesi), bukan per-peserta.
-- Jalankan di Supabase SQL editor (setelah v5).
--
-- Sebelumnya kode "R-01", "R-02", dst. dihitung per participant_id di sisi
-- klien, sehingga dua peserta berbeda sama-sama mendapat "R-01" untuk risiko
-- pertama mereka. Kode kini dihasilkan oleh trigger DB, dihitung per
-- session_id (perspektif organisasi/kelas), dan dikunci per sesi
-- (`for update` pada baris rals_session) supaya submit bersamaan dari banyak
-- peserta tidak saling tabrakan.

create or replace function public.rals_assign_kode() returns trigger as $$
begin
  if new.kode is null or new.kode = '' then
    perform 1 from public.rals_session where id = new.session_id for update;
    select 'R-' || lpad((count(*) + 1)::text, 2, '0') into new.kode
    from public.rals_risk
    where session_id = new.session_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists rals_risk_kode_trigger on public.rals_risk;
create trigger rals_risk_kode_trigger
before insert on public.rals_risk
for each row execute function public.rals_assign_kode();

-- ── Perbaiki data yang sudah terlanjur duplikat (renumbering retroaktif) ──
with renumbered as (
  select id, 'R-' || lpad(row_number() over (partition by session_id order by created_at)::text, 2, '0') as new_kode
  from public.rals_risk
)
update public.rals_risk r
set kode = renumbered.new_kode
from renumbered
where r.id = renumbered.id and r.kode is distinct from renumbered.new_kode;
