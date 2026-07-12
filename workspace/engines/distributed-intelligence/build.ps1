# build.ps1 — AEGIS Distributed Intelligence Engine Build Script
# Compiles the C++ die-service binary into dist/die-service.exe

$ErrorActionPreference = "Stop"
$PackageRoot = $PSScriptRoot

Write-Host "[DIE Build] Building C++ service binary..." -ForegroundColor Cyan

# Ensure dist/ exists
$distDir = Join-Path $PackageRoot "dist"
if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Force -Path $distDir | Out-Null
}

$includeDir = Join-Path $PackageRoot "cpp/include"
$outputExe  = Join-Path $distDir "die-service.exe"

$sources = @(
    "cpp/src/service/DieService.cpp",
    "cpp/src/lifecycle/StateTransition.cpp",
    "cpp/src/lifecycle/LifecycleManager.cpp",
    "cpp/src/node/Node.cpp",
    "cpp/src/runtime/DistributedRuntime.cpp",
    "cpp/src/runtime/NodeRuntime.cpp",
    "cpp/src/messaging/MessageBus.cpp",
    "cpp/src/events/EventDispatcher.cpp",
    "cpp/src/registry/RegistryImpls.cpp",
    "cpp/src/transport/TcpTransport.cpp",
    "cpp/src/discovery/DiscoveryManagerImpl.cpp",
    "cpp/src/heartbeat/HeartbeatManagerImpl.cpp",
    "cpp/src/membership/MembershipManagerImpl.cpp",
    "cpp/src/resource-manager/ResourceManager.cpp",
    "cpp/src/resource-manager/ResourceCollector.cpp",
    "cpp/src/resource-manager/ResourcePublisher.cpp",
    "cpp/src/resource-manager/ResourceCache.cpp",
    "cpp/src/resource-manager/ResourceMonitor.cpp",
    "cpp/src/resource-manager/ResourceSnapshot.cpp",
    "cpp/src/resource-manager/ResourceHistory.cpp",
    "cpp/src/resource-manager/ResourceStatistics.cpp",
    "cpp/src/scheduler/WorkerPool.cpp",
    "cpp/src/plugins/PluginManager.cpp"
)

$fullSources = $sources | ForEach-Object { Join-Path $PackageRoot $_ }

$gppArgs = @(
    "-std=c++20",
    "-I", $includeDir
) + $fullSources + @(
    "-o", $outputExe,
    "-lws2_32"
)

Write-Host "[DIE Build] Running: g++ $($gppArgs -join ' ')" -ForegroundColor DarkGray
& g++ @gppArgs

if ($LASTEXITCODE -ne 0) {
    Write-Host "[DIE Build] [X] C++ compilation FAILED (exit code $LASTEXITCODE)" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "[DIE Build] [OK] die-service.exe compiled successfully -> $outputExe" -ForegroundColor Green
