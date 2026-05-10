'use client'

import { useState } from 'react'
import { X, BookOpen } from 'lucide-react'

const SKALA_K = [
  {
    skala: 5,
    deskripsi: 'Hampir Pasti',
    kemungkinan: '91% – 99%',
    frekuensi: 'Transaksi/Layanan Harian',
    kejadian: 'Sangat sering (rata-rata > 10× per tahun dalam 3 tahun terakhir)',
    kompleksitas: 'Dapat dilakukan oknum tanpa upaya koordinasi',
    kerentanan: 'Kerentanan diketahui secara luas sehingga mudah dieksploitasi',
    color: 'bg-red-100 text-red-800',
    badge: 'bg-red-500 text-white',
  },
  {
    skala: 4,
    deskripsi: 'Kemungkinan Besar',
    kemungkinan: '51% – 90%',
    frekuensi: 'Transaksi/Layanan lebih dari 5× seminggu',
    kejadian: 'Pernah terjadi pelanggaran (rata-rata 5–10× per tahun)',
    kompleksitas: 'Dapat dilakukan oknum tanpa upaya koordinasi',
    kerentanan: 'Kerentanan hanya diketahui oleh pihak internal dan eksternal terkait',
    color: 'bg-orange-100 text-orange-800',
    badge: 'bg-orange-500 text-white',
  },
  {
    skala: 3,
    deskripsi: 'Mungkin',
    kemungkinan: '31% – 50%',
    frekuensi: 'Transaksi/Layanan lebih dari 5× sebulan',
    kejadian: 'Pernah terjadi pelanggaran (rata-rata 3–5× per tahun)',
    kompleksitas: 'Pelanggaran mungkin dilakukan dengan modus yang terkoordinasi pada internal pengadilan',
    kerentanan: 'Hanya diketahui pihak internal pelaksana fungsi; monitoring tidak berjalan baik',
    color: 'bg-yellow-100 text-yellow-800',
    badge: 'bg-yellow-500 text-white',
  },
  {
    skala: 2,
    deskripsi: 'Kemungkinan Kecil',
    kemungkinan: '11% – 30%',
    frekuensi: 'Transaksi/Layanan 1–5× sebulan',
    kejadian: 'Pernah terjadi pelanggaran (rata-rata 1–2× per tahun)',
    kompleksitas: 'Pelanggaran dapat dilakukan dengan beberapa modus yang melibatkan lintas institusi',
    kerentanan: 'Hanya diketahui pihak internal pelaksana fungsi; monitoring berjalan baik',
    color: 'bg-green-100 text-green-800',
    badge: 'bg-green-500 text-white',
  },
  {
    skala: 1,
    deskripsi: 'Tidak Terjadi',
    kemungkinan: '1% – 10%',
    frekuensi: 'Transaksi/Layanan Tahunan',
    kejadian: 'Tidak ada sejarah pelanggaran',
    kompleksitas: 'Pelanggaran sangat tidak mungkin dilakukan',
    kerentanan: 'Kontrol internal sudah efektif untuk mengatasi kerentanan',
    color: 'bg-blue-100 text-blue-800',
    badge: 'bg-blue-500 text-white',
  },
]

const SKALA_D = [
  {
    skala: 5,
    deskripsi: 'Sangat Tinggi',
    kode: '"Kritikal"',
    reputasi: 'Berdampak kepada reputasi/kepercayaan publik atas Negara',
    keuangan: '> IDR 10 juta',
    layanan: 'Keluhan/Kejadian ditindaklanjuti penegak hukum',
    sanksi: 'Sanksi Pidana',
    color: 'bg-red-100 text-red-800',
    badge: 'bg-red-500 text-white',
  },
  {
    skala: 4,
    deskripsi: 'Tinggi',
    kode: '"Major"',
    reputasi: 'Berdampak kepada reputasi/kepercayaan publik atas Mahkamah Agung',
    keuangan: 'IDR 1 juta s.d 10 juta',
    layanan: 'Keluhan/Kejadian ditindaklanjuti BAWAS/MA',
    sanksi: 'Sanksi Pidana',
    color: 'bg-orange-100 text-orange-800',
    badge: 'bg-orange-500 text-white',
  },
  {
    skala: 3,
    deskripsi: 'Sedang',
    kode: '"Moderat"',
    reputasi: 'Berdampak kepada reputasi/kepercayaan publik atas Pengadilan (Satker)',
    keuangan: 'Maksimal IDR 1 juta',
    layanan: 'Keluhan pengguna melalui SIWAS/Pengaduan Masyarakat',
    sanksi: 'Sanksi Administratif (Pemecatan)',
    color: 'bg-yellow-100 text-yellow-800',
    badge: 'bg-yellow-500 text-white',
  },
  {
    skala: 2,
    deskripsi: 'Rendah',
    kode: '"Minor"',
    reputasi: 'Berdampak kepada reputasi/kepercayaan publik atas Bagian/Subbagian',
    keuangan: 'Tidak ada',
    layanan: 'Keluhan pengguna melalui sistem pengaduan internal; diselesaikan oleh internal PN',
    sanksi: 'Sanksi Administratif (Penundaan Jabatan)',
    color: 'bg-green-100 text-green-800',
    badge: 'bg-green-500 text-white',
  },
  {
    skala: 1,
    deskripsi: 'Sangat Rendah',
    kode: '"Immaterial"',
    reputasi: 'Berdampak kepada reputasi/kepercayaan publik atas individu yang bersangkutan saja',
    keuangan: 'Tidak ada',
    layanan: 'Keluhan pengguna disampaikan informal; diselesaikan oleh Kepala Unit',
    sanksi: 'Sanksi Teguran',
    color: 'bg-blue-100 text-blue-800',
    badge: 'bg-blue-500 text-white',
  },
]

