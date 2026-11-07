# Absensi Akiri ⏱️

Aplikasi web pelacak presensi & kalkulator uang lembur presisi berbasis 9 jam kerja riil.

## Fitur Utama
1. **Aturan 9 Jam Kerja Riil:** Jam lembur dihitung otomatis setelah menit ke-540 (9 jam kerja terpenuhi), tanpa terikat jam dinding 17:00.
2. **Hitungan Presisi Per Menit:** Tarif default Rp 25.000 / jam (Rp 416,67 / menit).
3. **Target Jam Pulang Otomatis:** Begitu absen masuk (misal `07:20`), sistem langsung menampilkan target selesai 9 jam (`16:20`).
4. **Live Overtime Tracker:** Menampilkan detik/menit lembur berjalan dan estimasi rupiahnya.
5. **Rekap Bulanan & Riwayat:** Total hari kerja, total jam lembur, total rupiah lembur, dan fitur Export CSV.

## Cara Menjalankan
Buka terminal di folder project:
```bash
npm install
npm start
```
Buka browser di: `http://localhost:3000`

