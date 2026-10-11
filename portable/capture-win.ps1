param([string]$Out, [int]$X, [int]$Y, [int]$W, [int]$H)
$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class WtdWin {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc f, IntPtr l);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr h, int i);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr FindWindow(string c, string n);
  [DllImport("user32.dll")] public static extern IntPtr SetProcessDpiAwarenessContext(IntPtr v);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h, int a, out RECT r, int s);
  [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h, int a, out int v, int s);

  public static void Aware() {
    try { if (SetProcessDpiAwarenessContext(new IntPtr(-4)) != IntPtr.Zero) return; } catch { }
    try { SetProcessDPIAware(); } catch { }
  }

  public static RECT Bounds(IntPtr h) {
    RECT r;
    if (DwmGetWindowAttribute(h, 9, out r, Marshal.SizeOf(typeof(RECT))) != 0) GetWindowRect(h, out r);
    return r;
  }

  public static List<object[]> List() {
    var o = new List<object[]>();
    var skip = new string[] { "Progman", "WorkerW", "Shell_TrayWnd", "Shell_SecondaryTrayWnd", "Windows.UI.Core.CoreWindow", "XamlExplorerHostIslandWindow", "TopLevelWindowForOverflowXamlIsland", "NotifyIconOverflowWindow" };
    EnumWindows((h, l) => {
      if (!IsWindowVisible(h) || IsIconic(h)) return true;
      int cloaked;
      if (DwmGetWindowAttribute(h, 14, out cloaked, 4) == 0 && cloaked != 0) return true;
      int ex = GetWindowLong(h, -20);
      if ((ex & 0x20) != 0) return true;
      if ((ex & 0x80) != 0 && (ex & 0x40000) == 0) return true;
      var c = new StringBuilder(256); GetClassName(h, c, 256);
      if (Array.IndexOf(skip, c.ToString()) >= 0) return true;
      var t = new StringBuilder(512); GetWindowText(h, t, 512);
      if (t.Length == 0 && (ex & 0x40000) == 0) return true;
      var r = Bounds(h);
      if (r.R - r.L < 8 || r.B - r.T < 8) return true;
      o.Add(new object[] { h.ToInt64(), c.ToString(), t.ToString(), r.L, r.T, r.R - r.L, r.B - r.T });
      return true;
    }, IntPtr.Zero);
    return o;
  }
}
'@

[WtdWin]::Aware()
$res = @{ ok = $false; windows = @(); taskbar = $null; layout = $null; wallpaper = $null; rounding = 0 }
try {
  $bmp = New-Object System.Drawing.Bitmap $W, $H, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.CopyFromScreen($X, $Y, 0, 0, (New-Object System.Drawing.Size $W, $H), [System.Drawing.CopyPixelOperation]::SourceCopy)
  $g.Dispose()
  $bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  $res.ok = $true
} catch { $res.error = "$_" }

try {
  $res.windows = @([WtdWin]::List() | ForEach-Object { @{ id = $_[0]; cls = $_[1]; title = $_[2]; x = $_[3]; y = $_[4]; w = $_[5]; h = $_[6] } })
} catch { $res.listError = "$_" }

try {
  foreach ($cls in 'Shell_TrayWnd', 'Shell_SecondaryTrayWnd') {
    $h = [WtdWin]::FindWindow($cls, [NullString]::Value)
    if ($h -eq [IntPtr]::Zero -or -not [WtdWin]::IsWindowVisible($h)) { continue }
    $r = [WtdWin]::Bounds($h)
    $cx = ($r.L + $r.R) / 2; $cy = ($r.T + $r.B) / 2
    if ($cx -ge $X -and $cx -lt $X + $W -and $cy -ge $Y -and $cy -lt $Y + $H) {
      $res.taskbar = @{ x = $r.L; y = $r.T; w = $r.R - $r.L; h = $r.B - $r.T }
      break
    }
  }
} catch { }

try { $res.layout = [System.Windows.Forms.InputLanguage]::CurrentInputLanguage.Culture.Name.ToLower() } catch { }
try { $res.wallpaper = (Get-ItemProperty 'HKCU:\Control Panel\Desktop' -Name WallPaper).WallPaper } catch { }
try { if ([Environment]::OSVersion.Version.Build -ge 22000) { $res.rounding = 8 } } catch { }

$res | ConvertTo-Json -Depth 4 -Compress
