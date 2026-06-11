'use client';
import { FileItem } from '../lib/types';

interface Props { file: FileItem; onClose: () => void; }

const TYPE_CFG: Record<string,{bg:string;color:string;icon:string}> = {
  pdf:  {bg:'#fff7ed',color:'#c2410c',icon:'📄'},
  jpg:  {bg:'#f0f9ff',color:'#0369a1',icon:'🖼️'},
  jpeg: {bg:'#f0f9ff',color:'#0369a1',icon:'🖼️'},
  png:  {bg:'#f0fdf4',color:'#15803d',icon:'🖼️'},
  docx: {bg:'#eff6ff',color:'#1d4ed8',icon:'📝'},
  xlsx: {bg:'#f0fdf4',color:'#166534',icon:'📊'},
};

function fmt(b:number) {
  if (b<1024) return b+' B';
  if (b<1048576) return (b/1024).toFixed(1)+' KB';
  return (b/1048576).toFixed(1)+' MB';
}

export default function FileDetailsModal({ file, onClose }:Props) {
  const cfg = TYPE_CFG[file.file_type] ?? {bg:'#f8fafc',color:'#475569',icon:'📎'};
  const rows = [
    {label:'File name',  value:file.original_name},
    {label:'Type',       value:file.file_type.toUpperCase()},
    {label:'Size',       value:fmt(Number(file.file_size))},
    {label:'Uploaded',   value:new Date(file.uploaded_at).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})},
    {label:'Location',   value:file.folder_id ? 'Inside a folder' : 'Root (My Files)'},
    {label:'File ID',    value:file.id.slice(0,16)+'…'},
  ];

  return (
    <div onClick={onClose}
      style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.72)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:24}}>
      <div onClick={e=>e.stopPropagation()} className="anim-scalein"
        style={{background:'var(--bg-surface)',borderRadius:18,width:'100%',maxWidth:400,overflow:'hidden',boxShadow:'0 32px 64px rgba(0,0,0,0.28)'}}>

        {/* Header */}
        <div style={{padding:'20px 20px 0', display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <div style={{width:44,height:44,background:cfg.bg,borderRadius:11,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>
              {cfg.icon}
            </div>
            <div>
              <p style={{fontSize:15,fontWeight:700,color:'var(--text-primary)',maxWidth:240,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{file.original_name}</p>
              <span style={{background:cfg.bg,color:cfg.color,fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:4,letterSpacing:'0.06em'}}>{file.file_type.toUpperCase()}</span>
            </div>
          </div>
          <button onClick={onClose}
            style={{width:30,height:30,border:`1px solid var(--border-mid)`,borderRadius:7,background:'var(--bg-subtle)',cursor:'pointer',fontSize:13,color:'var(--text-secondary)',flexShrink:0}}>
            ✕
          </button>
        </div>

        {/* Details */}
        <div style={{padding:'18px 20px 20px'}}>
          <div style={{background:'var(--bg-subtle)',borderRadius:10,overflow:'hidden'}}>
            {rows.map((r,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'9px 13px',borderBottom: i<rows.length-1?`1px solid var(--border)`:'none'}}>
                <span style={{fontSize:12,color:'var(--text-muted)',fontWeight:500,flexShrink:0,marginRight:12}}>{r.label}</span>
                <span style={{fontSize:12,color:'var(--text-primary)',textAlign:'right',wordBreak:'break-all'}}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}