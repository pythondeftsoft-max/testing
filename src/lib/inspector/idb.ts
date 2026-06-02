import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface CachedInspection {
  id: string;
  agency_id: string;
  scheduled_date: string | null;
  inspection_type: string;
  status: string;
  property_address?: string | null;
  tenant_name?: string | null;
  unit_id?: string | null;
  cached_at: number;
}

export interface PendingPhoto {
  id: string; // client uuid
  inspection_id: string;
  deficiency_client_id: string;
  blob: Blob;
  filename: string;
  mime_type: string;
  created_at: number;
  uploaded: boolean;
  storage_path?: string;
}

export interface QueuedSync {
  client_uuid: string;
  inspection_id: string;
  agency_id: string;
  payload: any; // full inspection result + deficiencies
  device_captured_at: string;
  status: 'pending' | 'syncing' | 'failed';
  attempts: number;
  last_error?: string;
  created_at: number;
}

interface InspectorDB extends DBSchema {
  inspections_cache: {
    key: string;
    value: CachedInspection;
    indexes: { 'by-date': string };
  };
  photos_pending: {
    key: string;
    value: PendingPhoto;
    indexes: { 'by-inspection': string };
  };
  sync_queue: {
    key: string;
    value: QueuedSync;
    indexes: { 'by-status': string };
  };
}

let dbPromise: Promise<IDBPDatabase<InspectorDB>> | null = null;

export const getDb = () => {
  if (!dbPromise) {
    dbPromise = openDB<InspectorDB>('openkey-inspector', 1, {
      upgrade(db) {
        const ic = db.createObjectStore('inspections_cache', { keyPath: 'id' });
        ic.createIndex('by-date', 'scheduled_date');
        const pp = db.createObjectStore('photos_pending', { keyPath: 'id' });
        pp.createIndex('by-inspection', 'inspection_id');
        const sq = db.createObjectStore('sync_queue', { keyPath: 'client_uuid' });
        sq.createIndex('by-status', 'status');
      },
    });
  }
  return dbPromise;
};

export const cacheInspections = async (list: CachedInspection[]) => {
  const db = await getDb();
  const tx = db.transaction('inspections_cache', 'readwrite');
  await Promise.all(list.map(i => tx.store.put({ ...i, cached_at: Date.now() })));
  await tx.done;
};

export const getCachedInspections = async (): Promise<CachedInspection[]> => {
  const db = await getDb();
  return db.getAll('inspections_cache');
};

export const queueSync = async (item: Omit<QueuedSync, 'status' | 'attempts' | 'created_at'>) => {
  const db = await getDb();
  await db.put('sync_queue', {
    ...item,
    status: 'pending',
    attempts: 0,
    created_at: Date.now(),
  });
};

export const getQueuedSyncs = async (): Promise<QueuedSync[]> => {
  const db = await getDb();
  return db.getAll('sync_queue');
};

export const markSyncStatus = async (
  client_uuid: string,
  status: QueuedSync['status'],
  error?: string,
) => {
  const db = await getDb();
  const item = await db.get('sync_queue', client_uuid);
  if (!item) return;
  item.status = status;
  item.attempts += 1;
  if (error) item.last_error = error;
  await db.put('sync_queue', item);
};

export const removeQueued = async (client_uuid: string) => {
  const db = await getDb();
  await db.delete('sync_queue', client_uuid);
};

export const addPendingPhoto = async (photo: PendingPhoto) => {
  const db = await getDb();
  await db.put('photos_pending', photo);
};

export const getPendingPhotos = async (inspection_id?: string): Promise<PendingPhoto[]> => {
  const db = await getDb();
  if (inspection_id) {
    return db.getAllFromIndex('photos_pending', 'by-inspection', inspection_id);
  }
  return db.getAll('photos_pending');
};

export const markPhotoUploaded = async (id: string, storage_path: string) => {
  const db = await getDb();
  const p = await db.get('photos_pending', id);
  if (!p) return;
  p.uploaded = true;
  p.storage_path = storage_path;
  await db.put('photos_pending', p);
};

export const removePhoto = async (id: string) => {
  const db = await getDb();
  await db.delete('photos_pending', id);
};
