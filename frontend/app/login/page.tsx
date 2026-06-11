'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin,  setIsLogin]  = useState(true);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [role,     setRole]     = useState('user');
  const [msg,      setMsg]      = useState('');
  const [ok,       setOk]       = useState(false);
  const [loading,  setLoading]  = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(''); setLoading(true);
    try {
      if (isLogin) {
        const res = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        router.push('/dashboard');
      } else {
        await api.post('/auth/register', { email, password, role });
        setOk(true); setMsg('Account created — please sign in.'); setIsLogin(true);
      }
    } catch (e: any) {
      setOk(false); setMsg(e.response?.data?.error ?? 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#f8fafc' }}>

      {/* Left — branding panel */}
      <div style={{ flex: 1, background: 'linear-gradient(155deg, #1e3a5f 0%, #1e40af 55%, #2d1b69 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 64px', color: '#fff' }}
        className="hidden lg:flex">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 52 }}>
          <div style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.15)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, backdropFilter: 'blur(8px)' }}>🗂️</div>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em' }}>Drive Portal</span>
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.18, marginBottom: 18, letterSpacing: '-0.02em' }}>
          Your files,<br/>organised.
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.75, opacity: 0.72, maxWidth: 340 }}>
          Upload, organise, preview and share documents securely. Role-based access keeps everything in the right hands.
        </p>
        <div style={{ display: 'flex', gap: 28, marginTop: 48 }}>
          {[['🔒','Secure access'],['⚡','Fast uploads'],['👥','Team roles']].map(([icon, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, opacity: 0.75 }}>
              <span>{icon}</span><span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right — form panel */}
      <div style={{ width: '100%', maxWidth: 460, background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '56px 44px', boxShadow: '-16px 0 48px rgba(15,23,42,0.08)' }}>
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginBottom: 6, letterSpacing: '-0.02em' }}>
            {isLogin ? 'Sign in' : 'Create account'}
          </h2>
          <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
            {isLogin ? 'Welcome back — enter your details below.' : 'Fill in the form to get started.'}
          </p>
        </div>

        {/* Toggle */}
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 10, padding: 3, marginBottom: 26 }}>
          {[['Login', true], ['Register', false]].map(([label, val]) => (
            <button key={label as string} onClick={() => { setIsLogin(val as boolean); setMsg(''); }}
              style={{ flex: 1, padding: '8px 0', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.18s',
                background: isLogin === val ? '#fff' : 'transparent',
                color: isLogin === val ? '#1d4ed8' : '#64748b',
                boxShadow: isLogin === val ? '0 1px 4px rgba(15,23,42,0.1)' : 'none',
              }}>
              {label as string}
            </button>
          ))}
        </div>

        {msg && (
          <div style={{ padding: '10px 14px', borderRadius: 9, fontSize: 13, marginBottom: 20, fontWeight: 500,
            background: ok ? '#f0fdf4' : '#fff5f5',
            color:      ok ? '#15803d' : '#dc2626',
            border:     `1px solid ${ok ? '#bbf7d0' : '#fecaca'}`,
          }}>
            {msg}
          </div>
        )}

        <form onSubmit={submit}>
          <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com"/>
          <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••"/>
          {!isLogin && (
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Role</label>
              <select value={role} onChange={e => setRole(e.target.value)}
                style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '10px 13px', fontSize: 13, outline: 'none', background: '#fff', color: '#0f172a' }}>
                <option value="user">User — standard access</option>
                <option value="admin">Admin — full access</option>
              </select>
            </div>
          )}
          <button type="submit" disabled={loading}
            style={{ width: '100%', background: loading ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 6, transition: 'background 0.2s', letterSpacing: '0.01em' }}>
            {loading ? 'Please wait…' : isLogin ? 'Sign in →' : 'Create account →'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange, placeholder }: { label: string; type: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>{label}</label>
      <input
        type={type} value={value} required placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ width: '100%', border: `1.5px solid ${focused ? '#2563eb' : '#e2e8f0'}`, borderRadius: 9, padding: '10px 13px', fontSize: 13, outline: 'none', background: '#fff', color: '#0f172a', transition: 'border-color 0.18s' }}
      />
    </div>
  );
}