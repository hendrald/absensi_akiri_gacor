import React, { useState } from 'react';
import { UserCheck, LogIn, UserPlus } from 'lucide-react';

export default function AuthModal({
  isOpen,
  initialTab = 'login',
  onClose,
  onLogin,
  onRegister
}) {
  const [tab, setTab] = useState(initialTab);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state (simplified: Nama, Username, Password)
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      await onLogin(loginUsername, loginPassword);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Login gagal.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      await onRegister(regFullName, regUsername, regPassword);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Pendaftaran akun gagal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100">
        {/* Brand & Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-100">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              {tab === 'login' ? 'Masuk ke Akun Anda' : 'Daftar Akun Baru'}
            </h2>
            <p className="text-xs text-slate-500">Kelola absensi & rekapan lembur pribadi</p>
          </div>
        </div>

        {/* Auth Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 rounded-lg transition text-center ${
              tab === 'login'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Masuk (Login)
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 rounded-lg transition text-center ${
              tab === 'register'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Daftar Baru (Register)
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl text-xs font-medium bg-red-50 text-red-700 border border-red-200">
            {errorMsg}
          </div>
        )}

        {/* Login Form */}
        {tab === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Username</label>
              <input
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Masukkan username"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Password</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 mt-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-indigo-100 transition flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Memproses...' : 'Masuk Sekarang'}</span>
            </button>
          </form>
        ) : (
          /* Register Form (Super Ringkas: Nama, Username, Password) */
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Nama Lengkap</label>
              <input
                type="text"
                required
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                placeholder="Contoh: Denny Hendra"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Nama ini akan dicetak pada slip PDF dan tanda tangan</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Username</label>
              <input
                type="text"
                required
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder="Minimal 3 karakter tanpa spasi"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Password</label>
              <input
                type="password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Minimal 4 karakter"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 mt-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-emerald-200 transition flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{loading ? 'Mendaftarkan...' : 'Daftar Akun Baru'}</span>
            </button>
          </form>
        )}

        <div className="mt-4 pt-3 text-center border-t border-slate-100">
          <p className="text-[11px] text-slate-400">
            Data absensi & pengaturan akan otomatis terisolasi untuk akun Anda sendiri.
          </p>
        </div>
      </div>
    </div>
  );
}

