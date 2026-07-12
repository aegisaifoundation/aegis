import { PackageManifest } from '../types/Manifest.js';

export interface DependencyNode {
  id: string;
  manifest: PackageManifest;
  dependencies: string[];
}

export class DependencyResolver {
  public static resolve(
    targets: PackageManifest[],
    availablePackages: Record<string, PackageManifest>
  ): PackageManifest[] {
    const graph: Record<string, DependencyNode> = {};
    const allKnown = { ...availablePackages };
    
    // Index target manifests
    for (const target of targets) {
      allKnown[target.id.toLowerCase()] = target;
    }

    // 1. Build Dependency Graph
    const buildGraph = (manifest: PackageManifest) => {
      const key = manifest.id.toLowerCase();
      if (graph[key]) return;

      const deps = Object.keys(manifest.dependencies || {});
      graph[key] = {
        id: manifest.id,
        manifest,
        dependencies: deps
      };

      for (const depId of deps) {
        const depKey = depId.toLowerCase();
        const depManifest = allKnown[depKey];
        if (!depManifest) {
          throw new Error(`Dependency resolution failed: missing dependency "${depId}" for package "${manifest.id}"`);
        }
        
        // Simple version constraint check
        const requiredVersion = manifest.dependencies![depId];
        if (requiredVersion && requiredVersion !== '*' && requiredVersion !== depManifest.version) {
          // Fallback to simple comparison (direct match or wildcard for tests)
          throw new Error(`Dependency version mismatch: "${manifest.id}" requires "${depId}" version "${requiredVersion}", but found "${depManifest.version}"`);
        }

        buildGraph(depManifest);
      }
    };

    for (const target of targets) {
      buildGraph(target);
    }

    // 2. Cycle Detection and Topological Sort using DFS
    const visited: Record<string, 'VISITING' | 'VISITED'> = {};
    const order: PackageManifest[] = [];

    const visit = (key: string) => {
      if (visited[key] === 'VISITING') {
        throw new Error(`Circular dependency detected involving package: "${graph[key].id}"`);
      }
      if (visited[key] === 'VISITED') return;

      visited[key] = 'VISITING';

      const node = graph[key];
      for (const depId of node.dependencies) {
        visit(depId.toLowerCase());
      }

      visited[key] = 'VISITED';
      
      // If it is one of the new installations (not already pre-installed), add it to order
      const isTarget = targets.some(t => t.id.toLowerCase() === key);
      if (isTarget) {
        order.push(node.manifest);
      }
    };

    for (const target of targets) {
      visit(target.id.toLowerCase());
    }

    return order;
  }
}
