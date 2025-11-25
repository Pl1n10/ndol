import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Loader, CheckCircle, RefreshCw, KeyRound } from 'lucide-react';
import { useAuth } from '../lib/auth';

type Mode = 'login' | 'register' | 'registered' | 'resend' | 'forgot' | 'forgot-sent';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (mode === 'register') {
        // Registrazione
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name: name || undefined }),
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error);
        }
        
        // Mostra schermata di successo
        setMode('registered');
      } else if (mode === 'resend') {
        // Reinvia email di verifica
        const res = await fetch('/api/auth/resend-verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error);
        }
        
        setSuccess('Email di verifica inviata! Controlla la tua casella di posta.');
      } else if (mode === 'forgot') {
        // Richiedi reset password
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error);
        }
        
        setMode('forgot-sent');
      } else {
        // Login
        await login(email, password);
        navigate('/');
      }
    } catch (err: any) {
      const message = err.message || 'Errore';
      setError(message);
      
      // Se l'email non è verificata, mostra opzione per reinviare
      if (message.includes('non verificata')) {
        setMode('resend');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Schermata dopo registrazione
  if (mode === 'registered') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">ndol</h1>
            <p className="text-primary-100">New Deal Or Leave</p>
          </div>

          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-green-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Controlla la tua email!</h2>
            <p className="text-slate-600 mb-6">
              Abbiamo inviato un'email a <strong>{email}</strong> con un link per verificare il tuo account.
            </p>
            <p className="text-slate-500 text-sm mb-6">
              Il link scade tra 24 ore. Se non trovi l'email, controlla la cartella spam.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  setMode('login');
                  setError('');
                  setSuccess('');
                }}
                className="btn-primary w-full"
              >
                Vai al login
              </button>
              <button
                onClick={() => {
                  setMode('resend');
                  setError('');
                  setSuccess('');
                }}
                className="btn-secondary w-full"
              >
                <RefreshCw size={16} />
                Non hai ricevuto l'email?
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Schermata dopo richiesta reset password
  if (mode === 'forgot-sent') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">ndol</h1>
            <p className="text-primary-100">New Deal Or Leave</p>
          </div>

          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="text-blue-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Controlla la tua email!</h2>
            <p className="text-slate-600 mb-6">
              Se l'indirizzo <strong>{email}</strong> è registrato, riceverai un'email con le istruzioni per reimpostare la password.
            </p>
            <p className="text-slate-500 text-sm mb-6">
              Il link scade tra 1 ora. Se non trovi l'email, controlla la cartella spam.
            </p>
            
            <button
              onClick={() => {
                setMode('login');
                setEmail('');
                setError('');
                setSuccess('');
              }}
              className="btn-primary w-full"
            >
              Torna al login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">ndol</h1>
          <p className="text-primary-100">New Deal Or Leave</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">
            {mode === 'login' && 'Accedi'}
            {mode === 'register' && 'Crea un account'}
            {mode === 'resend' && 'Reinvia email di verifica'}
            {mode === 'forgot' && 'Password dimenticata?'}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="label">Nome (opzionale)</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Il tuo nome"
                    className="input pl-10"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@esempio.com"
                  className="input pl-10"
                />
              </div>
            </div>

            {(mode === 'login' || mode === 'register') && (
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'register' ? 'Minimo 6 caratteri' : '••••••••'}
                    className="input pl-10"
                  />
                </div>
              </div>
            )}

            {mode === 'forgot' && (
              <p className="text-slate-600 text-sm">
                Inserisci la tua email e ti invieremo un link per reimpostare la password.
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3"
            >
              {isLoading ? (
                <Loader className="animate-spin" size={20} />
              ) : mode === 'register' ? (
                'Registrati'
              ) : mode === 'resend' ? (
                'Invia email'
              ) : mode === 'forgot' ? (
                <>
                  <KeyRound size={18} />
                  Invia link di reset
                </>
              ) : (
                'Accedi'
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {mode === 'login' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setError('');
                    setSuccess('');
                  }}
                  className="text-slate-500 hover:underline text-sm block w-full"
                >
                  Password dimenticata?
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError('');
                    setSuccess('');
                  }}
                  className="text-primary-500 hover:underline text-sm block w-full"
                >
                  Non hai un account? Registrati
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('resend');
                    setError('');
                    setSuccess('');
                  }}
                  className="text-slate-400 hover:underline text-xs block w-full"
                >
                  Non hai ricevuto l'email di verifica?
                </button>
              </>
            )}
            {mode === 'register' && (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                  setSuccess('');
                }}
                className="text-primary-500 hover:underline text-sm"
              >
                Hai già un account? Accedi
              </button>
            )}
            {(mode === 'resend' || mode === 'forgot') && (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                  setSuccess('');
                }}
                className="text-primary-500 hover:underline text-sm"
              >
                ← Torna al login
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-primary-100 text-sm mt-6">
          Open Source Subscription Manager
        </p>
      </div>
    </div>
  );
}
