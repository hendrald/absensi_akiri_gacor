import React from 'react';

export default function BannerRule({ standardWorkHours = 9, hourlyOvertimeRate = 25000 }) {
  const perMinRate = (hourlyOvertimeRate / 60).toLocaleString('id-ID', { maximumFractionDigits: 2 });

  return (
    <div className="mt-4 sm:mt-6 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0">
          {standardWorkHours}h
        </div>
        <div>
          <p className="text-xs sm:text-sm font-bold text-indigo-900">Aturan Kerja Fair & Presisi</p>
          <p className="text-[11px] sm:text-xs text-indigo-700">
            Masuk jam berapa pun, {standardWorkHours} jam pertama adalah jam reguler. Menit berikutnya otomatis lembur (Rp {hourlyOvertimeRate.toLocaleString('id-ID')} / jam).
          </p>
        </div>
      </div>
      <div className="self-start sm:self-auto flex-shrink-0">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-xs">
          Rp {perMinRate} / menit
        </span>
      </div>
    </div>
  );
}

