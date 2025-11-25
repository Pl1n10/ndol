import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { db, initializeDatabase } from './db/index.js';
import * as schema from './db/schema.js';
import { eq, lte, and } from 'drizzle-orm';
import { sendReminderEmail, testEmailConnection, sendVerificationEmail, sendPasswordResetEmail } from './email.js';
import { authMiddleware, createUser, authenticateUser, verifyEmail, resendVerificationEmail, requestPasswordReset, verifyResetToken, resetPassword, type AuthRequest } from './auth.js';

const app = express();
const PORT = process.env.PORT || 3001;
const BASE_URL = process.env.BASE_URL || `http://localhost:5173`;

app.use(cors());
app.use(express.json());

// ============ AUTH API ============

// Registrazione
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password sono obbligatori' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'La password deve essere almeno 6 caratteri' });
    }

    const user = await createUser(email, password, name);
    
    // Invia email di verifica
    const emailResult = await sendVerificationEmail(user.email, user.verificationToken!, BASE_URL);
    
    if (!emailResult.success) {
      console.error('Errore invio email verifica:', emailResult.error);
      // L'utente è stato creato ma l'email non è partita
      // Può usare resend-verification
    }
    
    res.json({ 
      success: true, 
      message: 'Registrazione completata! Controlla la tua email per verificare l\'account.',
      emailSent: emailResult.success,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Errore nella registrazione' });
  }
});

// Verifica email
app.get('/api/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token mancante' });
    }

    const result = await verifyEmail(token);
    res.json({ success: true, message: 'Email verificata con successo!' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Errore nella verifica' });
  }
});

// Reinvia email di verifica
app.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email obbligatoria' });
    }

    const result = await resendVerificationEmail(email);
    const emailResult = await sendVerificationEmail(result.email, result.verificationToken, BASE_URL);
    
    if (!emailResult.success) {
      return res.status(500).json({ error: 'Errore invio email. Riprova più tardi.' });
    }
    
    res.json({ success: true, message: 'Email di verifica inviata!' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Errore' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password sono obbligatori' });
    }

    const result = await authenticateUser(email, password);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Credenziali non valide' });
  }
});

// Verifica token / Get utente corrente
app.get('/api/auth/me', authMiddleware, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

// Richiedi reset password
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email obbligatoria' });
    }

    const result = await requestPasswordReset(email);
    
    // Invia email solo se l'utente esiste
    if (result.hasUser && result.resetToken) {
      const emailResult = await sendPasswordResetEmail(result.email!, result.resetToken, BASE_URL);
      
      if (!emailResult.success) {
        console.error('Errore invio email reset:', emailResult.error);
      }
    }
    
    // Rispondi sempre con successo per non rivelare se l'email esiste
    res.json({ 
      success: true, 
      message: 'Se l\'email è registrata, riceverai un link per reimpostare la password.' 
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Errore' });
  }
});

// Verifica token reset (per mostrare il form)
app.get('/api/auth/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token mancante' });
    }

    const result = await verifyResetToken(token);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Token non valido' });
  }
});

// Esegui reset password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ error: 'Token e password sono obbligatori' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'La password deve essere almeno 6 caratteri' });
    }

    await resetPassword(token, password);
    res.json({ success: true, message: 'Password reimpostata con successo!' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Errore nel reset password' });
  }
});

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

// Get tutte le subscription dell'utente
app.get('/api/subscriptions', authMiddleware, (req: AuthRequest, res) => {
  try {
    const subscriptions = db.select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.userId, req.user!.id))
      .all();
    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ error: 'Errore nel recupero subscription' });
  }
});

// Get singola subscription
app.get('/api/subscriptions/:id', authMiddleware, (req: AuthRequest, res) => {
  try {
    const subscription = db.select()
      .from(schema.subscriptions)
      .where(
        and(
          eq(schema.subscriptions.id, req.params.id),
          eq(schema.subscriptions.userId, req.user!.id)
        )
      )
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
app.post('/api/subscriptions', authMiddleware, (req: AuthRequest, res) => {
  try {
    const data = req.body;
    const id = crypto.randomUUID();
    
    db.insert(schema.subscriptions).values({
      id,
      userId: req.user!.id,
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
app.put('/api/subscriptions/:id', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    // Verifica che la subscription appartenga all'utente
    const existing = db.select()
      .from(schema.subscriptions)
      .where(and(
        eq(schema.subscriptions.id, id),
        eq(schema.subscriptions.userId, req.user!.id)
      ))
      .get();
    
    if (!existing) {
      return res.status(404).json({ error: 'Subscription non trovata' });
    }
    
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
app.delete('/api/subscriptions/:id', authMiddleware, (req: AuthRequest, res) => {
  try {
    // Verifica che la subscription appartenga all'utente
    const existing = db.select()
      .from(schema.subscriptions)
      .where(and(
        eq(schema.subscriptions.id, req.params.id),
        eq(schema.subscriptions.userId, req.user!.id)
      ))
      .get();
    
    if (!existing) {
      return res.status(404).json({ error: 'Subscription non trovata' });
    }
    
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

app.get('/api/subscriptions/:id/alternatives', authMiddleware, (req: AuthRequest, res) => {
  try {
    // Verifica che la subscription appartenga all'utente
    const subscription = db.select()
      .from(schema.subscriptions)
      .where(and(
        eq(schema.subscriptions.id, req.params.id),
        eq(schema.subscriptions.userId, req.user!.id)
      ))
      .get();
    
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription non trovata' });
    }
    
    const alternatives = db.select()
      .from(schema.alternatives)
      .where(eq(schema.alternatives.subscriptionId, req.params.id))
      .all();
    res.json(alternatives);
  } catch (error) {
    res.status(500).json({ error: 'Errore nel recupero alternative' });
  }
});

app.post('/api/subscriptions/:id/alternatives', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { id: subscriptionId } = req.params;
    
    // Verifica che la subscription appartenga all'utente
    const subscription = db.select()
      .from(schema.subscriptions)
      .where(and(
        eq(schema.subscriptions.id, subscriptionId),
        eq(schema.subscriptions.userId, req.user!.id)
      ))
      .get();
    
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription non trovata' });
    }
    
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

app.delete('/api/alternatives/:id', authMiddleware, (req: AuthRequest, res) => {
  try {
    // Verifica che l'alternativa appartenga a una subscription dell'utente
    const alternative = db.select()
      .from(schema.alternatives)
      .where(eq(schema.alternatives.id, req.params.id))
      .get();
    
    if (alternative) {
      const subscription = db.select()
        .from(schema.subscriptions)
        .where(and(
          eq(schema.subscriptions.id, alternative.subscriptionId!),
          eq(schema.subscriptions.userId, req.user!.id)
        ))
        .get();
      
      if (!subscription) {
        return res.status(404).json({ error: 'Non autorizzato' });
      }
    }
    
    db.delete(schema.alternatives).where(eq(schema.alternatives.id, req.params.id)).run();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Errore eliminazione alternativa' });
  }
});

// ============ STATS API ============

app.get('/api/stats', authMiddleware, (req: AuthRequest, res) => {
  try {
    const subscriptions = db.select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.userId, req.user!.id))
      .all();
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
