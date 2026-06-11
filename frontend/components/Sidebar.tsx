'use client';
import { useState } from 'react';
import { User } from '../lib/types';
import ActivityPanel from './ActivityPanel';

interface Props { user:User|null; fileCount:number; activeSection:string; onSectionChange:(s:string)=>void; }

const NAV = [
  {id:'files',   icon:'🏠', label:'My Files'},
  {id:'recent',  icon:'🕘', label:'Recent'},
  {id:'starred', icon:'⭐', label:'Starred'},
  {id:'trash',   icon:'🗑️', label:'Trash'},
];

export default function Sidebar({user,fileCount,activeSection,onSectionChange}:Props) {
  const TOTAL_BYTES = 15*1073741824;

  return (
    <aside style={{width:210,background:'var(--bg-surface)',borderRight:`1px solid var(--border)`,display:'flex',flexDirection:'column',padding:'18px 8px',position:'sticky',top:60,height:'calc(100vh - 60px)',overflowY:'auto',flexShrink:0}}>

      <p style={{fontSize:10,fontWeight:700,color:'var(--text-muted)',letterSpacing:'0.09em',padding:'0 10px',marginBottom:6}}>MENU</p>

      {NAV.map(item=><NavItem key={item.id} item={item} active={activeSection===item.id} onClick={()=>onSectionChange(item.id)}/>)}

      <div style={{height:1,background:'var(--border)',margin:'14px 8px'}}/>

      {/* Storage */}
      <div style={{padding:'12px 11px',background:'var(--bg-subtle)',borderRadius:10,margin:'0 2px',marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
          <p style={{fontSize:12,fontWeight:600,color:'var(--text-primary)'}}>Storage</p>
          <p style={{fontSize:11,color:'var(--blue)',fontWeight:600}}>{fileCount} files</p>
        </div>
        <div style={{background:'var(--border-mid)',borderRadius:99,height:5,marginBottom:5}}>
          <div style={{background:'var(--blue)',width:`${Math.min((fileCount/100)*100,100)}%`,height:5,borderRadius:99,transition:'width 0.6s ease'}}/>
        </div>
        <p style={{fontSize:10,color:'var(--text-muted)'}}>15 GB total</p>
      </div>

      {user?.role==='admin'&&(
        <div style={{padding:'8px 11px',background:'#ede9fe',borderRadius:9,textAlign:'center',marginBottom:12}}>
          <p style={{fontSize:11,fontWeight:700,color:'#4c1d95'}}>⚡ Admin</p>
          <p style={{fontSize:10,color:'#7c3aed',marginTop:1}}>Full access</p>
        </div>
      )}

      <div style={{height:1,background:'var(--border)',margin:'4px 8px 12px'}}/>

      {/* Activity */}
      <ActivityPanel/>
    </aside>
  );
}

function NavItem({item,active,onClick}:{item:typeof NAV[0];active:boolean;onClick:()=>void}) {
  const [h,setH]=useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{width:'100%',display:'flex',alignItems:'center',gap:9,padding:'8px 10px',borderRadius:8,fontSize:13,border:'none',cursor:'pointer',textAlign:'left',marginBottom:1,transition:'background 0.15s, color 0.15s',
        background:active?'var(--blue-light)':h?'var(--bg-hover)':'transparent',
        color:active?'var(--blue)':'var(--text-secondary)',
        fontWeight:active?600:400}}>
      <span style={{fontSize:15,width:18,textAlign:'center',flexShrink:0}}>{item.icon}</span>
      {item.label}
      {active&&<span style={{marginLeft:'auto',width:5,height:5,borderRadius:'50%',background:'var(--blue)',flexShrink:0}}/>}
    </button>
  );
}