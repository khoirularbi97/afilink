import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

const Icon = {
  chart: <svg viewBox="0 0 24 24"><path d="M4 19V5M4 19h16M8 15v-4M12 15V8M16 15v-6" /></svg>,
  link: <svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" /></svg>,
  users: <svg viewBox="0 0 24 24"><path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M22 19v-1a4 4 0 0 0-3-3.87M16 4.13a3 3 0 0 1 0 5.74" /></svg>,
  out: <svg viewBox="0 0 24 24"><path d="M15 17l5-5-5-5M20 12H9M12 20H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7" /></svg>,
};

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const items = [
    { to: '/', label: 'Statistik', icon: Icon.chart, end: true },
    { to: '/links', label: 'Link Saya', icon: Icon.link },
    ...(user.role === 'admin' ? [{ to: '/admin', label: 'Afiliator', icon: Icon.users }] : []),
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><img src="/mark.png" alt="" className="brand-logo" /><span><span className="afi">Afi</span><span className="link">Link</span></span></div>
        <nav>
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end} className="nav-item">
              {i.icon}<span>{i.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="me">
            <div className="avatar">{user.name[0].toUpperCase()}</div>
            <div className="me-text">
              <strong>{user.name}</strong>
              <small>{user.role === 'admin' ? 'Admin' : 'Afiliator'}</small>
            </div>
          </div>
          <button className="nav-item logout" onClick={async () => { await logout(); nav('/login'); }}>
            {Icon.out}<span>Keluar</span>
          </button>
        </div>
      </aside>
      <main className="content"><Outlet /></main>
    </div>
  );
}
