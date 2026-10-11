$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch { }
$url = 'https://github.com/JupiterianSoul/wreck-this-desktop/releases/latest/download/wreck-this-desktop-windows.zip'
$dest = Join-Path $env:LOCALAPPDATA 'Programs\Wreck This Desktop'
$exe = 'Wreck This Desktop.exe'

$src = $null
if ($PSScriptRoot -and (Test-Path (Join-Path $PSScriptRoot $exe))) { $src = $PSScriptRoot }
$tmp = $null
if (-not $src) {
  Write-Host 'Downloading Wreck This Desktop...'
  $tmp = Join-Path $env:TEMP ('wtd-' + [guid]::NewGuid())
  New-Item -ItemType Directory $tmp | Out-Null
  $zip = Join-Path $tmp 'wtd.zip'
  Invoke-WebRequest -UseBasicParsing $url -OutFile $zip
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [IO.Compression.ZipFile]::ExtractToDirectory($zip, $tmp)
  $src = Join-Path $tmp 'Wreck This Desktop'
}

Get-Process -Name 'Wreck This Desktop' -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 300
if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
New-Item -ItemType Directory $dest -Force | Out-Null
Copy-Item (Join-Path $src '*') $dest -Recurse -Force
Get-ChildItem $dest -Recurse | Unblock-File
if ($tmp) { Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue }

$shell = New-Object -ComObject WScript.Shell
$menu = Join-Path ([Environment]::GetFolderPath('Programs')) 'Wreck This Desktop.lnk'
$desk = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Wreck This Desktop.lnk'
foreach ($p in @($menu, $desk)) {
  $l = $shell.CreateShortcut($p)
  $l.TargetPath = Join-Path $dest $exe
  $l.WorkingDirectory = $dest
  $l.IconLocation = (Join-Path $dest 'icon.ico') + ',0'
  $l.Description = 'Your screen becomes the level'
  if ($p -eq $menu) { $l.Hotkey = 'CTRL+ALT+K' }
  $l.Save()
}

Write-Host ''
Write-Host 'Wreck This Desktop is installed.'
Write-Host 'Press CTRL + ALT + K anywhere to wreck whatever is on your screen.'
Write-Host 'There is also a shortcut on your desktop and in the Start menu.'
Write-Host 'Esc pauses, F12 or Alt + F4 quits instantly.'
