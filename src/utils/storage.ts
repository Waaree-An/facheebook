import { ReadingMaterial, StudyTip } from '../types';

const DB_NAME = 'FacheeUnitedDB';
const DB_VERSION = 1;
const STORE_MATERIALS = 'materials';
const STORE_TIPS = 'study_tips';

function scopedKey(key: string, scope: string): string {
  return scope === 'local' ? key : `${key}_${scope}`;
}

function openDB(scope = 'local'): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(scope === 'local' ? DB_NAME : `${DB_NAME}_${scope}`, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_MATERIALS)) {
        db.createObjectStore(STORE_MATERIALS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_TIPS)) {
        db.createObjectStore(STORE_TIPS, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Save all materials
export async function saveMaterialsToDB(materials: ReadingMaterial[], scope = 'local'): Promise<void> {
  try {
    const db = await openDB(scope);
    try { localStorage.setItem(scopedKey('fachee_materials_initialized', scope), '1'); } catch { /* storage may be restricted */ }
    const tx = db.transaction(STORE_MATERIALS, 'readwrite');
    const store = tx.objectStore(STORE_MATERIALS);
    await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => reject(clearReq.error);
    });

    for (const item of materials) {
      store.put(item);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB write failed, falling back to localStorage (metadata only if large)', err);
    try {
      localStorage.setItem(scopedKey('fachee_materials_backup', scope), JSON.stringify(materials));
    } catch {
      console.warn('localStorage also full, skipping mirror');
    }
  }
}

// Load all materials
export async function loadMaterialsFromDB(scope = 'local'): Promise<ReadingMaterial[] | null> {
  try {
    const db = await openDB(scope);
    const tx = db.transaction(STORE_MATERIALS, 'readonly');
    const store = tx.objectStore(STORE_MATERIALS);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const results = request.result as ReadingMaterial[];
        if (results && results.length > 0) {
          resolve(results);
        } else {
          // null means first run; [] means the user intentionally cleared the library.
          resolve(localStorage.getItem(scopedKey('fachee_materials_initialized', scope)) === '1' ? [] : null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB read failed, trying localStorage backup', err);
    const local = localStorage.getItem(scopedKey('fachee_materials_backup', scope));
    if (local) {
      try {
        return JSON.parse(local);
      } catch {
        return null;
      }
    }
    return null;
  }
}

// Save Study Tips
export async function saveTipsToDB(tips: StudyTip[], scope = 'local'): Promise<void> {
  try {
    const db = await openDB(scope);
    try { localStorage.setItem(scopedKey('fachee_tips_initialized', scope), '1'); } catch { /* storage may be restricted */ }
    const tx = db.transaction(STORE_TIPS, 'readwrite');
    const store = tx.objectStore(STORE_TIPS);
    await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => reject(clearReq.error);
    });

    for (const tip of tips) {
      store.put(tip);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB tips write failed, using localStorage', err);
    localStorage.setItem(scopedKey('fachee_tips_backup', scope), JSON.stringify(tips));
  }
}

// Load Study Tips
export async function loadTipsFromDB(scope = 'local'): Promise<StudyTip[] | null> {
  try {
    const db = await openDB(scope);
    const tx = db.transaction(STORE_TIPS, 'readonly');
    const store = tx.objectStore(STORE_TIPS);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const results = request.result as StudyTip[];
        if (results && results.length > 0) {
          resolve(results);
        } else {
          resolve(localStorage.getItem(scopedKey('fachee_tips_initialized', scope)) === '1' ? [] : null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    const local = localStorage.getItem(scopedKey('fachee_tips_backup', scope));
    if (local) {
      try {
        return JSON.parse(local);
      } catch {
        return null;
      }
    }
    return null;
  }
}

// Helper to format bytes
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Helper to extract YouTube ID or embed URL
export function getEmbedVideoUrl(url: string): { embedUrl: string | null; platform: string } {
  if (!url) return { embedUrl: null, platform: 'unknown' };

  // YouTube
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return {
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`,
      platform: 'youtube',
    };
  }

  // Vimeo
  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      platform: 'vimeo',
    };
  }

  // Direct video file
  if (url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)) {
    return {
      embedUrl: url,
      platform: 'direct',
    };
  }

  return { embedUrl: null, platform: 'other' };
}
