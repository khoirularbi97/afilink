import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api.js';
import { num, pct, dateShort, timeAgo, daysAgo, todayWIB, SOURCE_LABEL, DEVICE_LABEL, label } from '../format.js';

const PRESETS = [
  { key: '7', label: '7 hari' },
  { key: '30', label: '30 hari' },
  { key: '90', label: '90 hari' },
];

function Bars({ title, rows, map }) {
  const max = Math.max(1, ...rows.map((r) => r.clicks));
  const total = rows.reduce((s, r) => s + r.clicks, 0);
  return (
    <div className="card">
      <h3>{title}</h3>
      {rows.length === 0 ? <p className="muted small">Belum ada data</p> : (
        <ul className="bars">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="bar-head">
                <span>{map ? label(map, r.key) : (r.key === 'unknown' ? 'Tidak diketahui' : r.key)}</span>
                <span className="muted">{num(r.clicks)} · {pct(r.clicks, total)}%</span>
              </div>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${(r.clicks / max) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ChartTip({ active, payload, label: d }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <strong>{dateShort(d)}</strong>
      <div>Klik: {num(payload[0].payload.clicks)}</div>
      <div>Unik: {num(payload[0].payload.unique_clicks)}</div>
    </div>
  );
}

export default function Dashboard() {
  const [params, setParams] = useSearchParams();
  const preset = params.get('range') || '30';
  const linkId = params.get('link_id') || '';
  const [links, setLinks] = useState([]);
  const [data, setData] = useState(null);
  const [recent, setRecent] = useState([]);
  const [err, setErr] = useState('');
  const [tick, setTick] = useState(0);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/links').then(setLinks).catch(() => {}); }, [tick]);

  useEffect(() => {
    const q = new URLSearchParams({ from: daysAgo(+preset - 1), to: todayWIB() });
    if (linkId) q.set('link_id', linkId);
    setErr(''); setLoading(true);
    Promise.all([api.get('/stats/overview?' + q), api.get('/stats/recent')])
      .then(([o, r]) => { setData(o); setRecent(r); setUpdatedAt(new Date()); })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [preset, linkId, tick]);

  const updatedText = updatedAt &&
    updatedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

  const update = (k, v) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v); else p.delete(k);
    setParams(p);
  };

  const t = data?.totals;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Statistik</h1>
          <p className="muted">
            Klik dari bot dan crawler pratinjau link tidak dihitung di angka utama.
            {updatedText && <> · Diperbarui {updatedText}</>}
          </p>
        </div>
        <div className="filters">
          <button className="btn sm refresh" onClick={() => setTick((n) => n + 1)} disabled={loading} title="Muat ulang data">
            <svg viewBox="0 0 24 24" className={loading ? 'spin' : ''} width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" /></svg>
            {loading ? 'Memuat…' : 'Muat ulang'}
          </button>
          <select value={linkId} onChange={(e) => update('link_id', e.target.value)}>
            <option value="">Semua link</option>
            {links.map((l) => <option key={l.id} value={l.id}>{l.title || l.slug}</option>)}
          </select>
          <div className="seg">
            {PRESETS.map((p) => (
              <button key={p.key} className={preset === p.key ? 'on' : ''} onClick={() => update('range', p.key === '30' ? '' : p.key)}>{p.label}</button>
            ))}
          </div>
        </div>
      </header>

      {err && <div className="alert error">{err}</div>}
      {!data ? <div className="center-pad"><div className="spinner" /></div> : (
        <>
          {links.length === 0 && (
            <div className="card empty">
              <p>Belum ada link. Buat link pertama untuk mulai memantau klik.</p>
              <Link to="/links" className="btn primary">+ Buat link</Link>
            </div>
          )}

          <section className="stats">
            <div className="stat"><small>Total klik</small><strong>{num(t.clicks)}</strong></div>
            <div className="stat"><small>Pengunjung unik</small><strong>{num(t.unique_clicks)}</strong>
              <span className="muted small">{pct(t.unique_clicks, t.clicks)}% dari klik</span></div>
            <div className="stat"><small>Rata-rata / hari</small><strong>{num(Math.round(t.clicks / data.daily.length))}</strong></div>
            <div className="stat"><small>Bot disaring</small><strong className="muted-num">{num(t.bot_clicks)}</strong></div>
          </section>

          <div className="card">
            <h3>Klik per hari</h3>
            <div className="chart">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data.daily} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="date" tickFormatter={dateShort} tick={{ fontSize: 12, fill: 'var(--muted)' }} axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="clicks" stroke="var(--accent)" strokeWidth={2} fill="url(#g)" />
                  <Area type="monotone" dataKey="unique_clicks" stroke="var(--ink-2)" strokeWidth={1.5} strokeDasharray="4 3" fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="legend"><span><i className="dot accent" />Klik</span><span><i className="dot dash" />Unik</span></div>
          </div>

          <section className="grid3">
            <Bars title="Sumber" rows={data.by_source} map={SOURCE_LABEL} />
            <Bars title="Perangkat" rows={data.by_device} map={DEVICE_LABEL} />
            <Bars title="Kota" rows={data.by_city} />
          </section>

          <section className="grid2">
            <div className="card">
              <h3>Link teratas</h3>
              {data.top_links.length === 0 ? <p className="muted small">Belum ada klik di rentang ini</p> : (
                <table className="table">
                  <thead><tr><th>Link</th><th className="r">Klik</th><th className="r">Unik</th></tr></thead>
                  <tbody>
                    {data.top_links.map((l) => (
                      <tr key={l.id} className="clickable" onClick={() => update('link_id', String(l.id))}>
                        <td><strong>{l.title || l.slug}</strong><div className="muted small mono">/go/{l.slug}</div></td>
                        <td className="r">{num(l.clicks)}</td>
                        <td className="r">{num(l.unique_clicks)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="card">
              <h3>Aktivitas terbaru</h3>
              {recent.length === 0 ? <p className="muted small">Belum ada klik</p> : (
                <ul className="feed">
                  {recent.slice(0, 12).map((c, i) => (
                    <li key={i} className={c.is_bot ? 'bot' : ''}>
                      <div>
                        <span className="mono">/go/{c.slug}</span>
                        {c.is_bot ? <span className="tag gray">bot</span> : c.is_unique ? <span className="tag green">unik</span> : null}
                        <div className="muted small">
                          {label(SOURCE_LABEL, c.source)} · {label(DEVICE_LABEL, c.device)}{c.os ? ` ${c.os}` : ''}{c.city ? ` · ${c.city}` : ''}
                        </div>
                      </div>
                      <span className="muted small nowrap">{timeAgo(c.clicked_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}
    </>
  );
}
