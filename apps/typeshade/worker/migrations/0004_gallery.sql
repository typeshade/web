-- The gallery (/playground/gallery/): Playground shares someone sent in with a title. A
-- submission waits as `pending` until the maintainer approves it (docs/cloudflare.md), and
-- only an approved one is listed. `sender` is a hash of the address it came from, kept so
-- one address cannot flood the queue; the address itself is never stored.
CREATE TABLE submissions (
  share_id TEXT PRIMARY KEY REFERENCES shares (id),
  title TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT '',
  locale TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  sender TEXT NOT NULL,
  created_at TEXT NOT NULL,
  reviewed_at TEXT
);
CREATE INDEX submissions_listed ON submissions (status, reviewed_at);
CREATE INDEX submissions_sender ON submissions (sender, created_at);
