import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { LayoutDashboard, List, Settings, PlusCircle, LogOut } from 'lucide-react';
import { useAuth } from './lib/auth';
import Dashboard from './pages/Dashboard';
import SubscriptionList from './pages/SubscriptionList';
import SubscriptionForm from './pages/SubscriptionForm';
import SettingsPage from './pages/Settings';
import LoginPage from './pages/Login';
import VerifyEmailPage from './pages/VerifyEmail';
import ResetPasswordPage from './pages/ResetPassword';

// Componente per proteggere le route
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Layout principale con header
function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">ndol</h1>
              <p className="text-primary-100 text-sm">New Deal Or Leave</p>
            </div>
            <nav className="flex items-center gap-1">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'text-primary-100 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <LayoutDashboard size={18} />
                <span className="hidden sm:inline">Dashboard</span>
              </NavLink>
              <NavLink
                to="/subscriptions"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'text-primary-100 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <List size={18} />
                <span className="hidden sm:inline">Lista</span>
              </NavLink>
              <NavLink
                to="/new"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'text-primary-100 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <PlusCircle size={18} />
                <span className="hidden sm:inline">Nuovo</span>
              </NavLink>
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'text-primary-100 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Settings size={18} />
                <span className="hidden sm:inline">Impostazioni</span>
              </NavLink>

              {/* User menu */}
              <div className="ml-4 pl-4 border-l border-white/20 flex items-center gap-2">
                <span className="text-primary-100 text-sm hidden md:inline">
                  {user?.name || user?.email}
                </span>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-primary-100 hover:bg-white/10 hover:text-white transition-colors"
                  title="Esci"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-slate-500 text-sm">
        <p>
          ndol - Open Source Subscription Manager |{' '}
          <a
            href="https://github.com/Pl1n10/ndol"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-500 hover:underline"
          >
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  const { user, isLoading } = useAuth();

  // Se sta caricando, mostra spinner
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Route pubblica per login */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />

      {/* Route pubblica per verifica email */}
      <Route
        path="/verify"
        element={<VerifyEmailPage />}
      />

      {/* Route pubblica per reset password */}
      <Route
        path="/reset-password"
        element={<ResetPasswordPage />}
      />

      {/* Route protette */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/subscriptions"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SubscriptionList />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/new"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SubscriptionForm />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/edit/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SubscriptionForm />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SettingsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Redirect qualsiasi altra route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
