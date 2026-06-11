'use client';
import { useState } from 'react';
import { Folder, FileItem } from '../lib/types';
import api from '../lib/api';

interface Props {
  file: FileItem;
  folders: Folder[];
  onClose: () => void;
  onMoved: () => void;
}

export default function MoveModal({ file, folders, onClose, onMoved }: Props) {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(file.folder_id);
  const [loading, setLoading] = useState(false);

  const handleMove = async () => {
    setLoading(true);
    try {
      await api.patch(`/files/${file.id}/move`, { folder_id: selectedFolder });
      onMoved();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Move failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 24 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, boxShadow: '0 24px 48px rgba(0,0,0,0.2)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>Move file</p>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
              {file.original_name}
            </p>
          </div>
          <button onClick={onClose}
            style={{ width: 30, height: 30, border: '1px solid #e2e8f0', borderRadius: 7, background: '#f8fafc', cursor: 'pointer', fontSize: 14, color: '#64748b' }}>
            ✕
          </button>
        </div>

        {/* Folder list */}
        <div style={{ padding: '14px 20px', maxHeight: 280, overflowY: 'auto' }}>
          {/* Root option */}
          <div onClick={() => setSelectedFolder(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, cursor: 'pointer', marginBottom: 4, background: selectedFolder === null ? '#eff6ff' : 'transparent', border: `1px solid ${selectedFolder === null ? '#bfdbfe' : 'transparent'}`, transition: 'all 0.15s' }}>
            <span style={{ fontSize: 18 }}>🏠</span>
            <span style={{ fontSize: 14, fontWeight: selectedFolder === null ? 600 : 400, color: selectedFolder === null ? '#1d4ed8' : '#374151' }}>
              Root (no folder)
            </span>
            {selectedFolder === null && <span style={{ marginLeft: 'auto', color: '#2563eb', fontSize: 16 }}>✓</span>}
          </div>

          {folders.map(folder => (
            <div key={folder.id} onClick={() => setSelectedFolder(folder.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, cursor: 'pointer', marginBottom: 4, background: selectedFolder === folder.id ? '#eff6ff' : 'transparent', border: `1px solid ${selectedFolder === folder.id ? '#bfdbfe' : 'transparent'}`, transition: 'all 0.15s' }}>
              <span style={{ fontSize: 18 }}>📁</span>
              <span style={{ fontSize: 14, fontWeight: selectedFolder === folder.id ? 600 : 400, color: selectedFolder === folder.id ? '#1d4ed8' : '#374151' }}>
                {folder.name}
              </span>
              {selectedFolder === folder.id && <span style={{ marginLeft: 'auto', color: '#2563eb', fontSize: 16 }}>✓</span>}
            </div>
          ))}

          {folders.length === 0 && (
            <p style={{ textAlign: 'center', fontSize: 13, color: '#94a3b8', padding: '20px 0' }}>
              No folders yet — create one first
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 18px', fontSize: 13, cursor: 'pointer', color: '#475569', fontWeight: 500 }}>
            Cancel
          </button>
          <button onClick={handleMove} disabled={loading}
            style={{ background: loading ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Moving…' : 'Move here'}
          </button>
        </div>
      </div>
    </div>
  );
}