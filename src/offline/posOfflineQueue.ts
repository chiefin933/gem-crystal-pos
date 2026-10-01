export type OfflineCashSaleStatus = 'QUEUED' | 'NEEDS_REVIEW';

export interface OfflineCashSale {
  receiptNumber: string;
  customerName: string;
  customerPhone: string | null;
  items: Array<{ variantId: string; quantity: number }>;
  discountPercent: number;
  cashReceived: number;
  expectedTotal: number;
  queuedAt: string;
  status: OfflineCashSaleStatus;
  lastError?: string;
}

const DATABASE_NAME = 'gem-crystal-pos-offline';
const DATABASE_VERSION = 1;
const CASH_SALES_STORE = 'cash-sales';
const CATALOG_STORE = 'catalog';
const CATALOG_KEY = 'latest';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const isOfflineCashSale = (value: unknown): value is OfflineCashSale => {
  if (!isRecord(value)) return false;
  const items = value.items;
  return typeof value.receiptNumber === 'string'
    && /^GCPOS[A-F0-9]{16}$/.test(value.receiptNumber)
    && value.customerName === 'Walk-in Customer'
    && value.customerPhone === null
    && Array.isArray(items)
    && items.length > 0
    && items.length <= 100
    && items.every(item => isRecord(item)
      && typeof item.variantId === 'string'
      && item.variantId.length > 0
      && item.variantId.length <= 128
      && Number.isInteger(item.quantity)
      && Number(item.quantity) > 0
      && Number(item.quantity) <= 1000)
    && isFiniteNumber(value.discountPercent)
    && value.discountPercent >= 0
    && value.discountPercent <= 100
    && isFiniteNumber(value.cashReceived)
    && value.cashReceived >= 0
    && value.cashReceived <= 10_000_000
    && isFiniteNumber(value.expectedTotal)
    && value.expectedTotal >= 0
    && value.expectedTotal <= 10_000_000
    && typeof value.queuedAt === 'string'
    && Number.isFinite(Date.parse(value.queuedAt))
    && (value.status === 'QUEUED' || value.status === 'NEEDS_REVIEW')
    && (value.lastError === undefined || (typeof value.lastError === 'string' && value.lastError.length <= 500));
};

const isCatalogProduct = (value: unknown): boolean => {
  if (!isRecord(value) || !Array.isArray(value.images) || !Array.isArray(value.variants)) return false;
  return typeof value.id === 'string'
    && value.id.length > 0
    && typeof value.title === 'string'
    && value.title.length > 0
    && value.title.length <= 160
    && value.images.length <= 12
    && value.images.every(image => typeof image === 'string' && image.length <= 2048)
    && value.variants.length <= 900
    && value.variants.every(variant => isRecord(variant)
      && typeof variant.id === 'string'
      && variant.id.length > 0
      && typeof variant.sku === 'string'
      && typeof variant.size === 'string'
      && typeof variant.color === 'string'
      && isFiniteNumber(variant.price)
      && variant.price >= 0
      && Number.isInteger(variant.stockQuantity)
      && Number(variant.stockQuantity) >= 0);
};

export const isCachedCatalog = (value: unknown): value is unknown[] =>
  Array.isArray(value) && value.length <= 10_000 && value.every(isCatalogProduct);

const requestResult = <T>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('Local POS storage failed'));
});

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(CASH_SALES_STORE)) {
      database.createObjectStore(CASH_SALES_STORE, { keyPath: 'receiptNumber' });
    }
    if (!database.objectStoreNames.contains(CATALOG_STORE)) {
      database.createObjectStore(CATALOG_STORE);
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('Unable to open local POS storage'));
});

const withStore = async <T>(storeName: string, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) => {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(storeName, mode);
    const result = await requestResult(operation(transaction.objectStore(storeName)));
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Local POS storage failed'));
      transaction.onabort = () => reject(transaction.error || new Error('Local POS storage was cancelled'));
    });
    return result;
  } finally {
    database.close();
  }
};

export const createOfflineReceiptNumber = () => {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `GCPOS${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
};

export const queueOfflineCashSale = (sale: OfflineCashSale) => {
  if (!isOfflineCashSale(sale)) {
    return Promise.reject(new Error('Offline cash sale failed local validation'));
  }
  return withStore(CASH_SALES_STORE, 'readwrite', store => store.put(sale));
};

export const listOfflineCashSales = async (): Promise<OfflineCashSale[]> => {
  const stored = await withStore(CASH_SALES_STORE, 'readonly', store => store.getAll()) as unknown[];
  return stored.filter(isOfflineCashSale).sort((left, right) => left.queuedAt.localeCompare(right.queuedAt));
};

export const removeOfflineCashSale = (receiptNumber: string) =>
  withStore(CASH_SALES_STORE, 'readwrite', store => store.delete(receiptNumber));

export const markOfflineCashSaleForReview = (sale: OfflineCashSale, lastError: string) =>
  queueOfflineCashSale({ ...sale, status: 'NEEDS_REVIEW', lastError: lastError.slice(0, 500) });

export const saveCachedCatalog = (products: unknown[]) => {
  if (!isCachedCatalog(products)) {
    return Promise.reject(new Error('Catalogue failed local validation'));
  }
  return withStore(CATALOG_STORE, 'readwrite', store => store.put(products, CATALOG_KEY));
};

export const readCachedCatalog = async (): Promise<unknown[] | null> => {
  const products: unknown = await withStore(CATALOG_STORE, 'readonly', store => store.get(CATALOG_KEY));
  return isCachedCatalog(products) ? products : null;
};
