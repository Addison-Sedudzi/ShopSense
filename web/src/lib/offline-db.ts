import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { QueuedSale } from '@/features/sale-terminal/offline-sale-types';

interface ShopSenseOfflineDB extends DBSchema {
  queuedSales: {
    key: string;
    value: QueuedSale;
    indexes: { 'by-status': string };
  };
}

const DB_NAME = 'shopsense-offline';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ShopSenseOfflineDB>> | null = null;

function getDb(): Promise<IDBPDatabase<ShopSenseOfflineDB>> {
  dbPromise ??= openDB<ShopSenseOfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore('queuedSales', { keyPath: 'id' });
      store.createIndex('by-status', 'sync.status');
    },
  });
  return dbPromise;
}

export async function putQueuedSale(sale: QueuedSale): Promise<void> {
  const db = await getDb();
  await db.put('queuedSales', sale);
}

export async function getAllQueuedSales(): Promise<QueuedSale[]> {
  const db = await getDb();
  const all = await db.getAll('queuedSales');
  // Newest first -- what the owner most likely wants to see at the top.
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getQueuedSalesByStatus(status: QueuedSale['sync']['status']): Promise<QueuedSale[]> {
  const db = await getDb();
  return db.getAllFromIndex('queuedSales', 'by-status', status);
}
