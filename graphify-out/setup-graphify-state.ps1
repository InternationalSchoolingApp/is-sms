$ErrorActionPreference = 'Stop'

$graphifyOut = $PSScriptRoot
$projectRoot = (Resolve-Path (Join-Path $graphifyOut '..')).Path
$uvPythonPath = Join-Path ([Environment]::GetFolderPath('ApplicationData')) 'uv\tools\graphifyy\Scripts\python.exe'
$pythonPath = if (Test-Path -LiteralPath $uvPythonPath) {
    $uvPythonPath
} else {
    (Get-Command python -ErrorAction Stop).Source
}

Set-Content -LiteralPath (Join-Path $graphifyOut '.graphify_root') -Value $projectRoot -NoNewline
Set-Content -LiteralPath (Join-Path $graphifyOut '.graphify_python') -Value $pythonPath -NoNewline

Write-Host "Graphify state configured for: $projectRoot"
