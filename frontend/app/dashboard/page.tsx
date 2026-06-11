'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FileItem, Folder, User } from '../../lib/types';
import api from '../../lib/api';
import { useTheme } from '../../lib/ThemeContext';
import UploadZone    from '../../components/UploadZone';
import FileCard      from '../../components/FileCard';
import FolderPanel   from '../../components/FolderPanel';
import Sidebar       from '../../components/Sidebar';
import StatsCards    from '../../components/StatsCards';
import AutoSortModal from '../../components/AutoSortModal';

type ViewMode   = 'grid' | 'list';
type FilterType = 'all' | 'pdf' | 'image' | 'docx' | 'xlsx';

const FILTERS: { id: FilterType; label: string; icon: string }[] = [
  { id: 'all',   label: 'All',          icon: '📋' },
  { id: 'pdf',   label: 'PDFs',         icon: '📄' },
  { id: 'image', label: 'Images',       icon: '🖼️' },
  { id: 'docx',  label: 'Documents',    icon: '📝' },
  { id: 'xlsx',  label: 'Spreadsheets', icon: '📊' },
];

function fmt(b: string | number): string {
  const n = Number(b);
  if (isNaN(n) || n === 0) return '0 B';
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB';
  return (n / 1073741824).toFixed(1) + ' GB';
}

const TYPE_ICON: Record<string, string> = { pdf:'📄', jpg:'🖼️', jpeg:'🖼️', png:'🖼️', docx:'📝', xlsx:'📊' };

