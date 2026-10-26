-- How often each short link is opened, and when it last was. A share nobody has opened for a
-- year is deleted by the Worker's daily cron (worker/index.ts, scheduled); last_opened_at is
-- null until the first open, and created_at stands in for it.
ALTER TABLE shares ADD COLUMN views INTEGER NOT NULL DEFAULT 0;
ALTER TABLE shares ADD COLUMN last_opened_at TEXT;
CREATE INDEX shares_last_seen ON shares (COALESCE(last_opened_at, created_at));
