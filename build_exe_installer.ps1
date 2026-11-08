param(
    [string]$Version = "2.4.0",
    [string]$OutputExe = "E:\Projects\project_5\Antigravity-Enhancer-Setup.exe"
)

$ErrorActionPreference = "Stop"

$projectRoot = "E:\Projects\project_5"
$patchDir = Join-Path $projectRoot "Antigravity_MultiLang_Patch"
$ps1Path = Join-Path $patchDir "apply_patch.ps1"
$asarPath = Join-Path $patchDir "app.asar.patch"
$pngPath = Join-Path $projectRoot "extracted_korean\icon.png"
$icoPath = Join-Path $patchDir "icon.ico"

if (-not (Test-Path $ps1Path)) { throw "apply_patch.ps1 not found at $ps1Path" }
if (-not (Test-Path $asarPath)) { throw "app.asar.patch not found at $asarPath" }

# 1. Convert icon.png to valid Windows .ico (PNG-encoded ICO frame)
if (Test-Path $pngPath) {
    $pngBytes = [System.IO.File]::ReadAllBytes($pngPath)
    $ms = New-Object System.IO.MemoryStream
    $bw = New-Object System.IO.BinaryWriter($ms)
    # ICONDIR header (6 bytes)
    $bw.Write([uint16]0)   # Reserved
    $bw.Write([uint16]1)   # Type: 1 = ICO
    $bw.Write([uint16]1)   # Count: 1 image
    # ICONDIRENTRY (16 bytes)
    $bw.Write([byte]0)     # Width (0 = 256px)
    $bw.Write([byte]0)     # Height (0 = 256px)
    $bw.Write([byte]0)     # ColorCount
    $bw.Write([byte]0)     # Reserved
    $bw.Write([uint16]1)   # Planes
    $bw.Write([uint16]32)  # BitCount
    $bw.Write([uint32]$pngBytes.Length) # BytesInRes
    $bw.Write([uint32]22)  # ImageOffset (6 + 16)
    $bw.Write($pngBytes)
    $bw.Flush()
    [System.IO.File]::WriteAllBytes($icoPath, $ms.ToArray())
    $bw.Close()
    Write-Host "[1/3] Generated installer icon: $icoPath" -ForegroundColor Cyan
}

# 2. Write self-contained C# SFX Stub
$csSource = @"
using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Text;

[assembly: AssemblyTitle("Antigravity Enhancer Setup")]
[assembly: AssemblyDescription("Antigravity Multi-Language & Top-Bar Quota Enhancer Installer")]
[assembly: AssemblyCompany("xitora/antigravity-enhancer")]
[assembly: AssemblyProduct("Antigravity Enhancer")]
[assembly: AssemblyVersion("$Version.0")]
[assembly: AssemblyFileVersion("$Version.0")]

namespace AntigravityEnhancer
{
    internal static class Program
    {
        private static void ExtractResource(string resourceName, string outputPath)
        {
            using (Stream resStream = Assembly.GetExecutingAssembly().GetManifestResourceStream(resourceName))
            {
                if (resStream == null)
                {
                    throw new FileNotFoundException("Embedded resource not found: " + resourceName);
                }
                using (GZipStream gz = new GZipStream(resStream, CompressionMode.Decompress))
                using (FileStream fs = new FileStream(outputPath, FileMode.Create, FileAccess.Write, FileShare.None))
                {
                    gz.CopyTo(fs);
                }
            }
        }

