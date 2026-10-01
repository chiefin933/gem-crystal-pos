import { describe, expect, it } from 'vitest';
import { createOfflineReceiptNumber, isCachedCatalog, isOfflineCashSale } from './posOfflineQueue';

const validSale = () => ({
  receiptNumber: 'GCPOS0123456789ABCDEF',
  customerName: 'Walk-in Customer',
  customerPhone: null,
  items: [{ variantId: 'variant-1', quantity: 2 }],
  discountPercent: 5,
  cashReceived: 2000,
  expectedTotal: 1500,
  queuedAt: '2026-10-01T10:00:00.000Z',
  status: 'QUEUED' as const,
});

describe('POS offline trust boundary', () => {
  it('creates unpredictable receipt identifiers in the accepted format', () => {
    expect(createOfflineReceiptNumber()).toMatch(/^GCPOS[A-F0-9]{16}$/);
  });

  it('accepts a bounded non-PII cash sale and rejects tampered records', () => {
    expect(isOfflineCashSale(validSale())).toBe(true);
    expect(isOfflineCashSale({ ...validSale(), customerPhone: '0712345678' })).toBe(false);
    expect(isOfflineCashSale({ ...validSale(), expectedTotal: Number.NaN })).toBe(false);
    expect(isOfflineCashSale({ ...validSale(), items: [{ variantId: 'v', quantity: -1 }] })).toBe(false);
    expect(isOfflineCashSale({ ...validSale(), status: 'COMPLETED' })).toBe(false);
  });

  it('accepts a bounded catalogue and rejects malformed cached products', () => {
    const product = {
      id: 'product-1',
      title: 'Dress',
      images: ['https://cdn.example.com/dress.webp'],
      variants: [{
        id: 'variant-1',
        sku: 'DRESS-1',
        size: 'M',
        color: 'Black',
        price: 2500,
        stockQuantity: 3,
      }],
    };
    expect(isCachedCatalog([product])).toBe(true);
    expect(isCachedCatalog([{ ...product, variants: [{ ...product.variants[0], stockQuantity: -1 }] }])).toBe(false);
    expect(isCachedCatalog([{ ...product, images: 'not-an-array' }])).toBe(false);
  });
});
