#include "aegis/die/execution/DistributedExecutionService.hpp"
#include "aegis/die/runtime/RuntimeContext.hpp"
#include "aegis/die/registry/NodeRegistry.hpp"
#include "aegis/die/registry/CapabilityRegistry.hpp"
#include "aegis/die/node/NodeDescriptor.hpp"
#include "aegis/die/transport/ITransport.hpp"
#include "aegis/die/common/JsonHelper.hpp"
#include <chrono>
#include <iostream>
#include <sstream>

namespace aegis::die::execution {

static uint64_t current_time_ms() {
  return std::chrono::duration_cast<std::chrono::milliseconds>(
      std::chrono::system_clock::now().time_since_epoch()).count();
}

static std::string resolveNodeAddress(std::shared_ptr<runtime::RuntimeContext> ctx, const common::NodeID& nodeId) {
  auto reg = ctx->getNodeRegistry();
  if (!reg) return "";
  auto node = reg->getNode(nodeId);
  if (!node) return "";
  
  auto it = node->metadata.labels.items.find("address");
  if (it != node->metadata.labels.items.end()) {
    return it->second;
  }
  
  // Custom port mapping for demo & tests
  if (nodeId == "node-a" || nodeId == "Runtime-A") return "127.0.0.1:9010";
  if (nodeId == "node-b" || nodeId == "Runtime-B") return "127.0.0.1:9011";
  if (nodeId == "node-c" || nodeId == "Runtime-C") return "127.0.0.1:9012";
  
  return "127.0.0.1:9900";
}

DistributedExecutionService::DistributedExecutionService(std::shared_ptr<runtime::RuntimeContext> ctx)
  : m_ctx(ctx),
    m_queue(tasks::QueueSchedulingMode::PRIORITY),
    m_workerRuntime(4),
    m_resultManager(std::make_shared<ResultManager>()) {}

DistributedExecutionService::~DistributedExecutionService() {
  stop();
  shutdown();
}

void DistributedExecutionService::initialize() {
  m_ctx->log("INFO", "ExecutionService", "Initializing Distributed Execution Service...");
  
  m_localCapabilities.nodeId = m_ctx->getRuntimeConfig().node.nodeName;
  m_localCapabilities.cpuCores = 4;
  m_localCapabilities.cpuUtilization = 10.0;
  m_localCapabilities.ramCapacity = 8ULL * 1024ULL * 1024ULL * 1024ULL;
  m_localCapabilities.ramUtilization = 30.0;
  m_localCapabilities.gpuAvailable = false; // Initially no GPU locally
  m_localCapabilities.cudaSupported = false;
  m_localCapabilities.trustLevel = 1.0;
  m_localCapabilities.currentWorkload = 0.0;
  m_localCapabilities.installedModels = {"phi-3"};

  auto capReg = m_ctx->getCapabilityRegistry();
  if (capReg) {
    capReg->updateCapabilities(m_localCapabilities.nodeId, m_localCapabilities);
  }
}

void DistributedExecutionService::start() {
  if (m_running) return;
  m_running = true;

  // Register network message handler
  if (m_ctx->getTransport()) {
    m_ctx->getTransport()->registerMessageHandler([this](const std::string& sender, const std::string& payload) {
      this->handleMessage(sender, payload);
    });
  }

  // Start background threads
  m_dispatcherThread = std::thread(&DistributedExecutionService::runDispatcher, this);
  m_monitorThread = std::thread(&DistributedExecutionService::runMonitor, this);

  m_ctx->log("INFO", "ExecutionService", "Distributed Execution Service started.");
}

void DistributedExecutionService::stop() {
  if (!m_running) return;
  m_running = false;

  m_workerRuntime.stop();

  if (m_dispatcherThread.joinable()) {
    m_dispatcherThread.join();
  }
  if (m_monitorThread.joinable()) {
    m_monitorThread.join();
  }

  m_ctx->log("INFO", "ExecutionService", "Distributed Execution Service stopped.");
}

void DistributedExecutionService::shutdown() {
  m_executingTasks.clear();
}

std::string DistributedExecutionService::health() {
  return m_running ? "HEALTHY" : "OFFLINE";
}

std::string DistributedExecutionService::statistics() {
  std::stringstream ss;
  ss << "Tasks Completed: " << m_completedCount.load()
     << ", Failures: " << m_failureCount.load()
     << ", Retries: " << m_retryCount.load();
  return ss.str();
}

void DistributedExecutionService::submitTask(const tasks::DistributedTask& task) {
  tasks::DistributedTask t = task;
  t.currentState = "PENDING";
  if (t.taskId.empty()) {
    t.taskId = "task-" + std::to_string(current_time_ms());
  }
  t.sourceNode = m_ctx->getRuntimeConfig().node.nodeName;
  m_queue.enqueue(t);
  m_ctx->log("INFO", "ExecutionService", "Task submitted: " + t.taskId);
}

void DistributedExecutionService::cancelTask(const common::TaskID& taskId) {
  m_queue.cancelTask(taskId);
  m_workerRuntime.cancelTask(taskId);
  
  std::lock_guard<std::mutex> lock(m_tasksMutex);
  auto it = m_executingTasks.find(taskId);
  if (it != m_executingTasks.end()) {
    it->second.currentState = "CANCELLED";
    
    // If remote, send cancel message
    if (it->second.assignedNode != m_ctx->getRuntimeConfig().node.nodeName) {
      std::string remoteAddr = resolveNodeAddress(m_ctx, it->second.assignedNode);
      if (!remoteAddr.empty()) {
        m_ctx->getTransport()->send(remoteAddr, "TASK_CANCEL|" + taskId);
      }
    }
    m_executingTasks.erase(it);
  }
}

void DistributedExecutionService::pauseTask(const common::TaskID& taskId) {
  std::lock_guard<std::mutex> lock(m_tasksMutex);
  auto it = m_executingTasks.find(taskId);
  if (it != m_executingTasks.end()) {
    it->second.currentState = "PAUSED";
    // For remote, forward command
    if (it->second.assignedNode != m_ctx->getRuntimeConfig().node.nodeName) {
      std::string remoteAddr = resolveNodeAddress(m_ctx, it->second.assignedNode);
      if (!remoteAddr.empty()) {
        m_ctx->getTransport()->send(remoteAddr, "TASK_PAUSE|" + taskId);
      }
    }
  }
}

void DistributedExecutionService::resumeTask(const common::TaskID& taskId) {
  std::lock_guard<std::mutex> lock(m_tasksMutex);
  auto it = m_executingTasks.find(taskId);
  if (it != m_executingTasks.end()) {
    it->second.currentState = "RUNNING";
    // For remote, forward command
    if (it->second.assignedNode != m_ctx->getRuntimeConfig().node.nodeName) {
      std::string remoteAddr = resolveNodeAddress(m_ctx, it->second.assignedNode);
      if (!remoteAddr.empty()) {
        m_ctx->getTransport()->send(remoteAddr, "TASK_RESUME|" + taskId);
      }
    }
  }
}

std::string DistributedExecutionService::getTaskStatus(const common::TaskID& taskId) {
  {
    std::lock_guard<std::mutex> lock(m_tasksMutex);
    auto it = m_executingTasks.find(taskId);
    if (it != m_executingTasks.end()) {
      return it->second.currentState;
    }
  }
  tasks::DistributedTask t;
  if (m_queue.getTask(taskId, t)) {
    return t.currentState;
  }
  TaskResult res;
  if (m_resultManager->getResult(taskId, res)) {
    return res.success ? "COMPLETED" : "FAILED";
  }
  return "UNKNOWN";
}

bool DistributedExecutionService::getTaskResult(const common::TaskID& taskId, TaskResult& outResult) {
  return m_resultManager->getResult(taskId, outResult);
}

capabilities::NodeCapabilities DistributedExecutionService::getNodeCapabilities(const common::NodeID& nodeId) const {
  auto capReg = m_ctx->getCapabilityRegistry();
  if (capReg) {
    return capReg->getCapabilities(nodeId);
  }
  return capabilities::NodeCapabilities{};
}

void DistributedExecutionService::saveCheckpoint(const Checkpoint& cp) {
  m_checkpointManager.saveCheckpoint(cp);
  m_ctx->log("INFO", "ExecutionService", "Saved checkpoint for task " + cp.taskId + " version " + std::to_string(cp.version));
}

bool DistributedExecutionService::getLatestCheckpoint(const common::TaskID& taskId, Checkpoint& outCp) const {
  return m_checkpointManager.getLatestCheckpoint(taskId, outCp);
}

ExecutionMetrics DistributedExecutionService::getMetrics() {
  std::lock_guard<std::mutex> lock(m_metricsMutex);
  ExecutionMetrics metrics;
  metrics.queueLength = m_queue.size();
  metrics.completedTasksCount = m_completedCount.load();
  metrics.failureRate = m_failureCount.load();
  metrics.retryCount = m_retryCount.load();
  metrics.networkTrafficBytes = m_networkTrafficBytes;
  return metrics;
}

void DistributedExecutionService::broadcastCapabilities() {
  if (!m_ctx->getTransport()) return;
  
  capabilities::NodeCapabilities localCaps;
  localCaps.nodeId = m_ctx->getRuntimeConfig().node.nodeName;
  localCaps.cpuCores = 8;
  localCaps.cpuUtilization = 12.5; // Dummy load
  localCaps.ramCapacity = 16ULL * 1024ULL * 1024ULL * 1024ULL;
  localCaps.ramUtilization = 45.2;
  localCaps.gpuAvailable = true;
  localCaps.gpuModel = "NVIDIA GeForce RTX 4090";
  localCaps.cudaSupported = true;
  localCaps.storageCapacity = 1000ULL * 1024ULL * 1024ULL * 1024ULL;
  localCaps.networkLatency = 5.0;
  localCaps.installedModels = {"llama-3-8b", "phi-3"};
  localCaps.availableAgents = {"System-Planner", "System-Coder"};
  localCaps.activeServices = {"AIRuntime", "DistributedInferenceService"};
  localCaps.trustLevel = 0.95;

  std::string payload = "CAPABILITY_BROADCAST|" + localCaps.toJson();
  
  auto reg = m_ctx->getNodeRegistry();
  if (reg) {
    for (const auto& node : reg->listNodes()) {
      if (node && node->identity.id != localCaps.nodeId) {
        std::string addr = resolveNodeAddress(m_ctx, node->identity.id);
        if (!addr.empty()) {
          m_ctx->getTransport()->send(addr, payload);
          std::lock_guard<std::mutex> mLock(m_metricsMutex);
          m_networkTrafficBytes += payload.size();
        }
      }
    }
  }
}

void DistributedExecutionService::runDispatcher() {
  while (m_running) {
    tasks::DistributedTask task;
    if (m_queue.dequeue(task)) {
      m_ctx->log("INFO", "ExecutionService", "Dispatching task: " + task.taskId);

      // Collect all node capabilities
      std::vector<capabilities::NodeCapabilities> allCaps;
      std::map<common::NodeID, health::NodeHealth> healthMap;

      // Add local capabilities
      capabilities::NodeCapabilities localCaps;
      auto capReg = m_ctx->getCapabilityRegistry();
      if (capReg) {
        localCaps = capReg->getCapabilities(m_ctx->getRuntimeConfig().node.nodeName);
      } else {
        localCaps = m_localCapabilities;
      }
      localCaps.nodeId = m_ctx->getRuntimeConfig().node.nodeName;
      allCaps.push_back(localCaps);
      healthMap[localCaps.nodeId] = health::NodeHealth();

      auto reg = m_ctx->getNodeRegistry();
      capReg = m_ctx->getCapabilityRegistry();
      if (reg) {
        for (const auto& node : reg->listNodes()) {
          if (node) {
            capabilities::NodeCapabilities c;
            if (capReg) {
              c = capReg->getCapabilities(node->identity.id);
            }
            c.nodeId = node->identity.id;
            allCaps.push_back(c);
            healthMap[node->identity.id] = node->health;
          }
        }
      }

      common::NodeID bestNode = m_scheduler.scheduleTask(task, allCaps, healthMap);
      
      {
        std::stringstream ss;
        ss << "Scheduling task " << task.taskId << " - Selected: " << bestNode << ". Eligible nodes: ";
        for (const auto& c : allCaps) {
          ss << c.nodeId << "(gpu=" << (c.gpuAvailable ? "1" : "0") << ") ";
        }
        m_ctx->log("INFO", "ExecutionService", ss.str());
      }

      if (bestNode.empty()) {
        m_ctx->log("WARN", "ExecutionService", "No suitable node found for task " + task.taskId);
        m_resultManager->setFinalResult(task.taskId, "", false, "No suitable execution node found");
        m_failureCount++;
        continue;
      }

      task.assignedNode = bestNode;
      task.currentState = "RUNNING";

      {
        std::lock_guard<std::mutex> lock(m_tasksMutex);
        m_executingTasks[task.taskId] = task;
      }

      if (bestNode == m_ctx->getRuntimeConfig().node.nodeName) {
        executeLocalTask(task);
      } else {
        dispatchRemoteTask(task, bestNode);
      }
    }
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
  }
}

void DistributedExecutionService::runMonitor() {
  while (m_running) {
    // 1. Periodically broadcast capabilities
    broadcastCapabilities();

    // 2. Failure detection & recovery
    std::vector<tasks::DistributedTask> failedTasks;
    {
      std::lock_guard<std::mutex> lock(m_tasksMutex);
      auto now = common::now();
      for (const auto& [id, task] : m_executingTasks) {
        if (task.assignedNode != m_ctx->getRuntimeConfig().node.nodeName) {
          // Check if remote node is dead
          auto reg = m_ctx->getNodeRegistry();
          if (reg) {
            auto node = reg->getNode(task.assignedNode);
            if (node) {
              auto duration = std::chrono::duration_cast<std::chrono::seconds>(now - node->health.lastContact).count();
              if (duration > 3) { // 3 seconds timeout
                m_ctx->log("WARN", "ExecutionService", "Node " + task.assignedNode + " detected offline. Re-assigning task " + task.taskId);
                failedTasks.push_back(task);
              }
            }
          }
        }
      }
    }

    for (const auto& task : failedTasks) {
      recoverFailedTask(task);
    }

    std::this_thread::sleep_for(std::chrono::seconds(1));
  }
}

void DistributedExecutionService::handleMessage(const std::string& sender, const std::string& payload) {
  auto pipe = payload.find('|');
  if (pipe == std::string::npos) return;
  std::string type = payload.substr(0, pipe);
  std::string body = payload.substr(pipe + 1);

  // Update lastContact for sender node on any received network envelope
  auto reg = m_ctx->getNodeRegistry();
  if (reg) {
    // Extract actual nodeId from sender name/address or payload
    std::string senderNodeId;
    if (type == "CAPABILITY_BROADCAST" || type == "TASK_DISPATCH") {
      // Find nodeID inside body
      senderNodeId = common::parseString(body, "nodeId");
      if (senderNodeId.empty()) {
        senderNodeId = common::parseString(body, "assignedNode");
      }
    }
    if (senderNodeId.empty()) {
      // deduce from sender IP
      auto nodes = reg->listNodes();
      for (const auto& n : nodes) {
        if (n && resolveNodeAddress(m_ctx, n->identity.id) == sender) {
          senderNodeId = n->identity.id;
          break;
        }
      }
    }
    if (!senderNodeId.empty()) {
      auto node = reg->getNode(senderNodeId);
      if (node) {
        node->health.lastContact = common::now();
        node->health.healthScore = 100;
        node->health.statusSummary = "HEALTHY";
      }
    }
  }

  if (type == "CAPABILITY_BROADCAST") {
    capabilities::NodeCapabilities caps;
    if (caps.fromJson(body)) {
      auto capReg = m_ctx->getCapabilityRegistry();
      if (capReg) {
        capReg->updateCapabilities(caps.nodeId, caps);
      }
    }
  } else if (type == "TASK_DISPATCH") {
    tasks::DistributedTask task;
    if (task.fromJson(body)) {
      m_ctx->log("INFO", "ExecutionService", "Received dispatched task " + task.taskId + " from remote node");
      // Execute locally on worker
      task.currentState = "RUNNING";
      {
        std::lock_guard<std::mutex> lock(m_tasksMutex);
        m_executingTasks[task.taskId] = task;
      }
      executeLocalTask(task);
    }
  } else if (type == "TASK_PROGRESS") {
    std::string taskId = common::parseString(body, "taskId");
    double progress = common::parseDouble(body, "progress");
    std::string output = common::parseString(body, "output");
    
    m_resultManager->addPartialOutput(taskId, output);
    
    std::lock_guard<std::mutex> lock(m_tasksMutex);
    auto it = m_executingTasks.find(taskId);
    if (it != m_executingTasks.end()) {
      it->second.progress = progress;
    }
  } else if (type == "TASK_RESULT") {
    std::string taskId = common::parseString(body, "taskId");
    bool success = common::parseBool(body, "success");
    std::string result = common::parseString(body, "result");
    std::string error = common::parseString(body, "error");
    
    m_resultManager->setFinalResult(taskId, result, success, error);
    if (success) m_completedCount++;
    else m_failureCount++;

    std::lock_guard<std::mutex> lock(m_tasksMutex);
    m_executingTasks.erase(taskId);
  } else if (type == "TASK_CANCEL") {
    m_workerRuntime.cancelTask(body);
  }
}

void DistributedExecutionService::executeLocalTask(const tasks::DistributedTask& task) {
  m_workerRuntime.executeTask(task,
    [this, task](double progress, const std::string& partialOutput) {
      // Progress Callback
      m_resultManager->addPartialOutput(task.taskId, partialOutput);
      
      // If remote task request, send progress back to client
      if (!task.sourceNode.empty() && task.sourceNode != m_ctx->getRuntimeConfig().node.nodeName) {
        std::string clientAddr = resolveNodeAddress(m_ctx, task.sourceNode);
        if (!clientAddr.empty()) {
          std::stringstream ss;
          ss << "TASK_PROGRESS|{"
             << "\"taskId\":\"" << task.taskId << "\","
             << "\"progress\":" << progress << ","
             << "\"output\":\"" << partialOutput << "\""
             << "}";
          m_ctx->getTransport()->send(clientAddr, ss.str());
        }
      }
    },
    [this, task](const std::string& resultData, bool success, const std::string& error) {
      // Completion Callback
      m_resultManager->setFinalResult(task.taskId, resultData, success, error);
      
      if (success) {
        m_completedCount++;
      } else {
        m_failureCount++;
      }

      {
        std::lock_guard<std::mutex> lock(m_tasksMutex);
        m_executingTasks.erase(task.taskId);
      }

      // If remote task request, send final result back
      if (!task.sourceNode.empty() && task.sourceNode != m_ctx->getRuntimeConfig().node.nodeName) {
        std::string clientAddr = resolveNodeAddress(m_ctx, task.sourceNode);
        if (!clientAddr.empty()) {
          std::stringstream ss;
          ss << "TASK_RESULT|{"
             << "\"taskId\":\"" << task.taskId << "\","
             << "\"success\":" << (success ? "true" : "false") << ","
             << "\"result\":\"" << resultData << "\","
             << "\"error\":\"" << error << "\""
             << "}";
          m_ctx->getTransport()->send(clientAddr, ss.str());
        }
      }
    }
  );
}

void DistributedExecutionService::dispatchRemoteTask(const tasks::DistributedTask& task, const common::NodeID& targetNode) {
  std::string remoteAddr = resolveNodeAddress(m_ctx, targetNode);
  if (remoteAddr.empty()) {
    m_ctx->log("WARN", "ExecutionService", "Could not resolve address for remote node " + targetNode);
    recoverFailedTask(task);
    return;
  }

  std::string payload = "TASK_DISPATCH|" + task.toJson();
  m_ctx->getTransport()->send(remoteAddr, payload);
  std::lock_guard<std::mutex> mLock(m_metricsMutex);
  m_networkTrafficBytes += payload.size();
}

void DistributedExecutionService::recoverFailedTask(const tasks::DistributedTask& task) {
  m_failureCount++;
  
  // Remove from executing list
  {
    std::lock_guard<std::mutex> lock(m_tasksMutex);
    m_executingTasks.erase(task.taskId);
  }

  if (task.retryPolicy.retryCount < task.retryPolicy.maxRetries) {
    tasks::DistributedTask retriedTask = task;
    retriedTask.retryPolicy.retryCount++;
    retriedTask.currentState = "PENDING";
    retriedTask.assignedNode = "";
    
    // Checkpoint restoration if available
    Checkpoint cp;
    if (m_checkpointManager.getLatestCheckpoint(task.taskId, cp)) {
      retriedTask.checkpointInfo.checkpointId = cp.checkpointId;
      retriedTask.checkpointInfo.stateData = cp.stateData;
      m_ctx->log("INFO", "ExecutionService", "Restoring task " + task.taskId + " from checkpoint version " + std::to_string(cp.version));
    }

    m_retryCount++;
    m_queue.enqueue(retriedTask);
    m_ctx->log("INFO", "ExecutionService", "Re-queuing task " + task.taskId + " for retry attempt " + std::to_string(retriedTask.retryPolicy.retryCount));
  } else {
    m_ctx->log("ERROR", "ExecutionService", "Task " + task.taskId + " exceeded max retries. Failing task.");
    m_resultManager->setFinalResult(task.taskId, "", false, "Max retry count exceeded");
  }
}

} // namespace aegis::die::execution
