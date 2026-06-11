'use client';
import { useEffect, useRef, useState } from 'react';
import { Folder } from '../lib/types';
import api from '../lib/api';

interface Props {
  folders: Folder[];
  onFolderClick: (id: string | null, name: string) => void;
  onRefresh: () => Promise<void>;
  currentFolderId: string | null;
  isAdmin: boolean;
  currentUserId: string;
  fileCounts: Record<string, number>; // Replace Record<string, number> with the actual type of fileCounts
}

// Colour per folder name pattern
function folderColor(name:string):{bg:string;icon:string;color:string} {
  const n = name.toLowerCase();
  if (n.includes('pdf'))          return {bg:'#fff7ed',icon:'📄',color:'#c2410c'};
  if (n.includes('image')||n.includes('img')||n.includes('photo')) return {bg:'#f5f3ff',icon:'🖼️',color:'#6d28d9'};
  if (n.includes('doc')||n.includes('word')) return {bg:'#eff6ff',icon:'📝',color:'#1d4ed8'};
  if (n.includes('sheet')||n.includes('excel')||n.includes('spread')) return {bg:'#f0fdf4',icon:'📊',color:'#15803d'};
  if (n.includes('project'))      return {bg:'#fff7ed',icon:'🚀',color:'#b45309'};
  if (n.includes('resume')||n.includes('cv')) return {bg:'#fdf2f8',icon:'📋',color:'#9d174d'};
  return {bg:'#f8fafc',icon:'📁',color:'#475569'};
}

