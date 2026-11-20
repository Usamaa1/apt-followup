import { useState } from 'react';
import { Upload, CheckCircle2, FileSpreadsheet, AlertTriangle, Download } from 'lucide-react';
import { api } from '../context/AuthContext';

export default function ImportExportPage() {
  const [exportMonth, setExportMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [error, setError] = useState('');

  const handleExportWorkbook = () => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    window.open(`${baseUrl}/sync/export-xlsx?month=${exportMonth}`, '_blank');
  };

  const handlePreview = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError('');
    setResultMessage('');
    setPreview(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/excel/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to read Excel file.');
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!preview) return;
    setCommitting(true);
    setError('');
    try {
      const { data } = await api.post('/excel/commit', {
        batches: preview.batches,
        students: preview.students,
        absenteeAlerts: preview.absenteeAlerts,
      });
      setResultMessage(
        `${data.message} (${data.stats.batchesUpserted} batches, ${data.stats.studentsMerged} students merged, ${data.stats.followUpsCreated} weekly 2+ AB follow-ups queued).`
      );
      setPreview(null);
      setFile(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving imported data.');
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* One-Click Multi-Tab ExcelJS Export Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-600" />
            Export Formatted Follow-Up Workbook (.xlsx)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Generates the multi-tab Follow-Up Excel workbook with Week # 1–4 blocks, embedded Drive screenshots, and the <code>data</code> lookup tab.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="month"
            value={exportMonth}
            onChange={(e) => setExportMonth(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
          />
          <button
            type="button"
            onClick={handleExportWorkbook}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg cursor-pointer"
          >
            Download .xlsx
          </button>
        </div>
      </div>

      {/* Smart Multi-Format Excel Importer Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          Smart Multi-Format Excel Importer
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Upload <strong>Batch Roster / Contact Sheets</strong>, <strong>Aptrack Batches</strong>, or{' '}
          <strong>Manual Attendance Sheets</strong> (automatically detects 2+ AB absences per week and excludes Freeze students).
        </p>

        <form onSubmit={handlePreview} className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
          />
          <button
            type="submit"
            disabled={!file || loading}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-medium px-4 py-2.5 rounded-lg cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            {loading ? 'Analyzing Workbook...' : 'Preview File'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {resultMessage && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {resultMessage}
          </div>
        )}
      </div>

      {/* Live Preview Table */}
      {preview && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded bg-emerald-50 text-emerald-700">
                Format: {preview.detectedType.replace(/_/g, ' ')}
              </span>
              <p className="text-sm font-medium text-slate-900 mt-2">{preview.summary}</p>
            </div>

            <button
              onClick={handleCommit}
              disabled={committing}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-lg cursor-pointer"
            >
              {committing ? 'Importing to Database...' : 'Confirm & Import All'}
            </button>
          </div>

          {/* Preview Detected Batches */}
          {preview.batches.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-700 mb-2">
                Batches Detected ({preview.batches.length})
              </h4>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-2 px-3">Batch Code</th>
                      <th className="py-2 px-3">Timings</th>
                      <th className="py-2 px-3">Faculty</th>
                      <th className="py-2 px-3">Coordinator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.batches.slice(0, 15).map((b, i) => (
                      <tr key={i}>
                        <td className="py-2 px-3 font-semibold">{b.batchCode}</td>
                        <td className="py-2 px-3">{b.timings}</td>
                        <td className="py-2 px-3">{b.facultyName}</td>
                        <td className="py-2 px-3">{b.coordinatorName || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Preview 2+ AB Absentee Alerts (if Attendance Sheet) */}
          {preview.absenteeAlerts.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-amber-700 mb-2">
                Weekly Follow-Up Candidates (2+ Absences Detected: {preview.absenteeAlerts.length})
              </h4>
              <div className="overflow-x-auto border border-amber-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-amber-50 border-b border-amber-200 text-amber-900">
                    <tr>
                      <th className="py-2 px-3">Month / Week</th>
                      <th className="py-2 px-3">Batch</th>
                      <th className="py-2 px-3">Enrollment ID</th>
                      <th className="py-2 px-3">Student Name</th>
                      <th className="py-2 px-3">AB Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    {preview.absenteeAlerts.slice(0, 20).map((a, i) => (
                      <tr key={i}>
                        <td className="py-2 px-3">{a.month} (Week #{a.weekNumber})</td>
                        <td className="py-2 px-3 font-medium">{a.batchCode}</td>
                        <td className="py-2 px-3 font-mono text-[11px]">{a.enrollmentNo || 'No ID provided'}</td>
                        <td className="py-2 px-3">{a.studentName}</td>
                        <td className="py-2 px-3 font-semibold text-red-600">{a.abCount} AB</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Preview Students */}
          {preview.students.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-700 mb-2">
                Students Preview (Showing first 20 of {preview.students.length})
              </h4>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-2 px-3">Batch</th>
                      <th className="py-2 px-3">Enrollment ID</th>
                      <th className="py-2 px-3">Student Name</th>
                      <th className="py-2 px-3">Student Phone</th>
                      <th className="py-2 px-3">Parents Phone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.students.slice(0, 20).map((s, i) => (
                      <tr key={i}>
                        <td className="py-2 px-3 font-medium">{s.batchCode}</td>
                        <td className="py-2 px-3 font-mono text-[11px]">{s.enrollmentNo || 'No ID provided'}</td>
                        <td className="py-2 px-3">{s.studentName}</td>
                        <td className="py-2 px-3">{s.studentPhone || '—'}</td>
                        <td className="py-2 px-3">{s.parentsPhone || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}