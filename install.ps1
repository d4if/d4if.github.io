$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Repo = 'd4if/sign'
$InstallDir = if ($env:SIGN_INSTALL_DIR) { $env:SIGN_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA 'd4if\sign\bin' }

$Arch = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString().ToUpperInvariant()
if (-not $Arch) {
    $Arch = ($env:PROCESSOR_ARCHITECTURE).ToUpperInvariant()
}

switch ($Arch) {
    'ARM64' { $Target = 'aarch64-pc-windows-msvc' }
    'X64'   { $Target = 'x86_64-pc-windows-msvc' }
    'AMD64' { $Target = 'x86_64-pc-windows-msvc' }
    default { throw "Arsitektur Windows tidak didukung: $Arch" }
}

if ($env:SIGN_VERSION) {
    $Tag = $env:SIGN_VERSION
} else {
    $Release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" -Headers @{ 'User-Agent' = 'd4if-sign-installer' }
    $Tag = $Release.tag_name
}

if (-not $Tag) {
    throw "Gagal mendeteksi versi rilis terbaru dari github.com/$Repo."
}

$Archive = "sign-$Tag-$Target.zip"
$BaseUrl = "https://github.com/$Repo/releases/download/$Tag"
$TempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("d4if-sign-" + [System.Guid]::NewGuid().ToString('N'))

New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

try {
    $ArchivePath = Join-Path $TempDir $Archive
    $SumsPath = Join-Path $TempDir 'SHA256SUMS.txt'

    Write-Host "Mengunduh sign $Tag ($Target)..."
    Invoke-WebRequest -Uri "$BaseUrl/$Archive" -OutFile $ArchivePath -UseBasicParsing
    Invoke-WebRequest -Uri "$BaseUrl/SHA256SUMS.txt" -OutFile $SumsPath -UseBasicParsing

    $ExpectedLine = Get-Content $SumsPath | Where-Object { $_ -match ("\s+" + [regex]::Escape($Archive) + "$") } | Select-Object -First 1
    if (-not $ExpectedLine) {
        throw "Checksum untuk $Archive tidak ditemukan di SHA256SUMS.txt."
    }
    $ExpectedHash = ($ExpectedLine -split '\s+')[0].ToLowerInvariant()
    $ActualHash = (Get-FileHash -Path $ArchivePath -Algorithm SHA256).Hash.ToLowerInvariant()

    if ($ExpectedHash -ne $ActualHash) {
        throw "Checksum SHA-256 tidak cocok ($ActualHash != $ExpectedHash)."
    }

    $ExtractDir = Join-Path $TempDir 'extracted'
    Expand-Archive -Path $ArchivePath -DestinationPath $ExtractDir -Force

    $BinSrc = Join-Path $ExtractDir "sign-$Tag-$Target\sign.exe"
    if (-not (Test-Path $BinSrc)) {
        throw "Binary sign.exe tidak ditemukan di dalam arsip."
    }

    New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
    $BinDest = Join-Path $InstallDir 'sign.exe'
    Copy-Item -Path $BinSrc -Destination $BinDest -Force

    $UserPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $PathParts = if ($UserPath) { $UserPath -split ';' | Where-Object { $_ -ne '' } } else { @() }
    if ($PathParts -notcontains $InstallDir) {
        $NewUserPath = (@($PathParts + $InstallDir)) -join ';'
        [Environment]::SetEnvironmentVariable('Path', $NewUserPath, 'User')
    }
    if (($env:Path -split ';') -notcontains $InstallDir) {
        $env:Path = "$InstallDir;$env:Path"
    }

    Write-Host "Berhasil memasang sign ke: $BinDest"
    & $BinDest --version
} finally {
    Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue
}
