param(
  [string]$Version = "2.4.8"
)

$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$PackageRoot = Join-Path $ProjectRoot "deploy-packages"
$BuildRoot = Join-Path $env:TEMP ("warehouse-update-" + $Version + "-" + [guid]::NewGuid().ToString("N"))
$CloudRoot = Join-Path $BuildRoot "cloud"
$LocalRoot = Join-Path $BuildRoot "local"
$OutputDir = Join-Path $PackageRoot ("warehouse_update_" + $Version)
$OutputZip = Join-Path $PackageRoot ("warehouse_update_" + $Version + ".zip")

function Copy-UpdateFile {
  param([string]$RelativePath)
  $source = Join-Path $ProjectRoot $RelativePath
  $target = Join-Path $CloudRoot $RelativePath
  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
    throw "Missing update file: $RelativePath"
  }
  $parent = Split-Path -Parent $target
  if (-not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }
  Copy-Item -LiteralPath $source -Destination $target -Force
}

function Copy-LocalUpdateFile {
  param([string]$RelativePath)
  $source = Join-Path (Join-Path $ProjectRoot "core\transport") $RelativePath
  $target = Join-Path $LocalRoot $RelativePath
  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
    throw "Missing local update file: $RelativePath"
  }
  $parent = Split-Path -Parent $target
  if (-not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }
  Copy-Item -LiteralPath $source -Destination $target -Force
}

function Assert-NoBom {
  param([string]$Root)
  Get-ChildItem -LiteralPath $Root -Recurse -File | ForEach-Object {
    $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
      throw "UTF-8 BOM found: $($_.FullName)"
    }
  }
}

try {
  New-Item -ItemType Directory -Path $CloudRoot -Force | Out-Null
  New-Item -ItemType Directory -Path $LocalRoot -Force | Out-Null

  @(
    "core/index.js",
    "routes/admin.js",
    "utils/microsoftLogin.js",
    "package.json",
    "package-lock.json",
    "version.json"
  ) | ForEach-Object { Copy-UpdateFile $_ }
  Copy-LocalUpdateFile "transport_bot.js"
  Copy-LocalUpdateFile "auto_updater.js"

  Assert-NoBom -Root $CloudRoot
  Assert-NoBom -Root $LocalRoot
  $manifest = [ordered]@{
    schema = "outer-update-v1"
    version = $Version
    description = "Fix transport authentication diagnostics and stop background main Bot auto-eating."
    createdAt = (Get-Date).ToUniversalTime().ToString("o")
    notes = @(
      "Transport Bot reports a clear transportToken configuration error before attempting a remote connection.",
      "Main Bot no longer runs a food-consumption check every second in the background.",
      "Automatic food consumption is restricted to emergency hunger; explicit eat control still works.",
      "All packaged text files are UTF-8 without BOM."
    )
  }

  if (Test-Path -LiteralPath $OutputDir) { Remove-Item -LiteralPath $OutputDir -Recurse -Force }
  if (Test-Path -LiteralPath $OutputZip) { Remove-Item -LiteralPath $OutputZip -Force }
  New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

  Compress-Archive -Path (Join-Path $CloudRoot "*") -DestinationPath (Join-Path $OutputDir "cloud_update.zip") -CompressionLevel Optimal
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  Compress-Archive -Path (Join-Path $LocalRoot "*") -DestinationPath (Join-Path $OutputDir "local_update.zip") -CompressionLevel Optimal
  [System.IO.File]::WriteAllText((Join-Path $OutputDir "manifest.json"), ($manifest | ConvertTo-Json -Depth 4), (New-Object System.Text.UTF8Encoding($false)))
  Compress-Archive -Path (Join-Path $OutputDir "*") -DestinationPath $OutputZip -CompressionLevel Optimal

  node -e "const AdmZip=require('adm-zip'); const zip=new AdmZip(process.argv[1]); const names=zip.getEntries().filter(e=>!e.isDirectory).map(e=>e.entryName).sort(); const expected=['cloud_update.zip','local_update.zip','manifest.json']; if (names.length!==expected.length || names.some((name,index)=>name!==expected[index])) throw new Error('invalid outer package: '+names.join(', ')); const manifest=JSON.parse(zip.readFile('manifest.json').toString('utf8')); if (manifest.version!=='$Version') throw new Error('invalid manifest version'); console.log('Validated '+process.argv[1]);" $OutputZip
  Write-Host "Created $OutputZip"
} finally {
  if (Test-Path -LiteralPath $BuildRoot) { Remove-Item -LiteralPath $BuildRoot -Recurse -Force }
}
