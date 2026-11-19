import { useEffect, useState } from 'react';
import {
  Plus,
  Trash2,
  Send,
  Upload,
  CheckCircle2,
  RefreshCw,
  Download,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import { api, useAuth } from '../context/AuthContext';

const formatPakistanWhatsApp = (rawPhone) => {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('92')) return digits;
  if (digits.startsWith('0')) return `92${digits.slice(1)}`;
  return `92${digits}`;
};

const formatDisplayDate = (isoDate) => {
  if (!isoDate || !isoDate.includes('-')) return isoDate;
  const [y, m, d] = isoDate.split('-');
  return `${d}-${m}-${y}`;
};

export default function FollowUpWorkspacePage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [weekNumber, setWeekNumber] = useState(1);
  const [selectedFacultyId, setSelectedFacultyId] = useState('');

  const [workspace, setWorkspace] = useState(null);
  const [lookups, setLookups] = useState({ mediums: [], facultyPhones: [], coordinators: [] });
  const [loading, setLoading] = useState(true);
  const [uploadingRowId, setUploadingRowId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [bannerMsg, setBannerMsg] = useState('');

  const loadWorkspace = async (m = month, w = weekNumber, facId = selectedFacultyId) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month: m, week: String(w) });
      if (facId) params.set('facultyId', facId);
      const [wsRes, lkRes] = await Promise.all([
        api.get(`/followup/workspace?${params.toString()}`),
        api.get('/admin/lookups'),
      ]);
      setWorkspace(wsRes.data);
      setLookups(lkRes.data.lookups);
      if (!facId && wsRes.data.activeFaculty?._id) {
        setSelectedFacultyId(wsRes.data.activeFaculty._id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspace(month, weekNumber, selectedFacultyId);
  }, [month, weekNumber, selectedFacultyId]);

  const handleRowPatch = async (rowId, patch) => {
    const { data } = await api.patch(`/followup/rows/${rowId}`, patch);
    setWorkspace((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        batchSections: prev.batchSections.map((sec) => ({
          ...sec,
          rows: sec.rows.map((r) => (r._id === rowId ? data.row : r)),
        })),
      };
    });
  };

  const handleToggleDayStatus = (row, dayIdx) => {
    const cycle = { '': 'AB', AB: 'P', P: '' };
    const updatedDates = row.attendanceDates.map((d, idx) =>
      idx === dayIdx ? { ...d, status: cycle[d.status || ''] } : d
    );
    handleRowPatch(row._id, { attendanceDates: updatedDates });
  };

  const handleAddRow = async (batchId) => {
    const { data } = await api.post('/followup/rows', { month, weekNumber, batchId });
    setWorkspace((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        batchSections: prev.batchSections.map((sec) =>
          sec.batch._id === batchId ? { ...sec, rows: [...sec.rows, data.row] } : sec
        ),
      };
    });
  };

  const handleDeleteRow = async (batchId, rowId) => {
    await api.delete(`/followup/rows/${rowId}`);
    setWorkspace((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        batchSections: prev.batchSections.map((sec) =>
          sec.batch._id === batchId
            ? { ...sec, rows: sec.rows.filter((r) => r._id !== rowId) }
            : sec
        ),
      };
    });
  };

  const handleScreenshotUpload = async (rowId, file) => {
    if (!file) return;
    setUploadingRowId(rowId);
    try {
      const formData = new FormData();
      formData.append('screenshot', file);
      const { data } = await api.post(`/followup/rows/${rowId}/screenshot`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setWorkspace((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          batchSections: prev.batchSections.map((sec) => ({
            ...sec,
            rows: sec.rows.map((r) =>
              r._id === rowId
                ? {
                    ...r,
                    screenshotDriveFileId: data.screenshotDriveFileId,
                    screenshotDriveUrl: data.screenshotDriveUrl,
                  }
                : r
            ),
          })),
        };
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Screenshot upload failed.');
    } finally {
      setUploadingRowId(null);
    }
  };

  const buildWhatsAppUrl = (row, batchCode) => {
    if (!row.student || row.contactType === 'None') return null;
    const rawPhone =
      row.contactType === 'Parents'
        ? row.student.parentsPhone || row.dialedContact
        : row.student.studentPhone || row.dialedContact;

    const intlPhone = formatPakistanWhatsApp(rawPhone);
    if (!intlPhone) return null;

    const abDates = (row.attendanceDates || [])
      .filter((d) => d.status === 'AB')
      .map((d) => formatDisplayDate(d.date));

    const absentDatesText =
      abDates.length > 0
        ? abDates.join(' and ')
        : (row.attendanceDates || []).map((d) => formatDisplayDate(d.date)).join(', ');

    const template =
      workspace?.activeFaculty?.whatsappTemplate ||
      'Why are you absent on {{absentDates}}? Please tell the reason';

    const message = template
      .replace(/\{\{absentDates\}\}/g, absentDatesText)
      .replace(/\{\{studentName\}\}/g, row.student.studentName)
      .replace(/\{\{batchCode\}\}/g, batchCode);

    return `https://wa.me/${intlPhone}?text=${encodeURIComponent(message)}`;
  };

  // Phase 4 Action Handlers (wired to Phase 4 endpoints)
  const handleManualGoogleSheetSync = async () => {
    setSyncing(true);
    setBannerMsg('');
    try {
      const { data } = await api.post('/sync/google-sheet', {
        month,
        facultyId: selectedFacultyId,
      });
      setBannerMsg(data.message);
      loadWorkspace(month, weekNumber, selectedFacultyId);
    } catch (err) {
      setBannerMsg(err.response?.data?.message || 'Google Sheet sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  const handleExportExcel = () => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const params = new URLSearchParams({ month });
    if (selectedFacultyId) params.set('facultyId', selectedFacultyId);
    window.open(`${baseUrl}/sync/export-xlsx?${params.toString()}`, '_blank');
  };

  const handleWipeMonth = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to wipe all follow-up records for ${month} and start fresh? (Students and Batches will NOT be deleted.)`
    );
    if (!confirmed) return;
    try {
      const { data } = await api.delete(`/sync/wipe-month?month=${month}`);
      setBannerMsg(data.message);
      loadWorkspace(month, weekNumber, selectedFacultyId);
    } catch (err) {
      setBannerMsg(err.response?.data?.message || 'Failed to wipe month data.');
    }
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Top Spreadsheet Toolbar: Month, Week # 1-4 Tabs, Sync & Export Actions */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Picker */}
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white"
          />

          {/* Excel-Style Week # 1 - 4 Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            {[1, 2, 3, 4].map((w) => (
              <button
                key={w}
                onClick={() => setWeekNumber(w)}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                  weekNumber === w
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Week # {w}
              </button>
            ))}
          </div>
        </div>

        {/* Manual Sync, ExcelJS Export & Wipe Month Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleManualGoogleSheetSync}
            disabled={syncing}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-medium px-3.5 py-2 rounded-lg cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync to Google Sheet'}
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-3.5 py-2 rounded-lg cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export .xlsx
          </button>

          <button
            onClick={handleWipeMonth}
            title="Clear old month follow-ups and start fresh"
            className="flex items-center gap-1.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium px-3 py-2 rounded-lg cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Wipe Month
          </button>
        </div>
      </div>

      {bannerMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
          {bannerMsg}
        </div>
      )}

      {/* Main Excel-Style Batch Tables */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-xs text-slate-500">
          Loading Week # {weekNumber} Follow-Up Sheet...
        </div>
      ) : !workspace || workspace.batchSections.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
          <p className="text-sm font-medium text-slate-800">
            No active batches assigned to {workspace?.activeFaculty?.displayName || 'this account'}.
          </p>
          <p className="text-xs text-slate-500">
            Import your Batch Roster in <strong>Excel Import / Export</strong> or assign batches in{' '}
            <strong>Batches &amp; Students</strong>.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {workspace.batchSections.map(({ batch, weekDates, students, rows }) => {
            // Filter out students already selected in another row of this batch/week
            const usedStudentIds = new Set(
              rows.filter((r) => r.studentId).map((r) => String(r.studentId))
            );

            return (
              <div
                key={batch._id}
                className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-2xs"
              >
                {/* Batch Header Strip (Mirrors Excel Batch Banner) */}
                <div className="bg-slate-100 border-b border-slate-300 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <span className="font-bold text-slate-900">
                      Batch: <span className="text-emerald-700">{batch.batchCode}</span>
                    </span>
                    <span className="text-slate-700 font-medium">{batch.timings}</span>
                    <span className="text-slate-600">
                      Coordinator: <strong>{batch.coordinatorName || '—'}</strong>
                    </span>
                  </div>

                  <button
                    onClick={() => handleAddRow(batch._id)}
                    className="flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-900 bg-white border border-slate-300 px-2.5 py-1 rounded-md cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Student Row
                  </button>
                </div>

                {/* Excel-Like Grid Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-300 text-slate-700 font-semibold">
                        <th className="py-2 px-2.5 border-r border-slate-200 w-10">S.#</th>
                        <th className="py-2 px-2.5 border-r border-slate-200 min-w-[130px]">
                          Enrollment ID
                        </th>
                        <th className="py-2 px-2.5 border-r border-slate-200 min-w-[190px]">
                          Student Name
                        </th>
                        {weekDates.map((d) => (
                          <th
                            key={d}
                            className="py-2 px-2 border-r border-slate-200 text-center min-w-[78px] bg-amber-50/60"
                          >
                            {formatDisplayDate(d).slice(0, 5)}
                          </th>
                        ))}
                        <th className="py-2 px-2.5 border-r border-slate-200 min-w-[180px]">
                          Faculty Remarks / Reason
                        </th>
                        <th className="py-2 px-2.5 border-r border-slate-200 min-w-[125px]">
                          Follow-Up Date
                        </th>
                        <th className="py-2 px-2.5 border-r border-slate-200 min-w-[140px]">
                          Medium
                        </th>
                        <th className="py-2 px-2.5 border-r border-slate-200 min-w-[165px]">
                          Faculty Phone
                        </th>
                        <th className="py-2 px-2.5 border-r border-slate-200 min-w-[235px]">
                          WhatsApp &amp; Dialed Contact
                        </th>
                        <th className="py-2 px-2.5 border-r border-slate-200 min-w-[150px]">
                          Coordinator Remarks
                        </th>
                        <th className="py-2 px-2.5 border-r border-slate-200 min-w-[135px]">
                          ScreenShot
                        </th>
                        <th className="py-2 px-2.5 border-r border-slate-200 text-center w-20">
                          Verified
                        </th>
                        <th className="py-2 px-2 text-center w-10"></th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200">
                      {rows.map((row, idx) => {
                        const waUrl = buildWhatsAppUrl(row, batch.batchCode);
                        const availableStudents = students.filter(
                          (s) =>
                            !usedStudentIds.has(String(s._id)) ||
                            String(s._id) === String(row.studentId)
                        );

                        return (
                          <tr key={row._id} className="hover:bg-slate-50/80 align-middle">
                            <td className="py-2 px-2.5 border-r border-slate-200 text-slate-400">
                              {idx + 1}
                            </td>

                            {/* Auto-filled Enrollment ID ("No ID provided" if missing) */}
                            <td className="py-2 px-2.5 border-r border-slate-200 font-mono text-[11px] text-slate-700 bg-slate-50/50">
                              {row.student ? row.student.displayEnrollmentNo : '—'}
                            </td>

                            {/* Student Selector Dropdown (Auto-fills ID, Contacts, Email) */}
                            <td className="py-1.5 px-2 border-r border-slate-200">
                              <select
                                value={row.studentId || ''}
                                onChange={(e) =>
                                  handleRowPatch(row._id, { studentId: e.target.value || null })
                                }
                                className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs font-medium text-slate-900 bg-white"
                              >
                                <option value="">-- Select Student --</option>
                                {availableStudents.map((stu) => (
                                  <option key={stu._id} value={stu._id}>
                                    {stu.studentName} ({stu.displayEnrollmentNo})
                                  </option>
                                ))}
                              </select>
                              {row.student?.email && (
                                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                  {row.student.email}
                                </div>
                              )}
                            </td>

                            {/* 3 Weekly Attendance Status Toggle Cells (AB / P / Empty) */}
                            {(row.attendanceDates || []).map((dayObj, dIdx) => (
                              <td
                                key={dayObj.date}
                                className="py-1.5 px-1.5 border-r border-slate-200 text-center"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleToggleDayStatus(row, dIdx)}
                                  className={`w-12 py-1 rounded text-[11px] font-bold border cursor-pointer transition ${
                                    dayObj.status === 'AB'
                                      ? 'bg-red-100 text-red-700 border-red-300'
                                      : dayObj.status === 'P'
                                      ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                                      : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'
                                  }`}
                                >
                                  {dayObj.status || '—'}
                                </button>
                              </td>
                            ))}

                            {/* Faculty Remarks */}
                            <td className="py-1.5 px-2 border-r border-slate-200">
                              <input
                                type="text"
                                defaultValue={row.facultyRemarks}
                                onBlur={(e) => {
                                  if (e.target.value !== row.facultyRemarks) {
                                    handleRowPatch(row._id, { facultyRemarks: e.target.value });
                                  }
                                }}
                                placeholder="Reason / remarks..."
                                className="w-full border border-slate-200 focus:border-emerald-600 rounded px-2 py-1 text-xs focus:outline-none"
                              />
                            </td>

                            {/* Follow-Up Date */}
                            <td className="py-1.5 px-2 border-r border-slate-200">
                              <input
                                type="date"
                                value={row.followUpDate || ''}
                                onChange={(e) =>
                                  handleRowPatch(row._id, { followUpDate: e.target.value })
                                }
                                className="w-full border border-slate-200 rounded px-1.5 py-1 text-xs"
                              />
                            </td>

                            {/* Medium Dropdown */}
                            <td className="py-1.5 px-2 border-r border-slate-200">
                              <select
                                value={row.medium || ''}
                                onChange={(e) => handleRowPatch(row._id, { medium: e.target.value })}
                                className="w-full border border-slate-200 rounded px-2 py-1 text-xs bg-white"
                              >
                                <option value="">Select...</option>
                                {lookups.mediums.map((m) => (
                                  <option key={m} value={m}>
                                    {m}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Faculty Phone Dropdown */}
                            <td className="py-1.5 px-2 border-r border-slate-200">
                              <select
                                value={row.facultyPhone || ''}
                                onChange={(e) =>
                                  handleRowPatch(row._id, { facultyPhone: e.target.value })
                                }
                                className="w-full border border-slate-200 rounded px-2 py-1 text-xs bg-white"
                              >
                                <option value="">Select...</option>
                                {lookups.facultyPhones.map((p) => (
                                  <option key={p} value={p}>
                                    {p}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Default "No WhatsApp Message" + Student/Parents Contact + wa.me Button */}
                            <td className="py-1.5 px-2 border-r border-slate-200">
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={row.contactType || 'None'}
                                  onChange={(e) =>
                                    handleRowPatch(row._id, { contactType: e.target.value })
                                  }
                                  className="border border-slate-300 rounded px-1.5 py-1 text-[11px] bg-white font-medium"
                                >
                                  <option value="None">No WhatsApp Message</option>
                                  <option value="Student">Student Contact</option>
                                  <option value="Parents">Parents Contact</option>
                                </select>

                                {waUrl && (
                                  <a
                                    href={waUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Send WhatsApp Notice"
                                    className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-[11px] font-medium shrink-0"
                                  >
                                    <Send className="w-3 h-3" />
                                    WA
                                  </a>
                                )}
                              </div>
                              {row.student && (
                                <div className="text-[11px] text-slate-600 mt-1 font-mono">
                                  {row.contactType === 'Parents'
                                    ? `P: ${row.student.parentsPhone || 'N/A'}`
                                    : `S: ${row.student.studentPhone || 'N/A'}`}
                                </div>
                              )}
                            </td>

                            {/* Coordinator Remarks */}
                            <td className="py-1.5 px-2 border-r border-slate-200">
                              <input
                                type="text"
                                defaultValue={row.coordinatorRemarks}
                                onBlur={(e) => {
                                  if (e.target.value !== row.coordinatorRemarks) {
                                    handleRowPatch(row._id, {
                                      coordinatorRemarks: e.target.value,
                                    });
                                  }
                                }}
                                placeholder="Coordinator note..."
                                className="w-full border border-slate-200 rounded px-2 py-1 text-xs"
                              />
                            </td>

                            {/* Google Drive Screenshot Upload / Preview */}
                            <td className="py-1.5 px-2 border-r border-slate-200">
                              {row.screenshotDriveUrl ? (
                                <div className="flex items-center gap-2">
                                  <a
                                    href={row.screenshotDriveUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:underline"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    View Proof
                                  </a>
                                  <label className="text-[10px] text-slate-400 hover:text-slate-700 cursor-pointer underline">
                                    Replace
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) =>
                                        handleScreenshotUpload(row._id, e.target.files?.[0])
                                      }
                                    />
                                  </label>
                                </div>
                              ) : (
                                <label className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900 border border-dashed border-slate-300 rounded px-2 py-1 cursor-pointer">
                                  <Upload className="w-3 h-3" />
                                  {uploadingRowId === row._id ? 'Uploading...' : 'Attach'}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={uploadingRowId === row._id}
                                    onChange={(e) =>
                                      handleScreenshotUpload(row._id, e.target.files?.[0])
                                    }
                                  />
                                </label>
                              )}
                            </td>

                            {/* Manager Verification (Admin Toggleable, Read-Only Badge for Staff) */}
                            <td className="py-1.5 px-2 border-r border-slate-200 text-center">
                              {user?.role === 'admin' ? (
                                <input
                                  type="checkbox"
                                  checked={Boolean(row.managerVerified)}
                                  onChange={(e) =>
                                    handleRowPatch(row._id, {
                                      managerVerified: e.target.checked,
                                    })
                                  }
                                  className="w-4 h-4 accent-emerald-600 cursor-pointer"
                                />
                              ) : row.managerVerified ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                              ) : (
                                <span className="text-[11px] text-slate-400">Pending</span>
                              )}
                            </td>

                            {/* Delete Row */}
                            <td className="py-1.5 px-1.5 text-center">
                              {rows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(batch._id, row._id)}
                                  title="Remove Row"
                                  className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Excel-Style Faculty Sheet Tabs (Admin switches between Faculty Sheets) */}
      {workspace?.facultyTabs && workspace.facultyTabs.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-100 border-t border-slate-300 px-4 py-1.5 flex items-center gap-1 overflow-x-auto z-20">
          <span className="text-[11px] font-semibold text-slate-500 mr-2 shrink-0">
            Sheet Tabs:
          </span>
          {workspace.facultyTabs.map((tab) => {
            const isSelected = String(tab._id) === String(selectedFacultyId);
            return (
              <button
                key={tab._id}
                onClick={() => setSelectedFacultyId(tab._id)}
                className={`px-3.5 py-1 rounded-t-md text-xs font-medium border transition shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-white text-emerald-700 border-slate-300 border-b-white font-semibold shadow-2xs'
                    : 'bg-slate-200/70 text-slate-600 border-transparent hover:bg-slate-200'
                }`}
              >
                {tab.displayName || tab.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}