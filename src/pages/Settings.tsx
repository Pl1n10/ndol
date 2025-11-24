import { useState, useEffect } from 'react';
import { Save, Mail, CheckCircle, XCircle, Loader } from 'lucide-react';
import { useSettings, useSaveSettings, useTestEmail, useCategories, useCreateCategory, useDeleteCategory } from '../lib/api';

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const { data: categories } = useCategories();
  const saveSettings = useSaveSettings();
  const testEmail = useTestEmail();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();

  const [form, setForm] = useState({
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    smtpSecure: 'false',
    emailFrom: '',
    emailTo: '',
  });

  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', icon: '📦', color: '#6B7280' });
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        smtpHost: settings.smtpHost || '',
        smtpPort: settings.smtpPort || '587',
        smtpUser: settings.smtpUser || '',
        smtpPass: settings.smtpPass || '',
        smtpSecure: settings.smtpSecure || 'false',
        emailFrom: settings.emailFrom || '',
        emailTo: settings.emailTo || '',
      });
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettings.mutateAsync(form);
    setTestResult(null);
  };

  const handleTestEmail = async () => {
    setTestResult(null);
    const result = await testEmail.mutateAsync();
    setTestResult(result);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    await createCategory.mutateAsync(newCategory);
    setNewCategory({ name: '', icon: '📦', color: '#6B7280' });
    setShowCategoryForm(false);
  };

  const customCategories = categories?.filter(c => c.isCustom) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Impostazioni</h1>
        <p className="text-slate-500">Configura le notifiche email e le categorie</p>
      </div>

      {/* Email Settings */}
      <div className="card">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Mail size={20} />
            Configurazione Email
          </h2>
          <p className="text-sm text-slate-500">
            Configura il server SMTP per ricevere promemoria prima delle scadenze
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Server SMTP</label>
              <input
                type="text"
                value={form.smtpHost}
                onChange={(e) => setForm(f => ({ ...f, smtpHost: e.target.value }))}
                placeholder="smtp.gmail.com"
                className="input"
              />
              <p className="text-xs text-slate-500 mt-1">
                Gmail: smtp.gmail.com | Outlook: smtp.office365.com
              </p>
            </div>

            <div>
              <label className="label">Porta</label>
              <input
                type="text"
                value={form.smtpPort}
                onChange={(e) => setForm(f => ({ ...f, smtpPort: e.target.value }))}
                placeholder="587"
                className="input"
              />
            </div>

            <div>
              <label className="label">Connessione sicura (SSL/TLS)</label>
              <select
                value={form.smtpSecure}
                onChange={(e) => setForm(f => ({ ...f, smtpSecure: e.target.value }))}
                className="input"
              >
                <option value="false">No (STARTTLS - porta 587)</option>
                <option value="true">Sì (SSL - porta 465)</option>
              </select>
            </div>

            <div>
              <label className="label">Username SMTP</label>
              <input
                type="text"
                value={form.smtpUser}
                onChange={(e) => setForm(f => ({ ...f, smtpUser: e.target.value }))}
                placeholder="tua@email.com"
                className="input"
              />
            </div>

            <div>
              <label className="label">Password SMTP</label>
              <input
                type="password"
                value={form.smtpPass}
                onChange={(e) => setForm(f => ({ ...f, smtpPass: e.target.value }))}
                placeholder="App password"
                className="input"
              />
              <p className="text-xs text-slate-500 mt-1">
                Per Gmail, usa una "App Password"
              </p>
            </div>

            <div>
              <label className="label">Email mittente</label>
              <input
                type="email"
                value={form.emailFrom}
                onChange={(e) => setForm(f => ({ ...f, emailFrom: e.target.value }))}
                placeholder="ndol@tuodominio.com"
                className="input"
              />
            </div>

            <div>
              <label className="label">Email destinatario</label>
              <input
                type="email"
                value={form.emailTo}
                onChange={(e) => setForm(f => ({ ...f, emailTo: e.target.value }))}
                placeholder="tua@email.com"
                className="input"
              />
            </div>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${
              testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {testResult.success ? (
                <>
                  <CheckCircle size={20} />
                  <span>Connessione SMTP riuscita!</span>
                </>
              ) : (
                <>
                  <XCircle size={20} />
                  <span>Errore: {testResult.error}</span>
                </>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
            <button
              type="submit"
              className="btn-primary"
              disabled={saveSettings.isPending}
            >
              <Save size={18} />
              Salva impostazioni
            </button>
            <button
              type="button"
              onClick={handleTestEmail}
              className="btn-secondary"
              disabled={testEmail.isPending || !form.smtpHost}
            >
              {testEmail.isPending ? (
                <Loader size={18} className="animate-spin" />
              ) : (
                <Mail size={18} />
              )}
              Testa connessione
            </button>
          </div>
        </form>
      </div>

      {/* Categories Management */}
      <div className="card">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg">Categorie personalizzate</h2>
            <p className="text-sm text-slate-500">Aggiungi categorie custom</p>
          </div>
          <button
            onClick={() => setShowCategoryForm(!showCategoryForm)}
            className="btn-secondary text-sm"
          >
            Aggiungi
          </button>
        </div>

        {showCategoryForm && (
          <form onSubmit={handleAddCategory} className="p-4 bg-slate-50 border-b border-slate-200">
            <div className="flex gap-3">
              <input
                type="text"
                required
                value={newCategory.name}
                onChange={(e) => setNewCategory(c => ({ ...c, name: e.target.value }))}
                placeholder="Nome categoria"
                className="input flex-1"
              />
              <input
                type="text"
                value={newCategory.icon}
                onChange={(e) => setNewCategory(c => ({ ...c, icon: e.target.value }))}
                placeholder="Emoji"
                className="input w-16 text-center"
              />
              <input
                type="color"
                value={newCategory.color}
                onChange={(e) => setNewCategory(c => ({ ...c, color: e.target.value }))}
                className="input w-16 p-1 h-10"
              />
              <button type="submit" className="btn-primary">
                Aggiungi
              </button>
            </div>
          </form>
        )}

        {customCategories.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {customCategories.map(cat => (
              <div key={cat.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ backgroundColor: cat.color + '20', color: cat.color }}
                  >
                    {cat.icon}
                  </div>
                  <span className="font-medium">{cat.name}</span>
                </div>
                <button
                  onClick={() => deleteCategory.mutate(cat.id)}
                  className="text-slate-400 hover:text-red-500 text-sm"
                >
                  Elimina
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-slate-500">
            Nessuna categoria personalizzata
          </div>
        )}
      </div>

      {/* Info */}
      <div className="card p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Come funzionano i promemoria</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Il server controlla le scadenze ogni ora</li>
          <li>• Ricevi un'email X giorni prima del rinnovo (configurabile per ogni subscription)</li>
          <li>• Dopo il rinnovo, il promemoria si resetta automaticamente per il prossimo ciclo</li>
        </ul>
      </div>
    </div>
  );
}
