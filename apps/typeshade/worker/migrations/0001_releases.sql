-- The example data releases scripts/publish-examples.ts uploads, and the one the Worker
-- serves. A release's files are in R2 under releases/<id>/; this table is the history, so
-- going back to an earlier release is one UPDATE of settings.current_release.
CREATE TABLE releases (
  id TEXT PRIMARY KEY,
  compiler_commit TEXT NOT NULL,
  compiler_date TEXT NOT NULL,
  site_commit TEXT NOT NULL,
  example_count INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
