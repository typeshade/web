-- The Playground's short links (/s/<id>). A share is the page it opens and the fragment the
-- Playground wrote (src/scripts/playground.ts, writeHash): the source, deflated, and the emit
-- options. The id is a hash of the two, so sharing the same file twice gives the same link.
CREATE TABLE shares (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  fragment TEXT NOT NULL,
  created_at TEXT NOT NULL
);
