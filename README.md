# Absensi Akiri ⏱️

Aplikasi web pelacak presensi & kalkulator uang lembur presisi berbasis **9 jam kerja riil**, dirancang dengan antarmuka **Responsive Web Design (RWD)**, sistem **Multi-User (Registrasi & Login)** mandiri, dan dukungan database **PostgreSQL (`absensi_akiri`)** & fallback offline JSON lokal.

---

## 🌟 Fitur Utama & Alur Penggunaan

### 1. Multi-User & Manajemen Data Mandiri
* **Registrasi & Login:** Pengguna baru dapat mendaftar dengan Nama Lengkap, Jabatan, Username, dan Password.
* **Isolasi Data Penuh:** Setiap pengguna memiliki data presensi, rekapan bulanan, dan pengaturan tarifnya sendiri.
* **Keamanan Password:** Password di-hash aman menggunakan `scrypt` bawaan `crypto` Node.js dengan salt unik.
* **Sesi Login Otomatis:** Menggunakan Bearer Token yang tersimpan di browser sehingga tidak perlu login berulang kali.

### 2. Presensi Datang (Input Fleksibel & Bebas Jam Berapa Saja)
* Absen di portal kantor Anda terlebih dahulu (misal jam `07:18` atau jika telat jam `08:45`).
* Buka Absensi Akiri, ketik jam masuk tersebut (atau klik tombol **"Sekarang"**).
* Klik **"Konfirmasi Absen Masuk"**. Target selesai 9 jam kerja otomatis terkunci (misal masuk `08:45` $\rightarrow$ target selesai `17:45`).
* *Fitur Koreksi:* Jika salah ketik jam masuk, ada tombol **"Koreksi"** di kartu untuk mengubah jam masuk kapan saja.

### 3. Presensi Pulang (1-Click Instant Pulang)
* Saat jam pulang kantor tiba, cukup klik 1 tombol:  
  👉 **"Absen Pulang Sekarang (HH:mm)"** (jam di dalam tombol berjalan *real-time*).
* Data kepulangan langsung tersimpan dan uang lembur per menit otomatis terhitung tanpa perlu mengetik jam lagi.
* *Opsi Tambahan:* Tersedia tombol **"Pilih Jam Manual..."** jika sewaktu-waktu lupa klik saat di kantor dan ingin memasukkan jam pulang secara manual saat sampai di rumah.

### 4. Perhitungan Lembur Presisi Per Menit
* Batas normal: 9 jam riil (540 menit) sejak jam masuk.
* Tarif standar: **Rp 25.000 / jam** (Rp 416,67 / menit) — dapat diubah di Pengaturan Akun masing-masing user.
* Kelebihan menit dihitung adil tanpa pembulatan rugi.

### 5. Rekap Absen Datang & Pulang (Menu Bawah) & Download PDF
* Di bagian bawah dasbor terdapat tabel lengkap: Tanggal, Jam Datang, Target 9 Jam, Jam Pulang, Durasi Kerja, Lembur, dan Uang Lembur.
* Dilengkapi baris **TOTAL REKAPITULASI** di bagian bawah tabel.
* Tombol **Download PDF**: Sekali klik langsung mengunduh file `.pdf` resmi berisi slip rekap kehadiran, total uang lembur bulanan, dan kolom tanda tangan karyawan & HRD yang sudah terisi nama akun yang login.

---

## 🗄️ Konfigurasi Database PostgreSQL (`absensi_akiri`)

Aplikasi ini sudah dikonfigurasi untuk terhubung ke database PostgreSQL bernama **`absensi_akiri`**.

1. Pastikan database `absensi_akiri` sudah dibuat di PostgreSQL Anda.
2. Buka file `.env`, lalu pastikan username dan password PostgreSQL Anda sesuai:
   ```env
   PORT=3000
   POSTGRES_URL="postgresql://postgres:password_kamu@localhost:5432/absensi_akiri"
   ```
3. Saat server dinyalakan, tabel `users` dan `attendances` akan **otomatis dibuat sendiri** oleh sistem.
4. *Catatan:* Jika PostgreSQL belum dinyalakan atau koneksi gagal, aplikasi otomatis menggunakan fallback penyimpanan file JSON lokal di folder `data/` sehingga aplikasi tidak akan crash.

---

## 🚀 Cara Menjalankan (React Vite + Node.js)

1. **Install seluruh dependensi (Frontend React & Backend Express):**
   ```bash
   npm install
   ```

2. **Mode Produksi (Fullstack Terintegrasi):**
   * Build frontend React ke folder `dist`:
     ```bash
     npm run build
     ```
   * Jalankan server Express (otomatis menyajikan React + API):
     ```bash
     npm start
     ```
   * Buka browser di **`http://localhost:3000`**.

3. **Mode Development (Hot Module Replacement / HMR):**
   * Jalankan backend di terminal 1:
     ```bash
     node server.js
     ```
   * Jalankan Vite dev server di terminal 2:
     ```bash
     npm run dev
     ```
   * Buka browser di **`http://localhost:5173`** (setiap perubahan kode React langsung ter-update otomatis tanpa reload).

2. Buka browser:
   * **Di Laptop / Desktop:** `http://localhost:3000`
   * **Di HP (1 Wi-Fi):** Cek IP laptop via `ipconfig`, lalu buka `http://192.168.x.x:3000` di Chrome HP.
