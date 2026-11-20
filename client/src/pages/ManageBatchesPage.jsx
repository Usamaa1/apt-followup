import { useEffect, useState } from 'react';
import {
  Search,
  UserPlus,
  ArrowRightLeft,
  Plus,
  Pencil,
  Trash2,
  Settings2,
} from 'lucide-react';
import { api, useAuth } from '../context/AuthContext';

export default function ManageBatchesPage() {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [students, setStudents] = useState([]);
  const [coordinatorsList, setCoordinatorsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Auto-fill search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedExisting, setSelectedExisting] = useState(null);
  const [editingStudentId, setEditingStudentId] = useState(null);

  // Student form state
  const [form, setForm] = useState({
    enrollmentNo: '',
    studentName: '',
    studentPhone: '',
    parentsPhone: '',
    email: '',
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Batch Create / Edit Panel State
  const [batchPanelMode, setBatchPanelMode] = useState(null); // null | 'create' | 'edit'
  const [batchForm, setBatchForm] = useState({
    batchCode: '',
    scheduleType: 'MWF',
    timings: 'MWF (9 - 11)',
    facultyName: '',
    coordinatorName: '',
    courseTitle: '',
    status: 'Ongoing',
  });
  const [savingBatch, setSavingBatch] = useState(false);

  const loadBatches = async (preserveId = selectedBatchId) => {
    setLoading(true);
    try {
      const [batchRes, lookupRes] = await Promise.all([
        api.get('/portal/batches'),
        api.get('/admin/lookups'),
      ]);
      setBatches(batchRes.data.batches);
      setCoordinatorsList(lookupRes.data.lookups?.coordinators || []);

      if (batchRes.data.batches.length > 0) {
        const exists = batchRes.data.batches.some((b) => b._id === preserveId);
        setSelectedBatchId(exists ? preserveId : batchRes.data.batches[0]._id);
      } else {
        setSelectedBatchId('');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadBatchStudents = async (batchId) => {
    if (!batchId) {
      setStudents([]);
      return;
    }
    const { data } = await api.get(`/portal/batches/${batchId}/students`);
    setStudents(data.students);
  };

  useEffect(() => {
    loadBatches();
  }, []);

  useEffect(() => {
    if (selectedBatchId) {
      resetForm();
      setBatchPanelMode(null);
      loadBatchStudents(selectedBatchId);
    }
  }, [selectedBatchId]);

  // Live search across all batches for auto-fill / batch transfer
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      const { data } = await api.get(`/portal/students/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(data.students);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const activeBatch = batches.find((b) => b._id === selectedBatchId);

  const openCreateBatch = () => {
    setBatchPanelMode(batchPanelMode === 'create' ? null : 'create');
    setBatchForm({
      batchCode: '',
      scheduleType: 'MWF',
      timings: 'MWF (9 - 11)',
      facultyName: user?.displayName || user?.name || '',
      coordinatorName: '',
      courseTitle: '',
      status: 'Ongoing',
    });
  };

  const openEditBatch = () => {
    if (!activeBatch) return;
    if (batchPanelMode === 'edit') {
      setBatchPanelMode(null);
      return;
    }
    setBatchPanelMode('edit');
    setBatchForm({
      batchCode: activeBatch.batchCode || '',
      scheduleType: activeBatch.scheduleType || 'MWF',
      timings: activeBatch.timings || '',
      facultyName: activeBatch.facultyName || '',
      coordinatorName: activeBatch.coordinatorName || '',
      courseTitle: activeBatch.courseTitle || '',
      status: activeBatch.status || 'Ongoing',
    });
  };

  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    setSavingBatch(true);
    setFeedback('');
    try {
      if (batchPanelMode === 'edit' && activeBatch) {
        const { data } = await api.patch(`/portal/batches/${activeBatch._id}`, batchForm);
        setFeedback(data.message);
        setBatchPanelMode(null);
        await loadBatches(activeBatch._id);
      } else {
        const { data } = await api.post('/portal/batches', batchForm);
        setFeedback(`Created batch ${data.batch.batchCode}.`);
        setBatchPanelMode(null);
        await loadBatches(data.batch._id);
      }
    } catch (err) {
      setFeedback(err.response?.data?.message || 'Failed to save batch details.');
    } finally {
      setSavingBatch(false);
    }
  };

  const handleDeleteBatch = async () => {
    if (!activeBatch) return;
    const ok = window.confirm(
      `Delete batch "${activeBatch.batchCode}"? Students in this batch will be unassigned (not deleted).`
    );
    if (!ok) return;
    try {
      const { data } = await api.delete(`/portal/batches/${activeBatch._id}`);
      setFeedback(data.message);
      setBatchPanelMode(null);
      await loadBatches('');
    } catch (err) {
      setFeedback(err.response?.data?.message || 'Failed to delete batch.');
    }
  };

  const handlePickExistingStudent = (stu) => {
    setEditingStudentId(null);
    setSelectedExisting(stu);
    setForm({
      enrollmentNo: stu.enrollmentNo || '',
      studentName: stu.studentName || '',
      studentPhone: stu.studentPhone || '',
      parentsPhone: stu.parentsPhone || '',
      email: stu.email || '',
    });
    setSearchQuery('');
    setSearchResults([]);
    setFeedback(
      `Auto-filled ${stu.studentName} (currently in ${stu.currentBatchId?.batchCode || 'N/A'}). Ready to transfer.`
    );
  };

  const handleStartEditStudent = (stu) => {
    setSelectedExisting(null);
    setEditingStudentId(stu._id);
    setForm({
      enrollmentNo: stu.enrollmentNo || '',
      studentName: stu.studentName || '',
      studentPhone: stu.studentPhone || '',
      parentsPhone: stu.parentsPhone || '',
      email: stu.email || '',
    });
    setFeedback(`Editing ${stu.studentName}. Update the fields below and click Save Changes.`);
  };

  const handleDeleteStudent = async (stu) => {
    const ok = window.confirm(
      `Are you sure you want to delete "${stu.studentName}" from this batch?`
    );
    if (!ok) return;
    try {
      const { data } = await api.delete(`/portal/students/${stu._id}`);
      if (editingStudentId === stu._id) resetForm();
      setFeedback(data.message);
      loadBatchStudents(selectedBatchId);
    } catch (err) {
      setFeedback(err.response?.data?.message || 'Failed to delete student.');
    }
  };

  const resetForm = () => {
    setSelectedExisting(null);
    setEditingStudentId(null);
    setForm({
      enrollmentNo: '',
      studentName: '',
      studentPhone: '',
      parentsPhone: '',
      email: '',
    });
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBatchId) return;
    setSaving(true);
    setFeedback('');
    try {
      if (editingStudentId) {
        await api.patch(`/portal/students/${editingStudentId}`, form);
        setFeedback(`Updated ${form.studentName} successfully.`);
      } else {
        const { data } = await api.post('/portal/students/assign-or-transfer', {
          existingStudentId: selectedExisting?._id || null,
          targetBatchId: selectedBatchId,
          ...form,
        });
        setFeedback(data.message);
      }
      resetForm();
      loadBatchStudents(selectedBatchId);
    } catch (err) {
      setFeedback(err.response?.data?.message || 'Error saving student.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Batch Selector & Batch Edit Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Select Batch:
          </label>
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 bg-white min-w-[260px]"
          >
            {batches.length === 0 && (
              <option value="">No batches found — import or create one</option>
            )}
            {batches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.batchCode} — {b.timings} ({b.facultyName})
              </option>
            ))}
          </select>

          {activeBatch && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-md">
                Schedule: <strong className="text-slate-800">{activeBatch.scheduleType}</strong>
              </span>
              <span className="text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-md">
                Coordinator:{' '}
                <strong className="text-slate-800">{activeBatch.coordinatorName || 'Not set'}</strong>
              </span>
              <span
                className={`px-2.5 py-1.5 rounded-md font-medium ${
                  activeBatch.status === 'Ongoing'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                {activeBatch.status}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeBatch && (
            <button
              type="button"
              onClick={openEditBatch}
              className="flex items-center gap-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 px-3.5 py-2 rounded-lg hover:bg-blue-100 cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5" />
              Edit Batch Info
            </button>
          )}

          {user?.role === 'admin' && (
            <>
              <button
                type="button"
                onClick={openCreateBatch}
                className="flex items-center gap-1.5 text-xs font-medium bg-slate-900 text-white px-3.5 py-2 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                New Batch
              </button>

              {activeBatch && (
                <button
                  type="button"
                  onClick={handleDeleteBatch}
                  title="Delete Batch"
                  className="flex items-center gap-1 text-xs font-medium bg-red-50 text-red-700 border border-red-200 px-3 py-2 rounded-lg hover:bg-red-100 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create / Edit Batch Panel */}
      {batchPanelMode && (
        <form
          onSubmit={handleBatchSubmit}
          className="bg-white border border-slate-300 rounded-xl p-5 space-y-4 shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              {batchPanelMode === 'edit'
                ? `Edit Batch Details — ${activeBatch?.batchCode}`
                : 'Create New Batch'}
            </h3>
            <button
              type="button"
              onClick={() => setBatchPanelMode(null)}
              className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Batch Code *</label>
              <input
                required
                placeholder="e.g. 2608C1"
                value={batchForm.batchCode}
                onChange={(e) => setBatchForm({ ...batchForm, batchCode: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Days Group (Schedule) *
              </label>
              <select
                value={batchForm.scheduleType}
                onChange={(e) => {
                  const nextType = e.target.value;
                  const updatedTimings = batchForm.timings.replace(/^(MWF|TTS)/i, nextType);
                  setBatchForm({
                    ...batchForm,
                    scheduleType: nextType,
                    timings: updatedTimings,
                  });
                }}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
              >
                <option value="MWF">MWF (Mon / Wed / Fri)</option>
                <option value="TTS">TTS (Tue / Thu / Sat)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Batch Timings *
              </label>
              <input
                required
                placeholder="e.g. MWF (11 - 1) or TTS (5 - 7)"
                value={batchForm.timings}
                onChange={(e) => setBatchForm({ ...batchForm, timings: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Coordinator Name
              </label>
              <input
                list="coordinatorOptions"
                placeholder="e.g. Miss Munazzah Khan"
                value={batchForm.coordinatorName}
                onChange={(e) => setBatchForm({ ...batchForm, coordinatorName: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
              />
              <datalist id="coordinatorOptions">
                {coordinatorsList.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Faculty Name</label>
              <input
                required
                disabled={user?.role !== 'admin' && batchPanelMode === 'edit'}
                placeholder="Miss Urooj Rehman"
                value={batchForm.facultyName}
                onChange={(e) => setBatchForm({ ...batchForm, facultyName: e.target.value })}
                className="w-full border border-slate-300 disabled:bg-slate-100 rounded-lg px-3 py-2 text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Course / Track Title
              </label>
              <input
                placeholder="e.g. ACCP AI / HDSE"
                value={batchForm.courseTitle}
                onChange={(e) => setBatchForm({ ...batchForm, courseTitle: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Batch Status</label>
              <select
                value={batchForm.status}
                onChange={(e) => setBatchForm({ ...batchForm, status: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
              >
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
                <option value="Merged">Merged</option>
                <option value="Dissolved">Dissolved</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setBatchPanelMode(null)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingBatch}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2 rounded-lg cursor-pointer"
            >
              {savingBatch
                ? 'Saving...'
                : batchPanelMode === 'edit'
                ? 'Update Batch Info'
                : 'Create Batch'}
            </button>
          </div>
        </form>
      )}

      {feedback && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Add, Transfer, or Edit Student */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 h-fit">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              {editingStudentId ? (
                <>
                  <Pencil className="w-4 h-4 text-blue-600" />
                  Edit Student Details
                </>
              ) : selectedExisting ? (
                <>
                  <ArrowRightLeft className="w-4 h-4 text-amber-600" />
                  Transfer Student to {activeBatch?.batchCode}
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 text-emerald-600" />
                  Add or Transfer Student
                </>
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {editingStudentId
                ? 'Correct any missing or wrong values below and save.'
                : 'Search an existing student to auto-fill & transfer, click Edit on a row, or add a new student.'}
            </p>
          </div>

          {!editingStudentId && (
            <div className="relative">
              <div className="flex items-center border border-slate-300 rounded-lg px-3 py-2 bg-slate-50">
                <Search className="w-4 h-4 text-slate-400 mr-2" />
                <input
                  type="text"
                  placeholder="Search existing student by Name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs focus:outline-none"
                />
              </div>

              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-56 overflow-y-auto">
                  {searchResults.map((stu) => (
                    <button
                      key={stu._id}
                      type="button"
                      onClick={() => handlePickExistingStudent(stu)}
                      className="w-full text-left px-3 py-2 hover:bg-emerald-50 border-b border-slate-100 last:border-none text-xs cursor-pointer"
                    >
                      <p className="font-medium text-slate-900">
                        {stu.studentName}{' '}
                        <span className="text-slate-400 font-normal">
                          ({stu.displayEnrollmentNo})
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Batch: {stu.currentBatchId?.batchCode || 'None'} • Phone:{' '}
                        {stu.studentPhone || 'N/A'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleStudentSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Enrollment ID <span className="text-slate-400 font-normal">(leave blank if none)</span>
              </label>
              <input
                placeholder="No ID provided"
                value={form.enrollmentNo}
                onChange={(e) => setForm({ ...form, enrollmentNo: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Student Name *</label>
              <input
                required
                placeholder="Full Name"
                value={form.studentName}
                onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Student Contact #
                </label>
                <input
                  placeholder="03XX-XXXXXXX"
                  value={form.studentPhone}
                  onChange={(e) => setForm({ ...form, studentPhone: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Parents Contact #
                </label>
                <input
                  placeholder="03XX-XXXXXXX"
                  value={form.parentsPhone}
                  onChange={(e) => setForm({ ...form, parentsPhone: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email Address</label>
              <input
                type="email"
                placeholder="student@gmail.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving || !selectedBatchId}
                className={`flex-1 text-white text-xs font-medium py-2.5 px-4 rounded-lg transition cursor-pointer disabled:opacity-50 ${
                  editingStudentId
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {saving
                  ? 'Saving...'
                  : editingStudentId
                  ? 'Save Changes'
                  : selectedExisting
                  ? `Transfer to ${activeBatch?.batchCode}`
                  : `Add to ${activeBatch?.batchCode || 'Batch'}`}
              </button>
              {(selectedExisting || editingStudentId) && (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setFeedback('');
                  }}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right: Current Batch Student Roster with Edit & Delete Actions */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              {activeBatch
                ? `${activeBatch.batchCode} Roster (${students.length} Students)`
                : 'Batch Students'}
            </h3>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading students...</div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No students in this batch yet. Add one on the left or import an Excel sheet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-2.5 px-3 font-semibold">S.#</th>
                    <th className="py-2.5 px-3 font-semibold">Enrollment ID</th>
                    <th className="py-2.5 px-3 font-semibold">Student Name</th>
                    <th className="py-2.5 px-3 font-semibold">Student Contact</th>
                    <th className="py-2.5 px-3 font-semibold">Parents Contact</th>
                    <th className="py-2.5 px-3 font-semibold">Email</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((stu, idx) => (
                    <tr
                      key={stu._id}
                      className={`hover:bg-slate-50 ${
                        editingStudentId === stu._id ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                        {stu.displayEnrollmentNo}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{stu.studentName}</td>
                      <td className="py-2.5 px-3 text-slate-700">{stu.studentPhone || '—'}</td>
                      <td className="py-2.5 px-3 text-slate-500">{stu.parentsPhone || '—'}</td>
                      <td className="py-2.5 px-3 text-slate-500">{stu.email || '—'}</td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartEditStudent(stu)}
                            title="Edit Student"
                            className="p-1 text-slate-500 hover:text-blue-600 rounded hover:bg-blue-50 cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStudent(stu)}
                            title="Delete Student"
                            className="p-1 text-slate-500 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}