/**
 * modules/utils/storage.js
 * localStorage helpers with JSON serialization and safe fallbacks.
 */

/**
 * Retrieve and JSON-parse an item from localStorage.
 * Returns `defaultValue` if the key is absent or parsing fails.
 */
export function getStorageItem(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw) ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * JSON-stringify and store a value in localStorage.
 * Returns false and logs a warning on failure.
 */
export function setStorageItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn(`storage: could not save "${key}"`, e);
    return false;
  }
}

/** Remove an item from localStorage. */
export function removeStorageItem(key) {
  localStorage.removeItem(key);
}
