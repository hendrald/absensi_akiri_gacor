import React, { useState, useEffect } from 'react';
import { LogIn, CheckCircle, Check } from 'lucide-react';

export default function ActiveCard({
  currentUser,
  todayRecord,
  config,
  onClockIn,
  onClockOut,
  onOpenAuth
}) {
  const [clockInInput, setClockInInput] = useState('07:20');
  const [manualOutTime, setManualOutTime] = useState('17:10');
  const [isManualOutOpen, setIsManualOutOpen] = useState(false);
  const [currentLiveTime, setCurrentLiveTime] = useState('');
  
  // Real-time live counter calculation for active status
  const [liveOvertimeMins, setLiveOvertimeMins] = useState(0);
  const [liveOvertimePay, setLiveOvertimePay] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);

  // Set default initial time on load
  useEffect(() => {
    const now = new Date();
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    setClockInInput(`${h}:${m}`);
    setCurrentLiveTime(`${h}:${m}`);
  }, []);

  // Live timer tick for active tracking
  useEffect(() => {
    function tick() {
      const now = new Date();
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      setCurrentLiveTime(`${h}:${m}`);

      if (todayRecord && todayRecord.status === 'active' && todayRecord.clockIn) {
        const [inH, inM] = todayRecord.clockIn.split(':').map(Number);
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const inMinutes = inH * 60 + inM;
        const standardHours = config?.standardWorkHours || 9;
        const targetWorkMins = standardHours * 60;

        let diff = nowMinutes - inMinutes;
        if (diff < 0) diff += 1440;

        const otMins = Math.max(0, diff - targetWorkMins);
        const minuteRate = (config?.hourlyOvertimeRate || 25000) / 60;
        const otPay = Math.round(otMins * minuteRate);

        setLiveOvertimeMins(otMins);
        setLiveOvertimePay(otPay);
        setProgressPercent(Math.min(100, Math.round((diff / targetWorkMins) * 100)));
      }
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [todayRecord, config]);

  const setClockInToNow = () => {
    const now = new Date();
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    setClockInInput(`${h}:${m}`);
  };

  const handleEditActiveClockIn = () => {
    if (!todayRecord || todayRecord.status !== 'active') return;
    const newClockIn = prompt('Masukkan koreksi jam masuk kantor Anda (Format HH:mm):', todayRecord.clockIn);
    if (!newClockIn) return;

    const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!regex.test(newClockIn)) {
      alert('Format jam salah! Gunakan format HH:mm, contoh: 07:15 atau 08:30');
      return;
    }
    onClockIn(newClockIn);
  };

  const standardHours = config?.standardWorkHours || 9;
  const rate = config?.hourlyOvertimeRate || 25000;
  const perMinRate = (rate / 60).toLocaleString('id-ID', { maximumFractionDigits: 2 });

  if (!currentUser) {
    return (
      <div className="mt-4 sm:mt-6 bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center shadow-xs">
        <span className="inline-block px-3 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-full mb-3">
          Belum Masuk Akun
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Silakan Masuk ke Akun Anda</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-5">
          Masuk atau daftar akun baru untuk mulai mencatat presensi harian dan menghitung lembur 9 jam kerja riil.
        </p>
        <button
          onClick={() => onOpenAuth('login')}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-indigo-100 transition"
        >
          <LogIn className="w-4 h-4" />
          <span>Masuk / Daftar Sekarang</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 sm:mt-6 bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 sm:gap-6">
        <div>
          {!todayRecord ? (
            <span className="inline-block px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full mb-2">
              Belum Absen Masuk
            </span>
          ) : todayRecord.status === 'active' ? (
            <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full mb-2 animate-pulse">
              Sedang Bekerja (Aktif)
            </span>
          ) : (
            <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full mb-2">
              Selesai Bekerja Hari Ini
            </span>
          )}

          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            {!todayRecord
              ? 'Presensi Hari Ini'
              : todayRecord.status === 'active'
              ? `Absen Masuk Jam ${todayRecord.clockIn}`
              : `Kerja Tuntas (${todayRecord.clockIn} - ${todayRecord.clockOut})`}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {!todayRecord
              ? `Tentukan jam masuk kantor Anda. Target kepulangan otomatis +${standardHours} jam kerja.`
              : todayRecord.status === 'active'
              ? `Target ${standardHours} jam selesai pukul ${todayRecord.targetClockOut}. Setelah itu otomatis lembur.`
              : `Lembur tercatat ${todayRecord.overtimeMinutes} menit (Rp ${todayRecord.overtimePay?.toLocaleString('id-ID')}).`}
          </p>
        </div>

        {/* Action Controls */}
        <div className="w-full lg:w-auto">
          {!todayRecord ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
              <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl">
                <label className="text-xs text-slate-500 font-bold whitespace-nowrap">Jam Masuk:</label>
                <input
                  type="time"
                  value={clockInInput}
                  onChange={(e) => setClockInInput(e.target.value)}
                  className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg font-mono text-base font-extrabold text-indigo-700 outline-none focus:border-indigo-500 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={setClockInToNow}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md transition"
                  title="Gunakan jam saat ini"
                >
                  Sekarang
                </button>
              </div>
              <button
                onClick={() => onClockIn(clockInInput)}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-indigo-100 transition"
              >
                <LogIn className="w-4 h-4" />
                <span>Konfirmasi Absen Masuk</span>
              </button>
            </div>
          ) : todayRecord.status === 'active' ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={() => onClockOut(currentLiveTime)}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-emerald-200 transition"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Absen Pulang Sekarang ({currentLiveTime || '--:--'})</span>
              </button>

              <button
                type="button"
                onClick={() => setIsManualOutOpen(!isManualOutOpen)}
                className="text-xs font-semibold text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 px-3.5 py-2.5 rounded-xl transition text-center whitespace-nowrap"
              >
                Pilih Jam Manual...
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Box Input Jam Pulang Manual (Dropdown) */}
      {isManualOutOpen && todayRecord?.status === 'active' && (
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-end gap-3 bg-slate-50/70 p-3.5 rounded-xl">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <span className="text-xs text-slate-600 font-bold">Tentukan Jam Pulang:</span>
            <input
              type="time"
              value={manualOutTime}
              onChange={(e) => setManualOutTime(e.target.value)}
              className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg font-mono text-base font-extrabold text-emerald-700 outline-none focus:border-emerald-500 shadow-2xs"
            />
          </div>
          <button
            onClick={() => {
              onClockOut(manualOutTime);
              setIsManualOutOpen(false);
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white px-4 py-2 rounded-xl font-bold text-xs transition"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Simpan Absen Pulang</span>
          </button>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">
        <div className="bg-slate-50 border border-slate-100 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Jam Masuk</span>
            {todayRecord?.status === 'active' && (
              <button
                onClick={handleEditActiveClockIn}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded transition"
              >
                Koreksi
              </button>
            )}
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-800 font-mono mt-1">
            {todayRecord ? todayRecord.clockIn : '--:--'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Dicatat manual / sistem</div>
        </div>

        <div className="bg-slate-50 border border-slate-100 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl">
          <span className="text-xs font-semibold text-slate-500">Target Pulang ({standardHours} Jam)</span>
          <div className="text-xl sm:text-2xl font-black text-indigo-600 font-mono mt-1">
            {todayRecord ? todayRecord.targetClockOut : '--:--'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Batas akhir jam reguler</div>
        </div>

        <div className="bg-slate-50 border border-slate-100 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl">
          <span className="text-xs font-semibold text-slate-500">Menit Lembur</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 font-mono mt-1">
            {todayRecord?.status === 'completed'
              ? `${todayRecord.overtimeMinutes}m`
              : todayRecord?.status === 'active'
              ? `${liveOvertimeMins}m`
              : '0m'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {todayRecord?.status === 'completed'
              ? `${(todayRecord.overtimeMinutes / 60).toFixed(1)} jam`
              : todayRecord?.status === 'active'
              ? `${(liveOvertimeMins / 60).toFixed(1)} jam`
              : '0.0 jam'}
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl">
          <span className="text-xs font-semibold text-slate-500">Estimasi Uang Lembur</span>
          <div className="text-xl sm:text-2xl font-black text-slate-800 font-mono mt-1">
            {todayRecord?.status === 'completed'
              ? `Rp ${todayRecord.overtimePay?.toLocaleString('id-ID')}`
              : todayRecord?.status === 'active'
              ? `Rp ${liveOvertimePay?.toLocaleString('id-ID')}`
              : 'Rp 0'}
          </div>
          <div className="text-[11px] text-emerald-600 font-bold mt-1">
            Rp {perMinRate} / m
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-5 sm:mt-6 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl p-3.5 sm:p-4">
        <div className="flex justify-between items-center text-xs font-semibold mb-2">
          <span className="text-slate-600">
            {todayRecord?.status === 'completed'
              ? 'Kerja Hari Ini Telah Tuntas & Tersimpan'
              : liveOvertimeMins > 0
              ? `Target ${standardHours} Jam Terpenuhi! Sedang Berjalan Lembur`
              : `Progres Menuju ${standardHours} Jam Kerja Riil`}
          </span>
          <span className="font-mono font-bold text-slate-800">
            {todayRecord?.status === 'completed' ? '100%' : `${progressPercent}%`}
          </span>
        </div>
        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              todayRecord?.status === 'completed' || liveOvertimeMins > 0
                ? 'bg-emerald-500'
                : 'bg-indigo-600'
            }`}
            style={{ width: `${todayRecord?.status === 'completed' ? 100 : progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] sm:text-[11px] text-slate-400 mt-2 font-mono">
          <span>0 Jam</span>
          <span>{(standardHours / 2).toFixed(1)} Jam</span>
          <span className="font-bold text-indigo-600">{standardHours} Jam (Target)</span>
          <span className="text-emerald-600 font-bold">&gt; {standardHours} Jam (Lembur)</span>
        </div>
      </div>
    </div>
  );
}

