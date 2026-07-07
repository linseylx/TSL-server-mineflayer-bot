const { OWNER_TYPES, ITEM_STATUS, createItemSchema, createAuctionRecord } = require('../models/types');
const { ItemLockManager } = require('./lockManager');
const { TransactionManager } = require('./transactionQueue');
const PricingEngine = require('./pricingService');

class AuctionModule {
    constructor(options = {}) {
        this.items = options.items || [];
        this.auctionRecords = options.auctionRecords || [];
        this.itemLockManager = new ItemLockManager();
        this.transactionManager = new TransactionManager({
            itemLockManager: this.itemLockManager,
            concurrency: 1,
            maxRetries: 3
        });
        this.pricingEngine = new PricingEngine();
        this.broadcastEvent = options.broadcastEvent || (() => {});
        this.saveData = options.saveData || (() => {});
        
        this.transactionManager.onTransactionCompleted = (item) => {
            this.handleTransactionResult(item);
        };
    }

    setGuidelinePrices(prices) {
        this.pricingEngine.setGuidelinePrices(prices);
    }

    async listItem(params) {
        const { itemId, sellerUuid, price, quantity, itemSnapshot } = params;

        const item = this.items.find(i => i.id === itemId);
        
        if (!item) {
            return { success: false, error: '物品不存在' };
        }

        if (item.ownerUuid !== sellerUuid) {
            return { success: false, error: '无权操作此物品' };
        }

        if (item.ownerType !== OWNER_TYPES.PRIVATE) {
            return { success: false, error: '只有私有仓物品可以上架拍卖' };
        }

        if (item.status !== ITEM_STATUS.STORED) {
            return { success: false, error: `物品当前状态: ${item.status}，无法上架` };
        }

        if (item.quantity < quantity) {
            return { success: false, error: '上架数量超过库存' };
        }

        const lockAcquired = await this.itemLockManager.acquireItemLock(
            itemId, sellerUuid, 'LIST', 5000
        );

        if (!lockAcquired) {
            return { success: false, error: '物品正在被其他操作锁定' };
        }

        try {
            if (quantity === item.quantity) {
                item.status = ITEM_STATUS.LISTED;
                item.price = price;
                item.listingEndTime = null;
            } else {
                const newItem = createItemSchema({
                    ownerUuid: sellerUuid,
                    ownerType: OWNER_TYPES.AUCTION,
                    status: ITEM_STATUS.LISTED,
                    itemSnapshot: itemSnapshot || item.itemSnapshot,
                    quantity,
                    price
                });
                this.items.push(newItem);
                item.quantity -= quantity;
            }

            const record = createAuctionRecord({
                itemId: quantity === item.quantity ? itemId : this.items[this.items.length - 1].id,
                sellerUuid,
                price,
                quantity,
                status: 'LISTED'
            });
            this.auctionRecords.push(record);

            this.pricingEngine.addTransaction({
                itemType: item.itemSnapshot.type,
                nbtHash: this._hashNBT(item.itemSnapshot.nbt),
                price,
                quantity,
                type: 'LIST'
            });

            this.broadcastEvent('ITEM_LISTED', {
                itemId: record.itemId,
                sellerUuid,
                price,
                quantity
            });

            this.saveData();
            
            return { success: true, item, record };
        } finally {
            this.itemLockManager.releaseItemLock(itemId);
        }
    }

