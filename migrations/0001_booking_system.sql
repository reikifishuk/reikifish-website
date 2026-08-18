PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  service_key TEXT NOT NULL,
  service_name TEXT NOT NULL,
  duration INTEGER NOT NULL,
  amount TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  start_utc TEXT NOT NULL,
  end_utc TEXT NOT NULL,
  status TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  customer_notes TEXT,
  paypal_order_id TEXT UNIQUE,
  capture_id TEXT,
  confirmation_sent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  expires_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_bookings_start ON bookings(start_utc);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE TABLE IF NOT EXISTS slot_locks (
  lock_key TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_slot_locks_booking ON slot_locks(booking_id);
CREATE TABLE IF NOT EXISTS unavailable (
  date TEXT PRIMARY KEY,
  reason TEXT,
  created_at TEXT NOT NULL
);