export default function FolderPanel({ folders,currentFolderId,onFolderClick,onRefresh,isAdmin,currentUserId }:Props) {
  const [creating,  setCreating]  = useState(false);
  const [newName,   setNewName]   = useState('');
  const [renamingId,setRenamingId]= useState<string|null>(null);
  const [renameName,setRenameName]= useState('');

  const create = async () => {
    if (!newName.trim()) return;
    try { await api.post('/folders',{name:newName,parent_id:currentFolderId}); setNewName(''); setCreating(false); onRefresh(); }
    catch(e:any) { alert(e.response?.data?.error||'Failed'); }
  };

  const rename = async (id:string) => {
    if (!renameName.trim()) return;
    try { await api.patch(`/folders/${id}`,{name:renameName}); setRenamingId(null); onRefresh(); }
    catch(e:any) { alert(e.response?.data?.error||'Failed'); }
  };

  const remove = async (id:string,name:string) => {
    if (!confirm(`Delete folder "${name}"?`)) return;
    try { await api.delete(`/folders/${id}`); onRefresh(); if(currentFolderId===id) onFolderClick(null,''); }
    catch(e:any) { alert(e.response?.data?.error||'Failed'); }
  };

  const visible = folders.filter(f => f.parent_id===currentFolderId);
  const fileCountInFolder = (id:string) => 0; // placeholder — real count comes from files prop if needed

  return (
    <div style={{marginBottom:24}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
        <div style={{display:'flex', alignItems:'center', gap:7}}>
          <span style={{fontSize:14, fontWeight:600, color:'var(--text-primary)'}}>Folders</span>
          <span style={{background:'var(--bg-subtle)', color:'var(--text-muted)', fontSize:11, fontWeight:600, padding:'2px 7px', borderRadius:20}}>{visible.length}</span>
        </div>
        <button onClick={()=>setCreating(true)}
          style={{display:'flex', alignItems:'center', gap:5, background:'var(--blue)', color:'#fff', border:'none', padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', transition:'opacity 0.15s'}}
          onMouseEnter={e=>e.currentTarget.style.opacity='0.88'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
          + New Folder
        </button>
      </div>

      {creating && (
        <div style={{display:'flex', gap:8, marginBottom:14, background:'var(--blue-light)', border:`1.5px solid var(--blue-mid)`, borderRadius:10, padding:'10px 13px'}}>
          <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Folder name…" autoFocus
            onKeyDown={e=>{if(e.key==='Enter')create();if(e.key==='Escape')setCreating(false);}}
            style={{flex:1, border:`1.5px solid var(--blue)`, borderRadius:7, padding:'7px 11px', fontSize:13, outline:'none', background:'var(--bg-surface)', color:'var(--text-primary)'}}/>
          <button onClick={create} style={{background:'var(--blue)', color:'#fff', border:'none', padding:'7px 16px', borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer'}}>Create</button>
          <button onClick={()=>{setCreating(false);setNewName('');}} style={{background:'var(--bg-surface)', border:`1px solid var(--border-mid)`, padding:'7px 12px', borderRadius:7, fontSize:13, cursor:'pointer', color:'var(--text-secondary)'}}>Cancel</button>
        </div>
      )}

      {visible.length===0 ? (
        <div style={{textAlign:'center', padding:'28px', background:'var(--bg-surface)', borderRadius:12, border:`2px dashed var(--border-mid)`}}>
          <div style={{fontSize:32, marginBottom:8}}>📭</div>
          <p style={{fontSize:13, fontWeight:500, color:'var(--text-secondary)', marginBottom:3}}>No folders yet</p>
          <p style={{fontSize:12, color:'var(--text-muted)'}}>Create a folder to organise your files</p>
        </div>
      ) : (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(148px,1fr))', gap:10}}>
          {visible.map(f=>(
            <FolderCard key={f.id} folder={f}
              isActive={currentFolderId===f.id}
              canEdit={isAdmin||f.owner_id===currentUserId}
              isRenaming={renamingId===f.id}
              renameName={renameName}
              onRenameChange={setRenameName}
              onClick={()=>onFolderClick(f.id,f.name)}
              onRenameStart={()=>{setRenamingId(f.id);setRenameName(f.name);}}
              onRenameSave={()=>rename(f.id)}
              onRenameCancel={()=>setRenamingId(null)}
              onDelete={()=>remove(f.id,f.name)}/>
          ))}
        </div>
      )}
    </div>
  );
}

function FolderCard({folder,isActive,canEdit,isRenaming,renameName,onRenameChange,onClick,onRenameStart,onRenameSave,onRenameCancel,onDelete}:any) {
  const [hovered,  setHovered]  = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const cfg = folderColor(folder.name);

  // Close menu on outside click
  useEffect(()=>{
    const handler = (e:MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener('mousedown', handler);
    return ()=>document.removeEventListener('mousedown', handler);
  },[menuOpen]);

  return (
    <div onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>{setHovered(false);}}
      style={{ position:'relative', background: isActive ? cfg.bg : 'var(--bg-surface)', border:`1.5px solid ${isActive?cfg.color+'60':'var(--border)'}`, borderRadius:12, padding:'14px 13px', cursor:'pointer', transition:'all 0.18s ease', transform: hovered&&!isRenaming?'translateY(-2px)':'none', boxShadow: hovered?'var(--shadow-md)':'var(--shadow-sm)' }}>

      {isRenaming ? (
        <div onClick={e=>e.stopPropagation()}>
          <input value={renameName} onChange={e=>onRenameChange(e.target.value)} autoFocus
            onKeyDown={e=>{if(e.key==='Enter')onRenameSave();if(e.key==='Escape')onRenameCancel();}}
            style={{width:'100%', border:`1.5px solid var(--blue)`, borderRadius:6, padding:'4px 7px', fontSize:12, outline:'none', marginBottom:6, background:'var(--bg-surface)', color:'var(--text-primary)', textAlign:'center'}}/>
          <div style={{display:'flex', gap:4}}>
            <button onClick={onRenameSave} style={{flex:1, background:'var(--blue)', color:'#fff', border:'none', borderRadius:5, padding:'4px 0', fontSize:11, fontWeight:600, cursor:'pointer'}}>Save</button>
            <button onClick={onRenameCancel} style={{flex:1, background:'var(--bg-subtle)', border:'none', borderRadius:5, padding:'4px 0', fontSize:11, cursor:'pointer', color:'var(--text-secondary)'}}>Cancel</button>
          </div>
        </div>
      ) : (
        <div onClick={onClick}>
          <div style={{width:36, height:36, background:cfg.bg, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, marginBottom:9, border:`1px solid ${cfg.color}20`, transition:'transform 0.2s', transform: hovered?'scale(1.08)':'scale(1)'}}>
            {cfg.icon}
          </div>
          <p style={{fontSize:12, fontWeight:600, color: isActive?cfg.color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:2}}>
            {folder.name}
          </p>
        </div>
      )}

      {/* 3-dot menu */}
      {canEdit && !isRenaming && (
        <div ref={menuRef} style={{position:'absolute', top:8, right:8}}>
          <button
            onClick={e=>{e.stopPropagation();setMenuOpen(m=>!m);}}
            style={{width:24, height:24, border:'none', background: menuOpen||hovered?'var(--bg-subtle)':'transparent', borderRadius:5, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, color:'var(--text-muted)', transition:'all 0.15s', opacity: hovered||menuOpen?1:0}}>
            ⋮
          </button>

          {menuOpen && (
            <div className="anim-scalein"
              style={{position:'absolute', top:28, right:0, background:'var(--bg-surface)', border:`1px solid var(--border-mid)`, borderRadius:9, overflow:'hidden', boxShadow:'0 8px 24px rgba(0,0,0,0.12)', minWidth:130, zIndex:200}}>
              <button onClick={e=>{e.stopPropagation();setMenuOpen(false);onRenameStart();}}
                style={{width:'100%', display:'flex', alignItems:'center', gap:8, padding:'9px 13px', border:'none', background:'none', fontSize:13, color:'var(--text-primary)', cursor:'pointer', textAlign:'left', transition:'background 0.12s'}}
                onMouseEnter={e=>e.currentTarget.style.background='var(--bg-subtle)'}
                onMouseLeave={e=>e.currentTarget.style.background='none'}>
                ✏️ Rename
              </button>
              <button onClick={e=>{e.stopPropagation();setMenuOpen(false);onDelete();}}
                style={{width:'100%', display:'flex', alignItems:'center', gap:8, padding:'9px 13px', border:'none', background:'none', fontSize:13, color:'#dc2626', cursor:'pointer', textAlign:'left', transition:'background 0.12s'}}
                onMouseEnter={e=>e.currentTarget.style.background='#fff5f5'}
                onMouseLeave={e=>e.currentTarget.style.background='none'}>
                🗑️ Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}