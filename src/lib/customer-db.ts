import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database | null = null;

function getDb() {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'data', 'portal.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export function initializeDatabase() {
  const database = getDb();
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      name TEXT,
      password TEXT,
      phone TEXT,
      dob TEXT,
      profile_image TEXT,
      loyalty_tier TEXT DEFAULT 'Silver',
      loyalty_points INTEGER DEFAULT 0,
      referral_code TEXT UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      doctor_name TEXT,
      doctor_image TEXT,
      session_date TEXT,
      session_time TEXT,
      status TEXT DEFAULT 'upcoming',
      notes TEXT,
      treatment_type TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS prescriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      medication_name TEXT,
      dosage TEXT,
      frequency TEXT,
      duration TEXT,
      start_date TEXT,
      end_date TEXT,
      doctor_name TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS before_after_images (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      before_image TEXT,
      after_image TEXT,
      treatment_type TEXT,
      date_taken TEXT,
      session_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      reminder_type TEXT,
      title TEXT,
      message TEXT,
      reminder_date TEXT,
      reminder_time TEXT,
      is_read BOOLEAN DEFAULT 0,
      related_prescription_id TEXT,
      related_session_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(related_prescription_id) REFERENCES prescriptions(id),
      FOREIGN KEY(related_session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS loyalty_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      points INTEGER,
      transaction_type TEXT,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS referral_discounts (
      id TEXT PRIMARY KEY,
      referrer_id TEXT NOT NULL,
      referred_user_id TEXT,
      discount_code TEXT UNIQUE,
      discount_percentage REAL,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(referrer_id) REFERENCES users(id),
      FOREIGN KEY(referred_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS consultations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      doctor_name TEXT,
      consultation_date TEXT,
      consultation_type TEXT,
      notes TEXT,
      diagnosis TEXT,
      treatment_plan TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS products_services (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      product_name TEXT,
      category TEXT,
      quantity INTEGER,
      price REAL,
      purchase_date TEXT,
      status TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS medicine_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      prescription_id TEXT,
      log_date TEXT,
      log_time TEXT,
      taken BOOLEAN,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(prescription_id) REFERENCES prescriptions(id)
    );

    CREATE TABLE IF NOT EXISTS blogs (
      id TEXT PRIMARY KEY,
      title TEXT,
      content TEXT,
      author TEXT,
      image TEXT,
      published_date TEXT,
      category TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      title TEXT,
      description TEXT,
      video_url TEXT,
      thumbnail TEXT,
      category TEXT,
      published_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS guest_bookings (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      doctor_name TEXT,
      session_date TEXT,
      session_time TEXT,
      treatment_type TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export { getDb };
export default { initializeDatabase, getDb };
