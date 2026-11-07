// State variables
let currentConfig = { standardWorkHours: 9, hourlyOvertimeRate: 25000 };
let currentRecords = [];
let todayRecord = null;

// Initialize app on DOM loaded
document.addEventListener('DOMContentLoaded', () => {
  initLiveClock();
  initDefaults();
  loadConfig();
  loadRecords();
});

function initDefaults() {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  document.getElementById('filterMonth').value = currentMonth;

  // Set default inputs
  document.getElementById('actionTimeInput').value = '07:20';
  document.getElementById('clockOutTimeInput').value = '17:10';
}

// Live Clock
function initLiveClock() {
  function tick() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour12: false });
    const dateStr = now.toLocaleDateString('id-ID', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });

    const liveTimeEl = document.getElementById('liveTime');
    const liveDateEl = document.getElementById('liveDate');
    if (liveTimeEl) liveTimeEl.textContent = timeStr;
    if (liveDateEl) liveDateEl.textContent = dateStr;

    if (todayRecord && todayRecord.status === 'active') {
      updateActiveTracker(now);
    }
  }

  tick();
  setInterval(tick, 1000);
}

// Update live counter when clock-in is active
function updateActiveTracker(nowDate) {
  if (!todayRecord || !todayRecord.clockIn) return;

  const [inH, inM] = todayRecord.clockIn.split(':').map(Number);
  const nowMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();
  const inMinutes = inH * 60 + inM;
  const targetWorkMins = currentConfig.standardWorkHours * 60; // 540m

  let diff = nowMinutes - inMinutes;
  if (diff < 0) diff += 1440;

  const overtimeMins = Math.max(0, diff - targetWorkMins);
  const minuteRate = currentConfig.hourlyOvertimeRate / 60;
  const overtimePay = Math.round(overtimeMins * minuteRate);

  const displayOvertime = document.getElementById('displayTodayOvertime');
  if (displayOvertime) {
    if (overtimeMins > 0) {
      displayOvertime.innerHTML = `<span class="text-emerald-700">${overtimeMins} m</span> / <span class="text-emerald-800 font-bold">${formatRupiah(overtimePay)}</span>`;
    } else {
      const remaining = targetWorkMins - diff;
      const remH = Math.floor(remaining / 60);
      const remM = remaining % 60;
      displayOvertime.innerHTML = `<span class="text-slate-600 text-sm font-semibold">Sisa ${remH}j ${remM}m ke 9 jam</span>`;
    }
  }
}

// Format Rupiah
function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount || 0);
}

