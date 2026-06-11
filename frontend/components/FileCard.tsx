'use client';
import { useState } from 'react';
import { FileItem } from '../lib/types';
import api from '../lib/api';
import FileDetailsModal from './FileDetailsModal';
import { logActivity } from './ActivityPanel';

type Props = {
  file: FileItem;
  index: number;
  onRefresh: () => void; // Changed to void to match Dashboard
  currentUserId: string;
  isAdmin: boolean;
  onToggleStar: (fileId: string) => void;
  onDelete: (fileId: string) => void;
  onRestore: (fileId: string) => void;
  isTrashView: boolean;
};

const TYPE: Record<string, { bg: string; accent: string; text: string; icon: string }> = {
  pdf:  { bg: '#fff7ed', accent: '#ea580c', text: '#c2410c', icon: '📄' },
  jpg:  { bg: '#f0f9ff', accent: '#0284c7', text: '#0369a1', icon: '🖼️' },
  jpeg: { bg: '#f0f9ff', accent: '#0284c7', text: '#0369a1', icon: '🖼️' },
  png:  { bg: '#f0fdf4', accent: '#16a34a', text: '#15803d', icon: '🖼️' },
  docx: { bg: '#eff6ff', accent: '#2563eb', text: '#1d4ed8', icon: '📝' },
  xlsx: { bg: '#f0fdf4', accent: '#16a34a', text: '#166534', icon: '📊' },
};

function fmt(b: string | number) {
  const n = Number(b);
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1048576).toFixed(1) + ' MB';
}

