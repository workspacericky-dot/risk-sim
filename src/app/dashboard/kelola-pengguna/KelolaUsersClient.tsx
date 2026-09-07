'use client'

import { useState } from 'react'
import { Trash2, UserPlus, X } from 'lucide-react'
import { createUser, deleteUser } from './actions'

const ROLE_OPTIONS = [
  { value: 'admin_sistem', label: 'Administrator Sistem' },
  { value: 'admin_satker', label: 'Admin Satker' },
  { value: 'pemilik_risiko', label: 'Pemilik Risiko Satker' },
  { value: 'pengelola_risiko', label: 'Pengelola Risiko Satker' },
  { value: 'kepala_umr', label: 'Kepala Unit MR (MA)' },
  { value: 'anggota_umr', label: 'Anggota Unit MR (MA)' },
  { value: 'kepala_apip', label: 'Kepala APIP' },
  { value: 'anggota_apip', label: 'Anggota APIP' },
  { value: 'pemilik_risiko_ma', label: 'Pemilik Risiko MA' },
  { value: 'peserta_consulting', label: 'Peserta Consulting (RALS)' },
  { value: 'upg_pusat', label: 'UPG Pusat' },
  { value: 'upg_satker', label: 'UPG Satker' },
]

type User = {
  id: string
  email: string
  nama_lengkap: string
  role: string
  status_aktif: boolean
  unit: { nama_unit: string } | null
}

type Unit = { id: string; nama_unit: string }

export default function KelolaUsersClient({
  users,
  units,
  currentUserId,
}: {
  users: User[]
  units: Unit[]
  currentUserId: string
}) {
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setFormError(null)
    const result = await createUser(new FormData(e.currentTarget))
    setLoading(false)
    if (result.error) {
      setFormError(result.error)
    } else {
      setShowForm(false)
      ;(e.target as HTMLFormElement).reset()
    }
  }

  async function handleDelete(userId: string, nama: string) {
    if (!confirm(`Hapus pengguna "${nama}" dari sistem? Tindakan ini tidak dapat dibatalkan.`)) return
    const result = await deleteUser(userId)
    if (result.error) alert(result.error)
  }

  const inputCls = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200'

  return (
    <div className="space-y-4">
      {/* Tambah Pengguna button */}
      <div className="flex justify-end">
        <button
          onClick={() => { setShowForm((v) => !v); setFormError(null) }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          {showForm ? 'Tutup Form' : 'Tambah Pengguna'}
        </button>
      </div>

      {/* Add user form */}
      {showForm && (
        <div
          className="rounded-2xl border border-white/60 shadow-sm overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.92)' }}
        >
          <div className="px-5 py-3 border-b bg-slate-50/80">
            <h3 className="text-sm font-semibold text-slate-700">Tambah Pengguna Baru</h3>
          </div>
          <form onSubmit={handleCreate} className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Nama Lengkap</label>
              <input name="nama_lengkap" required placeholder="Nama Lengkap" className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Email</label>
              <input name="email" type="email" required placeholder="email@domain.com" className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Password Sementara</label>
              <input name="password" type="password" required minLength={8} placeholder="Min. 8 karakter" className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Role / Hak Akses</label>
              <select name="role" required defaultValue="" className={inputCls + ' bg-white'}>
                <option value="" disabled>-- Pilih Role --</option>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-slate-600">Unit Kerja <span className="text-slate-400">(opsional)</span></label>
              <select name="unit_kerja_id" defaultValue="" className={inputCls + ' bg-white'}>
                <option value="">-- Tidak terkait unit kerja (Pusat/MA) --</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.nama_unit}</option>
                ))}
              </select>
            </div>
            {formError && (
              <p className="col-span-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {formError}
              </p>
            )}
            <div className="col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                {loading ? 'Menyimpan...' : 'Simpan Pengguna'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* User list */}
      <div
        className="rounded-2xl border border-white/60 shadow-sm overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-2 px-5 py-3 border-b bg-slate-50/80">
          <h3 className="text-sm font-semibold text-slate-700">Daftar Pengguna</h3>
          <span className="ml-auto text-[11px] text-slate-400">{users.length} pengguna</span>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b bg-slate-50/40">
              {['Nama Lengkap', 'Email', 'Role', 'Unit Kerja', 'Status', ''].map((h) => (
                <th key={h} className="text-left px-5 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground italic">
                  Belum ada pengguna terdaftar.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3 font-medium text-slate-800">
                    {u.nama_lengkap}
                    {u.id === currentUserId && (
                      <span className="ml-2 text-[10px] text-indigo-500 font-semibold">(Anda)</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-500">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className="inline-block text-[10px] font-semibold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 rounded px-1.5 py-0.5">
                      {ROLE_OPTIONS.find((r) => r.value === u.role)?.label ?? u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {u.unit?.nama_unit ?? <span className="italic text-slate-300">Pusat/Belum diset</span>}
                  </td>
                  <td className="px-5 py-3">
                    {u.status_aktif ? (
                      <span className="inline-block text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200 rounded px-1.5 py-0.5">Aktif</span>
                    ) : (
                      <span className="inline-block text-[10px] font-semibold bg-slate-100 text-slate-500 rounded px-1.5 py-0.5">Nonaktif</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {u.id !== currentUserId && (
                      <button
                        onClick={() => handleDelete(u.id, u.nama_lengkap)}
                        title="Hapus pengguna ini"
                        className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
