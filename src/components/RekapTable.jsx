import React from 'react';
import { Table, Plus, Download, FileSpreadsheet, Edit3, Trash2, Users } from 'lucide-react';

export default function RekapTable({
  records = [],
  filterMonth,
  onMonthChange,
  onOpenManualModal,
  onEditRecord,
  onDeleteRecord,
  onDownloadPDF,
  onExportCSV,
  currentUser,
  isAdmin = false,
  allUsers = [],
  selectedUserId = 'all',
  onSelectUser
}) {
  const formatDateID = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const isShowingAll = isAdmin && selectedUserId === 'all';

  // Calculations for tfoot totals
  let totalWorkMinutesAll = 0;
  let totalOvertimeMinsAll = 0;
  let totalOvertimePayAll = 0;
  let completedCount = 0;

  records.forEach((r) => {
    if (r.status === 'completed') {
      completedCount++;
      totalWorkMinutesAll += r.totalWorkMinutes || 0;
      totalOvertimeMinsAll += r.overtimeMinutes || 0;
      totalOvertimePayAll += r.overtimePay || 0;
    }
  });

  const totalWorkHoursFormatted = `${(totalWorkMinutesAll / 60).toFixed(1)} jam`;
  const totalOvertimeHoursFormatted = `${(totalOvertimeMinsAll / 60).toFixed(1)} jam (${totalOvertimeMinsAll}m)`;
  const totalOvertimePayFormatted = `Rp ${totalOvertimePayAll.toLocaleString('id-ID')}`;

  return (
    <div className="mt-6 sm:mt-8 bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Table className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Rekap Absen Datang & Pulang
              {isAdmin && (
                <span className="ml-2 text-xs font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  Panel Admin
                </span>
              )}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar presensi, jam masuk riil kantor, jam pulang, dan kalkulasi lembur harian.
          </p>
        </div>

        {/* Filter & Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Admin Employee Switcher Dropdown */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
              <Users className="w-3.5 h-3.5 text-amber-700" />
              <select
                value={selectedUserId}
                onChange={(e) => onSelectUser(e.target.value)}
                className="bg-white border border-amber-300 text-xs font-bold text-amber-900 px-2 py-1 rounded-lg outline-none focus:border-amber-500 shadow-2xs"
              >
                <option value="all">👥 Semua Karyawan ({allUsers.length})</option>
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    👤 {u.fullName} (@{u.username})
                  </option>
                ))}
              </select>
            </div>
          )}

          <input
            type="month"
            value={filterMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 px-3 py-2 rounded-xl outline-none focus:border-indigo-500 shadow-2xs"
          />

          <button
            onClick={onOpenManualModal}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-semibold transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Manual</span>
          </button>

          <button
            onClick={onDownloadPDF}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm shadow-rose-200 transition active:scale-95"
            title="Download PDF Rekap Absen & Lembur"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>

          <button
            onClick={onExportCSV}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm shadow-emerald-200 transition active:scale-95"
            title="Download Format CSV / Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Tabel Rekap Responsif */}
      <div className="overflow-x-auto mt-4 -mx-4 sm:mx-0">
        <table className="w-full text-left text-xs whitespace-nowrap min-w-[700px]">
          <thead>
            <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200 uppercase font-semibold text-[11px] tracking-wider">
              {isShowingAll && <th className="py-3 px-3.5 text-indigo-900 font-extrabold">Karyawan</th>}
              <th className="py-3 px-3.5">Tanggal</th>
              <th className="py-3 px-3">Jam Masuk</th>
              <th className="py-3 px-3">Target Pulang</th>
              <th className="py-3 px-3">Jam Pulang</th>
              <th className="py-3 px-3">Total Kerja</th>
              <th className="py-3 px-3 text-emerald-700">Lembur</th>
              <th className="py-3 px-3 text-emerald-700">Uang Lembur</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {!currentUser ? (
              <tr>
                <td colSpan={isShowingAll ? 10 : 9} className="py-8 text-center text-slate-400">
                  Silakan masuk ke akun Anda untuk melihat rekapan presensi.
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={isShowingAll ? 10 : 9} className="py-8 text-center text-slate-400">
                  Belum ada catatan presensi pada bulan ini.
                </td>
              </tr>
            ) : (
              records.map((r) => {
                const workHours = r.totalWorkMinutes
                  ? `${Math.floor(r.totalWorkMinutes / 60)}j ${r.totalWorkMinutes % 60}m`
                  : '-';
                const overtimeStr = r.overtimeMinutes > 0 ? `${r.overtimeMinutes}m` : '-';
                const overtimePayStr = r.overtimePay > 0 ? `Rp ${r.overtimePay.toLocaleString('id-ID')}` : '-';

                return (
                  <tr key={r.id} className="hover:bg-slate-50 transition border-b border-slate-100">
                    {isShowingAll && (
                      <td className="py-3 px-3.5 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center">
                            {(r.userFullName || 'K').charAt(0).toUpperCase()}
                          </span>
                          <span>{r.userFullName || 'Karyawan'}</span>
                        </div>
                      </td>
                    )}
                    <td className="py-3 px-3.5 font-bold text-slate-900">{formatDateID(r.date)}</td>
                    <td className="py-3 px-3 font-mono font-bold text-indigo-700">{r.clockIn}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{r.targetClockOut || '-'}</td>
                    <td
                      className={`py-3 px-3 font-mono font-bold ${
                        r.clockOut ? 'text-emerald-700' : 'text-slate-400'
                      }`}
                    >
                      {r.clockOut || '--:--'}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700">{workHours}</td>
                    <td className="py-3 px-3 font-bold text-emerald-600">{overtimeStr}</td>
                    <td className="py-3 px-3 font-bold text-emerald-700">{overtimePayStr}</td>
                    <td className="py-3 px-3">
                      {r.status === 'completed' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Selesai
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                          Aktif
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onEditRecord(r)}
                        className="text-slate-400 hover:text-indigo-600 p-1 rounded-md transition"
                        title="Edit"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteRecord(r.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition ml-1"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {records.length > 0 && (
            <tfoot className="bg-slate-50/90 font-bold text-slate-900 border-t-2 border-slate-300">
              <tr>
                <td
                  colSpan={isShowingAll ? 5 : 4}
                  className="py-3.5 px-3.5 text-left text-xs uppercase tracking-wider text-slate-600 font-extrabold"
                >
                  Total Akumulasi ({completedCount} Hari Kerja Selesai)
                </td>
                <td className="py-3.5 px-3 text-slate-800 text-xs font-bold">{totalWorkHoursFormatted}</td>
                <td className="py-3.5 px-3 text-emerald-700 text-xs font-black">{totalOvertimeHoursFormatted}</td>
                <td className="py-3.5 px-3 text-emerald-800 text-sm font-black">{totalOvertimePayFormatted}</td>
                <td colSpan="2"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