export default function Dashboard() {
  const router = useRouter();
  const { theme, toggle: toggleTheme } = useTheme();

  const [user,          setUser]          = useState<User | null>(null);
  const [files,         setFiles]         = useState<FileItem[]>([]);
  const [folders,       setFolders]       = useState<Folder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [crumbs,        setCrumbs]        = useState<{ id: string | null; name: string }[]>([{ id: null, name: 'My Files' }]);
  const [search,        setSearch]        = useState('');
  const [sort,          setSort]          = useState('date');
  const [loading,       setLoading]       = useState(true);
  const [section,       setSection]       = useState('files');
  const [viewMode,      setViewMode]      = useState<ViewMode>('grid');
  const [filter,        setFilter]        = useState<FilterType>('all');
  const [autoSort,      setAutoSort]      = useState(false);
  const [toast,         setToast]         = useState<string | null>(null);

  const toggleStar = async (fileId: string) => {
    try {
      const res = await api.patch(`/files/${fileId}/star`);

      setToast(
        res.data.is_starred
          ? 'Starred'
          : 'Unstarred'
      );

      load();
    } catch {
      setToast('Failed to update star');
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));

    const savedView = localStorage.getItem('viewMode') as ViewMode;
    if (savedView) setViewMode(savedView);

  }, [router]);

  const softDelete = async (fileId: string) => {
    if (!confirm('Move this file to Trash?')) return;
    try {
      await api.delete(`/files/${fileId}`);
      setToast('Moved to trash');
      load();
    } catch {
      setToast('Failed to delete');
    }
  };

  // FIX #1: was api.post — backend uses PATCH
  const restoreFile = async (fileId: string) => {
    try {
      await api.patch(`/files/${fileId}/restore`);
      setToast('File restored');
      load();
    } catch {
      setToast('Failed to restore');
    }
  };

  const permanentDelete = async (fileId: string) => {
    if (!confirm('Permanently delete this file? This cannot be undone.')) return;
    try {
      await api.delete(`/files/${fileId}/permanent`);
      setToast('Permanently deleted');
      load();
    } catch {
      setToast('Failed to delete');
    }
  };

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const p: any = { sort };
      if (currentFolder) p.folder_id = currentFolder;
      if (search)        p.search    = search;
      if (section === 'trash')   p.trashed  = 'true';
      if (section === 'starred') p.starred = 'true';

      const [fr, dr] = await Promise.all([api.get('/files', { params: p }), api.get('/folders')]);
      setFiles(fr.data);
      setFolders(dr.data);
    }catch (err) {
  console.error(err);
  setToast('Failed to load files');
}
    finally { setLoading(false); }
  }, [user, currentFolder, search, sort, router, section]);

  useEffect(() => { load(); }, [load]);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const openFolder = (id: string | null, name: string) => {
    setCurrentFolder(id);
    if (!id) setCrumbs([{ id: null, name: 'My Files' }]);
    else     setCrumbs(p => [...p, { id, name }]);
  };

  const goToCrumb = (i: number) => {
    setCrumbs(p => p.slice(0, i + 1));
    setCurrentFolder(crumbs[i].id);
  };

  const switchView = (v: ViewMode) => {
    setViewMode(v);
    localStorage.setItem('viewMode', v);
  };

  const filtered = files.filter(f => {
    if (filter === 'all')   return true;
    if (filter === 'image') return ['jpg','jpeg','png'].includes(f.file_type);
    if (filter === 'pdf')   return f.file_type === 'pdf';
    if (filter === 'docx')  return f.file_type === 'docx';
    if (filter === 'xlsx')  return f.file_type === 'xlsx';
    return true;
  });

  const displayFiles = section === 'recent'
    ? [...filtered].sort((a, b) => +new Date(b.uploaded_at) - +new Date(a.uploaded_at)).slice(0, 12)
    : filtered;

  const logout = () => { localStorage.clear(); router.push('/login'); };
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'DR';

  // FIX #2: compute fileCounts and pass to FolderPanel
  const fileCounts: Record<string, number> = {};
  files.forEach(f => {
    if (f.folder_id) fileCounts[f.folder_id] = (fileCounts[f.folder_id] || 0) + 1;
  });

  const S = {
    surface:   'var(--bg-surface)',
    border:    'var(--border)',
    borderMid: 'var(--border-mid)',
    text:      'var(--text-primary)',
    muted:     'var(--text-muted)',
    secondary: 'var(--text-secondary)',
    subtle:    'var(--bg-subtle)',
    hover:     'var(--bg-hover)',
    blue:      'var(--blue)',
    blueBg:    'var(--blue-light)',
  };

  const handleNavClick = (id: string) => {
    if (id === 'admin') { router.push('/admin'); return; }
    if (id === 'starred' || id === 'trash') { setSection(id); setCurrentFolder(null); setCrumbs([{ id: null, name: 'My Files' }]); return; }
    setSection(id);
    if (id === 'recent') setSort('date');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column' }}>

      {/* ───── Navbar ───── */}
      <header style={{ background: S.surface, borderBottom: `1px solid ${S.border}`, height: 60, padding: '0 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, background: S.blue, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🗂️</div>
          <span style={{ fontSize: 16, fontWeight: 700, color: S.text, letterSpacing: '-0.01em' }}>Drive Portal</span>
          {user?.role === 'admin' && (
            <span style={{ background: '#ede9fe', color: '#4c1d95', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, letterSpacing: '0.06em' }}>ADMIN</span>
          )}
        </div>

        <div style={{ flex: 1, maxWidth: 380, margin: '0 24px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: S.muted, pointerEvents: 'none' }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search files, folders…"
            style={{ width: '100%', border: `1px solid ${S.borderMid}`, borderRadius: 9, padding: '7px 12px 7px 32px', fontSize: 13, outline: 'none', background: S.subtle, color: S.text, transition: 'all 0.18s' }}
            onFocus={e => { e.target.style.borderColor = S.blue; e.target.style.background = S.surface; }}
            onBlur={e =>  { e.target.style.borderColor = S.borderMid; e.target.style.background = S.subtle; }}/>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button onClick={() => setAutoSort(true)} title="Auto-sort files by type"
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: S.blueBg, color: S.blue, border: `1px solid ${S.borderMid}`, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            ✨ Auto-sort
          </button>
          <button onClick={toggleTheme} title="Toggle dark mode"
            style={{ width: 34, height: 34, border: `1px solid ${S.borderMid}`, borderRadius: 9, background: S.subtle, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <div style={{ width: 30, height: 30, background: S.blue, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>{initials}</div>
          <button onClick={logout}
            style={{ background: 'transparent', color: S.secondary, border: `1px solid ${S.borderMid}`, padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fff5f5'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fecaca'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = S.secondary; e.currentTarget.style.borderColor = S.borderMid; }}>
            Logout
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Sidebar user={user} fileCount={files.length} activeSection={section} onSectionChange={handleNavClick}/>

        <main style={{ flex: 1, padding: '26px 30px', minWidth: 0, overflowY: 'auto' }}>
          <div style={{ marginBottom: 22 }}>
            <h1 style={{ fontSize: 21, fontWeight: 700, color: S.text, letterSpacing: '-0.02em', marginBottom: 3 }}>
              {section === 'files' ? 'My Files' : section === 'recent' ? 'Recent Uploads' : section === 'starred' ? '⭐ Starred' : '🗑️ Trash'}
            </h1>
            <p style={{ fontSize: 13, color: S.secondary }}>
              {section === 'files' ? 'All your documents and folders' : section === 'recent' ? 'Your 12 most recently uploaded files' : section === 'starred' ? `${displayFiles.length} starred file${displayFiles.length !== 1 ? 's' : ''}` : `${displayFiles.length} item${displayFiles.length !== 1 ? 's' : ''} in trash`}
            </p>
          </div>

          {section === 'files' && <StatsCards files={files} folders={folders}/>}

          {/* ─── TRASH VIEW ─── */}
          {section === 'trash' && (
            <>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 10 }} />)}
                </div>
              ) : displayFiles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: S.surface, borderRadius: 14, border: `2px dashed ${S.borderMid}` }}>
                  <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.5 }}>🗑️</div>
                  <p style={{ fontSize: 16, fontWeight: 600, color: S.text, margin: '0 0 4px' }}>Trash is empty</p>
                  <p style={{ fontSize: 13, color: S.muted, margin: 0 }}>Deleted files will appear here</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {displayFiles.map((f, i) => (
                    <TrashRow key={f.id} file={f} index={i} onRestore={restoreFile} onPermanentDelete={permanentDelete} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ─── STARRED VIEW ─── */}
          {section === 'starred' && (
            <>
              {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
                  {[...Array(6)].map((_, i) => (
                    <div key={i} style={{ background: S.surface, borderRadius: 12, border: `1px solid ${S.border}` }}>
                      <div className="skeleton" style={{ height: 80 }} />
                      <div style={{ padding: 10 }}><div className="skeleton" style={{ height: 12, width: '60%' }} /></div>
                    </div>
                  ))}
                </div>
              ) : displayFiles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: S.surface, borderRadius: 14, border: `2px dashed ${S.borderMid}` }}>
                  <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.5 }}>⭐</div>
                  <p style={{ fontSize: 16, fontWeight: 600, color: S.text, margin: '0 0 4px' }}>No starred files</p>
                  <p style={{ fontSize: 13, color: S.muted, margin: 0 }}>Star files to find them quickly</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
                  {displayFiles.map((f, i) => (
                    <FileCard key={f.id} file={f} index={i} onRefresh={load} currentUserId={user?.id ?? ''} isAdmin={user?.role === 'admin'} onToggleStar={toggleStar} onDelete={softDelete} onRestore={restoreFile} isTrashView={false} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ─── FILES / RECENT VIEW ─── */}
          {(section === 'files' || section === 'recent') && (
            <>
              {section === 'files' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <UploadZone folderId={currentFolder} onUploadDone={load}/>

                  <nav style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, background: S.surface, border: `1px solid ${S.border}`, borderRadius: 9, padding: '7px 13px', marginBottom: 20, fontSize: 13 }}>
                    {crumbs.map((c, i) => (
                      <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {i > 0 && <span style={{ color: S.muted, margin: '0 3px', fontSize: 16 }}>›</span>}
                        <button onClick={() => goToCrumb(i)}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 5, fontSize: 13, fontWeight: i === crumbs.length - 1 ? 600 : 400, color: i === crumbs.length - 1 ? S.text : S.blue, transition: 'background 0.12s' }}
                          onMouseEnter={e => e.currentTarget.style.background = S.subtle}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                          {i === 0 && '🏠 '}{c.name}
                        </button>
                      </span>
                    ))}
                  </nav>

                  <FolderPanel
                    folders={folders}
                    onFolderClick={openFolder}
                    onRefresh={load}
                    currentFolderId={currentFolder}
                    isAdmin={user?.role === 'admin'}
                    currentUserId={user?.id ?? ''}
                    fileCounts={fileCounts}
                  />
                </div>
              )}

              {/* Toolbar */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 16, justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {FILTERS.map(f => (
                    <button key={f.id} onClick={() => setFilter(f.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, border: `1px solid ${filter === f.id ? S.blue : S.borderMid}`, background: filter === f.id ? S.blueBg : S.surface, color: filter === f.id ? S.blue : S.secondary, cursor: 'pointer', transition: 'all 0.15s' }}>
                      <span style={{ fontSize: 13 }}>{f.icon}</span>{f.label}
                      {filter === f.id && f.id !== 'all' && (
                        <span style={{ background: S.blue, color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 10 }}>
                          {files.filter(fi => f.id === 'image' ? ['jpg','jpeg','png'].includes(fi.file_type) : fi.file_type === f.id).length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {section === 'files' && (
                    <select value={sort} onChange={e => setSort(e.target.value)}
                      style={{ border: `1px solid ${S.borderMid}`, borderRadius: 8, padding: '6px 11px', fontSize: 12, background: S.surface, color: S.text, outline: 'none', cursor: 'pointer', fontWeight: 500 }}>
                      <option value="date">Latest first</option>
                      <option value="name">Name A–Z</option>
                      <option value="size">Largest first</option>
                    </select>
                  )}
                  <div style={{ display: 'flex', border: `1px solid ${S.borderMid}`, borderRadius: 8, overflow: 'hidden' }}>
                    {(['grid','list'] as ViewMode[]).map(v => (
                      <button key={v} onClick={() => switchView(v)}
                        style={{ width: 32, height: 32, border: 'none', background: viewMode === v ? S.blue : S.surface, color: viewMode === v ? '#fff' : S.secondary, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                        {v === 'grid' ? '⊞' : '☰'}
                      </button>
                    ))}
                  </div>
                  <p style={{ fontSize: 12, color: S.muted, fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {displayFiles.length} file{displayFiles.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* File list */}
              {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(190px, 1fr))' : '1fr', gap: 12 }}>
                  {[...Array(8)].map((_, i) => (
                    <div key={i} style={{ background: S.surface, borderRadius: 12, overflow: 'hidden', border: `1px solid ${S.border}` }}>
                      {viewMode === 'grid' && <div className="skeleton" style={{ height: 90 }}/>}
                      <div style={{ padding: 12, display: 'flex', gap: 10 }}>
                        {viewMode === 'list' && <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0 }}/>}
                        <div style={{ flex: 1 }}>
                          <div className="skeleton" style={{ height: 13, width: '65%', marginBottom: 7 }}/>
                          <div className="skeleton" style={{ height: 10, width: '40%' }}/>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : displayFiles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '72px 24px', background: S.surface, borderRadius: 14, border: `2px dashed ${S.borderMid}` }}>
                  <div style={{ fontSize: 54, marginBottom: 14, opacity: 0.6 }}>📭</div>
                  <p style={{ fontSize: 17, fontWeight: 600, color: S.text, marginBottom: 6 }}>
                    {search ? 'No files match your search' : filter !== 'all' ? `No ${filter} files found` : 'No files here yet'}
                  </p>
                  <p style={{ fontSize: 13, color: S.muted, maxWidth: 280, margin: '0 auto', lineHeight: 1.6 }}>
                    {search ? 'Try a different search term' : 'Upload files using the drop zone above'}
                  </p>
                </div>
              ) : viewMode === 'grid' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
                  {displayFiles.map((f, i) => (
                    <FileCard key={f.id} file={f} index={i} onRefresh={load} currentUserId={user?.id ?? ''} isAdmin={user?.role === 'admin'} onToggleStar={toggleStar} onDelete={softDelete} onRestore={restoreFile} isTrashView={false} />
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 100px 120px 110px', gap: 12, padding: '7px 16px', fontSize: 11, fontWeight: 600, color: S.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    <span>Name</span><span>Type</span><span>Size</span><span>Date</span>
                  </div>
                  {displayFiles.map((f, i) => (
                    <ListRow
                      key={f.id}
                      file={f}
                      index={i}
                      onRefresh={load}
                      currentUserId={user?.id ?? ''}
                      isAdmin={user?.role === 'admin'}
                      onToggleStar={toggleStar}
                      onDelete={softDelete}
                      onRestore={restoreFile}
                      isTrashView={false}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {autoSort && <AutoSortModal files={files} folders={folders} onDone={load} onClose={() => setAutoSort(false)}/>}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--text-primary)', color: 'var(--bg-surface)',
          padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 500,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 300,
          animation: 'fadeUp 0.2s ease',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

/* ── List row component ── */
function ListRow({ file, index, onRefresh, currentUserId, isAdmin, onToggleStar, onDelete, onRestore, isTrashView }: {
  file: FileItem; index: number; onRefresh: () => void; currentUserId: string; isAdmin: boolean;
  onToggleStar: (id: string) => void; onDelete: (id: string) => void; onRestore: (id: string) => void; isTrashView: boolean;
}) {
  const [h, setH] = useState(false);
  const canEdit = isAdmin || file.owner_id === currentUserId;

  const download = async () => {
    try {
      const res = await api.get(`/files/${file.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      Object.assign(document.createElement('a'), { href: url, download: file.original_name }).click();
      URL.revokeObjectURL(url);
    } catch { alert('Download failed'); }
  };

  return (
    <div
      className="anim-fadeup"
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{ animationDelay: `${index * 0.02}s`, display: 'grid', gridTemplateColumns: '2fr 100px 120px 110px', gap: 12, padding: '10px 16px', background: h ? 'var(--bg-hover)' : 'var(--bg-surface)', border: `1px solid ${h ? 'var(--border-mid)' : 'var(--border)'}`, borderRadius: 10, alignItems: 'center', transition: 'all 0.15s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <button onClick={(e) => { e.stopPropagation(); onToggleStar(file.id); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: file.is_starred ? '#fbbf24' : 'var(--text-muted)', transition: 'color 0.2s' }}
          title={file.is_starred ? 'Unstar' : 'Star'}>
          {file.is_starred ? '★' : '☆'}
        </button>
        <span style={{ fontSize: 20, flexShrink: 0 }}>{TYPE_ICON[file.file_type] ?? '📎'}</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.original_name}>
          {file.original_name}
        </span>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{file.file_type}</span>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmt(file.file_size)}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1 }}>
          {new Date(file.uploaded_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
        </span>
        <div style={{ display: 'flex', gap: 4, opacity: h ? 1 : 0, transition: 'opacity 0.15s' }}>
          <button onClick={download} title="Download" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '2px 4px', borderRadius: 5 }}>⬇️</button>
          {canEdit && !isTrashView && (
            <button onClick={() => onDelete(file.id)} title="Move to Trash" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '2px 4px', borderRadius: 5 }}>🗑️</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Trash row component ── */
function TrashRow({ file, index, onRestore, onPermanentDelete }: {
  file: FileItem; index: number; onRestore: (id: string) => void; onPermanentDelete: (id: string) => void;
}) {
  const [h, setH] = useState(false);

  return (
    <div
      className="anim-fadeup"
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{ animationDelay: `${index * 0.02}s`, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: h ? 'var(--bg-hover)' : 'var(--bg-surface)', border: `1px solid ${h ? 'var(--border-mid)' : 'var(--border)'}`, borderRadius: 10, transition: 'all 0.15s ease' }}>
      <span style={{ fontSize: 20 }}>{TYPE_ICON[file.file_type] ?? '📎'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.original_name}</p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>{fmt(file.file_size)} · Deleted {file.deleted_at ? new Date(file.deleted_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'unknown'}</p>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => onRestore(file.id)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--blue-light)', color: 'var(--blue)', border: `1px solid var(--border-mid)`, padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          ♻️ Restore
        </button>
        <button onClick={() => onPermanentDelete(file.id)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: h ? 1 : 0.6, transition: 'opacity 0.15s' }}>
          🗑️ Delete Forever
        </button>
      </div>
    </div>
  );
}