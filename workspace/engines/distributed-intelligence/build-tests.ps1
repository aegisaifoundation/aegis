# build-tests.ps1 — Compiles and runs the C++ test suite
$ErrorActionPreference = "Stop"
$PackageRoot = $PSScriptRoot

Write-Host "[DIE Tests] Building C++ test binary..." -ForegroundColor Cyan

# Ensure dist/ exists
$distDir = Join-Path $PackageRoot "dist"
if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Force -Path $distDir | Out-Null
}

$includeDir = Join-Path $PackageRoot "cpp/include"
$outputExe  = Join-Path $distDir "die-tests.exe"

$sources = @(
    # Implementations
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
    "cpp/src/capabilities/NodeCapabilities.cpp",
    "cpp/src/tasks/DistributedTask.cpp",
    "cpp/src/tasks/DistributedTaskQueue.cpp",
    "cpp/src/scheduler/CapabilityScheduler.cpp",
    "cpp/src/execution/WorkerRuntime.cpp",
    "cpp/src/execution/CheckpointManager.cpp",
    "cpp/src/execution/ResultManager.cpp",
    "cpp/src/execution/DistributedExecutionService.cpp",
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
    "cpp/src/ai-runtime/runtime/AIRuntime.cpp",
    "cpp/src/distributed-inference/models/ModelRegistry.cpp",
    "cpp/src/distributed-inference/models/ModelManager.cpp",
    "cpp/src/distributed-inference/backend/LlamaBackend.cpp",
    "cpp/src/distributed-inference/backend/OnnxBackend.cpp",
    "cpp/src/distributed-inference/backend/TensorRTBackend.cpp",
    "cpp/src/distributed-inference/backend/FutureBackend.cpp",
    "cpp/src/distributed-inference/inference/InferenceSession.cpp",
    "cpp/src/distributed-inference/inference/SessionPool.cpp",
    "cpp/src/distributed-inference/inference/PromptBuilder.cpp",
    "cpp/src/distributed-inference/inference/ContextBuilder.cpp",
    "cpp/src/distributed-inference/inference/TokenStreamer.cpp",
    "cpp/src/distributed-inference/inference/ResponseAssembler.cpp",
    "cpp/src/distributed-inference/execution/ExecutionAdapter.cpp",
    "cpp/src/distributed-inference/execution/PlacementResolver.cpp",
    "cpp/src/distributed-inference/cache/ResponseCache.cpp",
    "cpp/src/distributed-inference/cache/KVCache.cpp",
    "cpp/src/distributed-inference/metrics/InferenceMetrics.cpp",
    "cpp/src/distributed-inference/runtime/DistributedInferenceService.cpp",

    # Tests
    "cpp/tests/TestRunner.cpp",
    "cpp/tests/common/TypesTest.cpp",
    "cpp/tests/kernel/KernelTest.cpp",
    "cpp/tests/node/NodeTest.cpp",
    "cpp/tests/state/StateTest.cpp",
    "cpp/tests/lifecycle/LifecycleTest.cpp",
    "cpp/tests/membership/MembershipTest.cpp",
    "cpp/tests/policy/PolicyTest.cpp",
    "cpp/tests/serialization/SerializationTest.cpp",
    "cpp/tests/runtime/RuntimeTest.cpp",
    "cpp/tests/messaging/MessagingTest.cpp",
    "cpp/tests/transport/TransportTest.cpp",
    "cpp/tests/execution/DistributedExecutionTest.cpp",
    "cpp/tests/demo/LocalNetworkDemo.cpp",
    "cpp/tests/resource-manager/ResourceManagerTest.cpp",
    "cpp/tests/resource-manager/ResourceSyncDemo.cpp",
    "cpp/tests/air-dis/AIRDISTest.cpp",
    "cpp/tests/benchmarks/BenchmarkRunner.cpp"
)

$fullSources = $sources | ForEach-Object { Join-Path $PackageRoot $_ }

$gppArgs = @(
    "-std=c++20",
    "-I", $includeDir,
    "-I", (Join-Path $PackageRoot "cpp/src"),
    "-I", (Join-Path $PackageRoot "cpp/src/distributed-inference")
) + $fullSources + @(
    "-o", $outputExe,
    "-lws2_32"
)

Write-Host "[DIE Tests] Running: g++ $($gppArgs -join ' ')" -ForegroundColor DarkGray
& g++ @gppArgs

if ($LASTEXITCODE -ne 0) {
    Write-Host "[DIE Tests] [X] C++ compilation FAILED (exit code $LASTEXITCODE)" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "[DIE Tests] [OK] die-tests.exe compiled successfully -> $outputExe" -ForegroundColor Green
Write-Host "[DIE Tests] Running tests..." -ForegroundColor Yellow
& $outputExe