        [STAThread]
        private static int Main(string[] args)
        {
            try
            {
                Console.OutputEncoding = Encoding.UTF8;
            }
            catch { }

            string tempDir = Path.Combine(Path.GetTempPath(), "AntigravityEnhancer_" + Guid.NewGuid().ToString("N").Substring(0, 8));
            Directory.CreateDirectory(tempDir);

            try
            {
                string ps1File = Path.Combine(tempDir, "apply_patch.ps1");
                string asarFile = Path.Combine(tempDir, "app.asar.patch");

                ExtractResource("apply_patch.ps1.gz", ps1File);
                ExtractResource("app.asar.patch.gz", asarFile);

                StringBuilder argBuilder = new StringBuilder();
                argBuilder.Append("-NoProfile -ExecutionPolicy Bypass -File \"");
                argBuilder.Append(ps1File);
                argBuilder.Append("\"");

                bool hasActionArg = false;
                if (args != null && args.Length > 0)
                {
                    foreach (string a in args)
                    {
                        if (a.IndexOf("-Action", StringComparison.OrdinalIgnoreCase) >= 0 ||
                            a.IndexOf("-DryRun", StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            hasActionArg = true;
                        }
                        argBuilder.Append(" ");
                        if (a.Contains(" "))
                        {
                            argBuilder.Append("\"").Append(a).Append("\"");
                        }
                        else
                        {
                            argBuilder.Append(a);
                        }
                    }
                }

                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = "powershell.exe",
                    Arguments = argBuilder.ToString(),
                    WorkingDirectory = tempDir,
                    UseShellExecute = false
                };

                using (Process p = Process.Start(psi))
                {
                    p.WaitForExit();
                    if (!hasActionArg && p.ExitCode == 0)
                    {
                        Console.WriteLine();
                        Console.Write("   Press Enter to close...");
                        try { Console.ReadLine(); } catch { }
                    }
                    return p.ExitCode;
                }
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.Error.WriteLine("[ERROR] Installer failed: " + ex.Message);
                Console.ResetColor();
                return 1;
            }
            finally
            {
                try
                {
                    if (Directory.Exists(tempDir))
                    {
                        Directory.Delete(tempDir, true);
                    }
                }
                catch { }
            }
        }
    }
}
"@

$buildTmp = Join-Path $env:TEMP ("agy_exe_build_" + [Guid]::NewGuid().ToString("N").Substring(0, 8))
New-Item -ItemType Directory -Path $buildTmp -Force | Out-Null

try {
    function Compress-ToGzipFile([string]$srcFile, [string]$dstGz) {
        $inBytes = [System.IO.File]::ReadAllBytes($srcFile)
        $fsOut = New-Object System.IO.FileStream($dstGz, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
        $gz = New-Object System.IO.Compression.GZipStream($fsOut, [System.IO.Compression.CompressionLevel]::Optimal)
        $gz.Write($inBytes, 0, $inBytes.Length)
        $gz.Close()
        $fsOut.Close()
    }

    $ps1Gz = Join-Path $buildTmp "apply_patch.ps1.gz"
    $asarGz = Join-Path $buildTmp "app.asar.patch.gz"
    $csFile = Join-Path $buildTmp "InstallerStub.cs"

    Write-Host "[2/3] Compressing payload resources (GZip Optimal)..." -ForegroundColor Cyan
    Compress-ToGzipFile -srcFile $ps1Path -dstGz $ps1Gz
    Compress-ToGzipFile -srcFile $asarPath -dstGz $asarGz
    [System.IO.File]::WriteAllText($csFile, $csSource, [System.Text.Encoding]::UTF8)

    $csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
    if (-not (Test-Path $csc)) {
        throw "csc.exe not found at $csc"
    }

    Write-Host "[3/3] Compiling standalone executable: $OutputExe ..." -ForegroundColor Cyan
    $cscArgs = @(
        "/nologo",
        "/target:exe",
        "/optimize+",
        "/platform:anycpu",
        "/out:$OutputExe",
        "/resource:$ps1Gz,apply_patch.ps1.gz",
        "/resource:$asarGz,app.asar.patch.gz"
    )
    if (Test-Path $icoPath) {
        $cscArgs += "/win32icon:$icoPath"
    }
    $cscArgs += $csFile

    & $csc @cscArgs
    if ($LASTEXITCODE -ne 0) {
        throw "csc.exe compilation failed with exit code $LASTEXITCODE"
    }

    $versionedExe = Join-Path $projectRoot "Antigravity-Enhancer-v$Version-Setup.exe"
    Copy-Item -Path $OutputExe -Destination $versionedExe -Force

    $sizeMb = [math]::Round((Get-Item $OutputExe).Length / 1MB, 2)
    Write-Host "[SUCCESS] Built standalone EXE installer ($sizeMb MB):" -ForegroundColor Green
    Write-Host "  -> $OutputExe" -ForegroundColor White
    Write-Host "  -> $versionedExe" -ForegroundColor White
}
finally {
    if (Test-Path $buildTmp) {
        Remove-Item -Path $buildTmp -Recurse -Force -ErrorAction SilentlyContinue
    }
}
