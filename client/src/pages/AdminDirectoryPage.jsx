import { useEffect, useState } from 'react';
import { ShieldCheck, Users, ListChecks, Search, Pencil, Trash2, Check, X } from 'lucide-react';
import { api } from '../context/AuthContext';

export default function AdminDirectoryPage() {
  const [activeTab, setActiveTab] = useState('students');

  // Students Directory State
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Whitelist Users State
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ email: '', displayName: '', role: 'staff' });

  // Lookup Lists State
  const [lookups, setLookups] = useState({ mediums: [], facultyPhones: [], coordinators: [] });
  const [newItem, setNewItem] = useState({ medium: '', phone: '', coordinator: '' });

  const loadStudents = async (q = query) => {
    const { data } = await api.get(`/portal/admin/students?q=${encodeURIComponent(q)}`);
    setStudents(data.students);
  };

  const loadUsers = async () => {
    const { data } = await api.get('/admin/users');
    setUsers(data.users);
  };

  const loadLookups = async () => {
    const { data } = await api.get('/admin/lookups');
    setLookups(data.lookups);
  };

  useEffect(() => {
    loadStudents();
    loadUsers();
    loadLookups();
  }, []);

  const startInlineEdit = (s) => {
    setEditingId(s._id);
    setEditDraft({
      enrollmentNo: s.enrollmentNo || '',
      studentName: s.studentName || '',
      fatherName: s.fatherName || '',
      studentPhone: s.studentPhone || '',
      parentsPhone: s.parentsPhone || '',
      email: s.email || '',
      courseCode: s.courseCode || '',
      ovStatus: s.ovStatus || '',
      address: s.address || '',
    });
  };

  const saveInlineEdit = async (id) => {
    setSavingEdit(true);
    try {
      await api.patch(`/portal/students/${id}`, editDraft);
      setEditingId(null);
      await loadStudents(query);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update student.');
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteStudent = async (s) => {
    const ok = window.confirm(
      `Delete "${s.studentName}" (${s.displayEnrollmentNo}) permanently from the database?`
    );
    if (!ok) return;
    try {
      await api.delete(`/portal/students/${s._id}`);
      if (editingId === s._id) setEditingId(null);
      await loadStudents(query);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete student.');
    }
  };

  const handleWhitelistSubmit = async (e) => {
    e.preventDefault();
    await api.post('/admin/users/whitelist', newUser);
    setNewUser({ email: '', displayName: '', role: 'staff' });
    loadUsers();
  };

  const handleRoleToggle = async (u) => {
    await api.patch(`/admin/users/${u._id}`, {
      role: u.role === 'admin' ? 'staff' : 'admin',
    });
    loadUsers();
  };

  const handleAddLookup = async (field, valueKey) => {
    const val = newItem[valueKey].trim();
    if (!val) return;
    const updated = { ...lookups, [field]: [...lookups[field], val] };
    const { data } = await api.put('/admin/lookups', updated);
    setLookups(data.lookups);
    setNewItem({ ...newItem, [valueKey]: '' });
  };

  const handleRemoveLookup = async (field, idx) => {
    const updated = { ...lookups, [field]: lookups[field].filter((_, i) => i !== idx) };
    const { data } = await api.put('/admin/lookups', updated);
    setLookups(data.lookups);
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium cursor-pointer ${
            activeTab === 'students'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-700'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Full Student Profiles (Admin Only)
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium cursor-pointer ${
            activeTab === 'users'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-700'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Faculty &amp; Admin Whitelist
        </button>
        <button
          onClick={() => setActiveTab('lookups')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium cursor-pointer ${
            activeTab === 'lookups'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-700'
          }`}
        >
          <ListChecks className="w-3.5 h-3.5" />
          Sheet Dropdowns (data Tab)
        </button>
      </div>

      {/* TAB 1: Admin Full Student Directory with Inline Edit & Delete */}
      {activeTab === 'students' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div className="flex items-center border border-slate-300 rounded-lg px-3 py-1.5 w-full max-w-sm bg-slate-50">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input
                placeholder="Filter by Name, ID, or Phone..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  loadStudents(e.target.value);
                }}
                className="w-full bg-transparent text-xs focus:outline-none"
              />
            </div>
            <span className="text-xs text-slate-500">Showing {students.length} records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-2.5 px-3">Batch</th>
                  <th className="py-2.5 px-3">Enrollment ID</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Father/Guardian</th>
                  <th className="py-2.5 px-3">Contacts &amp; Email</th>
                  <th className="py-2.5 px-3">Course / OV Status</th>
                  <th className="py-2.5 px-3">Address</th>
                  <th className="py-2.5 px-3">Transfer History</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => {
                  const isEditing = editingId === s._id;

                  return (
                    <tr
                      key={s._id}
                      className={`align-top ${isEditing ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                    >
                      <td className="py-2.5 px-3 font-semibold">
                        {s.currentBatchId?.batchCode || '—'}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        {isEditing ? (
                          <input
                            placeholder="No ID provided"
                            value={editDraft.enrollmentNo}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, enrollmentNo: e.target.value })
                            }
                            className="w-28 border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                          />
                        ) : (
                          s.displayEnrollmentNo
                        )}
                      </td>

                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        {isEditing ? (
                          <input
                            value={editDraft.studentName}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, studentName: e.target.value })
                            }
                            className="w-36 border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                          />
                        ) : (
                          s.studentName
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-slate-600">
                        {isEditing ? (
                          <input
                            placeholder="Father Name"
                            value={editDraft.fatherName}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, fatherName: e.target.value })
                            }
                            className="w-32 border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                          />
                        ) : (
                          s.fatherName || '—'
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-slate-600 space-y-1">
                        {isEditing ? (
                          <>
                            <input
                              placeholder="Student Phone"
                              value={editDraft.studentPhone}
                              onChange={(e) =>
                                setEditDraft({ ...editDraft, studentPhone: e.target.value })
                              }
                              className="w-32 border border-slate-300 rounded px-2 py-1 text-xs bg-white block"
                            />
                            <input
                              placeholder="Parents Phone"
                              value={editDraft.parentsPhone}
                              onChange={(e) =>
                                setEditDraft({ ...editDraft, parentsPhone: e.target.value })
                              }
                              className="w-32 border border-slate-300 rounded px-2 py-1 text-xs bg-white block"
                            />
                            <input
                              placeholder="Email"
                              value={editDraft.email}
                              onChange={(e) =>
                                setEditDraft({ ...editDraft, email: e.target.value })
                              }
                              className="w-36 border border-slate-300 rounded px-2 py-1 text-xs bg-white block"
                            />
                          </>
                        ) : (
                          <>
                            <div>S: {s.studentPhone || '—'}</div>
                            <div className="text-slate-400">P: {s.parentsPhone || '—'}</div>
                            {s.email && <div className="text-[11px] text-slate-400">{s.email}</div>}
                          </>
                        )}
                      </td>

                      <td className="py-2.5 px-3 space-y-1">
                        {isEditing ? (
                          <>
                            <input
                              placeholder="Course Code"
                              value={editDraft.courseCode}
                              onChange={(e) =>
                                setEditDraft({ ...editDraft, courseCode: e.target.value })
                              }
                              className="w-28 border border-slate-300 rounded px-2 py-1 text-xs bg-white block"
                            />
                            <input
                              placeholder="OV Status"
                              value={editDraft.ovStatus}
                              onChange={(e) =>
                                setEditDraft({ ...editDraft, ovStatus: e.target.value })
                              }
                              className="w-28 border border-slate-300 rounded px-2 py-1 text-xs bg-white block"
                            />
                          </>
                        ) : (
                          <>
                            <div>{s.courseCode || '—'}</div>
                            <div className="text-[11px] text-slate-400">{s.ovStatus || ''}</div>
                          </>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-slate-600 max-w-[200px]">
                        {isEditing ? (
                          <input
                            placeholder="Address"
                            value={editDraft.address}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, address: e.target.value })
                            }
                            className="w-40 border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                          />
                        ) : (
                          s.address || '—'
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-[11px] text-slate-500">
                        {s.batchHistory?.length > 0
                          ? s.batchHistory.map((h, i) => (
                              <div key={i}>
                                {h.fromBatchCode} → {h.toBatchCode}
                              </div>
                            ))
                          : '—'}
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {isEditing ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={savingEdit}
                              onClick={() => saveInlineEdit(s._id)}
                              title="Save Changes"
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              title="Cancel"
                              className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => startInlineEdit(s)}
                              title="Edit Full Student Profile"
                              className="p-1 text-slate-500 hover:text-blue-600 rounded hover:bg-blue-50 cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteStudent(s)}
                              title="Delete Student"
                              className="p-1 text-slate-500 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Faculty & Admin Whitelist */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleWhitelistSubmit}
            className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 h-fit"
          >
            <h3 className="text-sm font-semibold text-slate-900">Pre-Register Staff Gmail</h3>
            <p className="text-xs text-slate-500">
              Match the Display Name exactly to their Excel/Google Sheet tab (e.g.,{' '}
              <em>Miss Laiba Iqbal</em>).
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Gmail Address *</label>
              <input
                required
                type="email"
                placeholder="faculty@gmail.com"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Sheet Tab Name *
              </label>
              <input
                required
                placeholder="Miss Laiba Iqbal"
                value={newUser.displayName}
                onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
              >
                <option value="staff">Staff (Faculty / Coordinator)</option>
                <option value="admin">Admin / Manager</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium py-2.5 rounded-lg cursor-pointer"
            >
              Save Staff Account
            </button>
          </form>

          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-2.5 px-4">Sheet Tab Name</th>
                  <th className="py-2.5 px-4">Email</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u._id}>
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {u.displayName || u.name}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{u.email}</td>
                    <td className="py-2.5 px-4 uppercase font-semibold text-[11px]">{u.role}</td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => handleRoleToggle(u)}
                        className="text-xs text-emerald-700 hover:underline cursor-pointer"
                      >
                        Switch to {u.role === 'admin' ? 'Staff' : 'Admin'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Lookup Lists (data Tab) */}
      {activeTab === 'lookups' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: 'Faculty Phone Numbers',
              field: 'facultyPhones',
              key: 'phone',
              placeholder: 'Faculty Phone 07 - 03XX...',
            },
            {
              title: 'Follow-Up Mediums',
              field: 'mediums',
              key: 'medium',
              placeholder: 'e.g. WhatsApp',
            },
            {
              title: 'Coordinators',
              field: 'coordinators',
              key: 'coordinator',
              placeholder: 'e.g. Miss Warda Siddiqui',
            },
          ].map((col) => (
            <div key={col.field} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">{col.title}</h3>
              <div className="flex gap-2">
                <input
                  placeholder={col.placeholder}
                  value={newItem[col.key]}
                  onChange={(e) => setNewItem({ ...newItem, [col.key]: e.target.value })}
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
                <button
                  onClick={() => handleAddLookup(col.field, col.key)}
                  className="bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg cursor-pointer"
                >
                  Add
                </button>
              </div>
              <ul className="divide-y divide-slate-100 text-xs">
                {lookups[col.field]?.map((item, idx) => (
                  <li key={idx} className="py-2 flex items-center justify-between text-slate-700">
                    <span>{item}</span>
                    <button
                      onClick={() => handleRemoveLookup(col.field, idx)}
                      className="text-red-500 hover:text-red-700 text-[11px] cursor-pointer"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}