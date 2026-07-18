# Compiles C++ dataset-indexer binary into dist/dataset-indexer.exe
$ErrorActionPreference = "Stop"
$PackageRoot = $PSScriptRoot

Write-Host "[ATE C++ Build] Building dataset-indexer..." -ForegroundColor Cyan

$distDir = Join-Path $PackageRoot "dist"
if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Force -Path $distDir | Out-Null
}

$outputExe = Join-Path $distDir "dataset-indexer.exe"
$source = Join-Path $PackageRoot "cpp/dataset_indexer.cpp"

Write-Host "[ATE C++ Build] Running: g++ -std=c++20 $source -o $outputExe" -ForegroundColor DarkGray
& g++ -std=c++20 $source -o $outputExe

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ATE C++ Build] [X] C++ compilation FAILED" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "[ATE C++ Build] [OK] dataset-indexer.exe compiled successfully -> $outputExe" -ForegroundColor Green
