import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Trash2, Plus, X } from 'lucide-react';
import { 
  useCategories, 
  useSubscription, 
  useCreateSubscription, 
  useUpdateSubscription,
  useDeleteSubscription,
  useAlternatives,
  useCreateAlternative,
  useDeleteAlternative
} from '../lib/api';
import { formatDateInput, calculateNextRenewal, formatCurrency } from '../lib/utils';
import { BILLING_CYCLES, STATUS_OPTIONS, type NewSubscription } from '../types';

export default function SubscriptionForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const { data: categories } = useCategories();
  const { data: existingSubscription, isLoading } = useSubscription(id || '');
  const { data: alternatives } = useAlternatives(id || '');
  
  const createSubscription = useCreateSubscription();
  const updateSubscription = useUpdateSubscription();
  const deleteSubscription = useDeleteSubscription();
  const createAlternative = useCreateAlternative();
  const deleteAlternative = useDeleteAlternative();

  const [form, setForm] = useState<NewSubscription>({
    name: '',
    description: '',
    categoryId: '',
    amount: 0,
    currency: 'EUR',
    billingCycle: 'monthly',
    startDate: formatDateInput(new Date()),
    nextRenewal: formatDateInput(new Date()),
    reminderDaysBefore: 7,
    provider: '',
    website: '',
    notes: '',
    status: 'active',
    autoRenew: true,
  });

  const [showAlternativeForm, setShowAlternativeForm] = useState(false);
  const [newAlternative, setNewAlternative] = useState({
    name: '',
    provider: '',
    amount: 0,
    website: '',
    notes: '',
  });

  useEffect(() => {
    if (existingSubscription) {
      setForm({
        name: existingSubscription.name,
        description: existingSubscription.description || '',
        categoryId: existingSubscription.categoryId || '',
        amount: existingSubscription.amount,
        currency: existingSubscription.currency,
        billingCycle: existingSubscription.billingCycle,
        startDate: formatDateInput(existingSubscription.startDate),
        nextRenewal: formatDateInput(existingSubscription.nextRenewal),
        endDate: existingSubscription.endDate ? formatDateInput(existingSubscription.endDate) : undefined,
        reminderDaysBefore: existingSubscription.reminderDaysBefore,
        provider: existingSubscription.provider || '',
        website: existingSubscription.website || '',
        notes: existingSubscription.notes || '',
        status: existingSubscription.status,
        autoRenew: existingSubscription.autoRenew,
      });
    }
  }, [existingSubscription]);

  // Auto-calcola nextRenewal quando cambia startDate o billingCycle
  useEffect(() => {
    if (!isEditing && form.startDate && form.billingCycle) {
      const next = calculateNextRenewal(new Date(form.startDate), form.billingCycle);
      setForm(f => ({ ...f, nextRenewal: formatDateInput(next) }));
    }
  }, [form.startDate, form.billingCycle, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditing && id) {
        await updateSubscription.mutateAsync({ id, data: form });
      } else {
        await createSubscription.mutateAsync(form);
      }
      navigate('/subscriptions');
    } catch (error) {
      console.error('Errore nel salvataggio:', error);
    }
  };

  const handleDelete = async () => {
    if (id && confirm('Sei sicuro di voler eliminare questa subscription?')) {
      await deleteSubscription.mutateAsync(id);
      navigate('/subscriptions');
    }
  };

  const handleAddAlternative = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    
    await createAlternative.mutateAsync({
      subscriptionId: id,
      data: newAlternative,
    });
    
    setNewAlternative({ name: '', provider: '', amount: 0, website: '', notes: '' });
    setShowAlternativeForm(false);
  };

  if (isLoading && isEditing) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6"
      >
        <ArrowLeft size={18} />
        Indietro
      </button>

      <div className="card">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-xl font-bold text-slate-900">
            {isEditing ? 'Modifica Subscription' : 'Nuova Subscription'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nome e Provider */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Nome *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Es. Netflix Premium"
                className="input"
              />
            </div>
            <div>
              <label className="label">Provider</label>
              <input
                type="text"
                value={form.provider}
                onChange={(e) => setForm(f => ({ ...f, provider: e.target.value }))}
                placeholder="Es. Netflix"
                className="input"
              />
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className="label">Categoria</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {categories?.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, categoryId: cat.id }))}
                  className={`p-3 rounded-lg border-2 transition-colors text-center ${
                    form.categoryId === cat.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{cat.icon}</div>
                  <div className="text-xs text-slate-600 truncate">{cat.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Importo e Ciclo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Importo *</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={form.amount || ''}
                  onChange={(e) => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                  className="input pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">EUR</span>
              </div>
            </div>
            <div>
              <label className="label">Ciclo *</label>
              <select
                value={form.billingCycle}
                onChange={(e) => setForm(f => ({ ...f, billingCycle: e.target.value as any }))}
                className="input"
              >
                {BILLING_CYCLES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Stato</label>
              <select
                value={form.status}
                onChange={(e) => setForm(f => ({ ...f, status: e.target.value as any }))}
                className="input"
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Data inizio</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label className="label">Prossimo rinnovo *</label>
              <input
                type="date"
                required
                value={form.nextRenewal}
                onChange={(e) => setForm(f => ({ ...f, nextRenewal: e.target.value }))}
                className="input"
              />
            </div>
          </div>

          {/* Reminder */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Promemoria (giorni prima)</label>
              <input
                type="number"
                min="1"
                max="30"
                value={form.reminderDaysBefore}
                onChange={(e) => setForm(f => ({ ...f, reminderDaysBefore: parseInt(e.target.value) || 7 }))}
                className="input"
              />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="autoRenew"
                checked={form.autoRenew}
                onChange={(e) => setForm(f => ({ ...f, autoRenew: e.target.checked }))}
                className="w-4 h-4 text-primary-500 rounded"
              />
              <label htmlFor="autoRenew" className="text-sm text-slate-700">
                Rinnovo automatico
              </label>
            </div>
          </div>

          {/* Sito e Note */}
          <div>
            <label className="label">Sito web</label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => setForm(f => ({ ...f, website: e.target.value }))}
              placeholder="https://..."
              className="input"
            />
          </div>

          <div>
            <label className="label">Note</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Appunti, codice sconto, dettagli contratto..."
              rows={3}
              className="input resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                className="btn-danger"
                disabled={deleteSubscription.isPending}
              >
                <Trash2 size={18} />
                Elimina
              </button>
            )}
            <div className={`flex gap-3 ${!isEditing ? 'ml-auto' : ''}`}>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn-secondary"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={createSubscription.isPending || updateSubscription.isPending}
              >
                <Save size={18} />
                {isEditing ? 'Salva modifiche' : 'Crea subscription'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Alternatives Section (solo in edit mode) */}
      {isEditing && (
        <div className="card mt-6">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Alternative suggerite</h2>
              <p className="text-sm text-slate-500">Tieni traccia di opzioni alternative</p>
            </div>
            <button
              onClick={() => setShowAlternativeForm(!showAlternativeForm)}
              className="btn-secondary text-sm"
            >
              <Plus size={16} />
              Aggiungi
            </button>
          </div>

          {showAlternativeForm && (
            <form onSubmit={handleAddAlternative} className="p-4 bg-slate-50 border-b border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  required
                  value={newAlternative.name}
                  onChange={(e) => setNewAlternative(a => ({ ...a, name: e.target.value }))}
                  placeholder="Nome alternativa"
                  className="input"
                />
                <input
                  type="text"
                  required
                  value={newAlternative.provider}
                  onChange={(e) => setNewAlternative(a => ({ ...a, provider: e.target.value }))}
                  placeholder="Provider"
                  className="input"
                />
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={newAlternative.amount || ''}
                  onChange={(e) => setNewAlternative(a => ({ ...a, amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="Prezzo"
                  className="input"
                />
                <input
                  type="url"
                  value={newAlternative.website}
                  onChange={(e) => setNewAlternative(a => ({ ...a, website: e.target.value }))}
                  placeholder="Sito web"
                  className="input"
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button type="submit" className="btn-primary text-sm">
                  Salva alternativa
                </button>
                <button
                  type="button"
                  onClick={() => setShowAlternativeForm(false)}
                  className="btn-secondary text-sm"
                >
                  Annulla
                </button>
              </div>
            </form>
          )}

          {alternatives && alternatives.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {alternatives.map(alt => (
                <div key={alt.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{alt.name}</p>
                    <p className="text-sm text-slate-500">{alt.provider}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">{formatCurrency(alt.amount)}</p>
                      {form.amount > alt.amount && (
                        <p className="text-xs text-green-600">
                          Risparmi {formatCurrency(form.amount - alt.amount)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteAlternative.mutate(alt.id)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500">
              Nessuna alternativa salvata
            </div>
          )}
        </div>
      )}
    </div>
  );
}
