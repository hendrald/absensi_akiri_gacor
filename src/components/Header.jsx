import React, { useState, useEffect } from 'react';
import { Clock, Settings, LogOut, User } from 'lucide-react';

export default function Header({ currentUser, onOpenAuth, onOpenConfig, onLogout }) {
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour12: false }));
      setCurrentDate(now.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }));
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const initial = (currentUser?.fullName || currentUser?.username || 'U').charAt(0).toUpperCase();

  return (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 sm:pb-6 border-b border-slate-200 gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 sm:p-3 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-100 flex-shrink-0">
          <Clock className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Absensi Akiri</h1>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
        <div className="text-left sm:text-right bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{currentDate || 'Memuat...'}</div>
          <div className="text-lg sm:text-xl font-bold text-slate-800 font-mono leading-tight">{currentTime || '00:00:00'}</div>
        </div>

        {currentUser ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2.5 bg-white border border-slate-200 pl-2 pr-3.5 py-1.5 rounded-xl shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                {initial}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-800 leading-tight">{currentUser.fullName || currentUser.username}</div>
                <div className="text-[10px] text-slate-500 font-medium">{currentUser.role || 'Karyawan'}</div>
              </div>
            </div>
            <button
              onClick={onOpenConfig}
              className="p-2 sm:p-2.5 bg-white hover:bg-slate-100 active:scale-95 text-slate-600 border border-slate-200 rounded-xl transition shadow-xs flex-shrink-0"
              title="Pengaturan Akun & Aturan"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={onLogout}
              className="p-2 sm:p-2.5 bg-red-50 hover:bg-red-100 active:scale-95 text-red-600 border border-red-200 rounded-xl transition shadow-xs flex-shrink-0"
              title="Keluar / Logout"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onOpenAuth('login')}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-md shadow-indigo-100 transition"
          >
            <User className="w-4 h-4" />
            <span>Masuk / Daftar</span>
          </button>
        )}
      </div>
    </header>
  );
}

