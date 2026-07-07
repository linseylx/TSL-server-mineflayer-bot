class Mutex {
    constructor() {
        this.locks = new Map();
        this.queues = new Map();
    }

    async acquire(key, timeout = 5000) {
        const startTime = Date.now();

        while (true) {
            if (!this.locks.has(key)) {
                this.locks.set(key, true);
                return true;
            }

            if (Date.now() - startTime >= timeout) {
                return false;
            }

            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    release(key) {
        this.locks.delete(key);

        if (this.queues.has(key)) {
            const queue = this.queues.get(key);
            if (queue.length > 0) {
                const nextResolver = queue.shift();
                nextResolver();
            }
        }
    }

    async lock(key, fn, timeout = 5000) {
        const acquired = await this.acquire(key, timeout);
        
        if (!acquired) {
            throw new Error(`获取锁失败: ${key}，超时 ${timeout}ms`);
        }

        try {
            return await fn();
        } finally {
            this.release(key);
        }
    }

    isLocked(key) {
        return this.locks.has(key);
    }

    getLockedKeys() {
        return Array.from(this.locks.keys());
    }

    clear() {
        this.locks.clear();
        this.queues.clear();
    }
}

class ItemLockManager {
    constructor() {
        this.mutex = new Mutex();
        this.lockMetadata = new Map();
    }

    async acquireItemLock(itemId, playerId, operationType, timeout = 10000) {
        const key = `item:${itemId}`;
        
        const acquired = await this.mutex.acquire(key, timeout);
        
        if (acquired) {
            this.lockMetadata.set(key, {
                playerId,
                operationType,
                acquiredAt: Date.now(),
                timeout
            });
        }
        
        return acquired;
    }

    releaseItemLock(itemId) {
        const key = `item:${itemId}`;
        this.mutex.release(key);
        this.lockMetadata.delete(key);
    }

    getLockInfo(itemId) {
        const key = `item:${itemId}`;
        const metadata = this.lockMetadata.get(key);
        
        if (!metadata) {
            return { locked: false };
        }
        
        return {
            locked: true,
            ...metadata,
            lockedFor: Date.now() - metadata.acquiredAt
        };
    }

    async withItemLock(itemId, playerId, operationType, fn, timeout = 10000) {
        const key = `item:${itemId}`;
        
        const acquired = await this.mutex.acquire(key, timeout);
        
        if (!acquired) {
            const existingLock = this.lockMetadata.get(key);
            throw new Error(`物品 ${itemId} 已被锁定: ${JSON.stringify(existingLock)}`);
        }

        this.lockMetadata.set(key, {
            playerId,
            operationType,
            acquiredAt: Date.now(),
            timeout
        });

        try {
            return await fn();
        } finally {
            this.releaseItemLock(itemId);
        }
    }
}

module.exports = { Mutex, ItemLockManager };