# Puts the Cloudflare Access application of the gallery's review page on the gallery's Worker
# (docs/cloudflare.md, Reviewing the gallery). Create the Access application first, then run
# this from a checkout of typeshade.github.io, after `bunx wrangler login`:
#
#   ./scripts/setup-gallery-review.ps1
#
# It asks for the team domain (<team>.cloudflareaccess.com) and the application's audience
# (AUD) tag. Neither is a secret, but both live with the Worker's secrets, so a value is never
# typed into the terminal's history or committed.
$ErrorActionPreference = 'Stop'

function Put-Secret([string] $Name, [string] $Value) {
  $Value | bunx wrangler secret put $Name -c wrangler.gallery.jsonc
  if ($LASTEXITCODE -ne 0) { throw "wrangler secret put $Name failed" }
}

# Both are read before anything changes, so an empty answer changes nothing.
$domain = (Read-Host 'Access team domain (<team>.cloudflareaccess.com)').Trim()
$domain = $domain -replace '^https://', '' -replace '/+$', ''
$aud = (Read-Host 'Application Audience (AUD) tag').Trim()
if (-not $domain -or -not $aud) { throw 'Both values are needed.' }
if ($domain -notmatch '^[a-z0-9-]+\.cloudflareaccess\.com$') {
  throw "'$domain' is not a team domain of the form <team>.cloudflareaccess.com."
}

Put-Secret 'ACCESS_TEAM_DOMAIN' $domain
Put-Secret 'ACCESS_AUD' $aud
Write-Host 'Done. gallery.typeshade.dev/review/ opens for the people the Access policy allows.'
