# ndol - New Deal Or Leave 💪

> Gestore di subscription open source multi-utente. Tieni traccia delle tue subscription, ricevi promemoria prima delle scadenze, negozia nuovi deal o vai via.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 🎯 Cosa fa

- **Multi-utente**: Registrazione e login con autenticazione JWT
- **Traccia subscription e utenze**: Netflix, Spotify, telefono, luce, gas, assicurazioni...
- **Promemoria automatici**: Ricevi email X giorni prima di ogni rinnovo
- **Statistiche**: Vedi quanto spendi al mese e all'anno
- **Alternative**: Salva opzioni alternative per ogni servizio
- **PWA**: Installabile come app su mobile e desktop
- **Self-hosted**: I tuoi dati restano tuoi

## 🚀 Quick Start

### Prerequisiti

- Node.js >= 18
- npm o yarn

### Installazione

```bash
# Clona il repository
git clone https://github.com/tuousername/ndol.git
cd ndol

# Installa le dipendenze
npm install

# Avvia in development
npm run dev
```

L'app sarà disponibile su:
- Frontend: http://localhost:5173
- API: http://localhost:3001

### Build per produzione

```bash
npm run build
npm start
```

## ⚙️ Configurazione

### Email (SMTP)

Per ricevere i promemoria, configura le impostazioni email nell'app (Impostazioni → Email).

**Gmail:**
1. Attiva la 2FA sul tuo account Google
2. Genera una "App Password" (Account → Sicurezza → Password per le app)
3. Usa questi settings:
   - Host: `smtp.gmail.com`
   - Porta: `587`
   - SSL: No (usa STARTTLS)

**Outlook/Hotmail:**
- Host: `smtp.office365.com`
- Porta: `587`

### Database

Il database SQLite viene creato automaticamente in `./data/ndol.db`.

Per cambiare la posizione, imposta la variabile d'ambiente:

```bash
NDOL_DATA_DIR=/path/to/data npm start
```

### Sicurezza JWT

In produzione, imposta un secret JWT personalizzato:

```bash
JWT_SECRET=il-tuo-secret-molto-lungo-e-sicuro npm start
```

Se non impostato, viene generato un secret casuale ad ogni avvio (gli utenti dovranno riloggarsi).

## 📁 Struttura progetto

```
ndol/
├── server/           # Backend Express
│   ├── db/           # Schema e connessione database
│   ├── email.ts      # Invio email
│   └── index.ts      # Server principale
├── src/              # Frontend React
│   ├── components/   # Componenti riutilizzabili
│   ├── pages/        # Pagine dell'app
│   ├── lib/          # API client e utilities
│   └── types/        # TypeScript types
├── public/           # Assets statici
└── data/             # Database SQLite (generato)
```

## 🛠️ Tech Stack

- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **Backend**: Express.js, better-sqlite3, Drizzle ORM
- **Email**: Nodemailer
- **PWA**: vite-plugin-pwa

## 📱 Categorie predefinite

- 📺 Streaming
- 🎵 Musica
- 💻 Software
- 🎮 Gaming
- ☁️ Cloud Storage
- 📰 News & Media
- 💪 Fitness
- 📱 Telefonia
- ⚡ Energia Elettrica
- 🔥 Gas
- 💧 Acqua
- 🌐 Internet
- 🛡️ Assicurazioni
- 🏦 Servizi Finanziari
- 📦 Altro

Puoi aggiungere categorie custom nelle Impostazioni.

## 🗓️ Roadmap

- [x] Multi-utente / Autenticazione JWT
- [ ] Import automatico da estratto conto
- [ ] Notifiche push browser
- [ ] Database condiviso di deals della community
- [ ] Hosting SaaS gestito
- [ ] Integrazione con comparatori (SosTariffe, Segugio...)
- [ ] Mobile app nativa

## 🤝 Contribuire

Le pull request sono benvenute! Per modifiche importanti, apri prima una issue per discutere cosa vorresti cambiare.

## 📄 Licenza

MIT - vedi [LICENSE](LICENSE)

---

**New Deal Or Leave** - Non farti fregare dai rinnovi automatici 💪
