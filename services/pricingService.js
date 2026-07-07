class PricingEngine {
    constructor() {
        this.transactionHistory = [];
        this.currentListings = [];
        this.systemGuidelinePrices = {};
        this.MAX_HISTORY_DAYS = 7;
        this.MAX_HISTORY_ITEMS = 1000;
    }

    setGuidelinePrices(prices) {
        this.systemGuidelinePrices = { ...prices };
    }

    addTransaction(transaction) {
        this.transactionHistory.push({
            ...transaction,
            timestamp: new Date().toISOString()
        });

        if (this.transactionHistory.length > this.MAX_HISTORY_ITEMS) {
            this.transactionHistory = this.transactionHistory.slice(-this.MAX_HISTORY_ITEMS);
        }
    }

    updateListings(listings) {
        this.currentListings = listings;
    }

    calculateHistoricalAverage(itemType, nbtHash) {
        const cutoffTime = new Date();
        cutoffTime.setDate(cutoffTime.getDate() - this.MAX_HISTORY_DAYS);

        const relevantTransactions = this.transactionHistory.filter(t => {
            if (t.timestamp < cutoffTime.toISOString()) return false;
            if (t.itemType !== itemType) return false;
            if (nbtHash && t.nbtHash !== nbtHash) return false;
            return true;
        });

        if (relevantTransactions.length === 0) return null;

        const total = relevantTransactions.reduce((sum, t) => sum + t.price, 0);
        return total / relevantTransactions.length;
    }

    calculateSupplyFactor(itemType, nbtHash) {
        const supply = this.currentListings.filter(l => {
            if (l.itemType !== itemType) return false;
            if (nbtHash && l.nbtHash !== nbtHash) return false;
            return true;
        }).reduce((sum, l) => sum + l.quantity, 0);

        if (supply === 0) return 1.0;

        const thresholds = [
            { max: 16, factor: 1.3 },
            { max: 64, factor: 1.1 },
            { max: 128, factor: 1.0 },
            { max: 256, factor: 0.9 },
            { max: 512, factor: 0.8 },
            { max: 1024, factor: 0.7 }
        ];

        for (const t of thresholds) {
            if (supply <= t.max) return t.factor;
        }
        return 0.6;
    }

    getRecommendedPrice(itemType, nbtHash, quantity = 1) {
        const guidelinePrice = this.systemGuidelinePrices[itemType] || null;
        const historicalAvg = this.calculateHistoricalAverage(itemType, nbtHash);
        const supplyFactor = this.calculateSupplyFactor(itemType, nbtHash);

        let basePrice = guidelinePrice || historicalAvg || 10;

        if (historicalAvg && guidelinePrice) {
            basePrice = (historicalAvg * 0.6) + (guidelinePrice * 0.4);
        } else if (historicalAvg) {
            basePrice = historicalAvg;
        } else if (guidelinePrice) {
            basePrice = guidelinePrice;
        }

        let finalPrice = Math.round(basePrice * supplyFactor);

        if (quantity >= 64) finalPrice = Math.round(finalPrice * 0.9);
        if (quantity >= 128) finalPrice = Math.round(finalPrice * 0.95);
        if (quantity >= 256) finalPrice = Math.round(finalPrice * 0.9);

        return Math.max(finalPrice, 1);
    }

    getPriceRange(itemType, nbtHash) {
        const recommended = this.getRecommendedPrice(itemType, nbtHash);
        return {
            min: Math.round(recommended * 0.7),
            recommended: recommended,
            max: Math.round(recommended * 1.5)
        };
    }
}

module.exports = PricingEngine;