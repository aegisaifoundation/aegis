#include "AITask.hpp"

namespace aegis::air {

TaskGraph TaskPlanner::plan(const AITask& rootTask) {
  TaskGraph graph;
  
  // Decomposition rule: If rootTask has no subtasks, we split it into standard workflow steps
  if (rootTask.subtasks.empty()) {
    AITask t1;
    t1.taskId = rootTask.taskId + "_planning";
    t1.goal = "Formulate strategy for: " + rootTask.goal;
    t1.requiredCapabilities = {"planning"};
    
    AITask t2;
    t2.taskId = rootTask.taskId + "_research";
    t2.goal = "Collect information for: " + rootTask.goal;
    t2.requiredCapabilities = {"research"};
    
    AITask t3;
    t3.taskId = rootTask.taskId + "_coding";
    t3.goal = "Implement and write script for: " + rootTask.goal;
    t3.requiredCapabilities = {"coding"};
    
    graph.addTask(t1);
    graph.addTask(t2);
    graph.addTask(t3);
    
    // Set dependencies: t1 -> t2 -> t3
    graph.addDependency(t1.taskId, t2.taskId);
    graph.addDependency(t2.taskId, t3.taskId);
  } else {
    // If subtasks are already specified, add them
    for (const auto& sub : rootTask.subtasks) {
      graph.addTask(sub);
      for (const auto& dep : sub.dependencies) {
        graph.addDependency(dep, sub.taskId);
      }
    }
  }
  
  return graph;
}

} // namespace aegis::air
