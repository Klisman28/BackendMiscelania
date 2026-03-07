/**
 * Centralized stock-level calculation.
 * Single source of truth used by services, routes and (via API) frontend.
 *
 * States:
 *   'out_of_stock' — stock <= 0
 *   'low_stock'    — 0 < stock <= stockMin
 *   'normal'       — stock > stockMin  OR  stockMin not set
 */

const STOCK_LEVELS = {
    OUT_OF_STOCK: 'out_of_stock',
    LOW_STOCK: 'low_stock',
    NORMAL: 'normal',
};

/**
 * Compute the stock-level state for a product.
 *
 * @param {number|null} stock      — current stock (products.stock)
 * @param {number|null} stockMin   — reorder point  (products.stock_min)
 * @returns {{ level: string, label: string, severity: string }}
 */
function getStockLevel(stock, stockMin) {
    const qty = stock ?? 0;
    const min = stockMin ?? 0;

    if (qty <= 0) {
        return {
            level: STOCK_LEVELS.OUT_OF_STOCK,
            label: 'Agotado',
            severity: 'danger',
        };
    }

    if (min > 0 && qty <= min) {
        return {
            level: STOCK_LEVELS.LOW_STOCK,
            label: 'Stock Bajo',
            severity: 'warning',
        };
    }

    return {
        level: STOCK_LEVELS.NORMAL,
        label: 'Normal',
        severity: 'success',
    };
}

module.exports = { STOCK_LEVELS, getStockLevel };
