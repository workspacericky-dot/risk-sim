# Diagram Proses — Aplikasi Risk-Sim MA

> Format: Mermaid. Render di VS Code (ekstensi *Mermaid Preview*), GitHub, atau [mermaid.live](https://mermaid.live).

---

## 1. Swimlane Diagram — Alur Proses per Peran

Menggambarkan **siapa melakukan apa** dalam siklus manajemen risiko, dikelompokkan per peran (lane).

```mermaid
flowchart TD
    %% ─── ENTRY POINT ────────────────────────────────────
    START([🔐 Login Aplikasi])

    subgraph SYS ["⚙️  SISTEM / OTOMASI"]
        direction TB
        SYS1[/"Generate kode_risiko\n[unit].[kategori].[urut]"/]
        SYS2[/"Hitung besaran risiko\nK × D → level 1–5"/]
        SYS3[/"Flag di_atas_selera_risiko\nresidual_level > threshold"/]
        SYS4[/"Generate kode_penyebab\n[kode_risiko].[5M+EX].[urut]"/]
        SYS5[/"Auto-draft uraian PKA\ndari penyebab + pengendalian"/]
    end

    subgraph ADM ["🛠️  ADMIN SATKER / ADMIN SISTEM"]
        direction TB
        ADM1[Kelola master\nUnit Kerja]
        ADM2[Kelola akun\npengguna]
    end

    subgraph PR ["👤  PEMILIK RISIKO"]
        direction TB
        PR1["[2] Tetapkan Selera Risiko\n7 kategori, threshold 1–5"]
        PR2["[5b] Validasi skor\nanalisis risiko"]
        PR3["[6] Review evaluasi risiko\n+ heatmap 5×5"]
        PR4["[9b] Tanda tangan / setujui\nRencana Tindak Pengendalian"]
    end

    subgraph PG ["📋  PENGELOLA RISIKO"]
        direction TB
        PG1["[1] Isi Penetapan Konteks\n(sasaran, proses bisnis,\npemangku kepentingan)"]
        PG2["[3] Daftarkan Risiko\n(Identifikasi Risiko — Lamp. 5)"]
        PG3["[4] Isi 5-Whys per risiko\n(Identifikasi Penyebab — Lamp. 9)"]
        PG4["[5a] Isi matriks analisis\n(kemungkinan × dampak)"]
        PG5["[9a] Susun RTP per penyebab\n(Lamp. 10: PJ, target, waktu)"]
    end

    subgraph UMR ["🏛️  UNIT MR MA (Kepala & Anggota)"]
        direction TB
        UMR1["[6b] Supervisi evaluasi risiko\nlintas satker"]
        UMR2["Akses Laporan Eksekutif\n(lintas satker & tahun)"]
    end

    subgraph APIP ["🔍  APIP (Anggota & Kepala)"]
        direction TB
        APIP1["[7] Evaluasi Pengendalian Utama\n(desain pengendalian kunci)"]
        APIP2["[8a] Susun Program Kerja Audit\n(no. KKA, waktu, pelaksana)"]
        APIP3["[8b] Kepala APIP:\nSetujui Program Kerja Audit"]
        APIP4["[M] Nilai Maturitas MR\n(opsional, kapan saja)"]
    end

    %% ─── FLOW UTAMA ─────────────────────────────────────
    START --> ADM1 & ADM2
    START --> PG1

    PG1 -->|konteks_id tersimpan| PR1
    PR1 -->|selera risiko tersimpan| PG2
    PG2 --> SYS1
    SYS1 -->|kode_risiko| PG3
    PG3 --> SYS4
    SYS4 -->|kode_penyebab| PG4
    PG4 --> SYS2
    SYS2 -->|skor inheren & residual| PR2
    PR2 --> SYS3
    SYS3 -->|flag prioritas| PR3
    PR3 --> UMR1
    PR3 --> APIP1
    APIP1 --> APIP2
    SYS5 -.->|auto-draft uraian| APIP2
    APIP2 --> APIP3
    APIP3 -->|PKA disetujui| PG5
    PG5 --> PR4
    UMR1 --> UMR2
    APIP4 -.->|independen| APIP4

    %% ─── STYLING ────────────────────────────────────────
    classDef sistem fill:#e0e7ff,stroke:#6366f1,color:#1e1b4b
    classDef admin  fill:#fef9c3,stroke:#ca8a04,color:#713f12
    classDef pr     fill:#dcfce7,stroke:#16a34a,color:#14532d
    classDef pg     fill:#dbeafe,stroke:#2563eb,color:#1e3a8a
    classDef umr    fill:#f3e8ff,stroke:#9333ea,color:#3b0764
    classDef apip   fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    classDef start  fill:#0f172a,stroke:#0f172a,color:#f8fafc

    class SYS1,SYS2,SYS3,SYS4,SYS5 sistem
    class ADM1,ADM2 admin
    class PR1,PR2,PR3,PR4 pr
    class PG1,PG2,PG3,PG4,PG5 pg
    class UMR1,UMR2 umr
    class APIP1,APIP2,APIP3,APIP4 apip
    class START start
```

### Legenda Warna

| Warna | Peran |
|-------|-------|
| 🟣 Ungu muda | Sistem / Otomasi |
| 🟡 Kuning | Admin Satker / Admin Sistem |
| 🟢 Hijau | Pemilik Risiko |
| 🔵 Biru | Pengelola Risiko |
| 💜 Ungu tua | Unit MR MA |
| 🔴 Merah | APIP |

---

## 2. Dataflow Diagram (DFD) — Aliran Data Antar Proses

### Level 0 — Context Diagram

Gambaran paling tinggi: sistem Risk-Sim sebagai satu proses tunggal dengan aktor eksternal.

```mermaid
flowchart LR
    U1(["👤 Pengelola Risiko\n& Pemilik Risiko"])
    U2(["🔍 APIP"])
    U3(["🏛️ Unit MR MA"])
    U4(["🛠️ Admin Sistem"])

    CORE(["⬛ RISK-SIM\nSistem Manajemen\nRisiko MA RI"])

    U1 -- "Input konteks, risiko,\nanalisis, RTP" --> CORE
    CORE -- "Laporan risiko,\nheatmap, kode risiko" --> U1

    U2 -- "Input PKA,\nevaluasi pengendalian" --> CORE
    CORE -- "Daftar risiko prioritas,\ndraft uraian PKA" --> U2

    U3 -- "Query lintas satker" --> CORE
    CORE -- "Laporan eksekutif,\nCSV/PDF" --> U3

    U4 -- "Master unit kerja,\nmanajemen pengguna" --> CORE
    CORE -- "Konfirmasi perubahan\nmaster data" --> U4
```

---

### Level 1 — DFD Proses Utama

Menampilkan 9 proses inti beserta data store (tabel database) dan aliran data antar proses.

```mermaid
flowchart TD
    %% ─── EXTERNAL ENTITIES ──────────────────────────────
    EXT_PG(["Pengelola Risiko"])
    EXT_PR(["Pemilik Risiko"])
    EXT_APIP(["APIP"])
    EXT_UMR(["Unit MR MA"])

    %% ─── DATA STORES ─────────────────────────────────────
    DS1[("📦 penetapan_konteks")]
    DS2[("📦 selera_risiko_kategori")]
    DS3[("📦 risiko")]
    DS4[("📦 penyebab_risiko_detail")]
    DS5[("📦 analisis_risiko")]
    DS6[("📦 evaluasi_pengendalian_utama")]
    DS7[("📦 program_kerja_audit")]
    DS8[("📦 rencana_tindak_pengendalian")]
    DS9[("📦 unit_kerja + users")]

    %% ─── PROCESSES ───────────────────────────────────────
    P1["[1]\nPenetapan\nKonteks"]
    P2["[2]\nPenetapan\nSelera Risiko"]
    P3["[3]\nIdentifikasi\nRisiko"]
    P4["[4]\nIdentifikasi\nPenyebab"]
    P5["[5]\nAnalisis\nRisiko"]
    P6["[6]\nEvaluasi\nRisiko"]
    P7["[7]\nEval. Pengendalian\nUtama"]
    P8["[8]\nProgram Kerja\nAudit"]
    P9["[9]\nRencana Tindak\nPengendalian"]

    %% ─── INPUT DARI AKTOR ────────────────────────────────
    EXT_PG -->|"unit_kerja, tahun,\nsasaran, proses bisnis"| P1
    EXT_PR -->|"threshold per\n7 kategori risiko"| P2
    EXT_PG -->|"pernyataan risiko,\nkategori, pejabat"| P3
    EXT_PG -->|"why1–5, akar\npenyebab, kegiatan"| P4
    EXT_PG -->|"level kemungkinan,\ndampak, pengendalian"| P5
    EXT_APIP -->|"pengendalian\nutama"| P7
    EXT_APIP -->|"no. KKA, waktu,\npelaksana"| P8
    EXT_PG -->|"PJ, indikator,\ntarget waktu, skor target"| P9

    %% ─── SIMPAN KE DATA STORE ───────────────────────────
    P1 -->|"konteks_id,\njson sasaran & proses"| DS1
    P2 -->|"threshold per kategori"| DS2
    P3 -->|"risiko + kode_risiko\n(auto-generate)"| DS3
    P4 -->|"penyebab + kode_penyebab\n(auto-generate)"| DS4
    P5 -->|"skor inheren, residual,\nkecukupan, flag prioritas"| DS5
    P7 -->|"pengendalian\nutama"| DS6
    P8 -->|"uraian, KKA,\nwaktu, pelaksana"| DS7
    P9 -->|"klasifikasi SPIP,\nPJ, target skor"| DS8

    %% ─── BACA DARI DATA STORE (antar proses) ────────────
    DS1 -->|"konteks_id\n(anchor)"| P2
    DS1 -->|"konteks_id, daftar\nsasaran & proses"| P3
    DS2 -->|"threshold\nper kategori"| P6
    DS3 -->|"risiko_id, kode_risiko"| P4
    DS3 -->|"risiko_id, kategori"| P5
    DS5 -->|"skor residual\nvs. threshold"| P6
    DS6 -->|"pengendalian eksisting\n+ utama"| P8
    DS4 -->|"daftar penyebab\nper risiko"| P8
    DS3 -->|"risiko prioritas"| P7
    DS4 -->|"penyebab per\nrisiko prioritas"| P9

    %% ─── OUTPUT KE AKTOR ─────────────────────────────────
    P6 -->|"heatmap 5×5,\ndaftar prioritas"| EXT_PR
    P6 -->|"laporan risiko\nlintas satker"| EXT_UMR
    P8 -->|"draft uraian PKA\n(auto-synthesized)"| EXT_APIP
    DS9 -->|"daftar unit kerja\nvalid"| P1

    %% ─── STYLING ─────────────────────────────────────────
    classDef process fill:#dbeafe,stroke:#2563eb,color:#1e3a8a,rx:8
    classDef store   fill:#f1f5f9,stroke:#64748b,color:#1e293b
    classDef actor   fill:#0f172a,stroke:#0f172a,color:#f8fafc,rx:40

    class P1,P2,P3,P4,P5,P6,P7,P8,P9 process
    class DS1,DS2,DS3,DS4,DS5,DS6,DS7,DS8,DS9 store
    class EXT_PG,EXT_PR,EXT_APIP,EXT_UMR actor
```

---

### Level 2 — DFD Detail: Proses Analisis & Evaluasi Risiko

Zoom-in pada proses [5] dan [6] yang paling kritis secara kalkulasi.

```mermaid
flowchart LR
    %% Aktor
    PG(["Pengelola Risiko"])
    PR(["Pemilik Risiko"])

    %% Data stores input
    DS_R[("risiko")]
    DS_S[("selera_risiko_kategori")]

    %% Sub-proses Analisis
    subgraph P5 ["[5] Analisis Risiko"]
        direction TB
        P5a["5.1 — Terima input\nkemungkinan & dampak"]
        P5b["5.2 — Hitung besaran inheren\nK × D (1–25)"]
        P5c["5.3 — Tentukan level inheren\n(1=SR, 2=R, 3=S, 4=T, 5=ST)"]
        P5d["5.4 — Ada pengendalian?\n→ hitung residual"]
        P5e["5.5 — Nilai kecukupan\npengendalian (4 pilihan)"]
        P5a --> P5b --> P5c --> P5d --> P5e
    end

    %% Data store output analisis
    DS_A[("analisis_risiko")]

    %% Sub-proses Evaluasi
    subgraph P6 ["[6] Evaluasi Risiko"]
        direction TB
        P6a["6.1 — Ambil semua analisis\nper konteks_id"]
        P6b["6.2 — Bandingkan\nresidual_level vs. threshold\nper kategori"]
        P6c["6.3 — Flag\ndi_atas_selera_risiko = true/false"]
        P6d["6.4 — Render heatmap 5×5\n& tabel prioritas"]
        P6a --> P6b --> P6c --> P6d
    end

    %% Flow
    PG -->|"K, D, pengendalian"| P5a
    DS_R -->|"risiko_id, kategori"| P5a
    P5e -->|"skor inheren, residual,\nkecukupan, flag"| DS_A
    DS_A -->|"semua analisis"| P6a
    DS_S -->|"threshold per kategori"| P6b
    P6d -->|"heatmap + list prioritas"| PR

    classDef process fill:#dbeafe,stroke:#2563eb,color:#1e3a8a
    classDef store   fill:#f1f5f9,stroke:#64748b,color:#1e293b
    classDef actor   fill:#0f172a,stroke:#0f172a,color:#f8fafc

    class P5a,P5b,P5c,P5d,P5e,P6a,P6b,P6c,P6d process
    class DS_R,DS_S,DS_A store
    class PG,PR actor
```

---

### Level 2 — DFD Detail: Proses Identifikasi & Kode Otomatis

Zoom-in pada proses [3] dan [4] beserta mekanisme auto-generate kode.

```mermaid
flowchart TD
    PG(["Pengelola Risiko"])
    DS_K[("penetapan_konteks")]
    DS_UK[("unit_kerja")]

    subgraph P3 ["[3] Identifikasi Risiko"]
        direction TB
        P3a["3.1 — Pilih proses bisnis\n→ auto-fill sasaran & indikator"]
        P3b["3.2 — Isi pernyataan risiko,\nkategori, sumber, pejabat"]
        P3c["3.3 — Generate kode_risiko:\n[kode_unit].[kat_kode].[urut]"]
        P3a --> P3b --> P3c
    end

    DS_R[("risiko")]

    subgraph P4 ["[4] Identifikasi Penyebab — 5 Whys"]
        direction TB
        P4a["4.1 — Isi why_1 s.d. why_5\nper penyebab"]
        P4b["4.2 — Tentukan akar_penyebab\n& kegiatan pengendalian"]
        P4c["4.3 — Tentukan kategori 5M+EX:\nMN/MY/MD/MR/MC/EX"]
        P4d["4.4 — Generate kode_penyebab:\n[kode_risiko].[5M+EX].[urut]"]
        P4a --> P4b --> P4c --> P4d
    end

    DS_P[("penyebab_risiko_detail")]

    PG -->|"proses bisnis dipilih"| P3a
    DS_K -->|"daftar sasaran & indikator"| P3a
    DS_UK -->|"kode unit kerja"| P3c
    P3c -->|"risiko + kode_risiko"| DS_R
    DS_R -->|"risiko_id, kode_risiko"| P4a
    PG -->|"5 whys, akar penyebab"| P4a
    P4d -->|"penyebab + kode_penyebab"| DS_P

    classDef process fill:#dbeafe,stroke:#2563eb,color:#1e3a8a
    classDef store   fill:#f1f5f9,stroke:#64748b,color:#1e293b
    classDef actor   fill:#0f172a,stroke:#0f172a,color:#f8fafc

    class P3a,P3b,P3c,P4a,P4b,P4c,P4d process
    class DS_K,DS_UK,DS_R,DS_P store
    class PG actor
```

---

## 3. Ringkasan Relasi Data Store

```mermaid
erDiagram
    unit_kerja ||--o{ penetapan_konteks : "memiliki"
    penetapan_konteks ||--o{ risiko : "memuat"
    penetapan_konteks ||--o| selera_risiko_kategori : "menetapkan"
    penetapan_konteks ||--o| maturitas_penilaian : "dinilai"
    risiko ||--o{ penyebab_risiko_detail : "memiliki"
    risiko ||--o| analisis_risiko : "dianalisis"
    risiko ||--o| evaluasi_pengendalian_utama : "dievaluasi"
    risiko ||--o| program_kerja_audit : "diaudit"
    penyebab_risiko_detail ||--o{ rencana_tindak_pengendalian : "dimitigasi"
    risiko ||--o{ rencana_tindak_pengendalian : "memiliki"
    users }o--|| unit_kerja : "bertugas di"
```

---

*Diagram ini menggambarkan state aplikasi Risk-Sim per April 2026. Render menggunakan Mermaid v10+.*