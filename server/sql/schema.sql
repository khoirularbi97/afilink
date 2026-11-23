-- Skema Afiliasi Link Manager (multi-user)
-- Aman dijalankan berulang (idempotent).

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,          -- disimpan lowercase
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'affiliator' CHECK (role IN ('admin', 'affiliator')),
  status        TEXT NOT NULL DEFAULT 'pending'    CHECK (status IN ('pending', 'active', 'suspended')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS links (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL UNIQUE,             -- unik global karena satu domain
  target_url  TEXT NOT NULL,
  title       TEXT,
  campaign    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS links_user_idx ON links (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS clicks (
  id          BIGSERIAL PRIMARY KEY,
  link_id     INT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  clicked_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  visitor_id  UUID,                             -- dari cookie "vid"
  fp          TEXT,                             -- hash(ip + user-agent), cadangan kalau cookie hilang
  ip_hash     TEXT,                             -- IP tidak disimpan mentah (UU PDP)
  country     TEXT,
  region      TEXT,
  city        TEXT,
  device      TEXT,                             -- mobile / tablet / desktop
  os          TEXT,
  browser     TEXT,
  referrer    TEXT,
  source      TEXT,                             -- tiktok / instagram / facebook / whatsapp / ... / direct
  is_unique   BOOLEAN NOT NULL DEFAULT false,
  is_bot      BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS clicks_link_time_idx    ON clicks (link_id, clicked_at DESC);
CREATE INDEX IF NOT EXISTS clicks_link_visitor_idx ON clicks (link_id, visitor_id, clicked_at DESC);
CREATE INDEX IF NOT EXISTS clicks_link_fp_idx      ON clicks (link_id, fp, clicked_at DESC);