type Tab = 'kemungkinan' | 'dampak'

export default function SmapReferensiModal() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('kemungkinan')

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-700 text-[11px] font-semibold transition-colors"
        title="Referensi Skala Kemungkinan dan Dampak"
      >
        <BookOpen className="w-3.5 h-3.5" />
        Referensi Skala
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-sky-50/60 shrink-0">
              <div>
                <h3 className="text-base font-bold font-serif text-slate-800">Referensi Skala Penilaian Risiko</h3>
                <p className="text-xs text-slate-500 mt-0.5">Pedoman penilaian Kemungkinan dan Dampak risiko penyuapan (ISO 37001)</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b shrink-0">
              {(['kemungkinan', 'dampak'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 px-4 py-2.5 text-sm font-semibold transition-colors ${
                    tab === t
                      ? 'border-b-2 border-sky-500 text-sky-700 bg-sky-50/60'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t === 'kemungkinan' ? 'Skala Kemungkinan (K)' : 'Skala Dampak (D)'}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 p-5">
              {tab === 'kemungkinan' && (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-500 mb-3">
                    Pilih nilai K berdasarkan kombinasi frekuensi layanan, riwayat kejadian, tingkat kompleksitas, dan kerentanan yang paling sesuai.
                  </p>
                  {SKALA_K.map(row => (
                    <div key={row.skala} className={`rounded-xl border p-3.5 ${row.color.split(' ')[0]} border-opacity-40`}>
                      <div className="flex items-start gap-3">
                        <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black ${row.badge}`}>
                          {row.skala}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold ${row.color.split(' ')[1]}`}>{row.deskripsi}</p>
                          <p className="text-xs text-slate-500 font-medium">{row.kemungkinan}</p>
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                            <div>
                              <span className="font-semibold text-slate-600">Frekuensi:</span>{' '}
                              <span className="text-slate-700">{row.frekuensi}</span>
                            </div>
                            <div>
                              <span className="font-semibold text-slate-600">Riwayat Kejadian:</span>{' '}
                              <span className="text-slate-700">{row.kejadian}</span>
                            </div>
                            <div>
                              <span className="font-semibold text-slate-600">Kompleksitas:</span>{' '}
                              <span className="text-slate-700">{row.kompleksitas}</span>
                            </div>
                            <div>
                              <span className="font-semibold text-slate-600">Kerentanan:</span>{' '}
                              <span className="text-slate-700">{row.kerentanan}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'dampak' && (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-500 mb-3">
                    Pilih nilai D berdasarkan salah satu atau lebih parameter yang paling sesuai — penilaian tidak harus kumulatif.
                  </p>
                  {SKALA_D.map(row => (
                    <div key={row.skala} className={`rounded-xl border p-3.5 ${row.color.split(' ')[0]} border-opacity-40`}>
                      <div className="flex items-start gap-3">
                        <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black ${row.badge}`}>
                          {row.skala}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <p className={`text-sm font-bold ${row.color.split(' ')[1]}`}>{row.deskripsi}</p>
                            <span className="text-xs text-slate-400">{row.kode}</span>
                          </div>
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                            <div className="sm:col-span-2">
                              <span className="font-semibold text-slate-600">Reputasi/Kepercayaan:</span>{' '}
                              <span className="text-slate-700">{row.reputasi}</span>
                            </div>
                            <div>
                              <span className="font-semibold text-slate-600">Kerugian Keuangan:</span>{' '}
                              <span className="text-slate-700">{row.keuangan}</span>
                            </div>
                            <div>
                              <span className="font-semibold text-slate-600">Sanksi:</span>{' '}
                              <span className="text-slate-700">{row.sanksi}</span>
                            </div>
                            <div className="sm:col-span-2">
                              <span className="font-semibold text-slate-600">Gangguan Layanan:</span>{' '}
                              <span className="text-slate-700">{row.layanan}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <p className="text-[10px] text-slate-400 mt-2 italic">
                    * Untuk menentukan skala dampak tidak harus bersifat kumulatif — pilih parameter yang paling dominan.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
