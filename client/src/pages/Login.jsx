import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try { await login(form.email, form.password); nav('/'); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <img src="/logo.png" alt="AfiLink" className="auth-logo" />
        <p className="muted auth-tagline">Kelola link afiliasi dan pantau setiap klik.</p>
        {err && <div className="alert error">{err}</div>}
        <label>Email
          <input type="email" required autoFocus value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label>Password
          <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <button className="btn primary block" disabled={busy}>{busy ? 'Masuk…' : 'Masuk'}</button>
        <p className="muted small center">Belum punya akun? <Link to="/register">Daftar</Link></p>
      </form>
    </div>
  );
}
