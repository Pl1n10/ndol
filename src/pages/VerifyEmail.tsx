import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function verify() {
      if (!token) {
        setStatus('error');
        setMessage('Token mancante');
        return;
      }

      try {
        const res = await fetch(`/api/auth/verify-email?token=${token}`);
        const data = await res.json();

        if (res.ok) {
          setStatus('success');
          setMessage('Email verificata con successo!');
        } else {
          setStatus('error');
          setMessage(data.error || 'Errore nella verifica');
        }
      } catch {
        setStatus('error');
        setMessage('Errore di connessione');
      }
    }

    verify();
  }, [token]);

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

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-green-600" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Email verificata!</h2>
              <p className="text-slate-600 mb-6">{message}</p>
              <p className="text-slate-500 mb-6">
                Il tuo account è ora attivo. Puoi accedere con le tue credenziali.
              </p>
              <Link to="/login" className="btn-primary inline-block">
                Vai al login
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="text-red-600" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Verifica fallita</h2>
              <p className="text-slate-600 mb-6">{message}</p>
              <div className="space-y-3">
                <Link to="/login" className="btn-primary w-full block">
                  Vai al login
                </Link>
                <p className="text-slate-500 text-sm">
                  Puoi richiedere una nuova email di verifica dalla pagina di login.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
