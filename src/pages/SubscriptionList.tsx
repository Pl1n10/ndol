import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, PlusCircle, Trash2, Edit, ExternalLink } from 'lucide-react';
import { useSubscriptions, useCategories, useDeleteSubscription } from '../lib/api';
import { formatCurrency, formatDate, getDaysUntil } from '../lib/utils';
import { STATUS_OPTIONS } from '../types';

export default function SubscriptionList() {
  const { data: subscriptions, isLoading } = useSubscriptions();
  const { data: categories } = useCategories();
  const deleteSubscription = useDeleteSubscription();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const getCategoryById = (id: string | null) => 
    categories?.find(c => c.id === id);

  const filteredSubscriptions = subscriptions?.filter(sub => {
    const matchesSearch = sub.name.toLowerCase().includes(search.toLowerCase()) ||
      sub.provider?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || sub.categoryId === categoryFilter;
    const matchesStatus = !statusFilter || sub.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  }) || [];

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Sei sicuro di voler eliminare "${name}"?`)) {
      await deleteSubscription.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Le tue Subscription</h1>
          <p className="text-slate-500">{subscriptions?.length || 0} totali</p>
        </div>
        <Link to="/new" className="btn-primary">
          <PlusCircle size={18} />
          Aggiungi
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Cerca per nome o provider..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input w-full sm:w-48"
          >
            <option value="">Tutte le categorie</option>
            {categories?.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-full sm:w-40"
          >
            <option value="">Tutti gli stati</option>
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      {filteredSubscriptions.length > 0 ? (
        <div className="card divide-y divide-slate-100">
          {filteredSubscriptions.map(sub => {
            const category = getCategoryById(sub.categoryId);
            const daysUntil = getDaysUntil(sub.nextRenewal);
            const statusInfo = STATUS_OPTIONS.find(s => s.value === sub.status);
            
            return (
              <div
                key={sub.id}
                className="p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl shrink-0"
                      style={{ backgroundColor: category?.color + '20', color: category?.color }}
                    >
                      {category?.icon || '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900">{sub.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo?.color}`}>
                          {statusInfo?.label}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">
                        {sub.provider || category?.name || 'Altro'}
                      </p>
                      {sub.description && (
                        <p className="text-sm text-slate-400 mt-1 truncate">{sub.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                        <span>Prossimo rinnovo: {formatDate(sub.nextRenewal)}</span>
                        {sub.status === 'active' && daysUntil <= 7 && daysUntil >= 0 && (
                          <span className={`font-medium ${daysUntil <= 3 ? 'text-red-500' : 'text-orange-500'}`}>
                            ({daysUntil === 0 ? 'Oggi!' : `${daysUntil}gg`})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <p className="font-bold text-lg text-slate-900">
                      {formatCurrency(sub.amount)}
                    </p>
                    <p className="text-sm text-slate-500">{getBillingLabel(sub.billingCycle)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                  <Link
                    to={`/edit/${sub.id}`}
                    className="btn-secondary text-sm py-1.5"
                  >
                    <Edit size={14} />
                    Modifica
                  </Link>
                  {sub.website && (
                    <a
                      href={sub.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary text-sm py-1.5"
                    >
                      <ExternalLink size={14} />
                      Sito
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(sub.id, sub.name)}
                    className="btn text-sm py-1.5 text-red-600 hover:bg-red-50 ml-auto"
                    disabled={deleteSubscription.isPending}
                  >
                    <Trash2 size={14} />
                    Elimina
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {subscriptions?.length === 0 ? 'Nessuna subscription' : 'Nessun risultato'}
          </h3>
          <p className="text-slate-500">
            {subscriptions?.length === 0 
              ? 'Aggiungi la tua prima subscription per iniziare.'
              : 'Prova a modificare i filtri di ricerca.'}
          </p>
        </div>
      )}
    </div>
  );
}

function getBillingLabel(cycle: string): string {
  const labels: Record<string, string> = {
    weekly: 'Settimanale',
    monthly: 'Mensile',
    quarterly: 'Trimestrale',
    yearly: 'Annuale',
  };
  return labels[cycle] || cycle;
}
