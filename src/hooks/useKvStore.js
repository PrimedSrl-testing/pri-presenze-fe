// client/src/hooks/useKvStore.js
// ─────────────────────────────────────────────────────────────
// Hook per il KV store persistente via API Express.
// Replica e migliora il comportamento del Cloudflare Worker
// originale: debounce, retry, status visibile.
// ─────────────────────────────────────────────────────────────

import { useCallback, useRef } from 'react';
import { useApp } from '@/context/AppContext';

const API_BASE = '/api';
const DEBOUNCE_MS = 800;

export function useKvStore() {
  const { setKvStatus, showToast } = useApp();
  const timers = useRef({});

  /**
   * Carica tutti i dati dal KV store.
   * @returns {Promise<Record<string, unknown> | null>}
   */
  const loadAll = useCallback(async () => {
    setKvStatus('loading');
    try {
      const res  = await fetch(`${API_BASE}/data`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      setKvStatus('saved');
      return json.data;
    } catch (err) {
      console.warn('[kvStore] loadAll error:', err.message);
      setKvStatus('error');
      return null;
    }
  }, [setKvStatus]);

  /**
   * Salva una chiave con debounce (evita write-storm).
   * @param {string} key
   * @param {unknown} data
   * @param {{ immediate?: boolean }} [options]
   */
  const save = useCallback((key, data, options = {}) => {
    setKvStatus('saving');

    // Cancella debounce precedente per questa chiave
    if (timers.current[key]) {
      clearTimeout(timers.current[key]);
    }

    const doSave = async () => {
      try {
        const res  = await fetch(`${API_BASE}/save/${key}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(data),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.message);
        setKvStatus('saved');
      } catch (err) {
        console.warn(`[kvStore] save(${key}) error:`, err.message);
        setKvStatus('error');
        showToast(`Errore salvataggio dati: ${err.message}`, 'error');
      } finally {
        delete timers.current[key];
      }
    };

    if (options.immediate) {
      doSave();
    } else {
      timers.current[key] = setTimeout(doSave, DEBOUNCE_MS);
    }
  }, [setKvStatus, showToast]);

  /**
   * Elimina una chiave.
   * @param {string} key
   */
  const del = useCallback(async (key) => {
    setKvStatus('saving');
    try {
      const res  = await fetch(`${API_BASE}/save/${key}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      setKvStatus('saved');
    } catch (err) {
      console.warn(`[kvStore] del(${key}) error:`, err.message);
      setKvStatus('error');
    }
  }, [setKvStatus]);

  return { loadAll, save, del };
}
