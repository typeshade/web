# Sets up the issue dialog on typeshade.dev (docs/cloudflare.md, Issues): the label its issues
# carry in both repositories, and the Worker's secrets. Run it from a checkout of
# typeshade.github.io, after `gh auth login` and `bunx wrangler login`:
#
#   ./scripts/setup-issue-form.ps1 -AppId 123456 -KeyFile ~/Downloads/app.private-key.pem
#
# -AppId and -KeyFile are the GitHub App's id and the private key GitHub downloaded for it.
# -Token instead puts a fine-grained token (Issues: Read and write) on the Worker, which opens
# the issues as the token's owner. It always asks for the Turnstile widget's two keys: the site
# takes no report without them. -Turnstile is still accepted, and changes nothing.
# Nothing is typed into the terminal's history: a key or a token is read at a prompt or from
# its file and piped to wrangler.
[CmdletBinding(DefaultParameterSetName = 'App')]
param(
  [Parameter(Mandatory, ParameterSetName = 'App')] [string] $AppId,
  [Parameter(Mandatory, ParameterSetName = 'App')] [string] $KeyFile,
  [Parameter(ParameterSetName = 'Token')] [switch] $Token,
  [switch] $Turnstile
)
$ErrorActionPreference = 'Stop'

function Put-Secret([string] $Name, [string] $Value) {
  $Value | bunx wrangler secret put $Name
  if ($LASTEXITCODE -ne 0) { throw "wrangler secret put $Name failed" }
}

function Read-Secret([string] $Prompt) {
  $secure = Read-Host $Prompt -AsSecureString
  [System.Net.NetworkCredential]::new('', $secure).Password
}

# Everything is read before anything changes, so a wrong path or an empty answer changes nothing.
$secrets = [ordered]@{}
if ($Token) {
  $secrets['GITHUB_TOKEN'] = Read-Secret 'Fine-grained token'
} else {
  $secrets['GITHUB_APP_ID'] = $AppId
  $secrets['GITHUB_APP_PRIVATE_KEY'] = Get-Content -Raw -LiteralPath $KeyFile
}
$secrets['TURNSTILE_SITE_KEY'] = Read-Host 'Turnstile site key'
$secrets['TURNSTILE_SECRET_KEY'] = Read-Secret 'Turnstile secret key'
foreach ($name in $secrets.Keys) {
  if (-not $secrets[$name]) { throw "$name is empty" }
}

foreach ($repo in 'typeshade/typeshade', 'typeshade/typeshade.github.io') {
  gh label create 'site form' --repo $repo --color 1677ff --force `
    --description 'Filed through the issue dialog on typeshade.dev'
  if ($LASTEXITCODE -ne 0) { throw "gh label create failed on $repo" }
}
foreach ($name in $secrets.Keys) { Put-Secret $name $secrets[$name] }

Write-Host 'Done. https://typeshade.dev/data/issues/ answers {"open":true} once the Worker that carries the dialog is deployed.'
