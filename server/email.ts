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
