import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function ManualRecordModal({
  isOpen,
  editingRecord,
  onClose,
  onSaveRecord
}) {
  const [date, setDate] = useState('');
  const [clockIn, setClockIn] = useState('07:20');
  const [clockOut, setClockOut] = useState('17:10');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingRecord) {
      setDate(editingRecord.date || '');
      setClockIn(editingRecord.clockIn || '07:20');
      setClockOut(editingRecord.clockOut || '');
      setNotes(editingRecord.notes || '');
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setClockIn('07:20');
      setClockOut('17:10');
      setNotes('');
    }
  }, [editingRecord, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSaveRecord({
        id: editingRecord?.id,
        date,
        clockIn,
        clockOut,
        notes
      });
      onClose();
    } catch (err) {
      alert(err.message || 'Gagal menyimpan catatan presensi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-base sm:text-lg">
            {editingRecord ? 'Edit Data Presensi' : 'Tambah Presensi Manual'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Tanggal</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Jam Masuk</label>
              <input
                type="time"
                required
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Jam Pulang (Opsional)</label>
              <input
                type="time"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Catatan (Opsional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Datang pagi standby server"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
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
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

