param(
    [string]$PythonPath = (Get-Command python -ErrorAction Stop).Source,
    [ValidateRange(1024,65535)][int]$Port = 53177,
    [switch]$Undo
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$backupFolder = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'StudySystem\desktop-mouse'
$backupFile = Join-Path $backupFolder 'startup-backup.json'
$startupLink = Join-Path ([Environment]::GetFolderPath('Startup')) '马里奥学习系统本地服务.lnk'
$runKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$wsh = New-Object -ComObject WScript.Shell
if ($Undo) {
    $backup = Get-Content -LiteralPath $backupFile -Raw | ConvertFrom-Json
    if ($backup.joyxoff) { Set-ItemProperty -LiteralPath $runKey -Name Joyxoff -Value $backup.joyxoff }
    if ($backup.joyServiceStartType) {
        Set-Service -Name JoyXoffSvc -StartupType $backup.joyServiceStartType
        if ($backup.joyServiceRunning) { Start-Service -Name JoyXoffSvc }
    }
    if ($backup.hadShortcut) {
        Copy-Item -LiteralPath (Join-Path $backupFolder 'previous-startup.lnk') -Destination $startupLink -Force
    } else {
        Remove-Item -LiteralPath $startupLink -ErrorAction SilentlyContinue
    }
    Write-Output 'Previous startup settings restored. Restart the project service without --desktop-mouse to complete undo.'
    exit
}
if (-not (Test-Path -LiteralPath $PythonPath -PathType Leaf) -or $PythonPath -match '\\WindowsApps\\') {
    throw 'Specify an installed Python executable with -PythonPath.'
}
New-Item -ItemType Directory -Path $backupFolder -Force | Out-Null
if (-not (Test-Path -LiteralPath $backupFile)) {
    $hadShortcut = Test-Path -LiteralPath $startupLink
    if ($hadShortcut) { Copy-Item -LiteralPath $startupLink -Destination (Join-Path $backupFolder 'previous-startup.lnk') }
    $joyxoff = (Get-ItemProperty -LiteralPath $runKey -Name Joyxoff -ErrorAction SilentlyContinue).Joyxoff
    @{ hadShortcut = $hadShortcut; joyxoff = $joyxoff; created = (Get-Date).ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath $backupFile -Encoding UTF8
}
$joyService = Get-Service -Name JoyXoffSvc -ErrorAction SilentlyContinue
if ($joyService) {
    $backup = Get-Content -LiteralPath $backupFile -Raw | ConvertFrom-Json
    if (-not ($backup.PSObject.Properties.Name -contains 'joyServiceStartType')) {
        $backup | Add-Member -NotePropertyName joyServiceStartType -NotePropertyValue ([string]$joyService.StartType)
        $backup | Add-Member -NotePropertyName joyServiceRunning -NotePropertyValue ($joyService.Status -eq 'Running')
        $backup | ConvertTo-Json | Set-Content -LiteralPath $backupFile -Encoding UTF8
    }
    # Its sign-in/UAC helper can otherwise revive duplicate mapping after logon.
    Set-Service -Name JoyXoffSvc -StartupType Disabled
    Stop-Service -Name JoyXoffSvc -Force
}
# A single native mouse owner prevents JoyXoff and the built-in mouse doubling
# motion/clicks. Do not uninstall or change JoyXoff profiles.
Remove-ItemProperty -LiteralPath $runKey -Name Joyxoff -ErrorAction SilentlyContinue
$joyProcesses = @(Get-CimInstance Win32_Process -Filter "Name = 'Joyxoff.exe'")
foreach ($process in $joyProcesses) {
    Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
}
$shortcut = $wsh.CreateShortcut($startupLink)
$shortcut.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$launcher = Join-Path $PSScriptRoot 'start-desktop-mouse.ps1'
$shortcut.Arguments = '-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}" -PythonPath "{1}" -Port {2}' -f $launcher, $PythonPath, $Port
$shortcut.WorkingDirectory = $projectRoot
$shortcut.WindowStyle = 7
$shortcut.Save()
Write-Output 'Desktop mouse startup installed. Existing study server requires one scoped restart with --desktop-mouse.'
