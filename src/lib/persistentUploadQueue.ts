type QueueStatus = "pending" | "failed";

type QueueRecord = {
  key: string;
  queueKey: string;
  itemId: string;
  order: number;
  status: QueueStatus;
  fileName: string;
  fileType: string;
  fileLastModified: number;
  fileBlob: Blob;
  meta: Record<string, unknown> | null;
  savedAt: string;
};

export type UploadQueueSnapshotItem<Meta extends Record<string, unknown>> = {
  id: string;
  status: QueueStatus;
  file: File;
  meta: Meta;
};

const DB_NAME = "libro-vivo-upload-queues";
const DB_VERSION = 1;
const STORE_NAME = "queue_items";
const INDEX_BY_QUEUE = "by_queue";

function hasIndexedDb() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IDB request failed."));
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IDB transaction failed."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IDB transaction aborted."));
  });
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!hasIndexedDb()) {
      reject(new Error("IndexedDB no disponible."));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "key" });
        store.createIndex(INDEX_BY_QUEUE, "queueKey", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("No se pudo abrir IndexedDB."));
  });
}

function buildRecordKey(queueKey: string, order: number, status: QueueStatus, itemId: string) {
  const paddedOrder = String(order).padStart(6, "0");
  return `${queueKey}::${status}::${paddedOrder}::${itemId}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

async function deleteQueueRecords(
  store: IDBObjectStore,
  queueKey: string,
) {
  const index = store.index(INDEX_BY_QUEUE);
  await new Promise<void>((resolve, reject) => {
    const cursorRequest = index.openCursor(IDBKeyRange.only(queueKey));
    cursorRequest.onerror = () =>
      reject(cursorRequest.error ?? new Error("No se pudo limpiar cola persistida."));
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) {
        resolve();
        return;
      }
      cursor.delete();
      cursor.continue();
    };
  });
}

export function newUploadQueueItemId(prefix = "uq") {
  const stamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${stamp}_${random}`;
}

export async function saveUploadQueueSnapshot<Meta extends Record<string, unknown>>(
  queueKey: string,
  items: UploadQueueSnapshotItem<Meta>[],
) {
  if (!hasIndexedDb()) return;

  const db = await openDatabase();
  try {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    await deleteQueueRecords(store, queueKey);

    const savedAt = new Date().toISOString();
    items.forEach((item, order) => {
      const record: QueueRecord = {
        key: buildRecordKey(queueKey, order, item.status, item.id),
        queueKey,
        itemId: item.id,
        order,
        status: item.status,
        fileName: item.file.name,
        fileType: item.file.type || "application/octet-stream",
        fileLastModified: item.file.lastModified || Date.now(),
        fileBlob: item.file,
        meta: asRecord(item.meta) ?? {},
        savedAt,
      };
      store.put(record);
    });

    await transactionDone(transaction);
  } finally {
    db.close();
  }
}

export async function loadUploadQueueSnapshot<Meta extends Record<string, unknown>>(
  queueKey: string,
) {
  if (!hasIndexedDb()) return [] as UploadQueueSnapshotItem<Meta>[];

  const db = await openDatabase();
  try {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index(INDEX_BY_QUEUE);
    const records =
      (await requestToPromise(index.getAll(IDBKeyRange.only(queueKey)))) as QueueRecord[];

    const restored = records
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((record) => {
        const file = new File([record.fileBlob], record.fileName, {
          type: record.fileType || "application/octet-stream",
          lastModified: record.fileLastModified || Date.now(),
        });
        return {
          id: record.itemId,
          status: record.status,
          file,
          meta: (asRecord(record.meta) ?? {}) as Meta,
        } satisfies UploadQueueSnapshotItem<Meta>;
      });

    await transactionDone(transaction);
    return restored;
  } finally {
    db.close();
  }
}

