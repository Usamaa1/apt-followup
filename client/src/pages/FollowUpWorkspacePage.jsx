import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Trash2,
  Send,
  Mail,
  Upload,
  CheckCircle2,
  RefreshCw,
  Download,
  RotateCcw,
  ExternalLink,
  Search,
  X,
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

const normalizeMark = (st) => {
  if (!st) return '';
  const u = st.toUpperCase();
  if (u === 'AB' || u === 'A') return 'A';
  if (u === 'P') return 'P';
  if (u === 'LV') return 'LV';
  return u;
};

function StudentSearchSelect({ selectedStudent, availableStudents, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 240 });
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const updateMenuPosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 240),
    });
  };

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();

    const handleClickOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(e.target))
      ) {
        setOpen(false);
        setQuery('');
      }
    };

    const handleReposition = () => updateMenuPosition();

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [open]);

  const filteredStudents = availableStudents.filter((stu) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const nameMatch = (stu.studentName || '').toLowerCase().includes(q);
    const idMatch = (stu.displayEnrollmentNo || '').toLowerCase().includes(q);
    return nameMatch || idMatch;
  });

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  const handleOpen = () => {
    updateMenuPosition();
    setOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handlePick = (studentId) => {
    onSelect(studentId);
    setOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) =>
        filteredStudents.length > 0 ? (prev + 1) % filteredStudents.length : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) =>
        filteredStudents.length > 0
          ? (prev - 1 + filteredStudents.length) % filteredStudents.length
          : 0
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredStudents[activeIndex]) {
        handlePick(filteredStudents[activeIndex]._id);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {!open ? (
        <div
          onClick={handleOpen}
          className="w-full border border-slate-300 hover:border-emerald-600 rounded px-2 py-1.5 text-xs bg-white flex items-center justify-between gap-1 cursor-pointer"
        >
          <span
            className={`truncate ${
              selectedStudent ? 'font-medium text-slate-900' : 'text-slate-400'
            }`}
          >
            {selectedStudent ? selectedStudent.studentName : '-- Search Name or ID --'}
          </span>

          <div className="flex items-center gap-1 shrink-0">
            {selectedStudent && (
              <button
                type="button"
                title="Clear student"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePick(null);
                }}
                className="text-slate-400 hover:text-red-600 p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <Search className="w-3 h-3 text-slate-400" />
          </div>
        </div>
      ) : (
        <div className="flex items-center border border-emerald-600 rounded px-2 py-1 bg-white shadow-2xs">
          <Search className="w-3 h-3 text-emerald-600 mr-1.5 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type name or ID..."
            className="w-full text-xs text-slate-900 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setQuery('');
            }}
            className="text-slate-400 hover:text-slate-700 ml-1 cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: `${menuPos.top}px`,
              left: `${menuPos.left}px`,
              width: `${menuPos.width}px`,
              zIndex: 9999,
            }}
            className="bg-white border border-slate-300 rounded-lg shadow-xl max-h-56 overflow-y-auto"
          >
            {filteredStudents.length === 0 ? (
              <div className="px-3 py-2.5 text-[11px] text-slate-400">
                No matching student in this batch
              </div>
            ) : (
              filteredStudents.map((stu, idx) => {
                const isSelected =
                  selectedStudent && String(selectedStudent._id) === String(stu._id);
                const isHighlighted = idx === activeIndex;
                return (
                  <button
                    key={stu._id}
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => handlePick(stu._id)}
                    className={`w-full text-left px-2.5 py-1.5 border-b border-slate-100 last:border-none text-xs cursor-pointer transition ${
                      isHighlighted
                        ? 'bg-emerald-50 text-emerald-950'
                        : isSelected
                        ? 'bg-slate-50 font-semibold'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-medium text-slate-900 truncate">{stu.studentName}</div>
                    <div className="text-[10px] font-mono text-slate-500">
                      {stu.displayEnrollmentNo}
                      {stu.studentPhone ? ` • ${stu.studentPhone}` : ''}
                    </div>
                  </button>
                );
              })
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

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

  // Cycles: '' -> 'A' -> 'P' -> 'LV' -> ''
  const handleToggleDayStatus = (row, dayIdx) => {
    const cycle = { '': 'A', A: 'P', AB: 'P', P: 'LV', LV: '' };
    const updatedDates = row.attendanceDates.map((d, idx) =>
      idx === dayIdx ? { ...d, status: cycle[d.status || ''] ?? 'A' } : d
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

  const getAbsentDatesText = (row) => {
    const abDates = (row.attendanceDates || [])
      .filter((d) => d.status === 'A' || d.status === 'AB')
      .map((d) => formatDisplayDate(d.date));

    return abDates.length > 0
      ? abDates.join(' and ')
      : (row.attendanceDates || []).map((d) => formatDisplayDate(d.date)).join(', ');
  };

  const interpolateTemplate = (template, row, batchCode) => {
    const facultyName = workspace?.activeFaculty?.displayName || user?.displayName || 'Faculty';
    return (template || '')
      .replace(/\{\{absentDates\}\}/g, getAbsentDatesText(row))
      .replace(/\{\{studentName\}\}/g, row.student?.studentName || '')
      .replace(/\{\{batchCode\}\}/g, batchCode || '')
      .replace(/\{\{facultyName\}\}/g, facultyName);
  };

  const buildWhatsAppUrl = (row, batchCode) => {
    if (!row.student || row.contactType === 'None') return null;
    const rawPhone =
      row.contactType === 'Parents'
        ? row.student.parentsPhone || row.dialedContact
        : row.student.studentPhone || row.dialedContact;

    const intlPhone = formatPakistanWhatsApp(rawPhone);
    if (!intlPhone) return null;

    const template =
      workspace?.activeFaculty?.whatsappTemplate ||
      'Why are you absent on {{absentDates}}? Please tell the reason';

    const message = interpolateTemplate(template, row, batchCode);
    return `https://wa.me/${intlPhone}?text=${encodeURIComponent(message)}`;
  };

  const buildGmailComposeUrl = (row, batchCode) => {
    const email = (row.student?.email || '').trim();
    if (!email) return null;

    const subjectTemplate =
      workspace?.activeFaculty?.emailSubjectTemplate ||
      'Attendance Follow-Up ({{batchCode}}) - {{studentName}}';

    const bodyTemplate =
      workspace?.activeFaculty?.emailBodyTemplate ||
      'Dear {{studentName}},\n\nYou were marked absent in batch {{batchCode}} on {{absentDates}}. Please share the reason for your absence at your earliest convenience.\n\nRegards,\n{{facultyName}}';

    const subject = interpolateTemplate(subjectTemplate, row, batchCode);
    const body = interpolateTemplate(bodyTemplate, row, batchCode);

    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      email
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

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
      {/* Clean Minimal Portal Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white"
          />

          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            {[1, 2, 3, 4].map((w) => (
              <button
                key={w}
                onClick={() => setWeekNumber(w)}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                  weekNumber === w
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Week # {w}
              </button>
            ))}
          </div>
        </div>

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

      {/* Clean Minimal Web Batch Cards */}
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
            const usedStudentIds = new Set(
              rows.filter((r) => r.studentId).map((r) => String(r.studentId))
            );

            return (
              <div
                key={batch._id}
                className="bg-white border border-slate-200 rounded-xl overflow-visible shadow-2xs"
              >
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 rounded-t-xl">
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <span className="font-semibold text-slate-900">
                      Batch: <span className="text-emerald-700">{batch.batchCode}</span>
                    </span>
                    <span className="text-slate-600">{batch.timings}</span>
                    <span className="text-slate-500">
                      Coordinator:{' '}
                      <strong className="text-slate-700">{batch.coordinatorName || '—'}</strong>
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

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="py-2 px-2.5 border-r border-slate-200 w-10">S.#</th>
                        <th className="py-2 px-2.5 border-r border-slate-200 min-w-[130px]">
                          Enrollment ID
                        </th>
                        <th className="py-2 px-2.5 border-r border-slate-200 min-w-[215px]">
                          Student Name
                        </th>
                        {weekDates.map((d) => (
                          <th
                            key={d}
                            className="py-2 px-2 border-r border-slate-200 text-center min-w-[74px] text-slate-700"
                          >
                            {formatDisplayDate(d).slice(0, 5)}
                          </th>
                        ))}
                        <th className="py-2 px-2.5 border-r border-slate-200 min-w-[180px]">
                          Faculty Remarks
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
                        <th className="py-2 px-2.5 border-r border-slate-200 min-w-[285px]">
                          WhatsApp, Email &amp; Contact
                        </th>
                        <th className="py-2 px-2.5 border-r border-slate-200 min-w-[150px]">
                          Coordinator Remarks
                        </th>
                        <th className="py-2 px-2.5 border-r border-slate-200 min-w-[130px]">
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
                        const mailUrl = buildGmailComposeUrl(row, batch.batchCode);
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

                            <td className="py-2 px-2.5 border-r border-slate-200 font-mono text-[11px] text-slate-700 bg-slate-50/40">
                              {row.student ? row.student.displayEnrollmentNo : '—'}
                            </td>

                            {/* Searchable Student Name & ID Combobox */}
                            <td className="py-1.5 px-2 border-r border-slate-200">
                              <StudentSearchSelect
                                selectedStudent={row.student}
                                availableStudents={availableStudents}
                                onSelect={(newStudentId) =>
                                  handleRowPatch(row._id, { studentId: newStudentId || null })
                                }
                              />
                              {row.student?.email && (
                                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                  {row.student.email}
                                </div>
                              )}
                            </td>

                            {(row.attendanceDates || []).map((dayObj, dIdx) => {
                              const mark = normalizeMark(dayObj.status);
                              return (
                                <td
                                  key={dayObj.date}
                                  className="py-1.5 px-1.5 border-r border-slate-200 text-center"
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleToggleDayStatus(row, dIdx)}
                                    title="Click to cycle: A -> P -> LV -> Blank"
                                    className={`w-11 py-1 rounded text-[11px] font-bold border cursor-pointer transition ${
                                      mark === 'A'
                                        ? 'bg-red-50 text-red-700 border-red-200'
                                        : mark === 'P'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : mark === 'LV'
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'
                                    }`}
                                  >
                                    {mark || '—'}
                                  </button>
                                </td>
                              );
                            })}

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

                            {/* WhatsApp + Gmail Quick Action Buttons */}
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

                                {mailUrl && (
                                  <a
                                    href={mailUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    title={`Send Gmail to ${row.student.email}`}
                                    className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-[11px] font-medium shrink-0"
                                  >
                                    <Mail className="w-3 h-3" />
                                    Email
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

      {/* Bottom Faculty Sheet Tabs */}
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