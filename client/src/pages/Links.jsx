import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { api, shortUrl } from '../api.js';
import { num } from '../format.js';

const EMPTY = { target_url: '', slug: '', title: '', campaign: '' };

function LinkForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    // Kirim hanya field yang terisi
    const body = Object.fromEntries(Object.entries(form).filter(([k, v]) => k in EMPTY && v !== ''));
    try { await onSave(body); }
    catch (e) { setErr(e.message); setBusy(false); }
  };

  return (
    <form className="link-form" onSubmit={submit}>
      {err && <div className="alert error">{err}</div>}
      <label>Link afiliasi Shopee *
        <input required placeholder="https://s.shopee.co.id/xxxxx" value={form.target_url} onChange={set('target_url')} />
      </label>
      <div className="row2">
        <label>Slug (opsional)
          <div className="prefix-input"><span>/go/</span>
            <input placeholder="otomatis" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} />
          </div>
        </label>
        <label>Judul
          <input placeholder="mis. Sepatu Lari Pria" value={form.title} onChange={set('title')} />
        </label>
      </div>
      <label>Kampanye
        <input placeholder="mis. Harbolnas 12.12" value={form.campaign} onChange={set('campaign')} />
      </label>
      <div className="actions">
        {onCancel && <button type="button" className="btn ghost" onClick={onCancel}>Batal</button>}
        <button className="btn primary" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</button>
      </div>
    </form>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose} aria-label="Tutup">✕</button></div>
        {children}
      </div>
    </div>
  );
}

function QrModal({ link, onClose }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    QRCode.toDataURL(shortUrl(link.slug) + '?src=qr', { width: 480, margin: 2 }).then(setSrc);
  }, [link]);
  return (
    <Modal title="QR Code" onClose={onClose}>
      <div className="center">
        {src && <img src={src} alt="QR code" className="qr" />}
        <p className="muted small mono">{shortUrl(link.slug)}?src=qr</p>
        <p className="muted small">Klik dari QR ini tercatat dengan sumber <b>qr</b>.</p>
        <a className="btn primary" href={src} download={`qr-${link.slug}.png`}>Unduh PNG</a>
      </div>
    </Modal>
  );
}

export default function Links() {
  const nav = useNavigate();
  const [links, setLinks] = useState(null);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null); // {type:'new'|'edit'|'qr', link}
  const [copied, setCopied] = useState(null);
  const [err, setErr] = useState('');

  const load = () => api.get('/links').then(setLinks).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const copy = async (slug) => {
    await navigator.clipboard.writeText(shortUrl(slug));
    setCopied(slug);
    setTimeout(() => setCopied(null), 1500);
  };

  const toggle = async (l) => {
    await api.patch(`/links/${l.id}`, { is_active: !l.is_active }).catch((e) => setErr(e.message));
    load();
  };

  const remove = async (l) => {
    if (!window.confirm(`Hapus /go/${l.slug}? Semua data kliknya ikut terhapus.`)) return;
    await api.del(`/links/${l.id}`).catch((e) => setErr(e.message));
    load();
  };

  const filtered = (links || []).filter((l) =>
    !q || [l.slug, l.title, l.campaign, l.target_url].some((v) => v?.toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Link Saya</h1>
          <p className="muted">Bagikan link pendek ini. Tambahkan <span className="mono">?src=tiktok</span> (atau nama lain) untuk menandai sumbernya.</p>
        </div>
        <button className="btn primary" onClick={() => setModal({ type: 'new' })}>+ Link baru</button>
      </header>

      {err && <div className="alert error">{err}</div>}

      {links && links.length > 0 && (
        <input className="search" placeholder="Cari slug, judul, kampanye…" value={q} onChange={(e) => setQ(e.target.value)} />
      )}

      {!links ? <div className="center-pad"><div className="spinner" /></div>
        : links.length === 0 ? (
          <div className="card empty">
            <p>Belum ada link. Tempel link afiliasi Shopee untuk membuat link pendek yang bisa dilacak.</p>
            <button className="btn primary" onClick={() => setModal({ type: 'new' })}>+ Buat link pertama</button>
          </div>
        ) : (
          <div className="link-list">
            {filtered.map((l) => (
              <article key={l.id} className={`card link-card ${l.is_active ? '' : 'inactive'}`}>
                <div className="link-main">
                  <div className="link-title">
                    <strong>{l.title || l.slug}</strong>
                    {l.campaign && <span className="tag">{l.campaign}</span>}
                    {!l.is_active && <span className="tag gray">nonaktif</span>}
                  </div>
                  <button className="short" onClick={() => copy(l.slug)} title="Salin">
                    <span className="mono">{shortUrl(l.slug)}</span>
                    <span className="copy">{copied === l.slug ? 'Tersalin ✓' : 'Salin'}</span>
                  </button>
                  <div className="muted small ellipsis">→ {l.target_url}</div>
                </div>
                <div className="link-nums">
                  <div><strong>{num(l.clicks)}</strong><small>klik</small></div>
                  <div><strong>{num(l.unique_clicks)}</strong><small>unik</small></div>
                  <div><strong>{num(l.clicks_24h)}</strong><small>24 jam</small></div>
                </div>
                <div className="link-actions">
                  <button className="btn sm" onClick={() => nav(`/?link_id=${l.id}`)}>Statistik</button>
                  <button className="btn sm" onClick={() => setModal({ type: 'qr', link: l })}>QR</button>
                  <button className="btn sm" onClick={() => setModal({ type: 'edit', link: l })}>Edit</button>
                  <button className="btn sm" onClick={() => toggle(l)}>{l.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                  <button className="btn sm danger" onClick={() => remove(l)}>Hapus</button>
                </div>
              </article>
            ))}
            {filtered.length === 0 && <p className="muted center">Tidak ada link yang cocok.</p>}
          </div>
        )}

      {modal?.type === 'new' && (
        <Modal title="Link baru" onClose={() => setModal(null)}>
          <LinkForm onCancel={() => setModal(null)} onSave={async (b) => { await api.post('/links', b); setModal(null); load(); }} />
        </Modal>
      )}
      {modal?.type === 'edit' && (
        <Modal title="Edit link" onClose={() => setModal(null)}>
          <LinkForm
            initial={{ target_url: modal.link.target_url, slug: modal.link.slug, title: modal.link.title || '', campaign: modal.link.campaign || '' }}
            onCancel={() => setModal(null)}
            onSave={async (b) => { await api.patch(`/links/${modal.link.id}`, b); setModal(null); load(); }}
          />
          <p className="muted small">Mengganti slug membuat link lama yang sudah dibagikan tidak berfungsi lagi.</p>
        </Modal>
      )}
      {modal?.type === 'qr' && <QrModal link={modal.link} onClose={() => setModal(null)} />}
    </>
  );
}
