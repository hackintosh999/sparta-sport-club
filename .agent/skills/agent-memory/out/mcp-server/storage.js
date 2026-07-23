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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageManager = void 0;
const keyv_1 = __importDefault(require("keyv"));
const keyv_file_1 = __importDefault(require("keyv-file"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
class StorageManager {
    constructor(baseDataPath = './.agentMemory') {
        this.stores = new Map();
        this.baseDataPath = baseDataPath;
    }
    get baseDir() {
        return this.baseDataPath;
    }
    /**
     * Get or create a Keyv store for a specific project
     */
    async getStore(projectId) {
        if (!this.stores.has(projectId)) {
            // Use baseDataPath directly without nested projectId folder
            const projectPath = this.baseDataPath;
            // Ensure directory exists
            await fs.mkdir(projectPath, { recursive: true });
            // Create Keyv instance with file-based storage
            const store = new keyv_1.default({
                store: new keyv_file_1.default({
                    filename: path.join(projectPath, 'data.json'),
                    encode: (data) => JSON.stringify(data, null, 2)
                }),
                namespace: projectId
            });
            this.stores.set(projectId, store);
        }
        return this.stores.get(projectId);
    }
    /**
     * Initialize project storage
     */
    async initProject(projectId) {
        await this.getStore(projectId);
        console.error(`Storage initialized for project: ${projectId}`);
    }
    /**
     * Write a memory to storage
     */
    async write(projectId, memory) {
        const store = await this.getStore(projectId);
        // Update the index
        const indexKey = `_index_${projectId}`;
        const keysData = await store.get(indexKey);
        const keys = keysData || [];
        if (!keys.includes(memory.key)) {
            keys.push(memory.key);
            await store.set(indexKey, keys);
        }
        // Write the memory
        await store.set(memory.key, memory);
    }
    /**
     * Read a memory by key
     */
    async read(projectId, key) {
        const store = await this.getStore(projectId);
        const memory = await store.get(key);
        if (memory) {
            // Increment access count
            memory.metadata.accessCount = (memory.metadata.accessCount || 0) + 1;
            memory.updatedAt = Date.now();
            await store.set(key, memory);
        }
        return memory || null;
    }
    /**
     * Search memories by query, tags, or type
     */
    async search(projectId, query, tags, type) {
        const store = await this.getStore(projectId);
        const results = [];
        // Get all keys for this project from the index
        const indexKey = `_index_${projectId}`;
        const keysData = await store.get(indexKey);
        const keys = keysData || [];
        // Iterate through all keys
        for (const key of keys) {
            const memory = await store.get(key);
            if (!memory)
                continue;
            // Filter by type
            if (type && memory.type !== type) {
                continue;
            }
            // Filter by tags
            if (tags && tags.length > 0) {
                const hasMatchingTag = tags.some(tag => memory.tags.includes(tag));
                if (!hasMatchingTag) {
                    continue;
                }
            }
            // Filter by query (simple text search)
            if (query) {
                const searchText = `${memory.key} ${memory.content} ${memory.tags.join(' ')}`.toLowerCase();
                if (!searchText.includes(query.toLowerCase())) {
                    continue;
                }
            }
            results.push(memory);
        }
        return results;
    }
    /**
     * List all memories of a specific type
     */
    async list(projectId, type) {
        return this.search(projectId, undefined, undefined, type);
    }
    /**
     * Update an existing memory
     */
    async update(projectId, key, updates) {
        const store = await this.getStore(projectId);
        const existing = await store.get(key);
        if (!existing) {
            return null;
        }
        const updated = {
            ...existing,
            ...updates,
            updatedAt: Date.now()
        };
        await store.set(key, updated);
        return updated;
    }
    /**
     * Get storage statistics
     */
    async getStats(projectId) {
        const store = await this.getStore(projectId);
        const memories = await this.list(projectId);
        const byType = {};
        for (const memory of memories) {
            byType[memory.type] = (byType[memory.type] || 0) + 1;
        }
        return {
            totalMemories: memories.length,
            byType,
            totalSize: JSON.stringify(memories).length
        };
    }
}
exports.StorageManager = StorageManager;
//# sourceMappingURL=storage.js.map