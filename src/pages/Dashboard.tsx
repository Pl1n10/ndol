import { Link } from 'react-router-dom';
import { TrendingUp, Calendar, AlertTriangle, CreditCard, PlusCircle, ArrowRight } from 'lucide-react';
import { useStats, useSubscriptions, useCategories } from '../lib/api';
import { formatCurrency, formatDate, getDaysUntil } from '../lib/utils';

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: subscriptions, isLoading: subsLoading } = useSubscriptions();
  const { data: categories } = useCategories();

  const activeSubscriptions = subscriptions?.filter(s => s.status === 'active') || [];
  
  // Subscription in scadenza nei prossimi 14 giorni
  const expiringSoon = activeSubscriptions
    .filter(s => {
      const days = getDaysUntil(s.nextRenewal);
      return days >= 0 && days <= 14;
    })
    .sort((a, b) => new Date(a.nextRenewal).getTime() - new Date(b.nextRenewal).getTime());

  const getCategoryById = (id: string | null) => 
    categories?.find(c => c.id === id);

  if (statsLoading || subsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-100 rounded-lg">
              <CreditCard className="text-primary-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Subscription Attive</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.totalActive || 0}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Spesa Mensile</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.totalMonthly || 0)}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Calendar className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Spesa Annuale</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.totalYearly || 0)}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${stats?.expiringSoon ? 'bg-orange-100' : 'bg-slate-100'}`}>
              <AlertTriangle className={stats?.expiringSoon ? 'text-orange-600' : 'text-slate-400'} size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500">In Scadenza (7gg)</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.expiringSoon || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4">
        <Link to="/new" className="btn-primary">
          <PlusCircle size={18} />
          Aggiungi Subscription
        </Link>
        <Link to="/subscriptions" className="btn-secondary">
          Vedi tutte
          <ArrowRight size={18} />
        </Link>
      </div>

      {/* Expiring Soon */}
      {expiringSoon.length > 0 && (
        <div className="card">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <AlertTriangle className="text-orange-500" size={20} />
              Rinnovi in Arrivo
            </h2>
            <p className="text-slate-500 text-sm">Subscription in scadenza nei prossimi 14 giorni</p>
          </div>
          <div className="divide-y divide-slate-100">
            {expiringSoon.map(sub => {
              const category = getCategoryById(sub.categoryId);
              const daysUntil = getDaysUntil(sub.nextRenewal);
              
              return (
                <Link
                  key={sub.id}
                  to={`/edit/${sub.id}`}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                      style={{ backgroundColor: category?.color + '20', color: category?.color }}
                    >
                      {category?.icon || '📦'}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{sub.name}</p>
                      <p className="text-sm text-slate-500">
                        {sub.provider || category?.name || 'Altro'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{formatCurrency(sub.amount)}</p>
                    <p className={`text-sm ${daysUntil <= 3 ? 'text-red-500 font-medium' : 'text-slate-500'}`}>
                      {daysUntil === 0 ? 'Oggi!' : daysUntil === 1 ? 'Domani' : `${daysUntil} giorni`}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent / All Subscriptions Preview */}
      {activeSubscriptions.length > 0 && (
        <div className="card">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-semibold text-lg">Tutte le Subscription Attive</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {activeSubscriptions.slice(0, 5).map(sub => {
              const category = getCategoryById(sub.categoryId);
              
              return (
                <Link
                  key={sub.id}
                  to={`/edit/${sub.id}`}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                      style={{ backgroundColor: category?.color + '20', color: category?.color }}
                    >
                      {category?.icon || '📦'}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{sub.name}</p>
                      <p className="text-sm text-slate-500">
                        {sub.provider || category?.name || 'Altro'} • Rinnovo: {formatDate(sub.nextRenewal)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{formatCurrency(sub.amount)}</p>
                    <p className="text-sm text-slate-500">{getBillingLabel(sub.billingCycle)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
          {activeSubscriptions.length > 5 && (
            <div className="p-4 border-t border-slate-200 text-center">
              <Link to="/subscriptions" className="text-primary-500 hover:underline text-sm">
                Vedi tutte le {activeSubscriptions.length} subscription →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {activeSubscriptions.length === 0 && (
        <div className="card p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">Nessuna subscription</h3>
          <p className="text-slate-500 mb-6">
            Inizia ad aggiungere le tue subscription per tenere traccia delle spese e dei rinnovi.
          </p>
          <Link to="/new" className="btn-primary">
            <PlusCircle size={18} />
            Aggiungi la prima subscription
          </Link>
        </div>
      )}
    </div>
  );
}

function getBillingLabel(cycle: string): string {
  const labels: Record<string, string> = {
    weekly: '/sett',
    monthly: '/mese',
    quarterly: '/trim',
    yearly: '/anno',
  };
  return labels[cycle] || '';
}
