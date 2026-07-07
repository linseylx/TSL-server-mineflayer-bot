param(
  [string]$RepoUrl = "https://github.com/linseylx/TSL-server-mineflayer-bot.git",
  [string]$Branch = "main",
  [string]$CommitMessage = "Public release",
  [switch]$DryRun,
  [switch]$KeepTemp
)

$ErrorActionPreference = "Stop"

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Missing command: $Name"
  }
}

function Copy-IfExists {
  param([string]$From, [string]$To)
  if (Test-Path -LiteralPath $From) {
    $parent = Split-Path -Parent $To
    if ($parent -and -not (Test-Path -LiteralPath $parent)) {
      New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
    Copy-Item -LiteralPath $From -Destination $To -Force
  }
}

function Get-RelativePath {
  param([string]$Root, [string]$Path)
  return $Path.Substring($Root.Length).TrimStart([char[]]@('\', '/'))
}

function Invoke-PrivacyScan {
  param([string]$Root)

  $riskNamePattern = "(^secret|password|token|^\.env$|id_rsa|id_ed25519|authorized_keys|\.log$|logs\.txt|chat\.txt$|temp_login_codes|users\.json|warehouse\.json$|bot_config\.json$|config\.json$|local_version\.json$|\.db$|\.sqlite$)"
  $riskFiles = Get-ChildItem -LiteralPath $Root -Recurse -Force -File |
    Where-Object {
      $_.FullName -notmatch "\\\.git\\" -and
      ($_.Name -match $riskNamePattern -or $_.FullName -match "\\\.auth-cache\\|\\backups\\|\\local_backups\\|\\node_modules\\")
    } |
    ForEach-Object { Get-RelativePath -Root $Root -Path $_.FullName }

  if ($riskFiles) {
    Write-Host "Risk file names found. Upload stopped:" -ForegroundColor Red
    $riskFiles | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    throw "Privacy scan failed: risky file names."
  }

  $contentPatterns = [ordered]@{
    "real_server_ip" = "122\.51\.105\.104"
    "local_windows_path" = "[A-Z]:\\Users\\linxi|D:\\Users\\linxi|C:\\Users\\linxi"
    "full_ssh_public_key" = "ssh-ed25519\s+AAAAC3NzaC1lZDI1NTE5AAAAI"
    "private_key" = "BEGIN (OPENSSH|RSA|EC|DSA) PRIVATE KEY"
    "hardcoded_env_secret" = "(ADMIN_PASSWORD|UPDATE_PASSWORD|JWT_SECRET|TOKEN_SECRET)\s*[:=]\s*[""'][^""'<\r\n]{8,}[""']"
    "hardcoded_token" = "token\s*[:=]\s*[""'][A-Za-z0-9_\-\.]{24,}"
  }

  $hits = New-Object System.Collections.Generic.List[string]
  $files = Get-ChildItem -LiteralPath $Root -Recurse -Force -File |
    Where-Object {
      $_.FullName -notmatch "\\\.git\\" -and
      $_.FullName -notmatch "\\package-lock\.json$"
    }

  foreach ($file in $files) {
    try {
      $text = Get-Content -LiteralPath $file.FullName -Raw -ErrorAction Stop
    } catch {
      continue
    }

    foreach ($entry in $contentPatterns.GetEnumerator()) {
      $matches = [regex]::Matches($text, $entry.Value)
      if ($matches.Count -gt 0) {
        foreach ($match in $matches) {
          $line = ($text.Substring(0, $match.Index) -split "`n").Count
          $rel = Get-RelativePath -Root $Root -Path $file.FullName
          $hits.Add("$($entry.Key): ${rel}:$line")
        }
      }
    }
  }

  if ($hits.Count -gt 0) {
    Write-Host "Possible private content found. Upload stopped:" -ForegroundColor Red
    $hits | Sort-Object -Unique | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    throw "Privacy scan failed: possible private content."
  }
}

Require-Command git

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$CleanRoot = Join-Path $env:TEMP ("warehouse-github-public-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $CleanRoot -Force | Out-Null

Write-Host "Project root: $ProjectRoot"
Write-Host "Clean temp copy: $CleanRoot"

$publicDirs = @(
  "config",
  "core",
  "deploy",
  "docs",
  "models",
  "public-desktop",
  "public-shop",
  "routes",
  "services",
  "utils"
)

foreach ($dir in $publicDirs) {
  $from = Join-Path $ProjectRoot $dir
  $to = Join-Path $CleanRoot $dir
  if (Test-Path -LiteralPath $from) {
    robocopy $from $to /E /XD ".git" "node_modules" ".auth-cache" "local_backups" "backups" /XF "*.bak_*" "*.log" "config.json" "chat.txt" "local_version.json" | Out-Null
    if ($LASTEXITCODE -ge 8) {
      throw "Copy failed: $dir, robocopy exit code=$LASTEXITCODE"
    }
  }
}

$rootFiles = @(
  ".env.example",
  ".gitignore",
  "README.md",
  "DEPLOY_README.md",
  "package.json",
  "package-lock.json",
  "server.js",
  "version.json"
)

foreach ($file in $rootFiles) {
  Copy-IfExists -From (Join-Path $ProjectRoot $file) -To (Join-Path $CleanRoot $file)
}

New-Item -ItemType Directory -Path (Join-Path $CleanRoot "data") -Force | Out-Null
$publicDataFiles = @("index.js", "item_icons.json", "mc_items.json")
foreach ($file in $publicDataFiles) {
  Copy-IfExists -From (Join-Path (Join-Path $ProjectRoot "data") $file) -To (Join-Path (Join-Path $CleanRoot "data") $file)
}

$exampleSources = @(
  @{ From = "deploy-packages\github_upload_2.1.12\data\bot_config.example.json"; To = "data\bot_config.example.json" },
  @{ From = "deploy-packages\github_upload_2.1.12\data\warehouse.example.json"; To = "data\warehouse.example.json" },
  @{ From = "deploy-packages\github_upload_2.1.12\core\transport\config.example.json"; To = "core\transport\config.example.json" }
)

foreach ($item in $exampleSources) {
  Copy-IfExists -From (Join-Path $ProjectRoot $item.From) -To (Join-Path $CleanRoot $item.To)
}

if (-not (Test-Path -LiteralPath (Join-Path $CleanRoot "data\bot_config.example.json"))) {
  @'
{
  "host": "<server-host>",
  "port": 25565,
  "username": "<main-bot-account>"
}
'@ | Set-Content -Path (Join-Path $CleanRoot "data\bot_config.example.json") -Encoding UTF8
}

if (-not (Test-Path -LiteralPath (Join-Path $CleanRoot "data\warehouse.example.json"))) {
  @'
{
  "items": {},
  "updatedAt": null
}
'@ | Set-Content -Path (Join-Path $CleanRoot "data\warehouse.example.json") -Encoding UTF8
}

if (-not (Test-Path -LiteralPath (Join-Path $CleanRoot "core\transport\config.example.json"))) {
  @'
{
  "mainHost": "<server-host>",
  "mainPort": 28474,
  "botName": "<transport-bot-account>"
}
'@ | Set-Content -Path (Join-Path $CleanRoot "core\transport\config.example.json") -Encoding UTF8
}

Write-Host "Running privacy scan..."
Invoke-PrivacyScan -Root $CleanRoot
Write-Host "Privacy scan passed."

git -C $CleanRoot init
git -C $CleanRoot branch -M $Branch
git -C $CleanRoot add .
git -C $CleanRoot commit -m $CommitMessage
git -C $CleanRoot remote add origin $RepoUrl

if ($DryRun) {
  Write-Host "Dry run complete. Nothing was pushed." -ForegroundColor Yellow
  git -C $CleanRoot status --short
  git -C $CleanRoot log --oneline -1
  if (-not $KeepTemp) {
    Remove-Item -LiteralPath $CleanRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
  exit 0
}

Write-Host "Force pushing to: $RepoUrl [$Branch]" -ForegroundColor Yellow
git -C $CleanRoot push --force origin $Branch

Write-Host "Push complete. Verifying remote..."
$VerifyRoot = Join-Path $env:TEMP ("warehouse-github-verify-" + [guid]::NewGuid().ToString("N"))
git clone --depth 1 --branch $Branch $RepoUrl $VerifyRoot
Invoke-PrivacyScan -Root $VerifyRoot
git -C $VerifyRoot log --oneline -1
Write-Host "Remote verification passed."

if (-not $KeepTemp) {
  Remove-Item -LiteralPath $CleanRoot -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $VerifyRoot -Recurse -Force -ErrorAction SilentlyContinue
}
