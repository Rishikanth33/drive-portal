'use client';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import api from '../lib/api';
import { logActivity } from './ActivityPanel';


interface QItem { name:string; size:number; progress:number; status:'queued'|'uploading'|'done'|'error'; message?:string; }
interface Props  { folderId:string|null; onUploadDone:()=>void; }

function fmt(b:number) {
  if (b<1024) return b+' B';
  if (b<1048576) return (b/1024).toFixed(1)+' KB';
  return (b/1048576).toFixed(1)+' MB';
}

export default function UploadZone({ folderId, onUploadDone }:Props) {
  const [queue,    setQueue]    = useState<QItem[]>([]);
  const [running,  setRunning]  = useState(false);
  const [expanded, setExpanded] = useState(false);

  const upd = (i:number, p:Partial<QItem>) =>
    setQueue(q => q.map((item,idx) => idx===i ? {...item,...p} : item));

  const run = async (files:File[]) => {
    const items:QItem[] = files.map(f => ({ name:f.name, size:f.size, progress:0, status:'queued' }));
    setQueue(items); setExpanded(true); setRunning(true);
    for (let i=0; i<files.length; i++) {
      upd(i,{status:'uploading'});
      const fd = new FormData();
      fd.append('files', files[i]);
      if (folderId) fd.append('folder_id', folderId);
      try {
        await api.post('/files/upload', fd, {
          headers:{'Content-Type':'multipart/form-data'},
          onUploadProgress: e => upd(i,{progress:Math.round((e.loaded*100)/(e.total??1))}),
        });
        
// ... inside run(), after upd(i,{status:'done',...}):
logActivity('⬆️', `Uploaded "${files[i].name}"`);
        
      } catch(e:any) {
        upd(i,{status:'error',message:e.response?.data?.error??'Upload failed'});
      }
    }
    setRunning(false); onUploadDone();
    setTimeout(()=>{ setQueue([]); setExpanded(false); },4000);
  };

  const {getRootProps,getInputProps,isDragActive} = useDropzone({
    onDrop:(ok,bad)=>{ if(bad.length) alert(`Rejected: ${bad[0].errors[0].message}`); if(ok.length) run(ok); },
    accept:{
      'image/jpeg':['.jpg','.jpeg'],'image/png':['.png'],'application/pdf':['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx'],
    },
    maxSize:50*1024*1024,
  });

  const done    = queue.filter(q=>q.status==='done').length;
  const total   = queue.length;
  const allDone = total>0 && done===total;

  return (
    <div style={{marginBottom:20}}>
      {/* ── Compact drop zone ── */}
      <div {...getRootProps()} style={{
        border:`2px dashed ${isDragActive?'var(--blue)':'var(--border-mid)'}`,
        borderRadius:12, padding:'18px 20px', cursor:'pointer',
        background: isDragActive ? 'var(--blue-light)' : 'var(--bg-surface)',
        transition:'all 0.2s ease',
        boxShadow: isDragActive ? '0 0 0 4px rgba(37,99,235,0.1)' : 'none',
        display:'flex', alignItems:'center', gap:16,
      }}>
        <input {...getInputProps()}/>
        <div style={{ width:44, height:44, background: isDragActive?'var(--blue-mid)':'var(--bg-subtle)', borderRadius:11, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0, transition:'all 0.25s ease', transform: isDragActive?'scale(1.12) translateY(-2px)':'scale(1)', boxShadow: isDragActive?'0 6px 16px rgba(37,99,235,0.2)':'none' }}>
          {isDragActive ? '📥' : '☁️'}
        </div>
        <div style={{flex:1, minWidth:0}}>
          <p style={{fontSize:14, fontWeight:600, color:'var(--text-primary)', marginBottom:2}}>
            {isDragActive ? 'Release to upload' : 'Drop files here or click to browse'}
          </p>
          <div style={{display:'flex', gap:5, flexWrap:'wrap'}}>
            {[
              {label:'JPG',  color:'#0369a1', bg:'#f0f9ff'},
              {label:'PNG',  color:'#15803d', bg:'#f0fdf4'},
              {label:'PDF',  color:'#c2410c', bg:'#fff7ed'},
              {label:'DOCX', color:'#1d4ed8', bg:'#eff6ff'},
              {label:'XLSX', color:'#166534', bg:'#f0fdf4'},
              {label:'Max 50 MB', color:'#64748b', bg:'var(--bg-subtle)'},
            ].map(t=>(
              <span key={t.label} style={{background:t.bg, color:t.color, fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4, letterSpacing:'0.05em'}}>{t.label}</span>
            ))}
          </div>
        </div>
        <div style={{fontSize:12, color:'var(--text-muted)', flexShrink:0, textAlign:'center', lineHeight:1.4}}>
          <div style={{fontWeight:600, color:'var(--blue)'}}>Browse</div>
          <div>or drag</div>
        </div>
      </div>

      {/* ── Queue panel ── */}
      {queue.length>0 && (
        <div className="anim-fadeup" style={{marginTop:8, background:'var(--bg-surface)', border:`1px solid var(--border)`, borderRadius:12, overflow:'hidden', boxShadow:'var(--shadow-sm)'}}>
          {/* Header */}
          <div onClick={()=>setExpanded(e=>!e)}
            style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 16px', cursor:'pointer', background: allDone?'#f0fdf4':'var(--bg-subtle)', borderBottom: expanded?`1px solid var(--border)`:'none', transition:'background 0.2s'}}>
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <span style={{fontSize:14}}>{running?'⬆️':allDone?'✅':'❌'}</span>
              <span style={{fontSize:13, fontWeight:600, color: allDone?'#15803d':'var(--text-primary)'}}>
                {running?`Uploading ${done+1} of ${total}…`:allDone?`${total} file${total>1?'s':''} uploaded`:`${done}/${total} uploaded`}
              </span>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:10}}>
              {running && (
                <div style={{width:90, height:4, background:'var(--border-mid)', borderRadius:99}}>
                  <div style={{background:'var(--blue)', height:4, borderRadius:99, width:`${Math.round((done/total)*100)}%`, transition:'width 0.4s ease'}}/>
                </div>
              )}
              <span style={{fontSize:10, color:'var(--text-muted)', fontWeight:500}}>{expanded?'▲':'▼'}</span>
            </div>
          </div>
          {/* Rows */}
          {expanded && queue.map((item,i)=>(
            <div key={i} style={{padding:'8px 16px', borderBottom: i<queue.length-1?`1px solid var(--border)`:'none'}}>
              <div style={{display:'flex', alignItems:'center', gap:8}}>
                <span style={{fontSize:13, flexShrink:0}}>
                  {item.status==='queued'&&'⏳'}{item.status==='uploading'&&'⬆️'}{item.status==='done'&&'✅'}{item.status==='error'&&'❌'}
                </span>
                <span style={{flex:1, fontSize:12, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{item.name}</span>
                <span style={{fontSize:11, color:'var(--text-muted)', flexShrink:0}}>{fmt(item.size)}</span>
                <span style={{fontSize:11, fontWeight:600, flexShrink:0, minWidth:36, textAlign:'right', color: item.status==='done'?'#15803d':item.status==='error'?'#dc2626':item.status==='uploading'?'var(--blue)':'var(--text-muted)'}}>
                  {item.status==='uploading'?`${item.progress}%`:item.status==='done'?'Done':item.status==='error'?'Error':'—'}
                </span>
              </div>
              {item.status==='uploading' && (
                <div style={{marginTop:5, background:'var(--bg-subtle)', borderRadius:99, height:3}}>
                  <div style={{background:'var(--blue)', height:3, borderRadius:99, width:`${item.progress}%`, transition:'width 0.3s ease'}}/>
                </div>
              )}
              {item.status==='error' && <p style={{fontSize:11, color:'#ef4444', marginTop:3}}>{item.message}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}