// Format Duration
function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} jam ${m} mnt`;
}

// API Calls: Load Config
async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    currentConfig = await res.json();
    document.getElementById('inputStandardHours').value = currentConfig.standardWorkHours;
    document.getElementById('inputHourlyRate').value = currentConfig.hourlyOvertimeRate;
  } catch (err) {
    console.error('Gagal memuat config:', err);
  }
}

// API Calls: Load Records & Summary
async function loadRecords() {
  const month = document.getElementById('filterMonth').value;
  try {
    const [recRes, sumRes] = await Promise.all([
      fetch(`/api/records?month=${month}`),
      fetch(`/api/summary?month=${month}`)
    ]);

    currentRecords = await recRes.json();
    const summary = await sumRes.json();

    renderSummary(summary);
    renderTable(currentRecords);
    checkTodayStatus();
  } catch (err) {
    console.error('Gagal memuat data:', err);
  }
}

// Render Summary Cards
function renderSummary(summary) {
  document.getElementById('metricTotalDays').textContent = `${summary.totalDays} Hari`;
  document.getElementById('metricTotalOvertimeHours').textContent = summary.formattedOvertimeHours;
  document.getElementById('metricTotalOvertimeMinutes').textContent = `${summary.totalOvertimeMinutes} menit terakumulasi`;
  document.getElementById('metricTotalOvertimePay').textContent = formatRupiah(summary.totalOvertimePay);

  const [y, m] = (summary.month || '').split('-');
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const monthLabel = m ? `${monthNames[parseInt(m, 10) - 1]} ${y}` : 'Bulan Berjalan';
  document.getElementById('metricMonthLabel').textContent = monthLabel;
}

// Check & Render Today's status
function checkTodayStatus() {
  const todayStr = new Date().toISOString().split('T')[0];
  todayRecord = currentRecords.find(r => r.date === todayStr);

  const statusBadge = document.getElementById('attendanceStatusBadge');
  const cardTitle = document.getElementById('cardTitle');
  const cardSubtitle = document.getElementById('cardSubtitle');
  const clockInBox = document.getElementById('clockInActionBox');
  const clockOutBox = document.getElementById('clockOutActionBox');

  const displayClockIn = document.getElementById('displayClockIn');
  const displayTargetOut = document.getElementById('displayTargetOut');
  const displayClockOut = document.getElementById('displayClockOut');
  const displayTodayOvertime = document.getElementById('displayTodayOvertime');

  if (!todayRecord) {
    statusBadge.textContent = 'Belum Absen Masuk';
    statusBadge.className = 'inline-block px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full mb-2';
    cardTitle.textContent = 'Mulai Presensi Hari Ini';
    cardSubtitle.textContent = 'Pilih jam masuk kamu, lalu klik Absen Masuk.';
    
    clockInBox.classList.remove('hidden');
    clockOutBox.classList.add('hidden');

    displayClockIn.textContent = '--:--';
    displayTargetOut.textContent = '--:--';
    displayClockOut.textContent = '--:--';
    displayTodayOvertime.textContent = '0 m / Rp 0';
  } else if (todayRecord.status === 'active') {
    statusBadge.textContent = 'Sedang Bekerja (Aktif)';
    statusBadge.className = 'inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full mb-2';
    cardTitle.textContent = 'Absen Masuk Berhasil Diterima';
    cardSubtitle.textContent = `Masuk jam ${todayRecord.clockIn}. Selesai 9 jam jam ${todayRecord.targetClockOut}. Masukkan jam pulang di bawah untuk hitung lembur.`;
    
    clockInBox.classList.add('hidden');
    clockOutBox.classList.remove('hidden');

    displayClockIn.textContent = todayRecord.clockIn;
    displayTargetOut.textContent = todayRecord.targetClockOut;
    displayClockOut.textContent = 'Belum pulang';
    updateActiveTracker(new Date());
  } else if (todayRecord.status === 'completed') {
    statusBadge.textContent = 'Presensi Selesai';
    statusBadge.className = 'inline-block px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full mb-2';
    cardTitle.textContent = 'Presensi Hari Ini Selesai';
    cardSubtitle.textContent = `Durasi kerja riil: ${formatDuration(todayRecord.totalWorkMinutes)}. Lembur: ${todayRecord.overtimeMinutes} mnt.`;
    
    clockInBox.classList.add('hidden');
    clockOutBox.classList.add('hidden');

    displayClockIn.textContent = todayRecord.clockIn;
    displayTargetOut.textContent = todayRecord.targetClockOut;
    displayClockOut.textContent = todayRecord.clockOut;
    displayTodayOvertime.innerHTML = `<span class="text-amber-800 font-bold">${todayRecord.overtimeMinutes} m</span> / <span>${formatRupiah(todayRecord.overtimePay)}</span>`;
  }

  lucide.createIcons();
}

// Render Table Rows
function renderTable(records) {
  const tbody = document.getElementById('recordsTableBody');
  const emptyState = document.getElementById('emptyState');
  tbody.innerHTML = '';

  if (!records || records.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  records.forEach(r => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/80 transition';

    const overtimeDisplay = r.overtimeMinutes > 0
      ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">+${r.overtimeMinutes} mnt</span>`
      : `<span class="text-xs text-slate-400">0 mnt</span>`;

    const payDisplay = r.overtimePay > 0
      ? `<span class="font-bold text-emerald-600">${formatRupiah(r.overtimePay)}</span>`
      : `<span class="text-slate-400">-</span>`;

    tr.innerHTML = `
      <td class="py-3.5 px-4 font-semibold text-slate-800">${r.date}</td>
      <td class="py-3.5 px-4 font-mono font-bold text-slate-700">${r.clockIn || '-'}</td>
      <td class="py-3.5 px-4 font-mono text-indigo-600 font-bold">${r.targetClockOut || '-'}</td>
      <td class="py-3.5 px-4 font-mono font-bold ${r.clockOut ? 'text-slate-700' : 'text-blue-500 italic'}">
        ${r.clockOut || 'Aktif'}
      </td>
      <td class="py-3.5 px-4 text-xs font-semibold text-slate-600">${formatDuration(r.totalWorkMinutes)}</td>
      <td class="py-3.5 px-4">${overtimeDisplay}</td>
      <td class="py-3.5 px-4">${payDisplay}</td>
      <td class="py-3.5 px-4 text-right">
        <button onclick="editRecord('${r.id}')" class="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition" title="Edit">
          <i data-lucide="edit-3" class="w-4 h-4"></i>
        </button>
        <button onclick="deleteRecord('${r.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition ml-1" title="Hapus">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  lucide.createIcons();
}

// Clock In Handler
async function handleClockIn() {
  const timeInput = document.getElementById('actionTimeInput').value;
  try {
    const res = await fetch('/api/records/clock-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clockIn: timeInput })
    });
    const data = await res.json();
    if (data.success) {
      loadRecords();
    }
  } catch (err) {
    alert('Gagal absen masuk: ' + err.message);
  }
}

// Clock Out Handler (Supports custom manipulated time)
async function handleClockOut() {
  const customTime = document.getElementById('clockOutTimeInput').value;
  if (!customTime) {
    alert('Silakan tentukan jam pulang terlebih dahulu.');
    return;
  }
  try {
    const res = await fetch('/api/records/clock-out', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clockOut: customTime })
    });
    const data = await res.json();
    if (data.success) {
      loadRecords();
    } else {
      alert(data.error || 'Gagal absen pulang');
    }
  } catch (err) {
    alert('Gagal absen pulang: ' + err.message);
  }
}

// Reset Hari Ini (Untuk coba-coba lagi dari awal)
async function resetHariIni() {
  if (todayRecord) {
    await fetch(`/api/records/${todayRecord.id}`, { method: 'DELETE' });
    loadRecords();
  }
}

// Modal: Open & Close Manual Record
function openManualModal() {
  document.getElementById('modalTitle').textContent = 'Tambah Catatan Presensi';
  document.getElementById('editRecordId').value = '';
  document.getElementById('inputDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('inputClockIn').value = '07:20';
  document.getElementById('inputClockOut').value = '17:10';
  document.getElementById('inputNotes').value = '';
  document.getElementById('manualModal').classList.remove('hidden');
  lucide.createIcons();
}

function closeManualModal() {
  document.getElementById('manualModal').classList.add('hidden');
}

// Edit Record
function editRecord(id) {
  const r = currentRecords.find(item => item.id === id);
  if (!r) return;

  document.getElementById('modalTitle').textContent = 'Edit Catatan Presensi';
  document.getElementById('editRecordId').value = r.id;
  document.getElementById('inputDate').value = r.date;
  document.getElementById('inputClockIn').value = r.clockIn || '';
  document.getElementById('inputClockOut').value = r.clockOut || '';
  document.getElementById('inputNotes').value = r.notes || '';
  document.getElementById('manualModal').classList.remove('hidden');
  lucide.createIcons();
}

// Save Manual / Edited Record
async function saveManualRecord(e) {
  e.preventDefault();
  const id = document.getElementById('editRecordId').value;
  const date = document.getElementById('inputDate').value;
  const clockIn = document.getElementById('inputClockIn').value;
  const clockOut = document.getElementById('inputClockOut').value;
  const notes = document.getElementById('inputNotes').value;

  try {
    const res = await fetch('/api/records/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, date, clockIn, clockOut, notes })
    });
    const data = await res.json();
    if (data.success) {
      closeManualModal();
      loadRecords();
    } else {
      alert(data.error || 'Gagal menyimpan');
    }
  } catch (err) {
    alert('Gagal menyimpan: ' + err.message);
  }
}

// Delete Record
async function deleteRecord(id) {
  if (!confirm('Hapus catatan presensi ini?')) return;
  try {
    const res = await fetch(`/api/records/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      loadRecords();
    }
  } catch (err) {
    alert('Gagal menghapus: ' + err.message);
  }
}

