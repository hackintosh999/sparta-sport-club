"use strict";
/**
 * Public API for agentMemory extension
 * Allows other VS Code extensions to integrate with the memory bank
 *
 * SECURITY: Extensions can only access their own memories by default.
 * Cross-extension access requires explicit user permission.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryAPI = void 0;
/**
 * agentMemory Extension API
 *
 * @example
 * ```typescript
 * import * as vscode from 'vscode';
 *
 * const agentMemory = vscode.extensions.getExtension('your-publisher.agentmemory');
 * if (agentMemory) {
 *     const api = agentMemory.exports as MemoryAPI;
 *
 *     // Write a memory
 *     await api.write('my-feature-key', 'Feature description...', {
 *         type: 'feature',
 *         tags: ['api', 'backend']
 *     });
 *
 *     // Read a memory
 *     const memory = await api.read('my-feature-key');
 *     console.log(memory?.content);
 *
 *     // Search memories
 *     const results = await api.search({ query: 'api', limit: 5 });
 * }
 * ```
 */
class MemoryAPI {
    constructor(extensionId, projectId, securityManager, mcpClient // Reference to MCP client/server
    ) {
        this.extensionId = extensionId;
        this.projectId = projectId;
        this.securityManager = securityManager;
        this.mcpClient = mcpClient;
        this.eventListeners = new Set();
    }
    /**
     * Write a new memory to the memory bank
     *
     * @param key - Unique identifier for the memory
     * @param content - Memory content (supports Markdown)
     * @param options - Memory options (type, tags, relationships)
     * @returns Promise resolving to the memory ID
     */
    async write(key, content, options) {
        const createdBy = options.metadata?.createdBy || this.extensionId;
        // Security check: Can this extension write?
        const permission = await this.securityManager.checkPermission(this.extensionId, 'write', key, createdBy);
        if (!permission.allowed) {
            throw new Error(`Permission denied: ${permission.reason}`);
        }
        const params = {
            projectId: this.projectId,
            key,
            content,
            type: options.type,
            tags: options.tags || [],
            relationships: options.relationships || { dependsOn: [], implements: [] },
            createdBy
        };
        // Call MCP server's memory_write tool
        const result = await this.callMCPTool('memory_write', params);
        // Emit event
        this.emitEvent({
            action: 'write',
            key,
            agent: createdBy,
            timestamp: Date.now()
        });
        return result.id;
    }
    /**
     * Read a memory by key
     *
     * @param key - Memory key to read
     * @returns Promise resolving to the memory, or null if not found
     */
    async read(key) {
        const params = {
            projectId: this.projectId,
            key
        };
        const result = await this.callMCPTool('memory_read', params);
        if (result) {
            // Security check: Can this extension read this memory?
            const permission = await this.securityManager.checkPermission(this.extensionId, 'read', key, result.metadata.createdBy);
            if (!permission.allowed) {
                throw new Error(`Permission denied: ${permission.reason}`);
            }
            // Emit event
            this.emitEvent({
                action: 'read',
                key,
                agent: this.extensionId,
                timestamp: Date.now()
            });
        }
        return result;
    }
    /**
     * Search memories by query, tags, or type
     *
     * @param options - Search options
     * @returns Promise resolving to array of matching memories
     */
    async search(options = {}) {
        const params = {
            projectId: this.projectId,
            query: options.query,
            tags: options.tags,
            type: options.type,
            limit: options.limit || 10
        };
        const results = await this.callMCPTool('memory_search', params);
        // Security filter: Only return memories this extension can access
        const filteredResults = [];
        for (const memory of results) {
            // If onlyOwn flag is set, only include own memories
            if (options.onlyOwn && memory.metadata.createdBy !== this.extensionId) {
                continue;
            }
            const permission = await this.securityManager.checkPermission(this.extensionId, 'read', memory.key, memory.metadata.createdBy);
            if (permission.allowed) {
                filteredResults.push(memory);
            }
        }
        return filteredResults;
    }
    /**
     * List all memories, optionally filtered by type
     *
     * @param type - Optional memory type filter
     * @returns Promise resolving to array of memories
     */
    async list(type) {
        const params = {
            projectId: this.projectId,
            type
        };
        return await this.callMCPTool('memory_list', params);
    }
    /**
     * Update an existing memory
     *
     * @param key - Memory key to update
     * @param updates - Partial updates to apply
     * @returns Promise resolving to updated memory, or null if not found
     */
    async update(key, updates) {
        const params = {
            projectId: this.projectId,
            key,
            ...updates
        };
        const result = await this.callMCPTool('memory_update', params);
        if (result.success) {
            // Emit event
            this.emitEvent({
                action: 'update',
                key,
                agent: 'external-plugin',
                timestamp: Date.now()
            });
        }
        return result.memory;
    }
    /**
     * Subscribe to memory events (write, read, update)
     *
     * @param callback - Function to call when events occur
     * @returns Unsubscribe function
     */
    subscribe(callback) {
        this.eventListeners.add(callback);
        // Return unsubscribe function
        return () => {
            this.eventListeners.delete(callback);
        };
    }
    /**
     * Get statistics about memory usage
     *
     * @returns Promise resolving to statistics object
     */
    async getStats() {
        const params = {
            projectId: this.projectId
        };
        return await this.callMCPTool('memory_stats', params);
    }
    /**
     * Internal: Call MCP tool
     */
    async callMCPTool(toolName, params) {
        // This will be implemented to communicate with the MCP server
        // For now, return a placeholder
        console.log(`[MemoryAPI] Calling tool: ${toolName}`, params);
        // TODO: Implement actual MCP communication
        // This could use:
        // 1. Direct function calls to storage layer
        // 2. Message passing to MCP server process
        // 3. HTTP/socket communication
        return null;
    }
    /**
     * Internal: Emit event to subscribers
     */
    emitEvent(event) {
        for (const listener of this.eventListeners) {
            try {
                listener(event);
            }
            catch (error) {
                console.error('[MemoryAPI] Error in event listener:', error);
            }
        }
    }
}
exports.MemoryAPI = MemoryAPI;
//# sourceMappingURL=api.js.map