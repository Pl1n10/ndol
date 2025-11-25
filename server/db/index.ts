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
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT,
      email_verified INTEGER DEFAULT 0,
      verification_token TEXT,
      verification_expires INTEGER,
      reset_token TEXT,
      reset_expires INTEGER,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      is_custom INTEGER DEFAULT 0,
      created_at INTEGER
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

  // Gestione migrazione: verifica se la tabella subscriptions ha user_id
  const tableInfo = sqlite.prepare("PRAGMA table_info(subscriptions)").all() as any[];
  const hasUserId = tableInfo.some((col: any) => col.name === 'user_id');

  if (!hasUserId) {
    console.log('📦 Migrazione database: aggiunta colonna user_id...');
    
    // Crea nuova tabella con user_id
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS subscriptions_new (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
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
    `);
    
    // Se esiste la vecchia tabella, elimina i dati (senza utente non sono recuperabili)
    try {
      const oldSubs = sqlite.prepare("SELECT COUNT(*) as count FROM subscriptions").get() as any;
      if (oldSubs?.count > 0) {
        console.log('⚠️ Eliminazione vecchie subscriptions senza utente associato...');
      }
      sqlite.exec('DROP TABLE IF EXISTS subscriptions');
    } catch {
      // Tabella non esiste, ok
    }
    
    sqlite.exec('ALTER TABLE subscriptions_new RENAME TO subscriptions');
    console.log('✅ Migrazione completata');
  } else {
    // Tabella già con user_id, crea solo se non esiste
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
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
    `);
  }

  // Migrazione: aggiungi campi verifica email se non esistono
  const usersTableInfo = sqlite.prepare("PRAGMA table_info(users)").all() as any[];
  const hasEmailVerified = usersTableInfo.some((col: any) => col.name === 'email_verified');
  
  if (!hasEmailVerified) {
    console.log('📦 Migrazione: aggiunta campi verifica email...');
    sqlite.exec(`
      ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;
      ALTER TABLE users ADD COLUMN verification_token TEXT;
      ALTER TABLE users ADD COLUMN verification_expires INTEGER;
    `);
    // Imposta tutti gli utenti esistenti come verificati (per non bloccarli)
    sqlite.exec(`UPDATE users SET email_verified = 1 WHERE email_verified IS NULL OR email_verified = 0`);
    console.log('✅ Campi verifica email aggiunti');
  }

  // Migrazione: aggiungi campi reset password se non esistono
  const usersTableInfo2 = sqlite.prepare("PRAGMA table_info(users)").all() as any[];
  const hasResetToken = usersTableInfo2.some((col: any) => col.name === 'reset_token');
  
  if (!hasResetToken) {
    console.log('📦 Migrazione: aggiunta campi reset password...');
    sqlite.exec(`
      ALTER TABLE users ADD COLUMN reset_token TEXT;
      ALTER TABLE users ADD COLUMN reset_expires INTEGER;
    `);
    console.log('✅ Campi reset password aggiunti');
  }

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
