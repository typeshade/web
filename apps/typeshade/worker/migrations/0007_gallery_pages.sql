-- The gallery's own site, gallery.typeshade.dev (worker/gallery.ts). A submission carries a
-- still of the canvas it was sent from, kept in R2 under gallery/<share_id>; `thumbnail` is
-- its content type, or null for an entry sent in before the Playground captured one.
ALTER TABLE submissions ADD COLUMN thumbnail TEXT;
-- The entries approved by hand before the approval wrote reviewed_at: they take the time they
-- were sent in, so the newest-first order has a date to sort them by.
UPDATE submissions SET reviewed_at = created_at WHERE status = 'approved' AND reviewed_at IS NULL;
