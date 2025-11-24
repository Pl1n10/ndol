import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema.js';
import { DEFAULT_CATEGORIES } from './schema.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Percorso del database
const DATA_DIR = process.env.NDOL_DATA_DIR || path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'ndol.db');

// Crea la cartella data se non esiste
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Inizializza SQLite
const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');

// Inizializza Drizzle
export const db = drizzle(sqlite, { schema });

// Funzione per inizializzare il database
export async function initializeDatabase() {
  console.log('📦 Inizializzazione database...');
  
  // Crea le tabelle se non esistono
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      is_custom INTEGER DEFAULT 0,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category_id TEXT REFERENCES categories(id),
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'EUR',
      billing_cycle TEXT NOT NULL,
      start_date INTEGER NOT NULL,
      next_renewal INTEGER NOT NULL,
      end_date INTEGER,
      reminder_days_before INTEGER DEFAULT 7,
      reminder_sent INTEGER DEFAULT 0,
      provider TEXT,
      website TEXT,
      notes TEXT,
      status TEXT DEFAULT 'active',
      auto_renew INTEGER DEFAULT 1,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alternatives (
      id TEXT PRIMARY KEY,
      subscription_id TEXT REFERENCES subscriptions(id),
      name TEXT NOT NULL,
      provider TEXT NOT NULL,
      amount REAL NOT NULL,
      website TEXT,
      notes TEXT,
      created_at INTEGER
    );
  `);

  // Inserisci categorie predefinite se non esistono
  const existingCategories = db.select().from(schema.categories).all();
  
  if (existingCategories.length === 0) {
    console.log('📁 Inserimento categorie predefinite...');
    for (const cat of DEFAULT_CATEGORIES) {
      db.insert(schema.categories).values({
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        isCustom: false,
        createdAt: new Date(),
      }).run();
    }
  }

  console.log('✅ Database inizializzato');
}

export { sqlite };
