import React from 'react';
import { Calendar, Clock, Wallet } from 'lucide-react';

export default function SummaryCards({ summary }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6">
      <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400">Total Hari Kerja</p>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">
              {summary ? `${summary.totalDays} Hari` : '0 Hari'}
            </h3>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400">Total Lembur Bulan Ini</p>
            <h3 className="text-xl font-bold text-indigo-600 mt-0.5">
              {summary?.formattedOvertimeHours || '0 Jam'}
            </h3>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400">Total Uang Lembur</p>
            <h3 className="text-xl font-bold text-emerald-600 mt-0.5">
              Rp {summary?.totalOvertimePay?.toLocaleString('id-ID') || '0'}
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
}