export default function FileCard({
  file,
  onRefresh,
  currentUserId,
  isAdmin,
  onToggleStar,
  onDelete,
  onRestore,
  isTrashView,
  index = 0
}: Props) {
  const [hovered, setHovered] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(file.original_name);
  const [preview, setPreview] = useState(false);
  const [details, setDetails] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const cfg = TYPE[file.file_type] ?? { bg: '#f8fafc', accent: '#64748b', text: '#475569', icon: '📎' };
  
  // Permissions: Owner OR Admin can edit
  const canEdit = isAdmin || file.owner_id === currentUserId;
  
  const isImage = ['jpg', 'jpeg', 'png'].includes(file.file_type);
  const isPdf = file.file_type === 'pdf';
  const src = `http://localhost:5000/uploads/${file.stored_name}`;
  const date = new Date(file.uploaded_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const rename = async () => {
    if (!newName.trim() || newName === file.original_name) { setRenaming(false); return; }
    try {
      await api.patch(`/files/${file.id}/rename`, { name: newName });
      logActivity('✏️', `Renamed "${file.original_name}" to "${newName}"`);
      onRefresh();
      setRenaming(false);
    } catch (e: any) { alert(e.response?.data?.error ?? 'Rename failed'); }
  };

  // Handler for Soft Delete (Move to Trash)
  const handleDelete = async () => {
    if (!confirm(`Move "${file.original_name}" to Trash?`)) return;
    try {
      await onDelete(file.id);
      logActivity('🗑️', `Moved "${file.original_name}" to Trash`);
      onRefresh();
    } catch (e) { alert('Failed to delete file'); }
  };

  // Handler for Restore
  const handleRestore = async () => {
    try {
      await onRestore(file.id);
      logActivity('♻️', `Restored "${file.original_name}"`);
      onRefresh();
    } catch (e) { alert('Failed to restore file'); }
  };

  const download = async () => {
    try {
      const res = await api.get(`/files/${file.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      Object.assign(document.createElement('a'), { href: url, download: file.original_name }).click();
      URL.revokeObjectURL(url);
      logActivity('⬇️', `Downloaded "${file.original_name}"`);
    } catch { alert('Download failed'); }
  };

  return (
    <>
      <div
        className="anim-fadeup"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}
        style={{
          animationDelay: `${index * 0.04}s`,
          background: 'var(--bg-surface)',
          borderRadius: 12,
          border: `1px solid ${hovered ? 'var(--border-mid)' : 'var(--border)'}`,
          overflow: 'hidden',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
          transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
          boxShadow: hovered ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column'
        }}>

        {/* Preview strip */}
        <div
          onClick={() => (isImage || isPdf) && setPreview(true)}
          style={{
            height: isImage ? 118 : 76,
            background: cfg.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            cursor: isImage || isPdf ? 'zoom-in' : 'default',
            overflow: 'hidden',
            flexShrink: 0
          }}>
          {isImage
            ? <img src={src} alt={file.original_name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease', transform: hovered ? 'scale(1.05)' : 'scale(1)' }} />
            : <span style={{ fontSize: 38, transition: 'transform 0.2s ease', transform: hovered ? 'scale(1.1)' : 'scale(1)', display: 'block' }}>{cfg.icon}</span>
          }

          {/* Star Button */}
          <div
            onClick={(e) => { e.stopPropagation(); onToggleStar(file.id); }}
            style={{ position: 'absolute', top: 6, right: 6, cursor: 'pointer', fontSize: 18, color: file.is_starred ? '#fbbf24' : 'rgba(0,0,0,0.2)', transition: 'color 0.2s', zIndex: 10 }}
            title={file.is_starred ? 'Unstar' : 'Star'}
          >
            {file.is_starred ? '★' : '☆'}
          </div>

          {/* type badge */}
          <span style={{ position: 'absolute', top: 7, left: 8, background: 'rgba(255,255,255,0.9)', color: cfg.text, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.07em' }}>
            {file.file_type.toUpperCase()}
          </span>

          {/* preview hint */}
          {(isImage || isPdf) && hovered && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ background: 'rgba(255,255,255,0.92)', color: '#0f172a', fontSize: 11, fontWeight: 600, padding: '4px 11px', borderRadius: 20 }}>Preview</span>
            </div>
          )}

          {/* 3-dot menu button */}
          <div style={{ position: 'absolute', top: 6, right: 6 }} onClick={e => e.stopPropagation()}>
            {/* The 3-dot menu positioning might overlap with Star. Let's adjust right padding or move 3-dot down slightly or just hide it if star is there? 
                Actually, star is at top:6, right:6. Menu is same. 
                Let's move Menu to bottom right or just accept overlap. 
                Let's move 3-dot to top:6, left:6? No, conflict with Type Badge.
                Let's move 3-dot to bottom right of the header area or just keep it and rely on click targets.
            */}
            <button
              onClick={() => setMenuOpen(m => !m)}
              style={{
                width: 24, height: 24, border: 'none', background: 'rgba(255,255,255,0.85)',
                borderRadius: 5, cursor: 'pointer', fontSize: 13, color: '#374151',
                display: hovered || menuOpen ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(2px)', position: 'absolute', top: 6, right: 36 // Shifted right to avoid Star
              }}>
              ⋮
            </button>
            {menuOpen && (
              <div className="anim-scalein"
                style={{ position: 'absolute', top: 28, right: 36, background: 'var(--bg-surface)', border: `1px solid var(--border-mid)`, borderRadius: 9, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', minWidth: 140, zIndex: 300 }}>
                {[
                  { icon: '👁️', label: 'Preview', show: isImage || isPdf, fn: () => { setPreview(true); setMenuOpen(false); } },
                  { icon: 'ℹ️', label: 'Details', show: true, fn: () => { setDetails(true); setMenuOpen(false); } },
                  { icon: '⬇️', label: 'Download', show: true, fn: () => { download(); setMenuOpen(false); } },
                  { icon: '✏️', label: 'Rename', show: canEdit && !isTrashView, fn: () => { setRenaming(true); setMenuOpen(false); } },
                  { icon: '🗑️', label: isTrashView ? 'Delete Forever' : 'Delete', show: canEdit, fn: () => { handleDelete(); setMenuOpen(false); }, danger: true },
                ].filter(a => a.show).map((action, i) => (
                  <button key={i} onClick={action.fn}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', border: 'none', background: 'none', fontSize: 12, color: action.danger ? '#dc2626' : 'var(--text-primary)', cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = action.danger ? '#fff5f5' : 'var(--bg-subtle)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <span>{action.icon}</span>{action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          {renaming ? (
            <div style={{ marginBottom: 8 }}>
              <input
                value={newName} onChange={e => setNewName(e.target.value)} autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') rename();
                  if (e.key === 'Escape') { setRenaming(false); setNewName(file.original_name); }
                }}
                style={{ width: '100%', border: `1.5px solid var(--blue)`, borderRadius: 6, padding: '5px 8px', fontSize: 12, outline: 'none', marginBottom: 6, background: 'var(--bg-subtle)', color: 'var(--text-primary)' }} />
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={rename} style={{ flex: 1, background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 0', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Save</button>
                <button onClick={() => { setRenaming(false); setNewName(file.original_name); }} style={{ flex: 1, background: 'var(--bg-subtle)', border: 'none', borderRadius: 6, padding: '5px 0', fontSize: 11, cursor: 'pointer', color: 'var(--text-secondary)' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <p title={file.original_name} style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3, lineHeight: 1.4 }}>
                {file.original_name}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, display: 'flex', gap: 5, alignItems: 'center' }}>
                <span style={{ fontWeight: 500 }}>{fmt(file.file_size)}</span>
                <span style={{ color: 'var(--border-mid)' }}>·</span>
                <span>{date}</span>
              </p>
            </>
          )}

          {!renaming && (
            <div style={{ display: 'flex', gap: 5, marginTop: 'auto' }}>
              <button onClick={download}
                style={{ flex: 1, background: hovered ? 'var(--blue-light)' : 'var(--bg-subtle)', color: hovered ? 'var(--blue)' : 'var(--text-secondary)', border: `1px solid ${hovered ? 'var(--blue-mid)' : 'var(--border-mid)'}`, borderRadius: 7, padding: '7px 0', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.18s ease' }}>
                ↓ Download
              </button>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 4, opacity: hovered ? 1 : 0, transform: hovered ? 'translateX(0)' : 'translateX(4px)', transition: 'opacity 0.18s ease, transform 0.18s ease', pointerEvents: hovered ? 'all' : 'none' }}>
                {isTrashView ? (
                  // Trash View: Show Restore
                  <ActionBtn label="♻️" title="Restore" onClick={handleRestore} />
                ) : (
                  // Normal View: Show Rename & Delete
                  <>
                    {canEdit && <ActionBtn label="✏️" title="Rename" onClick={() => setRenaming(true)} />}
                    {canEdit && <ActionBtn label="🗑️" title="Delete" onClick={handleDelete} danger />}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {preview && (
        <div onClick={() => setPreview(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.84)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 24 }}>
          <div className="anim-scalein" onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg-surface)', borderRadius: 18, width: '100%', maxWidth: 980, overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `1px solid var(--border)` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <div style={{ width: 36, height: 36, background: cfg.bg, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>{cfg.icon}</div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{file.original_name}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{file.file_type.toUpperCase()} · {fmt(file.file_size)} · {date}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={download} style={{ background: 'var(--blue-light)', color: 'var(--blue)', border: `1px solid var(--blue-mid)`, padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>↓ Download</button>
                <button onClick={() => setPreview(false)} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid var(--border-mid)`, background: 'var(--bg-subtle)', cursor: 'pointer', fontSize: 14, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
            </div>
            <div style={{ background: 'var(--bg-subtle)', maxHeight: '80vh', overflow: 'auto', padding: 20, borderRadius: '0 0 18px 18px' }}>
              {isImage
                ? <img src={src} alt={file.original_name} style={{ maxWidth: '100%', borderRadius: 10, display: 'block', margin: '0 auto' }} />
                : <iframe src={src} style={{ width: '100%', height: '72vh', border: 'none', borderRadius: 10 }} title={file.original_name} />
              }
            </div>
          </div>
        </div>
      )}

      {details && <FileDetailsModal file={file} onClose={() => setDetails(false)} />}
    </>
  );
}

function ActionBtn({ label, title, onClick, danger }: { label: string; title: string; onClick: () => void; danger?: boolean }) {
  const [h, setH] = useState(false);
  return (
    <button
      title={title} onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        width: 30, height: 30,
        background: h ? (danger ? '#fff5f5' : 'var(--bg-subtle)') : 'var(--bg-surface)',
        border: `1px solid ${h ? (danger ? '#fecaca' : 'var(--border-mid)') : 'var(--border-mid)'}`,
        borderRadius: 7, fontSize: 13, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s ease', flexShrink: 0
      }}>
      {label}
    </button>
  );
}