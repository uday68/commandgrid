"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DependencyGraph = void 0;
/**
 * A class to represent and analyze dependencies between tasks
 */
class DependencyGraph {
    /**
     * Creates a new dependency graph from a list of tasks
     * @param tasks The list of tasks to build the graph from
     */
    constructor(tasks) {
        this.adjacencyList = new Map();
        this.nodes = new Set();
        // Initialize the graph
        if (tasks) {
            for (const task of tasks) {
                this.addNode(task.id);
                if (task.dependencies && Array.isArray(task.dependencies)) {
                    for (const dependencyId of task.dependencies) {
                        this.addEdge(dependencyId, task.id);
                    }
                }
            }
        }
    }
    /**
     * Add a node to the graph (public method)
     * @param node The node identifier
     */
    addNodeToGraph(node) {
        this.addNode(node);
    }
    /**
     * Add a node to the graph
     * @param node The node identifier
     */
    addNode(node) {
        this.nodes.add(node);
        if (!this.adjacencyList.has(node)) {
            this.adjacencyList.set(node, []);
        }
    }
    /**
     * Add a directed edge from source to target
     * @param source The source node
     * @param target The target node
     */
    addEdge(source, target) {
        this.addNode(source);
        this.addNode(target);
        const neighbors = this.adjacencyList.get(source) || [];
        if (!neighbors.includes(target)) {
            neighbors.push(target);
            this.adjacencyList.set(source, neighbors);
        }
    }
    /**
     * Detect if there are any cycles in the graph
     * @returns true if the graph has cycles, false otherwise
     */
    hasCycles() {
        const visited = new Set();
        const recStack = new Set();
        const dfs = (node) => {
            // If node is already in recursion stack, we found a cycle
            if (recStack.has(node)) {
                return true;
            }
            // If node is already visited and not in recursion stack, no cycle through this path
            if (visited.has(node)) {
                return false;
            }
            // Add node to visited and recursion stack
            visited.add(node);
            recStack.add(node);
            // Visit all neighbors
            const neighbors = this.adjacencyList.get(node) || [];
            for (const neighbor of neighbors) {
                if (dfs(neighbor)) {
                    return true;
                }
            }
            // Remove node from recursion stack
            recStack.delete(node);
            return false;
        };
        // Check each node
        for (const node of this.nodes) {
            if (!visited.has(node) && dfs(node)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Perform topological sort to find execution order
     * @returns Array of nodes in topological order, or null if graph has cycles
     */
    topologicalSort() {
        if (this.hasCycles()) {
            return null;
        }
        const visited = new Set();
        const result = [];
        const visit = (node) => {
            if (visited.has(node)) {
                return;
            }
            visited.add(node);
            // Visit all neighbors first
            const neighbors = this.adjacencyList.get(node) || [];
            for (const neighbor of neighbors) {
                visit(neighbor);
            }
            // Add current node to result
            result.unshift(node);
        };
        // Visit all nodes
        for (const node of this.nodes) {
            if (!visited.has(node)) {
                visit(node);
            }
        }
        return result;
    }
    /**
     * Find parallel tasks that can be executed simultaneously
     * @returns Array of task groups that can be executed in parallel
     */
    findParallelTasks() {
        const sorted = this.topologicalSort();
        if (!sorted) {
            return [];
        }
        // For each node, calculate its "level" (longest path from any root)
        const levels = new Map();
        // Initialize levels to 0
        for (const node of this.nodes) {
            levels.set(node, 0);
        }
        // Calculate levels based on dependencies
        for (const node of sorted) {
            const neighbors = this.adjacencyList.get(node) || [];
            for (const neighbor of neighbors) {
                const currentLevel = levels.get(neighbor) || 0;
                const newLevel = (levels.get(node) || 0) + 1;
                if (newLevel > currentLevel) {
                    levels.set(neighbor, newLevel);
                }
            }
        }
        // Group nodes by level
        const levelGroups = new Map();
        for (const [node, level] of levels.entries()) {
            if (!levelGroups.has(level)) {
                levelGroups.set(level, []);
            }
            levelGroups.get(level)?.push(node);
        }
        // Convert the map to array of arrays
        return Array.from(levelGroups.values());
    }
    /**
     * Get all dependencies for a task (direct and indirect)
     * @param taskId The task ID to find dependencies for
     * @returns Array of task IDs that the specified task depends on
     */
    getAllDependencies(taskId) {
        if (!this.nodes.has(taskId)) {
            return [];
        }
        const result = new Set();
        const visited = new Set();
        const dfs = (node) => {
            if (visited.has(node)) {
                return;
            }
            visited.add(node);
            // Get all tasks that this node depends on (reverse edges)
            for (const [src, targets] of this.adjacencyList.entries()) {
                if (targets.includes(node)) {
                    result.add(src);
                    dfs(src);
                }
            }
        };
        dfs(taskId);
        return Array.from(result);
    }
    /**
     * Get all dependent tasks (direct and indirect)
     * @param taskId The task ID to find dependents for
     * @returns Array of task IDs that depend on the specified task
     */
    getAllDependents(taskId) {
        if (!this.nodes.has(taskId)) {
            return [];
        }
        const result = new Set();
        const visited = new Set();
        const dfs = (node) => {
            if (visited.has(node)) {
                return;
            }
            visited.add(node);
            const neighbors = this.adjacencyList.get(node) || [];
            for (const neighbor of neighbors) {
                result.add(neighbor);
                dfs(neighbor);
            }
        };
        dfs(taskId);
        return Array.from(result);
    }
    /**
     * Find critical path through the graph
     * @returns Array of task IDs that form the critical path
     */
    findCriticalPath() {
        if (this.hasCycles()) {
            return [];
        }
        // Step 1: Calculate earliest start times
        const earliestStart = new Map();
        for (const node of this.nodes) {
            earliestStart.set(node, 0);
        }
        const topOrder = this.topologicalSort();
        if (!topOrder) {
            return [];
        }
        // Forward pass
        for (const node of topOrder) {
            const neighbors = this.adjacencyList.get(node) || [];
            const duration = 1; // Assume each task takes 1 unit of time
            for (const neighbor of neighbors) {
                const currentEarly = earliestStart.get(neighbor) || 0;
                const newEarly = (earliestStart.get(node) || 0) + duration;
                if (newEarly > currentEarly) {
                    earliestStart.set(neighbor, newEarly);
                }
            }
        }
        // Step 2: Calculate latest start times
        const latestStart = new Map();
        // Find the maximum completion time
        let maxCompletionTime = 0;
        for (const [_, time] of earliestStart.entries()) {
            if (time > maxCompletionTime) {
                maxCompletionTime = time;
            }
        }
        // Initialize all to max completion time
        for (const node of this.nodes) {
            latestStart.set(node, maxCompletionTime);
        }
        // Backward pass
        for (const node of [...topOrder].reverse()) {
            const neighbors = this.adjacencyList.get(node) || [];
            if (neighbors.length === 0) {
                latestStart.set(node, maxCompletionTime);
            }
            const duration = 1; // Assume each task takes 1 unit of time
            for (const neighbor of neighbors) {
                const neighborLatest = latestStart.get(neighbor) || 0;
                const newLatest = neighborLatest - duration;
                const currentLatest = latestStart.get(node) || 0;
                if (newLatest < currentLatest) {
                    latestStart.set(node, newLatest);
                }
            }
        }
        // Step 3: Find nodes with zero slack
        const criticalPath = [];
        for (const node of this.nodes) {
            const early = earliestStart.get(node) || 0;
            const late = latestStart.get(node) || 0;
            if (early === late) {
                criticalPath.push(node);
            }
        }
        return criticalPath;
    }
}
exports.DependencyGraph = DependencyGraph;
//# sourceMappingURL=dependencyGraph.js.map