import { useEffect, useState } from 'react';
import { Save, MessageSquare, Mail, FileSpreadsheet } from 'lucide-react';
import { api, useAuth } from '../context/AuthContext';

const DEFAULT_WA_TEMPLATE = 'Why are you absent on {{absentDates}}? Please tell the reason';
const DEFAULT_EMAIL_SUBJECT = 'Attendance Follow-Up ({{batchCode}}) - {{studentName}}';
const DEFAULT_EMAIL_BODY =
  'Dear {{studentName}},\n\nYou were marked absent in batch {{batchCode}} on {{absentDates}}. Please share the reason for your absence at your earliest convenience.\n\nRegards,\n{{facultyName}}';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [whatsappTemplate, setWhatsappTemplate] = useState(DEFAULT_WA_TEMPLATE);
  const [emailSubjectTemplate, setEmailSubjectTemplate] = useState(DEFAULT_EMAIL_SUBJECT);
  const [emailBodyTemplate, setEmailBodyTemplate] = useState(DEFAULT_EMAIL_BODY);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || user.name || '');
      setGoogleSheetUrl(user.googleSheetUrl || '');
      setWhatsappTemplate(user.whatsappTemplate || DEFAULT_WA_TEMPLATE);
      setEmailSubjectTemplate(user.emailSubjectTemplate || DEFAULT_EMAIL_SUBJECT);
      setEmailBodyTemplate(user.emailBodyTemplate || DEFAULT_EMAIL_BODY);
    }
  }, [user]);

  const applySamplePlaceholders = (text) => {
    return (text || '')
      .replace(/\{\{studentName\}\}/g, 'Ali Raza')
      .replace(/\{\{absentDates\}\}/g, '17-11-2026 and 19-11-2026')
      .replace(/\{\{batchCode\}\}/g, '2608C1')
      .replace(/\{\{facultyName\}\}/g, displayName || 'Faculty');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg('');
    try {
      const { data } = await api.patch('/admin/settings', {
        displayName,
        googleSheetUrl,
        whatsappTemplate,
        emailSubjectTemplate,
        emailBodyTemplate,
      });
      if (refreshUser) await refreshUser();
      setStatusMsg(data.message || 'Settings saved successfully.');
    } catch (err) {
      setStatusMsg(err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="max-w-3xl space-y-6 pb-10">
      {statusMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
          {statusMsg}
        </div>
      )}

      {/* Google Sheet / Apps Script URL */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-slate-900">
            Google Sheet &amp; Faculty Tab Identity
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Sheet Tab Name (Faculty Display Name)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Usama Riaz"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Google Sheet URL or Apps Script Web App URL
            </label>
            <input
              type="url"
              value={googleSheetUrl}
              onChange={(e) => setGoogleSheetUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
            />
          </div>
        </div>
      </div>

      {/* WhatsApp Message Template */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-slate-900">WhatsApp Notice Template</h2>
          </div>
          <button
            type="button"
            onClick={() => setWhatsappTemplate(DEFAULT_WA_TEMPLATE)}
            className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
          >
            Reset Default
          </button>
        </div>

        <p className="text-[11px] text-slate-500">
          Available variables:{' '}
          <code className="bg-slate-100 px-1.5 py-0.5 rounded">{'{{studentName}}'}</code>,{' '}
          <code className="bg-slate-100 px-1.5 py-0.5 rounded">{'{{absentDates}}'}</code>,{' '}
          <code className="bg-slate-100 px-1.5 py-0.5 rounded">{'{{batchCode}}'}</code>,{' '}
          <code className="bg-slate-100 px-1.5 py-0.5 rounded">{'{{facultyName}}'}</code>
        </p>

        <textarea
          rows={3}
          value={whatsappTemplate}
          onChange={(e) => setWhatsappTemplate(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
        />

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
            WhatsApp Preview
          </span>
          {applySamplePlaceholders(whatsappTemplate)}
        </div>
      </div>

      {/* Email Notice Template */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-900">Gmail Follow-Up Template</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setEmailSubjectTemplate(DEFAULT_EMAIL_SUBJECT);
              setEmailBodyTemplate(DEFAULT_EMAIL_BODY);
            }}
            className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
          >
            Reset Default
          </button>
        </div>

        <p className="text-[11px] text-slate-500">
          Opens a pre-filled Gmail compose window using your active browser Google account (no App
          Password needed). Supports{' '}
          <code className="bg-slate-100 px-1.5 py-0.5 rounded">{'{{studentName}}'}</code>,{' '}
          <code className="bg-slate-100 px-1.5 py-0.5 rounded">{'{{absentDates}}'}</code>,{' '}
          <code className="bg-slate-100 px-1.5 py-0.5 rounded">{'{{batchCode}}'}</code>, and{' '}
          <code className="bg-slate-100 px-1.5 py-0.5 rounded">{'{{facultyName}}'}</code>.
        </p>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Email Subject</label>
          <input
            type="text"
            value={emailSubjectTemplate}
            onChange={(e) => setEmailSubjectTemplate(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Email Body</label>
          <textarea
            rows={5}
            value={emailBodyTemplate}
            onChange={(e) => setEmailBodyTemplate(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
            Gmail Compose Preview
          </span>
          <div className="font-semibold text-slate-900">
            Subject: {applySamplePlaceholders(emailSubjectTemplate)}
          </div>
          <div className="whitespace-pre-line text-slate-600">
            {applySamplePlaceholders(emailBodyTemplate)}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-lg cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
  );
}