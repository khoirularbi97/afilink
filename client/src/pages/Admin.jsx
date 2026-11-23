import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { num } from '../format.js';

const STATUS = {
  pending: { label: 'Menunggu', cls: 'amber' },
  active: { label: 'Aktif', cls: 'green' },
  suspended: { label: 'Dinonaktifkan', cls: 'red' },
};

export default function Admin() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [tab, setTab] = useState('all');
  const [err, setErr] = useState('');

  const load = () => api.get('/admin/users').then(setUsers).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const setStatus = async (u, status) => {
    if (status === 'suspended' && !window.confirm(`Nonaktifkan ${u.name}? Semua link miliknya akan langsung berhenti berfungsi.`)) return;
    setErr('');
    await api.patch(`/admin/users/${u.id}/status`, { status }).catch((e) => setErr(e.message));
    load();
  };

  const pending = users?.filter((u) => u.status === 'pending').length || 0;
  const list = (users || []).filter((u) => tab === 'all' || u.status === tab);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Afiliator</h1>
          <p className="muted">Setujui pendaftaran baru dan kelola akses afiliator.</p>
        </div>
      </header>

      {err && <div className="alert error">{err}</div>}

      <div className="seg tabs">
        <button className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>Semua</button>
        <button className={tab === 'pending' ? 'on' : ''} onClick={() => setTab('pending')}>
          Menunggu {pending > 0 && <span className="count">{pending}</span>}
        </button>
        <button className={tab === 'active' ? 'on' : ''} onClick={() => setTab('active')}>Aktif</button>
        <button className={tab === 'suspended' ? 'on' : ''} onClick={() => setTab('suspended')}>Nonaktif</button>
      </div>

      {!users ? <div className="center-pad"><div className="spinner" /></div> : (
        <div className="card flush">
          <table className="table">
            <thead><tr><th>Nama</th><th>Status</th><th className="r hide-sm">Link</th><th className="r hide-sm">Klik</th><th className="r">Aksi</th></tr></thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name}</strong>{u.role === 'admin' && <span className="tag">admin</span>}
                    <div className="muted small">{u.email}</div>
                  </td>
                  <td><span className={`tag ${STATUS[u.status].cls}`}>{STATUS[u.status].label}</span></td>
                  <td className="r hide-sm">{num(u.links)}</td>
                  <td className="r hide-sm">{num(u.clicks)}</td>
                  <td className="r nowrap">
                    {u.id === me.id ? <span className="muted small">Kamu</span> : <>
                      {u.status !== 'active' && <button className="btn sm primary" onClick={() => setStatus(u, 'active')}>{u.status === 'pending' ? 'Setujui' : 'Aktifkan'}</button>}
                      {u.status !== 'suspended' && <button className="btn sm danger" onClick={() => setStatus(u, 'suspended')}>{u.status === 'pending' ? 'Tolak' : 'Nonaktifkan'}</button>}
                    </>}
                  </td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={5} className="muted center">Tidak ada data</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
