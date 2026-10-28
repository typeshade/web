# TypeCV documentation overrides

These files replace imported documentation only where the pinned TypeCV source
contains a specific statement that no longer matches the implementation shown
by the website. Their relative paths mirror `sources/typecv/docs`; the English
documentation route uses an override when one exists and otherwise renders the
source file directly. Each override identifies the source revision and the
reason for the correction in an HTML comment. `manifest.json` pins each
overridden source file's SHA-256. The documentation build fails if the source
hash changes; review the upstream update and override together, then update the
manifest deliberately. An override is used only when its source exists and its
hash matches.

The source snapshot is TypeCV revision `715fd1b`. Keep overrides aligned with
upstream changes, and remove an override when its text would hide newer source
material. The full-file GPU SfM override was removed when upstream added the
time-budget and chunk-scheduling documentation; the route now renders that
source page directly. The SfM quickstart override was checked against the new
source and updated for its more specific bundle-adjustment schedule. The
manifest's revision also pins generated upstream source links. The run-records
override updates operational paths to the web repository and documents the
current strict KV setup behavior. Its source hash is pinned in the same manifest.
Korean documentation routes link to the corresponding English route and do not
present these files as translated text.
