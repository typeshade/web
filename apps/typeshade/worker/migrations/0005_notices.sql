-- The site's notice (src/components/SiteNotice.astro): one line over every page, in each
-- language, changed with a row here and no build. The Worker serves the newest active row
-- whose window holds the current time (docs/cloudflare.md has the commands). A null
-- starts_at or ends_at leaves that end of the window open; text_ko empty falls back to
-- text_en.
CREATE TABLE notices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text_en TEXT NOT NULL,
  text_ko TEXT NOT NULL DEFAULT '',
  href TEXT,
  starts_at TEXT,
  ends_at TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
