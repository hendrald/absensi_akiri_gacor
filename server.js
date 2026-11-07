const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database tables if connected to PostgreSQL
db.initDB();

// Helper: Parse time HH:mm into minutes from midnight
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// Helper: Format minutes into HH:mm
function minutesToTime(mins) {
  const normalized = (mins + 1440) % 1440;
  const h = Math.floor(normalized / 60).toString().padStart(2, '0');
  const m = (normalized % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

// Helper: Calculate attendance details
function calculateRecord(clockIn, clockOut, config) {
  const inMins = timeToMinutes(clockIn);
  const targetWorkMins = config.standardWorkHours * 60; // 540 minutes for 9 hours
  const targetOutMins = inMins + targetWorkMins;
  const targetClockOut = minutesToTime(targetOutMins);

  if (!clockOut) {
    return {
      clockIn,
      clockOut: null,
      targetClockOut,
      totalWorkMinutes: null,
      overtimeMinutes: 0,
      overtimePay: 0,
      status: 'active'
    };
  }

  let outMins = timeToMinutes(clockOut);
  if (outMins < inMins) {
    outMins += 1440;
  }

  const totalWorkMinutes = outMins - inMins;
  const overtimeMinutes = Math.max(0, totalWorkMinutes - targetWorkMins);
  const minuteRate = config.hourlyOvertimeRate / 60;
  const overtimePay = Math.round(overtimeMinutes * minuteRate);

  return {
    clockIn,
    clockOut,
    targetClockOut,
    totalWorkMinutes,
    overtimeMinutes,
    overtimePay,
    status: 'completed'
  };
}

// API: Get Config
app.get('/api/config', async (req, res) => {
  const config = await db.getConfig();
  res.json(config);
});

// API: Update Config
app.post('/api/config', async (req, res) => {
  const current = await db.getConfig();
  const updated = {
    standardWorkHours: Number(req.body.standardWorkHours) || current.standardWorkHours,
    hourlyOvertimeRate: Number(req.body.hourlyOvertimeRate) || current.hourlyOvertimeRate
  };
  await db.saveConfig(updated);
  res.json(updated);
});

// API: List Records
app.get('/api/records', async (req, res) => {
  const { month } = req.query; // YYYY-MM
  const records = await db.getRecords(month);
  res.json(records);
});

// API: Clock In
app.post('/api/records/clock-in', async (req, res) => {
  const { date, clockIn, notes } = req.body;
  const config = await db.getConfig();
  const targetDate = date || new Date().toISOString().split('T')[0];

  const now = new Date();
  const currentTime = clockIn || `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const calc = calculateRecord(currentTime, null, config);
  const records = await db.getRecords();
  const existing = records.find(r => r.date === targetDate);

  const newRecord = {
    id: existing ? existing.id : 'rec_' + Date.now(),
    date: targetDate,
    ...calc,
    notes: notes || ''
  };

  await db.saveRecord(newRecord);
  res.json({ success: true, record: newRecord });
});

// API: Clock Out
app.post('/api/records/clock-out', async (req, res) => {
  const { id, clockOut, notes } = req.body;
  const config = await db.getConfig();
  const records = await db.getRecords();

  const record = id 
    ? records.find(r => r.id === id)
    : records.find(r => r.status === 'active');

  if (!record) {
    return res.status(404).json({ error: 'Tidak ditemukan data absen masuk yang aktif.' });
  }

  const now = new Date();
  const currentTime = clockOut || `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const calc = calculateRecord(record.clockIn, currentTime, config);
  const updatedRecord = {
    ...record,
    ...calc,
    notes: notes !== undefined ? notes : record.notes
  };

  await db.saveRecord(updatedRecord);
  res.json({ success: true, record: updatedRecord });
});

// API: Add/Edit Manual Record
app.post('/api/records/save', async (req, res) => {
  const { id, date, clockIn, clockOut, notes } = req.body;
  if (!date || !clockIn) {
    return res.status(400).json({ error: 'Tanggal dan Jam Masuk wajib diisi.' });
  }

  const config = await db.getConfig();
  const calc = calculateRecord(clockIn, clockOut || null, config);

  const updatedRecord = {
    id: id || 'rec_' + Date.now(),
    date,
    ...calc,
    notes: notes || ''
  };

  await db.saveRecord(updatedRecord);
  res.json({ success: true, record: updatedRecord });
});

// API: Delete Record
app.delete('/api/records/:id', async (req, res) => {
  const { id } = req.params;
  await db.deleteRecord(id);
  res.json({ success: true });
});

// API: Monthly Summary
app.get('/api/summary', async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const records = await db.getRecords(month);
  const completed = records.filter(r => r.status === 'completed');

  const totalDays = completed.length;
  const totalWorkMinutes = completed.reduce((acc, r) => acc + (r.totalWorkMinutes || 0), 0);
  const totalOvertimeMinutes = completed.reduce((acc, r) => acc + (r.overtimeMinutes || 0), 0);
  const totalOvertimePay = completed.reduce((acc, r) => acc + (r.overtimePay || 0), 0);

  res.json({
    month,
    totalDays,
    totalWorkMinutes,
    totalOvertimeMinutes,
    totalOvertimePay,
    formattedWorkHours: (totalWorkMinutes / 60).toFixed(1) + ' jam',
    formattedOvertimeHours: (totalOvertimeMinutes / 60).toFixed(1) + ' jam'
  });
});

// Only listen when running standalone (not imported by Vercel serverless)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server Absensi Akiri aktif di: http://localhost:${PORT}`);
  });
}

module.exports = app;
