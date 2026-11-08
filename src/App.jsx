import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import BannerRule from './components/BannerRule';
import ActiveCard from './components/ActiveCard';
import SummaryCards from './components/SummaryCards';
import RekapTable from './components/RekapTable';
import AuthModal from './components/AuthModal';
import ConfigModal from './components/ConfigModal';
import ManualRecordModal from './components/ManualRecordModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authToken, setAuthToken] = useState(localStorage.getItem('akiri_token') || null);
  const [config, setConfig] = useState({ standardWorkHours: 9, hourlyOvertimeRate: 25000 });
  const [records, setRecords] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);
  const [summary, setSummary] = useState(null);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));

  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState('login');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  // Authenticated fetch wrapper
  const authFetch = useCallback(
    async (url, options = {}) => {
      const headers = options.headers || {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
      }

      const res = await fetch(url, { ...options, headers });
      if (res.status === 401) {
        setAuthToken(null);
        setCurrentUser(null);
        localStorage.removeItem('akiri_token');
        setIsAuthOpen(true);
        throw new Error('Sesi telah kedaluwarsa. Silakan login kembali.');
      }
      return res;
    },
    [authToken]
  );

  // Load Current User on start
  useEffect(() => {
    if (!authToken) {
      setIsAuthOpen(true);
      return;
    }

    async function loadMe() {
      try {
        const res = await authFetch('/api/auth/me');
        if (res.ok) {
          const user = await res.json();
          setCurrentUser(user);
          setConfig({
            standardWorkHours: user.standardWorkHours || 9,
            hourlyOvertimeRate: user.hourlyOvertimeRate || 25000
          });
          setIsAuthOpen(false);
        } else {
          throw new Error('Gagal memverifikasi user');
        }
      } catch (err) {
        console.warn('Auth check error:', err.message);
        setIsAuthOpen(true);
      }
    }

    loadMe();
  }, [authToken, authFetch]);

  // Load records and summary when user or month changes
  const loadRecords = useCallback(async () => {
    if (!authToken || !currentUser) return;
    try {
      const res = await authFetch(`/api/records?month=${filterMonth}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
        const todayStr = new Date().toISOString().split('T')[0];
        setTodayRecord(data.find((r) => r.date === todayStr) || null);
      }

      const sumRes = await authFetch(`/api/summary?month=${filterMonth}`);
      if (sumRes.ok) {
        const sumData = await sumRes.json();
        setSummary(sumData);
      }
    } catch (err) {
      console.error('Error loading records:', err.message);
    }
  }, [authToken, currentUser, filterMonth, authFetch]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Auth Handlers
  const handleLogin = async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login gagal.');

    localStorage.setItem('akiri_token', data.token);
    setAuthToken(data.token);
    setCurrentUser(data.user);
    setConfig({
      standardWorkHours: data.user.standardWorkHours || 9,
      hourlyOvertimeRate: data.user.hourlyOvertimeRate || 25000
    });
  };

  const handleRegister = async (fullName, username, password) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Pendaftaran gagal.');

    localStorage.setItem('akiri_token', data.token);
    setAuthToken(data.token);
    setCurrentUser(data.user);
    setConfig({
      standardWorkHours: data.user.standardWorkHours || 9,
      hourlyOvertimeRate: data.user.hourlyOvertimeRate || 25000
    });
  };

  const handleLogout = () => {
    if (!confirm('Apakah Anda yakin ingin keluar dari akun ini?')) return;
    localStorage.removeItem('akiri_token');
    setAuthToken(null);
    setCurrentUser(null);
    setRecords([]);
    setTodayRecord(null);
    setSummary(null);
    setIsAuthOpen(true);
    setAuthTab('login');
  };

  const handleSaveProfile = async (updates) => {
    const res = await authFetch('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menyimpan profil.');

    setCurrentUser(data.user);
    setConfig({
      standardWorkHours: data.user.standardWorkHours,
      hourlyOvertimeRate: data.user.hourlyOvertimeRate
    });
    loadRecords();
  };

  // Clock in & Clock out handlers
  const handleClockIn = async (customTime) => {
    try {
      const res = await authFetch('/api/records/clock-in', {
        method: 'POST',
        body: JSON.stringify({ clockIn: customTime })
      });
      const data = await res.json();
      if (data.success) {
        loadRecords();
      } else {
        alert(data.error || 'Gagal absen masuk.');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleClockOut = async (timeStr) => {
    try {
      const res = await authFetch('/api/records/clock-out', {
        method: 'POST',
        body: JSON.stringify({ clockOut: timeStr })
      });
      const data = await res.json();
      if (data.success) {
        loadRecords();
      } else {
        alert(data.error || 'Gagal absen pulang.');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Manual record actions
  const handleSaveRecord = async (recordData) => {
    const res = await authFetch('/api/records/save', {
      method: 'POST',
      body: JSON.stringify(recordData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menyimpan.');
    loadRecords();
  };

  const handleDeleteRecord = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus catatan presensi ini?')) return;
    try {
      const res = await authFetch(`/api/records/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadRecords();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Export PDF Handler
  const handleDownloadPDF = async () => {
    if (!currentUser) return;

    let jsPDFClass = window.jspdf?.jsPDF;
    if (!jsPDFClass) {
      const jspdfModule = await import('jspdf');
      await import('jspdf-autotable');
      jsPDFClass = jspdfModule.jsPDF;
    }

    const doc = new jsPDFClass({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const [year, monthNum] = filterMonth.split('-');
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthName = monthNames[parseInt(monthNum, 10) - 1] || filterMonth;

    // Header Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('REKAPITULASI PRESENSI & PERHITUNGAN LEMBUR', 14, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Standar Kerja Riil: ${config.standardWorkHours || 9} Jam | Tarif Lembur: Rp ${(config.hourlyOvertimeRate || 25000).toLocaleString('id-ID')} / jam`,
      14,
      24
    );

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(14, 27, 196, 27);

    // Metadata
    const empName = currentUser.fullName || currentUser.username || 'Karyawan';
    const empRole = currentUser.role || 'Karyawan';

    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);

    doc.setFont('helvetica', 'bold');
    doc.text('Nama Karyawan', 14, 34);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${empName}`, 48, 34);

    doc.setFont('helvetica', 'bold');
    doc.text('Jabatan / Role', 14, 40);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${empRole}`, 48, 40);

    doc.setFont('helvetica', 'bold');
    doc.text('Periode Bulan', 130, 34);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${monthName} ${year}`, 160, 34);

    doc.setFont('helvetica', 'bold');
    doc.text('Tanggal Cetak', 130, 40);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${new Date().toLocaleDateString('id-ID')}`, 160, 40);

    // Table Data
    const tableData = records.map((r, index) => {
      const workHours = r.totalWorkMinutes
        ? `${Math.floor(r.totalWorkMinutes / 60)}j ${r.totalWorkMinutes % 60}m`
        : '-';
      const overtimeStr = r.overtimeMinutes > 0 ? `${r.overtimeMinutes} m` : '-';
      const overtimePayStr = r.overtimePay > 0 ? `Rp ${r.overtimePay.toLocaleString('id-ID')}` : '-';

      return [
        (index + 1).toString(),
        r.date,
        r.clockIn,
        r.targetClockOut || '-',
        r.clockOut || '-',
        workHours,
        overtimeStr,
        overtimePayStr,
        r.status === 'completed' ? 'Selesai' : 'Aktif'
      ];
    });

    let totalWorkMinutes = 0;
    let totalOvertimeMinutes = 0;
    let totalOvertimePay = 0;
    let totalDays = 0;

    records.forEach((r) => {
      if (r.status === 'completed') {
        totalDays++;
        totalWorkMinutes += r.totalWorkMinutes || 0;
        totalOvertimeMinutes += r.overtimeMinutes || 0;
        totalOvertimePay += r.overtimePay || 0;
      }
    });

    doc.autoTable({
      startY: 46,
      head: [['No', 'Tanggal', 'Jam Masuk', 'Target 9j', 'Jam Pulang', 'Total Kerja', 'Lembur', 'Uang Lembur', 'Status']],
      body: tableData,
      foot: [
        [
          'TOTAL',
          `${totalDays} Hari`,
          '',
          '',
          '',
          `${(totalWorkMinutes / 60).toFixed(1)} Jam`,
          `${totalOvertimeMinutes} Menit`,
          `Rp ${totalOvertimePay.toLocaleString('id-ID')}`,
          ''
        ]
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontSize: 8.5,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85]
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontSize: 8.5,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'center', cellWidth: 24 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'center', cellWidth: 20 },
        4: { halign: 'center', cellWidth: 20 },
        5: { halign: 'center', cellWidth: 22 },
        6: { halign: 'center', cellWidth: 20 },
        7: { halign: 'right', cellWidth: 28 },
        8: { halign: 'center', cellWidth: 16 }
      },
      margin: { left: 14, right: 14 }
    });

    const finalY = doc.lastAutoTable.finalY + 14;

    // Dual Signature Block
    if (finalY + 36 <= 285) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);

      // Karyawan
      doc.text('Karyawan yang bersangkutan,', 24, finalY);
      doc.text('_________________________', 24, finalY + 22);
      doc.setFont('helvetica', 'bold');
      doc.text(empName, 24, finalY + 27);
      doc.setFont('helvetica', 'normal');
      doc.text(empRole, 24, finalY + 31);

      // HRD
      doc.text('Mengetahui / Menyetujui (HRD),', 130, finalY);
      doc.text('_________________________', 130, finalY + 22);
      doc.setFont('helvetica', 'bold');
      doc.text('( Supervisor / HRD )', 130, finalY + 27);
      doc.setFont('helvetica', 'normal');
      doc.text('Divisi Operasional & HR', 130, finalY + 31);
    }

    doc.save(`Rekap_Absensi_${currentUser.username || 'user'}_${filterMonth}.pdf`);
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    if (!currentUser || records.length === 0) {
      alert('Belum ada data presensi untuk diexport.');
      return;
    }

    const headers = [
      'No',
      'Tanggal',
      'Jam Masuk',
      'Target 9 Jam',
      'Jam Pulang',
      'Total Kerja (Menit)',
      'Lembur (Menit)',
      'Uang Lembur (Rp)',
      'Status',
      'Catatan'
    ];

    const rows = records.map((r, i) => [
      i + 1,
      r.date,
      r.clockIn,
      r.targetClockOut || '',
      r.clockOut || '',
      r.totalWorkMinutes || 0,
      r.overtimeMinutes || 0,
      r.overtimePay || 0,
      r.status === 'completed' ? 'Selesai' : 'Aktif',
      `"${(r.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Rekap_Absensi_${currentUser.username}_${filterMonth}.csv`;
    link.click();
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header */}
      <Header
        currentUser={currentUser}
        onOpenAuth={(tab) => {
          setAuthTab(tab);
          setIsAuthOpen(true);
        }}
        onOpenConfig={() => setIsConfigOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Dashboard Container */}
      <div className={`transition-opacity duration-300 ${!currentUser ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
        <BannerRule
          standardWorkHours={config.standardWorkHours}
          hourlyOvertimeRate={config.hourlyOvertimeRate}
        />

        <ActiveCard
          currentUser={currentUser}
          todayRecord={todayRecord}
          config={config}
          onClockIn={handleClockIn}
          onClockOut={handleClockOut}
          onOpenAuth={(tab) => {
            setAuthTab(tab);
            setIsAuthOpen(true);
          }}
        />

        <SummaryCards summary={summary} />

        <RekapTable
          records={records}
          filterMonth={filterMonth}
          onMonthChange={setFilterMonth}
          onOpenManualModal={() => {
            setEditingRecord(null);
            setIsManualOpen(true);
          }}
          onEditRecord={(r) => {
            setEditingRecord(r);
            setIsManualOpen(true);
          }}
          onDeleteRecord={handleDeleteRecord}
          onDownloadPDF={handleDownloadPDF}
          onExportCSV={handleExportCSV}
          currentUser={currentUser}
        />
      </div>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        initialTab={authTab}
        onClose={() => setIsAuthOpen(false)}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />

      <ConfigModal
        isOpen={isConfigOpen}
        currentUser={currentUser}
        onClose={() => setIsConfigOpen(false)}
        onSaveProfile={handleSaveProfile}
      />

      <ManualRecordModal
        isOpen={isManualOpen}
        editingRecord={editingRecord}
        onClose={() => setIsManualOpen(false)}
        onSaveRecord={handleSaveRecord}
      />
    </div>
  );
}

