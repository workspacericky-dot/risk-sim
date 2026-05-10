# Risk-Sim App Workflow

A government risk management system following **PP No. 60/2008** (SPIP — Sistem Pengendalian Intern Pemerintah).

---

## Authentication

- Login via `/login` using Supabase Auth (email + password)
- Redirects to `/dashboard` on success

---

## Core Workflow (Sequential)

### 1. Penetapan Konteks — `/dashboard/konteks`

Establish the risk management context before anything else.

- Inputs: Unit Kerja, Tahun Penerapan, Sasaran Strategis, Proses Bisnis Utama
- Output: `penetapan_konteks` record — acts as the anchor for all downstream data
- **Gate:** Must exist before any other phase

---

### 2. Selera Risiko — `/dashboard/selera-risiko?konteks={id}`

Define acceptable risk thresholds per category.

- 7 categories: Strategis, Kebijakan, Kecurangan, Bencana, Kepatuhan, Operasional, Kemitraan
- Each gets a numeric threshold (1–5 scale)
- Stored in `selera_risiko_kategori`
- Used later to flag priority risks (residual level > threshold)

---

### 3. Identifikasi Risiko — `/dashboard/identifikasi?konteks={id}`

Register all risks for the context (maps to **Lampiran 5**).

- Inputs: Pernyataan Risiko, Kategori Risiko, Uraian Dampak, Sumber Risiko, Metode SPIP
- Auto-generates: `kode_risiko`
- Stored in `risiko` table
- **Gate:** At least 1 risk required to proceed to Analysis

---

### 4. Identifikasi Penyebab — `/dashboard/identifikasi-penyebab?risiko={id}&konteks={id}`

Root cause analysis per risk using **5-Whys** methodology (maps to **Lampiran 9**).

- Columns: Why 1–5 → Akar Penyebab → Kode Penyebab → Kegiatan Pengendalian
- Cause codes use format: `[kode_risiko].[5M+EX category].[seq]`
  - Categories: MN (People), MY (Funds), MD (Method), MR (Materials), MC (Machinery), EX (External)
- Stored in `penyebab_risiko_detail`
- Output feeds into audit program synthesis

---

### 5. Analisis Risiko — `/dashboard/analisis?konteks={id}`

Quantify each risk using a **5×5 likelihood × impact** matrix (maps to **Lampiran 6**).

- Inputs per risk: Level Kemungkinan (1–5), Level Dampak (1–5), Ada Pengendalian, Kecukupan Pengendalian (4-question form)
- Outputs:
  - Residual Kemungkinan & Residual Dampak (after existing controls)
  - Residual Level (1–25)
  - `di_atas_selera_risiko` flag (boolean: residual > appetite threshold)
- Stored in `analisis_risiko`

---

### 6. Evaluasi Risiko — `/dashboard/evaluasi?konteks={id}`

Review and prioritize risks exceeding appetite thresholds.

- Dashboard: total risks, analyzed count, priority risks count
- 5×5 heatmap visualization with clickable popup
- Priority risks sorted by highest residual level
- Links to: Selera Risiko editor, Peta Risiko view

---

### 7. Evaluasi Pengendalian Utama — `/dashboard/evaluasi-pengendalian?konteks={id}`

Assess design and adequacy of key controls.

- Columns: Kode Risiko, Pernyataan Risiko, Dampak Potensial, Kecukupan Desain (auto-fetched), Pengendalian Eksisting, Pengendalian Utama
- Stored in `evaluasi_pengendalian_utama`
- `kecukupan` values flow in automatically from Analisis Risiko

---

### 8. Program Kerja Audit — `/dashboard/program-kerja-audit?konteks={id}`

Generate the audit work program for risks with inadequate controls.

- **Filter:** Only risks where `kecukupan_pengendalian != 'Memadai'`
- Uraian auto-synthesized from: Pengendalian Eksisting + Pengendalian Utama + Root Causes
- User fills: No. KKA, Waktu Pelaksanaan, Dilaksanakan Oleh
- Stored in `program_kerja_audit`

---

## Standalone / Anytime Phases

### Maturitas Manajemen Risiko — `/dashboard/maturitas`

Evaluate RM capability maturity per unit/year. Not blocked by other phases.

- Screen 1: List all konteks with maturity scores
- Screen 2: 5-level maturity scoring form → Total Score + Label
- Stored in `maturitas_penilaian`

### Peta Risiko — `/dashboard/peta-risiko`

5×5 heatmap visualization of all risks for a selected context. Read-only view.

### Laporan — `/dashboard/laporan`

Reporting across all units/years with CSV/Excel export.

- Joins: Risiko → Analisis → RTP → Evaluasi
- Columns: Tahun, Satker, Pernyataan Risiko, Skor Awal, Prioritas, Mitigasi, Skor Target

---

## Data Flow Diagram

```
Login
  └─► Penetapan Konteks
         └─► Selera Risiko (risk appetite)
               └─► Identifikasi Risiko
                     ├─► Identifikasi Penyebab (5-Whys, per risk)
                     └─► Analisis Risiko (5×5 matrix)
                               └─► Evaluasi Risiko (priority check)
                                         └─► Evaluasi Pengendalian
                                                   └─► Program Kerja Audit

(Anytime) Maturitas Assessment
(Anytime) Peta Risiko Visualization
(Anytime) Laporan Export
```

---

## Key Database Tables

| Table | Purpose |
|---|---|
| `penetapan_konteks` | RM context per unit/year |
| `selera_risiko_kategori` | Risk appetite thresholds |
| `risiko` | Risk register (Lampiran 5) |
| `analisis_risiko` | Quantified risk scores (Lampiran 6) |
| `penyebab_risiko_detail` | 5-Whys root causes (Lampiran 9) |
| `evaluasi_pengendalian_utama` | Control design assessment |
| `program_kerja_audit` | Audit work program |
| `maturitas_penilaian` | Capability maturity scores |
| `unit_kerja` | Org hierarchy (levels 0–3) |
| `users` | Accounts + roles + unit assignment |

---

## Auto-Calculations

| Field | Logic |
|---|---|
| `kode_risiko` | Auto-generated risk code |
| `residual_level` | `residual_kemungkinan × residual_dampak` via 5×5 matrix |
| `di_atas_selera_risiko` | `residual_level > selera threshold for category` |
| PKA `uraian` | Synthesized from control evaluation + root cause data |
| `kode_penyebab` | `[kode_risiko].[5M+EX].[seq]` |
