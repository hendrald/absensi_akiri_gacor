const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'attendance.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

const DEFAULT_CONFIG = {
  standardWorkHours: 9,
  hourlyOvertimeRate: 25000,
};

// Check if PostgreSQL connection string exists (Vercel Postgres / Neon / Supabase)
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
let pool = null;

if (connectionString) {
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
}

// Ensure local directory exists for offline fallback
if (!pool && !fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize tables if connected to PostgreSQL
async function initDB() {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance_configs (
        id VARCHAR(50) PRIMARY KEY,
        standard_work_hours NUMERIC DEFAULT 9,
        hourly_overtime_rate NUMERIC DEFAULT 25000
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendances (
        id VARCHAR(100) PRIMARY KEY,
        date VARCHAR(20) NOT NULL,
        clock_in VARCHAR(10) NOT NULL,
        clock_out VARCHAR(10),
        target_clock_out VARCHAR(10),
        total_work_minutes INT,
        overtime_minutes INT DEFAULT 0,
        overtime_pay INT DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    console.error('Database init error:', err);
  }
}

// Config operations
async function getConfig() {
  if (pool) {
    try {
      const res = await pool.query('SELECT standard_work_hours, hourly_overtime_rate FROM attendance_configs WHERE id = $1', ['default']);
      if (res.rows.length > 0) {
        return {
          standardWorkHours: Number(res.rows[0].standard_work_hours),
          hourlyOvertimeRate: Number(res.rows[0].hourly_overtime_rate)
        };
      }
    } catch (e) {
      console.error('Error fetching config from DB:', e);
    }
  }

  // Fallback to local file
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch (e) {}
  return DEFAULT_CONFIG;
}

async function saveConfig(config) {
  if (pool) {
    try {
      await pool.query(`
        INSERT INTO attendance_configs (id, standard_work_hours, hourly_overtime_rate)
        VALUES ('default', $1, $2)
        ON CONFLICT (id) DO UPDATE 
        SET standard_work_hours = $1, hourly_overtime_rate = $2
      `, [config.standardWorkHours, config.hourlyOvertimeRate]);
      return config;
    } catch (e) {
      console.error('Error saving config to DB:', e);
    }
  }

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  return config;
}

// Attendance operations
async function getRecords(month) {
  if (pool) {
    try {
      let query = 'SELECT * FROM attendances';
      const params = [];
      if (month) {
        query += ' WHERE date LIKE $1';
        params.push(`${month}%`);
      }
      query += ' ORDER BY date DESC, created_at DESC';
      const res = await pool.query(query, params);
      return res.rows.map(r => ({
        id: r.id,
        date: r.date,
        clockIn: r.clock_in,
        clockOut: r.clock_out,
        targetClockOut: r.target_clock_out,
        totalWorkMinutes: r.total_work_minutes,
        overtimeMinutes: r.overtime_minutes,
        overtimePay: r.overtime_pay,
        status: r.status,
        notes: r.notes || '',
        createdAt: r.created_at,
        updatedAt: r.updated_at
      }));
    } catch (e) {
      console.error('Error getting records from DB:', e);
    }
  }

  // Fallback to local file
  let records = [];
  try {
    if (fs.existsSync(DATA_FILE)) {
      records = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (e) {}

  if (month) {
    return records.filter(r => r.date.startsWith(month));
  }
  return records;
}

async function saveRecord(record) {
  if (pool) {
    try {
      await pool.query(`
        INSERT INTO attendances (
          id, date, clock_in, clock_out, target_clock_out,
          total_work_minutes, overtime_minutes, overtime_pay, status, notes, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET
          date = $2,
          clock_in = $3,
          clock_out = $4,
          target_clock_out = $5,
          total_work_minutes = $6,
          overtime_minutes = $7,
          overtime_pay = $8,
          status = $9,
          notes = $10,
          updated_at = CURRENT_TIMESTAMP
      `, [
        record.id,
        record.date,
        record.clockIn,
        record.clockOut || null,
        record.targetClockOut,
        record.totalWorkMinutes || null,
        record.overtimeMinutes || 0,
        record.overtimePay || 0,
        record.status,
        record.notes || ''
      ]);
      return record;
    } catch (e) {
      console.error('Error saving record to DB:', e);
    }
  }

  // Fallback to local file
  let records = [];
  try {
    if (fs.existsSync(DATA_FILE)) {
      records = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (e) {}

  const idx = records.findIndex(r => r.id === record.id);
  if (idx >= 0) {
    records[idx] = { ...records[idx], ...record };
  } else {
    records.unshift(record);
  }
  records.sort((a, b) => b.date.localeCompare(a.date));
  fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2), 'utf-8');
  return record;
}

async function deleteRecord(id) {
  if (pool) {
    try {
      await pool.query('DELETE FROM attendances WHERE id = $1', [id]);
      return true;
    } catch (e) {
      console.error('Error deleting record from DB:', e);
    }
  }

  // Fallback to local file
  let records = [];
  try {
    if (fs.existsSync(DATA_FILE)) {
      records = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (e) {}

  records = records.filter(r => r.id !== id);
  fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2), 'utf-8');
  return true;
}

module.exports = {
  initDB,
  getConfig,
  saveConfig,
  getRecords,
  saveRecord,
  deleteRecord
};

