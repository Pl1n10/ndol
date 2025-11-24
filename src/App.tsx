import { Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, List, Settings, PlusCircle } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import SubscriptionList from './pages/SubscriptionList';
import SubscriptionForm from './pages/SubscriptionForm';
import SettingsPage from './pages/Settings';

export default function App() {
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
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/subscriptions" element={<SubscriptionList />} />
          <Route path="/new" element={<SubscriptionForm />} />
          <Route path="/edit/:id" element={<SubscriptionForm />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-slate-500 text-sm">
        <p>
          ndol - Open Source Subscription Manager |{' '}
          <a
            href="https://github.com/yourusername/ndol"
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
