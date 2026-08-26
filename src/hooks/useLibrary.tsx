import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { deleteMovement, getMovement, listMovements, saveMovement } from "../data/db";
import type { MovementRecord } from "../types";

interface LibraryContextValue {
  movements: MovementRecord[];
  loading: boolean;
  refresh: () => Promise<void>;
  upsert: (record: MovementRecord) => Promise<void>;
  upsertMany: (records: MovementRecord[]) => Promise<void>;
  remove: (id: string) => Promise<void>;
  byId: (id: string) => Promise<MovementRecord | undefined>;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const rows = await listMovements();
    setMovements(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const upsert = useCallback(async (record: MovementRecord) => {
    await saveMovement(record);
    await refresh();
  }, [refresh]);

  const upsertMany = useCallback(async (records: MovementRecord[]) => {
    for (const record of records) await saveMovement(record);
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await deleteMovement(id);
    await refresh();
  }, [refresh]);

  const byId = useCallback(async (id: string) => getMovement(id), []);

  const value = useMemo(
    () => ({ movements, loading, refresh, upsert, upsertMany, remove, byId }),
    [movements, loading, refresh, upsert, upsertMany, remove, byId],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within LibraryProvider");
  return ctx;
}
