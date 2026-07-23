"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
const lru_cache_1 = require("lru-cache");
class CacheManager {
    constructor(options = {}) {
        const maxSize = options.maxSize || 10000; // Default: 10K entries
        const ttl = options.ttl || 3600000; // Default: 1 hour in ms
        this.cache = new lru_cache_1.LRUCache({
            max: maxSize,
            ttl: ttl,
            updateAgeOnGet: true,
            updateAgeOnHas: true
        });
    }
    /**
     * Get a value from cache
     */
    get(key) {
        return this.cache.get(key);
    }
    /**
     * Set a value in cache
     */
    set(key, value) {
        this.cache.set(key, value);
    }
    /**
     * Check if key exists in cache
     */
    has(key) {
        return this.cache.has(key);
    }
    /**
     * Delete a key from cache
     */
    delete(key) {
        this.cache.delete(key);
    }
    /**
     * Clear entire cache
     */
    clear() {
        this.cache.clear();
    }
    /**
     * Get cache statistics
     */
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.cache.max,
            ttl: this.cache.ttl
        };
    }
}
exports.CacheManager = CacheManager;
//# sourceMappingURL=cache.js.map