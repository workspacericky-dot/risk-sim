# Worker analitik Uji Publik ZI

Worker ini memproses antrean `zi_analysis_runs` di luar aplikasi Next.js. Nama responden tidak pernah diambil oleh worker.

## Menjalankan

1. Buat virtual environment Python dan instal `requirements.txt`.
2. Siapkan `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY`.
3. Opsional: jalankan Ollama dan isi `OLLAMA_URL` serta `OLLAMA_MODEL`.
4. Jalankan `python worker.py --once` untuk satu batch atau `python worker.py` untuk mode polling.

Tanpa Ollama, worker tetap menyelesaikan statistik, CRI, dan clustering menggunakan analisis leksikal deterministik. Hasil menyimpan nama model agar evaluator dapat membedakan analisis baseline dan LLM.

