class TransactionQueue {
    constructor(options = {}) {
        this.queue = [];
        this.processing = false;
        this.concurrency = options.concurrency || 1;
        this.processingCount = 0;
        this.paused = false;
        this.maxRetries = options.maxRetries || 3;
        this.listeners = new Map();
        this.stats = {
            total: 0,
            processed: 0,
            failed: 0,
            pending: 0
        };
    }

    on(event, handler) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(handler);
    }

    emit(event, ...args) {
        const handlers = this.listeners.get(event) || [];
        handlers.forEach(h => h(...args));
    }

    enqueue(task, priority = 0) {
        const taskId = 'TX-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4);
        
        const queueItem = {
            id: taskId,
            task,
            priority,
            createdAt: Date.now(),
            attempts: 0,
            status: 'pending'
        };

        this.queue.push(queueItem);
        this.queue.sort((a, b) => b.priority - a.priority);
        
        this.stats.total++;
        this.stats.pending++;
        
        this.emit('enqueued', queueItem);
        
        this.process();
        
        return taskId;
    }

    async process() {
        if (this.processingCount >= this.concurrency) return;
        if (this.paused) return;
        if (this.queue.length === 0) {
            this.processing = false;
            return;
        }

        this.processing = true;
        
        while (this.processingCount < this.concurrency && this.queue.length > 0 && !this.paused) {
            const item = this.queue.shift();
            
            if (!item) continue;

            this.processingCount++;
            this.stats.pending--;
            item.status = 'processing';
            
            this.emit('processing', item);

            try {
                const result = await item.task(item.id);
                item.status = 'completed';
                item.result = result;
                
                this.stats.processed++;
                this.emit('completed', item);
            } catch (error) {
                item.attempts++;
                item.status = 'failed';
                item.error = error.message;
                
                if (item.attempts < this.maxRetries) {
                    item.status = 'pending';
                    this.stats.pending++;
                    this.queue.push(item);
                    this.emit('retry', item);
                } else {
                    this.stats.failed++;
                    this.emit('failed', item);
                }
            } finally {
                this.processingCount--;
            }
        }

        if (this.queue.length === 0 && this.processingCount === 0) {
            this.processing = false;
            this.emit('drained');
        } else {
            setTimeout(() => this.process(), 50);
        }
    }

    pause() {
        this.paused = true;
        this.emit('paused');
    }

    resume() {
        this.paused = false;
        this.emit('resumed');
        this.process();
    }

    cancel(taskId) {
        const index = this.queue.findIndex(item => item.id === taskId);
        
        if (index !== -1) {
            const item = this.queue.splice(index, 1)[0];
            this.stats.pending--;
            item.status = 'cancelled';
            this.emit('cancelled', item);
            return true;
        }
        
        return false;
    }

    getStatus(taskId) {
        const item = this.queue.find(i => i.id === taskId);
        
        if (item) {
            return {
                id: item.id,
                status: item.status,
                attempts: item.attempts,
                createdAt: item.createdAt
            };
        }
        
        return null;
    }

    getStats() {
        return { ...this.stats };
    }

    clear() {
        this.queue = [];
        this.stats = { total: 0, processed: 0, failed: 0, pending: 0 };
        this.emit('cleared');
    }
}

class TransactionManager {
    constructor(options = {}) {
        this.queue = new TransactionQueue(options);
        this.itemLockManager = options.itemLockManager;
        this.onTransactionCompleted = null;
        
        this.queue.on('completed', (item) => {
            if (this.onTransactionCompleted) {
                this.onTransactionCompleted(item);
            }
        });
        
        this.queue.on('failed', (item) => {
            console.error(`交易失败: ${item.id} - ${item.error}`);
        });
    }

    submitBuyOrder(params) {
        const { itemId, buyerUuid, quantity, price, itemType, nbtHash } = params;
        
        return this.queue.enqueue(async (txId) => {
            if (!this.itemLockManager) {
                throw new Error('缺少锁管理器');
            }

            const lockAcquired = await this.itemLockManager.acquireItemLock(
                itemId, buyerUuid, 'BUY', 10000
            );

            if (!lockAcquired) {
                throw new Error('物品已被他人锁定，请稍后重试');
            }

            try {
                const result = {
                    txId,
                    type: 'BUY',
                    itemId,
                    buyerUuid,
                    quantity,
                    price,
                    total: price * quantity,
                    timestamp: new Date().toISOString()
                };

                return result;
            } finally {
                this.itemLockManager.releaseItemLock(itemId);
            }
        }, 10);
    }

    submitListOrder(params) {
        const { itemId, sellerUuid, price, quantity } = params;
        
        return this.queue.enqueue(async (txId) => {
            const result = {
                txId,
                type: 'LIST',
                itemId,
                sellerUuid,
                price,
                quantity,
                timestamp: new Date().toISOString()
            };
            
            return result;
        }, 5);
    }

    submitDelistOrder(params) {
        const { itemId, sellerUuid } = params;
        
        return this.queue.enqueue(async (txId) => {
            if (!this.itemLockManager) {
                throw new Error('缺少锁管理器');
            }

            const lockInfo = this.itemLockManager.getLockInfo(itemId);
            
            if (lockInfo.locked && lockInfo.operationType === 'BUY') {
                throw new Error('物品正在交易中，无法下架');
            }

            if (lockInfo.locked && lockInfo.operationType === 'DELIVERY') {
                throw new Error('物品正在物流中，无法下架');
            }

            const result = {
                txId,
                type: 'DELIST',
                itemId,
                sellerUuid,
                timestamp: new Date().toISOString()
            };
            
            return result;
        }, 8);
    }

    submitDeliveryTask(params) {
        const { itemId, playerUuid, targetLocation } = params;
        
        return this.queue.enqueue(async (txId) => {
            if (!this.itemLockManager) {
                throw new Error('缺少锁管理器');
            }

            const lockAcquired = await this.itemLockManager.acquireItemLock(
                itemId, playerUuid, 'DELIVERY', 60000
            );

            if (!lockAcquired) {
                throw new Error('物品正在处理中');
            }

            try {
                const result = {
                    txId,
                    type: 'DELIVERY',
                    itemId,
                    playerUuid,
                    targetLocation,
                    timestamp: new Date().toISOString()
                };
                
                return result;
            } finally {
                this.itemLockManager.releaseItemLock(itemId);
            }
        }, 15);
    }

    getTransactionStatus(txId) {
        return this.queue.getStatus(txId);
    }

    getStats() {
        return this.queue.getStats();
    }
}

module.exports = { TransactionQueue, TransactionManager };