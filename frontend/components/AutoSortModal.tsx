'use client';
import { useState } from 'react';
import { FileItem, Folder } from '../lib/types';
import api from '../lib/api';

interface Props { files: FileItem[]; folders: Folder[]; onDone: () => void; onClose: () => void; }

const TYPE_GROUPS: { label: string; icon: string; types: string[]; folderName: string; color: string; bg: string }[] = [
  { label: 'PDFs',        icon: '📄', types: ['pdf'],         folderName: 'PDFs',      color: '#c2410c', bg: '#fff7ed' },
  { label: 'Images',      icon: '🖼️', types: ['jpg','jpeg','png'], folderName: 'Images', color: '#0369a1', bg: '#f0f9ff' },
  { label: 'Word Docs',   icon: '📝', types: ['docx'],        folderName: 'Documents', color: '#1d4ed8', bg: '#eff6ff' },
  { label: 'Spreadsheets',icon: '📊', types: ['xlsx'],        folderName: 'Spreadsheets', color: '#166534', bg: '#f0fdf4' },
];

export default function AutoSortModal({ files, folders, onDone, onClose }: Props) {
  const [running,  setRunning]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [log,      setLog]      = useState<{ text: string; ok: boolean }[]>([]);
  const [selected, setSelected] = useState<string[]>(TYPE_GROUPS.map(g => g.folderName));

  const preview = TYPE_GROUPS.map(g => ({
    ...g,
    count: files.filter(f => g.types.includes(f.file_type)).length,
  })).filter(g => g.count > 0);

  const toggle = (name: string) =>
    setSelected(s => s.includes(name) ? s.filter(x => x !== name) : [...s, name]);

  const run = async () => {
    setRunning(true);
    const addLog = (text: string, ok = true) => setLog(l => [...l, { text, ok }]);

    for (const group of preview) {
      if (!selected.includes(group.folderName)) continue;

      // Find or create folder
      let folder = folders.find(f => f.name === group.folderName && !f.parent_id);
      if (!folder) {
        try {
          const res = await api.post('/folders', { name: group.folderName });
          folder = res.data;
          addLog(`Created folder "${group.folderName}"`);
        } catch {
          addLog(`Failed to create folder "${group.folderName}"`, false);
          continue;
        }
      } else {
        addLog(`Using existing folder "${group.folderName}"`);
      }

      // Move files
      const toMove = files.filter(f => group.types.includes(f.file_type) && f.folder_id !== folder!.id);
      for (const file of toMove) {
        try {
          await api.patch(`/files/${file.id}/move`, { folder_id: folder!.id });
          addLog(`Moved "${file.original_name}" → ${group.folderName}`);
        } catch {
          addLog(`Failed to move "${file.original_name}"`, false);
        }
      }
    }

    setRunning(false);
    setDone(true);
    onDone();
  };

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 24 }}>
      <div onClick={e => e.stopPropagation()}
        className="anim-scalein"
        style={{ background: 'var(--bg-surface)', borderRadius: 18, width: '100%', maxWidth: 480, overflow: 'hidden', boxShadow: '0 32px 64px rgba(0,0,0,0.3)' }}>

        {/* Header */}
        <div style={{ padding: '20px 22px', borderBottom: `1px solid var(--border)` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                ✨ Auto-sort files by type
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Automatically move files into organised folders based on their type.
              </p>
            </div>
            <button onClick={onClose}
              style={{ width: 30, height: 30, border: `1px solid var(--border-mid)`, borderRadius: 7, background: 'var(--bg-subtle)', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)', flexShrink: 0, marginLeft: 12 }}>
              ✕
            </button>
          </div>
        </div>

        {/* Preview */}
        {!done && (
          <div style={{ padding: '18px 22px' }}>
            {preview.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
                <p style={{ fontSize: 14 }}>No files to sort</p>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 12, textTransform: 'uppercase' }}>
                  Select which types to sort
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {preview.map(g => (
                    <div key={g.folderName}
                      onClick={() => toggle(g.folderName)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: selected.includes(g.folderName) ? g.bg : 'var(--bg-subtle)', border: `1.5px solid ${selected.includes(g.folderName) ? g.color + '40' : 'transparent'}`, borderRadius: 10, cursor: 'pointer', transition: 'all 0.18s' }}>
                      <span style={{ fontSize: 22 }}>{g.icon}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 1 }}>
                          {g.label}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {g.count} file{g.count !== 1 ? 's' : ''} → <span style={{ fontWeight: 500, color: g.color }}>/{g.folderName}</span>
                        </p>
                      </div>
                      <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${selected.includes(g.folderName) ? g.color : 'var(--border-mid)'}`, background: selected.includes(g.folderName) ? g.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                        {selected.includes(g.folderName) && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={run} disabled={running || selected.length === 0}
                  style={{ width: '100%', background: running ? '#93c5fd' : 'var(--blue)', color: '#fff', border: 'none', padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: running || selected.length === 0 ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
                  {running ? 'Sorting files…' : `Sort ${selected.length} type${selected.length !== 1 ? 's' : ''}`}
                </button>
              </>
            )}
          </div>
        )}

        {/* Log output */}
        {log.length > 0 && (
          <div style={{ padding: '0 22px 20px', maxHeight: 220, overflowY: 'auto' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 8, textTransform: 'uppercase' }}>Activity</p>
            {log.map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 5 }}>
                <span style={{ fontSize: 12, flexShrink: 0 }}>{l.ok ? '✅' : '❌'}</span>
                <span style={{ fontSize: 12, color: l.ok ? 'var(--text-secondary)' : '#dc2626', lineHeight: 1.4 }}>{l.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Done state */}
        {done && (
          <div style={{ padding: '0 22px 22px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>All done!</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>Your files have been organised.</p>
            <button onClick={onClose}
              style={{ background: 'var(--blue)', color: '#fff', border: 'none', padding: '10px 28px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}