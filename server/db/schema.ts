import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// Tabella utenti
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  verificationToken: text('verification_token'),
  verificationExpires: integer('verification_expires', { mode: 'timestamp' }),
  resetToken: text('reset_token'),
  resetExpires: integer('reset_expires', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Categorie predefinite
export const DEFAULT_CATEGORIES = [
  { id: 'streaming', name: 'Streaming', icon: '📺', color: '#E50914' },
  { id: 'music', name: 'Musica', icon: '🎵', color: '#1DB954' },
  { id: 'software', name: 'Software', icon: '💻', color: '#0078D4' },
  { id: 'gaming', name: 'Gaming', icon: '🎮', color: '#107C10' },
  { id: 'cloud', name: 'Cloud Storage', icon: '☁️', color: '#4285F4' },
  { id: 'news', name: 'News & Media', icon: '📰', color: '#1A1A1A' },
  { id: 'fitness', name: 'Fitness', icon: '💪', color: '#FF6B35' },
  { id: 'mobile', name: 'Telefonia', icon: '📱', color: '#FF6600' },
  { id: 'electricity', name: 'Energia Elettrica', icon: '⚡', color: '#FFD700' },
  { id: 'gas', name: 'Gas', icon: '🔥', color: '#FF4500' },
  { id: 'water', name: 'Acqua', icon: '💧', color: '#00BFFF' },
  { id: 'internet', name: 'Internet', icon: '🌐', color: '#6366F1' },
  { id: 'insurance', name: 'Assicurazioni', icon: '🛡️', color: '#2E7D32' },
  { id: 'finance', name: 'Servizi Finanziari', icon: '🏦', color: '#1565C0' },
  { id: 'other', name: 'Altro', icon: '📦', color: '#6B7280' },
] as const;

// Tabella categorie (include predefinite + custom)
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  isCustom: integer('is_custom', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Tabella subscription
export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  description: text('description'),
  categoryId: text('category_id').references(() => categories.id),
  
  // Costi
  amount: real('amount').notNull(),
  currency: text('currency').default('EUR'),
  billingCycle: text('billing_cycle').notNull(), // monthly, yearly, quarterly, weekly
  
  // Date
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  nextRenewal: integer('next_renewal', { mode: 'timestamp' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp' }), // se c'è una scadenza fissa
  
  // Reminder
  reminderDaysBefore: integer('reminder_days_before').default(7),
  reminderSent: integer('reminder_sent', { mode: 'boolean' }).default(false),
  
  // Info provider
  provider: text('provider'), // es. "Netflix", "Vodafone"
  website: text('website'),
  notes: text('notes'),
  
  // Status
  status: text('status').default('active'), // active, paused, cancelled
  autoRenew: integer('auto_renew', { mode: 'boolean' }).default(true),
  
  // Metadata
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Tabella impostazioni
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

// Tabella per le alternative suggerite (opzionale, semplice)
export const alternatives = sqliteTable('alternatives', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  subscriptionId: text('subscription_id').references(() => subscriptions.id),
  name: text('name').notNull(),
  provider: text('provider').notNull(),
  amount: real('amount').notNull(),
  website: text('website'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Types per TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type Alternative = typeof alternatives.$inferSelect;
