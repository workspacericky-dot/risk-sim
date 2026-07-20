# Template Excel RALS — per Tahap

Lima file template Excel kosong (hanya header/struktur kolom), satu file per tahap RALS:

| File | Tahap | Kolom |
|---|---|---|
| `1-konteks.xlsx` | Penetapan Konteks | 2 |
| `2-identifikasi.xlsx` | Identifikasi Risiko | 5 |
| `3-analisis.xlsx` | Analisis Risiko | 17 |
| `4-evaluasi.xlsx` | Evaluasi Risiko | 7 |
| `5-penanganan.xlsx` | Penanganan Risiko | 13 |

Template ini **kosong** (tanpa data peserta) — berguna sebagai referensi struktur atau formulir offline.
Untuk ekspor **berisi data**, peserta memakai tombol "Ekspor Excel" di tiap tahap aplikasi.

## Regenerasi

Kolom bersumber tunggal dari [`src/lib/rals-export-columns.json`](../../src/lib/rals-export-columns.json) —
file yang sama dipakai ekspor live, jadi template tidak akan berbeda strukturnya. Setelah mengubah kolom:

```bash
node scripts/gen-rals-templates.mjs
```
