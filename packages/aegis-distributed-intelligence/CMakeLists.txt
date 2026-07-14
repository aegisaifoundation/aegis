cmake_minimum_required(VERSION 3.15)
project(AegisDistributedIntelligence VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(DIE_INCLUDE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/cpp/include)

# Define modular targets
# 1. common
add_library(die-common INTERFACE)
target_include_directories(die-common INTERFACE ${DIE_INCLUDE_DIR})

# 2. kernel
add_library(die-kernel INTERFACE)
target_include_directories(die-kernel INTERFACE ${DIE_INCLUDE_DIR})
target_link_libraries(die-kernel INTERFACE die-common)

# 3. identity
add_library(die-identity INTERFACE)
target_include_directories(die-identity INTERFACE ${DIE_INCLUDE_DIR})
target_link_libraries(die-identity INTERFACE die-common)

# 4. capabilities
add_library(die-capabilities STATIC cpp/src/capabilities/NodeCapabilities.cpp)
target_include_directories(die-capabilities PUBLIC ${DIE_INCLUDE_DIR})
target_link_libraries(die-capabilities PUBLIC die-common)

# 5. resources
add_library(die-resources INTERFACE)
target_include_directories(die-resources INTERFACE ${DIE_INCLUDE_DIR})
target_link_libraries(die-resources INTERFACE die-common)

# 6. roles
add_library(die-roles INTERFACE)
target_include_directories(die-roles INTERFACE ${DIE_INCLUDE_DIR})
target_link_libraries(die-roles INTERFACE die-common)

# 7. state
add_library(die-state INTERFACE)
target_include_directories(die-state INTERFACE ${DIE_INCLUDE_DIR})
target_link_libraries(die-state INTERFACE die-common)

# 8. lifecycle
add_library(die-lifecycle STATIC cpp/src/lifecycle/StateTransition.cpp cpp/src/lifecycle/LifecycleManager.cpp)
target_include_directories(die-lifecycle PUBLIC ${DIE_INCLUDE_DIR})
target_link_libraries(die-lifecycle PUBLIC die-state die-common)

# 9. metadata
add_library(die-metadata INTERFACE)
target_include_directories(die-metadata INTERFACE ${DIE_INCLUDE_DIR})

# 10. configuration
add_library(die-configuration INTERFACE)
target_include_directories(die-configuration INTERFACE ${DIE_INCLUDE_DIR})

# 11. statistics
add_library(die-statistics INTERFACE)
target_include_directories(die-statistics INTERFACE ${DIE_INCLUDE_DIR})

# 12. scheduler
add_library(die-scheduler STATIC cpp/src/scheduler/CapabilityScheduler.cpp cpp/src/scheduler/WorkerPool.cpp)
target_include_directories(die-scheduler PUBLIC ${DIE_INCLUDE_DIR})
target_link_libraries(die-scheduler PUBLIC die-common)

# 13. discovery
add_library(die-discovery STATIC cpp/src/discovery/DiscoveryManagerImpl.cpp)
target_include_directories(die-discovery PUBLIC ${DIE_INCLUDE_DIR})
target_link_libraries(die-discovery PUBLIC die-common)

# 14. heartbeat
add_library(die-heartbeat STATIC cpp/src/heartbeat/HeartbeatManagerImpl.cpp)
target_include_directories(die-heartbeat PUBLIC ${DIE_INCLUDE_DIR})
target_link_libraries(die-heartbeat PUBLIC die-common)

# 15. consensus
add_library(die-consensus INTERFACE)
target_include_directories(die-consensus INTERFACE ${DIE_INCLUDE_DIR})

# 16. membership
add_library(die-membership STATIC cpp/src/membership/MembershipManagerImpl.cpp)
target_include_directories(die-membership PUBLIC ${DIE_INCLUDE_DIR})
target_link_libraries(die-membership PUBLIC die-common)

# 17. topology
add_library(die-topology INTERFACE)
target_include_directories(die-topology INTERFACE ${DIE_INCLUDE_DIR})

# 18. policy
add_library(die-policy INTERFACE)
target_include_directories(die-policy INTERFACE ${DIE_INCLUDE_DIR})

# 19. health
add_library(die-health INTERFACE)
target_include_directories(die-health INTERFACE ${DIE_INCLUDE_DIR})

# 20. transport
add_library(die-transport STATIC cpp/src/transport/TcpTransport.cpp)
target_include_directories(die-transport PUBLIC ${DIE_INCLUDE_DIR})
target_link_libraries(die-transport PUBLIC die-common)
if(WIN32)
    target_link_libraries(die-transport PUBLIC ws2_32)
endif()

# 21. events
add_library(die-events STATIC cpp/src/events/EventDispatcher.cpp)
target_include_directories(die-events PUBLIC ${DIE_INCLUDE_DIR})
target_link_libraries(die-events PUBLIC die-common)

# 22. messaging
add_library(die-messaging STATIC cpp/src/messaging/MessageBus.cpp)
target_include_directories(die-messaging PUBLIC ${DIE_INCLUDE_DIR})
target_link_libraries(die-messaging PUBLIC die-common)

# 23. tasks
add_library(die-tasks STATIC cpp/src/tasks/DistributedTask.cpp cpp/src/tasks/DistributedTaskQueue.cpp)
target_include_directories(die-tasks PUBLIC ${DIE_INCLUDE_DIR})
target_link_libraries(die-tasks PUBLIC die-common)

# 24. cluster
add_library(die-cluster INTERFACE)
target_include_directories(die-cluster INTERFACE ${DIE_INCLUDE_DIR})

# 25. serialization
add_library(die-serialization INTERFACE)
target_include_directories(die-serialization INTERFACE ${DIE_INCLUDE_DIR})

# 26. registry
add_library(die-registry STATIC cpp/src/registry/RegistryImpls.cpp)
target_include_directories(die-registry PUBLIC ${DIE_INCLUDE_DIR})
target_link_libraries(die-registry PUBLIC
    die-common
    die-capabilities
    die-resources
    die-roles
)

# 27. node
add_library(die-node STATIC cpp/src/node/Node.cpp)
target_include_directories(die-node PUBLIC ${DIE_INCLUDE_DIR})
target_link_libraries(die-node PUBLIC
    die-identity
    die-capabilities
    die-resources
    die-roles
    die-state
    die-lifecycle
    die-metadata
    die-configuration
    die-statistics
    die-health
    die-membership
    die-policy
)

# 30. execution
add_library(die-execution STATIC
    cpp/src/execution/WorkerRuntime.cpp
    cpp/src/execution/CheckpointManager.cpp
    cpp/src/execution/ResultManager.cpp
    cpp/src/execution/DistributedExecutionService.cpp
)
target_include_directories(die-execution PUBLIC ${DIE_INCLUDE_DIR})
target_link_libraries(die-execution PUBLIC
    die-common
    die-tasks
    die-capabilities
    die-scheduler
    die-transport
)

# 28. runtime
add_library(die-runtime STATIC cpp/src/runtime/DistributedRuntime.cpp cpp/src/runtime/NodeRuntime.cpp)
target_include_directories(die-runtime PUBLIC ${DIE_INCLUDE_DIR})
target_link_libraries(die-runtime PUBLIC
    die-node
    die-kernel
    die-registry
    die-messaging
    die-transport
    die-events
    die-execution
)

# 29. resource-manager
add_library(die-resource-manager STATIC
    cpp/src/resource-manager/ResourceManager.cpp
    cpp/src/resource-manager/ResourceCollector.cpp
    cpp/src/resource-manager/ResourcePublisher.cpp
    cpp/src/resource-manager/ResourceCache.cpp
    cpp/src/resource-manager/ResourceMonitor.cpp
    cpp/src/resource-manager/ResourceSnapshot.cpp
    cpp/src/resource-manager/ResourceHistory.cpp
    cpp/src/resource-manager/ResourceStatistics.cpp
)
target_include_directories(die-resource-manager PUBLIC ${DIE_INCLUDE_DIR})
target_link_libraries(die-resource-manager PUBLIC
    die-common
    die-capabilities
    die-resources
    die-health
    die-statistics
    die-events
    die-transport
)

# Testing Executable
add_executable(die-tests
    cpp/tests/TestRunner.cpp
    cpp/tests/common/TypesTest.cpp
    cpp/tests/kernel/KernelTest.cpp
    cpp/tests/node/NodeTest.cpp
    cpp/tests/state/StateTest.cpp
    cpp/tests/lifecycle/LifecycleTest.cpp
    cpp/tests/membership/MembershipTest.cpp
    cpp/tests/policy/PolicyTest.cpp
    cpp/tests/serialization/SerializationTest.cpp
    cpp/tests/runtime/RuntimeTest.cpp
    cpp/tests/messaging/MessagingTest.cpp
    cpp/tests/transport/TransportTest.cpp
    cpp/tests/execution/DistributedExecutionTest.cpp
    cpp/tests/demo/LocalNetworkDemo.cpp
    cpp/tests/resource-manager/ResourceManagerTest.cpp
    cpp/tests/resource-manager/ResourceSyncDemo.cpp
)
target_link_libraries(die-tests PRIVATE
    die-runtime
    die-resource-manager
    die-execution
    die-discovery
    die-heartbeat
    die-membership
    die-topology
    die-tasks
    die-cluster
    die-serialization
)
if(WIN32)
    target_link_libraries(die-tests PRIVATE ws2_32)
endif()

# Service Executable — Runtime-managed standalone entry-point
# The TypeScript DistributedIntelligenceEngine adapter launches this binary.
add_executable(die-service cpp/src/service/DieService.cpp)
target_link_libraries(die-service PRIVATE
    die-runtime
    die-resource-manager
)
if(WIN32)
    target_link_libraries(die-service PRIVATE ws2_32)
endif()
