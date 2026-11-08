try {
  require('dotenv').config();
} catch (e) {
  // dotenv optional fallback
}
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'attendance.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

const DEFAULT_USER_CONFIG = {
  standardWorkHours: 9,
  hourlyOvertimeRate: 25000
};

// Check PostgreSQL connection: either connection string or individual env vars
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
let pool = null;

if (connectionString) {
  pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
  });
} else if (process.env.PGDATABASE || process.env.DB_NAME) {
  pool = new Pool({
    user: process.env.PGUSER || process.env.DB_USER || 'postgres',
    password: process.env.PGPASSWORD || process.env.DB_PASSWORD || '',
    host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
    port: Number(process.env.PGPORT || process.env.DB_PORT || 5432),
    database: process.env.PGDATABASE || process.env.DB_NAME || 'absensi_akiri',
    ssl: false
  });
}

// Ensure local directory exists for JSON fallback
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize tables if connected to PostgreSQL
async function initDB() {
  if (!pool) return;
  try {
    // Test connection first
    await pool.query('SELECT 1');

    // 1. Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        username VARCHAR(64) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name VARCHAR(128) NOT NULL,
        role VARCHAR(64) NOT NULL DEFAULT 'Karyawan',
        standard_work_hours NUMERIC DEFAULT 9,
        hourly_overtime_rate NUMERIC DEFAULT 25000,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Create attendances table with user_id
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendances (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(64),
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

    // 3. Add user_id column if table already existed without it
    await pool.query(`
      ALTER TABLE attendances ADD COLUMN IF NOT EXISTS user_id VARCHAR(64);
    `);

    console.log('✅ Terhubung ke database PostgreSQL: absensi_akiri');
  } catch (err) {
    console.warn(`⚠️ PostgreSQL belum siap (${err.message}). Beralih otomatis ke mode offline (Local JSON).`);
    pool = null;
  }
}

// ==================== USER OPERATIONS ====================

// Local file helper
function getLocalUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    }
  } catch (e) {}
  return [];
}

function saveLocalUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

async function findUserByUsername(username) {
  const cleanUsername = username.toLowerCase().trim();
  if (pool) {
    try {
      const res = await pool.query('SELECT * FROM users WHERE LOWER(username) = $1', [cleanUsername]);
      if (res.rows.length > 0) {
        const u = res.rows[0];
        return {
          id: u.id,
          username: u.username,
          passwordHash: u.password_hash,
          fullName: u.full_name,
          role: u.role,
          standardWorkHours: Number(u.standard_work_hours) || 9,
          hourlyOvertimeRate: Number(u.hourly_overtime_rate) || 25000,
          createdAt: u.created_at
        };
      }
      return null;
    } catch (e) {
      console.error('Error finding user by username in DB:', e.message);
    }
  }

  // Fallback local
  const users = getLocalUsers();
  return users.find(u => u.username.toLowerCase() === cleanUsername) || null;
}

async function findUserById(id) {
  if (pool) {
    try {
      const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      if (res.rows.length > 0) {
        const u = res.rows[0];
        return {
          id: u.id,
          username: u.username,
          passwordHash: u.password_hash,
          fullName: u.full_name,
          role: u.role,
          standardWorkHours: Number(u.standard_work_hours) || 9,
          hourlyOvertimeRate: Number(u.hourly_overtime_rate) || 25000,
          createdAt: u.created_at
        };
      }
      return null;
    } catch (e) {
      console.error('Error finding user by ID in DB:', e.message);
    }
  }

  // Fallback local
  const users = getLocalUsers();
  return users.find(u => u.id === id) || null;
}

