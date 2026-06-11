'use client';
import { useEffect, useState } from 'react';

interface Props {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); setTimeout(onClose, 300); }, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', icon: '✅' },
    error:   { bg: '#fff5f5', border: '#fecaca', color: '#dc2626', icon: '❌' },
    info:    { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', icon: 'ℹ️' },
  };
  const c = colors[type];

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12,
      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(8px)',
      transition: 'all 0.3s ease',
      maxWidth: 340, minWidth: 260,
    }}>
      <span style={{ fontSize: 16 }}>{c.icon}</span>
      <p style={{ flex: 1, fontSize: 13, fontWeight: 500, color: c.color }}>{message}</p>
      <button onClick={onClose}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: c.color, padding: '0 2px', opacity: 0.6 }}>
        ✕
      </button>
    </div>
  );
}