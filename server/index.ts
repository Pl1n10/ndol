import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { db, initializeDatabase } from './db/index.js';
import * as schema from './db/schema.js';
import { eq, lte, and } from 'drizzle-orm';
import { sendReminderEmail, testEmailConnection } from './email.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ============ CATEGORIES API ============

// Get tutte le categorie
app.get('/api/categories', (req, res) => {
  try {
    const categories = db.select().from(schema.categories).all();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Errore nel recupero categorie' });
  }
});

// Crea categoria custom
app.post('/api/categories', (req, res) => {
  try {
    const { name, icon, color } = req.body;
    const id = `custom_${Date.now()}`;
    
    db.insert(schema.categories).values({
      id,
      name,
      icon: icon || '📦',
      color: color || '#6B7280',
      isCustom: true,
      createdAt: new Date(),
    }).run();

    const category = db.select().from(schema.categories).where(eq(schema.categories.id, id)).get();
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Errore nella creazione categoria' });
  }
});

// Elimina categoria custom
app.delete('/api/categories/:id', (req, res) => {
  try {
    const { id } = req.params;
    const category = db.select().from(schema.categories).where(eq(schema.categories.id, id)).get();
    
    if (!category) {
      return res.status(404).json({ error: 'Categoria non trovata' });
    }
    
    if (!category.isCustom) {
      return res.status(400).json({ error: 'Non puoi eliminare categorie predefinite' });
    }
    
    db.delete(schema.categories).where(eq(schema.categories.id, id)).run();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Errore eliminazione categoria' });
  }
});

// ============ SUBSCRIPTIONS API ============

// Get tutte le subscription
app.get('/api/subscriptions', (req, res) => {
  try {
    const subscriptions = db.select().from(schema.subscriptions).all();
    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ error: 'Errore nel recupero subscription' });
  }
});

// Get singola subscription
app.get('/api/subscriptions/:id', (req, res) => {
  try {
    const subscription = db.select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.id, req.params.id))
      .get();
    
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription non trovata' });
    }
    
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: 'Errore nel recupero subscription' });
  }
});

// Crea subscription
app.post('/api/subscriptions', (req, res) => {
  try {
    const data = req.body;
    const id = crypto.randomUUID();
    
    db.insert(schema.subscriptions).values({
      id,
      name: data.name,
      description: data.description,
      categoryId: data.categoryId,
      amount: data.amount,
      currency: data.currency || 'EUR',
      billingCycle: data.billingCycle,
      startDate: new Date(data.startDate),
      nextRenewal: new Date(data.nextRenewal),
      endDate: data.endDate ? new Date(data.endDate) : null,
      reminderDaysBefore: data.reminderDaysBefore || 7,
      reminderSent: false,
      provider: data.provider,
      website: data.website,
      notes: data.notes,
      status: data.status || 'active',
      autoRenew: data.autoRenew ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).run();

    const subscription = db.select().from(schema.subscriptions).where(eq(schema.subscriptions.id, id)).get();
    res.json(subscription);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Errore nella creazione subscription' });
  }
});

// Aggiorna subscription
app.put('/api/subscriptions/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    db.update(schema.subscriptions)
      .set({
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        amount: data.amount,
        currency: data.currency,
        billingCycle: data.billingCycle,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        nextRenewal: data.nextRenewal ? new Date(data.nextRenewal) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : null,
        reminderDaysBefore: data.reminderDaysBefore,
        provider: data.provider,
        website: data.website,
        notes: data.notes,
        status: data.status,
        autoRenew: data.autoRenew,
        updatedAt: new Date(),
      })
      .where(eq(schema.subscriptions.id, id))
      .run();

    const subscription = db.select().from(schema.subscriptions).where(eq(schema.subscriptions.id, id)).get();
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: 'Errore aggiornamento subscription' });
  }
});

// Elimina subscription
app.delete('/api/subscriptions/:id', (req, res) => {
  try {
    db.delete(schema.subscriptions).where(eq(schema.subscriptions.id, req.params.id)).run();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Errore eliminazione subscription' });
  }
});

// ============ SETTINGS API ============

