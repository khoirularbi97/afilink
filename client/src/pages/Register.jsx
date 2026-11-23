import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try { await api.post('/auth/register', form); setDone(true); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-card center">
          <div className="success-icon">✓</div>
          <h2>Pendaftaran terkirim</h2>
          <p className="muted">Akun kamu menunggu persetujuan admin. Setelah disetujui, kamu bisa langsung masuk.</p>
          <Link to="/login" className="btn primary block">Ke halaman masuk</Link>
        </div>
      </div>
    );
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <img src="/logo.png" alt="AfiLink" className="auth-logo" />
        <p className="muted auth-tagline">Daftar sebagai afiliator.</p>
        {err && <div className="alert error">{err}</div>}
        <label>Nama<input required minLength={2} value={form.name} onChange={set('name')} /></label>
        <label>Email<input type="email" required value={form.email} onChange={set('email')} /></label>
        <label>Password<input type="password" required minLength={8} value={form.password} onChange={set('password')} />
          <small className="muted">Minimal 8 karakter</small>
        </label>
        <button className="btn primary block" disabled={busy}>{busy ? 'Mengirim…' : 'Daftar'}</button>
        <p className="muted small center">Sudah punya akun? <Link to="/login">Masuk</Link></p>
      </form>
    </div>
  );
}
