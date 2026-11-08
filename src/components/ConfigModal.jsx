import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function ConfigModal({
  isOpen,
  currentUser,
  onClose,
  onSaveProfile
}) {
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [standardHours, setStandardHours] = useState(9);
  const [hourlyRate, setHourlyRate] = useState(25000);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.fullName || '');
      setRole(currentUser.role || 'Karyawan');
      setStandardHours(currentUser.standardWorkHours || 9);
      setHourlyRate(currentUser.hourlyOvertimeRate || 25000);
    }
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSaveProfile({
        fullName,
        role,
        standardWorkHours: Number(standardHours),
        hourlyOvertimeRate: Number(hourlyRate)
      });
      onClose();
    } catch (err) {
      alert(err.message || 'Gagal menyimpan profil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-base sm:text-lg">Pengaturan Akun & Aturan</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Nama Lengkap</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
            <p className="text-[11px] text-slate-400 mt-0.5">Dicetak pada slip laporan PDF dan tanda tangan</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Jabatan / Role</label>
            <input
              type="text"
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Standar Jam Kerja (Jam)</label>
            <input
              type="number"
              step="0.5"
              min="1"
              max="24"
              required
              value={standardHours}
              onChange={(e) => setStandardHours(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
            <p className="text-[11px] text-slate-400 mt-0.5">Default: 9 jam kerja riil</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Tarif Lembur per Jam (Rp)</label>
            <input
              type="number"
              step="1000"
              min="0"
              required
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
            <p className="text-[11px] text-slate-400 mt-0.5">
              Default: Rp 25.000 / jam (Rp {(hourlyRate / 60).toFixed(2)} / menit)
            </p>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 sm:w-auto px-4 py-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 font-semibold text-xs transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-1/2 sm:w-auto px-5 py-2 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 font-semibold text-xs shadow-md shadow-indigo-100 transition"
            >
              {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

