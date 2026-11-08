try {
  require('dotenv').config();
} catch (e) {
  // dotenv optional fallback
}
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'akiri_secret_key_super_secure_2026';

app.use(cors());
app.use(express.json());
const staticDir = fs.existsSync(path.join(__dirname, 'dist'))
  ? path.join(__dirname, 'dist')
  : path.join(__dirname, 'public');
app.use(express.static(staticDir));

// Initialize database tables if connected to PostgreSQL
db.initDB();

// ==================== AUTH UTILITIES (ZERO EXTERNAL DEPENDENCIES) ====================

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, key] = stored.split(':');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return key === hash;
}

function generateToken(userId) {
  const payload = Buffer.from(JSON.stringify({
    userId,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
  })).toString('base64url');

  const signature = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, signature] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
  if (signature !== expectedSig) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.exp && Date.now() > data.exp) return null;
    return data.userId;
  } catch (e) {
    return null;
  }
}

// Authentication Middleware
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sesi belum ada atau telah berakhir. Silakan login kembali.' });
  }

  const token = authHeader.split(' ')[1];
  const userId = verifyToken(token);
  if (!userId) {
    return res.status(401).json({ error: 'Token autentikasi tidak valid atau sudah kedaluwarsa.' });
  }

  const user = await db.findUserById(userId);
  if (!user) {
    return res.status(401).json({ error: 'Pengguna tidak ditemukan dalam sistem.' });
  }

  req.user = user;
  req.userId = user.id;
  next();
}

// ==================== TIME & RECORD CALCULATOR ====================

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const normalized = (mins + 1440) % 1440;
  const h = Math.floor(normalized / 60).toString().padStart(2, '0');
  const m = (normalized % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function calculateRecord(clockIn, clockOut, standardWorkHours = 9, hourlyOvertimeRate = 25000) {
  const inMins = timeToMinutes(clockIn);
  const targetWorkMins = (Number(standardWorkHours) || 9) * 60; // 540 menit
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
  const minuteRate = (Number(hourlyOvertimeRate) || 25000) / 60;
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

// ==================== AUTH API ROUTES ====================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, fullName, role } = req.body;
    if (!username || !password || !fullName) {
      return res.status(400).json({ error: 'Nama Lengkap, Username, dan Password wajib diisi.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: 'Username minimal 3 karakter.' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'Password minimal 4 karakter.' });
    }

    const existing = await db.findUserByUsername(cleanUsername);
    if (existing) {
      return res.status(400).json({ error: 'Username sudah digunakan. Silakan pilih username lain.' });
    }

    const passwordHash = hashPassword(password);
    const user = await db.createUser({
      username: cleanUsername,
      passwordHash,
      fullName: fullName.trim(),
      role: (role || 'Karyawan').trim(),
      standardWorkHours: 9,
      hourlyOvertimeRate: 25000
    });

    const token = generateToken(user.id);
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        standardWorkHours: user.standardWorkHours,
        hourlyOvertimeRate: user.hourlyOvertimeRate
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Gagal melakukan pendaftaran akun.' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan Password wajib diisi.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const user = await db.findUserByUsername(cleanUsername);
    if (!user) {
      return res.status(401).json({ error: 'Username tidak ditemukan.' });
    }

    const valid = verifyPassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Password salah.' });
    }

    const token = generateToken(user.id);
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        standardWorkHours: user.standardWorkHours,
        hourlyOvertimeRate: user.hourlyOvertimeRate
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan saat proses login.' });
  }
});

// Current User Profile
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    fullName: req.user.fullName,
    role: req.user.role,
    standardWorkHours: req.user.standardWorkHours,
    hourlyOvertimeRate: req.user.hourlyOvertimeRate
  });
});

// Update Profile & Preferences
app.put('/api/auth/profile', requireAuth, async (req, res) => {
  try {
    const { fullName, role, standardWorkHours, hourlyOvertimeRate } = req.body;
    const updated = await db.updateUserProfile(req.userId, {
      fullName: fullName ? fullName.trim() : undefined,
      role: role ? role.trim() : undefined,
      standardWorkHours: standardWorkHours !== undefined ? Number(standardWorkHours) : undefined,
      hourlyOvertimeRate: hourlyOvertimeRate !== undefined ? Number(hourlyOvertimeRate) : undefined
    });

    res.json({
      success: true,
      user: updated
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Gagal memperbarui profil pengguna.' });
  }
});

// ==================== ATTENDANCE API ROUTES (PROTECTED) ====================

// List Records for logged in user
app.get('/api/records', requireAuth, async (req, res) => {
  const { month } = req.query; // YYYY-MM
  const records = await db.getRecords(req.userId, month);
  res.json(records);
});

// Clock In
app.post('/api/records/clock-in', requireAuth, async (req, res) => {
  const { date, clockIn, notes } = req.body;
  const targetDate = date || new Date().toISOString().split('T')[0];

  const now = new Date();
  const currentTime = clockIn || `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const calc = calculateRecord(currentTime, null, req.user.standardWorkHours, req.user.hourlyOvertimeRate);
  const records = await db.getRecords(req.userId);
  const existing = records.find(r => r.date === targetDate);

  const newRecord = {
    id: existing ? existing.id : 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    userId: req.userId,
    date: targetDate,
    ...calc,
    notes: notes || ''
  };

  await db.saveRecord(newRecord);
  res.json({ success: true, record: newRecord });
});

// Clock Out
app.post('/api/records/clock-out', requireAuth, async (req, res) => {
  const { id, clockOut, notes } = req.body;
  const records = await db.getRecords(req.userId);

  const record = id
    ? records.find(r => r.id === id)
    : records.find(r => r.status === 'active');

  if (!record) {
    return res.status(404).json({ error: 'Tidak ditemukan data absen masuk yang aktif untuk akun Anda.' });
  }

  const now = new Date();
  const currentTime = clockOut || `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const calc = calculateRecord(record.clockIn, currentTime, req.user.standardWorkHours, req.user.hourlyOvertimeRate);
  const updatedRecord = {
    ...record,
    userId: req.userId,
    ...calc,
    notes: notes !== undefined ? notes : record.notes
  };

  await db.saveRecord(updatedRecord);
  res.json({ success: true, record: updatedRecord });
});

// Manual Save/Edit Record
app.post('/api/records/save', requireAuth, async (req, res) => {
  const { id, date, clockIn, clockOut, notes } = req.body;
  if (!date || !clockIn) {
    return res.status(400).json({ error: 'Tanggal dan Jam Masuk wajib diisi.' });
  }

  const calc = calculateRecord(clockIn, clockOut || null, req.user.standardWorkHours, req.user.hourlyOvertimeRate);

  const updatedRecord = {
    id: id || 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    userId: req.userId,
    date,
    ...calc,
    notes: notes || ''
  };

  await db.saveRecord(updatedRecord);
  res.json({ success: true, record: updatedRecord });
});

// Delete Record
app.delete('/api/records/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  await db.deleteRecord(id, req.userId);
  res.json({ success: true });
});

// Monthly Summary
app.get('/api/summary', requireAuth, async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const records = await db.getRecords(req.userId, month);
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

// SPA wildcard fallback: any non-API GET request serves index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexPath = fs.existsSync(path.join(__dirname, 'dist', 'index.html'))
    ? path.join(__dirname, 'dist', 'index.html')
    : path.join(__dirname, 'public', 'index.html');
  res.sendFile(indexPath);
});

// Server listener (runs standalone on Render, Railway, or localhost)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server Absensi Akiri multi-user aktif di: http://localhost:${PORT}`);
  });
}

module.exports = app;
