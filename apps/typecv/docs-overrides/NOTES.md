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

The source currently reviewed is TypeCV revision `e40c878`. Keep overrides
aligned with upstream changes, and remove an override when the source has been
corrected. The manifest's revision also pins generated upstream source links.
Korean documentation routes link to the corresponding English route and do not
present these files as translated text.