async function createUser(user) {
  const newUser = {
    id: user.id || 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    username: user.username.toLowerCase().trim(),
    passwordHash: user.passwordHash,
    fullName: user.fullName || user.username,
    role: user.role || 'Karyawan',
    standardWorkHours: Number(user.standardWorkHours) || 9,
    hourlyOvertimeRate: Number(user.hourlyOvertimeRate) || 25000,
    createdAt: new Date().toISOString()
  };

  if (pool) {
    try {
      await pool.query(`
        INSERT INTO users (id, username, password_hash, full_name, role, standard_work_hours, hourly_overtime_rate)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        newUser.id,
        newUser.username,
        newUser.passwordHash,
        newUser.fullName,
        newUser.role,
        newUser.standardWorkHours,
        newUser.hourlyOvertimeRate
      ]);

      // If there are legacy test records without user_id, associate them with the first registered user
      await pool.query(`
        UPDATE attendances SET user_id = $1 WHERE user_id IS NULL
      `, [newUser.id]);

      return newUser;
    } catch (e) {
      console.error('Error creating user in DB:', e.message);
      throw e;
    }
  }

  // Fallback local
  const users = getLocalUsers();
  users.push(newUser);
  saveLocalUsers(users);

  // If local records have no userId, associate them with this first user
  const records = getLocalRecords();
  let updated = false;
  records.forEach(r => {
    if (!r.userId) {
      r.userId = newUser.id;
      updated = true;
    }
  });
  if (updated) saveLocalRecords(records);

  return newUser;
}

async function updateUserProfile(id, updates) {
  if (pool) {
    try {
      const res = await pool.query(`
        UPDATE users
        SET full_name = COALESCE($2, full_name),
            role = COALESCE($3, role),
            standard_work_hours = COALESCE($4, standard_work_hours),
            hourly_overtime_rate = COALESCE($5, hourly_overtime_rate),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [
        id,
        updates.fullName,
        updates.role,
        updates.standardWorkHours,
        updates.hourlyOvertimeRate
      ]);
      if (res.rows.length > 0) {
        const u = res.rows[0];
        return {
          id: u.id,
          username: u.username,
          fullName: u.full_name,
          role: u.role,
          standardWorkHours: Number(u.standard_work_hours) || 9,
          hourlyOvertimeRate: Number(u.hourly_overtime_rate) || 25000
        };
      }
    } catch (e) {
      console.error('Error updating user in DB:', e.message);
    }
  }

  // Fallback local
  const users = getLocalUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx >= 0) {
    users[idx] = {
      ...users[idx],
      fullName: updates.fullName !== undefined ? updates.fullName : users[idx].fullName,
      role: updates.role !== undefined ? updates.role : users[idx].role,
      standardWorkHours: updates.standardWorkHours !== undefined ? Number(updates.standardWorkHours) : users[idx].standardWorkHours,
      hourlyOvertimeRate: updates.hourlyOvertimeRate !== undefined ? Number(updates.hourlyOvertimeRate) : users[idx].hourlyOvertimeRate
    };
    saveLocalUsers(users);
    return users[idx];
  }
  return null;
}

// ==================== ATTENDANCE OPERATIONS (SCOPED BY USER) ====================

// Local file helper
function getLocalRecords() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (e) {}
  return [];
}

function saveLocalRecords(records) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2), 'utf-8');
}

async function getRecords(userId, month) {
  if (pool) {
    try {
      let query = 'SELECT * FROM attendances WHERE user_id = $1';
      const params = [userId];
      if (month) {
        query += ' AND date LIKE $2';
        params.push(`${month}%`);
      }
      query += ' ORDER BY date DESC, created_at DESC';
      const res = await pool.query(query, params);
      return res.rows.map(r => ({
        id: r.id,
        userId: r.user_id,
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
      console.error('Error getting records from DB:', e.message);
    }
  }

  // Fallback local file (filter by userId)
  const records = getLocalRecords();
  return records.filter(r => {
    const matchesUser = r.userId === userId;
    const matchesMonth = month ? r.date.startsWith(month) : true;
    return matchesUser && matchesMonth;
  });
}

async function saveRecord(record) {
  if (pool) {
    try {
      await pool.query(`
        INSERT INTO attendances (
          id, user_id, date, clock_in, clock_out, target_clock_out,
          total_work_minutes, overtime_minutes, overtime_pay, status, notes, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET
          user_id = $2,
          date = $3,
          clock_in = $4,
          clock_out = $5,
          target_clock_out = $6,
          total_work_minutes = $7,
          overtime_minutes = $8,
          overtime_pay = $9,
          status = $10,
          notes = $11,
          updated_at = CURRENT_TIMESTAMP
      `, [
        record.id,
        record.userId,
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
      console.error('Error saving record to DB:', e.message);
    }
  }

  // Fallback to local file
  const records = getLocalRecords();
  const idx = records.findIndex(r => r.id === record.id);
  if (idx >= 0) {
    records[idx] = { ...records[idx], ...record };
  } else {
    records.unshift(record);
  }
  records.sort((a, b) => b.date.localeCompare(a.date));
  saveLocalRecords(records);
  return record;
}

async function deleteRecord(id, userId) {
  if (pool) {
    try {
      await pool.query('DELETE FROM attendances WHERE id = $1 AND user_id = $2', [id, userId]);
      return true;
    } catch (e) {
      console.error('Error deleting record from DB:', e.message);
    }
  }

  // Fallback local file
  let records = getLocalRecords();
  records = records.filter(r => !(r.id === id && r.userId === userId));
  saveLocalRecords(records);
  return true;
}

module.exports = {
  initDB,
  findUserByUsername,
  findUserById,
  createUser,
  updateUserProfile,
  getRecords,
  saveRecord,
  deleteRecord,
  DEFAULT_USER_CONFIG
};
