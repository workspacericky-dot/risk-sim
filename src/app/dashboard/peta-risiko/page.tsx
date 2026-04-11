import { Map } from 'lucide-react'

export default function PetaRisikoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight font-serif">Peta Risiko</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          Visualisasi matriks risiko seluruh satuan kerja
        </p>
      </div>

      <div className="rounded-2xl border bg-white shadow-sm">
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-slate-400 px-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <Map className="w-8 h-8 text-indigo-400" />
          </div>
          <div className="space-y-2 max-w-sm">
            <p className="font-semibold text-slate-600 text-base">Gunakan tombol Peta Risiko di sidebar</p>
            <p className="text-sm text-slate-400">
              Klik ikon <strong>Peta Risiko</strong> di sidebar kiri untuk membuka panel pencarian satuan kerja dan menampilkan peta risikonya secara langsung.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
