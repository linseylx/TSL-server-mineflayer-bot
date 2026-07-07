const OWNER_TYPES = {
    PRIVATE: 'PRIVATE',
    AUCTION: 'AUCTION',
    PUBLIC: 'PUBLIC'
};

const ITEM_STATUS = {
    STORED: 'STORED',
    LISTED: 'LISTED',
    LOCKED: 'LOCKED',
    SOLD: 'SOLD'
};

function createItemSchema(params) {
    const {
        id, ownerUuid, ownerType, status,
        itemSnapshot, quantity, price,
        createdAt, updatedAt, listingEndTime,
        buyerUuid, transactionId, metadata
    } = params;

    return {
        id: id || Date.now().toString(36) + Math.random().toString(36).substr(2),
        ownerUuid: ownerUuid || '',
        ownerType: ownerType || OWNER_TYPES.PUBLIC,
        status: status || ITEM_STATUS.STORED,
        itemSnapshot: itemSnapshot || {
            type: '',
            nbt: null,
            displayName: '',
            lore: [],
            enchantments: [],
            damage: 0
        },
        quantity: quantity || 1,
        price: price || 0,
        createdAt: createdAt || new Date().toISOString(),
        updatedAt: updatedAt || new Date().toISOString(),
        listingEndTime: listingEndTime || null,
        buyerUuid: buyerUuid || null,
        transactionId: transactionId || null,
        metadata: metadata || {}
    };
}

function createAuctionRecord(params) {
    const {
        id, itemId, sellerUuid, buyerUuid,
        price, quantity, status,
        createdAt, completedAt, metadata
    } = params;

    return {
        id: id || 'AUC-' + Date.now().toString(36).toUpperCase(),
        itemId: itemId || '',
        sellerUuid: sellerUuid || '',
        buyerUuid: buyerUuid || null,
        price: price || 0,
        quantity: quantity || 1,
        status: status || 'PENDING',
        createdAt: createdAt || new Date().toISOString(),
        completedAt: completedAt || null,
        metadata: metadata || {}
    };
}

module.exports = {
    OWNER_TYPES,
    ITEM_STATUS,
    createItemSchema,
    createAuctionRecord
};