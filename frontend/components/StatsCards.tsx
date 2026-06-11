'use client';
import { useState } from 'react';
import { FileItem, Folder } from '../lib/types';

interface Props { files: FileItem[]; folders: Folder[]; }

function fmtSize(b: number) {
  if (b === 0) return '0 B';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
  return (b / 1073741824).toFixed(2) + ' GB';
}

const TOTAL_BYTES = 500 * 1024 * 1024; // 500 MB

export default function StatsCards({ files, folders }: Props) {
  const usedBytes = files.reduce((s, f) => s + Number(f.file_size), 0);
  const usedPct = Math.min((usedBytes / TOTAL_BYTES) * 100, 100);
  const recent = files.filter(f => Date.now() - new Date(f.uploaded_at).getTime() < 86400000).length;
  const lastFile = files.length > 0
    ? [...files].sort((a, b) => +new Date(b.uploaded_at) - +new Date(a.uploaded_at))[0]
    : null;

  const cards = [
    { icon: '📄', label: 'Total files', value: String(files.length), sub: 'all formats', iconBg: '#dbeafe', color: '#1d4ed8' },
    { icon: '📁', label: 'Folders', value: String(folders.length), sub: 'organised', iconBg: '#ede9fe', color: '#5b21b6' },
    { icon: '💾', label: 'Storage used', value: fmtSize(usedBytes), sub: `${usedPct.toFixed(1)}% of 500 MB`, iconBg: '#dcfce7', color: '#15803d' },
    { icon: '🕘', label: 'Today', value: String(recent), sub: lastFile ? `last: ${new Date(lastFile.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'no uploads yet', iconBg: '#fed7aa', color: '#9a3412' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
      {cards.map((c, i) => <StatCard key={i} card={c} delay={i * 0.05} />)}
    </div>
  );
}

function StatCard({ card, delay }: { card: any; delay: number }) {
  const [h, setH] = useState(false);
  return (
    <div className="anim-fadeup"
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ animationDelay: `${delay}s`, background: h ? 'var(--bg-subtle)' : 'var(--bg-surface)', border: `1px solid ${h ? 'var(--border-mid)' : 'var(--border)'}`, borderRadius: 12, padding: '15px 16px', display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.2s ease', boxShadow: h ? 'var(--shadow-md)' : 'var(--shadow-sm)', cursor: 'default' }}>
      <div style={{ width: 40, height: 40, background: card.iconBg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, transition: 'transform 0.2s', transform: h ? 'scale(1.08)' : 'scale(1)' }}>
        {card.icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 2 }}>{card.label}</p>
        <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, marginBottom: 2 }}>{card.value}</p>
        <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>{card.sub}</p>
      </div>
    </div>
  );
}