app.get('/api/settings', (req, res) => {
  try {
    const settings = db.select().from(schema.settings).all();
    const settingsObj = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
    res.json(settingsObj);
  } catch (error) {
    res.status(500).json({ error: 'Errore nel recupero impostazioni' });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const settings = req.body;
    
    for (const [key, value] of Object.entries(settings)) {
      db.insert(schema.settings)
        .values({ key, value: String(value) })
        .onConflictDoUpdate({
          target: schema.settings.key,
          set: { value: String(value) }
        })
        .run();
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Errore salvataggio impostazioni' });
  }
});

// Test connessione email
app.post('/api/settings/test-email', async (req, res) => {
  try {
    const result = await testEmailConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ============ ALTERNATIVES API ============

app.get('/api/subscriptions/:id/alternatives', (req, res) => {
  try {
    const alternatives = db.select()
      .from(schema.alternatives)
      .where(eq(schema.alternatives.subscriptionId, req.params.id))
      .all();
    res.json(alternatives);
  } catch (error) {
    res.status(500).json({ error: 'Errore nel recupero alternative' });
  }
});

app.post('/api/subscriptions/:id/alternatives', (req, res) => {
  try {
    const { id: subscriptionId } = req.params;
    const data = req.body;
    const id = crypto.randomUUID();
    
    db.insert(schema.alternatives).values({
      id,
      subscriptionId,
      name: data.name,
      provider: data.provider,
      amount: data.amount,
      website: data.website,
      notes: data.notes,
      createdAt: new Date(),
    }).run();

    const alternative = db.select().from(schema.alternatives).where(eq(schema.alternatives.id, id)).get();
    res.json(alternative);
  } catch (error) {
    res.status(500).json({ error: 'Errore creazione alternativa' });
  }
});

app.delete('/api/alternatives/:id', (req, res) => {
  try {
    db.delete(schema.alternatives).where(eq(schema.alternatives.id, req.params.id)).run();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Errore eliminazione alternativa' });
  }
});

// ============ STATS API ============

app.get('/api/stats', (req, res) => {
  try {
    const subscriptions = db.select().from(schema.subscriptions).all();
    const active = subscriptions.filter(s => s.status === 'active');
    
    // Calcola spesa mensile totale
    let monthlyTotal = 0;
    for (const sub of active) {
      switch (sub.billingCycle) {
        case 'weekly': monthlyTotal += sub.amount * 4; break;
        case 'monthly': monthlyTotal += sub.amount; break;
        case 'quarterly': monthlyTotal += sub.amount / 3; break;
        case 'yearly': monthlyTotal += sub.amount / 12; break;
      }
    }
    
    // Subscription in scadenza nei prossimi 7 giorni
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const expiringSoon = active.filter(s => 
      s.nextRenewal && new Date(s.nextRenewal) <= weekFromNow
    );

    res.json({
      totalActive: active.length,
      totalMonthly: Math.round(monthlyTotal * 100) / 100,
      totalYearly: Math.round(monthlyTotal * 12 * 100) / 100,
      expiringSoon: expiringSoon.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Errore calcolo statistiche' });
  }
});

// ============ REMINDER CRON JOB ============

async function checkAndSendReminders() {
  console.log('🔔 Controllo reminder...');
  
  const settings = db.select().from(schema.settings).all();
  const settingsObj = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {} as Record<string, string>);
  
  if (!settingsObj.emailTo || !settingsObj.smtpHost) {
    console.log('⚠️ Email non configurata, skip reminder');
    return;
  }
  
  const subscriptions = db.select()
    .from(schema.subscriptions)
    .where(
      and(
        eq(schema.subscriptions.status, 'active'),
        eq(schema.subscriptions.reminderSent, false)
      )
    )
    .all();
  
  const now = new Date();
  
  for (const sub of subscriptions) {
    if (!sub.nextRenewal || !sub.reminderDaysBefore) continue;
    
    const reminderDate = new Date(sub.nextRenewal);
    reminderDate.setDate(reminderDate.getDate() - sub.reminderDaysBefore);
    
    if (now >= reminderDate) {
      console.log(`📧 Invio reminder per: ${sub.name}`);
      
      try {
        await sendReminderEmail(sub, settingsObj);
        
        db.update(schema.subscriptions)
          .set({ reminderSent: true })
          .where(eq(schema.subscriptions.id, sub.id))
          .run();
          
        console.log(`✅ Reminder inviato per: ${sub.name}`);
      } catch (error) {
        console.error(`❌ Errore invio reminder per ${sub.name}:`, error);
      }
    }
  }
}

// Reset reminderSent dopo il rinnovo (controlla ogni giorno)
async function resetExpiredReminders() {
  const now = new Date();
  const subscriptions = db.select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.reminderSent, true))
    .all();
  
  for (const sub of subscriptions) {
    if (sub.nextRenewal && new Date(sub.nextRenewal) < now) {
      // Calcola prossimo rinnovo
      const nextRenewal = new Date(sub.nextRenewal);
      switch (sub.billingCycle) {
        case 'weekly': nextRenewal.setDate(nextRenewal.getDate() + 7); break;
        case 'monthly': nextRenewal.setMonth(nextRenewal.getMonth() + 1); break;
        case 'quarterly': nextRenewal.setMonth(nextRenewal.getMonth() + 3); break;
        case 'yearly': nextRenewal.setFullYear(nextRenewal.getFullYear() + 1); break;
      }
      
      db.update(schema.subscriptions)
        .set({ 
          nextRenewal: nextRenewal,
          reminderSent: false 
        })
        .where(eq(schema.subscriptions.id, sub.id))
        .run();
    }
  }
}

// ============ START SERVER ============

async function start() {
  await initializeDatabase();
  
  // Cron job: controlla reminder ogni ora
  cron.schedule('0 * * * *', () => {
    checkAndSendReminders();
    resetExpiredReminders();
  });
  
  // Esegui subito al primo avvio
  checkAndSendReminders();
  resetExpiredReminders();
  
  app.listen(PORT, () => {
    console.log(`🚀 ndol server running on http://localhost:${PORT}`);
  });
}

start().catch(console.error);
