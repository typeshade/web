-- The issues the site's form opened on GitHub (worker/index.ts, /data/issues/). The id is a hash
-- of what the form sent, so the same issue sent twice is opened once; number and url are null
-- while the request to GitHub is in flight. share_id is the attached program's short link,
-- which the cron then keeps. sender is a hash of the address, as the gallery keeps it
-- (0004_gallery.sql): the rows of the last day count against the form's limits, per address
-- and in all.
CREATE TABLE issues (
  id TEXT PRIMARY KEY,
  repo TEXT NOT NULL,
  number INTEGER,
  url TEXT,
  share_id TEXT REFERENCES shares (id),
  sender TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX issues_created_at ON issues (created_at);