    async delistItem(params) {
        const { itemId, sellerUuid } = params;

        const item = this.items.find(i => i.id === itemId);
        
        if (!item) {
            return { success: false, error: '物品不存在' };
        }

        if (item.ownerUuid !== sellerUuid) {
            return { success: false, error: '无权操作此物品' };
        }

        if (item.status !== ITEM_STATUS.LISTED) {
            return { success: false, error: `物品当前状态: ${item.status}，无法下架` };
        }

        const lockInfo = this.itemLockManager.getLockInfo(itemId);
        
        if (lockInfo.locked) {
            if (lockInfo.operationType === 'BUY') {
                return { success: false, error: '物品正在交易中，无法下架' };
            }
            if (lockInfo.operationType === 'DELIVERY') {
                return { success: false, error: '物品正在物流中，无法下架' };
            }
            return { success: false, error: '物品正在被其他操作锁定' };
        }

        const lockAcquired = await this.itemLockManager.acquireItemLock(
            itemId, sellerUuid, 'DELIST', 5000
        );

        if (!lockAcquired) {
            return { success: false, error: '物品正在被其他操作锁定' };
        }

        try {
            item.status = ITEM_STATUS.STORED;
            item.price = 0;
            item.listingEndTime = null;
            item.buyerUuid = null;
            item.transactionId = null;

            const record = this.auctionRecords.find(r => r.itemId === itemId && r.status === 'LISTED');
            if (record) {
                record.status = 'DELISTED';
                record.completedAt = new Date().toISOString();
            }

            this.broadcastEvent('ITEM_DELISTED', { itemId, sellerUuid });

            this.saveData();
            
            return { success: true, item };
        } finally {
            this.itemLockManager.releaseItemLock(itemId);
        }
    }

    async buyItem(params) {
        const { itemId, buyerUuid, price, quantity } = params;

        const item = this.items.find(i => i.id === itemId);
        
        if (!item) {
            return { success: false, error: '物品不存在' };
        }

        if (item.status !== ITEM_STATUS.LISTED) {
            return { success: false, error: `物品当前状态: ${item.status}，无法购买` };
        }

        if (item.quantity < quantity) {
            return { success: false, error: '购买数量超过库存' };
        }

        if (price < item.price) {
            return { success: false, error: '出价低于上架价格' };
        }

        const txId = this.transactionManager.submitBuyOrder({
            itemId,
            buyerUuid,
            quantity,
            price,
            itemType: item.itemSnapshot.type,
            nbtHash: this._hashNBT(item.itemSnapshot.nbt)
        });

        return { success: true, txId, message: '交易请求已提交' };
    }

    handleTransactionResult(queueItem) {
        const { txId, type, itemId, buyerUuid, sellerUuid, price, quantity } = queueItem.result;

        if (type === 'BUY') {
            const item = this.items.find(i => i.id === itemId);
            
            if (item) {
                item.status = ITEM_STATUS.LOCKED;
                item.buyerUuid = buyerUuid;
                item.transactionId = txId;

                const record = this.auctionRecords.find(r => r.itemId === itemId && r.status === 'LISTED');
                if (record) {
                    record.status = 'SOLD';
                    record.buyerUuid = buyerUuid;
                    record.completedAt = new Date().toISOString();
                }

                this.pricingEngine.addTransaction({
                    itemType: item.itemSnapshot.type,
                    nbtHash: this._hashNBT(item.itemSnapshot.nbt),
                    price,
                    quantity,
                    type: 'BUY'
                });

                this.broadcastEvent('ITEM_SOLD', {
                    itemId,
                    buyerUuid,
                    sellerUuid: item.ownerUuid,
                    price,
                    quantity,
                    txId
                });

                this.saveData();
            }
        }
    }

    getListedItems() {
        return this.items.filter(i => i.status === ITEM_STATUS.LISTED);
    }

    getItemStatus(itemId) {
        const item = this.items.find(i => i.id === itemId);
        
        if (!item) {
            return { exists: false };
        }

        const lockInfo = this.itemLockManager.getLockInfo(itemId);
        
        return {
            exists: true,
            status: item.status,
            ownerUuid: item.ownerUuid,
            ownerType: item.ownerType,
            quantity: item.quantity,
            price: item.price,
            locked: lockInfo.locked,
            lockOperation: lockInfo.operationType
        };
    }

    getRecommendedPrice(itemType, nbt) {
        const nbtHash = this._hashNBT(nbt);
        return this.pricingEngine.getRecommendedPrice(itemType, nbtHash);
    }

    getPriceRange(itemType, nbt) {
        const nbtHash = this._hashNBT(nbt);
        return this.pricingEngine.getPriceRange(itemType, nbtHash);
    }

    _hashNBT(nbt) {
        if (!nbt) return null;
        try {
            return require('crypto').createHash('md5')
                .update(JSON.stringify(nbt))
                .digest('hex');
        } catch {
            return null;
        }
    }
}

module.exports = AuctionModule;