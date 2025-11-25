import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader, Lock, KeyRound } from 'lucide-react';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verifica token all'avvio
  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setStatus('invalid');
        setMessage('Token mancante');
        return;
      }

      try {
        const res = await fetch(`/api/auth/verify-reset-token?token=${token}`);
        const data = await res.json();

        if (res.ok) {
          setStatus('valid');
        } else {
          setStatus('invalid');
          setMessage(data.error || 'Token non valido');
        }
      } catch {
        setStatus('invalid');
        setMessage('Errore di connessione');
      }
    }

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setMessage('Le password non coincidono');
      setStatus('error');
      return;
    }
    
    if (password.length < 6) {
      setMessage('La password deve essere almeno 6 caratteri');
      setStatus('error');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setMessage('Password reimpostata con successo!');
      } else {
        setStatus('error');
        setMessage(data.error || 'Errore nel reset password');
      }
    } catch {
      setStatus('error');
      setMessage('Errore di connessione');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">ndol</h1>
          <p className="text-primary-100">New Deal Or Leave</p>
        </div>

        <div className="card p-8 text-center">
          {status === 'loading' && (
            <>
              <Loader className="animate-spin text-primary-500 mx-auto mb-4" size={48} />
              <h2 className="text-xl font-bold text-slate-900">Verifica in corso...</h2>
            </>
          )}

          {status === 'invalid' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="text-red-600" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Link non valido</h2>
              <p className="text-slate-600 mb-6">{message}</p>
              <p className="text-slate-500 text-sm mb-6">
                Il link potrebbe essere scaduto o già utilizzato.
              </p>
              <Link to="/login" className="btn-primary inline-block">
                Torna al login
              </Link>
            </>
          )}

          {status === 'valid' && (
            <>
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <KeyRound className="text-primary-600" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Reimposta password</h2>
              <p className="text-slate-600 mb-6">Inserisci la tua nuova password.</p>

              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                <div>
                  <label className="label">Nuova password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimo 6 caratteri"
                      className="input pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Conferma password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ripeti la password"
                      className="input pl-10"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full py-3"
                >
                  {isSubmitting ? (
                    <Loader className="animate-spin" size={20} />
                  ) : (
                    'Reimposta password'
                  )}
                </button>
              </form>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="text-red-600" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Errore</h2>
              <p className="text-slate-600 mb-6">{message}</p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setStatus('valid');
                    setMessage('');
                  }}
                  className="btn-primary w-full"
                >
                  Riprova
                </button>
                <Link to="/login" className="btn-secondary w-full block">
                  Torna al login
                </Link>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-green-600" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Password reimpostata!</h2>
              <p className="text-slate-600 mb-6">{message}</p>
              <p className="text-slate-500 mb-6">
                Ora puoi accedere con la tua nuova password.
              </p>
              <Link to="/login" className="btn-primary inline-block">
                Vai al login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
