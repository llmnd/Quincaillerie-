/**
 * Wrapper résistant au blocage de storage par Safari / ITP / mode privé.
 */

const memoryStore = new Map<string, string>();

let localAvailable: boolean | null = null;
let sessionAvailable: boolean | null = null;

function canUseLocal(): boolean {
  if (localAvailable !== null) return localAvailable;
  try {
    const k = "__test_local__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    localAvailable = true;
  } catch {
    localAvailable = false;
  }
  return localAvailable;
}

function canUseSession(): boolean {
  if (sessionAvailable !== null) return sessionAvailable;
  try {
    const k = "__test_session__";
    window.sessionStorage.setItem(k, "1");
    window.sessionStorage.removeItem(k);
    sessionAvailable = true;
  } catch {
    sessionAvailable = false;
  }
  return sessionAvailable;
}

export const safeLocal = {
  get(key: string): string | null {
    if (canUseLocal()) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        /* fallback mémoire */
      }
    }
    return memoryStore.get(`local:${key}`) ?? null;
  },
  set(key: string, value: string): void {
    if (canUseLocal()) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch {
        /* fallback mémoire */
      }
    }
    memoryStore.set(`local:${key}`, value);
  },
  remove(key: string): void {
    if (canUseLocal()) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
    memoryStore.delete(`local:${key}`);
  },
};

export const safeSession = {
  get(key: string): string | null {
    if (canUseSession()) {
      try {
        return window.sessionStorage.getItem(key);
      } catch {
        /* fallback mémoire */
      }
    }
    return memoryStore.get(`session:${key}`) ?? null;
  },
  set(key: string, value: string): void {
    if (canUseSession()) {
      try {
        window.sessionStorage.setItem(key, value);
        return;
      } catch {
        /* fallback mémoire */
      }
    }
    memoryStore.set(`session:${key}`, value);
  },
  remove(key: string): void {
    if (canUseSession()) {
      try {
        window.sessionStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
    memoryStore.delete(`session:${key}`);
  },
};

export const storageAvailable = () => canUseLocal();