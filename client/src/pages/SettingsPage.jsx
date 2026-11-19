import { useState } from 'react';
import { Link2, MessageSquare, RotateCcw, CheckCircle2 } from 'lucide-react';
import { api, useAuth } from '../context/AuthContext';

const DEFAULT_TEMPLATE = 'Why are you absent on {{absentDates}}? Please tell the reason';

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || user?.name || '');
  const [googleSheetUrl, setGoogleSheetUrl] = useState(user?.googleSheetUrl || '');
  const [whatsappTemplate, setWhatsappTemplate] = useState(
    user?.whatsappTemplate || DEFAULT_TEMPLATE
  );
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg('');
    try {
      const { data } = await api.patch('/auth/settings', {
        displayName,
        googleSheetUrl,
        whatsappTemplate,
      });
      setUser(data.user);
      setSavedMsg('Settings saved successfully.');
    } catch (err) {
      setSavedMsg(err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const previewText = whatsappTemplate
    .replace(/\{\{absentDates\}\}/g, '12-12-2026 and 14-12-2026')
    .replace(/\{\{studentName\}\}/g, 'Muniba Muskan')
    .replace(/\{\{batchCode\}\}/g, '2601B2');

  return (
    <div className="max-w-3xl space-y-6">
      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Google Sheet Link & Tab Name */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-slate-900">
              Manager&apos;s Google Sheet Connection
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Paste your Manager&apos;s Google Sheet link below. When you click{' '}
            <strong>Sync to Google Sheet</strong> on the Follow-Up page, your rows will sync directly
            into the tab matching your Sheet Tab Name.
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Your Sheet Tab Name (must match tab name in Google Sheet)
            </label>
            <input
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Miss Laiba Iqbal or Sir Faraz"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Google Sheet URL
            </label>
            <input
              type="url"
              value={googleSheetUrl}
              onChange={(e) => setGoogleSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
            />
          </div>
        </div>

        {/* Card 2: WhatsApp Message Template Editor */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-semibold text-slate-900">
                WhatsApp Follow-Up Message Template
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setWhatsappTemplate(DEFAULT_TEMPLATE)}
              className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Default
            </button>
          </div>

          <p className="text-xs text-slate-500">
            Customize the automatic WhatsApp message sent when you select{' '}
            <strong>Student Contact</strong> or <strong>Parents Contact</strong> on a row. Available
            placeholders:{' '}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">{'{{absentDates}}'}</code>,{' '}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">{'{{studentName}}'}</code>,{' '}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">{'{{batchCode}}'}</code>.
          </p>

          <textarea
            rows={3}
            value={whatsappTemplate}
            onChange={(e) => setWhatsappTemplate(e.target.value)}
            className="w-full border border-slate-300 rounded-lg p-3 text-xs focus:outline-none focus:border-emerald-600"
          />

          <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 mb-1">
              Live Message Preview
            </p>
            <p className="text-xs text-slate-800">&ldquo;{previewText}&rdquo;</p>
          </div>
        </div>

        {savedMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {savedMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold px-6 py-2.5 rounded-lg cursor-pointer"
        >
          {saving ? 'Saving Settings...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}