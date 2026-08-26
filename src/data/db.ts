import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { MovementRecord } from "../types";

interface DojangDB extends DBSchema {
  movements: {
    key: string;
    value: MovementRecord;
    indexes: {
      byCreatedAt: number;
      byCategory: string;
      byName: string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<DojangDB>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<DojangDB>("dojang", 1, {
      upgrade(database) {
        const store = database.createObjectStore("movements", { keyPath: "id" });
        store.createIndex("byCreatedAt", "createdAt");
        store.createIndex("byCategory", "category");
        store.createIndex("byName", "name");
      },
    });
  }
  return dbPromise;
}

export async function listMovements(): Promise<MovementRecord[]> {
  const all = await (await db()).getAll("movements");
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getMovement(id: string): Promise<MovementRecord | undefined> {
  return (await db()).get("movements", id);
}

export async function saveMovement(record: MovementRecord): Promise<void> {
  await (await db()).put("movements", record);
}

export async function deleteMovement(id: string): Promise<void> {
  await (await db()).delete("movements", id);
}

export async function clearLibrary(): Promise<void> {
  await (await db()).clear("movements");
}
