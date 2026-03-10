// src/hooks/useKvStore.ts
'use client';

import { useCallback, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import type { KvStatus } from '@/context/AppContext';

const API_BASE = '/api';
const DEBOUNCE_MS = 800;

export function useKvStore() {
  const { setKvStatus, showToast } = useApp();
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const loadAll = useCallback(async (): Promise<Record<string, unknown> | null> => {
    setKvStatus('loading');
    try {
      const res = await fetch(`${API_BASE}/data`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      setKvStatus('saved');
      return json.data;
    } catch (err: unknown) {
      console.warn('[kvStore] loadAll error:', (err as Error).message);
      setKvStatus('error');
      return null;
    }
  }, [setKvStatus]);

  const save = useCallback(
    (key: string, data: unknown, options: { immediate?: boolean } = {}) => {
      setKvStatus('saving');
      if (timers.current[key]) clearTimeout(timers.current[key]);

      const doSave = async () => {
        try {
          const res = await fetch(`${API_BASE}/save/${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          const json = await res.json();
          if (!json.ok) throw new Error(json.message);
          setKvStatus('saved');
        } catch (err: unknown) {
          console.warn(`[kvStore] save(${key}) error:`, (err as Error).message);
          setKvStatus('error');
          showToast(`Errore salvataggio dati: ${(err as Error).message}`, 'error');
        } finally {
          delete timers.current[key];
        }
      };

      if (options.immediate) {
        doSave();
      } else {
        timers.current[key] = setTimeout(doSave, DEBOUNCE_MS);
      }
    },
    [setKvStatus, showToast],
  );

  const del = useCallback(
    async (key: string) => {
      setKvStatus('saving');
      try {
        const res = await fetch(`${API_BASE}/save/${key}`, { method: 'DELETE' });
        const json = await res.json();
        if (!json.ok) throw new Error(json.message);
        setKvStatus('saved');
      } catch (err: unknown) {
        console.warn(`[kvStore] del(${key}) error:`, (err as Error).message);
        setKvStatus('error');
      }
    },
    [setKvStatus],
  );

  return { loadAll, save, del };
}