// Modal: Open & Close Config
function openConfigModal() {
  document.getElementById('configModal').classList.remove('hidden');
}

function closeConfigModal() {
  document.getElementById('configModal').classList.add('hidden');
}

// Save Config
async function saveConfig(e) {
  e.preventDefault();
  const standardWorkHours = Number(document.getElementById('inputStandardHours').value);
  const hourlyOvertimeRate = Number(document.getElementById('inputHourlyRate').value);

  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ standardWorkHours, hourlyOvertimeRate })
    });
    currentConfig = await res.json();
    closeConfigModal();
    loadRecords();
  } catch (err) {
    alert('Gagal menyimpan pengaturan: ' + err.message);
  }
}

// Export CSV
function exportCSV() {
  if (currentRecords.length === 0) {
    alert('Tidak ada data untuk diexport.');
    return;
  }

  const headers = ['Tanggal', 'Jam Masuk', 'Target 9 Jam', 'Jam Pulang', 'Durasi Menit', 'Lembur Menit', 'Uang Lembur (Rp)', 'Catatan'];
  const rows = currentRecords.map(r => [
    r.date,
    r.clockIn || '',
    r.targetClockOut || '',
    r.clockOut || '',
    r.totalWorkMinutes || 0,
    r.overtimeMinutes || 0,
    r.overtimePay || 0,
    `"${(r.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Absensi_Lembur_${document.getElementById('filterMonth').value}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
