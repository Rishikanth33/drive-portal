'use client';
import { useEffect, useState } from 'react';

interface Activity { id: number; text: string; time: Date; icon: string; }

// Simple in-memory store — in production this would be an API call
const activityStore: Activity[] = [];
let nextId = 1;

export function logActivity(icon: string, text: string) {
  activityStore.unshift({ id: nextId++, text, time: new Date(), icon });
  if (activityStore.length > 20) activityStore.pop();
}

function timeAgo(d: Date) {
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60)  return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return d.toLocaleDateString('en-GB', {day:'2-digit',month:'short'});
}

export default function ActivityPanel() {
  const [items, setItems] = useState<Activity[]>([...activityStore]);

  useEffect(() => {
    const t = setInterval(() => setItems([...activityStore]), 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ background:'var(--bg-surface)', border:`1px solid var(--border)`, borderRadius:12, overflow:'hidden' }}>
      <div style={{ padding:'13px 16px', borderBottom:`1px solid var(--border)`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <p style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>Recent Activity</p>
        <span style={{ fontSize:11, color:'var(--text-muted)' }}>{items.length} events</span>
      </div>
      {items.length === 0 ? (
        <div style={{ padding:'24px 16px', textAlign:'center' }}>
          <div style={{ fontSize:28, marginBottom:8 }}>💤</div>
          <p style={{ fontSize:12, color:'var(--text-muted)' }}>No activity yet</p>
        </div>
      ) : (
        <div style={{ maxHeight:240, overflowY:'auto' }}>
          {items.map(item => (
            <div key={item.id} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'9px 16px', borderBottom:`1px solid var(--border)`, transition:'background 0.15s' }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--bg-subtle)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <span style={{ fontSize:15, flexShrink:0, marginTop:1 }}>{item.icon}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:12, color:'var(--text-primary)', lineHeight:1.4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.text}</p>
                <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>{timeAgo(item.time)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}