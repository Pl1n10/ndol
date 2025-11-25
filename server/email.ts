import nodemailer from 'nodemailer';
import type { Subscription } from './db/schema.js';

interface EmailSettings {
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  smtpSecure: string;
  emailFrom: string;
  emailTo: string;
}

function createTransporter(settings: EmailSettings) {
  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: parseInt(settings.smtpPort || '587'),
    secure: settings.smtpSecure === 'true',
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPass,
    },
  });
}

export async function sendReminderEmail(subscription: Subscription, settings: EmailSettings) {
  const transporter = createTransporter(settings);
  
  const renewalDate = subscription.nextRenewal 
    ? new Date(subscription.nextRenewal).toLocaleDateString('it-IT', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Non specificata';

  const daysUntilRenewal = subscription.nextRenewal
    ? Math.ceil((new Date(subscription.nextRenewal).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .highlight { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
        .amount { font-size: 32px; font-weight: bold; color: #667eea; }
        .cta { display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 20px; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">⏰ Promemoria Rinnovo</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">ndol - New Deal Or Leave</p>
        </div>
        <div class="content">
          <h2>La tua subscription "${subscription.name}" sta per rinnovarsi!</h2>
          
          <div class="highlight">
            <p><strong>📅 Data rinnovo:</strong> ${renewalDate}</p>
            <p><strong>⏱️ Mancano:</strong> ${daysUntilRenewal} giorni</p>
            <p><strong>💰 Importo:</strong></p>
            <p class="amount">${subscription.amount.toFixed(2)} ${subscription.currency || 'EUR'}</p>
            <p><strong>🔄 Ciclo:</strong> ${getBillingCycleLabel(subscription.billingCycle)}</p>
            ${subscription.provider ? `<p><strong>🏢 Provider:</strong> ${subscription.provider}</p>` : ''}
          </div>
          
          <h3>🤔 Cosa puoi fare:</h3>
          <ul>
            <li><strong>Rinegotiare</strong> - Contatta il provider per un deal migliore</li>
            <li><strong>Confrontare</strong> - Cerca alternative più convenienti</li>
            <li><strong>Cancellare</strong> - Se non ti serve più, disdici prima del rinnovo</li>
            <li><strong>Mantenere</strong> - Se sei soddisfatto, non fare nulla</li>
          </ul>
          
          ${subscription.website ? `<a href="${subscription.website}" class="cta">Vai al sito del provider →</a>` : ''}
          
          ${subscription.notes ? `<p style="margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 6px;"><strong>📝 Note:</strong> ${subscription.notes}</p>` : ''}
        </div>
        <div class="footer">
          <p>Questa email è stata inviata da ndol - il tuo gestore di subscription.</p>
          <p>New Deal Or Leave 💪</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
PROMEMORIA RINNOVO - ndol

La tua subscription "${subscription.name}" sta per rinnovarsi!

📅 Data rinnovo: ${renewalDate}
⏱️ Mancano: ${daysUntilRenewal} giorni
💰 Importo: ${subscription.amount.toFixed(2)} ${subscription.currency || 'EUR'}
🔄 Ciclo: ${getBillingCycleLabel(subscription.billingCycle)}
${subscription.provider ? `🏢 Provider: ${subscription.provider}` : ''}

Cosa puoi fare:
- Rinegotiare: Contatta il provider per un deal migliore
- Confrontare: Cerca alternative più convenienti  
- Cancellare: Se non ti serve più, disdici prima del rinnovo
- Mantenere: Se sei soddisfatto, non fare nulla

${subscription.website ? `Sito provider: ${subscription.website}` : ''}
${subscription.notes ? `Note: ${subscription.notes}` : ''}

--
ndol - New Deal Or Leave
  `;

  await transporter.sendMail({
    from: settings.emailFrom,
    to: settings.emailTo,
    subject: `⏰ Rinnovo in arrivo: ${subscription.name} (${subscription.amount.toFixed(2)} ${subscription.currency || 'EUR'})`,
    text,
    html,
  });
}

export async function testEmailConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = await import('./db/index.js');
    const { settings } = await import('./db/schema.js');
    
    const settingsRows = db.select().from(settings).all();
    const settingsObj = settingsRows.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {} as EmailSettings);
    
    if (!settingsObj.smtpHost) {
      return { success: false, error: 'SMTP non configurato' };
    }
    
    const transporter = createTransporter(settingsObj);
    await transporter.verify();
    
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

function getBillingCycleLabel(cycle: string): string {
  const labels: Record<string, string> = {
    weekly: 'Settimanale',
    monthly: 'Mensile',
    quarterly: 'Trimestrale',
    yearly: 'Annuale',
  };
  return labels[cycle] || cycle;
}

// ============ EMAIL DI VERIFICA ============

export async function sendVerificationEmail(
  email: string, 
  token: string, 
  baseUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = await import('./db/index.js');
    const { settings } = await import('./db/schema.js');
    
    const settingsRows = db.select().from(settings).all();
    const settingsObj = settingsRows.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {} as EmailSettings);
    
    if (!settingsObj.smtpHost) {
      return { success: false, error: 'SMTP non configurato. Contatta l\'amministratore.' };
    }
    
    const transporter = createTransporter(settingsObj);
    const verifyUrl = `${baseUrl}/verify?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; text-align: center; }
          .cta { display: inline-block; background: #667eea; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0; }
          .cta:hover { background: #5a67d8; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
          .link { word-break: break-all; color: #667eea; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">✉️ Verifica la tua email</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">ndol - New Deal Or Leave</p>
          </div>
          <div class="content">
            <h2>Benvenuto su ndol!</h2>
            <p>Clicca il bottone qui sotto per verificare il tuo indirizzo email e attivare il tuo account.</p>
            
            <a href="${verifyUrl}" class="cta">✅ Verifica Email</a>
            
            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
              Se il bottone non funziona, copia e incolla questo link nel browser:
            </p>
            <p class="link">${verifyUrl}</p>
            
            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
              ⏰ Questo link scade tra 24 ore.
            </p>
          </div>
          <div class="footer">
            <p>Se non hai richiesto questa email, puoi ignorarla.</p>
            <p>ndol - New Deal Or Leave 💪</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Verifica la tua email - ndol

Benvenuto su ndol!

Clicca il link qui sotto per verificare il tuo indirizzo email e attivare il tuo account:

${verifyUrl}

Questo link scade tra 24 ore.

Se non hai richiesto questa email, puoi ignorarla.

--
ndol - New Deal Or Leave
    `;

    await transporter.sendMail({
      from: settingsObj.emailFrom,
      to: email,
      subject: '✉️ Verifica la tua email - ndol',
      text,
      html,
    });
    
    return { success: true };
  } catch (error) {
    console.error('Errore invio email verifica:', error);
    return { success: false, error: String(error) };
  }
}

// ============ EMAIL RESET PASSWORD ============

export async function sendPasswordResetEmail(
  email: string, 
  token: string, 
  baseUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = await import('./db/index.js');
    const { settings } = await import('./db/schema.js');
    
    const settingsRows = db.select().from(settings).all();
    const settingsObj = settingsRows.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {} as EmailSettings);
    
    if (!settingsObj.smtpHost) {
      return { success: false, error: 'SMTP non configurato. Contatta l\'amministratore.' };
    }
    
    const transporter = createTransporter(settingsObj);
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; text-align: center; }
          .cta { display: inline-block; background: #667eea; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0; }
          .cta:hover { background: #5a67d8; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
          .link { word-break: break-all; color: #667eea; font-size: 12px; }
          .warning { background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🔐 Reset Password</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">ndol - New Deal Or Leave</p>
          </div>
          <div class="content">
            <h2>Hai richiesto un reset della password</h2>
            <p>Clicca il bottone qui sotto per impostare una nuova password.</p>
            
            <a href="${resetUrl}" class="cta">🔑 Reimposta Password</a>
            
            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
              Se il bottone non funziona, copia e incolla questo link nel browser:
            </p>
            <p class="link">${resetUrl}</p>
            
            <div class="warning">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                ⏰ <strong>Questo link scade tra 1 ora.</strong><br>
                Se non hai richiesto il reset, ignora questa email. La tua password non verrà modificata.
              </p>
            </div>
          </div>
          <div class="footer">
            <p>Questa email è stata inviata perché qualcuno ha richiesto un reset password per questo account.</p>
            <p>ndol - New Deal Or Leave 💪</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Reset Password - ndol

Hai richiesto un reset della password.

Clicca il link qui sotto per impostare una nuova password:

${resetUrl}

Questo link scade tra 1 ora.

Se non hai richiesto il reset, ignora questa email. La tua password non verrà modificata.

--
ndol - New Deal Or Leave
    `;

    await transporter.sendMail({
      from: settingsObj.emailFrom,
      to: email,
      subject: '🔐 Reset Password - ndol',
      text,
      html,
    });
    
    return { success: true };
  } catch (error) {
    console.error('Errore invio email reset password:', error);
    return { success: false, error: String(error) };
  }
}
