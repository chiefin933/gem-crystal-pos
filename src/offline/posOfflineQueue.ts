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

export const queueOfflineCashSale = (sale: OfflineCashSale) =>
  withStore(CASH_SALES_STORE, 'readwrite', store => store.put(sale));

export const listOfflineCashSales = async (): Promise<OfflineCashSale[]> => {
  const sales = await withStore(CASH_SALES_STORE, 'readonly', store => store.getAll()) as OfflineCashSale[];
  return sales.sort((left, right) => left.queuedAt.localeCompare(right.queuedAt));
};

export const removeOfflineCashSale = (receiptNumber: string) =>
  withStore(CASH_SALES_STORE, 'readwrite', store => store.delete(receiptNumber));

export const markOfflineCashSaleForReview = (sale: OfflineCashSale, lastError: string) =>
  queueOfflineCashSale({ ...sale, status: 'NEEDS_REVIEW', lastError });

export const saveCachedCatalog = (products: unknown[]) =>
  withStore(CATALOG_STORE, 'readwrite', store => store.put(products, CATALOG_KEY));

export const readCachedCatalog = async (): Promise<unknown[] | null> => {
  const products = await withStore(CATALOG_STORE, 'readonly', store => store.get(CATALOG_KEY));
  return Array.isArray(products) ? products : null;
};
