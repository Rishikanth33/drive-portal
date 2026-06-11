'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminUser, AdminStats, FileItem, Folder } from '../../lib/types';
import api from '../../lib/api';
import { useTheme } from '../../lib/ThemeContext';

function fmt(b: number): string {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
  return (b / 1073741824).toFixed(1) + ' GB';
}

const FICO: Record<string, string> = {
  pdf: '📄', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', webp: '🖼️',
  docx: '📝', doc: '📝', xlsx: '📊', xls: '📊', csv: '📊',
};

export default function AdminPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  // View user files
  const [viewingUser, setViewingUser] = useState<AdminUser | null>(null);
  const [userFiles, setUserFiles] = useState<FileItem[]>([]);
  const [userFolders, setUserFolders] = useState<Folder[]>([]);
  const [viewTab, setViewTab] = useState<'files' | 'folders'>('files');

  // Edit modal
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  const S = {
    surface: 'var(--bg-surface)', border: 'var(--border)', borderMid: 'var(--border-mid)',
    text: 'var(--text-primary)', muted: 'var(--text-muted)', secondary: 'var(--text-secondary)',
    subtle: 'var(--bg-subtle)', hover: 'var(--bg-hover)', blue: 'var(--blue)', blueBg: 'var(--blue-light)',
  };

  useEffect(() => {
    const s = localStorage.getItem('user');
    if (!s) { router.push('/login'); return; }
    const u = JSON.parse(s);
    if (u.role !== 'admin') { router.push('/dashboard'); return; }
    setUser(u);
  }, [router]);

  const load = async () => {
    try {
      const [uRes, sRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/stats'),
      ]);
      setUsers(uRes.data);
      setStats(sRes.data);
    } catch { router.push('/login'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (user) load(); }, [user]);

  const viewUserFiles = async (u: AdminUser) => {
    setViewingUser(u);
    setViewTab('files');
    try {
      const [fRes, foRes] = await Promise.all([
        api.get(`/admin/users/${u.id}/files`),
        api.get(`/admin/users/${u.id}/folders`),
      ]);
      setUserFiles(fRes.data.files);
      setUserFolders(foRes.data.folders);
    } catch { setToast('Failed to load user data'); }
  };

  const changeRole = async (u: AdminUser, role: string) => {
    if (u.id === user?.id) { setToast("Can't change your own role"); return; }
    try {
      await api.patch(`/admin/users/${u.id}/role`, { role });
      setToast(`Changed ${u.email} to ${role}`);
      load();
    } catch (e: any) { setToast(e.response?.data?.error || 'Failed'); }
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    try {
      await api.patch(`/admin/users/${editingUser.id}`, { name: editName, email: editEmail });
      setToast(`Updated ${editingUser.email}`);
      setEditingUser(null);
      load();
    } catch (e: any) { setToast(e.response?.data?.error || 'Failed'); }
  };

  const deleteUser = async (u: AdminUser) => {
    if (u.id === user?.id) { setToast("Can't delete yourself"); return; }
    if (!confirm(`Delete user "${u.email}" and all their files? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${u.id}`);
      setToast(`Deleted ${u.email}`);
      load();
    } catch (e: any) { setToast(e.response?.data?.error || 'Failed'); }
  };

  const adminDeleteFile = async (file: FileItem) => {
    if (!confirm(`Delete "${file.original_name}"?`)) return;
    try {
      await api.delete(`/files/${file.id}`);
      setToast(`Deleted ${file.original_name}`);
      if (viewingUser) viewUserFiles(viewingUser);
    } catch (e: any) { setToast(e.response?.data?.error || 'Failed'); }
  };

  const adminStarFile = async (file: FileItem) => {
    try {
      await api.patch(`/files/${file.id}/star`);
      if (viewingUser) viewUserFiles(viewingUser);
    } catch (e: any) { setToast(e.response?.data?.error || 'Failed'); }
  };

  const adminRestoreFile = async (file: FileItem) => {
    try {
      await api.patch(`/files/${file.id}/restore`);
      setToast(`Restored ${file.original_name}`);
      if (viewingUser) viewUserFiles(viewingUser);
    } catch (e: any) { setToast(e.response?.data?.error || 'Failed'); }
  };

  if (!user) return null;

  // ─── VIEWING USER FILES ────────────────────────────
  if (viewingUser) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', padding: 24 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          {/* Banner */}
          <div style={{
            background: S.blueBg, border: `1px solid var(--blue)`, borderRadius: 10,
            padding: '14px 20px', marginBottom: 20, display: 'flex',
            alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, background: S.blue, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 13, fontWeight: 700,
              }}>
                {viewingUser.email?.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: S.text, margin: 0 }}>
                  Viewing files of: <span style={{ color: S.blue }}>{viewingUser.email}</span>
                </p>
                <p style={{ fontSize: 12, color: S.muted, margin: '2px 0 0' }}>
                  Role: {viewingUser.role} · Joined: {new Date(viewingUser.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
            <button onClick={() => setViewingUser(null)}
              style={{ background: S.surface, border: `1px solid ${S.borderMid}`, padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: S.secondary }}>
              ← Back to Users
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
            {(['files', 'folders'] as const).map(t => (
              <button key={t} onClick={() => setViewTab(t)}
                style={{
                  padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  border: `1px solid ${viewTab === t ? S.blue : S.borderMid}`,
                  background: viewTab === t ? S.blueBg : S.surface,
                  color: viewTab === t ? S.blue : S.secondary,
                  cursor: 'pointer', textTransform: 'capitalize',
                }}>
                {t} ({viewTab === 'files' ? userFiles.length : userFolders.length})
              </button>
            ))}
          </div>

          {viewTab === 'files' ? (
            userFiles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, background: S.surface, borderRadius: 12, border: `2px dashed ${S.borderMid}` }}>
                <p style={{ fontSize: 14, color: S.muted }}>No files for this user</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {userFiles.map(f => (
                  <div key={f.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                    background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10,
                  }}>
                    <span style={{ fontSize: 20 }}>{FICO[f.file_type] ?? '📎'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: S.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.original_name}</p>
                      <p style={{ fontSize: 11, color: S.muted, margin: '2px 0 0' }}>{f.file_type.toUpperCase()} · {fmt(Number(f.file_size))}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => adminStarFile(f)} style={{ background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', padding: '4px 6px', borderRadius: 5, opacity: f.is_starred ? 1 : 0.4 }}>
                        {f.is_starred ? '⭐' : '☆'}
                      </button>
                      <button onClick={() => adminDeleteFile(f)} style={{ background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', padding: '4px 6px', borderRadius: 5 }}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            userFolders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, background: S.surface, borderRadius: 12, border: `2px dashed ${S.borderMid}` }}>
                <p style={{ fontSize: 14, color: S.muted }}>No folders for this user</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                {userFolders.map(f => (
                  <div key={f.id} style={{ padding: '12px 14px', background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>📁</span>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: S.text, margin: 0 }}>{f.name}</p>
                      <p style={{ fontSize: 11, color: S.muted, margin: '2px 0 0' }}>Created: {new Date(f.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {toast && (
          <div style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            background: S.text, color: S.surface, padding: '10px 20px', borderRadius: 10,
            fontSize: 13, fontWeight: 500, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 300,
          }}>
            {toast}
          </div>
        )}
      </div>
    );
  }

  // ─── EDIT MODAL ────────────────────────────────────
  const editModal = editingUser && (
    <div onClick={() => setEditingUser(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: S.surface, borderRadius: 16, padding: 28, width: 400, maxWidth: '100%', border: `1px solid ${S.border}`, boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: S.text, margin: '0 0 20px' }}>Edit User</h2>
        <label style={{ fontSize: 12, fontWeight: 600, color: S.muted, display: 'block', marginBottom: 4 }}>Name</label>
        <input value={editName} onChange={e => setEditName(e.target.value)}
          style={{ width: '100%', border: `1px solid ${S.borderMid}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', background: S.subtle, color: S.text, marginBottom: 14 }} />
        <label style={{ fontSize: 12, fontWeight: 600, color: S.muted, display: 'block', marginBottom: 4 }}>Email</label>
        <input value={editEmail} onChange={e => setEditEmail(e.target.value)}
          style={{ width: '100%', border: `1px solid ${S.borderMid}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', background: S.subtle, color: S.text, marginBottom: 20 }} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={() => setEditingUser(null)} style={{ background: S.subtle, color: S.secondary, border: `1px solid ${S.borderMid}`, padding: '8px 18px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
          <button onClick={saveEdit} style={{ background: S.blue, color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Save</button>
        </div>
      </div>
    </div>
  );

  // ─── MAIN ADMIN VIEW ───────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', padding: 24 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: S.text, margin: '0 0 4px' }}>Admin Panel</h1>
            <p style={{ fontSize: 13, color: S.secondary, margin: 0 }}>Manage users, files, and system settings</p>
          </div>
          <button onClick={() => router.push('/dashboard')}
            style={{ background: S.surface, border: `1px solid ${S.borderMid}`, padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: S.secondary }}>
            ← Back to Dashboard
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 24 }}>
            {[
              { label: 'Total Users', value: stats.users, icon: '👥', bg: dark ? '#1a2040' : '#eff6ff' },
              { label: 'Total Files', value: stats.files, icon: '📄', bg: dark ? '#2a2015' : '#fffbeb' },
              { label: 'Total Folders', value: stats.folders, icon: '📁', bg: dark ? '#1f1530' : '#f5f3ff' },
              { label: 'Storage Used', value: fmt(stats.storage), icon: '💾', bg: dark ? '#152520' : '#ecfdf5' },
              { label: 'In Trash', value: stats.trashed, icon: '🗑️', bg: dark ? '#2d1818' : '#fef2f2' },
            ].map((card) => (
              <div key={card.label} style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, background: card.bg, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>{card.icon}</div>
                  <span style={{ fontSize: 11, color: S.muted, fontWeight: 600 }}>{card.label}</span>
                </div>
                <p style={{ fontSize: 20, fontWeight: 700, color: S.text, margin: 0 }}>{card.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Users Table */}
        <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${S.border}` }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: S.text, margin: 0 }}>Registered Users ({users.length})</h2>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ color: S.muted, fontSize: 13 }}>Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ color: S.muted, fontSize: 13 }}>No users found</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: S.subtle }}>
                    {['User', 'Email', 'Role', 'Files', 'Storage', 'Joined', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: `1px solid ${S.border}` }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: `1px solid ${S.border}`, transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = S.hover}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 28, height: 28, background: u.id === user.id ? S.blue : S.subtle,
                            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: u.id === user.id ? '#fff' : S.secondary, fontSize: 10, fontWeight: 700,
                          }}>
                            {u.email?.slice(0, 2).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 500, color: S.text }}>
                            {u.name || '—'}
                            {u.id === user.id && <span style={{ fontSize: 9, color: S.blue, marginLeft: 6, fontWeight: 700 }}>YOU</span>}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: S.secondary }}>{u.email}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <select
                          value={u.role}
                          onChange={e => changeRole(u, e.target.value)}
                          disabled={u.id === user.id}
                          style={{
                            fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6,
                            border: `1px solid ${u.role === 'admin' ? '#a78bfa' : S.borderMid}`,
                            background: u.role === 'admin' ? '#ede9fe' : S.subtle,
                            color: u.role === 'admin' ? '#4c1d95' : S.secondary,
                            cursor: u.id === user.id ? 'default' : 'pointer', outline: 'none',
                            textTransform: 'capitalize',
                          }}>
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td style={{ padding: '12px 16px', color: S.text, fontWeight: 600 }}>{u.total_files}</td>
                      <td style={{ padding: '12px 16px', color: S.secondary }}>{fmt(Number(u.total_storage))}</td>
                      <td style={{ padding: '12px 16px', color: S.muted, fontSize: 12 }}>
                        {new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <button onClick={() => viewUserFiles(u)} title="View Files"
                            style={{ background: S.blueBg, color: S.blue, border: `1px solid var(--blue)`, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                            Files
                          </button>
                          <button onClick={() => { setEditingUser(u); setEditName(u.name || ''); setEditEmail(u.email); }} title="Edit User"
                            style={{ background: S.subtle, color: S.secondary, border: `1px solid ${S.borderMid}`, padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
                            Edit
                          </button>
                          {u.id !== user.id && (
                            <button onClick={() => deleteUser(u)} title="Delete User"
                              style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Legend */}
        <div style={{ marginTop: 16, padding: '12px 18px', background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 11, color: S.muted, margin: 0 }}>
            <strong style={{ color: S.secondary }}>Admin can:</strong> View all files · Rename any file · Delete any file · Restore from trash · Star/Unstar · Change roles · Manage users
          </p>
        </div>
      </div>

      {editModal}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: S.text, color: S.surface, padding: '10px 20px', borderRadius: 10,
          fontSize: 13, fontWeight: 500, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 300,
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}