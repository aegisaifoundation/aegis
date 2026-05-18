<#
.SYNOPSIS
Bootstrap installer for AEGIS using PowerShell.

.DESCRIPTION
This script installs the AEGIS CLI and configures the runtime environment.
It is designed to be run directly from a URL, for example:

  powershell -c "irm https://example.com/install.ps1 | iex"

#>

param(
    [switch]$Uninstall,
    [switch]$Help
)

function Show-Help {
    @'
Usage:
  .\install.ps1          Install AEGIS from the current repository.
  .\install.ps1 -Uninstall   Uninstall AEGIS CLI and remove environment configuration.

Remote install example:
  powershell -c "irm https://example.com/install.ps1 | iex"
'@
}

function Get-RepoRoot {
    if ($MyInvocation.MyCommand.Path) {
        return Split-Path -Parent $MyInvocation.MyCommand.Path
    }
    return (Get-Location).Path
}

function Write-Info {
    param([string]$Message)
    Write-Host "[AEGIS] $Message" -ForegroundColor Cyan
}

function Write-ErrorAndExit {
    param([string]$Message)
    Write-Host "[AEGIS] ERROR: $Message" -ForegroundColor Red
    exit 1
}

function Set-UserEnvironmentVariable {
    param(
        [string]$Name,
        [string]$Value
    )

    Write-Host "Setting user environment variable: $Name=$Value"
    setx $Name "$Value" | Out-Null
}

function Remove-UserEnvironmentVariable {
    param([string]$Name)

    Write-Host "Removing user environment variable: $Name"
    setx $Name "" | Out-Null
}

function Ensure-PathContains {
    param(
        [string]$PathValue
    )

    $currentPath = [Environment]::GetEnvironmentVariable('PATH', 'User')
    if (-not $currentPath.Split(';') -contains $PathValue) {
        Write-Host "Adding $PathValue to user PATH"
        $newPath = if ($currentPath) { "$currentPath;$PathValue" } else { $PathValue }
        setx PATH "$newPath" | Out-Null
    }
}

function Install-Aegis {
    $repoRoot = Get-RepoRoot
    $aegisCore = Join-Path $repoRoot 'aegis-core'

    if (-not (Test-Path $aegisCore)) {
        Write-ErrorAndExit "Cannot find aegis-core directory in $repoRoot. Please run from the repo root or clone the repository first."
    }

    Set-Location $aegisCore

    Write-Info 'Installing Node dependencies...'
    npm install || Write-ErrorAndExit 'npm install failed.'

    Write-Info 'Linking the AEGIS CLI globally...'
    npm link || Write-ErrorAndExit 'npm link failed.'

    $nodeGlobalBin = (& npm bin -g).Trim()
    if (-not [string]::IsNullOrWhiteSpace($nodeGlobalBin)) {
        Ensure-PathContains $nodeGlobalBin
    }

    Write-UserEnvironmentVariable -Name 'AEGIS_HOME' -Value $repoRoot

    Write-Info 'Installation complete.'
    Write-Host 'Restart your terminal to apply environment changes.' -ForegroundColor Green
}

function Uninstall-Aegis {
    $repoRoot = Get-RepoRoot
    $aegisCore = Join-Path $repoRoot 'aegis-core'

    if (Test-Path $aegisCore) {
        Set-Location $aegisCore
        Write-Info 'Unlinking the AEGIS CLI...'
        npm unlink -g || Write-Host 'Warning: npm unlink failed or CLI was not linked.' -ForegroundColor Yellow
    }

    Remove-UserEnvironmentVariable -Name 'AEGIS_HOME'
    Write-Info 'Uninstallation complete.'
    Write-Host 'Restart your terminal to apply environment changes.' -ForegroundColor Green
}

if ($Help) {
    Show-Help
    exit 0
}

if ($Uninstall) {
    Uninstall-Aegis
    exit 0
}

Install-Aegis
