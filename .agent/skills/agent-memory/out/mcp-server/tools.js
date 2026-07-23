"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPTools = void 0;
const uuid_1 = require("uuid");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class MCPTools {
    constructor(storage, cache, syncEngine) {
        this.storage = storage;
        this.cache = cache;
        this.syncEngine = syncEngine;
    }
    /**
     * Tool 1: memory_write - Store new memory
     */
    async memory_write(params) {
        const { projectId, key, type, content, tags = [], relationships = { dependsOn: [], implements: [] }, createdBy = 'agent' } = params;
        const memory = {
            id: (0, uuid_1.v4)(),
            projectId,
            key,
            type,
            content,
            tags,
            relationships,
            metadata: {
                accessCount: 0,
                createdBy
            },
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        await this.storage.write(projectId, memory);
        // Update cache
        const cacheKey = `${projectId}:${key}`;
        this.cache.set(cacheKey, memory);
        // Sync to agent markdown files (async, no await)
        if (this.syncEngine) {
            this.syncEngine.exportToAgents(memory).catch(err => {
                console.error('[MCPTools] Failed to sync to markdown:', err);
            });
        }
        return { success: true, id: memory.id };
    }
    /**
     * Tool 2: memory_read - Get exact key (2μs target)
     */
    async memory_read(params) {
        const { projectId, key } = params;
        const cacheKey = `${projectId}:${key}`;
        // Try cache first
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return cached;
        }
        // Fallback to storage
        const memory = await this.storage.read(projectId, key);
        if (memory) {
            this.cache.set(cacheKey, memory);
        }
        return memory;
    }
    /**
     * Tool 3: memory_search - Keyword/tag search (100μs target)
     */
    async memory_search(params) {
        const { projectId, query, tags, type, limit = 10 } = params;
        const results = await this.storage.search(projectId, query, tags, type);
        // Sort by relevance (access count and recency)
        results.sort((a, b) => {
            const scoreA = a.metadata.accessCount * 0.5 + (Date.now() - a.updatedAt) * -0.0001;
            const scoreB = b.metadata.accessCount * 0.5 + (Date.now() - b.updatedAt) * -0.0001;
            return scoreB - scoreA;
        });
        return results.slice(0, limit);
    }
    /**
     * Tool 4: memory_list - List by type (50μs target)
     */
    async memory_list(params) {
        const { projectId, type } = params;
        return this.storage.list(projectId, type);
    }
    /**
     * Tool 5: memory_update - Append to existing (200μs target)
     */
    async memory_update(params) {
        const { projectId, key, content, tags, relationships } = params;
        const updates = {};
        if (content !== undefined)
            updates.content = content;
        if (tags !== undefined)
            updates.tags = tags;
        if (relationships !== undefined)
            updates.relationships = relationships;
        const updated = await this.storage.update(projectId, key, updates);
        if (updated) {
            // Update cache
            const cacheKey = `${projectId}:${key}`;
            this.cache.set(cacheKey, updated);
        }
        return { success: !!updated, memory: updated };
    }
    /**
     * Tool 6: project_init - Auto-detect workspace (10μs target)
     */
    async project_init(params) {
        const { projectId } = params;
        await this.storage.initProject(projectId);
        // Auto-create .agent structure if it doesn't exist (Antigravity support)
        // We need to resolve the workspace path. Since we don't have it passed explicitly in params, 
        // we'll rely on the storage manager's base path or try to infer it. 
        // Ideally, we should pass workspacePath to project_init.
        // For now, let's assume storage manager knows where the root is.
        // Or better yet, let's update call args to include workspacePath if possible, 
        // but for safety, we'll try to use the parent of .agentMemory if available.
        try {
            // @ts-ignore
            const storagePath = this.storage.baseDir;
            console.error('[project_init] Storage path:', storagePath);
            if (storagePath) {
                const projectRoot = path.dirname(storagePath); // Parent of .agentMemory
                console.error('[project_init] Project root:', projectRoot);
                const agentDir = path.join(projectRoot, '.agent');
                const workflowsDir = path.join(agentDir, 'workflows');
                if (!fs.existsSync(workflowsDir)) {
                    fs.mkdirSync(workflowsDir, { recursive: true });
                }
                const workflowFile = path.join(workflowsDir, 'update-memory.md');
                if (!fs.existsSync(workflowFile)) {
                    const workflowContent = `---
description: How to update the project memory bank with new findings
---

# Update Memory Bank

Follow this workflow to document important architectural decisions, patterns, or features.

1. **Search First**: Check if a similar memory already exists.
   \`\`\`bash
   # Use the memory_search tool
   memory_search({ "query": "<topic>" })
   \`\`\`

2. **Decide Action**:
   - If it's **new**, use \`memory_write\`.
   - If it **exists** but needs updates, use \`memory_update\` (or \`memory_write\` with the same key to overwrite).

3. **Write Memory**:
   Use the \`memory_write\` tool. Ensure you provide meaningful tags.
   - \`type\`: Choose one of \`architecture\`, \`pattern\`, \`decision\`, \`feature\`.
   - \`key\`: A unique, kebab-case identifier (e.g., \`auth-flow-v2\`).
   
   Example:
   \`\`\`javascript
   memory_write({
     "key": "feature-x-impl",
     "type": "feature",
     "content": "# Feature X\\n\\nImplementation details...",
     "tags": ["frontend", "react"]
   })
   \`\`\`

4. **Verify**: Run \`memory_stats\` to confirm the total memory count increased or changed as expected.
`;
                    fs.writeFileSync(workflowFile, workflowContent);
                }
            }
        }
        catch (error) {
            console.error('[project_init] Failed to scaffold .agent directory:', error);
            // Don't fail the init, just log the error
        }
        return { success: true, projectId };
    }
    /**
     * Tool 7: memory_stats - Usage analytics (20μs target)
     */
    async memory_stats(params) {
        const { projectId } = params;
        const stats = await this.storage.getStats(projectId);
        const cacheStats = this.cache.getStats();
        // Add sync status if available
        const syncStatus = this.syncEngine ? {
            enabled: true,
            agents: ['kilocode', 'cline', 'roocode']
        } : { enabled: false };
        return {
            ...stats,
            cache: cacheStats,
            sync: syncStatus
        };
    }
    /**
     * List all available tools
     */
    static listTools() {
        return [
            {
                name: 'memory_write',
                description: 'Store new memory in the memory bank',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectId: { type: 'string', description: 'Project identifier' },
                        key: { type: 'string', description: 'Unique memory key' },
                        type: { type: 'string', enum: ['architecture', 'pattern', 'feature', 'api', 'bug', 'decision'] },
                        content: { type: 'string', description: 'Memory content (markdown supported)' },
                        tags: { type: 'array', items: { type: 'string' }, description: 'Tags for categorization' },
                        relationships: { type: 'object', description: 'Dependencies and implementations' }
                    },
                    required: ['projectId', 'key', 'type', 'content']
                }
            },
            {
                name: 'memory_read',
                description: 'Read memory by exact key',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectId: { type: 'string' },
                        key: { type: 'string' }
                    },
                    required: ['projectId', 'key']
                }
            },
            {
                name: 'memory_search',
                description: 'Search memories by keyword, tags, or type',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectId: { type: 'string' },
                        query: { type: 'string', description: 'Search query' },
                        tags: { type: 'array', items: { type: 'string' } },
                        type: { type: 'string', enum: ['architecture', 'pattern', 'feature', 'api', 'bug', 'decision'] },
                        limit: { type: 'number', default: 10 }
                    },
                    required: ['projectId']
                }
            },
            {
                name: 'memory_list',
                description: 'List all memories of a specific type',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectId: { type: 'string' },
                        type: { type: 'string', enum: ['architecture', 'pattern', 'feature', 'api', 'bug', 'decision'] }
                    },
                    required: ['projectId']
                }
            },
            {
                name: 'memory_update',
                description: 'Update existing memory',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectId: { type: 'string' },
                        key: { type: 'string' },
                        content: { type: 'string' },
                        tags: { type: 'array', items: { type: 'string' } },
                        relationships: { type: 'object' }
                    },
                    required: ['projectId', 'key']
                }
            },
            {
                name: 'project_init',
                description: 'Initialize project storage',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectId: { type: 'string' }
                    },
                    required: ['projectId']
                }
            },
            {
                name: 'memory_stats',
                description: 'Get storage and cache statistics',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectId: { type: 'string' }
                    },
                    required: ['projectId']
                }
            }
        ];
    }
}
exports.MCPTools = MCPTools;
//# sourceMappingURL=tools.js.map