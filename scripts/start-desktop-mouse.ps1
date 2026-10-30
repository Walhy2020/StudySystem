param(
    [Parameter(Mandatory=$true)][string]$PythonPath,
    [ValidateRange(1024,65535)][int]$Port = 53177
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Ignore) { exit }
$serverArguments = '-u "{0}\server.py" --bind 127.0.0.1 --port {1} --desktop-mouse' -f $projectRoot, $Port
Start-Process -FilePath $PythonPath -ArgumentList $serverArguments -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput "$env:TEMP\study-out.log" -RedirectStandardError "$env:TEMP\study-err.log"
