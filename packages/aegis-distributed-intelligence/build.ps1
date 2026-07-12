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
    "cpp/src/plugins/PluginManager.cpp",
    "cpp/src/ai-runtime/agents/AgentRegistry.cpp",
    "cpp/src/ai-runtime/agents/AgentLifecycleManager.cpp",
    "cpp/src/ai-runtime/agents/AgentFactory.cpp",
    "cpp/src/ai-runtime/tasks/TaskGraph.cpp",
    "cpp/src/ai-runtime/tasks/TaskPlanner.cpp",
    "cpp/src/ai-runtime/tasks/TaskSchedulerAdapter.cpp",
    "cpp/src/ai-runtime/orchestration/AgentOrchestrator.cpp",
    "cpp/src/ai-runtime/orchestration/ResultAggregator.cpp",
    "cpp/src/ai-runtime/orchestration/WorkflowEngine.cpp",
    "cpp/src/ai-runtime/memory/MemoryManager.cpp",
    "cpp/src/ai-runtime/knowledge/KnowledgeManager.cpp",
    "cpp/src/ai-runtime/prompts/PromptManager.cpp",
    "cpp/src/ai-runtime/context/ContextManager.cpp",
    "cpp/src/ai-runtime/tools/ToolRuntime.cpp",
    "cpp/src/ai-runtime/services/AIServiceManager.cpp",
    "cpp/src/ai-runtime/metrics/AIRuntimeMetrics.cpp",
    "cpp/src/ai-runtime/policy/PolicyManager.cpp",
    "cpp/src/ai-runtime/trust/TrustManager.cpp",
    "cpp/src/ai-runtime/models/ModelManager.cpp",
    "cpp/src/ai-runtime/runtime/AIRuntime.cpp"
)

$fullSources = $sources | ForEach-Object { Join-Path $PackageRoot $_ }

$gppArgs = @(
    "-std=c++20",
    "-I", $includeDir,
    "-I", (Join-Path $PackageRoot "cpp/src")
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
